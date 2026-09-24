# Plan d'Action : Résolution des Dettes Techniques & Modernisation

Ce document définit la feuille de route opérationnelle pour assainir, sécuriser et moderniser l'application NetTrader 2 en s'appuyant sur l'état des dettes documenté dans `.jules/dette.md`.

---

## Vue d'Ensemble des Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 1 : Sécurité Critique (Injections SQL, XSS, Hachage Mots de passe)    │ ✅ Terminé
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 2 : Assainissement du Code (Autoloading PSR-4, Services Métier)       │ ✅ Terminé
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 3 : Refonte Architecturale (DAL/Repositories, Contrôleurs REST)       │ ✅ Terminé
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 4 : Modernisation Frontend & APIs (SPA React, API REST, Market Sync)  │ ✅ Terminé
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Phase 1 : Sécurité Critique & Remédiation des Vulnérabilités (Terminé ✅)

*Objectif : Éliminer 100% des vulnérabilités critiques (Injections SQL, Failles XSS, Hachage de mots de passe non sécurisé, protection des accès sensibles).*

### 1.1 Migration Exhaustive vers les Requêtes Préparées PDO (Terminé ✅)
- [x] **P1 - Critique : Authentification, Sessions & Inscription** :
  - `www/db_connect.php` (`cookievalide`, `ChercheInternaute`, `nbessai`, `ChercheSession`, `SessionValide`, `CreerSession`, `ControleAcces`, `deconnection`, `ChercheComptePseudo`).
  - `www/progfunc.php` (`ControleProgAcces`, `proglogin`, `progdeco`).
  - `www/nt2_pages.php` (`inscrjeu`, `editpass`, `editprofil`).
  - `www/db_reqfunction.php` (`getinternauteinfo`, `setmdp`).
- [x] **P2 - Haute : Transactions Financières, Ordres & Portefeuilles** :
  - `www/db_reqfunction.php` (`portefeuille_joueur`, `joueur_liste_sicav`, `joueur_possede`, `GetCashBack`, `ModifLiquide`, `AddHistorique`, `ModifAction`, `dansliste`, `AjoutPort`, `delete_sicav`, `listhisto`, `cmd_update_sicav`, `addordre`, `niv_joueur`, `get_ordre`, `efface_ordre`, `get_ordrelist`, `del_ordre`, `get_info_ordre`, `donnaction`, `donnactionyn`, `stataction`, `ordreactionachat`, `ordreactionvente`, `getplayercapital...`, `effacvieuxordres`, `effacordresinactifs`).
  - `www/nt2_pages.php` (`doachat`, `dovente`, `execute_ordre`, `supprordre`).
  - `www/progreq.php` (`progreqportef`, `progreqinfomess`).
- [x] **P3 - Haute : API XML Client Lourd & Scripts utilitaires** :
  - `www/progfunc.php`, `www/progreq.php`, `www/prog.php`, `www/redir.php`, `www/nt2_progfunction.php`.
- [x] **P4 - Moyenne : Forums, Groupes & Messagerie** :
  - `www/db_reqtableaux.php`, `www/db_reqfunction.php` (requêtes de forum, messages, gestion des équipes et invitations paramétrées).
