# Incompatibilités avec PHP 8

Voici la liste des incompatibilités avec PHP 8 identifiées dans le code source de l'application, obtenues suite à une analyse avec PHP_CodeSniffer et le standard PHPCompatibility.

## 1. Fonction `ereg_replace` obsolète et supprimée

- **Fichier :** `www/nt2_progfunction.php`
- **Ligne :** 48
- **Problème :** L'extension `ereg` et toutes ses fonctions associées (comme `ereg_replace`) sont obsolètes depuis PHP 5.3 et ont été **complètement retirées** depuis PHP 7.0. L'utilisation de cette fonction dans PHP 8 entraînera une erreur fatale (`Fatal error: Uncaught Error: Call to undefined function ereg_replace()`).
- **Solution / Alternative :** Il est nécessaire de remplacer l'utilisation de `ereg_replace` par son équivalent compatible avec les expressions régulières Perl-Compatible (PCRE), à savoir la fonction `preg_replace`. Attention, les expressions régulières passées à `preg_replace` doivent être encadrées par des délimiteurs (par exemple `/`).

## 2. Fonction `each` obsolète

- **Fichier :** `www/skin/GreyTortle/include_interface.php`
- **Ligne :** 81
- **Problème :** La fonction `each()` a été déclarée obsolète depuis PHP 7.2 et a été **retirée** depuis PHP 8.0. Son utilisation provoquera une erreur fatale (`Fatal error: Uncaught Error: Call to undefined function each()`).
- **Solution / Alternative :** La documentation et les bonnes pratiques recommandent fortement de remplacer l'usage de la fonction `each()` (souvent utilisée dans des boucles `while (list(...) = each(...))`) par une boucle `foreach`, qui est plus performante, plus lisible et supportée par PHP 8.
