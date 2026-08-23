# -*- coding: ISO-8859-15 -*-
#
# NetTrader 2
#
# @package NetTrader
# @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
# @author Nicolas Fortin <nfortin@nettrader.fr>
import os
import sys
import pymysql
import time
import re
import urllib.request as urllib
import yfinance as yf
import pandas as pd
import contextlib
import io
import traceback
from pyconst import *

DOWNLOAD_INTERVAL=120 #s
SICAV_COUNT_PER_DOWNLOAD=50
# http://download.finance.yahoo.com/d/quotes.csv?s=ALU.PA&f=sl1d1t1c1ohgv&e=.csv
# re.match("\"([^\"]*)\",([^,]*),\"([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})\",\"([0-9]{1,2}):([0-9]{1,2})([a-z]{2})\",([^,]*),([^,]*),([^,]*),([^,]*),([^,]*)",ligne).groups()
#http://fr.old.finance.yahoo.com/d/quotes.csv?s=ALU.PA&f=snl1d1t1c1ohgv&e=.csv
# ancien ([^.]*).([A-Z]{2});([^;]*);([^;]*);([0-9]{1,2})h([0-9]{1,2});([0-9]{1,2})/([0-9]{1,2})/([0-9]{4});([^;]*);([^;]*);([^;]*);([^;]*);([0-9]*)
#   matchres=re.match("([^;]*);([^;]*);([^;]*);([0-9]{1,2})h([0-9]{1,2});([0-9]{1,2})/([0-9]{1,2})/([0-9]{4});([^;]*);([^;]*);([^;]*);([^;]*);([0-9]*)",downaction)
#                if matchres:
#                    yname,actionname,cours,heure,minutes,jour,mois,annee,variation,v1,v2,v3,volume=matchres.groups()
def GetUrlStream( action_list):
    #returl="http://fr.old.finance.yahoo.com/d/quotes.csv?s="
    returl="http://download.finance.yahoo.com/d/quotes.csv?s="
    for idact,name in enumerate(action_list):
        if idact>0:
            returl+="+"
        returl+=name
    returl+="&f=sl1d1t1c1ohgv&e=.csv"
    return returl

def getRowDict(cursor):
    dicodata={}
    rowData=cursor.fetchone()
    desc=cursor.description
    if(rowData!=None):
        for i in range(0,len(rowData)):
            dicodata[desc[i][0]]=rowData[i]
    return dicodata
def ExecSql(db,sql):
    cursor=db.cursor()
    cursor.execute(sql)
    db.commit()    
def RunSelect(db,sql):
        res=[]
        cursor=db.cursor()
        cursor.execute(sql)
        line=getRowDict(cursor)
        while len(line)!=0:
            res.append(line)
            line=getRowDict(cursor)
        cursor.close()
        return res
def GetActionName(ligne):
    return ligne[1:ligne[1:].find("\"")+1]
def DisableAction(db,actionname):
    ExecSql(db,"UPDATE cacval SET down='0' WHERE yahooname='%s'" %(actionname))

