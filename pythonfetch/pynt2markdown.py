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
        return
        
    for r in range(0,len(action_list),SICAV_COUNT_PER_DOWNLOAD):
        batch = action_list[r:SICAV_COUNT_PER_DOWNLOAD+r]
        tickers = " ".join(batch)
        
        try:
            # Download using yfinance
            data = yf.download(tickers, group_by="ticker", period="1d", threads=False)
            
            for yname in batch:
                try:
                    if len(batch) == 1:
                        ticker_data = data
                    else:
                        ticker_data = data[yname] if yname in data else None
                        
                    if ticker_data is None or ticker_data.empty:
                        DisableAction(db, yname)
                        continue
                        
                    cours = ticker_data['Close'].iloc[-1]
                    
                    if str(cours) == "nan":
                         DisableAction(db, yname)
                         continue
                         
                    fval = float(cours)
                    aujourdhui = time.time()
                    
                    if yname in action_dict:
                        ansval = float(action_dict[yname]["valeur"])
                        # Get the current datetime as last update time
                        act_date = time.time()
                        
                        req = "UPDATE cacval SET valeur='%s', lasttime='%i', lasttimedown='%i' WHERE yahooname='%s'" % (fval, act_date, aujourdhui, yname)
                        ExecSql(db, req)
                        
                        if fval == 0 or abs(ansval - fval) / (fval) >= 0.49:
                            DisableAction(db, yname)
                            mail_error_text += "L'action %s a change de 25%% entre deux maj. Elle a ete desactivee.\n" % (yname)
                except Exception as e:
                    mail_error_text += "Erreur de traitement pour %s: %s\n" % (yname, str(e))
        except Exception as e:
            mail_error_text += "Erreur de telechargement du batch: %s\n" % (str(e))
            
    if len(mail_error_text)>0:
        ExecSql(db,"""
        INSERT INTO `mail_tosend` ( `idmail` , `dateenvoi` , `from_mail` , `from_pseudo` , `to_mail` , `to_pseudo` , `titre` , `corps` , `etat` ) 
        VALUES (
        NULL , UNIX_TIMESTAMP( ) , 'nettrader2009@nettrader.fr', 'Admin', 'nettrader2009@nettrader.fr', 'Admin', 'Rapport de telechargement', '%s', 'attente'
        );
        """ % (mail_error_text.replace("'","\\'")))

firstloop=True
while 1:
    timtup=time.struct_time(time.localtime(time.time()))
    if firstloop or (timtup.tm_wday<5 and timtup.tm_hour>=9 and timtup.tm_hour<18):
        firstloop=False
        db = pymysql.connect(host=C_HOST, user=C_USER, passwd=C_PWD, db=C_DBNAME)
        begindown=time.time()
        try:
            urllib.urlopen("http://app/cmd.php?do=checkscore")
        except:
            print("Erreur appel de page php")
            print(sys.exc_info())
        try:
            DownloadParisMarkedData(db)
        except:
            print("Erreur de telechargement du marche")
            exceptionType, exceptionValue, exceptionTraceback = sys.exc_info()
            traceback.print_exception(exceptionType, exceptionValue, exceptionTraceback, limit=20, file=sys.stdout)
        try:
            urllib.urlopen("http://app/cmd.php?do=executeorder")
        except:
            print("Erreur appel de page php")
            print(sys.exc_info())
        db.close()
        nextdown=DOWNLOAD_INTERVAL-(time.time()-begindown)
        print("%s Download in %f seconds, next download in %f seconds." % (time.strftime("%d/%m/%Y %H:%M",time.localtime(time.time())),time.time()-begindown,nextdown))
        if nextdown>0.:
            time.sleep(nextdown)
    else:
        time.sleep(60)
