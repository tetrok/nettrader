# -*- coding: utf-8 -*-
"""
NetTrader 2 — Constantes et Configuration des Microservices Python

Usage:
    Ce module centralise les paramètres de connexion à la base de données MariaDB
    et les constantes fonctionnelles partagées entre les différents microservices
    d'arrière-plan en Python (pynt2markdown, pymailing, pynt2stats).

Logique & Fonctionnement:
    - Récupération des variables d'environnement système (injectées par Docker ou l'OS) :
      * DB_HOST, DB_USER, DB_PASSWORD, DB_NAME : coordonnées du serveur MariaDB.
      * CAPDEB : capital initial attribué à chaque nouveau compte joueur (défaut: 10 000 €).
      * URLINDEX : URL racine de l'application web pour les appels webhook HTTP (cmd.php).
    - Fournit des valeurs de repli par défaut pour simplifier l'exécution hors conteneur.
"""

import os

# Paramètres de connexion MariaDB / MySQL
C_HOST = os.environ.get("DB_HOST", "localhost")
C_USER = os.environ.get("DB_USER", "database user")
C_PWD = os.environ.get("DB_PASSWORD", "database password")
C_DBNAME = os.environ.get("DB_NAME", "database name")

# Règles de gestion et URLs de communication
CAPDEB = os.environ.get("CAPDEB", "10000")
URLINDEX = os.environ.get("URLINDEX", "http://www.nettrader.fr/")


