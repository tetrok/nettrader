# NetTrader 2
## Architecture de l'application

NetTrader 2 est une ancienne application web (probablement un jeu de simulation boursière/gestion de portefeuille) développée en PHP natif procédural, sans framework moderne (comme Symfony ou Laravel).

L'architecture repose sur un modèle de type "Front Controller" simplifié où un point d'entrée principal (`index.php`) gère le routage vers différentes fonctions via un paramètre `do` passé en GET (`?do=...`). L'affichage (la vue) n'est pas strictement séparé de la logique métier, bien que des fonctions de génération de code HTML et des fichiers de "skin" (`skin/default/include_interface.php`) soient utilisés pour structurer le rendu.

### Structure des fichiers principaux

*   `index.php` : C'est le cœur de l'application. Il initialise la session, charge les dépendances, gère l'authentification rudimentaire et contient un gigantesque `switch` sur la variable `$do` pour exécuter les actions (ex: `login`, `formachatvente`, `classement`, `postemessage`, etc.).
*   `const.php` / `constbdd.php` : Fichiers de configuration contenant les constantes globales du jeu (capital de départ, adresses des API, règles) et les identifiants de connexion à la base de données.
*   `cmd.php` : Un script CLI ou un point d'entrée secondaire probablement utilisé pour les tâches planifiées (cron jobs) pour la mise à jour des cours de bourse ou la clôture journalière.

### Modules et Librairies

Le code n'utilise pas Composer ni de librairies tierces modernes. Il s'appuie sur des fonctions internes réparties dans plusieurs fichiers :

*   **Couche d'accès aux données (DAL) :**
    *   `db_connect.php` : Gère la connexion au serveur MySQL et la sécurisation rudimentaire des entrées (fonction `sec()`).
    *   `db_reqfunction.php` : Contient l'immense majorité des requêtes SQL de l'application sous forme de fonctions (ex: `portefeuille_joueur()`, `AddHistorique()`, `creer_ordre()`, `doforum_postmessage()`).
    *   `db_reqtableaux.php` : Regroupe des requêtes spécifiques retournant des tableaux de données.
*   **Logique métier (Business Logic) :**
    *   `nt2_function.php` : Contient des fonctions utilitaires diverses : manipulation de chaînes (BBCode, formatage), calculs (taxes, valeur du portefeuille, statistiques), génération de portions HTML (tableaux, messages) et la logique d'import CSV depuis Euronext/Yahoo (ex: `traiteeuronextcsv`, `traiteyahoocsv`).
    *   `nt2_progfunction.php` / `progfunc.php` / `progreq.php` : Fonctions liées à l'exécution asynchrone ou à un module de "programmation" interne au jeu.
*   **Contrôleurs et Vues :**
    *   `nt2_pages.php` : Contient les fonctions générant le code HTML complet pour des vues spécifiques, comme le formulaire d'achat/vente (`achatvente()`).
    *   `nt2_adminfunction.php` : Regroupe les fonctions dédiées à l'interface d'administration du jeu.

## Dépendances et Prérequis

