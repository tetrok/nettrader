# Dette technique et problèmes restants

L'analyse de l'application met en évidence la présence de dettes techniques et fonctionnelles. La migration vers PHP 8 a corrigé la plupart des erreurs liées aux fonctions obsolètes ou supprimées (`mysql_*`, `ereg_replace`, `each()`, `get_magic_quotes_gpc`), mais plusieurs points critiques subsistent :

## Sécurité
- **Failles d'injection SQL :** Les requêtes SQL dans l'application ont été passées de `mysql_*` à `PDO`/`mysqli_*`. Cependant, les fonctions de base telles que `db_connect.php` contiennent toujours une fonction `sec()` qui essaie de sécuriser en échappant les quotes, mais n'utilise pas de paramètres nommés ou préparés de manière systématique dans tout le code. Cela laisse l'application très vulnérable.
- **Faille XSS :** L'application génère du HTML (dans `nt2_pages.php` et ailleurs) en concaténant des chaînes. Les entrées utilisateurs (ex. forums, messages) ne semblent pas être systématiquement échappées avec `htmlspecialchars()` à l'affichage.

## Architecture
- **Pas de séparation MVC (Modèle-Vue-Contrôleur) :** L'application utilise `index.php` comme routeur, et le rendu est mélangé avec la logique métier via concaténation de HTML dans des fonctions comme dans `nt2_pages.php`.
- **Utilisation du mot-clé `global` :** Les variables globales (ex. `global $internaute, $do;`) sont extrêmement répandues dans les fonctions, ce qui rend le code fragile et complique la maintenance et les tests.
- **Requêtes SQL non factorisées :** Les requêtes sont dispersées dans des fichiers comme `db_reqfunction.php` sous forme de fonctions individuelles au lieu d'utiliser une couche d'abstraction structurée (ORM ou Repository).

## Code Legacy
- **Fichiers de Skins :** L'interface repose sur des fichiers comme `www/skin/GreyTortle/include_interface.php` qui construisent le HTML de façon archaïque (balises obsolètes comme `<font>`, `bgcolor`, `<center>`).
- **Short Open Tags :** Corrigé, plus aucun fichier ne contient la balise d'ouverture `<?` qui est désactivée par défaut sur les environnements modernes.

## API et Fonctionnalités
- **Flux Boursiers Externes :** Le projet se base sur d'anciens flux CSV obsolètes (Yahoo Finance, Euronext) qui n'existent plus. Les fonctions comme `traiteeuronextcsv` et `traiteyahoocsv` sont cassées.
