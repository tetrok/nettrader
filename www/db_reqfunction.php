<?php

/**
 * Fichier: db_reqfunction.php
 * Ce fichier contient les fonctions suivantes :
 * - updatecptpost
 * - getcptpost
 * - portefeuille_joueur
 * - joueur_liste_sicav
 * - joueur_possede
 * - GetCashBack
 * - ModifLiquide
 * - AddHistorique
 * - ModifAction
 * - ChercheSkin
 * - get_FromFormatedTime
 * - creer_ordre
 * - listvaleur
 * - dansliste
 * - AjoutPort
 * - delete_sicav
 * - listmenu
 * - listhisto
 * - listclassementequipe
 * - gettabjoueursenequipes
 * - listclassement
 * - listclassementcount
 * - getclassementsicavlist
 * - cmd_update_sicav
 * - get_dernier_timestamp
 * - addordre
 * - niv_joueur
 * - get_ordre
 * - add_msg
 * - upd_msgetat
 * - dodelmessage
 * - efface_ordre
 * - get_ordrelist
 * - get_idmenu
 * - del_ordre
 * - get_info_ordre
 * - donnaction
 * - donnactionyn
 * - stataction
 * - ordreactionachat
 * - ordreactionvente
 * - exeadminreq
 * - listadminreq
 * - listhistocount
 * - getplayercapital
 * - getplayercapitalhorsvad
 * - getplayercapitalvad
 * - listmessagescount
 * - get_tempsbourse
 * - listskin
 * - skin_existe
 * - scoreestactuel
 * - teamscoreestactuel
 * - insertscore
 * - getperfgroupes
 * - insertgroupescore
 * - listmoisclass
 * - listmoisclassequipe
 * - getyahooname
 * - get_yahoosicavliste
 * - getinternauteinfo
 * - setmdp
 * - increcompensegroupe
 * - getheritier
 * - fctgetoffteammaster
 * - fctgetoffteam
 * - fctdoraz
 * - getCodesSicoSecteurPortef
 * - getCodesSicoPortef
 * - getCodesSicoCote
 * - ajoutcommentaire
 * - effacvieuxordres
 * - effacordresinactifs
 * - delcommentaire
 * - ajoutcommentairefaq
 * - delcommentairefaq
 * - modifetatactions
 * - delactions
 * - factoriseactions
 * - getnvmessages
 * - getnvmessagesenvoye
 * - getgroupbyadmin
 * - getgroupbymembre
 * - membreestinvite
 * - getmembrebygroup
 * - getjoueursnotingroupe
 * - doinvitejoueur
 * - delinvitejoueur
 * - doajgroupe
 * - dojoingroupe
 * - domodifgroupe
 * - getverifgroupe
 * - sauveipadress
 * - getiphome
 * - dogroupeaccepterefuse
 * - effacvieuxscores
 * - getscorejoueur
 * - get_sicavdown
 * - doundoallinvitegroupe
 * - getinfogroupe
 * - getcompositionequipe
 * - checkoutdated
 * - majclassement
 * - majlistmoisclass
 * - istableexist
 * - forumsyncquantity
 * - forumsyncidlastmessage
 * - getinfojoueur
 * - getinfosicav
 * - forum_getidmessagesujet
 * - forum_getlastmessagesujet
 * - forum_peutposter
 * - forum_peutlire
 * - setsujetlu
 * - forum_inc_nblectures
 * - forum_inc_joueur_nbposts
 * - forum_set_joueur_toutlu
 * - forum_majtoutvuforum
 * - forum_ajoutforum
 * - forum_newgroupeforum
 * - setsujetpaslu
 * - doforum_postmessage
 * - forum_giveforumtogroups
 * - incarnerjoueur
 * - deactivateweekstats
 * - deactivatedaystats
 */

/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/
function updatecptpost()
{
    //Met à jour le compteur de postage afin d'eviter les doublons d'envoie de formulaire
    global $internaute;
    if (!is_object($internaute) || !isset($internaute->idcompte)) return;
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE compte SET lastpostaction=UNIX_TIMESTAMP() where idcompte='$internaute->idcompte'";
    $run_query = ExecRequete ($query, $connexion);
}

/**
 * Fonction getcptpost
 */
function getcptpost()
{
    //retourne le compteur de postage afin d'eviter les doublons d'envoie de formulaire
    global $internaute;
    if (!is_object($internaute) || !isset($internaute->idcompte)) return 0;
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="SELECT lastpostaction FROM compte where idcompte='$internaute->idcompte'";
    $run_query = ExecRequete ($query, $connexion);
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? $ligne->lastpostaction : 0;
}

/**
 * Fonction portefeuille_joueur
 */