*   **PHP** : Le code a été écrit pour PHP 4/5. Il utilise la très vieille extension `mysql_` (qui a été retirée dans PHP 7.0) et les *short open tags* (`<?`). Actuellement, la machine cible est sous PHP 8.3.6. **Le code ne fonctionnera pas sur cette version de PHP sans réécriture majeure.**
*   **Base de données** : Un serveur MySQL 5.x. Les tables doivent être créées (le schéma SQL n'est pas fourni dans le répertoire `www/`). Les constantes de connexion doivent être définies dans `constbdd.php`.
*   **Réseau/APIs externes** : L'application dépendait de flux CSV pour les cours de la bourse via d'anciennes adresses :
    *   `http://fr.old.finance.yahoo.com/d/quotes.csv`
    *   `http://www.euronext.com/search/download/trapridownloadpopup.jcsv`
    *   `http://www.bourse-de-paris.fr/servlet/graph.intraDay3`

## Obsolescences, Mauvaises Pratiques et Modifications Urgentes

Le code est dans un état de forte dette technique et présente de graves failles de sécurité.

1.  **Obsolescence fatale : Extension `mysql_`**
    *   L'application utilise massivement `mysql_connect()`, `mysql_query()`, `mysql_fetch_array()`, etc. Ces fonctions n'existent plus en PHP 8.
    *   **Action urgente :** Remplacer toutes les occurrences par l'extension `mysqli` ou migrer vers `PDO`.

2.  **Faille de sécurité majeure : Injections SQL**
    *   La fonction de sécurisation `sec()` dans `db_connect.php` repose sur `get_magic_quotes_gpc()` (fonction dépréciée et retirée de PHP) et `addslashes()`. Ce n'est pas suffisant pour protéger contre les injections SQL, en particulier avec certains encodages (comme GBK) et cela ne protège pas les requêtes non entourées de quotes.
    *   **Action urgente :** Utiliser des requêtes préparées avec PDO ou MySQLi pour toutes les interactions avec la base de données.

3.  **Mauvaise Pratique : Short Open Tags (`<?`)**
    *   Les fichiers PHP commencent par `<?` au lieu de `<?php`. Cela nécessite l'activation de `short_open_tag` dans `php.ini`, ce qui est désactivé par défaut.
    *   **Action urgente :** Remplacer tous les `<?` par `<?php`.

4.  **Mauvaise Pratique de Programmation : Variables superglobales globales**
    *   `index.php` et d'autres fichiers manipulent les superglobales avec le mot-clé `global` (ex: `global $do; $do=&$_GET['do'];`). C'est dangereux, source de bugs difficiles à tracer et va à l'encontre des bonnes pratiques d'encapsulation. L'utilisation du passage par référence `&` sur ces variables est également inutile et obsolète.
    *   **Action urgente :** Utiliser directement `$_GET['do']` avec des filtres (`filter_input` ou l'opérateur de coalescence `??`).

5.  **Failles de sécurité (XSS) et génération HTML spaghetti**
    *   Le code génère du HTML (tableaux, formulaires, balises obsolètes comme `<center>`) directement dans les fonctions PHP via concaténation, sans séparation MVC. Les données issues de la base ou de l'utilisateur ne sont pas toujours échappées avec `htmlspecialchars()` lors de l'affichage.

6.  **Obsolescence : APIs tierces mortes**
    *   Les URL des API Yahoo Finance et Euronext définies dans `const.php` sont obsolètes et retournent des erreurs 404. L'application est incapable de mettre à jour les cours boursiers.
    *   **Action urgente :** Intégrer de nouvelles API financières (Alpha Vantage, IEX Cloud, Yahoo Finance non-officiel via RapidAPI) et réécrire les parseurs (`traiteyahoocsv`, `traiteeuronextcsv`).

7.  **Incompatibilités PHP 8.x**
    *   Utilisation de fonctions dépréciées (ex: `is_null()` en majuscule). Beaucoup de fonctions généreront des *Warnings* ou des *Fatal Errors* (passage de `null` à des fonctions internes, index de tableaux non définis, constructeurs obsolètes style PHP 4 avec le nom de la classe).

En l'état, l'application nécessite un processus de réécriture (Refactoring) massif pour être sécurisée et fonctionnelle sur un serveur moderne.

### Détail des Fonctions par Fichier

#### 1. Fichiers d'Accès aux Données (DAL)

**`db_connect.php`**
Gère la connexion à MySQL et les sessions.
*   `Connexion()`, `ExecRequete()`, `LigneSuivante()` : Wrappers rudimentaires autour de `mysql_connect`, `mysql_query`, etc.
*   `sec()` : Fonction critique et **obsolète** tentant de sécuriser les entrées via `addslashes` et `get_magic_quotes_gpc`.
*   `CreerSession()`, `ControleAcces()`, `ChercheSession()`, `deconnection()` : Gestion de l'authentification et des sessions personnalisées en base.

**`db_reqfunction.php`**
Contient l'écrasante majorité des requêtes SQL d'action (INSERT, UPDATE, DELETE).
*   *Gestion de Portefeuille :* `portefeuille_joueur()`, `joueur_liste_sicav()`, `ModifLiquide()`, `AddHistorique()`, `ModifAction()`, `creer_ordre()`, `addordre()`, `execute_ordre()`.
*   *Gestion des Groupes/Équipes :* `doajgroupe()`, `dojoingroupe()`, `domodifgroupe()`, `getperfgroupes()`, `increcompensegroupe()`.
*   *Forums et Messagerie :* `add_msg()`, `dodelmessage()`, `doforum_postmessage()`, `forum_ajoutforum()`, `setsujetlu()`.
*   *Statistiques et Classements :* `majclassement()`, `insertscore()`, `getplayercapital()`.

**`db_reqtableaux.php`**
Fonctions SQL retournant des listes (tableaux) pour l'affichage.
*   `get_messagelist()`, `get_playerconnected()`, `get_lstactions()`, `get_listeforums()`, `get_listesujets()`, `get_listemessages()`.

#### 2. Fichiers de Logique Métier (Business Logic)

**`nt2_function.php`**
Boîte à outils principale, logique de calcul et formatage.
*   *Parsers CSV externes :* `traiteeuronextcsv()`, `traiteyahoocsv()`, `traitehtmlsicav()`. (Ces fonctions utilisent des API désormais mortes).
*   *Logique Boursière :* `updateplayersicav()` (mise à jour du portefeuille), `gettaxe()`, `finjour()` (clôture journalière), `cmd_to_update_liste()`.
*   *Formatage et Utilitaires :* `bbtohtml()` (parseur BBCode), `envoimail()`, `classtohtmlcolor()`, `leading_zero()`.

**`nt2_adminfunction.php`**
Logique métier réservée aux administrateurs.
*   `lstplayeradmin()` (lister les joueurs), `dodelplayers()` (supprimer des joueurs), `admingroupes()`, `modiflstactions()`.

**`progfunc.php` & `progreq.php`**
Fonctions pour un module "client riche" ou une API XML secondaire (nommé "prog").
*   `expl()`, `bal()`, `generTab()`, `errorxmlmessage()` : Génération et parsing de flux XML.
*   `proglogin()`, `progportef()`, `progordre()`, `progachatmax()` : Points d'entrée de l'API XML pour les actions du joueur.

#### 3. Fichiers de Rendu et Contrôleurs (Vues)

**`index.php`**
Le contrôleur frontal (Routeur).
*   Il ne contient pas de fonctions, mais un grand `switch ($do)` qui intercepte les requêtes : `case "accueil"`, `case "login"`, `case "formachatvente"`, `case "classement"`, `case "postemessage"`, etc., et appelle les fonctions de rendu appropriées.

**`nt2_pages.php`**
Fonctions générant les interfaces utilisateur (vues HTML avec concaténation).
*   *Vues de Bourse :* `achatvente()`, `formlistaction()`, `formachat()`, `formvente()`, `form_list_ordre()`.
*   *Vues Utilisateur/Groupe :* `formprofil()`, `formclasse()` (classement joueurs), `classementequipes()`, `tabgroupeprofil()`.
*   *Forums et Textes :* `lstforums()`, `lstsujets()`, `lstposts()`, `txt_faq()`, `txt_regl()`.
*   *Scripts JS Intégrés :* Contient également des fonctions générant du JavaScript en ligne comme `jscript_av()`, `jscript_ordre()`, `checkForm()`, `emoticon()`.

**`cmd.php` & `prog.php`**
Points d'entrées secondaires (Contrôleurs).
*   `cmd.php` : Probablement exécuté en tâche de fond (cron) pour appeler les mises à jour de données (`nt2_function.php`).
*   `prog.php` : Le routeur du module XML ("prog"), fonctionnant de manière similaire à `index.php`.
