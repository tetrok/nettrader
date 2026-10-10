<?php

/**
 * NetTrader 2 — Configuration de Connexion Base de Données
 *
 * Usage:
 *   Définit les constantes d'identification (NOM, PASSE, BASE, SERVEUR)
 *   utilisées par la fonction legacy Connexion() dans db_connect.php.
 *
 * Logique & Fonctionnement:
 *   - Lit en priorité les variables d'environnement système (DB_USER, DB_PASSWORD, DB_HOST, DB_NAME)
 *     injectées par l'environnement Docker ou le serveur d'hébergement.
 *   - Utilise des valeurs par défaut pour faciliter le développement local.
 */

define ("NOM", getenv("DB_USER") !== false ? getenv("DB_USER") : "DATABASE USER");
  define ("PASSE", getenv("DB_PASSWORD") !== false ? getenv("DB_PASSWORD") : "DATABASE PASSWORD");
  define ("SERVEUR", getenv("DB_HOST") !== false ? getenv("DB_HOST") : "localhost");
  define ("BASE", getenv("DB_NAME") !== false ? getenv("DB_NAME") : "DATABASENAME");

?>
