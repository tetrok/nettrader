<?php

/**
 * Fichier: db_reqtableaux.php
 * Ce fichier contient les fonctions suivantes :
 * - get_messagelist
 * - get_messagelistenvoye
 * - get_playerconnected
 * - get_oldplayer
 * - get_players
 * - get_sicavcat
 * - get_acttotpossede
 * - getnbstats
 * - exepublicreq
 * - exeanspublicreq
 * - get_listeaide
 * - get_listecomment
 * - get_listefaq
 * - get_listecommentfaq
 * - get_lstactions
 * - get_listeforums
 * - get_listesujets
 * - get_infoforum
 * - get_listemessages
 * - get_infosujet
 * - get_infomessage
 */

/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/
function get_messagelist($debligne,$nbligne,$idcompte)
{
    global $internaute;
    $query = " SELECT compte.pseudonyme,messages.*
FROM messages LEFT JOIN compte ON messages.idenvoyeur = compte.idcompte
WHERE messages.idcompte='$idcompte'
ORDER BY messages.idcompte,datemess DESC LIMIT $debligne,$nbligne";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion); 
    $return = [];
    if($run_query)
    {
        while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
        {   
            $return[] = $run_result;
        }
    }
    return $return;
}

/**
 * Fonction get_messagelistenvoye
 * @param mixed $idcompte
 */
function get_messagelistenvoye($idcompte)
{
    global $internaute;
    $query = " SELECT compte.pseudonyme,messages.*
FROM messages LEFT JOIN compte ON messages.idcompte = compte.idcompte
WHERE messages.idenvoyeur='$idcompte' and etat='non lu'
ORDER BY messages.idcompte,datemess DESC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion); 
    $return = [];
    if($run_query)
    {
        while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
        {   
            $return[] = $run_result;
        }
    }
    return $return;
}

/**
 * Fonction get_playerconnected
 */
function get_playerconnected()
{
    $query = "SELECT compte.pseudonyme AS Pseudo
FROM compte,session
WHERE compte.idcompte = session.idcompte AND tempsconnect>UNIX_TIMESTAMP() - 305 and compte.authlevel='1'
GROUP BY pseudonyme
ORDER BY tempsconnect DESC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion); 
    $return = [];
    if($run_query)
    {
        while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
        {   
            $return[] = $run_result;
        }
    }
    return $return;
}

/**
 * Fonction get_oldplayer
 */
