# Documentation des APIs et Fonctionnalités

Ce document présente l'état de l'art de l'architecture logicielle, des flux de données externes, des APIs internes et externes, ainsi que des fonctionnalités de **NetTrader 2**.

---

## 1. Architecture Globale des Flux et Services

L'application repose sur une architecture multi-conteneurs articulant le serveur web PHP, des micro-services Python d'arrière-plan, une base de données relationnelle et un serveur de messagerie local.

```mermaid
flowchart TD
    subgraph Services Python
        PF["python-fetcher (pynt2markdown.py)"]
        PM["python-mailer (pymailing.py & pynt2stats.py)"]
    end

    subgraph Sources Externes & Réseau
        YF["Yahoo Finance (API yfinance)"]
        MP["Serveur SMTP (Mailpit :1025)"]
    end

    subgraph Base de Données
        DB[("MariaDB 10.5 (nettrader)")]
    end

    subgraph Serveur Web PHP (App)
        CMD["API Interne / Webhooks (cmd.php)"]
        PROG["API XML Client Lourd (prog.php)"]
        WEB["Front Controller Web (index.php)"]
    end

    subgraph Clients
        CLIENT_VB["Client Desktop VB6 (nettrader2Client)"]
        BROWSER["Navigateur Web Utilisateur"]
    end

    %% Flux Fetcher
    PF -->|Télécharge les cours| YF
    PF -->|Met à jour les cours cacval| DB
    PF -->|Déclenche checkscore & executeorder| CMD

    %% Flux PHP App
    CMD -->|Lit & Exécute ordres / MAJ classements| DB
    PROG -->|Authentification, Portefeuilles, Ordres| DB
    WEB -->|Gestion complète du jeu| DB

    %% Flux Clients
    CLIENT_VB -->|Requêtes HTTP XML| PROG
    BROWSER -->|Requêtes HTTP HTML| WEB

    %% Flux Mailer
    PM -->|Lit file d'attente mail_tosend| DB
    PM -->|Envoie les emails| MP
    PF -.->|Enregistre alertes / erreurs| DB
```

---

## 2. Flux Boursiers Externes : Micro-Service `python-fetcher`

Historiquement, le projet utilisait des flux CSV désormais obsolètes (`traiteeuronextcsv` et `traiteyahoocsv` dans `www/nt2_function.php`). Ces flux ont été neutralisés et remplacés par un conteneur dédié **`python-fetcher`** exécutant `pythonfetch/pynt2markdown.py`.

### 2.1. Fonctionnement du Scraper (`pythonfetch/pynt2markdown.py`)
Le script s'exécute en continu et supervise la récupération des cours boursiers en temps réel pour l'ensemble des titres surveillés (actifs ayant `down = '1'` dans la table `cacval`).

- **Librairie utilisée :** `yfinance` avec pandas.
- **Gestion des lots (Batching) :** Traitement par lots de 50 tickers (`SICAV_COUNT_PER_DOWNLOAD = 50`) via `yf.download(tickers, group_by="column", period="1d", threads=False, progress=False)`.
- **Mécanisme de repli individuel (Fallback) :** Si un ticker retourne une valeur `NaN` ou n'est pas présent dans la réponse du lot, un téléchargement unitaire `yf.download(yname, period="1d")` est immédiatement exécuté.
- **Mise à jour de la base :**
  ```sql
  UPDATE cacval SET valeur = :valeur, lasttime = :timestamp, lasttimedown = :timestamp WHERE yahooname = :ticker
  ```
- **Détection des anomalies & Alertes :**
  Si le cours récupéré est à `0` ou subit une variation brutale de $\ge 25\%$ par rapport à la dernière valeur enregistrée, une alerte est consignée dans les logs (`[ALERTE]`) et insérée dans la table `mail_tosend` pour notification aux administrateurs.