function portefeuille_joueur()
{  
    global $internaute;
    if (!is_object($internaute) || !isset($internaute->idcompte)) return [];
    $idcompte=$internaute->idcompte;
    $query = "SELECT lasttime AS laststamp,cacval.codesico AS codesicav,cacval.nom AS nomsicav,cacval.yahooname as helpurl ,portef.quant AS nombsicav,(portef.quant*cacval.valeur) AS valtotsicav,cacval.valeur AS valsicav,((portef.quant*cacval.valeur)-(portef.quant*portef.ansvaleur)) AS benefsicav,(((cacval.valeur-portef.ansvaleur)/portef.ansvaleur)*100*SIGN(portef.quant)) AS pourcentsicav,portef.ansvaleur as ansvalsicav,(portef.ansvaleur*portef.quant) AS ansvaltotsicav,stats.prog
          FROM cacval,portef LEFT JOIN statsclassement stats ON ('$internaute->idcompte'=stats.idcompte)
          WHERE cacval.codesico = portef.codesico
              AND portef.idcompte = '$idcompte'
          ORDER BY ".tabordre("portef");
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction joueur_liste_sicav
 * @param mixed $idcompte
 * @param mixed $timemodif
 */
function joueur_liste_sicav($idcompte="",$timemodif=0)
{  
    $condition="";
    $table="";
    if($idcompte<>"")
    {
        $idcompte = "    AND portef.idcompte = '$idcompte'";
        $condition = "cacval.codesico = portef.codesico AND";
        $table=",portef";
    }
    $letimestamp=get_refresh();
    $datesql=$letimestamp->datesql+$timemodif;
    $datedown=$letimestamp->datedown+$timemodif;
    $query = "SELECT cacval.codesico AS codesicav,cacval.nom AS nomsicav,cacval.valeur AS valeursicav
          FROM cacval $table
          WHERE $condition (lasttime <= '$datesql' AND lasttimedown <= '$datedown') $idcompte AND down='1'
          ORDER BY cacval.nom ";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction joueur_possede
 * @param mixed $sico
 * @param mixed $idcompte
 */
function joueur_possede($sico,$idcompte)
{  
    $sico=sec($sico);
    $query = "SELECT cacval.nom AS nomsicav,portef.quant AS nombsicav,ansvaleur,valeur
          FROM cacval,portef
          WHERE cacval.codesico = portef.codesico
              AND portef.idcompte = '$idcompte' AND cacval.codesico = '$sico'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return LigneSuivante($run_query);
}

/**
 * Fonction GetCashBack
 * @param mixed $idjoueur
 */
function GetCashBack($idjoueur)
{
    $idjoueur=sec($idjoueur);
    $query = "SELECT cashback
          FROM compte
          WHERE idcompte = '$idjoueur'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $objet = $run_query->fetch(PDO::FETCH_BOTH);
    return is_array($objet) ? $objet[0] : 0;
}

/**
 * Fonction ModifLiquide
 * @param mixed $idcompte
 * @param mixed $somme
 */
function ModifLiquide($idcompte,$somme)
{
    global $internaute;
    $somme=round($somme+getcashback($idcompte),2);
    $query = "UPDATE compte SET `cashback`=$somme
          WHERE compte.idcompte = '$idcompte'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    if (is_object($internaute)) {
        $internaute->cashback = $somme;
    }
    return 0;
}

/**
 * Fonction AddHistorique
 * @param mixed $idcompte
 * @param mixed $operation
 * @param mixed $sicav
 * @param mixed $nombre
 * @param mixed $valunique
 * @param mixed $taxe
 * @param mixed $profit
 */
function AddHistorique($idcompte,$operation,$sicav,$nombre,$valunique, $taxe, $profit)
{
    $maintenant=date("U");
    $query = "INSERT INTO `historique` ( `temps` , `codesico` , `idcompte` , `sens` , `nbr` , `valeurunique` , `taxe`, `profit` ) VALUES ( '$maintenant', '$sicav', '$idcompte', '$operation', '$nombre', '$valunique', '$taxe', '$profit' );";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return 0;
}

/**
 * Fonction ModifAction
 * @param mixed $idcompte
 * @param mixed $sicav
 * @param mixed $quant
 * @param mixed $valeur
 */
function ModifAction($idcompte,$sicav,$quant,$valeur)
{
    $possede=joueur_possede($sicav,$idcompte);
    if($quant==0)
    {
        $query = "DELETE FROM `portef` WHERE `idcompte` = '$idcompte' AND `codesico` = '$sicav'";
    } else {
        $nombdiff=$quant-$possede->nombsicav;
        if(($possede->nombsicav<0 && $quant<$possede->nombsicav)||($possede->nombsicav>0 && $quant>$possede->nombsicav))
            $val=((( $possede->nombsicav*$possede->ansvaleur)+($nombdiff*$valeur))/($nombdiff+$possede->nombsicav));
        else
            if(($possede->nombsicav<0 && $quant>0)||($possede->nombsicav>0 && $quant<0))
                $val=$valeur;
            else
                $val=$possede->ansvaleur;
        $query = "UPDATE portef SET `quant`='$quant',`ansvaleur`='$val' WHERE portef.idcompte = '$idcompte' AND portef.codesico = '$sicav'";
    }      
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return 0;
}

/**
 * Fonction ChercheSkin
 * @param mixed $idskin
 */
function ChercheSkin($idskin)
{
    $query = "SELECT * FROM skin WHERE idskin='$idskin'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return LigneSuivante($run_query);
}

/**
 * Fonction get_FromFormatedTime
 * @param mixed $ladate
 */
function get_FromFormatedTime($ladate)
{
    if (preg_match("/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2}) ([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2})/", $ladate, $regs))
    {
        $day=$regs[1];
        $mon=$regs[2];
        $yr=$regs[3];
        $hours=$regs[4];
        $min=$regs[5];
        $sec=$regs[6];
        return mktime($hours,$min, $sec, $mon, $day, $yr);
    } else {
        return 0;
    }
}

/**
 * Fonction creer_ordre
 * @param mixed $sens
 * @param mixed $sicav
 * @param mixed $nombre
 * @param mixed $valmin
 * @param mixed $valmax
 * @param mixed $timemin
 * @param mixed $select
 * @param mixed $ansvaleur
 * @param mixed $seuil
 * @param mixed $ppourc
 */
function creer_ordre($sens,$sicav,$nombre,$valmin,$valmax,$timemin,$select,$ansvaleur,$seuil,$ppourc)
{
    global $internaute;
    if(!($sens=="achat" || $sens=="vente"))
        return "";

    $dernvaleur=getvaleur($sicav);
    $bddaction=donnaction($sicav);

    if (preg_match("/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4}) ([0-9]{1,2}):([0-9]{1,2})/", $timemin, $regs))
    {
        $day=$regs[1];
        $mon=$regs[2];
        $yr=$regs[3];
        $hours=$regs[4];
        $min=$regs[5];
        $timemin = mktime($hours,$min, 0, $mon, $day, $yr);
        if($timemin<date("U"))
        {
            $timemin=date("U");
        }
    } else {
        $timemin=date("U");
    }

    if(tempsjeu())
    {
        $nmbr=$nombre;
        if($select==1)
        {
            $pourc=0;
        } else {
            if($sens=="achat")
            {
                if($ppourc>0 && $ppourc<=100)
                    $pourc=$ppourc/100;
                else
                    $pourc=0;
                $nombre=0;
                $nbr=floor(getnbactionmax($internaute->cashback,$dernvaleur)*$pourc);
            }
            if($sens=="vente")
            {
                $nivjoueur=niv_joueur($internaute->idcompte);
                $possede=joueur_possede($sicav,$internaute->idcompte);
                if($nivjoueur && $nivjoueur->vad)
                    $possede->nombsicav=getnbactionmax(getmontantvadpossible($internaute->idcompte),$dernvaleur)+$possede->nombsicav;
                $nombre=0;
                $nbr=floor($possede->nombsicav*($ppourc/100));
                $pourc=$ppourc/100;
            }
        }
        if($seuil==0)
        {
            $valmin=0;
            $valmax=-1;
        }
        if((!(SECURE)||(is_object($bddaction) && $bddaction->lasttime>date("U")-SECURETIMEDELAY)) && ($dernvaleur>$valmin && ($dernvaleur<=$valmax || $valmax==-1) && date("U")<=$timemin))
        {
            if( $dernvaleur <> $ansvaleur AND $ansvaleur<>"" )
            {
                $echo = lang(4)."($dernvaleur <> $ansvaleur)";
            } else {
                if($sens=="achat")
                {
                    $echo = doachat($internaute->idcompte,$sicav,$nmbr,$dernvaleur);
                    if($echo=="OK")
                    {
                        $echo=lang(94);
                    }
                } else {
                    $echo = dovente($internaute->idcompte,$sicav,$nmbr,$dernvaleur);
                    if($echo=="OK")
                    {
                        $echo=lang(93);
                    }
                }
            }
        } else {
            $is_vad = is_object($internaute) && isset($internaute->vad) && $internaute->vad;
            if((($nombre>0 && !$pourc)||(!$nombre && $pourc>0))||($is_vad && ($nombre!=0 && !$pourc)||(!$nombre && $pourc!=0)))
            {
                addordre($sicav,$internaute->idcompte,date("U"),$sens,$nombre,$pourc,$timemin,$valmin,$valmax);
                $echo = lang(40);
            } else {
                $echo = lang(135);
            }
        }
    } else {
        $echo = lang(69);
    }
    return $echo;
}

/**
 * Fonction listvaleur
 */
function listvaleur()
{  
    global $internaute;
    $query = "SELECT codesico AS codesicav,nom AS nomsicav,valeur,yahooname
          FROM cacval WHERE authachat='1' ORDER BY cacval.nom ";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction dansliste
 * @param mixed $sico
 */
function dansliste($sico)
{  
    $sico=addslashes($sico);
    $query = "SELECT * 
          FROM cacval
          WHERE cacval.codesico = '$sico' and cacval.authachat='1'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return LigneSuivante($run_query);
}

/**
 * Fonction AjoutPort
 * @param mixed $idcompte
 * @param mixed $sicav
 * @param mixed $quant
 * @param mixed $valeur
 */
function AjoutPort($idcompte,$sicav,$quant,$valeur)
{
    $possede=joueur_possede($sicav,$idcompte);
    if($quant<>0)
    {
        $query = "INSERT INTO `portef` ( `idcompte` , `codesico` , `quant` , `ansvaleur` ) VALUES ( '$idcompte', '$sicav', '$quant', '$valeur' )";
        $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
        $run_query = ExecRequete ($query, $connexion);    
    }      
    return 0;
}

/**
 * Fonction delete_sicav
 * @param mixed $sicav
 */
function delete_sicav($sicav)
{
    $query = "DELETE FROM `cacval` WHERE codesico=$sicav";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
}

/**
 * Fonction listmenu
 * @param mixed $type
 */
function listmenu($type="menu")
{  
    global $internaute;
    $visiteur=0;
    if(!is_object($internaute) || !isset($internaute->authlevel) || $internaute->authlevel < 1)
    {
        $authlevel = -1;
        $visiteur = 1;
    } else {
        $authlevel = $internaute->authlevel;
    }
    $query = "SELECT idmenu,type_menu,text_id,CONCAT(link_menu,'do=',do) AS link_menu,alldo,do
    FROM menu
    WHERE (type_menu='menu' or type_menu='$type') AND ((`authlevel`<='$authlevel' AND `visiteurseulement`='$visiteur') OR `authlevel`='0')
    ORDER BY idmenu";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction listhisto
 * @param mixed $deblign
 * @param mixed $nblign
 * @param mixed $depuis
 */
function listhisto($deblign,$nblign,$depuis=0)
{  
    global $internaute;
    if(!is_object($internaute) || !isset($internaute->idcompte)) return [];
    $reqsup="";
    if($depuis>0) $reqsup=" and historique.temps>'$depuis'";
    $query = "SELECT temps AS LADATE,cacval.nom AS LENOM,sens AS LESENS,nbr AS LENOMBRE,CONCAT( valeurunique, ' € ( ', valeurunique * nbr, ' € )' )  AS LEHT,round(ABS(taxe),2) AS LATAXE, round(valeurunique*nbr + taxe,2) AS LETTC, temps as UNIX, (valeurunique * nbr) AS LETOTHT, CONCAT( profit, ' €') as PROFITOP
          FROM cacval,historique
          WHERE idcompte='$internaute->idcompte' and historique.codesico = cacval.codesico $reqsup
          ORDER BY ".tabordre("historique")." LIMIT $deblign,$nblign";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction listclassementequipe
 * @param mixed $mois
 * @param mixed $ligncour
 * @param mixed $maxligne
 * @param mixed $cherche
 */
function listclassementequipe($mois,$ligncour,$maxligne,$cherche="")
{
    global $internaute;
    $addchamp="";
    $addreq="";
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, 1, $yr);
    $ladate=date("Y-m-d",$date1);

    if($mois !== null) list($yr,$mon,$jour) = explode("-",$mois); else { $yr=0; $mon=0; $jour=0; }
    $date2 = mktime(1, 1, 1, $mon+1, 1, $yr);
    $ladateap=date("Y-m-d",$date2);

    $cap=CAPDEB;

    if($ladate==$mois)
    {
        $query = "
                SELECT iselect.idgroupe as idgroupe, titregroupe,initialgroupe,medor,medargent,medbronze, round( (
        (
        SUM( capital ) - SUM( debcapital ) ) / SUM( debcapital )
        ) *100, 2
        ) AS prog, COUNT( * ) AS nbjoueurs
        FROM (

        SELECT idgroupe, COALESCE( scores.capitalscores, $cap ) AS debcapital, round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + cashback, 2 ) AS capital
        FROM membregroupe, compte
        LEFT JOIN portef
        USING ( idcompte )
        LEFT JOIN scores ON ( compte.idcompte = scores.idcompte
        AND scores.datescore = '$ladate' )
        LEFT JOIN cacval ON cacval.codesico = portef.codesico
        WHERE membregroupe.idcompte = compte.idcompte
        GROUP BY compte.idcompte
        ) AS iselect, groupe
        WHERE iselect.idgroupe = groupe.idgroupe
        GROUP BY titregroupe, idgroupe HAVING nbjoueurs>1
        ORDER BY ".tabordre("classementequipe")."
        ";
    } else {
        $query = "
                SELECT groupe.idgroupe as idgroupe, titregroupe,initialgroupe,medor,medargent,medbronze, round( (
        ( capitalfin  - capitaldeb ) / capitaldeb
        ) *100, 2  ) AS prog, nbmembres AS nbjoueurs
        FROM scoresgroupes,groupe WHERE datescore='$ladateap' and scoresgroupes.idgroupe = groupe.idgroupe
        ORDER BY ".tabordre("classementequipe")."
        ";
    }

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $l=0;
    $i=0;
    $return = [];
    $all = [];
    $specified = [];
    $pseudotrouv=-1;
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {
        $all[$l] = $run_result;
        $h=0;
        if($l>=$ligncour && $l<$ligncour+$maxligne)
        {
            $return[$i++] = $run_result;
            $h=1;
        }
        if($h==0 && compareclass($run_result['titregroupe'],$cherche))
        {
            $pseudotrouv=$l;
        }
        $l++;
    }
    $debut=-1;
    if($pseudotrouv<>-1)
    {
        $x=0;
        $debut=numlimit($pseudotrouv,$l-1,-2);
        $fin=numlimit($pseudotrouv,$l-1,2);
        for($y=$debut;$y<=$fin;$y++)
        {
            $specified[$x] =$all[$y] ;
            $x++;
        }
    }
    $retourne = new stdClass();
    $retourne->liste=$return;
    $retourne->spec=$specified;
    $retourne->classement=$pseudotrouv;
    $retourne->deb=$debut;
    $retourne->nb=$l;
    return $retourne;
}

/**
 * Fonction gettabjoueursenequipes
 */
function gettabjoueursenequipes()
{
    $query = "SELECT membregroupe.idcompte as idcompte, initialgroupe , groupe.idgroupe as idgroupe
          FROM membregroupe,groupe
          WHERE groupe.idgroupe=membregroupe.idgroupe";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $return=[];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[$run_result["idcompte"]] = array($run_result["initialgroupe"],$run_result["idgroupe"]);
    }
    return $return;
}

/**
 * Fonction listclassement
 * @param mixed $mois
 * @param mixed $ligncour
 * @param mixed $maxligne
 * @param mixed $cherche
 */
function listclassement($mois,$ligncour,$maxligne,$cherche="")
{
    global $internaute;
    $addchamp="";
    $addreq="";
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, 1, $yr);
    $ladate=date("Y-m-d",$date1);

    if($mois !== null) list($yr,$mon,$jour) = explode("-",$mois); else { $yr=0; $mon=0; $jour=0; }
    $date2 = mktime(1, 1, 1, $mon+1, 1, $yr);
    $ladateap=date("Y-m-d",$date2);

    if($mois !== null) list($yr,$mon,$jour) = explode("-",$mois); else { $yr=0; $mon=0; $jour=0; }
    $date3 = mktime(1, 1, 1, $mon, 1, $yr);
    $ladatesel=date("Y-m-d",$date3);

    if(defined('INCONC') && INCONC)
    {
        $query = "
        SELECT pseudonyme, round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + cashback, 2 ) AS capital, round( (
        (
        COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + compte.cashback - ".CAPDEB." ) / ".CAPDEB." ) * 100, 2
        ) AS prog ,etablissement,compte.idcompte as idcompte
        FROM compte
        LEFT JOIN portef
        USING ( idcompte )
          LEFT JOIN cacval ON cacval.codesico = portef.codesico
        WHERE authlevel = '1' and cashback<>'".CAPDEB."'
        GROUP BY compte.idcompte
        ORDER BY ".tabordre("classement")."
        ";
    } else {
        if($ladate==$mois)
        {
            if(istableexist("statsclassement"))
            {
                $query = "
                SELECT * FROM statsclassement
                ORDER BY ".tabordre("classement");
            } else {
                $query = "SELECT pseudonyme, round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + cashback, 2 ) AS capital, round( (
                (
                COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + compte.cashback - COALESCE( scores.capitalscores, ".CAPDEB." ) ) / COALESCE( scores.capitalscores, ".CAPDEB." ) ) * 100, 2
                ) AS prog,compte.idcompte as idcompte
                FROM compte
                LEFT JOIN portef
                USING ( idcompte )
                LEFT  JOIN scores
                ON (compte.idcompte=scores.idcompte AND scores.datescore = '$ladate')
                LEFT JOIN cacval ON cacval.codesico = portef.codesico
                WHERE authlevel = '1' and dateactivite>=UNIX_TIMESTAMP()-2592000 and cashback<>'".CAPDEB."'
                GROUP BY compte.idcompte
                ORDER BY ".tabordre("classement");
            }
        } else {
            $cap=CAPDEB;
            $query = "
            SELECT pseudonyme, b.capitalscores AS capital,
            round(((b.capitalscores - COALESCE( a.capitalscores, $cap ))/COALESCE( a.capitalscores, $cap ))*100,2) AS prog,compte.idcompte as idcompte
             $addchamp
            FROM compte, scores AS b
            LEFT JOIN scores AS a ON (b.idcompte = a.idcompte AND b.datescore <> a.datescore AND a.datescore = '$ladatesel')
            WHERE b.datescore = '$ladateap'
            AND b.idcompte = compte.idcompte
            AND authlevel = '1'
            ORDER BY ".tabordre("classement")."
            ";
        }
    }

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $l=0;
    $i=0;
    $return = [];
    $all = [];
    $specified = [];
    $pseudotrouv=-1;
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {
        $all[$l] = $run_result;
        $h=0;
        if($l>=$ligncour && $l<$ligncour+$maxligne)
        {
            $return[$i++] = $run_result;
            $h=1;
        }
        if($h==0 && compareclass($run_result['pseudonyme'],$cherche))
        {
            $pseudotrouv=$l;
        }
        $l++;
    }
    $debut=-1;
    if($pseudotrouv<>-1)
    {
        $x=0;
        $debut=numlimit($pseudotrouv,$l-1,-2);
        $fin=numlimit($pseudotrouv,$l-1,2);
        for($y=$debut;$y<=$fin;$y++)
        {
            $specified[$x] =$all[$y] ;
            $x++;
        }
    }
    $retourne = new stdClass();
    $retourne->liste=$return;
    $retourne->spec=$specified;
    $retourne->classement=$pseudotrouv;
    $retourne->deb=$debut;
    $retourne->nb=$l;
    return $retourne;
}

