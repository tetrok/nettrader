<?
/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/
  define ("NOM", getenv("DB_USER") !== false ? getenv("DB_USER") : "DATABASE USER");
  define ("PASSE", getenv("DB_PASSWORD") !== false ? getenv("DB_PASSWORD") : "DATABASE PASSWORD");
  define ("SERVEUR", getenv("DB_HOST") !== false ? getenv("DB_HOST") : "localhost");
  define ("BASE", getenv("DB_NAME") !== false ? getenv("DB_NAME") : "DATABASENAME");

?>
