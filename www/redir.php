<?php

/**
 * Fichier: redir.php
 * Ce fichier contient les fonctions suivantes :
 * - get_ip
 */

//profil d'un groupe( classement integr�)
/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
*/

include_once (__DIR__ . "/autoload.php");
include_once ("const.php");
include_once ("constbdd.php");
include_once ("db_connect.php");

$request = \NetTrader\Http\Request::createFromGlobals();
$url = $request->getString('url', '');
$ip = $request->getClientIp();

$query = "INSERT INTO `statout` (`tmps`, `ip`, `url`) VALUES (UNIX_TIMESTAMP(), ?, ?)";
$connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
ExecRequete($query, $connexion, [$ip, $url]);

// Filtrer URL pour éviter les attaques d'open redirect
$allowedHosts = [
    'fr.finance.yahoo.com',
    'download.finance.yahoo.com',
    'www.euronext.com',
    'euronext.com',
    'localhost',
    '127.0.0.1'
];

$parsed = parse_url($url);
$host = isset($parsed['host']) ? strtolower($parsed['host']) : '';

if (!empty($host) && in_array($host, $allowedHosts, true) && preg_match('/^https?:\/\//i', $url)) {
    header("Location: $url", true, 302);
} elseif (empty($host) && strpos($url, '/') === 0 && strpos($url, '//') !== 0) {
    header("Location: $url", true, 302);
} else {
    header("Location: index.php", true, 302);
}
exit();
?>