/**
 * Fonction listclassementcount
 * @param mixed $moisstamp
 */
function listclassementcount($moisstamp)
{
    $query = "SELECT COUNT(*) as nbrplayer FROM compte WHERE authlevel='1' and dateinscr<'$moisstamp'"; 
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $lignresult = LigneSuivante($run_query);
    return is_object($lignresult) ? $lignresult->nbrplayer : 0;
}

/**
 * Fonction getclassementsicavlist
 */
function getclassementsicavlist()
{  
    $letimestamp=get_refresh();
    $datesql=$letimestamp->datesql;
    $datedown=$letimestamp->datedown;
    $query = "SELECT cacval.codesico AS codesicav,cacval.nom AS nomsicav,cacval.valeur AS valeursicav
          FROM cacval,portef
          WHERE cacval.codesico = portef.codesico
          AND !(lasttime > '$datesql' OR lasttimedown > '$datedown')
          GROUP BY codesicav,nomsicav,valeursicav";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction cmd_update_sicav
 * @param mixed $codesico
 * @param mixed $valeur
 * @param mixed $lasttime
 * @param mixed $lasttimedown
 */
function cmd_update_sicav($codesico,$valeur,$lasttime,$lasttimedown )
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $codesico=intval($codesico);
    $resultat=ExecRequete("UPDATE cacval SET valeur=$valeur, lasttime=$lasttime, lasttimedown=$lasttimedown WHERE codesico = $codesico AND lasttime<=$lasttime AND lasttimedown<$lasttimedown",$connexion);
    return 0;
}

/**
 * Fonction get_dernier_timestamp
 */
function get_dernier_timestamp()
{
    $query = "SELECT min(lasttime) AS laststamp,min(lasttimedown) AS lastdownstamp FROM cacval";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $timestamp = new stdClass();
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {
        $timestamp->lasttime=$run_result["laststamp"];
        $timestamp->lasttimedown=$run_result["lastdownstamp"];
    }
    return $timestamp;
}

/**
 * Fonction addordre
 * @param mixed $codesico
 * @param mixed $idcompte
 * @param mixed $datecreation
 * @param mixed $sens
 * @param mixed $nbr
 * @param mixed $pourc
 * @param mixed $tempslim
 * @param mixed $coursmin
 * @param mixed $coursmax
 */
function addordre($codesico,$idcompte,$datecreation,$sens,$nbr,$pourc,$tempslim,$coursmin,$coursmax)
{
    if(intval($pourc)==0)
        $pourc="NULL";
    else
        $pourc="'".$pourc."'";
    $query = "INSERT INTO `ordre` ( `codesico` , `idcompte` , `datecreation` , `sens` , `nbr` , `pourc` , `tempslim` , `coursmin` , `coursmax` ) VALUES ('$codesico','$idcompte','$datecreation','$sens','$nbr',$pourc,'$tempslim','$coursmin','$coursmax');";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return 0;
}

/**
 * Fonction niv_joueur
 * @param mixed $idcompte
 */
function niv_joueur($idcompte)
{  
    $query = "SELECT niveau.* 
          FROM compte,niveau
          WHERE compte.idcompte = $idcompte AND compte.idniveau = niveau.idniveau";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return LigneSuivante($run_query);
}

/**
 * Fonction get_ordre
 */
