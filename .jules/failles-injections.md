# Sécurisation contre les Failles d'Injection SQL

Ce document dresse l'état des lieux, documente l'infrastructure technique en place et détaille la feuille de route pour éradiquer les risques d'injection SQL dans **NetTrader 2**.

---

## 1. État des Lieux et Avancement Réalisé

L'infrastructure de base a déjà été modernisée pour supporter nativement les requêtes préparées PDO sans rompre la rétrocompatibilité du code procédural existant.

### 1.1. Infrastructure PDO (`www/db_connect.php`)
- **Connexion PDO centralisée :** La fonction `Connexion()` configure le connecteur PDO avec le charset `utf8mb4` et désactive l'émulation des requêtes préparées (`PDO::ATTR_EMULATE_PREPARES => false`) pour s'assurer que les requêtes préparées sont traitées nativement par le moteur MySQL/MariaDB.
- **Support des paramètres préparés dans `ExecRequete()` :**
  La fonction centrale d'exécution SQL `ExecRequete` a été enrichie d'un troisième paramètre optionnel `$params = []` :
  ```php
  function ExecRequete($requete, $connexion = null, $params = [])
  {
      global $nbreqexecuted, $tempssql, $last_pdo_stmt;
      $nbreqexecuted++;
      $tempdeb = getmicrotime();

      if (!($connexion instanceof PDO)) {
          $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
      }

      try {
          if (!empty($params)) {
              $resultat = $connexion->prepare($requete);
              if ($resultat !== false) {
                  $resultat->execute($params);
              }
          } else {
              $resultat = $connexion->query($requete);
          }
      } catch (\PDOException $e) {
          $resultat = false;
      }
      // ...
  }
  ```

### 1.2. Évolution de la fonction `sec()`
- La fonction historique `sec()` (qui reposait sur `addslashes` et `get_magic_quotes_gpc`) a été réécrite pour utiliser `$connexion->quote()` et `htmlentities()`.
- **Statut :** Bien qu'améliorée, la fonction `sec()` reste un palliatif incomplet et a vocation à être dépréciée puis supprimée au profit exclusif des requêtes préparées.

---

## 2. Diagnostic & Risques Résiduels

Malgré la disponibilité du paramètre `$params` dans `ExecRequete()`, **l'immense majorité des requêtes applicatives continue d'utiliser la concaténation de chaînes de caractères**.

### Principales vulnérabilités identifiées :

1. **Valeurs numériques injectées sans quotes :**
   Dans de nombreuses requêtes, des identifiants (`$idcompte`, `$id_ordre`, `$codesico`) sont concaténés sans quotes :
   ```php
   // Exemple vulnérable dans db_reqfunction.php
   $requete = "SELECT * FROM portef WHERE idcompte = $idcompte AND codesico = $codesico";
   ```
   Même si `sec()` est appliqué, l'échappement de quotes est inopérant si la variable n'est pas entourée de guillemets dans la clause SQL.

2. **Mélange de responsabilités (Persistance vs Affichage) :**
   `sec()` applique `htmlentities()` au moment de la construction de la requête SQL. Cela pollue les données brutes enregistrées en base (ex: caractères accentués, symboles) et ne remplace pas un échappement contextuel en sortie (XSS).

3. **Clauses dynamiques non paramétrables (`ORDER BY`, `ASC/DESC`, `LIMIT`) :**
   Plusieurs fonctions de pagination ou de tri construisent dynamiquement leurs requêtes sans liste blanche (whitelist) de colonnes autorisées.

---

## 3. Guide Pratique et Règles de Migration

Pour convertir le code procédural vers des requêtes préparées sécurisées, les développeurs doivent appliquer les règles suivantes :

### 3.1. Règle d'or
> **Ne jamais concaténer de variables dans une chaîne SQL.**
> Toutes les valeurs dynamiques doivent être transmises sous forme de marqueurs `?` (positionnels) ou `:nom` (nommés) via le tableau `$params`.

---

### 3.2. Exemples de Conversion Concrets

#### A. Requêtes de Lecture (SELECT)
* **Code existant (vulnérable / concaténation) :**
  ```php
  function get_info_ordre($id_ordre) {
      global $internaute;
      $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
      $query = "SELECT * FROM ordres WHERE id_ordre = '" . sec($id_ordre) . "' AND idcompte = '$internaute->idcompte'";
      $run_query = ExecRequete($query, $connexion);
      return LigneSuivante($run_query);
  }
  ```

