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

$internaute = (object)['idcompte' => 1, 'authlevel' => 2];
\NetTrader\Auth\UserSession::current()->setUser($internaute);

$request = \NetTrader\Http\Request::createFromGlobals();
$url = $request->getString('url', '');
$ip = $request->getClientIp();

$query = "INSERT INTO `statout` (`tmps`, `ip`, `url`) VALUES (UNIX_TIMESTAMP(), ?, ?)";
$connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
ExecRequete($query, $connexion, [$ip, $url]);

// Filtrer URL pour éviter les attaques d'open redirect non désirées
if (preg_match('/^https?:\/\//i', $url)) {
    header("Location: $url", true, 302);
} else {
    header("Location: index.php", true, 302);
}
exit();
?>