function get_ordre()
{
    if(defined('SECURE') && SECURE)
    {
        $add=" AND datecreation-".SECURETIMEDELAY." <= cacval.lasttime";
    } else {
        $add="";
    }

    $letimestamp=get_refresh();
    $datesql=$letimestamp->datesql;
    $datedown=$letimestamp->datedown;
    $now=date("U");
    $query = " SELECT * 
    FROM ordre,cacval
    WHERE ordre.codesico = cacval.codesico AND ( lasttime > '$datesql' OR lasttimedown > '$datedown')
     AND ( ( ordre.coursmin <= cacval.valeur AND ordre.coursmax >= cacval.valeur ) OR ( ordre.coursmin <= cacval.valeur AND ordre.coursmax = '-1' ) )
     $add AND $now <= tempslim and (cacval.authachat='1' or ordre.sens='vente') and etat='1' ORDER BY datecreation ASC";

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction add_msg
 * @param mixed $idfrom
 * @param mixed $idrecept
 * @param mixed $title
 * @param mixed $corps
 */
function add_msg($idfrom,$idrecept,$title,$corps)
{
    $etat="non lu";
    if($idrecept==0) $etat="lu";
    $query = "INSERT INTO `messages` ( `idcompte` , `datemess` , `idenvoyeur` , `titre` , `corps` , `etat`) 
    VALUES ('$idrecept', '".date("U")."', '$idfrom', '$title', '$corps', '$etat');";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return "";
}

/**
 * Fonction upd_msgetat
 * @param mixed $idmessage
 */
function upd_msgetat($idmessage)
{
    global $internaute;
    if(!is_object($internaute) || !isset($internaute->idcompte)) return "";
    $query = "UPDATE `messages` SET etat='lu' WHERE idmsg='$idmessage' and idcompte='$internaute->idcompte'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return "";
}

/**
 * Fonction dodelmessage
 * @param mixed $idmessage
 */
function dodelmessage($idmessage)
{
    global $internaute;
    if(!is_object($internaute) || !isset($internaute->idcompte)) return "";
    $query = "DELETE FROM `messages` WHERE idmsg='$idmessage' and (idcompte='$internaute->idcompte' or (idenvoyeur='$internaute->idcompte' and etat='non lu' ))";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return msgtab(lang(177),lang(86));
}

/**
 * Fonction efface_ordre
 * @param mixed $codesico
 * @param mixed $idcompte
 * @param mixed $datecreation
 */
function efface_ordre($codesico,$idcompte,$datecreation)
{
    $query = "UPDATE `ordre` SET etat='0' WHERE `codesico` = '$codesico' AND `idcompte` = '$idcompte' AND CONCAT(`datecreation`) = '$datecreation' LIMIT 1";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return ($GLOBALS['last_pdo_stmt'] ? $GLOBALS['last_pdo_stmt']->rowCount() : 0);
}

/**
 * Fonction get_ordrelist
 * @param mixed $condition
 */
function get_ordrelist($condition="")
{
    global $internaute;
    if(!is_object($internaute) || !isset($internaute->idcompte)) return [];
    $query = " SELECT *
    FROM ordre,cacval
    WHERE ordre.codesico = cacval.codesico and idcompte=$internaute->idcompte $condition ORDER BY datecreation DESC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_ASSOC) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction get_idmenu
 */
function get_idmenu()
{
    global $do;
    $reqdo=sec($do);
    $query = "SELECT text_id 
          FROM menu
          WHERE do='$reqdo'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $temp=LigneSuivante($run_query);
    return is_object($temp) ? $temp->text_id : "";
}

/**
 * Fonction del_ordre
 * @param mixed $datecreation
 */
function del_ordre($datecreation)
{
    global $internaute;
    if(!is_object($internaute) || !isset($internaute->idcompte)) return "";
    $query = "DELETE FROM `ordre` WHERE `idcompte` = '$internaute->idcompte' AND CONCAT(`datecreation`) = '$datecreation' LIMIT 1";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return "";
}

/**
 * Fonction get_info_ordre
 * @param mixed $datecreation
 */
function get_info_ordre($datecreation)
{
    global $internaute;
    if(!is_object($internaute) || !isset($internaute->idcompte)) return false;
    $query = "SELECT * FROM `ordre` WHERE `idcompte` = '$internaute->idcompte' AND CONCAT(`datecreation`) = '$datecreation' LIMIT 1";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction donnaction
 * @param mixed $codesico
 */
function donnaction($codesico)
{  
    $query = "SELECT * 
          FROM cacval
          WHERE cacval.codesico='$codesico'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return LigneSuivante($run_query);
}

/**
 * Fonction donnactionyn
 * @param mixed $yn
 */
function donnactionyn($yn)
{
    $query = "SELECT *
          FROM cacval,secteurent
          WHERE cacval.idsecteur=secteurent.idsecteur and cacval.yahooname='$yn'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction stataction
 * @param mixed $codesico
 * @param mixed $limit
 */
function stataction($codesico,$limit)
{
    $query = "SELECT FROM_UNIXTIME( temps, '%d/%m/%Y' ) AS jour, sens,AVG(valeurunique) as valeurechang,SUM( nbr ) as nb , SUM(IF(profit>0,profit,0)) as profit,ABS(SUM(IF(profit<0,profit,0))) as perte
          FROM historique
          WHERE historique.codesico='$codesico' and temps>'$limit'
            GROUP BY jour,sens ORDER BY temps DESC LIMIT 9";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction ordreactionachat
 * @param mixed $codesico
 * @param mixed $tmps
 * @param mixed $valaction
 */
function ordreactionachat($codesico,$tmps,$valaction)
{
    $secure_cond = (defined('SECURE') && !SECURE) ? " or 1" : "";
    $query = "SELECT coursmax as valeur, SUM( nbr ) as quant, AVG( pourc) * 100 as prc
          FROM ordre
          WHERE ordre.codesico='$codesico' and etat='1' and (datecreation<='$tmps' $secure_cond) and sens='achat' and coursmax<'$valaction' and coursmax>0
            GROUP BY valeur ORDER BY valeur DESC LIMIT 4";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction ordreactionvente
 * @param mixed $codesico
 * @param mixed $tmps
 * @param mixed $valaction
 */
function ordreactionvente($codesico,$tmps,$valaction)
{
    $secure_cond = (defined('SECURE') && !SECURE) ? " or 1" : "";
    $query = "SELECT coursmin as valeur, SUM( nbr ) as quant, AVG( pourc) * 100 as prc
          FROM ordre
          WHERE ordre.codesico='$codesico' and etat='1' and (datecreation<='$tmps' $secure_cond) and sens='vente' and coursmin>'$valaction'
            GROUP BY valeur ORDER BY valeur DESC LIMIT 4";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction exeadminreq
 * @param mixed $idreq
 */
function exeadminreq($idreq)
{
    $idreq=sec($idreq);
    $query = "SELECT * FROM reqlist WHERE idreq='$idreq'"; 
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $retour = new stdClass();
    if($run_query)
    {
        $resultat = LigneSuivante($run_query);
        if($resultat) {
            $nouvutil=$resultat->nbutil+1;
            $query = "UPDATE reqlist SET nbutil='$nouvutil' WHERE idreq='$resultat->idreq'"; 
            ExecRequete ($query, $connexion);    
            if($resultat->req<>"")
            {
                $query = stripslashes($resultat->req);
                $run_query = ExecRequete ($query, $connexion);    
            }
            $retour->req=$run_query;
            $retour->titre=$resultat->libelreq;
            return $retour;
        }
    }
    return "Erreur dans l'id (contacter nicolas)";
}

/**
 * Fonction listadminreq
 */
function listadminreq()
{
    $query = "SELECT CONCAT(\"<a href='index.php?do=exeadmin&idreq=\",idreq,\"'>\",libelreq,\"</a>\") AS 'Afficher :', nbutil AS 'Nombre d\'affichage'
    FROM reqlist ORDER BY nbutil DESC"; 
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return $run_query;
}

/**
 * Fonction listhistocount
 * @param mixed $idcompte
 */
function listhistocount($idcompte)
{  
    $query = "SELECT COUNT(*) as nbrhisto
          FROM historique
          WHERE idcompte=$idcompte";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? $ligne->nbrhisto : 0;
}

/**
 * Fonction getplayercapital
 * @param mixed $idcompte
 */
function getplayercapital($idcompte)
{
    $query = "SELECT pseudonyme, round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0  )  + cashback, 2  )  AS capital
    FROM compte
    LEFT  JOIN portef
    USING ( idcompte ) 
    LEFT  JOIN cacval
    USING ( codesico ) 
    WHERE compte.idcompte =  '$idcompte'
    GROUP  BY compte.idcompte"; 

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $resultat = LigneSuivante($run_query);
    return is_object($resultat) ? $resultat->capital : 0;
}

/**
 * Fonction getplayercapitalhorsvad
 * @param mixed $idcompte
 */
function getplayercapitalhorsvad($idcompte)
{
    $query = "SELECT round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0  ), 2  )  AS capital
    FROM portef
    LEFT  JOIN cacval
    USING ( codesico )
    WHERE portef.idcompte =  '$idcompte' and portef.quant>'0'
    GROUP  BY portef.idcompte";

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $resultat = LigneSuivante($run_query);
    return is_object($resultat) ? doubleval($resultat->capital) : 0.0;
}

/**
 * Fonction getplayercapitalvad
 * @param mixed $idcompte
 */
function getplayercapitalvad($idcompte)
{
    $query = "SELECT round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0  ), 2  )  AS capital
    FROM portef
    LEFT  JOIN cacval
    USING ( codesico )
    WHERE portef.idcompte =  '$idcompte' and portef.quant<'0'
    GROUP  BY portef.idcompte";

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $resultat = LigneSuivante($run_query);
    return is_object($resultat) ? -doubleval($resultat->capital) : 0.0;
}

/**
 * Fonction listmessagescount
 * @param mixed $idcompte
 */
function listmessagescount($idcompte)
{  
    $query = "SELECT COUNT(*) as nbrmsg
          FROM messages
          WHERE idcompte='$idcompte'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? $ligne->nbrmsg : 0;
}

/**
 * Fonction get_tempsbourse
 */
function get_tempsbourse()
{
    $query = "SELECT max(lasttime) AS laststamp FROM cacval";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $timestamp = 0;
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {
        $timestamp = $run_result["laststamp"];
    }
    return $timestamp;
}

/**
 * Fonction listskin
 */
function listskin()
{  
    $query = "SELECT * FROM skin ORDER BY nomskin ASC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $return=[];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[$run_result['idskin']] = $run_result['nomskin'];
    }
    return $return;
}

/**
 * Fonction skin_existe
 * @param mixed $idskin
 */
function skin_existe($idskin)
{
    $query = "SELECT * FROM skin where idskin='$idskin'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return ($run_query && $run_query->rowCount() > 0) ? 1 : 0;
}

/**
 * Fonction scoreestactuel
 */
function scoreestactuel()
{
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, $day, $yr);
    $ladate=date("Y-m-d",$date1);
    $query = "SELECT MAX( datescore ) as dernier FROM `scores` WHERE 1";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $nombre=LigneSuivante($run_query);
    return (is_object($nombre) && $nombre->dernier==$ladate) ? 1 : 0;
}

/**
 * Fonction teamscoreestactuel
 */
function teamscoreestactuel()
{
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, 1, $yr);
    $ladate=date("Y-m-d",$date1);
    $query = "SELECT MAX( datescore ) as dernier FROM `scoresgroupes` WHERE 1";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $nombre=LigneSuivante($run_query);
    return (is_object($nombre) && $nombre->dernier==$ladate) ? 1 : 0;
}

/**
 * Fonction insertscore
 */
function insertscore()
{
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, $day, $yr);
    $ladate=date("Y-m-d",$date1);
    $query = "INSERT INTO `scores` SELECT compte.idcompte,  '$ladate', round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0  )  + cashback, 2  )  AS capital
    FROM compte
    LEFT  JOIN portef
    USING (idcompte)
    LEFT JOIN cacval USING(codesico) WHERE dateactivite>0 and cashback<>'".CAPDEB."'
     GROUP  BY compte.idcompte";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return 1;
}

/**
 * Fonction getperfgroupes
 */
function getperfgroupes()
{
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, $day, $yr);
    $ladate=date("Y-m-d",$date1);
    $query = "SELECT scoresgroupes.idgroupe,round( (
            (
            capitalfin - capitaldeb ) / capitaldeb ) * 100, 2
            ) AS prog from scoresgroupes,membregroupe where datescore='$ladate' and scoresgroupes.idgroupe=membregroupe.idgroupe GROUP BY scoresgroupes.idgroupe ORDER BY prog DESC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction insertgroupescore
 */
function insertgroupescore()
{
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, $day, $yr);
    $date2 = mktime(1, 1, 1, $mon-1, 1, $yr);
    $ladate=date("Y-m-d",$date1);
    $ladatemoisprec=date("Y-m-d",$date2);
    $query = "INSERT INTO `scoresgroupes` SELECT idgroupe,'$ladate', SUM( debcapital ) capitaldeb, SUM( capital ) capitalfin, COUNT( * ) nbmembres
    FROM (
    SELECT idgroupe, COALESCE( scores.capitalscores, ".CAPDEB." ) AS debcapital, round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + cashback, 2 ) AS capital
    FROM membregroupe, compte
    LEFT JOIN portef
    USING ( idcompte )
    LEFT JOIN scores ON ( compte.idcompte = scores.idcompte
    AND scores.datescore = '$ladatemoisprec' )
    LEFT JOIN cacval ON cacval.codesico = portef.codesico
    WHERE membregroupe.idcompte = compte.idcompte
    GROUP BY compte.idcompte
    ) AS iselect
    GROUP BY idgroupe
    HAVING nbmembres>1";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return 1;
}

/**
 * Fonction listmoisclass
 */
function listmoisclass()
{
    $query = "SELECT * FROM listmoisclass";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $format="m-Y";
    $format2=" Y";
    $format3="m";
    $listmois=[];
    $valuedate=date($format);
    $titredate=tomoisfr(date($format3)).date($format2);
    $listmois[$valuedate] = $titredate;
    if ($run_query) {
        while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
        {
            if($run_result['datescore'] !== null) list($yr,$mon,$day) = explode("-",$run_result['datescore']); else { $yr=0; $mon=0; $day=0; }
            $date1 = mktime(1, 1, 1, $mon-1, 1, $yr);
            $valuedate=date($format,$date1);
            $titredate=tomoisfr(date($format3,$date1)).date($format2,$date1);
            $listmois[$valuedate] = $titredate;
        }
    }
    return $listmois;
}

/**
 * Fonction listmoisclassequipe
 */
function listmoisclassequipe()
{
    $query = "SELECT datescore
    FROM `scoresgroupes`
    WHERE 1
    GROUP BY datescore
    ORDER BY datescore DESC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $format="m-Y";
    $format2=" Y";
    $format3="m";
    $listmois=[];
    $valuedate=date($format);
    $titredate=tomoisfr(date($format3)).date($format2);
    $listmois[$valuedate] = $titredate;
    if ($run_query) {
        while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
        {
            if($run_result['datescore'] !== null) list($yr,$mon,$day) = explode("-",$run_result['datescore']); else { $yr=0; $mon=0; $day=0; }
            $date1 = mktime(1, 1, 1, $mon-1, 1, $yr);
            $valuedate=date($format,$date1);
            $titredate=tomoisfr(date($format3,$date1)).date($format2,$date1);
            $listmois[$valuedate] = $titredate;
        }
    }
    return $listmois;
}