- **Fréquence & Plages de cotation :**
  - Cycle toutes les **120 secondes** (`DOWNLOAD_INTERVAL = 120`).
  - Actif du **lundi au vendredi, de 09h00 à 18h00** (heures d'ouverture des marchés parisiens), ainsi qu'au démarrage du conteneur.
- **Synchronisation avec le moteur de jeu :**
  À chaque cycle de mise à jour, le script appelle successivement les points d'entrée PHP :
  1. `http://app/cmd.php?do=checkscore` : validation et calcul de la valeur des portefeuilles.
  2. `http://app/cmd.php?do=executeorder` : déclenchement et exécution des ordres au marché / à seuil.

### 2.2. Règle Métier Critique : Résilience des Symboles Boursiers
> **Ne jamais désactiver définitivement les symboles boursiers (tickers) lorsque la récupération des données échoue ou retourne des données manquantes.**

En conformité avec cette règle :
- Le script **ne modifie pas** `down='0'` dans `cacval` en cas d'erreur réseau ou d'indisponibilité temporaire d'un symbole sur Yahoo Finance.
- Chaque échec ou anomalie est tracé avec précision dans les logs (`[ERREUR]`, `[ALERTE]`), permettant des tentatives automatiques aux cycles suivants.

### 2.3. Neutralisation des Anciennes Fonctions PHP
Dans `www/nt2_function.php` :
- `traiteeuronextcsv($lines)` : Neutralisé (retourne `""`).
- `traiteyahoocsv($lines)` : Neutralisé (retourne `""`).
- `traitehtmlsicav($lines, $sico)` : Maintenu pour la compatibilité résiduelle des fonds SICAV, destiné à être audité.

---

## 3. Micro-Service d'Envoi d'E-mails & Moteur Statistique (`python-mailer`)

Le conteneur **`python-mailer`** (`pythonfetch/pymailing.py`) assure l'envoi asynchrone des e-mails transactionnels et le calcul périodique des performances des joueurs via `pythonfetch/pynt2stats.py`.

### 3.1. Dépilement de la File d'Attente (`mail_tosend`)
- Interroge en continu la table `mail_tosend` pour les messages dont `etat = 'attente'` et `dateenvoi <= NOW()`.
- Met à jour l'état à `'traitement'`, puis expédie l'e-mail via SMTP (port `1025` de Mailpit en développement/Docker).
- Marque à `'traite'` puis purge les e-mails expédiés, ou positionne l'état à `'erreur'` en cas d'échec d'envoi.

### 3.2. Statistiques Journalières & Hebdomadaires (`pythonfetch/pynt2stats.py`)
- **Statistiques Journalières (`Stats_Daily`) :**
  - Déclenchées du lundi au vendredi à **18h00** pour les utilisateurs ayant `maildaily = '1'`.
  - Calcule la progression journalière en euros, l'historique des transactions du jour, le rang au classement mensuel et journalier, ainsi que le meilleur trader du jour.
- **Statistiques Hebdomadaires (`Stats_Weekly`) :**
  - Déclenchées le vendredi à **18h00** pour les utilisateurs ayant `mailweekly = '1'`.
  - Calcule la progression hebdomadaire, les gains consolidés sur 7 jours et l'historique d'évolution du capital.
- **Désinscription sécurisée :**
  Génération de liens directs de désinscription contenant une clé de contrôle MD5 (`checkstr = md5(idcompte + dateinscr)`).

---

## 4. API Interne et Webhooks de Traitement (`www/cmd.php`)

Le fichier `www/cmd.php` sert d'interface CLI et de point de contact HTTP pour les déclenchements périodiques orchestrés par le fetcher Python.

| Paramètre `?do=...` | Description et Actions Réalisées |
| :--- | :--- |
| `checkscore` | Vérifie et actualise la valorisation financière des portefeuilles des joueurs actifs (`checkscore()`). |
| `executeorder` | 1. Exécute les ordres d'achat/vente en attente dont les conditions de déclenchement sont satisfaites (`execute_ordre()`).<br>2. Met à jour les statistiques de portefeuille (`majstats()`).<br>3. Recalcule le classement général des joueurs (`majclassement()`).<br>4. Détecte les actions devenues obsolètes ou inactives (`checkoutdated()`). |
| `webupdate` | Combine séquentiellement l'actualisation des scores, l'exécution des ordres et la mise à jour des classements. |
| `testscript` | Endpoint de test pour le téléchargement d'historiques boursiers. |

---

## 5. API XML pour Client Lourd (`www/prog.php`)

L'application intègre une API HTTP/XML consommée historiquement par le client de bureau en Visual Basic 6 (`nettrader2Client/`). Toutes les réponses sont encapsulées sous une racine XML standardisée :
```xml
<xml>
    <flux>
        <!-- Données de la réponse ou messages d'erreur -->
        <erreur>faux</erreur>
    </flux>
</xml>
```

### 5.1. Endpoints Publics & Authentification
- **`?do=login&pseudo=...&pass=...`** : Authentifie l'utilisateur via `proglogin()` et renvoie l'identifiant de session (`sess`).
- **`?do=infomsg&progver=...&progtyp=...`** : Renvoie les annonces système et vérifie la compatibilité de la version du client lourd (`proginfomess()`).

### 5.2. Endpoints Authentifiés (`?sess=...`)
Une fois le jeton de session validé par `ControleProgAcces()`, les actions suivantes sont accessibles :

| Endpoint `?do=...` | Paramètres | Description |
| :--- | :--- | :--- |
| `deco` | `sess` | Déconnexion et invalidation de la session du joueur. |
| `portef` | `sess` | Retourne la composition complète du portefeuille (liquidités, titres détenus, quantités, valorisations). |
| `lstordre` | `sess` | Liste des ordres de bourse en attente d'exécution. |
| `lstordreportef` | `sess` | Retourne simultanément le portefeuille et les ordres en attente. |
| `lstactionsachat`| `sess` | Liste de tous les titres boursiers négociables avec leurs cours actuels. |
| `sendachatvente` | `sens`, `codesicav`, `nbr`, `valmin`, `valmax`, `tempsmin`, `select`, `ansval`, `seuil`, `nb2` | Soumission d'un ordre d'achat ou de vente (au marché, à seuil ou sur plage de valeurs). |
| `getachatmax` | `codesico` | Calcule la quantité maximale d'actions achetable selon la liquidité et la marge disponible. |
| `getventemax` | `codesico` | Calcule la quantité maximale d'actions vendable (titres en portefeuille ou vente à découvert). |
| `lsthisto` | `depuis` | Historique des opérations réalisées depuis un timestamp donné. |
| `supprordre` | `idordre` | Annulation d'un ordre en attente. |
| `getinfoaction` | `codesico` | Fiche détaillée d'une valeur (nom, cours, variation, plus haut, plus bas, volume). |
| `getlienprofilaction` | `codesico` | URL d'aide ou fiche d'information web pour la valeur demandée. |

---

## 6. Fonctionnalités Applicatives et Règles de Jeu (`www/index.php`)

L'application web fournit une simulation boursière complète avec les fonctionnalités suivantes :

### 6.1. Simulation Boursière et Gestion de Portefeuille
- **Capital initial virtuel :** 10 000 € attribués à l'inscription (`CAPDEB`).
- **Modes de passage d'ordre :**
  - Ordre au marché (exécution immédiate au cours actuel).
  - Ordre à seuil de déclenchement (Stop / Limite).
  - Ordre sur plage de valeurs (déclenchement entre un cours min et max).
  - Vente à découvert et positions short.
- **Frais de courtage & Fiscalité :** Prise en compte de taxes et commissions virtuelles sur chaque transaction via `gettaxe()`.
- **Clôture journalière :** Traitement de fin de séance boursière via `finjour()`.

### 6.2. Compétition et Classements
- **Classement Général :** Classement en temps réel basé sur la valorisation totale du portefeuille (liquidités + valorisation des actions).
- **Classements Périodiques :** Classement journalier, hebdomadaire et mensuel avec calcul des pourcentages de progression.
- **Classement par Équipes :** Regroupement de joueurs au sein d'équipes et calcul de la performance collective.

### 6.3. Espace Communautaire et Social
- **Groupes / Équipes :** Création de groupe, adhésion, modération par le chef de groupe, statistiques et distinctions d'équipe.
- **Forums de discussion :** Forums thématiques, création de sujets, réponses avec mise en forme BBCode sécurisée (`bbtohtml()`), gestion des statuts de lecture (`setsujetlu()`).
- **Messagerie Privée :** Envoi et réception de messages internes entre joueurs connectés (`add_msg()`, `get_messagelist()`).

### 6.4. Administration (`nt2_adminfunction.php`)
- Gestion et modération des comptes joueurs (`lstplayeradmin`, `dodelplayers`).
- Supervision et édition des groupes (`admingroupes`).
- Administration des titres boursiers (`modiflstactions`, ajout, suspension ou paramétrage des tickers de référence).

---

## 7. Perspectives et Évolutions Futures

1. **Modernisation de l'API Client :**
   - Migration de l'API XML `prog.php` vers une API RESTful retournant du JSON avec authentification JWT ou sessions Bearer token.
2. **Couplage & Moteur de Données :**
   - Remplacement progressif des requêtes SQL concaténées par des requêtes préparées PDO via `ExecRequete($req, $conn, $params)`.
   - Remplacement de la fonction résiduelle `traitehtmlsicav` par une intégration Python native si des fonds spécifiques doivent être conservés.

