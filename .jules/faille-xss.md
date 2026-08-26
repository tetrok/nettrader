# Proposition de solution : Faille XSS (Cross-Site Scripting)

L'application souffre de failles XSS potentielles car elle génère des vues en concaténant des chaînes de caractères (notamment dans `nt2_pages.php`) sans échapper systématiquement les données d'entrée utilisateur ou celles provenant de la base de données.

Voici une stratégie de remédiation en plusieurs étapes, allant des correctifs immédiats à une refonte de l'architecture d'affichage à plus long terme.

## 1. Création d'une fonction d'échappement centralisée (Court terme)
Au lieu d'utiliser `htmlspecialchars` avec ses paramètres verbeux partout dans le code, il convient de créer une fonction "helper" globale dans un fichier inclus partout (comme `nt2_function.php` ou `db_connect.php`).

```php
/**
 * Sécurise une chaîne de caractères pour l'affichage HTML
 */
function e($string) {
    if ($string === null) {
        return '';
    }
    // ENT_QUOTES : convertit les guillemets doubles et simples.
    // ENT_SUBSTITUTE : remplace les caractères invalides par un caractère de remplacement (évite les erreurs).
    return htmlspecialchars((string) $string, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
```

## 2. Sécurisation du parseur BBCode `bbtohtml` (Court terme)
La fonction `bbtohtml($text)` dans `nt2_function.php` effectue des remplacements de balises (ex: `[b]` vers `<b>`) mais n'échappe pas le HTML potentiellement présent dans la chaîne d'origine. Si un utilisateur poste `<script>alert(1)</script>`, ce code sera exécuté.

**Solution :** Échapper le contenu *avant* de parser le BBCode.
```php
function bbtohtml($text) {
    // 1. Échapper tout le HTML natif
    $text = e($text);

    // 2. Appliquer les remplacements BBCode...
    // ...
}
```

## 3. Sécurisation des helpers HTML (Court terme)
Les fonctions qui génèrent des éléments de formulaire et du HTML (comme `Html_texte`, `Html_pass`, `Html_liste`, etc. dans les fichiers `include_interface.php`) doivent utiliser la fonction d'échappement pour les valeurs et les attributs.

Exemple pour `Html_texte` :
```php
function Html_texte($nom, $valeur, $taille, $longueurmax, $add="") {
    // Échappement des attributs dynamiques
    $nom_safe = e($nom);
    $valeur_safe = e($valeur);

    return "<input name=\"$nom_safe\" type=\"text\" value=\"$valeur_safe\" size=\"$taille\" maxlength=\"$longueurmax\" $add class=\"post\">";
}
```

## 4. Application systématique lors des concaténations (Moyen terme)
Dans les fichiers comme `nt2_pages.php`, toutes les variables insérées dans les chaînes HTML doivent être échappées. Cela concerne les pseudonymes, titres, corps de messages, etc.

Exemple de correction dans `form_messagerie` :
*Avant :*
```php
$html .= openligne().opencol().lang(56).$value["pseudonyme"].closecol()...
```
*Après :*
```php
$html .= openligne().opencol().lang(56).e($value["pseudonyme"]).closecol()...
```

## 5. Transition vers un Moteur de Templates (Long terme)
L'approche de génération de HTML par concaténation de chaînes dans des fonctions PHP (comme `form_messagerie`, `achatvente`) est une dette technique majeure. Elle rend l'échappement fastidieux et source d'erreurs (oubli d'échappement).

**La vraie solution pérenne** est d'adopter le motif d'architecture **MVC** et d'utiliser un **Moteur de templates moderne (comme Twig ou Blade)**.
* **Avantage principal :** Les moteurs de templates modernes disposent de l'**auto-échappement** (auto-escaping). Toute variable affichée avec `{{ variable }}` est automatiquement échappée, annulant ainsi la quasi-totalité des risques XSS par défaut.
* Cela permettrait de supprimer tout le code HTML des fichiers comme `nt2_pages.php` pour le déporter dans des vues (`.html.twig`), rendant le code beaucoup plus propre et maintenable.
