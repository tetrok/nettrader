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

MAX_FAILURES_BLOCK_BUY = int(os.environ.get("MAX_FAILURES_BLOCK_BUY", "3"))
MAX_FAILURES_DISABLE_SYNC = int(os.environ.get("MAX_FAILURES_DISABLE_SYNC", "15"))
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
def ExecSql(db, sql, params=None):
    cursor = db.cursor()
    if params is not None:
        cursor.execute(sql, params)
    else:
        cursor.execute(sql)
    db.commit()
    cursor.close()

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
    ExecSql(db,"UPDATE cacval SET down='0' WHERE yahooname=%s", (actionname,))

def DownloadParisMarkedData(db):
    mail_error_text=""
    start_time = time.time()
    dictdown=RunSelect(db,"SELECT codesico,yahooname,lasttime,valeur,fail_count,total_fails,authachat,down,is_archived FROM cacval WHERE down='1' ORDER BY codesico ASC")
    action_list=[]
    action_dict={}
    for action in dictdown:
        action_list.append(action["yahooname"])
        action_dict[action["yahooname"]]=action

    if not action_list:
        print("[%s] [INFO] Aucune action marquée pour le téléchargement (down='1')." % time.strftime("%d/%m/%Y %H:%M:%S"))
        return
        
    print("[%s] [INFO] Début du téléchargement pour %d actions (taille de batch: %d)..." % (time.strftime("%d/%m/%Y %H:%M:%S"), len(action_list), SICAV_COUNT_PER_DOWNLOAD))
    
    total_download_success = 0
    total_download_error = 0
        
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

            batch_success_count = 0
            batch_error_count = 0
            
            for yname in batch:
                retried = 0
                cours = None
                now_attempt = int(time.time())
                try:
                    if data is None or data.empty:
                        raise ValueError("Aucune donnée trouvée (DataFrame vide)")
                        
                    if 'Close' not in data:
                        raise ValueError("Colonne 'Close' manquante dans les données")
                        
                    close_data = data['Close']
                    
                    if isinstance(close_data, pd.DataFrame):
                        if yname not in close_data.columns or pd.isna(close_data[yname].iloc[-1]):
                            # Tentative de repli (fallback retry) : téléchargement individuel du ticker si NaN ou absent
                            retried = 1
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
                                        raise ValueError("Valeur Close est NaN après repli individuel")
                                else:
                                    raise ValueError("Données vides ou absentes au repli individuel")
                            except Exception as ex_single:
                                raise ValueError(str(ex_single))
                        else:
                            cours = close_data[yname].iloc[-1]
                            if pd.isna(cours):
                                retried = 1
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
                                        raise ValueError("Valeur Close est NaN après repli individuel")
                                else:
                                    raise ValueError("Données vides au repli individuel")
                    else:
                        if pd.isna(close_data.iloc[-1]):
                            retried = 1
                            raise ValueError("Valeur Close est NaN")
                        cours = close_data.iloc[-1]

                    if cours is None or pd.isna(cours):
                        raise ValueError("Cours introuvable ou NaN")

                    fval = float(cours)
                    batch_success_count += 1
                    total_download_success += 1
                    print("[%s] [SUCCÈS] %s: Données récupérées (valeur = %.4f, retry=%d)" % (time.strftime("%d/%m/%Y %H:%M:%S"), yname, fval, retried))

                    ansval = float(action_dict[yname]["valeur"]) if yname in action_dict and action_dict[yname]["valeur"] is not None else 0.0
                    
                    ExecSql(db, """
                        UPDATE cacval 
                        SET valeur=%s, lasttime=%s, lasttimedown=%s, last_attempt=%s, 
                            last_status='success', fail_count=0, retry_count=%s, last_error=NULL,
                            authachat=IF(is_archived='0', '1', '0')
                        WHERE yahooname=%s
                    """, (fval, now_attempt, now_attempt, now_attempt, retried, yname))

                    if yname in action_dict and action_dict[yname].get("codesico") is not None:
                        ExecSql(db, "INSERT INTO stock_history (codesico, temps, valeur) VALUES (%s, %s, %s)",
                                (action_dict[yname]["codesico"], now_attempt, fval))

                    
                    if fval == 0 or (ansval != 0 and abs(ansval - fval) / (ansval) >= 0.25):
                        msg_alerte = "ATTENTION: L'action %s a une valeur de 0 ou a changé de plus de 25%% entre deux maj. Ancienne valeur: %.4f, Nouvelle: %.4f." % (yname, ansval, fval)
                        print("[%s] [ALERTE] %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), msg_alerte))
                        mail_error_text += msg_alerte + "\n"

                except Exception as e:
                    batch_error_count += 1
                    total_download_error += 1
                    err_msg = str(e)[:250]
                    print("[%s] [ERREUR] %s: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), yname, err_msg))
                    mail_error_text += ("%s: %s\n" % (yname, err_msg))
                    
                    prev_fails = int(action_dict.get(yname, {}).get("fail_count") or 0)
                    new_fail_count = prev_fails + 1
                    should_block_buy = (MAX_FAILURES_BLOCK_BUY > 0 and new_fail_count >= MAX_FAILURES_BLOCK_BUY)
                    should_disable_sync = (MAX_FAILURES_DISABLE_SYNC > 0 and new_fail_count >= MAX_FAILURES_DISABLE_SYNC)

                    if should_block_buy:
                        print("[%s] [PROTECTION] %s: %d échecs consécutifs >= seuil achat (%d) -> authachat='0'" % 
                              (time.strftime("%d/%m/%Y %H:%M:%S"), yname, new_fail_count, MAX_FAILURES_BLOCK_BUY))
                    if should_disable_sync:
                        print("[%s] [PROTECTION] %s: %d échecs consécutifs >= seuil synchro (%d) -> down='0' (inactivée)" % 
                              (time.strftime("%d/%m/%Y %H:%M:%S"), yname, new_fail_count, MAX_FAILURES_DISABLE_SYNC))

                    ExecSql(db, """
                        UPDATE cacval 
                        SET last_attempt=%s, last_status='failed', 
                            fail_count=%s, total_fails=total_fails+1, 
                            retry_count=%s, last_error=%s,
                            authachat=IF(%s, '0', authachat),
                            down=IF(%s, '0', down)
                        WHERE yahooname=%s
                    """, (now_attempt, new_fail_count, retried, err_msg, 1 if should_block_buy else 0, 1 if should_disable_sync else 0, yname))

            print("[%s] [INFO] Batch terminé : %d succès, %d échecs." % (time.strftime("%d/%m/%Y %H:%M:%S"), batch_success_count, batch_error_count))

        except Exception as e:
            err_batch = "Erreur de téléchargement du batch %s: %s" % (tickers, str(e))
            print("[%s] [ERREUR] %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), err_batch))
            traceback.print_exc()
            mail_error_text += err_batch + "\n"
            now_attempt = int(time.time())
            for yname in batch:
                total_download_error += 1
                prev_fails = int(action_dict.get(yname, {}).get("fail_count") or 0)
                new_fail_count = prev_fails + 1
                should_block_buy = (MAX_FAILURES_BLOCK_BUY > 0 and new_fail_count >= MAX_FAILURES_BLOCK_BUY)
                should_disable_sync = (MAX_FAILURES_DISABLE_SYNC > 0 and new_fail_count >= MAX_FAILURES_DISABLE_SYNC)

                if should_block_buy:
                    print("[%s] [PROTECTION] %s: %d échecs consécutifs >= seuil achat (%d) -> authachat='0'" % 
                          (time.strftime("%d/%m/%Y %H:%M:%S"), yname, new_fail_count, MAX_FAILURES_BLOCK_BUY))
                if should_disable_sync:
                    print("[%s] [PROTECTION] %s: %d échecs consécutifs >= seuil synchro (%d) -> down='0' (inactivée)" % 
                          (time.strftime("%d/%m/%Y %H:%M:%S"), yname, new_fail_count, MAX_FAILURES_DISABLE_SYNC))

                ExecSql(db, """
                    UPDATE cacval 
                    SET last_attempt=%s, last_status='failed', 
                        fail_count=%s, total_fails=total_fails+1, 
                        retry_count=0, last_error=%s,
                        authachat=IF(%s, '0', authachat),
                        down=IF(%s, '0', down)
                    WHERE yahooname=%s
                """, (now_attempt, new_fail_count, str(e)[:250], 1 if should_block_buy else 0, 1 if should_disable_sync else 0, yname))
            
    duration = time.time() - start_time
    total_stocks = len(action_list)
    print("[%s] [INFO] Fin du cycle de synchronisation : %d actions, %d succès, %d échecs en %.2fs." % 
          (time.strftime("%d/%m/%Y %H:%M:%S"), total_stocks, total_download_success, total_download_error, duration))

    try:
        ExecSql(db, """
            INSERT INTO market_sync_log (sync_time, total_stocks, success_count, error_count, duration_seconds, details)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (int(time.time()), total_stocks, total_download_success, total_download_error, round(duration, 2),
              ("Batch: %d, Succès: %d, Échecs: %d" % (SICAV_COUNT_PER_DOWNLOAD, total_download_success, total_download_error))))
    except Exception as ex_log:
        print("[%s] [ERREUR] Impossible d'insérer dans market_sync_log: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), str(ex_log)))

    if len(mail_error_text)>0:
        print("[%s] [INFO] Insertion d'un rapport d'erreur/alerte dans la table mail_tosend..." % time.strftime("%d/%m/%Y %H:%M:%S"))
        ExecSql(db,"""
            INSERT INTO mail_tosend (dateenvoi, from_mail, from_pseudo, to_mail, to_pseudo, titre, corps, etat) 
            VALUES (UNIX_TIMESTAMP(), 'nettrader2009@nettrader.fr', 'Admin', 'nettrader2009@nettrader.fr', 'Admin', 'Rapport de telechargement', %s, 'attente')
        """, (mail_error_text,))

def main():
    firstloop = True
    cron_secret = os.environ.get("CRON_SECRET", "nettrader_cron_secure_token_secret")
    ignore_hours = os.environ.get("IGNORE_MARKET_HOURS", "0") in ("1", "true", "True", "yes")

    while 1:
        timtup = time.localtime()
        is_weekday = timtup.tm_wday < 5
        # Heures Euronext Paris : 09:00 à 17:35
        is_open_time = (timtup.tm_hour > 9 or (timtup.tm_hour == 9 and timtup.tm_min >= 0)) and \
                       (timtup.tm_hour < 17 or (timtup.tm_hour == 17 and timtup.tm_min <= 35))
        is_market_open = is_weekday and is_open_time

        should_run = firstloop or ignore_hours or is_market_open

        if should_run:
            if firstloop:
                print("[%s] [INFO] Démarrage de la boucle principale du script (premier tour)." % time.strftime("%d/%m/%Y %H:%M:%S"))
            elif ignore_hours:
                print("[%s] [INFO] Mode IGNORE_MARKET_HOURS actif. Lancement du cycle de mise à jour." % time.strftime("%d/%m/%Y %H:%M:%S"))
            else:
                print("[%s] [INFO] Heure de marché active (Jour: %d, Heure: %d:%02d). Lancement du cycle de mise à jour." % (time.strftime("%d/%m/%Y %H:%M:%S"), timtup.tm_wday, timtup.tm_hour, timtup.tm_min))

            firstloop = False
            try:
                db = pymysql.connect(host=C_HOST, user=C_USER, passwd=C_PWD, db=C_DBNAME)
                print("[%s] [INFO] Connexion à la base de données MySQL établie avec succès." % time.strftime("%d/%m/%Y %H:%M:%S"))
            except Exception as e:
                print("[%s] [ERREUR] Échec de la connexion à la base de données MySQL: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), str(e)))
                traceback.print_exc()
                time.sleep(60)
                continue

            begindown = time.time()

            print("[%s] [INFO] Appel de la page PHP checkscore..." % time.strftime("%d/%m/%Y %H:%M:%S"))
            try:
                url_checkscore = URLINDEX.rstrip("/") + "/cmd.php?do=checkscore&key=" + cron_secret
                req_checkscore = urllib.Request(url_checkscore, headers={"X-Cron-Key": cron_secret})
                response = urllib.urlopen(req_checkscore)
                print("[%s] [INFO] Appel checkscore réussi (Code HTTP: %s)" % (time.strftime("%d/%m/%Y %H:%M:%S"), getattr(response, 'status', 'N/A')))
            except Exception as e:
                print("[%s] [ERREUR] Erreur appel de page php checkscore (%s): %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), url_checkscore, str(e)))

            try:
                DownloadParisMarkedData(db)
            except Exception as e:
                print("[%s] [ERREUR] Erreur générale de téléchargement du marché: %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), str(e)))
                exceptionType, exceptionValue, exceptionTraceback = sys.exc_info()
                traceback.print_exception(exceptionType, exceptionValue, exceptionTraceback, limit=20, file=sys.stdout)

            print("[%s] [INFO] Appel de la page PHP executeorder..." % time.strftime("%d/%m/%Y %H:%M:%S"))
            try:
                url_executeorder = URLINDEX.rstrip("/") + "/cmd.php?do=executeorder&key=" + cron_secret
                req_executeorder = urllib.Request(url_executeorder, headers={"X-Cron-Key": cron_secret})
                response = urllib.urlopen(req_executeorder)
                print("[%s] [INFO] Appel executeorder réussi (Code HTTP: %s)" % (time.strftime("%d/%m/%Y %H:%M:%S"), getattr(response, 'status', 'N/A')))
            except Exception as e:
                print("[%s] [ERREUR] Erreur appel de page php executeorder (%s): %s" % (time.strftime("%d/%m/%Y %H:%M:%S"), url_executeorder, str(e)))

            db.close()
            print("[%s] [INFO] Connexion à la base de données fermée." % time.strftime("%d/%m/%Y %H:%M:%S"))

            duration = time.time() - begindown
            nextdown = DOWNLOAD_INTERVAL - duration
            print("[%s] [INFO] Cycle terminé en %.2f secondes. Prochain téléchargement dans %.2f secondes." % (time.strftime("%d/%m/%Y %H:%M:%S"), duration, nextdown))

            if nextdown > 0.:
                time.sleep(nextdown)
        else:
            print("[%s] [INFO] Hors horaires de marché (Jour: %d, Heure: %d:%02d). Mise en veille pour 60 secondes." % (time.strftime("%d/%m/%Y %H:%M:%S"), timtup.tm_wday, timtup.tm_hour, timtup.tm_min))
            time.sleep(60)

if __name__ == '__main__':
    main()