/**
 * Fonction getyahooname
 * @param mixed $sico
 */
function getyahooname($sico)
{
    $query = "SELECT yahooname FROM cacval WHERE codesico='$sico'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $obj=LigneSuivante($run_query);
    return is_object($obj) ? $obj->yahooname : "";
}

/**
 * Fonction get_yahoosicavliste
 */
function get_yahoosicavliste()
{
    $query = "SELECT yahooname FROM cacval WHERE down='1' ORDER BY codesico";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $i=0;
    $return="";
    while ( $r = $run_query->fetch(PDO::FETCH_OBJ) )
    {
        if($i==1)
        {
            $return.="+";
        }
        $return.= $r->yahooname;
        $i=1;
    }
    return defined('NOUVADDR') ? NOUVADDR.$return.NOUVADDRFIN : $return;
}

/**
 * Fonction getinternauteinfo
 * @param mixed $pseudo
 */
function getinternauteinfo($pseudo)
{
    $query = "SELECT * FROM `compte` where pseudonyme='$pseudo'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction setmdp
 * @param mixed $idcompte
 * @param mixed $mdp
 */
function setmdp($idcompte,$mdp)
{
    $passe=md5($mdp);
    $query = "UPDATE compte SET passe='$passe' WHERE idcompte='$idcompte'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return 1;
}

/**
 * Fonction increcompensegroupe
 * @param mixed $idgroupe
 * @param mixed $or
 * @param mixed $argent
 * @param mixed $bronze
 */
function increcompensegroupe($idgroupe,$or,$argent,$bronze)
{
    $query = "UPDATE `groupe` SET `medor`=`medor`+$or,`medargent`=`medargent`+$argent,`medbronze`=`medbronze`+$bronze WHERE idgroupe='$idgroupe'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return 1;
}

/**
 * Fonction getheritier
 * @param mixed $idgroupe
 * @param mixed $idcomptedead
 */
function getheritier($idgroupe,$idcomptedead)
{
    $query = "SELECT * FROM `membregroupe` where idgroupe='$idgroupe' and idcompte!='$idcomptedead' ORDER BY datejoint ASC LIMIT 1";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $resultat=LigneSuivante($run_query);
    return is_object($resultat) ? $resultat->idcompte : 0;
}

/**
 * Fonction fctgetoffteammaster
 * @param mixed $idcompte
 */
function fctgetoffteammaster($idcompte)
{
    $groupe=getgroupbyadmin($idcompte);
    if(is_object($groupe) && $groupe->idgroupe>0)
    {
        $idcompteheritier=getheritier($groupe->idgroupe,$idcompte);
        $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
        if($idcompteheritier>0)
        {
            $query = "UPDATE `groupe` SET `idcompte` = '$idcompteheritier' WHERE `idgroupe` = '$groupe->idgroupe' LIMIT 1";
            $run_query = ExecRequete ($query, $connexion);
            fctgetoffteam($idcompte);
        } else {
            $query = "DELETE FROM `invitegroupe` WHERE `idgroupe` = '$groupe->idgroupe'";
            ExecRequete ($query, $connexion);
            $query = "DELETE FROM `membregroupe` WHERE `idgroupe` = '$groupe->idgroupe'";
            ExecRequete ($query, $connexion);
            $query = "DELETE FROM `scoresgroupes` WHERE `idgroupe` = '$groupe->idgroupe'";
            ExecRequete ($query, $connexion);
            $query = "DELETE FROM `verifgroupe` WHERE `idgroupe` = '$groupe->idgroupe'";
            ExecRequete ($query, $connexion);
            $query = "DELETE FROM `groupe` WHERE `idgroupe` = '$groupe->idgroupe'";
            ExecRequete ($query, $connexion);
        }
    }
}

/**
 * Fonction fctgetoffteam
 * @param mixed $idcompte
 */
function fctgetoffteam($idcompte)
{
    $groupe=getgroupbymembre($idcompte);
    if(is_object($groupe) && $groupe->idgroupe>0)
    {
        $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
        $query = "DELETE FROM `membregroupe` WHERE `idgroupe` = '$groupe->idgroupe' and `idcompte`='$idcompte' LIMIT 1";
        ExecRequete ($query, $connexion);
    }
}

/**
 * Fonction fctdoraz
 * @param mixed $liste
 * @param mixed $optdel
 */
function fctdoraz($liste,$optdel=0)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query = "DELETE FROM portef WHERE idcompte IN ($liste)";
    ExecRequete ($query, $connexion);
    $query = "DELETE FROM historique WHERE idcompte IN ($liste)";
    ExecRequete ($query, $connexion);
    $query = "DELETE FROM messages WHERE idcompte IN ($liste)";
    ExecRequete ($query, $connexion);
    $query = "DELETE FROM scores WHERE idcompte IN ($liste)";
    ExecRequete ($query, $connexion);
    $query = "DELETE FROM ordre WHERE idcompte IN ($liste)";
    ExecRequete ($query, $connexion);
    $query = "DELETE FROM invitegroupe WHERE idcompte IN ($liste)";
    ExecRequete ($query, $connexion);
    $query = "DELETE FROM membregroupe WHERE idcompte IN ($liste)";
    ExecRequete ($query, $connexion);

    $query = "UPDATE compte SET cashback='".CAPDEB."' WHERE idcompte IN ($liste)";
    ExecRequete ($query, $connexion);

    if($optdel && $liste!=1 && (!defined('IDCOMPTEDEMO') || $liste!=IDCOMPTEDEMO))
    {
        $query = "DELETE FROM tabaidecomment WHERE idcompte IN ($liste)";
        ExecRequete ($query, $connexion);
        $query = "DELETE FROM tabfaqcomment WHERE idcompte IN ($liste)";
        ExecRequete ($query, $connexion);
        $query = "DELETE FROM compte WHERE idcompte IN ($liste)";
        ExecRequete ($query, $connexion);
        $query = "UPDATE `f_sujet` SET `idcompteauteur` = '".ID_COMPTE_ANONYME."' WHERE `idcompteauteur` IN ($liste)";
        ExecRequete ($query, $connexion);
        $query = "UPDATE `f_message` SET `idcompte` = '".ID_COMPTE_ANONYME."' WHERE `idcompte` IN ($liste)";
        ExecRequete ($query, $connexion);
    }

    return 0;
}

/**
 * Fonction getCodesSicoSecteurPortef
 * @param mixed $idjoueur
 */
function getCodesSicoSecteurPortef($idjoueur)
{
    $query = "SELECT cacvalfinish.codesico
          FROM cacval,portef,cacval as cacvalfinish WHERE cacval.codesico=portef.codesico AND portef.idcompte='$idjoueur' and cacval.idsecteur=cacvalfinish.idsecteur ORDER BY cacvalfinish.idsecteur";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $lst="";
    while($res=LigneSuivante($run_query))
    {
        if($lst<>"") $lst.=",";
        $lst.=$res->codesico;
    }
    return $lst;
}

/**
 * Fonction getCodesSicoPortef
 * @param mixed $idjoueur
 */
function getCodesSicoPortef($idjoueur)
{
    $query = "SELECT portef.codesico FROM portef WHERE portef.idcompte='$idjoueur'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $lst="";
    while($res=LigneSuivante($run_query))
    {
        if($lst<>"") $lst.=",";
        $lst.=$res->codesico;
    }
    return $lst;
}

/**
 * Fonction getCodesSicoCote
 * @param mixed $idjoueur
 */
function getCodesSicoCote($idjoueur)
{
    $query = "SELECT cacval.codesico,ROUND(SUM(nbr*valeurunique),2) as Valeur FROM cacval,historique WHERE cacval.codesico = historique.codesico AND temps>UNIX_TIMESTAMP()-(3600*24*7) AND historique.nbr>0 GROUP BY cacval.nom ORDER BY Valeur DESC LIMIT 5";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $lst="";
    while($res=LigneSuivante($run_query))
    {
        if($lst<>"") $lst.=",";
        $lst.=$res->codesico;
    }
    return $lst;
}

/**
 * Fonction ajoutcommentaire
 * @param mixed $message
 * @param mixed $idaide
 */
function ajoutcommentaire($message,$idaide)
{
    global $internaute;
    if($message=="" || !is_object($internaute)) return "";
    $query = "INSERT INTO `tabaidecomment` ( `idcomment` , `idaide` , `idcompte` , `datecomment` , `textecomment` )
    VALUES (
    '', '$idaide', '$internaute->idcompte', '".date("U")."', '$message'
    )";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return "";
}

/**
 * Fonction effacvieuxordres
 */
function effacvieuxordres()
{
    global $internaute;
    if(!is_object($internaute) || !isset($internaute->idcompte)) return "";
    $query = "DELETE FROM `ordre`
    WHERE (
    `etat` = '0' OR `tempslim` < UNIX_TIMESTAMP( )
    ) AND `datecreation` < UNIX_TIMESTAMP( ) -3600*25 AND idcompte='$internaute->idcompte'";

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $query;
}

/**
 * Fonction effacordresinactifs
 */
function effacordresinactifs()
{
    global $internaute;
    if(!is_object($internaute) || !isset($internaute->idcompte)) return "";
    $query = "DELETE FROM `ordre`
    WHERE (
    `etat` = '0' OR `tempslim` < UNIX_TIMESTAMP( )
    ) AND idcompte='$internaute->idcompte'";

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $query;
}

/**
 * Fonction delcommentaire
 * @param mixed $idcomment
 */
function delcommentaire($idcomment)
{
    global $internaute;
    if(!is_object($internaute)) return "";
    $query = "SELECT * FROM tabaidecomment WHERE idcomment= '$idcomment' ";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $lauteur=LigneSuivante($run_query);
    if(is_object($lauteur) && ($lauteur->idcompte==$internaute->idcompte || (isset($internaute->authlevel) && $internaute->authlevel>1)))
    {
        $query = "DELETE FROM `tabaidecomment` WHERE `idcomment`='$idcomment'";
        ExecRequete ($query, $connexion);
    }
    return "";
}

/**
 * Fonction ajoutcommentairefaq
 * @param mixed $message
 * @param mixed $idaide
 */
function ajoutcommentairefaq($message,$idaide)
{
    global $internaute;
    if($message=="" || !is_object($internaute)) return "";
    $query = "INSERT INTO `tabfaqcomment` ( `idcomment` , `idaide` , `idcompte` , `datecomment` , `textecomment` )
    VALUES (
    '', '$idaide', '$internaute->idcompte', '".date("U")."', '$message'
    )";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return "";
}

/**
 * Fonction delcommentairefaq
 * @param mixed $idcomment
 */
