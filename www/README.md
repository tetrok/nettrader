# NetTrader 2
## Architecture de l'application
NetTrader 2 est une ancienne application web (probablement un jeu de simulation boursière/gestion de portefeuille) développée en PHP natif sans framework apparent. L'architecture repose sur un point d'entrée principal (`index.php`) qui gère le routage vers différentes fonctions via un paramètre `do` en GET. L'affichage est géré par des fonctions de génération de HTML et des inclusions de fichiers de "skin" (`skin/default/include_interface.php`).

Les fichiers clés sont :
*   `index.php` : Point d'entrée, gestionnaire de sessions et contrôleur principal.
*   `const.php` / `constbdd.php` : Configuration (constantes globales et accès base de données).
*   `db_connect.php`, `db_reqfunction.php`, `db_reqtableaux.php` : Couche d'accès aux données.
*   `nt2_function.php`, `nt2_pages.php`, `nt2_adminfunction.php` : Logique métier et génération de pages HTML.

## Dépendances et Prérequis
*   **PHP** : Le code utilise la très vieille extension `mysql_` (qui a été retirée dans PHP 7.0). Actuellement, la machine cible est sous PHP 8.3.6. **Le code ne fonctionnera pas sur cette version de PHP sans réécriture majeure ou ajout d'une extension de rétrocompatibilité (très déconseillé).** Il a été conçu pour PHP 4 ou 5 (utilisation des short open tags `<?` au lieu de `<?php`, fonctions dépréciées, etc.).
*   **Base de données** : Serveur MySQL. Les constantes de connexion doivent être définies dans `constbdd.php`.
*   **Réseau/APIs externes** : L'application tente de récupérer des données financières (CSV) via de vieilles API Yahoo Finance (`http://fr.old.finance.yahoo.com/d/quotes.csv`) et Euronext. Ces API sont probablement obsolètes ou ont changé de format.

## Obsolescences, Mauvaises Pratiques et Modifications Urgentes

1.  **Obsolescence : Extension `mysql_`**
    *   **Problème :** L'application utilise abondamment l'extension `mysql_*` (`mysql_connect`, `mysql_query`, `mysql_fetch_array`, etc.). Cette extension est supprimée depuis PHP 7.
    *   **Action urgente :** Remplacer toutes les occurrences par `mysqli_*` ou, de préférence, par `PDO` pour bénéficier des requêtes préparées.

2.  **Mauvaise Pratique : Short Open Tags (`<?`)**
    *   **Problème :** Les fichiers (ex: `index.php`, `db_connect.php`) s'ouvrent avec `<?` au lieu de `<?php`. Cela dépend de la directive `short_open_tag` dans le `php.ini`, qui est souvent désactivée par défaut aujourd'hui.
    *   **Action urgente :** Remplacer tous les `<?` en début de fichier par `<?php`.

3.  **Faille de sécurité : Injections SQL (Magic Quotes et `addslashes`)**
    *   **Problème :** La fonction de sécurisation `sec()` (dans `db_connect.php`) repose sur `get_magic_quotes_gpc()` (fonction dépréciée et retirée depuis PHP 5.4/8.0) et `addslashes()`. `addslashes()` n'est pas suffisant pour protéger contre les injections SQL, surtout selon l'encodage de la base.
    *   **Action urgente :** Supprimer la dépendance à `magic_quotes_gpc`. Utiliser `mysqli_real_escape_string()` ou mieux, migrer vers des requêtes préparées avec PDO/MySQLi pour toutes les interactions avec la base de données. L'échappement HTML (`htmlentities`) ne doit se faire qu'à l'affichage (XSS), pas avant l'insertion en BDD.

4.  **Mauvaise Pratique : Utilisation de variables superglobales par référence et de manière globale**
    *   **Problème :** `index.php` utilise `global $do; $do=&$_GET['do'];` etc. C'est une très mauvaise pratique qui pollue l'espace global, crée des dépendances cachées et des potentiels bugs. L'accès aux superglobales doit être direct ou encapsulé correctement.
    *   **Action urgente :** Nettoyer le passage de paramètres. Arrêter de mettre tout en `global`. Utiliser des filtres comme `filter_input()`.

5.  **Faille de sécurité (XSS) / Mauvaise Pratique HTML**
    *   **Problème :** Génération de HTML directement dans le code PHP via concaténation (ex: fonctions `opentab`, `msgtab`). Pas de séparation claire entre la vue et le contrôleur/modèle (MVC absent). Utilisation d'anciennes balises HTML (`<center>`, attributs de style en ligne).
    *   **Action à moyen terme :** Refactoriser pour utiliser un système de templates (ex: Twig, Blade) ou au moins séparer le code PHP de l'HTML (fichiers `.phtml`). Échapper correctement les variables lors de l'affichage avec `htmlspecialchars()`.

6.  **Obsolescence : APIs tierces**
    *   **Problème :** Les URL `http://fr.old.finance.yahoo.com...` et `http://www.euronext.com/...` définies dans `const.php` sont très probablement mortes. L'application ne pourra pas mettre à jour ses cours de bourse.
    *   **Action urgente :** Vérifier l'état de ces APIs et trouver des alternatives modernes (Alpha Vantage, IEX Cloud, Yahoo Finance API via RapidAPI, etc.) et réécrire les fonctions d'import de données correspondantes.

7.  **Mauvaise Pratique : `IS_NULL` au lieu de `is_null()` ou `isset()`**
    *   **Problème :** Utilisation de `IS_NULL()` en majuscule dans `index.php`. En PHP 8, générer des avertissements si la variable n'existe pas.
    *   **Action urgente :** Utiliser `isset()` ou l'opérateur de coalescence nulle `??` pour vérifier l'existence des variables provenant de `$_GET` ou `$_POST` avant de les utiliser.

8.  **Problèmes potentiels PHP 8.x**
    *   Beaucoup de fonctions dépréciées (ex: passage de paramètres null à des fonctions internes, accès à des offsets de tableaux non définis) vont lancer des erreurs fatales ou des `TypeError` en PHP 8.

En résumé, l'application est dans un état de forte dette technique, non fonctionnelle sur un environnement PHP moderne (PHP 8+) et présente de sérieuses failles de sécurité potentielles. Une réécriture majeure ou une migration minutieuse (avec des outils comme RectorPHP pour la mise à niveau du code) est indispensable avant toute mise en production.
