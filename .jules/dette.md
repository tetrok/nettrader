# Dette technique et problèmes restants

L'analyse de l'application met en évidence l'état d'avancement des chantiers techniques et les dettes restantes.

## 1. État des Lieux et Avancement Récent

Plusieurs points critiques d'obsolescence, de sécurité et d'architecture ont déjà été traités :
- **Compatibilité PHP 8.x :** Correction des fonctions supprimées ou dépréciées (`ereg_replace`, `each()`, `get_magic_quotes_gpc`, `is_null`, gestion des types `null`).
- **Short Open Tags :** Remplacement systématique de toutes les balises d'ouverture `<?` par `<?php`.
- **Infrastructure de requêtes préparées & Sécurisation SQL (P1 & P2 terminés) :**
  - Mise à niveau du connecteur PDO dans `www/db_connect.php` ; `ExecRequete()` prend désormais en charge les paramètres préparés (`$params = []`) et classe `Database` centralisée.
  - **P1 (Authentification & Sessions) :** Migration intégrale des fonctions de session/connexion (`db_connect.php`, `progfunc.php`, `nt2_pages.php`, `db_reqfunction.php`).
  - **P2 (Transactions Financières, Ordres & Portefeuilles) :** Migration intégrale des fonctions de trading, gestion d'ordres, passage d'ordres, calculs de liquidités/capitaux et portefeuilles (`db_reqfunction.php`, `nt2_pages.php`, `progreq.php`).
- **Flux Boursiers Externes :** Remplacement des anciens flux CSV morts par le micro-service Python `pythonfetch/pynt2markdown.py` exploitant `yfinance` avec gestion de lots, repli individuel et journalisation continue (respectant la règle de non-désactivation permanente des tickers). Neutralisation des anciennes fonctions de scraping PHP obsolètes (`traiteeuronextcsv`, `traiteyahoocsv`).
- **Fondations de sécurisation XSS :** Introduction de la fonction globale d'échappement `e()` dans `www/nt2_function.php`, sécurisation préalable du parseur BBCode `bbtohtml()` et des fonctions génératrices de champs de formulaires HTML (`Html_texte`, `Html_pass`, `Html_liste`, etc.).
- **Assainissement & Autoloading PSR-4 (Phase 2 terminée) :**
  - Mise en place de l'autoloader PSR-4 (`NetTrader\`) dans `composer.json` et `www/autoload.php`.
  - Découpage modulaire de `nt2_function.php` en services métier réutilisables : `TradingService`, `FormattingService`, `MailerService`, `Database`.
  - Encapsulation des requêtes HTTP et superglobales dans la classe `Request` (suppression de `global $do; $do = &$_GET['do'];`).
  - Encapsulation de la session et des permissions dans `UserSession`.

---

## 2. Dettes Techniques Restantes

### 🔒 Sécurité

1. **Migration systématique vers les requêtes préparées (Injections SQL - P3 à P6 restants) :**
   - *Constat :* Les périmètres P1 (Authentification) et P2 (Trading & Ordres) sont désormais 100% sécurisés avec requêtes préparées. Il reste à migrer l'API XML (`progfunc.php`, `progreq.php`), les tableaux de forums et messagerie (`db_reqtableaux.php`, `db_reqfunction.php`), et l'administration (`nt2_adminfunction.php`).
   - *Objectif :* Finaliser les priorités P3 à P5 puis supprimer définitivement la fonction `sec()` (P6).

2. **Échappement XSS systématique dans les vues :**
   - *Constat :* Les vues dans `www/nt2_pages.php`, `www/index.php` et `www/nt2_adminfunction.php` injectent directement des variables issues de la base de données ou de l'utilisateur (pseudonymes, titres, corps de messages, commentaires de forum, descriptions de groupe) sans appel systématique à `e()`.
   - *Objectif :* Sécuriser l'ensemble des concaténations d'affichage avant la mise en place d'un moteur de templates.

3. **Authentification et Mots de passe (Cryptographie obsolète) :**
   - *Constat :* Les mots de passe sont hachés avec un simple `md5()` sans sel dans `www/db_connect.php`, et les sessions personnalisées sont stockées de façon rudimentaire en table `session`.
   - *Objectif :* Adopter `password_hash()` et `password_verify()` (BCRYPT / ARGON2ID) avec migration transparente à la connexion, et sécuriser le mécanisme de session/cookies (HttpOnly, Secure, SameSite).

---

### 🏛️ Architecture et Conception

1. **Absence de séparation MVC (Modèle - Vue - Contrôleur) :**
   - *Constat :* `www/index.php` et `www/prog.php` concentrent l'intégralité du routage via de volumineux blocs `switch ($do)`. Les fonctions de `www/nt2_pages.php` mélangent logique métier, requêtes SQL et génération de balises HTML.
   - *Objectif :* Découpler le routage (Contrôleurs), la logique métier/accès données (Services/Repositories) et l'affichage (Vues / Templates).

2. **Couche d'abstraction de données (DAL / Repository) :**
   - *Constat :* Des dizaines de fonctions procédurales dans `www/db_reqfunction.php` et `www/db_reqtableaux.php` exécutent des requêtes brutes sans typage, sans validation ni objets métiers (DTO / Entités).
   - *Objectif :* Structurer les accès aux données sous forme de classes Repository dédiées (ex. `UserRepository`, `PortfolioRepository`, `OrderRepository`, `MarketRepository`).

---

### 🎨 Frontend & Code Legacy

1. **Skins et HTML Archaïque (HTML 3.2 / 4.01) :**
   - *Constat :* Les fichiers `www/skin/default/include_interface.php` et `www/skin/GreyTortle/include_interface.php` utilisent des balises obsolètes (`<font>`, `<center>`), des attributs dépréciés (`bgcolor`, `cellpadding`, `cellspacing`, `border`) et des structures de tableaux imbriquées pour la mise en page.
   - *Objectif :* Refondre l'intégration graphique vers du HTML5 sémantique et du CSS moderne (Flexbox/Grid), compatible responsive / mobile.

2. **JavaScript Inline généré côté serveur :**
   - *Constat :* Du JavaScript obsolète est généré à la volée par PHP dans `www/nt2_pages.php` (`jscript_av()`, `jscript_ordre()`, `checkForm()`).
   - *Objectif :* Externaliser le JavaScript dans des scripts dédiés et standardisés, sans génération PHP dynamique de scripts inline.

---

### 📡 API et Données

1. **Modernisation de l'API XML Client (`prog.php`) :**
   - *Constat :* L'API utilisée historiquement par le client lourd (`nettrader2Client`) génère du XML artisanal via `www/progfunc.php` et `www/progreq.php`.
   - *Objectif :* Fournir des endpoints API RESTful au format JSON pour permettre une intégration moderne (clients web, mobiles, bots).

2. **Flux secondaires (SICAV / Devises) :**
   - *Constat :* La fonction `traitehtmlsicav()` et les flux annexes nécessitent d'être audités pour déterminer s'ils doivent être migrés dans le service Python ou dépréciés.