function delcommentairefaq($idcomment)
{
    global $internaute;
    if(!is_object($internaute)) return "";
    $query = "SELECT * FROM tabfaqcomment WHERE idcomment= '$idcomment' ";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $lauteur=LigneSuivante($run_query);
    if(is_object($lauteur) && ($lauteur->idcompte==$internaute->idcompte || (isset($internaute->authlevel) && $internaute->authlevel>1)))
    {
        $query = "DELETE FROM `tabfaqcomment` WHERE `idcomment`='$idcomment'";
        ExecRequete ($query, $connexion);
    }
    return "";
}

/**
 * Fonction modifetatactions
 * @param mixed $lst
 * @param mixed $nouvetat
 */
function modifetatactions($lst,$nouvetat)
{
    $query = "UPDATE cacval SET authachat='$nouvetat',down='$nouvetat' WHERE codesico IN ($lst)";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return "";
}

/**
 * Fonction delactions
 * @param mixed $lst
 */
function delactions($lst)
{
    $query = "INSERT INTO ordre ( `codesico` , `idcompte` , `datecreation` , `sens` , `nbr` , `pourc` , `tempslim` , `coursmin` , `coursmax` , `etat` )
    ( SELECT codesico,idcompte,0,'vente',quant,0,UNIX_TIMESTAMP()+5000,0,-1,'1' FROM portef WHERE codesico IN ($lst) AND quant>0)";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete ($query, $connexion);

    $query = "INSERT INTO ordre ( `codesico` , `idcompte` , `datecreation` , `sens` , `nbr` , `pourc` , `tempslim` , `coursmin` , `coursmax` , `etat` )
    (SELECT codesico,idcompte,0,'achat',-quant,0,UNIX_TIMESTAMP()+5000,0,-1,'1' FROM portef WHERE codesico IN ($lst) AND quant<0)";
    ExecRequete ($query, $connexion);

    $query = "UPDATE cacval SET lasttime=UNIX_TIMESTAMP(),lasttimedown=UNIX_TIMESTAMP() WHERE codesico IN ($lst)";
    ExecRequete ($query, $connexion);

    execute_ordre();
    modifetatactions($lst,0);

    return "";
}

/**
 * Fonction factoriseactions
 * @param mixed $lst
 * @param mixed $type
 * @param mixed $fac
 * @param mixed $datedeb
 * @param mixed $datefin
 */
function factoriseactions($lst,$type,$fac,$datedeb,$datefin)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    if($type=="multiplier") $query = "INSERT INTO historique ( SELECT '',UNIX_TIMESTAMP(),codesico,idcompte,IF(quant>0,'achat','vente'),-quant+(quant*$fac),0,0.001,0 FROM portef WHERE codesico IN ($lst) )";
    if($type=="diviser") $query = "INSERT INTO historique ( SELECT '',UNIX_TIMESTAMP(),codesico,idcompte,IF(quant<0,'achat','vente'),quant-(quant/$fac),0,-0.001,0 FROM portef WHERE codesico IN ($lst) )";
    ExecRequete ($query, $connexion);

    if($type=="multiplier") $query = "UPDATE portef SET quant=quant*$fac,ansvaleur=ansvaleur/$fac WHERE codesico IN ($lst)";
    if($type=="diviser") $query = "UPDATE portef SET quant=quant/$fac,ansvaleur=ansvaleur*$fac WHERE codesico IN ($lst)";
    ExecRequete ($query, $connexion);

    return "";
}

/**
 * Fonction getnvmessages
 * @param mixed $idcompte
 */
function getnvmessages($idcompte=0)
{  
    global $internaute;
    if($idcompte==0 && is_object($internaute) && isset($internaute->idcompte)) {
        $idcompte=$internaute->idcompte;
    }
    if($idcompte==0) return 0;
    $query = "SELECT COUNT(*) as nbrmsg FROM messages WHERE idcompte='$idcompte' and etat='non lu'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? $ligne->nbrmsg : 0;
}

/**
 * Fonction getnvmessagesenvoye
 * @param mixed $idcompte
 */
function getnvmessagesenvoye($idcompte=0)
{  
    global $internaute;
    if($idcompte==0 && is_object($internaute) && isset($internaute->idcompte)) {
        $idcompte=$internaute->idcompte;
    }
    if($idcompte==0) return 0;
    $query = "SELECT COUNT(*) as nbrmsg FROM messages WHERE idenvoyeur='$idcompte' and etat='non lu' and ".date("U")."-datemess<=".MAX_MESSAGE_TEMPS*3600;
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? $ligne->nbrmsg : 0;
}

/**
 * Fonction getgroupbyadmin
 * @param mixed $idcompte
 */
function getgroupbyadmin($idcompte)
{  
    $query = "SELECT * FROM groupe WHERE idcompte='$idcompte'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return LigneSuivante($run_query);
}

/**
 * Fonction getgroupbymembre
 * @param mixed $idcompte
 */
function getgroupbymembre($idcompte)
{
    $query = "SELECT * FROM groupe,membregroupe WHERE groupe.idgroupe=membregroupe.idgroupe and membregroupe.idcompte='$idcompte'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);    
    return LigneSuivante($run_query);
}

/**
 * Fonction membreestinvite
 * @param mixed $idcompte
 * @param mixed $idgroupe
 */
function membreestinvite($idcompte,$idgroupe)
{
    $query = "SELECT COUNT(*) AS nb FROM invitegroupe WHERE idgroupe='$idgroupe' and idcompte='$idcompte'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? $ligne->nb : 0;
}

/**
 * Fonction getmembrebygroup
 * @param mixed $idgroupe
 */