def DownloadParisMarkedData(db):
    mail_error_text=""
    dictdown=RunSelect(db,"SELECT codesico,yahooname,lasttime,valeur FROM cacval WHERE down='1' ORDER BY codesico ASC")
    action_list=[]
    action_dict={}
    for action in dictdown:
        action_list.append(action["yahooname"])
        action_dict[action["yahooname"]]=action

    if not action_list:
        print("[%s] [INFO] Aucune action marquée pour le téléchargement (down='1')." % time.strftime("%d/%m/%Y %H:%M:%S"))
        return
        
    print("[%s] [INFO] Début du téléchargement pour %d actions (taille de batch: %d)..." % (time.strftime("%d/%m/%Y %H:%M:%S"), len(action_list), SICAV_COUNT_PER_DOWNLOAD))
        
    for r in range(0,len(action_list),SICAV_COUNT_PER_DOWNLOAD):
        batch = action_list[r:SICAV_COUNT_PER_DOWNLOAD+r]
        tickers = " ".join(batch)
        print("[%s] [INFO] Traitement du batch %d/%d (tickers: %s)" % (time.strftime("%d/%m/%Y %H:%M:%S"), (r // SICAV_COUNT_PER_DOWNLOAD) + 1, (len(action_list) + SICAV_COUNT_PER_DOWNLOAD - 1) // SICAV_COUNT_PER_DOWNLOAD, tickers))
        
        try:
            f = io.StringIO()
            with contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
                data = yf.download(tickers, group_by="column", period="1d", threads=False, progress=False)
            
            # Récupérer les messages capturés de yfinance si nécessaire pour le débogage
            yf_output = f.getvalue().strip()
            if yf_output:
                print("[%s] [DEBUG] Sortie yfinance: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), yf_output))

            success_count = 0
            error_count = 0
            
            for yname in batch:
                try:
                    if data is None or data.empty:
                        print("[%s] [ERREUR] %s: Aucune donnée trouvée (DataFrame vide)." % (time.strftime("%d/%m/%Y %H:%M:%S"), yname))
                        error_count += 1
                        continue
                        
                    if 'Close' not in data:
                        print("[%s] [ERREUR] %s: Colonne 'Close' manquante dans les données. Colonnes disponibles: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), yname, list(data.columns)))
                        error_count += 1
                        continue
                        
                    close_data = data['Close']
                    
                    if isinstance(close_data, pd.DataFrame):
                        if yname not in close_data.columns or pd.isna(close_data[yname].iloc[-1]):
                            # Tentative de repli (fallback) : téléchargement individuel du ticker si NaN ou absent
                            try:
                                f_single = io.StringIO()
                                with contextlib.redirect_stdout(f_single), contextlib.redirect_stderr(f_single):
                                    data_single = yf.download(yname, period="1d", threads=False, progress=False)
                                if data_single is not None and not data_single.empty and 'Close' in data_single:
                                    single_close = data_single['Close']
                                    if isinstance(single_close, pd.DataFrame):
                                        single_val = single_close.iloc[-1, 0] if not single_close.empty else float('nan')
                                    else:
                                        single_val = single_close.iloc[-1] if not single_close.empty else float('nan')
                                    if not pd.isna(single_val):
                                        cours = single_val
                                    else:
                                        raise ValueError("Valeur Close est NaN pour %s" % yname)
                                else:
                                    raise ValueError("Données vides ou absentes pour %s" % yname)
                            except Exception as ex_single:
                                if yname not in close_data.columns:
                                    print("[%s] [ERREUR] %s: Ticker absent des colonnes Close. Colonnes Close: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), yname, list(close_data.columns)))
                                else:
                                    print("[%s] [ERREUR] %s: Valeur Close est NaN (même après repli individuel)" % (time.strftime("%d/%m/%Y %H:%M:%S"), yname))
                                error_count += 1
                                continue
                        else:
                            cours = close_data[yname].iloc[-1]
                    else:
                        if pd.isna(close_data.iloc[-1]):
                            raise ValueError("Valeur Close est NaN pour %s" % yname)
                        cours = close_data.iloc[-1]

                    fval = float(cours)

                    print("[%s] [SUCCÈS] %s: Données récupérées avec succès (valeur = %.4f)" % (time.strftime("%d/%m/%Y %H:%M:%S"), yname, fval))
                    success_count += 1

                    aujourdhui = time.time()
                    
                    if yname in action_dict:
                        ansval = float(action_dict[yname]["valeur"])
                        act_date = time.time()
                        
                        req = "UPDATE cacval SET valeur='%s', lasttime='%i', lasttimedown='%i' WHERE yahooname='%s'" % (fval, act_date, aujourdhui, yname)
                        ExecSql(db, req)
                        
                        if fval == 0 or (ansval != 0 and abs(ansval - fval) / (ansval) >= 0.25):
                            msg_alerte = "ATTENTION: L'action %s a une valeur de 0 ou a changé de plus de 25%% entre deux maj. Ancienne valeur: %.4f, Nouvelle: %.4f." % (yname, ansval, fval)
                            print("[%s] [ALERTE] %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), msg_alerte))
                            mail_error_text += msg_alerte + "\n"
                except Exception as e:
                    error_count += 1
                    err_msg = "Erreur de traitement pour %s: %s" % (yname, str(e))
                    print("[%s] [ERREUR] %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), err_msg))
                    traceback.print_exc()
                    mail_error_text += err_msg + "\n"
            print("[%s] [INFO] Batch terminé : %s succès, %s échecs." % (time.strftime("%d/%m/%Y %H:%M:%S"), success_count, error_count))
        except Exception as e:
            err_batch = "Erreur de téléchargement du batch %s: %s" % (tickers, str(e))
            print("[%s] [ERREUR] %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), err_batch))
            traceback.print_exc()
            mail_error_text += err_batch + "\n"
            
    if len(mail_error_text)>0:
        print("[%s] [INFO] Insertion d'un rapport d'erreur/alerte dans la table mail_tosend..." % time.strftime("%d/%m/%Y %H:%M:%S"))
        ExecSql(db,"""
        INSERT INTO `mail_tosend` ( `idmail` , `dateenvoi` , `from_mail` , `from_pseudo` , `to_mail` , `to_pseudo` , `titre` , `corps` , `etat` ) 
        VALUES (
        NULL , UNIX_TIMESTAMP( ) , 'nettrader2009@nettrader.fr', 'Admin', 'nettrader2009@nettrader.fr', 'Admin', 'Rapport de telechargement', '%s', 'attente'
        );
        """% (mail_error_text.replace("'","\\'")))

firstloop=True
while 1:
    timtup=time.struct_time(time.localtime(time.time()))
    if firstloop or (timtup.tm_wday<5 and timtup.tm_hour>=9 and timtup.tm_hour<18):
        if firstloop:
            print("[%s] [INFO] Démarrage de la boucle principale du script (premier tour)." % time.strftime("%d/%m/%Y %H:%M:%S"))
        else:
            print("[%s] [INFO] Heure de marché active (Jour: %d, Heure: %d h). Lancement du cycle de mise à jour." % (time.strftime("%d/%m/%Y %H:%M:%S"), timtup.tm_wday, timtup.tm_hour))
        
        firstloop=False
        try:
            db = pymysql.connect(host=C_HOST, user=C_USER, passwd=C_PWD, db=C_DBNAME)
            print("[%s] [INFO] Connexion à la base de données MySQL établie avec succès." % time.strftime("%d/%m/%Y %H:%M:%S"))
        except Exception as e:
            print("[%s] [ERREUR] Échec de la connexion à la base de données MySQL: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), str(e)))
            traceback.print_exc()
            time.sleep(60)
            continue

        begindown=time.time()
        
        print("[%s] [INFO] Appel de la page PHP checkscore..." % time.strftime("%d/%m/%Y %H:%M:%S"))
        try:
            url_checkscore = URLINDEX.rstrip("/") + "/cmd.php?do=checkscore"
            response = urllib.urlopen(url_checkscore)
            print("[%s] [INFO] Appel checkscore réussi (Code HTTP: %s)" % (time.strftime("%d/%m/%Y %H:%M:%S"), getattr(response, 'status', 'N/A')))
        except Exception as e:
            print("[%s] [ERREUR] Erreur appel de page php checkscore (%s): %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), url_checkscore, str(e)))
            print(sys.exc_info())

        try:
            DownloadParisMarkedData(db)
        except Exception as e:
            print("[%s] [ERREUR] Erreur générale de téléchargement du marché: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), str(e)))
            exceptionType, exceptionValue, exceptionTraceback = sys.exc_info()
            traceback.print_exception(exceptionType, exceptionValue, exceptionTraceback, limit=20, file=sys.stdout)

        print("[%s] [INFO] Appel de la page PHP executeorder..." % time.strftime("%d/%m/%Y %H:%M:%S"))
        try:
            url_executeorder = URLINDEX.rstrip("/") + "/cmd.php?do=executeorder"
            response = urllib.urlopen(url_executeorder)
            print("[%s] [INFO] Appel executeorder réussi (Code HTTP: %s)" % (time.strftime("%d/%m/%Y %H:%M:%S"), getattr(response, 'status', 'N/A')))
        except Exception as e:
            print("[%s] [ERREUR] Erreur appel de page php executeorder (%s): %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), url_executeorder, str(e)))
            print(sys.exc_info())

        db.close()
        print("[%s] [INFO] Connexion à la base de données fermée." % time.strftime("%d/%m/%Y %H:%M:%S"))

        duration = time.time() - begindown
        nextdown = DOWNLOAD_INTERVAL - duration
        print("[%s] [INFO] Cycle terminé en %.2f secondes. Prochain téléchargement dans %.2f secondes." % (time.strftime("%d/%m/%Y %H:%M:%S"), duration, nextdown))
        
        if nextdown>0.:
            time.sleep(nextdown)
    else:
        print("[%s] [INFO] Hors horaires de marché (Jour: %d, Heure: %d h). Mise en veille pour 60 secondes." % (time.strftime("%d/%m/%Y %H:%M:%S"), timtup.tm_wday, timtup.tm_hour))
        time.sleep(60)