function get_oldplayer()
{
    $query = "SELECT compte.idcompte as id,compte.pseudonyme AS pseudo,dateactivite as seclast,IF(dateactivite>0,FROM_UNIXTIME(dateactivite),'') as lastconnect,FROM_UNIXTIME(dateinscr) as 'dateinscrfrm'
FROM compte
WHERE cashback<>10000 AND dateactivite<UNIX_TIMESTAMP()-3600*24*30*2 AND ( dateactivite > 0 or (dateactivite=0 AND dateinscr<UNIX_TIMESTAMP()-3600*24*30))
ORDER BY dateactivite ASC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_players
 */
function get_players()
{
    $query = "SELECT *
FROM compte
WHERE dateactivite<UNIX_TIMESTAMP()-3600*24*30*2
ORDER BY authlevel DESC,pseudonyme ASC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_sicavcat
 * @param mixed $lstactions
 */
function get_sicavcat($lstactions)
{
    global $internaute;
    $id_compte = (is_object($internaute) && isset($internaute->idcompte)) ? $internaute->idcompte : 0;
    $aj = "";
    $ajfrom = "cacval, secteurent, portef
        WHERE cacval.codesico = portef.codesico AND";
    if($lstactions <> "") $aj = "AND cacval.codesico IN ($lstactions)";

    $trispecial = 0;
    if(array_key_exists ("champ",$_GET)) if($_GET["champ"]=="part" OR $_GET["champ"]=="partjoueur") $trispecial=1;
    if(array_key_exists ("champ",$_GET)) if($_GET["champ"]=="partjoueur") $ajfrom="secteurent, cacval LEFT JOIN portef ON (cacval.codesico=portef.codesico AND portef.idcompte = '$id_compte') WHERE ";
    if(!$trispecial)
    {
        $query = "SELECT libellesecteur, codesico, nom, valeur, yahooname
        FROM cacval, secteurent
        WHERE cacval.idsecteur = secteurent.idsecteur
        AND authachat = '1'
        AND down = '1' $aj
        ORDER BY ".tabordre("lstactions");
    } else {
        $query = "SELECT libellesecteur, cacval.codesico, nom, valeur, yahooname, SUM( portef.quant * cacval.valeur ) AS part
        FROM $ajfrom cacval.idsecteur = secteurent.idsecteur
        AND authachat = '1'
        AND down = '1' $aj AND portef.quant>0
        GROUP BY cacval.codesico
        ORDER BY ".tabordre("lstactions");
    }

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_acttotpossede
 * @param mixed $lstactions
 */
function get_acttotpossede($lstactions="")
{
    $aj = "";
    if($lstactions <> "") $aj = "AND portef.codesico IN ($lstactions)";
    $query = "SELECT cacval.codesico as 'codesico',SUM(portef.quant * cacval.valeur) AS Valeur
     FROM cacval,portef
     WHERE cacval.codesico = portef.codesico AND portef.quant>0 AND cacval.authachat='1' $aj
     GROUP BY cacval.nom";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $tot = 0;
    $tab = [];
    if($run_query)
    {
        while($ligne = LigneSuivante($run_query))
        {
            $tab[$ligne->codesico] = $ligne->Valeur;
            $tot += $ligne->Valeur;
        }
    }
    foreach($tab as $k => $v)
    {
        if($tot)
            $tab[$k] = round(($v/$tot)*100,2);
        else
            $tab[$k] = 0;
    }
    return $tab;
}

/**
 * Fonction getnbstats
 */
function getnbstats()
{
    $query = "SELECT COUNT(*) AS nb
FROM reqlistpublic
WHERE 1";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $lst = LigneSuivante($run_query);
    return is_object($lst) ? $lst->nb : 0;
}

/**
 * Fonction exepublicreq
 * @param mixed $idreq
 */
function exepublicreq($idreq)
{
    $idreq = sec($idreq);
    $query = "SELECT *
FROM reqlistpublic
WHERE idreq='$idreq'";

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $retour = new stdClass();
    if($run_query)
    {
        $resultat = LigneSuivante($run_query);
        if(is_object($resultat) && $resultat->req <> "")
        {
            $sql = "DROP TABLE IF EXISTS `stats`";
            ExecRequete ($sql, $connexion);
            $query = stripslashes($resultat->req);
            $sql = "CREATE TABLE `stats` $query";
            ExecRequete ($sql, $connexion);
            $titre = addslashes($resultat->libelreq);
            $sql = "UPDATE conf set valeur='$titre' where libel='lastmajstattitle'";
            ExecRequete ($sql, $connexion);
        } else {
            return "";
        }
    } else {
        return "Erreur dans l'id (contacter nicolas)";
    }
    return $retour;
}

/**
 * Fonction exeanspublicreq
 */
function exeanspublicreq()
{
    $query = "SELECT `valeur`
FROM `conf`
WHERE `libel` = 'lastmajstattitle'";

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $retour = new stdClass();
    $retour->titre = "";
    $retour->req = null;
    if($run_query)
    {
        $resultat = LigneSuivante($run_query);
        if(is_object($resultat)) {
            $retour->titre = $resultat->valeur;
        }
        $query = "SELECT * FROM `stats` WHERE 1";
        $run_query = ExecRequete ($query, $connexion);
        $retour->req = $run_query;
    } else {
        return "Erreur dans l'id (contacter nicolas)";
    }
    return $retour;
}

/**
 * Fonction get_listeaide
 */
function get_listeaide()
{
    $query = "SELECT *,COUNT(idcomment) as nbcomment,tabaide.idaide as idligne
FROM chapaide,tabaide LEFT JOIN tabaidecomment ON ( tabaide.idaide = tabaidecomment.idaide )
WHERE tabaide.idchapaide = chapaide.idchapaide
GROUP BY tabaide.idaide
ORDER BY chapaide.idchapaide ASC,tabaide.idaide ASC
";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_listecomment
 * @param mixed $idaide
 */
function get_listecomment($idaide)
{
    $query = "SELECT *,compte.idcompte as auteurid
FROM tabaidecomment,compte
WHERE tabaidecomment.idaide = '$idaide' and tabaidecomment.idcompte = compte.idcompte
ORDER BY datecomment DESC
";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_listefaq
 */
function get_listefaq()
{
    $query = "SELECT *,COUNT(idcomment) as nbcomment,tabfaq.idaide as idligne,tabfaq.idaide as lnkaide
FROM tabfaq LEFT JOIN tabfaqcomment ON ( tabfaq.idaide = tabfaqcomment.idaide )
GROUP BY tabfaq.idaide
ORDER BY tabfaq.idaide ASC
";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_listecommentfaq
 * @param mixed $idaide
 */
function get_listecommentfaq($idaide)
{
    $query = "SELECT *,compte.idcompte as auteurid
FROM tabfaqcomment,compte
WHERE tabfaqcomment.idaide = '$idaide' and tabfaqcomment.idcompte = compte.idcompte
ORDER BY datecomment DESC
";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_lstactions
 */
function get_lstactions()
{
    $query = "SELECT *
FROM cacval
ORDER BY nom ASC
";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_listeforums
 */
function get_listeforums()
{
    global $internaute;
    $id_compte = (is_object($internaute) && isset($internaute->idcompte)) ? $internaute->idcompte : 0;
    $auth_level = (is_object($internaute) && isset($internaute->authlevel)) ? $internaute->authlevel : 0;
    $toutvu = (is_object($internaute) && isset($internaute->toutvuforum)) ? $internaute->toutvuforum : 0;

    $add = "forum.idsection!=0";
    $add2 = "";
    if($id_compte > 0 && estmembregroupe($id_compte))
    {
        $legroupe = getgroupbymembre($id_compte);
        if(is_object($legroupe)) {
            $add .= " or forum.idforum=$legroupe->idforum";
        }
    }
    if($auth_level > 1)
    {       
        $add = "forum.idsection!=0 or (rf.idcompte is Null and mess.datepost>$toutvu) ";
    }
    $query = "SELECT *,IF(rf.idcompte,0,1) as notif_new ,forum.idforum as frmid
FROM `f_forum` forum
LEFT JOIN `f_section` section ON (forum.idsection=section.idsection)
LEFT JOIN `f_message` mess ON (mess.idmessage=forum.idlastmessage)
LEFT JOIN `compte` cpt ON (mess.idcompte=cpt.idcompte)
LEFT JOIN `f_sujet` sujet ON (mess.idsujet=sujet.idsujet)
LEFT JOIN `f_readforum` rf ON (rf.idcompte='$id_compte' and rf.idforum=forum.idforum)
 WHERE $add  $add2 order by forum.idsection,forum.idforum
";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_listesujets
 * @param mixed $idforum
 * @param mixed $de
 * @param mixed $juska
 */
function get_listesujets($idforum,$de,$juska)
{
    global $internaute;
    $id_compte = (is_object($internaute) && isset($internaute->idcompte)) ? $internaute->idcompte : 0;
    $query = "SELECT *,cauteur.pseudonyme as pseudoauteur,clast.pseudonyme as lastpseudo, IF(rs.idcompte,0,1) as notif_new,fs.idsujet as numsujet
FROM  `f_forum` ff, `f_message` fm, `compte` clast,`compte` cauteur,`f_sujet` fs LEFT JOIN `f_readsujet` rs ON (rs.idcompte='$id_compte' and rs.idsujet=fs.idsujet)
WHERE fs.idlastmessage = fm.idmessage and fs.idcompteauteur=cauteur.idcompte and fm.idcompte=clast.idcompte
AND fs.idforum = ff.idforum and fs.idforum='$idforum'
ORDER BY fs.idlastmessage DESC LIMIT $de,$juska
";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_infoforum
 * @param mixed $idforum
 */
function get_infoforum($idforum)
{
    $query = "SELECT * FROM `f_forum` WHERE idforum='$idforum'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction get_listemessages
 * @param mixed $idsujet
 * @param mixed $de
 * @param mixed $juska
 */
function get_listemessages($idsujet,$de,$juska)
{
    $query = "SELECT *,cpt.pseudonyme as auteur
FROM `f_message` fm, `f_corps` fc, `compte` cpt
 LEFT JOIN `membregroupe` grpmbr USING(idcompte)
 LEFT JOIN groupe grp USING(idgroupe)
 LEFT JOIN statsclassement stats ON (cpt.idcompte=stats.idcompte)
WHERE fm.idmessage = fc.idmessage
AND fm.idsujet = '$idsujet'
AND fm.idcompte=cpt.idcompte
LIMIT $de,$juska
";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction get_infosujet
 * @param mixed $idsujet
 */
function get_infosujet($idsujet)
{
    $query = "SELECT * FROM `f_forum` ff,`f_sujet` fs WHERE ff.idforum=fs.idforum and fs.idsujet='$idsujet'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction get_infomessage
 * @param mixed $idmessage
 */
function get_infomessage($idmessage)
{
    $query = "SELECT * FROM `f_message` fm,`f_corps` fc WHERE fm.idmessage=fc.idmessage and fm.idmessage='$idmessage'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}
?>