function getmembrebygroup($idgroupe)
{
    $query = "SELECT * FROM compte,membregroupe WHERE compte.idcompte=membregroupe.idcompte and membregroupe.idgroupe='$idgroupe' order by compte.pseudonyme";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction getjoueursnotingroupe
 */
function getjoueursnotingroupe()
{
    $query = "SELECT idcompte,pseudonyme FROM compte WHERE idcompte NOT IN (SELECT idcompte FROM membregroupe) order by pseudonyme ASC";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction doinvitejoueur
 * @param mixed $idjoueur
 */
function doinvitejoueur($idjoueur)
{
    global $internaute;
    if(!is_object($internaute)) return;
    $groupe=getgroupbymembre($internaute->idcompte);
    if(is_object($groupe)) {
        $idgroupe=$groupe->idgroupe;
        if( !membreestinvite($idjoueur,$idgroupe) && !estmembregroupe($idjoueur))
        {
            $query = "INSERT INTO `invitegroupe` ( `idgroupe` , `idcompte` ) VALUES ( '$idgroupe', '$idjoueur' )";
            $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
            ExecRequete ($query, $connexion);
        }
    }
}

/**
 * Fonction delinvitejoueur
 * @param mixed $idjoueur
 */
function delinvitejoueur($idjoueur)
{
    $query = "DELETE FROM `invitegroupe` WHERE `idcompte`='$idjoueur'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete ($query, $connexion);
}

/**
 * Fonction doajgroupe
 * @param mixed $idcompte
 * @param mixed $titregroupe
 * @param mixed $diminutif
 * @param mixed $url
 * @param mixed $description
 */
function doajgroupe($idcompte,$titregroupe,$diminutif,$url,$description)
{
    if( !estadmingroupe($idcompte) and !estmembregroupe($idcompte))
    {
        $ligne=getverifgroupe(0,$idcompte);
        $groupe=LigneSuivante($ligne);

        if( !is_object($groupe) || $groupe->idcompte!=$idcompte )
        {
            $query = "INSERT INTO `verifgroupe` ( `idverifgroupe` , `idgroupe` , `idcompte` , `titregroupe` , `initialgroupe` , `urlsite` , `descriptiongroupe` )     VALUES ('', '0', '$idcompte', '$titregroupe', '$diminutif', '$url' , '$description')";
            $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
            ExecRequete ($query, $connexion);
            return msgtab(lang(193),lang(187));
        } else {
            return msgtab(lang(208),lang(187));
        }
    } else {
        return msgtab(lang(207),lang(187));
    }
}

/**
 * Fonction dojoingroupe
 * @param mixed $idgroupe
 */
function dojoingroupe($idgroupe)
{
    global $internaute;
    if(!is_object($internaute)) return;
    if(membreestinvite($internaute->idcompte,$idgroupe)&&!estmembregroupe($internaute->idcompte))
    {
        delinvitejoueur($internaute->idcompte);
        $capital=getscorejoueur($internaute->idcompte);
        $query = " INSERT INTO `membregroupe` ( `idcompte` , `idgroupe` , `datejoint` , `capitalinscr` ) VALUES ( '$internaute->idcompte', '$idgroupe', UNIX_TIMESTAMP( ) , '$capital') ";
        $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
        ExecRequete ($query, $connexion);
        $query = " DELETE FROM `verifgroupe` WHERE `idcompte`='$internaute->idcompte'";
        ExecRequete ($query, $connexion);
    } else {
        echo msgtab(lang(220),lang(171));
    }
}

/**
 * Fonction domodifgroupe
 * @param mixed $idgroupe
 * @param mixed $idcompte
 * @param mixed $titregroupe
 * @param mixed $diminutif
 * @param mixed $url
 * @param mixed $description
 */
function domodifgroupe($idgroupe,$idcompte,$titregroupe,$diminutif,$url,$description)
{
    $ligne=getverifgroupe($idgroupe);
    $groupe=LigneSuivante($ligne);

    if( is_object($groupe) && $groupe->idgroupe==$idgroupe )
    {
        $query = "DELETE FROM `verifgroupe` WHERE idgroupe='$idgroupe'";
        $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
        ExecRequete ($query, $connexion);
    }
    $query = "INSERT INTO `verifgroupe` ( `idverifgroupe` , `idgroupe` , `idcompte` , `titregroupe` , `initialgroupe` , `urlsite` , `descriptiongroupe` )
    VALUES (
    '', '$idgroupe', '$idcompte', '$titregroupe', '$diminutif', '$url' , '$description'
    )";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete ($query, $connexion);
    return lang(194);
}

/**
 * Fonction getverifgroupe
 * @param mixed $idgroupe
 * @param mixed $idcompte
 */
function getverifgroupe($idgroupe=0,$idcompte=0)
{
    $where="";
    if($idgroupe!=0)
        $where=" WHERE idgroupe='$idgroupe'";
    if($idcompte!=0)
        $where=" WHERE idcompte='$idcompte'";

    $query = "SELECT * FROM `verifgroupe` $where ORDER BY idgroupe";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction sauveipadress
 * @param mixed $ip
 */
function sauveipadress($ip)
{
    $query = "UPDATE conf set valeur='$ip' WHERE libel='envoyeurip'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete ($query, $connexion);
}

/**
 * Fonction getiphome
 */
function getiphome()
{
    $query = "SELECT * FROM conf WHERE libel='envoyeurip'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? "<iphome>$ligne->valeur</iphome>" : "";
}

/**
 * Fonction dogroupeaccepterefuse
 * @param mixed $idverif
 * @param mixed $choixadmin
 * @param mixed $commentaireadmin
 */
function dogroupeaccepterefuse($idverif,$choixadmin,$commentaireadmin)
{
    $query = "SELECT * FROM `verifgroupe` WHERE idverifgroupe='$idverif'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $groupe=LigneSuivante($run_query);
    if (!is_object($groupe)) return msgtab("Erreur : groupe introuvable.", "Administration");
    $player=chercheinternaute($groupe->idcompte,$connexion);
    $doing="annulé";

    $idcompte=addslashes($groupe->idcompte);
    $titregroupe=addslashes($groupe->titregroupe);
    $initialgroupe=addslashes($groupe->initialgroupe);
    $urlsite=addslashes($groupe->urlsite);
    $descriptiongroupe=addslashes($groupe->descriptiongroupe);
    $idgroupe=addslashes($groupe->idgroupe);

    if($groupe->idgroupe==0)
    {
        if($choixadmin=="1")
        {
            $idforum=forum_newgroupeforum($initialgroupe);
            $query = "INSERT INTO `groupe` ( `idgroupe` , `idcompte` , `titregroupe` , `initialgroupe` , `urlsite` , `etat` , `descriptiongroupe` , `medor` , `medargent` , `medbronze` , `datecreation`, `idforum` )
            VALUES (
            '', '$idcompte', '$titregroupe', '$initialgroupe', '$urlsite', 'inactif', '$descriptiongroupe', '0', '0', '0', UNIX_TIMESTAMP( ), '$idforum')";
            ExecRequete ($query, $connexion);
            $last_id = Connexion(NOM, PASSE, BASE, SERVEUR)->lastInsertId();
            $query = "INSERT INTO `membregroupe` ( `idcompte` , `idgroupe` , `datejoint`,`capitalinscr` ) VALUES ('$idcompte', '$last_id', UNIX_TIMESTAMP( ),'".getscorejoueur($idcompte)."')";
            ExecRequete ($query, $connexion);
            if(is_object($player)) envoimail($player->email, lang(187),lang(195).lang(196)."\n\n".$commentaireadmin);
            $doing="ajouté";
        } else {
            if(is_object($player)) envoimail($player->email, lang(187),lang(195).lang(199).$commentaireadmin);
        }
    } else {
        if($choixadmin=="1")
        {
            $autregroupe=getgroupbymembre($groupe->idcompte);
            if(!is_object($autregroupe) || $autregroupe->idgroupe==$groupe->idgroupe || $autregroupe==0)
            {
                $query = "UPDATE `groupe` SET `idcompte`='$idcompte',`titregroupe`='$titregroupe' , `initialgroupe`='$initialgroupe' , `urlsite`='$urlsite' , `descriptiongroupe`='$descriptiongroupe'
                WHERE idgroupe='$idgroupe'";
                ExecRequete ($query, $connexion);
                if(is_object($player)) envoimail($player->email, lang(188),lang(195).lang(197)."\n\n".$commentaireadmin);
                $doing="modifié";
            }
        } else {
            if(is_object($player)) envoimail($player->email, lang(188),lang(195).lang(200).$commentaireadmin);
        }
    }
    $query = "DELETE FROM `verifgroupe` WHERE idverifgroupe='$groupe->idverifgroupe'";
    ExecRequete ($query, $connexion);
    return msgtab("Groupe a été ".$doing.".","Administration des groupes");
}

/**
 * Fonction effacvieuxscores
 */
function effacvieuxscores()
{
    $query = "DELETE FROM `scores`  WHERE DAY( `datescore` )<>1 and `datescore` < DATE_SUB(CURDATE() , INTERVAL  ".NB_JOUR_GARDER_STAT_JOUEUR." DAY)";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete ($query, $connexion);
    return 0;
}

/**
 * Fonction getscorejoueur
 * @param mixed $idcompte
 */
function getscorejoueur($idcompte)
{
    $query="
    SELECT round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + cashback, 2 ) AS capital
    FROM compte
    LEFT JOIN portef
    USING ( idcompte )
    LEFT JOIN cacval ON cacval.codesico = portef.codesico
    WHERE compte.idcompte='$idcompte'
    GROUP BY compte.idcompte";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? $ligne->capital : 0;
}

/**
 * Fonction get_sicavdown
 */
function get_sicavdown()
{
    $query = "SELECT yahooname FROM cacval WHERE down='1' ORDER BY codesico";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    $return = [];
    while ( $run_result = $run_query->fetch(PDO::FETCH_BOTH) )
    {   
        $return[] = $run_result;
    }
    return $return;
}

/**
 * Fonction doundoallinvitegroupe
 */
function doundoallinvitegroupe()
{
    global $internaute;
    if(!is_object($internaute)) return "";
    $groupe=getgroupbyadmin($internaute->idcompte);
    if(is_object($groupe) && $groupe->idgroupe>0)
    {
        $query = "DELETE FROM `invitegroupe` WHERE idgroupe='$groupe->idgroupe'";
        $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
        ExecRequete ($query, $connexion);
    }
    return msgtab(lang(227),"Administration des groupes");
}

/**
 * Fonction getinfogroupe
 * @param mixed $idgroupe
 */
function getinfogroupe($idgroupe)
{
    $query = "SELECT * FROM `groupe`,`compte` WHERE groupe.idgroupe='$idgroupe' and groupe.idcompte=compte.idcompte";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction getcompositionequipe
 * @param mixed $idgroupe
 */
function getcompositionequipe($idgroupe)
{
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, 1, $yr);
    $ladate=date("Y-m-d",$date1);
    $cap=CAPDEB;
    $query="SELECT pseudonyme, FROM_UNIXTIME( datejoint, '%d/%m/%Y' ) as dateinscription,membregroupe.capitalinscr as capitalinscr ,round( (
            (
            COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + compte.cashback - COALESCE( scores.capitalscores, $cap) ) / COALESCE( scores.capitalscores, $cap ) ) * 100, 2
            ) AS prog, round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + cashback, 2 ) AS capital
            FROM membregroupe, compte
            LEFT JOIN portef
            USING ( idcompte )
            LEFT JOIN scores ON ( compte.idcompte = scores.idcompte
            AND scores.datescore = '$ladate' )
            LEFT JOIN cacval ON cacval.codesico = portef.codesico
            WHERE membregroupe.idcompte = compte.idcompte and membregroupe.idgroupe='$idgroupe'
            GROUP BY compte.idcompte ORDER BY ".tabordre("profilequipe");
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return $run_query;
}

/**
 * Fonction checkoutdated
 */
function checkoutdated()
{
    $query="TRUNCATE TABLE warn_old_sicav";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete ($query, $connexion);
    $query="INSERT INTO warn_old_sicav SELECT compte.idcompte,cacval.codesico,CONCAT(CONCAT('".ADDRNT."',CONCAT('?do=junksicav&idcompte=',CONCAT(compte.idcompte,'&checkstr='))),
    CONCAT(md5(CONCAT(compte.idcompte,dateinscr)),'&codesico=',cacval.codesico)) as link FROM compte,cacval,portef WHERE compte.idcompte=portef.idcompte and
     portef.codesico=cacval.codesico and compte.dateactivite>UNIX_TIMESTAMP()-(24*3600)  and lasttime<UNIX_TIMESTAMP()-".strval(CONSIDERER_OUTDATED_SICAV*3600*24);
    ExecRequete ($query, $connexion);
}

/**
 * Fonction majclassement
 */
function majclassement()
{
    $mois=date("Y-m-d");
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = mktime(1, 1, 1, $mon, 1, $yr);
    $ladate=date("Y-m-d",$date1);

    $query = "TRUNCATE TABLE `statsclassement`";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete ($query, $connexion);
    $query = "INSERT INTO statsclassement
    SELECT pseudonyme, round( COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + cashback, 2 ) AS capital, round( (
    (
    COALESCE( SUM( cacval.valeur * portef.quant ) , 0 ) + compte.cashback - COALESCE( scores.capitalscores, ".CAPDEB." ) ) / COALESCE( scores.capitalscores, ".CAPDEB." ) ) * 100, 2
    ) AS prog,compte.idcompte as idcompte
    FROM compte
    LEFT JOIN portef
    USING ( idcompte )
    LEFT  JOIN scores
    ON (compte.idcompte=scores.idcompte AND scores.datescore = '$ladate')
    LEFT JOIN cacval ON cacval.codesico = portef.codesico
    WHERE authlevel = '1' and cashback<>'".CAPDEB."'
    GROUP BY compte.idcompte";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction majlistmoisclass
 */
function majlistmoisclass()
{
    $query = "TRUNCATE TABLE `listmoisclass`";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete ($query, $connexion);
    $query = "INSERT INTO listmoisclass SELECT datescore
    FROM `scores`
    WHERE RIGHT( `datescore` , 2 ) = '01'
    GROUP BY datescore
    ORDER BY datescore DESC";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction istableexist
 * @param mixed $nomtable
 */
function istableexist($nomtable)
{
    $query = "SHOW TABLES LIKE '$nomtable'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    return ($run_query && $run_query->rowCount()==1);
}

/**
 * Fonction forumsyncquantity
 * @param mixed $idforum
 */
function forumsyncquantity($idforum)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE `f_forum` frm SET `nbmessages`=0,`nbsujets`=0 WHERE frm.idforum='$idforum'";
    ExecRequete ($query, $connexion);
    $query="UPDATE `f_sujet` fs SET `s_nbmessages`=(SELECT COUNT(*) FROM f_message fm WHERE fm.idsujet=fs.idsujet)-1 WHERE fs.idforum='$idforum'";
    ExecRequete ($query, $connexion);
    $query="UPDATE `f_forum` frm SET `nbmessages`=(SELECT SUM(`s_nbmessages`+1) FROM f_sujet fs WHERE fs.idforum=frm.idforum),`nbsujets`=(SELECT COUNT(*) FROM f_sujet fs WHERE fs.idforum=frm.idforum) WHERE frm.idforum='$idforum'";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction forumsyncidlastmessage
 * @param mixed $idforum
 */
function forumsyncidlastmessage($idforum)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE f_forum ff SET idlastmessage=0 WHERE ff.idforum='$idforum'";
    ExecRequete ($query, $connexion);
    $query="UPDATE f_sujet fsu SET idlastmessage=(SELECT MAX(fm.idmessage) FROM f_message fm WHERE fm.idsujet=fsu.idsujet) WHERE fsu.idforum='$idforum'";
    ExecRequete ($query, $connexion);
    $query="UPDATE f_forum ff SET idlastmessage=(SELECT MAX(fs.idlastmessage) FROM f_sujet fs WHERE fs.idforum=ff.idforum) WHERE ff.idforum='$idforum'";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction getinfojoueur
 * @param mixed $idjoueur
 */
function getinfojoueur($idjoueur)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="SELECT * FROM compte where idcompte='$idjoueur'";
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction getinfosicav
 * @param mixed $idsicav
 */
function getinfosicav($idsicav)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="SELECT * FROM cacval where codesico='$idsicav'";
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction forum_getidmessagesujet
 * @param mixed $idsujet
 */
function forum_getidmessagesujet($idsujet)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="SELECT idmessage FROM `f_message` where idsujet='$idsujet' ORDER BY idmessage ASC LIMIT 0,1";
    $run_query = ExecRequete ($query, $connexion);
    $ligne=LigneSuivante($run_query);
    return is_object($ligne) ? $ligne->idmessage : 0;
}

/**
 * Fonction forum_getlastmessagesujet
 * @param mixed $idsujet
 */
function forum_getlastmessagesujet($idsujet)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="SELECT * FROM `f_message` where idsujet='$idsujet' ORDER BY idmessage DESC LIMIT 0,1";
    $run_query = ExecRequete ($query, $connexion);
    return LigneSuivante($run_query);
}