- [x] **P5 - Moyenne : Interface d'Administration** :
  - `www/nt2_adminfunction.php`, `www/db_reqfunction.php` (requêtes d'administration et de maintenance).
- [x] **P6 - Clôture : Dépréciation de `sec()`** :
  - Fonction `sec()` dépréciée et convertie en retour direct sans altération SQL indésirable.

### 1.2 Sécurisation XSS Systématique des Vues (Terminé ✅)
- [x] **Appliquer la fonction d'échappement `e()`** sur toutes les sorties dynamiques dans :
  - `www/nt2_pages.php` (tableaux d'achats/ventes, profils, classements, messagerie, forums).
  - `www/skin/default/include_interface.php` et `www/skin/GreyTortle/include_interface.php`.
  - `www/nt2_adminfunction.php`.
- [x] Neutralisation des injections Javascript dans le parseur BBCode `bbtohtml()`.

### 1.3 Modernisation de l'Authentification et des Mots de Passe (Terminé ✅)
- [x] Remplacer `md5($motDePasse)` par `password_hash()` (algorithme `PASSWORD_BCRYPT`).
- [x] Mise à niveau transparente lors du login : conversion automatique de MD5 vers BCRYPT.
- [x] Sécurisation des cookies de session (`HttpOnly`, `SameSite=Lax`).
- [x] Génération de jetons de session cryptographiquement sûrs (CSPRNG 256 bits, 64 caractères hex).

### 1.4 Durcissement de l'Infrastructure & Base de Données (Terminé ✅)
- [x] Remplacement du moteur de stockage obsolète MyISAM par **InnoDB** avec conformité ACID sur 100% des tables.
- [x] Suppression de l'accès au client VB6 historique (`/prog.php` renvoie désormais un code HTTP 404).
- [x] Sécurisation des crons (`cmd.php`) protégés par un jeton secret dans l'en-tête `X-Cron-Key`.
- [x] Protection des répertoires sensibles (`tests/`) par `.htaccess`.
- [x] Sécurisation CORS (rejet des origines arbitraires) et protection anti Open-Redirect dans `redir.php`.

---

## 🟡 Phase 2 : Assainissement et Refactoring du Code Procédural (Terminé ✅)

*Objectif : Éliminer les dépendances globales, introduire une architecture modulaire et préparer la transition MVC/REST.*

### 2.1 Élimination du mot-clé `global` et des Superglobales
- [x] Création de la classe `UserSession` encapsulant l'utilisateur connecté, son état d'authentification et ses permissions.
- [x] Remplacement de l'accès direct aux superglobales par la classe `Request` dédiée.
- [x] Passage explicite des connexions PDO et injection de dépendances.

### 2.2 Structuration du Code et Autoloading PSR-4
- [x] Configuration de l'autoloader PSR-4 (`NetTrader\` pointant vers `www/src/`).
- [x] Découpage en services spécialisés :
  - `TradingService` : règles métier, validation financière, calculs de marges et de VAD.
  - `FormattingService` : parseur BBCode sécurisé et formatage des cours.
  - `MailerService` : préparation des alertes e-mails et notifications.
  - `Database` : abstraction centralisée des requêtes préparées PDO.
  - `Request` & `ApiResponse` : couche HTTP et standardisation des réponses JSON.

---

## 🟢 Phase 3 : Refonte Architecturale & Couche d'Accès aux Données (Terminé ✅)

*Objectif : Mettre en place une séparation stricte entre données, logique applicative et API.*

### 3.1 Couche d'Accès aux Données (Repositories / DAL) (Terminé ✅)
- [x] `BaseRepository` : classe abstraite centralisant les opérations PDO (`fetchOne`, `fetchAll`, `execute`, `lastInsertId`, gestion des transactions).
- [x] `StockRepository` : cotations, recherche, variations, KPI et filtres du Market Sync Monitor.
- [x] `OrderRepository` : gestion du carnet d'ordres, passage, annulation et calculs des volumes engagés.
- [x] `PortfolioRepository` : positions en portefeuille, calculs de PRU, valorisation globale et historique.
- [x] `UserRepository` : profil, cashback, hachage des mots de passe, sessions et classements.
- [x] `ForumRepository` : sections, rubriques, sujets, messages et synchronisation des compteurs.
- [x] Suite de tests unitaires dédiée : `www/tests/test_repositories.php` (29/29 tests PASS).

### 3.2 Contrôleurs et Routage RESTful (Terminé ✅)
- [x] Routeur applicatif `NetTrader\Http\Router` orienté requêtes REST (`GET`, `POST`, `PUT`, `DELETE`).
- [x] Contrôleurs découplés utilisant les Repositories et Services :
  - `MarketController` : cotations, top variations, résumé du marché.
  - `TradingController` : portefeuille, passage/annulation d'ordres, simulations.
  - `AdminController` : KPIs administration, modération des joueurs, gestion du forum, supervision Market Sync.
  - `AuthController` : inscription, login, logout, gestion de profil et changement de mot de passe.
  - `CommunityController` : forums, discussions, messagerie interne et équipes.

### 3.3 Pivot Architectural : Remplacement de Twig par la SPA React (Validé & Terminé ✅)
- [x] **Décision d'architecture validée :** Abandon du moteur de template serveur Twig au profit de l'application monopage (SPA) React 18 / TypeScript découplée, le backend PHP agissant comme un serveur d'API REST robuste et sécurisé.

---

## 🔵 Phase 4 : Modernisation Frontend, SPA React & Synchronisation Boursière (Terminé ✅)

*Objectif : Offrir une expérience utilisateur contemporaine, fluide et supervisable.*

### 4.1 Application Monopage React 18 & TypeScript (Terminé ✅)
- [x] Interface moderne sous React 18, Vite, TypeScript et Tailwind CSS.
- [x] Composants modulaires avec navigation par onglets :
  - Tableau de bord & Marché (cours en temps réel, graphiques).
  - Portefeuille & Carnet d'ordres (passage d'ordres interactif, simulateur).
  - Administration complète (gestion des joueurs, modération du forum, purge des sessions).
  - **Espace Suivi des Cotations (Market Sync Monitor)** avec filtres de statut, retry count, bascule de suivi et réinitialisation d'erreurs.
- [x] Gestion d'état fluide avec synchronisation asynchrone via Axios.

### 4.2 Modernisation du Micro-service de Cotations Python (Terminé ✅)
- [x] Migration de `pythonfetch/pynt2markdown.py` vers `yfinance` avec cache local SQLite.
- [x] Paramétrage complet des requêtes SQL pour éviter toute injection.
- [x] Journalisation granulaire dans la table `market_sync_log` et enrichissement de `cacval` (`fail_count`, `retry_count`, `last_status`, `last_error`).
- [x] Gestion intelligente du repli (fallback individuel) et non-désactivation permanente des tickers.

---

## Matrice de Suivi et Validation Globale

| Tâche / Chantier | Domaine | Priorité | Complexité | Statut |
| :--- | :--- | :---: | :---: | :---: |
| **Requêtes préparées PDO systématiques** | Sécurité | 🔴 Haute | Moyenne | ✅ Terminé |
| **Suppression / Dépréciation de `sec()`** | Sécurité | 🔴 Haute | Faible | ✅ Terminé |
| **Échappement XSS & parseur BBCode** | Sécurité | 🔴 Haute | Moyenne | ✅ Terminé |
| **Hachage BCRYPT des mots de passe** | Sécurité | 🔴 Haute | Faible | ✅ Terminé |
| **Migration BDD InnoDB & Clôture VB6** | Infrastructure | 🔴 Haute | Moyenne | ✅ Terminé |
| **Suppression des `global` & Contexte de session** | Architecture | 🟡 Moyenne | Moyenne | ✅ Terminé |
| **Autoloading PSR-4 & Services métier** | Architecture | 🟡 Moyenne | Moyenne | ✅ Terminé |
| **Repositories / Couche DAL (29 tests PASS)** | Architecture | 🟢 Moyenne | Élevée | ✅ Terminé |
| **Routeur et Contrôleurs RESTful** | Architecture | 🟢 Moyenne | Élevée | ✅ Terminé |
| **Remplacement Twig -> SPA React 18** | Architecture | 🟢 Moyenne | Élevée | ✅ Terminé |
| **UI Moderne Responsive Tailwind CSS** | Frontend | 🔵 Basse | Élevée | ✅ Terminé |
| **API RESTful JSON (53 tests PASS)** | API | 🔵 Basse | Moyenne | ✅ Terminé |
| **Supervision Market Sync Monitor** | Exploitation | 🟢 Moyenne | Moyenne | ✅ Terminé |
