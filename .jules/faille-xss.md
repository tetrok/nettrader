# Stratégie et Suivi de Remédiation : Faille XSS (Cross-Site Scripting)

Ce document détaille l'état d'avancement et le plan de remédiation complet contre les vulnérabilités XSS (Cross-Site Scripting) dans l'application NetTrader 2.

---

## 1. Synthèse de l'État d'Avancement

| Étape | Description | Fichiers Concernés | Statut |
| :--- | :--- | :--- | :---: |
| **1. Helper d'échappement global** | Implémentation de la fonction `e($string)` | `www/nt2_function.php` | ✅ **FAIT** |
| **2. Sécurisation de `bbtohtml()`** | Échappement préventif du HTML avant transformation BBCode | `www/nt2_function.php` | ✅ **FAIT** |
| **3. Sécurisation des helpers HTML** | Échappement des attributs dans `Html_texte`, `Html_pass`, etc. | `www/skin/*/include_interface.php` | ✅ **FAIT** |
| **4. Échappement dans les vues** | Sécurisation systématique des concaténations de chaînes | `www/nt2_pages.php`, `nt2_adminfunction.php` | ⏳ **EN COURS** |
| **5. Moteur de templates (MVC)** | Migration vers Twig avec auto-escaping natif par défaut | Architecture globale / `templates/` | 📋 **PLANIFIÉ** (Phase 3) |

---

## 2. Détail des Correctifs Déjà Déployés

### ✅ 2.1 Fonction d'Échappement Centralisée (`e()`)
La fonction helper globale a été intégrée dans `www/nt2_function.php` pour fournir un échappement UTF-8 standardisé :

```php
/**
 * Sécurise une chaîne de caractères pour l'affichage HTML
 * @param mixed $string
 * @return string
 */
function e($string)
{
    if ($string === null) {
        return '';
    }
    // ENT_QUOTES : convertit les guillemets doubles et simples.
    // ENT_SUBSTITUTE : remplace les caractères invalides par un caractère de remplacement.
    return htmlspecialchars((string) $string, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
```

### ✅ 2.2 Sécurisation du Parseur BBCode (`bbtohtml()`)
Le parseur BBCode dans `www/nt2_function.php` échappe désormais l'intégralité du HTML natif transmis par l'utilisateur **avant** d'appliquer les remplacements de balises sûres (`[b]`, `[i]`, `[url]`, etc.) :

```php
function bbtohtml($text)
{
    // 1. Échapper tout le HTML natif injecté
    $text = e($text);

    // 2. Traitement sécurisé des balises BBCode...
}
```

### ✅ 2.3 Sécurisation des Composants de Formulaire (`include_interface.php`)
Les générateurs d'éléments HTML dans `www/skin/default/include_interface.php` et `www/skin/GreyTortle/include_interface.php` (`Html_radio`, `Html_texte`, `Html_textezone`, `Html_pass`, `Html_liste`, etc.) appliquent systématiquement `e()` sur leurs noms, valeurs et libellés d'attributs.

---

## 3. Chantiers Restants & Plan d'Exécution

### ⏳ 3.1 Échappement Systématique dans les Vues (`www/nt2_pages.php`)

L'application concatène directement des données dynamiques (entrées utilisateurs, données en BDD) dans le HTML retourné par les fonctions de `www/nt2_pages.php`.

#### Périmètres et Fonctions Prioritaires :

1. **Forums de Discussion (`lstforums`, `lstsujets`, `lstposts`, `forum_postmessage`) :**
   - Noms et descriptions de forums : `e($lignefo->nomforum)`, `e($lignefo->descriptionforum)`.
   - Titres de sujets et auteurs : `e($lignefo->txtsujet)`, `e($lignefo->pseudoauteur)`, `e($lignefo->lastpseudo)`.
   - Titres de messages et signatures : `e($post->titrepost)`, `e($post->pseudo)`.

2. **Messagerie Privée & Communications (`form_messagerie`, `form_nouvmessage`, `sendmessage`, `form_news`) :**
   - Pseudonymes d'expéditeurs/destinataires : `e($value['pseudonyme'])`, `e($destinataire->pseudonyme)`.
   - Titres et aperçus de messages : `e($value['titre'])`.

3. **Profils Joueurs et Groupes/Équipes (`formprofil`, `tabgroupeprofil`, `frmmodifajgroupe`, `frminvitejoueur`) :**
   - Informations utilisateur : `e($internaute->pseudonyme)`, `e($player->pseudonyme)`, `e($player->email)`.
   - Informations de groupe : `e($infogroupe->nomgroupe)`, `e($infogroupe->descriptiongroupe)`, `e($infogroupe->pseudonyme)`.

4. **Classements et Tableaux de Bord (`formclasse`, `classementequipes`, `sous_formclasse`) :**
   - Pseudonymes des traders : `e($value['pseudonyme'])`.
   - Noms et tags de groupes : `e($nomgroupe)`, `e($grp_lbl)`.

5. **Commentaires et Aides Contextuelles (`profilaction`, `txt_help`) :**
   - Auteurs de commentaires : `e($lignecomment->pseudonyme)`.

6. **Panneau d'Administration (`www/nt2_adminfunction.php`) :**
   - Listes d'utilisateurs (`lstplayeradmin`), modifications de groupes (`admingroupes`), logs et formulaires d'administration.

---

## 4. Règles de Sécurisation Contextuelle

Lors de l'application des correctifs dans le code PHP, il convient de respecter les règles suivantes selon le contexte d'insertion :

| Contexte | Exemple vulnérable | Correction sécurisée |
| :--- | :--- | :--- |
| **Corps HTML** | `<td>" . $pseudo . "</td>` | `<td>" . e($pseudo) . "</td>` |
| **Attribut HTML** | `<input value=\"" . $nom . "\">` | `<input value=\"" . e($nom) . "\">` |
| **Paramètre URL (GET)** | `<a href=\"?do=profil&u=" . $pseudo . "\">` | `<a href=\"?do=profil&u=" . urlencode($pseudo) . "\">` |
| **Texte formaté BBCode** | `bbtohtml($texte)` | `bbtohtml($texte)` *(déjà protégé en interne via `e()`)* |
| **Données JSON / Script** | `var user = '" . $pseudo . "';` | `var user = " . json_encode($pseudo) . ";` |

---

## 5. Stratégie à Long Terme : Moteur de Templates avec Auto-Escaping (Phase 3)

La solution pérenne pour éradiquer définitivement les failles XSS consiste à abandonner la concaténation de chaînes dans `www/nt2_pages.php` au profit d'un moteur de templates moderne (**Twig**) :

- **Auto-échappement automatique :** Toute variable injectée via `{{ variable }}` est automatiquement protégée contre les injections XSS sans nécessiter d'appel manuel à `e()`.
- **Séparation des responsabilités :** Déport complet du balisage HTML dans des fichiers `.html.twig` dédiés et découplage avec la logique métier.
- **Maintenance simplifiée :** Réduction drastique des risques de régression lors de l'ajout de nouvelles interfaces ou fonctionnalités.
