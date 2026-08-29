# Plan d'Action : Résolution des Dettes Techniques Restantes

Ce document définit la feuille de route opérationnelle pour assainir, sécuriser et moderniser l'application NetTrader 2 en s'appuyant sur l'état des dettes documenté dans `.jules/dette.md`.

---

## Vue d'Ensemble des Phases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 1 : Sécurité Critique (Injections SQL, XSS, Hachage Mots de passe)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 2 : Assainissement du Code (Autoloading PSR-4, Suppression des globals)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 3 : Refonte Architecturale MVC (Repositories, Contrôleurs, Twig)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 4 : Modernisation Frontend & APIs (HTML5/CSS3, JS moderne, API REST)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Phase 1 : Sécurité Critique & Remédiation des Vulnérabilités (Priorité Haute)

*Objectif : Éliminer 100% des vulnérabilités critiques (Injections SQL, Failles XSS, Hachage de mots de passe non sécurisé).*

### 1.1 Migration Exhaustive vers les Requêtes Préparées PDO (En cours - P1 & P2 validés ✅)
- [x] **P1 - Critique : Authentification, Sessions & Inscription** (Terminé ✅) :
  - `www/db_connect.php` (`cookievalide`, `ChercheInternaute`, `nbessai`, `ChercheSession`, `SessionValide`, `CreerSession`, `ControleAcces`, `deconnection`, `ChercheComptePseudo`).
  - `www/progfunc.php` (`ControleProgAcces`, `proglogin`, `progdeco`).
  - `www/nt2_pages.php` (`inscrjeu`).
  - `www/db_reqfunction.php` (`getinternauteinfo`, `setmdp`).
- [x] **P2 - Haute : Transactions Financières, Ordres & Portefeuilles** (Terminé ✅) :
  - `www/db_reqfunction.php` (`portefeuille_joueur`, `joueur_liste_sicav`, `joueur_possede`, `GetCashBack`, `ModifLiquide`, `AddHistorique`, `ModifAction`, `dansliste`, `AjoutPort`, `delete_sicav`, `listhisto`, `cmd_update_sicav`, `addordre`, `niv_joueur`, `get_ordre`, `efface_ordre`, `get_ordrelist`, `del_ordre`, `get_info_ordre`, `donnaction`, `donnactionyn`, `stataction`, `ordreactionachat`, `ordreactionvente`, `getplayercapital...`, `effacvieuxordres`, `effacordresinactifs`).
  - `www/nt2_pages.php` (`doachat`, `dovente`, `execute_ordre`, `supprordre`).
  - `www/progreq.php` (`progreqportef`).
- [ ] **P3 - Haute : API XML Client Lourd** (À faire) :
  - `www/progfunc.php`, `www/progreq.php`, `www/prog.php`.
- [ ] **P4 - Moyenne : Forums, Groupes & Messagerie** (À faire) :
  - `www/db_reqtableaux.php`, `www/db_reqfunction.php` (fonctions forum, messages, gestion des équipes).
- [ ] **P5 - Moyenne : Interface d'Administration** (À faire) :
  - `www/nt2_adminfunction.php`, `www/index.php`.
- [ ] **P6 - Clôture : Dépréciation et suppression définitive de `sec()`** (À faire) :
  - Suppression de la fonction après migration de l'intégralité des requêtes.