/**
 * Fonction forum_peutposter
 * @param mixed $idcompte
 * @param mixed $idforum
 */
function forum_peutposter($idcompte,$idforum)
{
    $infoforum=get_infoforum($idforum);
    $infojoueur=getinfojoueur($idcompte);
    if(!is_object($infojoueur) || !is_object($infoforum)) return false;
    if($infojoueur->authlevel>1)
        return true;
    if(defined('IDCOMPTEDEMO') && $infojoueur->idcompte==IDCOMPTEDEMO)
        return false;
    if($infoforum->authwrite=="groupe")
    {
        $infogroupe=getgroupbymembre($idcompte);
        return is_object($infogroupe) && $infogroupe->idforum==$idforum;
    } elseif($infoforum->authwrite=="identifie"){
        return $infojoueur->authlevel>=1;
    } else {
        return false;
    }
}

/**
 * Fonction forum_peutlire
 * @param mixed $idcompte
 * @param mixed $idforum
 */
function forum_peutlire($idcompte,$idforum)
{
    $infoforum=get_infoforum($idforum);
    $infojoueur=getinfojoueur($idcompte);
    if(is_object($infojoueur) && $infojoueur->authlevel>1)
        return true;
    if(!is_object($infoforum)) return false;
    if($infoforum->authread=="groupe")
    {
        $infogroupe=getgroupbymembre($idcompte);
        return is_object($infogroupe) && $infogroupe->idforum==$idforum;
    } elseif($infoforum->authread=="identifie" || $infoforum->authread=="ouvert"){
        return true;
    } else {
        return false;
    }
}

/**
 * Fonction setsujetlu
 * @param mixed $idsujet
 */
function setsujetlu($idsujet)
{
    global $internaute;
    if(!is_object($internaute)) return;
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="INSERT IGNORE INTO `f_readsujet` ( `idsujet` , `idcompte` ) VALUES ( '$idsujet', '$internaute->idcompte')";
    ExecRequete ($query, $connexion);
    $infosujet=get_infosujet($idsujet);
    if(is_object($infosujet)) {
        $query="INSERT IGNORE INTO `f_readforum` ( `idforum` , `idcompte` ) VALUES ('$infosujet->idforum', '$internaute->idcompte')";
        ExecRequete ($query, $connexion);
    }
}

/**
 * Fonction forum_inc_nblectures
 * @param mixed $idsujet
 */
function forum_inc_nblectures($idsujet)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE `f_sujet` SET `nblectures` = `nblectures`+1 WHERE `idsujet` = '$idsujet' ";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction forum_inc_joueur_nbposts
 * @param mixed $idjoueur
 */
function forum_inc_joueur_nbposts($idjoueur)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE `compte` SET `nbpostforum` = `nbpostforum`+1 WHERE `idcompte` = '$idjoueur' ";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction forum_set_joueur_toutlu
 * @param mixed $idjoueur
 * @param mixed $date
 */
function forum_set_joueur_toutlu($idjoueur,$date)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE `compte` SET `toutvuforum` = '$date' WHERE `idcompte` = '$idjoueur' ";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction forum_majtoutvuforum
 * @param mixed $idjoueur
 */
function forum_majtoutvuforum($idjoueur)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="SELECT dateactivite FROM compte where idcompte='$idjoueur'";
    $run_query = ExecRequete ($query, $connexion);
    $ligne=LigneSuivante($run_query);
    if(is_object($ligne) && $ligne->dateactivite<date("U")-SEC_JOUEUR_CONSIDERER_FORUM_TOUTLU)
    {
        forum_set_joueur_toutlu($idjoueur,$ligne->dateactivite);
        $query="DELETE FROM `f_readsujet` where idcompte='$idjoueur'";
        ExecRequete ($query, $connexion);
    }
}

/**
 * Fonction forum_ajoutforum
 * @param mixed $idsection
 * @param mixed $nomforum
 * @param mixed $descriptionforum
 * @param mixed $authread
 * @param mixed $authwrite
 */
function forum_ajoutforum($idsection , $nomforum , $descriptionforum , $authread , $authwrite)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="INSERT INTO `f_forum` ( `idsection` , `nomforum` , `descriptionforum` , `nbsujets` , `nbmessages` , `idlastmessage` , `authread` , `authwrite` )
    VALUES ( '$idsection', '$nomforum', '$descriptionforum', '0', '0', '0', '$authread', '$authwrite')";
    ExecRequete ($query, $connexion);
    return $connexion->lastInsertId();
}

/**
 * Fonction forum_newgroupeforum
 * @param mixed $nomggroupe
 */
function forum_newgroupeforum($nomggroupe)
{
    return forum_ajoutforum(0 , "Forum $nomggroupe" , "Forum du groupe $nomggroupe" , 'groupe' , 'groupe');
}

/**
 * Fonction setsujetpaslu
 * @param mixed $idsujet
 */
function setsujetpaslu($idsujet)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="DELETE FROM `f_readsujet` WHERE `idsujet`='$idsujet'";
    ExecRequete ($query, $connexion);
    $infosujet=get_infosujet($idsujet);
    if(is_object($infosujet)) {
        $query="DELETE FROM `f_readforum` WHERE `idforum`='$infosujet->idforum'";
        ExecRequete ($query, $connexion);
    }
}

/**
 * Fonction doforum_postmessage
 * @param mixed $sujet
 * @param mixed $corps
 * @param mixed $idforum
 * @param mixed $idsujet
 * @param mixed $edit
 * @param mixed $idmessage
 */
function doforum_postmessage($sujet,$corps,$idforum,$idsujet=0,$edit=0,$idmessage=0)
{
    global $internaute;
    if(!is_object($internaute)) return lang(259);
    $infoforum=get_infoforum($idforum);

    if(!forum_peutposter($internaute->idcompte,$idforum))
        return lang(259);
    if(getcptpost()>date("U")-INTERVAL_POST_FORUM)
        return msgtab(lang(263),lang(262));
    $nouvsujet=false;
    if($idsujet==0)
    {
        $nouvsujet=true;
        if(strlen(trim((string)$sujet))==0)
            return msgtab(lang(267),lang(256)).forum_postmessage($idforum,$idsujet,0,$corps);
    } else {
        $infosujet=get_infosujet($idsujet);
        if(!is_object($infosujet) || $infosujet->idforum!=$idforum)
            return lang(259);
    }

    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    if($edit)
    {
        $mess=get_infomessage($idmessage);
        if(!forum_peut_editer($mess,$infoforum))
            return "";
        $idmesssujet=forum_getidmessagesujet($idsujet);
        if($idmesssujet==$idmessage)
        {
            $query="UPDATE `f_sujet` SET `txtsujet` = '$sujet' WHERE `idsujet` = '$idsujet' ";
            ExecRequete ($query, $connexion);
        }
        $query="UPDATE `f_corps` SET `contenu` = '$corps' WHERE `idmessage` = '$idmessage'";
        ExecRequete ($query, $connexion);
        $corptab=lang(269)."<br><br>".html_lien(lang(265),"do=showlstsujets&idforum=$idforum")."<br><br>".html_lien(lang(266),"do=showlstposts&idsujet=$idsujet&last=1#last");
    } else {
        if($nouvsujet)
        {
            $query="INSERT INTO `f_sujet`
        ( `idforum` , `idcompteauteur` , `s_nbmessages` , `txtsujet` , `idlastmessage` , `nblectures` )
        VALUES ( '$idforum', '$internaute->idcompte', '0', '$sujet', '0', '0')";
            ExecRequete ($query, $connexion);
            $idsujet=$connexion->lastInsertId();
        }

        setsujetpaslu($idsujet);
        $query="INSERT INTO `f_message` (`idsujet`, `datepost`, `idcompte`) VALUES ('$idsujet', UNIX_TIMESTAMP(), '$internaute->idcompte')";
        ExecRequete ($query, $connexion);
        $nummess=$connexion->lastInsertId();

        $query="INSERT INTO `f_corps` ( `idmessage` , `contenu` ) VALUES ('$nummess', '$corps')";
        ExecRequete ($query, $connexion);

        $query="UPDATE f_forum ff SET idlastmessage='$nummess'".retiftrue(",`nbsujets`=`nbsujets`+1",$nouvsujet).",`nbmessages`=`nbmessages`+1 WHERE ff.idforum='$idforum'";
        ExecRequete ($query, $connexion);
        $query="UPDATE f_sujet fsu SET idlastmessage='$nummess'".retiftrue(",`s_nbmessages`=`s_nbmessages`+1",!$nouvsujet)." WHERE fsu.idsujet='$idsujet'";
        ExecRequete ($query, $connexion);
        updatecptpost();
        forum_inc_joueur_nbposts($internaute->idcompte);
        $corptab=lang(264)."<br><br>".html_lien(lang(265),"do=showlstsujets&idforum=$idforum")."<br><br>".html_lien(lang(266),"do=showlstposts&idsujet=$idsujet&last=1#last");
    }
    return msgtab($corptab,lang(171));
}

/**
 * Fonction forum_giveforumtogroups
 */
function forum_giveforumtogroups()
{
    $query = "SELECT * FROM groupe WHERE idforum='0'";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete ($query, $connexion);
    while($ligne=LigneSuivante($run_query))
    {
        $idforum=forum_newgroupeforum(addslashes($ligne->initialgroupe));
        $query = "UPDATE groupe SET `idforum`='$idforum' WHERE idgroupe='$ligne->idgroupe'";
        ExecRequete ($query, $connexion);
    }
}

/**
 * Fonction incarnerjoueur
 * @param mixed $idcomptejoueur
 */
function incarnerjoueur($idcomptejoueur)
{
    global $internaute;
    if(!is_object($internaute)) return;
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE `session` SET `idcompte` = '$idcomptejoueur' WHERE `idcompte` = '$internaute->idcompte'";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction deactivateweekstats
 * @param mixed $idjoueur
 */
function deactivateweekstats($idjoueur)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE compte SET `mailweekly` = '0' where idcompte='$idjoueur'";
    ExecRequete ($query, $connexion);
}

/**
 * Fonction deactivatedaystats
 * @param mixed $idjoueur
 */
function deactivatedaystats($idjoueur)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $query="UPDATE compte SET `maildaily` = '0' where idcompte='$idjoueur'";
    ExecRequete ($query, $connexion);
}
?>