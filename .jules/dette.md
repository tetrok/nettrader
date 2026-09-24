# Dette technique et Résolutions

Ce document récapitule l'état d'assainissement de l'application NetTrader 2, les dettes majeures résolues ainsi que les reliquats techniques mineurs.

---

## 1. Dettes Techniques Majeures Résolues ✅

L'ensemble des vulnérabilités critiques et des dettes structurelles majeures a été résolu avec succès :

### 🔒 Sécurité & Cryptographie (100% Résolu)
- **Injections SQL éradiquées :** 100% des requêtes SQL de l'application (`db_reqfunction.php`, `db_reqtableaux.php`, `db_connect.php`, `progreq.php`, `progfunc.php`, `nt2_progfunction.php`, `nt2_adminfunction.php`, `nt2_pages.php`, `nt2_function.php`, `redir.php`, contrôleurs REST et scripts Python) sont préparées via PDO avec paramètres liés (`$params`). La fonction d'échappement naïve historique `sec()` est dépréciée.
- **Failles XSS neutralisées :** Application systématique de la fonction d'échappement `e()` sur les données dynamiques dans toutes les vues, et sécurisation du parseur BBCode contre les liens non sûrs (`javascript:`).
- **Mots de passe & Sessions :** Migration complète de l'ancien hachage MD5 vers BCRYPT (`password_hash`, `password_verify`), mise à niveau transparente à la connexion, et jetons de session générés par CSPRNG (256 bits, 64 hex).
- **Durcissement de l'infrastructure :** Désactivation de l'endpoint VB6 historique `/prog.php` (404), sécurisation des tâches planifiées `cmd.php` par clé `X-Cron-Key`, protection `.htaccess` sur `tests/`, politique CORS stricte et protection contre les redirections ouvertes.

### 🏛️ Architecture Backend & Couche de Données (100% Résolu)
- **Autoloading PSR-4 :** Namespace `NetTrader\` configuré via Composer et `www/autoload.php`.
- **Élimination des `global` :** Abstraction de la session et des permissions dans `UserSession`, encapsulation des requêtes HTTP dans `Request`.
- **Services Métier :** Découpage modulaire de la logique métier (`TradingService`, `Database`, `FormattingService`, `MailerService`).
- **Couche d'Accès aux Données (DAL / Repositories) :** Mise en place d'une couche Repository découplée sous `NetTrader\Repository` (`BaseRepository`, `StockRepository`, `OrderRepository`, `PortfolioRepository`, `UserRepository`, `ForumRepository`). Validée par une suite de 29 tests unitaires dédiés (`www/tests/test_repositories.php`).
- **Contrôleurs REST :** Refactorisation des contrôleurs API (`MarketController`, `TradingController`, `AdminController`, `AuthController`, `CommunityController`) pour injecter et consommer les Repositories.

### 🎨 Frontend & Vues (100% Résolu)
- **Pivot Architectural :** Abandon des gabarits HTML 3.2/4.01 archaïques et du moteur de template serveur Twig au profit d'une **SPA moderne découplée en React 18 / TypeScript / Tailwind CSS**.
- **Disparition du JavaScript inline :** Plus aucun script JS généré à la volée par PHP ; logique d'interface gérée par des composants React modulaires avec typage TypeScript strict.
- **Expérience Mobile & Responsive :** Interface fluide, navigation par onglets, affichage graphique des cours et carnet d'ordres interactif.

### 📈 Micro-services & Supervision Boursière (100% Résolu)
- **Scraper Python moderne :** Remplacement des flux CSV obsolètes par `yfinance` avec cache local SQLite, repli automatique et journalisation continue dans `market_sync_log`.
- **Market Sync Monitor :** Espace dédié dans l'administration pour suivre l'état des cotations (dernière tentative, taux de succès, erreurs, retries, bascule du suivi et réinitialisation des compteurs d'échecs).

---

## 2. Reliquats Techniques Mineurs & Pistes d'Évolution 📋

1. **Nettoyage progressif du code procédural legacy :**
   - *Description :* Les anciens fichiers de rendu serveur (`www/nt2_pages.php`, `www/skin/`) subsistent pour assurer une rétrocompatibilité historique, mais l'intégralité du trafic moderne transite désormais par la SPA React et l'API REST `/api/...`.
   - *Action future :* Dépréciation finale et archivage des anciens fichiers procéduraux une fois la phase de transition totalement close.

2. **Flux secondaires historiques (SICAV / Devises) :**
   - *Description :* Les fonctions relatives aux SICAV historiques (`traitehtmlsicav`) sont aujourd'hui inactives ou secondaires.
   - *Action future :* Remplacer ou étendre `pythonfetch` pour inclure les devises (forex) et indices internationaux si le jeu le requiert.