### 1.2 Sécurisation XSS Systématique des Vues
- [ ] **Appliquer la fonction d'échappement `e()`** sur toutes les sorties dynamiques dans :
  - `www/nt2_pages.php` (tableaux d'achats/ventes, profils, classements, messages).
  - `www/skin/default/include_interface.php` et `www/skin/GreyTortle/include_interface.php`.
  - `www/nt2_adminfunction.php`.
- [ ] Valider l'échappement des pseudonymes, titres, corps de messages et descriptions personnalisées.

### 1.3 Modernisation de l'Authentification et des Mots de Passe
- [ ] Remplacer `md5($motDePasse)` par `password_hash()` (algorithme `PASSWORD_BCRYPT` ou `PASSWORD_ARGON2ID`).
- [ ] Mettre en place un mécanisme de **mise à niveau transparente** lors du login :
  - Si le hash en BDD correspond à `md5($passe)`, vérifier et ré-encoder immédiatement avec `password_hash()` avant de sauvegarder.
- [ ] Sécuriser les cookies de session (`HttpOnly`, `SameSite=Lax`, `Secure` si HTTPS).

---

## 🟡 Phase 2 : Assainissement et Refactoring du Code Procédural (Terminé ✅)

*Objectif : Éliminer les dépendances globales, introduire une architecture modulaire et préparer la transition MVC.*

### 2.1 Élimination du mot-clé `global` et des Superglobales
- [x] Créer un objet de contexte utilisateur / session (`UserSession` ou `AuthContext`) encapsulant l'utilisateur connecté (`$internaute`) et ses droits.
- [x] Remplacer l'accès direct aux variables superglobales (`global $do; $do = &$_GET['do']`) par une méthode propre de récupération (`filter_input` ou classe Request dédiée).
- [x] Passer explicitement la connexion PDO et les dépendances aux fonctions/méthodes plutôt que d'utiliser des variables globales.

### 2.2 Structuration du Code et Autoloading PSR-4
- [x] Configurer `composer.json` pour intégrer un autoloader PSR-4 (`NetTrader\\...` pointant vers `www/src/`).
- [x] Découper le fichier monolithique `www/nt2_function.php` en services spécialisés :
  - `TradingService` (calcul de taxes, valorisation portefeuille, passage d'ordres).
  - `FormattingService` (parseur BBCode, utilitaires d'affichage).
  - `MailerService` (préparation des alertes et notifications).
  - `Database` (gestionnaire centralisé des requêtes préparées PDO).
  - `Request` (abstraction sécurisée des requêtes HTTP).

---

## 🟢 Phase 3 : Refonte Architecturale MVC & Couche de Données (Priorité Moyenne)

*Objectif : Mettre en place une séparation stricte entre données, logique applicative et affichage.*

### 3.1 Couche d'Accès aux Données (Repositories / Entities)
- [ ] Créer des classes Repositories dédiées :
  - `OrderRepository`
  - `PortfolioRepository`
  - `MarketRepository` (`cacval`, cours boursiers)
  - `UserRepository` / `AccountRepository`
  - `ForumRepository` / `MessageRepository`
- [ ] Définir des modèles ou Data Objects légers typés pour manipuler des objets plutôt que des tableaux associatifs bruts.

### 3.2 Contrôleurs et Routage
- [ ] Remplacer le `switch ($do)` de `www/index.php` par un routeur léger associant les routes `/action` à des classes de Contrôleurs :
  - `MarketController` (cotations, graphiques, détails des valeurs).
  - `TradeController` (passage d'ordres, suivi du portefeuille, historique).
  - `LeaderboardController` (classements individuels et par équipes).
  - `ForumController` / `MessageController` (communauté, messagerie interne).
  - `AdminController` (gestion des joueurs, administration des cours).

### 3.3 Intégration d'un Moteur de Templates (Twig)
- [ ] Installer Twig via Composer (`twig/twig`).
- [ ] Remplacer la concaténation de chaînes dans `www/nt2_pages.php` par des fichiers templates `.html.twig`.
- [ ] Tirer parti de l'**auto-échappement natif de Twig** pour supprimer définitivement le risque de failles XSS à l'affichage.

---

## 🔵 Phase 4 : Modernisation Frontend, JavaScript & APIs (Priorité Moyenne-Basse)

*Objectif : Offrir une expérience utilisateur contemporaine (UI responsive, interactions asynchrones, API REST).*

### 4.1 Refonte de l'Interface Graphique (HTML5 / CSS3 Responsive)
- [ ] Supprimer les balises et attributs HTML obsolètes (`<font>`, `<center>`, `bgcolor`, `cellspacing`).
- [ ] Éliminer les structures de mise en page basées sur des balises `<table>` au profit d'un layout moderne en CSS Grid / Flexbox.
- [ ] Rendre l'application pleinement compatible mobile / tablette (Responsive Design).

### 4.2 Modernisation du JavaScript
- [ ] Supprimer la génération de JavaScript inline depuis PHP (`jscript_av()`, `jscript_ordre()`).
- [ ] Créer des modules JS externes avec gestion d'événements propre (`addEventListener`).
- [ ] Implémenter des requêtes asynchrones `fetch()` pour le rafraîchissement des cours et le passage d'ordres sans rechargement complet de la page.

### 4.3 Modernisation des APIs et Services d'Arrière-Plan
- [ ] Migrer l'API XML historique (`www/prog.php`, `progfunc.php`) vers une API REST JSON standardisée.
- [ ] Auditer les flux secondaires (`traitehtmlsicav` dans `www/nt2_function.php`) et intégrer si nécessaire leur récupération dans le service `pythonfetch`.

---

## Matrice de Suivi et Priorisation

| Tâche / Chantier | Domaine | Priorité | Complexité | Statut |
| :--- | :--- | :---: | :---: | :---: |
| **Requêtes préparées PDO (P1 Auth & P2 Trading/Ordres)** | Sécurité | 🔴 Haute | Moyenne | ✅ Terminé |
| **Requêtes préparées PDO (P3 API XML, P4 Forums, P5 Admin)** | Sécurité | 🔴 Haute | Moyenne | 🔄 En cours |
| **Suppression définitive de la fonction `sec()` (P6)** | Sécurité | 🔴 Haute | Faible | À faire |
| **Échappement XSS dans `nt2_pages.php` et vues** | Sécurité | 🔴 Haute | Moyenne | En cours (`e()` disponible) |
| **Hachage BCRYPT / ARGON2ID des mots de passe** | Sécurité | 🔴 Haute | Faible | À faire |
| **Suppression des `global` & Contexte de session** | Architecture | 🟡 Moyenne | Moyenne | ✅ Terminé |
| **Autoloading PSR-4 & Découpage modulaire** | Architecture | 🟡 Moyenne | Moyenne | ✅ Terminé |
| **Repositories / Couche DAL** | Architecture | 🟢 Moyenne | Élevée | À faire |
| **Routeur et Contrôleurs (MVC)** | Architecture | 🟢 Moyenne | Élevée | À faire |
| **Moteur de templates Twig** | Vues / Sécurité | 🟢 Moyenne | Élevée | À faire |
| **UI HTML5 / CSS3 Responsive** | Frontend | 🔵 Basse | Élevée | À faire |
| **API RESTful JSON (Remplacement XML)** | API | 🔵 Basse | Moyenne | À faire |
| **Flux secondaires SICAV / Devises en Python** | Données | 🔵 Basse | Faible | À faire |