* **Code cible (sécurisé avec requêtes préparées) :**
  ```php
  function get_info_ordre($id_ordre) {
      global $internaute;
      $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
      $query = "SELECT * FROM ordres WHERE id_ordre = ? AND idcompte = ?";
      $run_query = ExecRequete($query, $connexion, [$id_ordre, $internaute->idcompte]);
      return LigneSuivante($run_query);
  }
  ```

#### B. Requêtes d'Écriture (INSERT / UPDATE)
* **Code existant :**
  ```php
  function ModifLiquide($id_compte, $valeur, $signe) {
      $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
      $query = "UPDATE compte SET cashback = cashback $signe " . sec($valeur) . " WHERE idcompte = '" . sec($id_compte) . "'";
      return ExecRequete($query, $connexion);
  }
  ```

* **Code cible :**
  ```php
  function ModifLiquide($id_compte, $valeur, $signe) {
      $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
      // Whitelist stricte pour l'opérateur arithmétique (+ ou -)
      $op = ($signe === '-') ? '-' : '+';
      $query = "UPDATE compte SET cashback = cashback $op ? WHERE idcompte = ?";
      return ExecRequete($query, $connexion, [(float)$valeur, (int)$id_compte]);
  }
  ```

#### C. Clauses avec listes variables (`WHERE ... IN (...)`)
* **Code existant :**
  ```php
  $query = "UPDATE cacval SET down = '0' WHERE yahooname IN ($chaineupdate)";
  ```

* **Code cible :**
  ```php
  $placeholders = implode(',', array_fill(0, count($tickers), '?'));
  $query = "UPDATE cacval SET down = '0' WHERE yahooname IN ($placeholders)";
  ExecRequete($query, $connexion, $tickers);
  ```

---

## 4. Plan de Migration par Priorité

| Priorité | Module / Périmètre | Fichiers Cibles | Statut / Risque Métier |
| :--- | :--- | :--- | :--- |
| **P1 - Critique** | **Authentification, Sessions & Inscription** | `www/db_connect.php`<br>(`ChercheInternaute`, `ChercheSession`, `CreerSession`, `cookievalide`, `nbessai`, `deconnection`, `ChercheComptePseudo`)<br>`www/progfunc.php` (`ControleProgAcces`, `proglogin`, `progdeco`)<br>`www/nt2_pages.php` (`inscrjeu`)<br>`www/db_reqfunction.php` (`getinternauteinfo`, `setmdp`) | **✅ Traité** : Migré intégralement vers requêtes préparées avec paramètres `$params`. |
| **P2 - Haute** | **Transactions Financières, Ordres & Portefeuilles** | `www/db_reqfunction.php`<br>(`portefeuille_joueur`, `joueur_liste_sicav`, `joueur_possede`, `GetCashBack`, `ModifLiquide`, `AddHistorique`, `ModifAction`, `dansliste`, `AjoutPort`, `delete_sicav`, `listhisto`, `cmd_update_sicav`, `addordre`, `niv_joueur`, `get_ordre`, `efface_ordre`, `get_ordrelist`, `del_ordre`, `get_info_ordre`, `donnaction`, `donnactionyn`, `stataction`, `ordreactionachat`, `ordreactionvente`, `getplayercapital...`)<br>`www/nt2_pages.php` (`doachat`, `dovente`, `execute_ordre`, `supprordre`)<br>`www/progreq.php` (`progreqportef`) | **✅ Traité** : Migré intégralement vers requêtes préparées avec paramètres `$params`. |
| **P3 - Haute** | **API XML Client Lourd** | `www/progfunc.php`<br>`www/progreq.php`<br>`www/prog.php` | À traiter (Injection via paramètres GET non assainis) |
| **P4 - Moyenne** | **Forums, Groupes & Messagerie** | `www/db_reqtableaux.php`<br>`www/db_reqfunction.php` (messages, groupes, forums) | À traiter (Altération ou extraction de données privées) |
| **P5 - Moyenne** | **Interface d'Administration** | `www/nt2_adminfunction.php`<br>`www/index.php` | À traiter (Élévation de privilèges) |
| **P6 - Clôture** | **Suppression de `sec()`** | Ensemble du projet | Dette technique résiduelle |

---

## 5. Dépréciation et Retrait de `sec()`

Une fois l'ensemble des requêtes migrées vers la signature à trois paramètres `ExecRequete($sql, $connexion, $params)` :
1. Déclarer la fonction `sec()` `@deprecated` avec avertissement dans les logs de développement.
2. Nettoyer les appels restants dans le code applicatif.
3. Supprimer définitivement la fonction `sec()` de `www/db_connect.php`.