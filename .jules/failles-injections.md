# Proposition de Sécurisation : Failles d'Injection SQL

## Problème Actuel
L'application a été migrée de `mysql_*` à `PDO`/`mysqli_*`, mais la sécurisation des requêtes repose toujours sur une fonction obsolète et peu fiable `sec()` dans `www/db_connect.php`, qui se contente d'échapper les quotes. De nombreuses requêtes SQL utilisent la concaténation de chaînes de caractères, exposant l'application à des attaques par injection SQL.

## Objectif
Adopter systématiquement les requêtes préparées (Prepared Statements) de PDO, qui constituent le standard actuel pour prévenir les injections SQL, tout en évitant de casser l'existant en respectant la règle de ne pas modifier les signatures de fonction existantes là où ce n'est pas strictement nécessaire.

## Solution Proposée

### 1. Faire évoluer la fonction `ExecRequete`
Nous proposons de modifier la signature de la fonction `ExecRequete` en ajoutant un paramètre optionnel `$params` (tableau) à la fin de sa signature. Cela permet de rendre la fonction compatible avec les requêtes préparées tout en gardant une parfaite compatibilité ascendante avec toutes les requêtes non préparées existantes dans le code.

```php
/**
 * Fonction ExecRequete
 * @param string $requete La requête SQL (éventuellement avec des marqueurs ?)
 * @param mixed $connexion La connexion PDO (ou null pour utiliser la connexion globale)
 * @param array $params Les paramètres pour la requête préparée (optionnel)
 */
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
            // Utilisation d'une requête préparée
            $resultat = $connexion->prepare($requete);
            $resultat->execute($params);
        } else {
            // Utilisation classique de query() pour la rétrocompatibilité
            $resultat = $connexion->query($requete);
        }

        $tempssql = $tempssql + round((getmicrotime() - $tempdeb), 2);

        if ($resultat !== false) {
            $last_pdo_stmt = $resultat;
            return $resultat;
        } else {
            // Gestion des erreurs (inchangée)
            // ... (Code de gestion des erreurs existant)
        }
    } catch (\PDOException $e) {
        // ... (Gestion de l'exception)
    }
}
```

### 2. Migration Progressive des Requêtes
Avec cette modification, nous pourrons parcourir le code (comme dans `db_reqfunction.php`) et remplacer les requêtes construites par concaténation par des requêtes préparées.

**Avant :**
```php
function get_info_ordre($id_ordre) {
    global $internaute;
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    // Vulnérable si $id_ordre n'est pas correctement sécurisé
    $query="SELECT * FROM ordres WHERE id_ordre='".sec($id_ordre)."' AND idcompte='$internaute->idcompte'";
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}
```

**Après :**
```php
function get_info_ordre($id_ordre) {
    global $internaute;
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    // Sécurisé par préparation, plus besoin de sec()
    $query = "SELECT * FROM ordres WHERE id_ordre = ? AND idcompte = ?";
    $params = [$id_ordre, $internaute->idcompte];
    $run_query = ExecRequete ($query, $connexion, $params);
    return LigneSuivante($run_query);
}
```

### 3. Obsolescence Progressive de `sec()`
Une fois que toutes les requêtes auront été migrées vers l'utilisation de requêtes préparées via `ExecRequete(..., ..., $params)`, la fonction `sec()` pourra être officiellement déclarée obsolète et retirée, car le driver PDO se chargera de la sécurisation (échappement et formatage) des paramètres transmis à `execute()`.

## Conclusion
Cette approche est progressive et sans risque de régression :
1. Elle ne casse pas les appels existants à `ExecRequete($query, $connexion)`.
2. Elle introduit un moyen natif et sûr d'exécuter des requêtes préparées de façon centralisée.
3. Elle permet de nettoyer le code de manière itérative.