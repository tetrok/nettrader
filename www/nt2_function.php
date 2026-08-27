<?php

/**
 * Fichier: nt2_function.php
 * Ce fichier contient les fonctions suivantes :
 * - tabvaleurouzero
 * - affichpseudo
 * - affichgroupe
 * - msgtab
 * - compareclass
 * - sign
 * - getvaleur
 * - traiteeuronextcsv
 * - traiteyahoocsv
 * - traitehtmlsicav
 * - ansgetvaleur
 * - leading_zero
 * - updateplayersicav
 * - echotabadmin
 * - sorttableau
 * - barrepage
 * - tempsjeu
 * - updaterecompensegroupes
 * - checkscore
 * - updatenomsicav
 * - getnbactionmax
 * - gettaxe
 * - getmontantvadpossible
 * - get_refresh
 * - updatelistsicav
 * - cmd_to_update_liste
 * - cmd_downhisto
 * - cmd_euronextdownvaleur
 * - cmd_downvaleur
 * - cmd_nodownvaleur
 * - cmd_setvaleur
 * - tomoisfr
 * - numlimit
 * - finjour
 * - openform
 * - classtohtmlcolor
 * - couleurfonctionclasse
 * - htmlourien
 * - lnkachat
 * - lnkvente
 * - html_lien
 * - getnewurl
 * - getsigne
 * - tabordre
 * - lienordre
 * - bbtohtml
 * - estadmingroupe
 * - estmembregroupe
 * - getidgroupe
 * - envoimail
 * - retiftrue
 * - majstats
 * - print_reward
 * - forum_peut_editer
 * - geturlaide
 */

/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/

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

function tabvaleurouzero($tableau,$valeur)
{
    if(is_array($tableau) && array_key_exists($valeur,$tableau))
        return $tableau[$valeur];
    else
        return 0;
}

/**
 * Fonction affichpseudo
 * @param mixed $idcompte
 * @param mixed $pseudo
 */
function affichpseudo($idcompte,$pseudo)
{
    return $pseudo;
}

/**
 * Fonction affichgroupe
 * @param mixed $idgroupe
 * @param mixed $nomgroupe
 */
function affichgroupe($idgroupe,$nomgroupe)
{
    return $nomgroupe;
}

/**
 * Fonction msgtab
 * @param mixed $message
 * @param mixed $titre
 */
function msgtab($message,$titre)
{
    return "<br>".opentab("align=\"center\" width=\"90%\"").openligne("","titre").opencol().$titre.closecol().closeligne().openligne().opencol().$message.closecol().closeligne().closetab()."<br>";
}

/**
 * Fonction compareclass
 * @param mixed $nom1
 * @param mixed $nom2
 */
function compareclass($nom1,$nom2)
{
    if(strtoupper($nom1) == strtoupper($nom2))
        return true;
    else
        return false;
}

/**
 * Fonction sign
 * @param mixed $val
 */
function sign($val)
{
    if($val != 0) return ($val / abs($val));
    else return 0;
}

/**
 * Fonction getvaleur
 * @param mixed $sico
 * @param mixed $nouv
 */
function getvaleur($sico,$nouv=0)
{   
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $resultat = ExecRequete("SELECT valeur FROM cacval WHERE codesico = '$sico'",$connexion);
    $lastval = 0;
    if($resultat)
    {
        while($r = $resultat->fetch(PDO::FETCH_BOTH))
        {
            $lastval = $r["valeur"];
            return $lastval;
        }
    }
    return $lastval;
}

/**
 * Fonction traiteeuronextcsv
 * @param mixed $lines
 */
function traiteeuronextcsv($lines)
{
    // Obsolète: géré par pythonfetch/pynt2markdown.py avec yfinance
    return "";
}

/**
 * Fonction traiteyahoocsv
 * @param mixed $lines
 */
function traiteyahoocsv($lines)
{
    // Obsolète: géré par pythonfetch/pynt2markdown.py avec yfinance
    return "";
}

/**
 * Fonction traitehtmlsicav
 * @param mixed $lines
 * @param mixed $sico
 */
function traitehtmlsicav($lines,$sico = 0)
{
    if(!tempsjeu() || !is_array($lines))
    {
        return "";
    }
    if($sico > 0)
    {
        $sico = getyahooname($sico);
    }
    $maintenant = date("U");
    $patterns = ["/'/", '/"/', '/\\\"/'];
    $replacements = ["\'", '', ''];
    list($chour, $cmin, $csec, $cday, $cmon, $cyr) = explode(" ",date("H i s d m y"));

    $source = [];
    $cnt = is_array($lines) ? count($lines) : 0;
    for ($i = 0; $i < $cnt; $i++)
    {
        $line_clean = preg_replace($patterns, $replacements, $lines[$i]);
        if (preg_match("#([^.]*)\.([A-Z]{2}),([^,]*),([^,]*),([^0-9]*)([0-9]{1,2}):([0-9]{1,2})([A-Z]{2})#", $line_clean, $regs))
        {
            $sourcecode = $regs[1].".".$regs[2];
            $valeur = str_replace(",", ".", $regs[4] ?? '');
            $heure = $regs[6] + 6;
            $minute = $regs[7];
            if($regs[8] == "PM")
                $heure += 12;
            $unixtime = mktime($heure, $minute, 0, $cmon, $cday, $cyr);
            $source[$sourcecode] = ["valeur" => $valeur, "unixtime" => $unixtime];
        }
    }
    ksort($source, 0);

    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $resultat = ExecRequete("SELECT * FROM cacval WHERE down='1' ORDER BY codesico ASC",$connexion);
    $destination = [];
    $stat = [];
    if($resultat)
    {
        while($r = $resultat->fetch(PDO::FETCH_BOTH))
        {
            $destination[$r["yahooname"]] = ["valeur" => $r["valeur"], "unixtime" => $r["lasttime"]];
            $stat[$r["yahooname"]] = ["codesico" => $r["codesico"], "lasttime" => $r["lasttime"], "lasttimedown" => $r["lasttimedown"]];
        }
    }

    $chaineupdate = "";
    $mintimeupdate = 9999999999;
    $updates = 0;
    $grpupdate = 0;
    foreach($source as $cle => $tabval)
    {
        if(array_key_exists($cle, $destination))
        {
            if($tabval["valeur"] != $destination[$cle]["valeur"])
            {
                if($tabval["valeur"] > 0 && abs($tabval["valeur"] - $destination[$cle]["valeur"]) / $tabval["valeur"] >= .25 && $destination[$cle]["valeur"] != 0)
                {
                    $corps = "L'action yahooname=$cle a changé de 25% (de ".$destination[$cle]["valeur"]." à ".$tabval["valeur"]." ), aller sur la page d'admin pour réactiver si il n'y a pas de multiplication ou division d'action.";
                    envoimail(EMAILADMIN,"NetTrader, valeur se modifie de 25% !",$corps);
                    ExecRequete("UPDATE cacval SET down='0' WHERE yahooname='$cle'",$connexion);
                }
                ExecRequete("UPDATE cacval SET valeur='".$tabval["valeur"]."', lasttime='".$tabval["unixtime"]."', lasttimedown='$maintenant' WHERE yahooname='$cle'",$connexion);
                if(defined('DATEFINSTATS') && date("U") < DATEFINSTATS) ExecRequete("INSERT INTO `statmaj` ( `idstat` , `codesico` , `lasttime_ans` , `lasttimedown_ans` , `lasttime_nouv` , `lasttimedown_nouv` ) VALUES ('', '".$stat[$cle]["codesico"]."', '".$stat[$cle]["lasttime"]."', '".$stat[$cle]["lasttimedown"]."', '".$tabval["unixtime"]."', UNIX_TIMESTAMP( ));",$connexion);
                $updates++;
            }
        }
    }

    if($chaineupdate != "")
    {
        ExecRequete("UPDATE cacval SET lasttime='$mintimeupdate', lasttimedown='$maintenant' WHERE yahooname IN ($chaineupdate)",$connexion);
    }

    echoadmin(" $updates updates $grpupdate updates de groupe");

    $valsicav = 0;
    if($sico != 0)
    {
        if(array_key_exists($sico, $source))
        {
            $valsicav = $source[$sico]["valeur"];
        } else {
            echoadmin("Erreur téléchargement action $sico .");
            exit();
        }
    }
    return $valsicav;
}

/**
 * Fonction ansgetvaleur
 * @param mixed $sico
 * @param mixed $nouv
 */
function ansgetvaleur($sico,$nouv=0)
{   
    echoadmin("/($sico)");
    $sicodown = leading_zero($sico, 6, 0);
    $letimestamp = get_refresh();
    $datesql = $letimestamp->datesql;
    $datedown = $letimestamp->datedown;

    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $resultat = ExecRequete("SELECT valeur FROM cacval WHERE codesico = '$sico' AND (lasttime > '$datesql' OR lasttimedown > '$datedown')",$connexion);
    if($resultat)
    {
        while($r = $resultat->fetch(PDO::FETCH_BOTH))
        {
            return $r["valeur"];
        }
    }

    $fd = @fopen(ADDRDEB."$sicodown", "r");
    if(!$fd) return 0;

    $lines = [];
    while (!feof($fd)) 
    {
        $buffer = fgets($fd, 4096);
        $lines[] = $buffer;
    }
    fclose($fd);

    $NomSico = "";
    $valsicav = "";
    $UnixStampTime = 0;
    $cnt = is_array($lines) ? count($lines) : 0;
    for ($i = 0; $i < $cnt; $i++)
    {
        if(strpos((string)$lines[$i], 'name=') !== false)
        {
            if (preg_match("/name=(.*)/", $lines[$i], $regs))
            {
                $NomSico = sec($regs[1]);
            }
        }
        if(strpos((string)$lines[$i], 'title') !== false)
        {
            if (preg_match("/title=([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/", $lines[$i], $regs))
            {
                $yr = $regs[3];
                $mon = $regs[2];
                $day = $regs[1];
            }
        }
        if(strpos((string)$lines[$i], 'EndData') !== false && isset($lines[$i-1]))
        {
            $exploded_ligne = ($lines[$i-1] !== null) ? explode(" ", $lines[$i-1]) : array();
            $valsicav = isset($exploded_ligne[1]) ? $exploded_ligne[1] : 0;
            if (isset($exploded_ligne[0]) && preg_match("/([0-9]{2})([0-9]{2})([0-9]{2})/", $exploded_ligne[0], $regs))
            {
                $hours = $regs[1];
                $min = $regs[2];
                $sec = $regs[3];
                if(isset($mon, $day, $yr)) {
                    $UnixStampTime = mktime($hours, $min, $sec, $mon, $day, $yr);
                }
            }
        }
    }

    $maintenant = date("U");
    if($nouv == 0)
    {
        if($valsicav != "" && $UnixStampTime != "" && $sico != "")
        {
            ExecRequete("UPDATE cacval SET valeur=$valsicav, lasttime=$UnixStampTime, lasttimedown=$maintenant WHERE codesico=$sico",$connexion);
        }
    } else {
        delete_sicav($sico);
        ExecRequete("INSERT INTO `cacval` (`codesico`, `nom`, `valeur`, `lasttime`, `lasttimedown`) VALUES ('$sico', '$NomSico', '$valsicav', '$UnixStampTime', '$maintenant')",$connexion);
    } 

    return $valsicav;
}

/**
 * Fonction leading_zero
 * @param mixed $aNumber
 * @param mixed $intPart
 * @param mixed $floatPart
 * @param mixed $dec_point
 * @param mixed $thousands_sep
 */
function leading_zero($aNumber, $intPart, $floatPart=NULL, $dec_point=NULL, $thousands_sep=NULL) 
{
    $formattedNumber = $aNumber;
    if (!$floatPart === null) {
        $formattedNumber = number_format($formattedNumber, $floatPart, $dec_point, $thousands_sep);
    }
    $len = strlen(strval(floor(floatval($formattedNumber))));
    if ($intPart > $len) {
        $formattedNumber = str_repeat("0", $intPart - $len) . $formattedNumber;
    }
    return $formattedNumber;
}

/**
 * Fonction updateplayersicav
 */
function updateplayersicav()
{
    global $tempsdebexec,$do,$internaute,$notupdated;
    $id_compte = (is_object($internaute) && isset($internaute->idcompte)) ? $internaute->idcompte : 0;
    if($notupdated == 1 && $id_compte > 0)
    {
        $liste = joueur_liste_sicav($id_compte);
    } else {
        $liste = "";
    }

    if(empty($liste) || !is_array($liste)) { return 1; }
    foreach ($liste as $key => $value)
    {
        $tempsexec = round(getmicrotime() - $tempsdebexec, 2);
        if($tempsexec < 5)
        {
            getvaleur($value["codesicav"]);
            echoadmin("(".$tempsexec.")");     
        } else {
            return "<head><meta http-equiv=\"Refresh\" content=\"2;url=index.php?do=$do\"></head>Veuillez patienter ...";
        }
    }
    return 1;
}

/**
 * Fonction echotabadmin
 * @param mixed $tab
 */
function echotabadmin($tab)
{
    global $internaute;
    if(is_object($internaute) && isset($internaute->idcompte) && $internaute->idcompte == 1)
    {
        echo "<pre>";
        print_r($tab);
        echo "</pre>";
    }
    return 1;
}

/**
 * Fonction sorttableau
 * @param mixed $resultat
 * @param mixed $titre
 * @param mixed $largeur
 */
function sorttableau($resultat,$titre,$largeur="90")
{
    $html = "";
    if($resultat)
    {
        $qte = $resultat->columnCount();
        $html = opentab(" align=center width=\"$largeur%\" ");
        $html .= openligne("","titre2").opencol("colspan=\"$qte\"").$titre.closecol().closeligne();  
        $html .= openligne("","titre");
        for ($i=0; $i<$qte; $i++)
        {
            $html .= opencol();
            $meta = $resultat->getColumnMeta($i);
            $html .= $meta ? $meta['name'] : '';
            $html .= closecol();
        }
        $html .= closeligne();
        
        while ($row = $resultat->fetch(PDO::FETCH_ASSOC))
        {
            $html .= openligne();
            foreach ($row as $elem)
            {
                $html .= opencol().stripslashes($elem).closecol();
            }
            $html .= closeligne();
        }
        $html .= closetab();
    }
    return $html;
}

/**
 * Fonction barrepage
 * @param mixed $nblignes
 * @param mixed $ligneparpage
 * @param mixed $lignecourante
 * @param mixed $add
 */
function barrepage($nblignes,$ligneparpage,$lignecourante,$add="")
{
    global $do;
    if($ligneparpage <= 0) $ligneparpage = 20;
    $nbpage = ceil($nblignes / $ligneparpage);
    $html = "<center>";
    $pageouverte = ceil($lignecourante / $ligneparpage);
    $limitebasse = $pageouverte - 8;
    $limitehaute = $pageouverte + 8 + retiftrue(abs($limitebasse), $limitebasse < 0, 0);
    $pause = false;
    for ($i = 1; $i <= $nbpage; $i++)
    {
        if($nbpage <= 20 || $i == 1 || $i == $nbpage || ($i > $limitebasse && $i <= $pageouverte) || ($i >= $pageouverte && $i <= $limitehaute))
        {
            if($i != 1 && !$pause)
            {
                $html .= " - ";
            }
            $pause = false;
            if($lignecourante > ($i * $ligneparpage) - $ligneparpage - 1 && $lignecourante <= ($i * $ligneparpage) - 1)
            {
                $html .= $i;
            } else {
                $html .= html_lien($i, getnewurl("numligne", $i * $ligneparpage - $ligneparpage));
            }
        } else {
            if(!$pause)
                $html .= " ... ";
            $pause = true;
        }
    }
    $html .= "</center>";
    return $html;
}

/**
 * Fonction tempsjeu
 */
function tempsjeu()
{
    global $internaute;
    $maintenant = date("U");
    $deb = defined('DEBCONC') ? DEBCONC : 0;
    $fin = defined('FINCONC') ? FINCONC : 0;
    $id_compte = (is_object($internaute) && isset($internaute->idcompte)) ? $internaute->idcompte : 0;
    if(($maintenant > $deb && $maintenant < $fin) || $id_compte == 1)
    {
        return true;
    } else {
        return false;
    }
}

/**
 * Fonction updaterecompensegroupes
 */
function updaterecompensegroupes()
{
    $res = getperfgroupes();
    $i = 0;
    if($res)
    {
        while($ligne = LigneSuivante($res))
        {
            $i++;
            if($i == 1)
            {
                increcompensegroupe($ligne->idgroupe, 1, 0, 0);
            }
            elseif($i == 2)
            {
                increcompensegroupe($ligne->idgroupe, 0, 1, 0);
            }
            elseif($i == 3)
            {
                increcompensegroupe($ligne->idgroupe, 0, 0, 1);
                break;
            }
        }
    }
}

/**
 * Fonction checkscore
 */
function checkscore()
{
    if(!(scoreestactuel()))
    {
        insertscore();
        effacvieuxscores();
        majlistmoisclass();
    }
    if(!teamscoreestactuel())
    {
        insertgroupescore();
        updaterecompensegroupes();
    }
    return 1;
}

/**
 * Fonction updatenomsicav
 */
function updatenomsicav()
{
    global $tempsdebexec,$do;
    $liste = listvaleur();
    if(empty($liste) || !is_array($liste)) { return 1; }
    foreach ($liste as $key => $value)
    {
        $tempsexec = round(getmicrotime() - $tempsdebexec, 2);
        if($tempsexec < 5)
        {
            getvaleur($value["codesicav"]);
            echoadmin("(".$tempsexec.")");     
        } else {
            return "<head><meta http-equiv=\"Refresh\" content=\"2;url=index.php?do=$do\"></head>Veuillez patienter ...";
        }
    }
    return 1;
}

/**
 * Fonction getnbactionmax
 * @param mixed $cashback
 * @param mixed $valeursicav
 */
function getnbactionmax($cashback,$valeursicav)
{
    if($valeursicav == 0)
        return 0;
    $NbActionMax = floor((0.99642482771815 * $cashback) / $valeursicav);
    if($cashback < 4.95 + $valeursicav)
    {
        $NbActionMax = 0;
    }
    return $NbActionMax;
}

/**
 * Fonction gettaxe
 * @param mixed $valeursicav
 * @param mixed $nombre
 */
function gettaxe($valeursicav,$nombre)
{
    $taxe = Round(($nombre * $valeursicav) * 0.0030 * (1 + 0.196), 2);
    if($taxe < 4.95)
    {
        $taxe = 4.95;
    }
    return $taxe;
}

/**
 * Fonction getmontantvadpossible
 * @param mixed $idcompte
 */
function getmontantvadpossible($idcompte)
{
    $capitalhorsvad = getplayercapitalhorsvad($idcompte);
    $capitalvad = getplayercapitalvad($idcompte);
    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $joueur = ChercheInternaute($idcompte, $connexion);
    $cashback = (is_object($joueur) && isset($joueur->cashback)) ? $joueur->cashback : 0;
    $limitevad = ($cashback - $capitalvad) * 1 + $capitalhorsvad * 1;
    $limitevadpossible = $limitevad - $capitalvad;

    if($limitevadpossible < 0) $limitevadpossible = 0;

    return $limitevadpossible;
}

/**
 * Fonction get_refresh
 */
function get_refresh()
{
    $maintenant = date("U");
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $date1 = $maintenant - (20*60);
    $date2 = $maintenant - (2*60);
    $date3 = mktime(18, 0, 0, $mon, $day-1, $yr);
    $date4 = mktime(18, 0, 0, $mon, $day-2, $yr);
    $date5 = 9999999999;
    $date6 = mktime(18, 0, 0, $mon, $day-3, $yr);
    $date7 = mktime(18, 0, 0, $mon, $day, $yr);

    if(date("w",$maintenant) > 0 && date("w",$maintenant) < 6)
    {
        if(date("H",$maintenant) > 9 && date("H",$maintenant) < 18)
        {
            $datesql = $date1;
            $datedown = $date2;
        } else {
            if(date("H",$maintenant) > 9)
            {
                $datesql = $date5;
                $datedown = $date7;
            } else {
                $datesql = $date5;
                if(date("w",$maintenant) == 1)
                {
                    $datedown = $date6;
                } else {
                    $datedown = $date3;
                }           
            }
        }
    } else {
        if(date("w",$maintenant) == 6)
        {
            $datesql = $date5;
            $datedown = $date3;
        } else {
            $datesql = $date5;
            $datedown = $date4;
        }
    }

    $retour = new stdClass();
    if(tempsjeu())
    {
        $retour->datesql = $datesql;
        $retour->datedown = $datedown;
    } else {
        $retour->datesql = 0;
        $retour->datedown = 0;
    }
    return $retour;
}

/**
 * Fonction updatelistsicav
 * @param mixed $liste
 */
function updatelistsicav($liste)
{
    if(!empty($liste))
    {
        cmd_downvaleur();
    }
    return 1;
}

/**
 * Fonction cmd_to_update_liste
 */
function cmd_to_update_liste()
{
    $liste = joueur_liste_sicav("", 1*60);
    $return = "";
    if(!empty($liste) && is_array($liste))
    {
        $i = 0;
        foreach ($liste as $key => $value)
        {
            if($i != 0)
            {
                $return .= ";";
            }
            $return .= leading_zero($value["codesicav"], 6, 0);
            $i++;
        }
    }
    return "OK||".get_nextrefresh()."|".ADDRDEB."|".ADDRFIN;
}

/**
 * Fonction cmd_downhisto
 */
function cmd_downhisto()
{
    $lstvaleurtodown = get_sicavdown();
    $chaineurl = "";
    $compteur = 0;
    $lines = [];
    $cnt = is_array($lstvaleurtodown) ? count($lstvaleurtodown) : 0;
    for($i = 0; $i <= $cnt-1; $i++)
    {
        $compteur++;
        if($chaineurl != "")
            $chaineurl .= "+";
        $chaineurl .= $lstvaleurtodown[$i]["yahooname"];
        if($compteur == 1 || $i == $cnt-1)
        {
            $chaineurl = "";
            $compteur = 0;
        }
    }
    return "";
}

/**
 * Fonction cmd_euronextdownvaleur
 */
function cmd_euronextdownvaleur()
{
    $fd = @fopen(ADDREURONEXT, "r");
    if(!$fd) return "";

    $lines = [];
    while (!feof($fd))
    {
        $buffer = fgets($fd, 4096);
        $lines[] = $buffer;
    }
    fclose($fd);
    return traiteeuronextcsv($lines);
}

/**
 * Fonction cmd_downvaleur
 */
function cmd_downvaleur()
{
    // Obsolète: géré par pythonfetch/pynt2markdown.py avec yfinance
    return "";
}

/**
 * Fonction cmd_nodownvaleur
 * @param mixed $donnes
 */
function cmd_nodownvaleur($donnes)
{
    sauveipadress($_SERVER['REMOTE_ADDR']);
    $lines = ($donnes !== null) ? explode("\r\n", $donnes) : array();
    $sublines = [];
    $cnt = is_array($lines) ? count($lines) : 0;
    for($i = 0; $i <= $cnt-1; $i++)
    {
        if (strpos((string)$lines[$i], ',') !== false)
        {
            $sublines[] = $lines[$i];
        }
    }
    traitehtmlsicav($sublines, 0);
    return "";
}

/**
 * Fonction cmd_setvaleur
 * @param mixed $codesico
 * @param mixed $valeur
 * @param mixed $ladate
 * @param mixed $lheure
 */
function cmd_setvaleur($codesico,$valeur,$ladate,$lheure)
{
    $sico_list = ($codesico !== null) ? explode('|', (string)$codesico) : array();
    $valeur_list = ($valeur !== null) ? explode('|', (string)$valeur) : array();
    $date_list = ($ladate !== null) ? explode('|', (string)$ladate) : array();
    $heure_list = ($lheure !== null) ? explode('|', (string)$lheure) : array();
    if(!is_array($sico_list) || !is_array($valeur_list) || count($sico_list) != count($valeur_list) || count($valeur_list) != count($date_list) || count($date_list) != count($heure_list))
    {
        return "OK Nombre d'element incompatible|120";
    }
    $return = "";
    $cnt = is_array($sico_list) ? count($sico_list) : 0;
    for ($i = 0; $i < $cnt; $i++)
    {
        $ladate = $date_list[$i];
        $lheure = $heure_list[$i];
        $codesico = $sico_list[$i];
        $valeur = $valeur_list[$i];
        
        $return .= "\r\nSico:\t".$codesico."\t Valeur:\t".$valeur."\t Date,Heure:\t".$ladate.",".$lheure;
        $lasttimedown = date("U");
        if (preg_match("/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/", $ladate, $regs))
        {
            $yr = $regs[3];
            $mon = $regs[2];
            $day = $regs[1];
        } else {
            return "OK Format de date invalide : $ladate|120";
        }
        if (preg_match("/([0-9]{2})([0-9]{2})([0-9]{2})/", $lheure, $regs))
        {
            $hours = $regs[1];
            $min = $regs[2];
            $sec = $regs[3];
        } else {
            return "OK Format d'heure invalide : $lheure|120";
        }
        $lasttime = mktime($hours, $min, $sec, $mon, $day, $yr);
        if($lasttime > $lasttimedown)
        {
            return "OK date de téléchargement supérieur à maintenant|120";
        }
        cmd_update_sicav($codesico, $valeur, $lasttime, $lasttimedown);
    }

    return "OK|".get_nextrefresh();  
}

/**
 * Fonction tomoisfr
 * @param mixed $mois
 */
function tomoisfr($mois)
{
    $mois_fr = [
        "01" => "Janvier", "02" => "Fevrier", "03" => "Mars",
        "04" => "Avril",   "05" => "Mai",     "06" => "Juin",
        "07" => "Juillet", "08" => "Aout",    "09" => "Septembre",
        "10" => "Octobre", "11" => "Novembre","12" => "Decembre"
    ];
    return isset($mois_fr[$mois]) ? $mois_fr[$mois] : $mois;
}

/**
 * Fonction numlimit
 * @param mixed $courant
 * @param mixed $max
 * @param mixed $diff
 */
function numlimit($courant,$max,$diff)
{
    if($courant + $diff > $max)
    {
        $retour = $max;
    } else {
        if($courant + $diff < 0)
        {
            $retour = 0;
        } else {
            $retour = $courant + $diff;
        }
    }
    return $retour;
}

/**
 * Fonction finjour
 */
function finjour()
{
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));
    $p = 0;
    if(date("w") == 0 || (date("H") >= 18 && date("w") >= 1 && date("w") <= 4))
    {
        $p = 1;
    }
    if(date("w") == 6)
    {
        $p = 2;
    }
    if(date("w") == 5 && date("H") >= 18)
    {
        $p = 3;
    }
    $date1 = mktime(18, 0, 0, $mon, $day + $p, $yr);
    return date("d/m/Y H:i", $date1);
}

/**
 * Fonction openform
 * @param mixed $do
 * @param mixed $othervar
 */
function openform($do,$othervar="")
{
    return "<form method=\"post\" action=\"index.php?do=$do $othervar\">";
}

/**
 * Fonction classtohtmlcolor
 * @param mixed $classement
 * @param mixed $tot
 */
function classtohtmlcolor($classement,$tot)
{
    if($tot)
        $base = dechex(intval(256 * (1 - ($classement / $tot))));
    else
        $base = "00";
    return "#".str_repeat($base, 3);
}

/**
 * Fonction couleurfonctionclasse
 * @param mixed $tab
 */
function couleurfonctionclasse($tab)
{
    $tabs = [];
    if(!is_array($tab)) return $tabs;
    $nb = is_array($tab) ? count($tab) : 0;
    asort($tab);
    $c = 1;
    foreach($tab as $k => $v)
    {
        $tabs[$k] = classtohtmlcolor($c++, $nb);
    }
    return $tabs;
}

/**
 * Fonction htmlourien
 * @param mixed $htmlcolor
 */
function htmlourien($htmlcolor)
{
    if(!$htmlcolor)
        return "#FFFFFF";
    else
        return $htmlcolor;
}

/**
 * Fonction lnkachat
 * @param mixed $codesico
 */
function lnkachat($codesico)
{
    $ads_kw = defined('ADSENSEKEYWORD') ? ADSENSEKEYWORD : '';
    return "index.php?do=formachatvente&info=$ads_kw&sicavselachat=$codesico";
}

/**
 * Fonction lnkvente
 * @param mixed $codesico
 * @param mixed $val
 * @param mixed $texte
 */
function lnkvente($codesico,$val=1,$texte="")
{
    $ads_kw = defined('ADSENSEKEYWORD') ? ADSENSEKEYWORD : '';
    if($val)
        return "<a href=\"index.php?do=formachatvente&info=$ads_kw&sicavselvendr=$codesico\">$texte</a>";
    else
        return "$texte";
}

/**
 * Fonction html_lien
 * @param mixed $texte
 * @param mixed $donnees
 */
function html_lien($texte,$donnees)
{
    return "<a href=\"index.php?$donnees\">$texte</a>";
}

/**
 * Fonction getnewurl
 * @param mixed $find
 * @param mixed $value
 * @param mixed $ansurl
 */
function getnewurl($find,$value,$ansurl="")
{
    if($ansurl == "")
        $url1 = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
    else
        $url1 = $ansurl;
    parse_str($url1, $output);

    if($value != "")
        $output[$find] = $value;
    else
        unset($output[$find]);

    $res = "";
    foreach($output as $k => $v)
    {
        if($v != "" && $k != "last")
        {
            if($res != "")
                $res .= "&";
            $res .= "$k=$v";
        }
    }
    return $res;
}

/**
 * Fonction getsigne
 * @param mixed $valeur
 */
function getsigne($valeur)
{
    if($valeur >= 0)
    {
        return 1;
    } else {
        return -1;
    }
}

/**
 * Fonction tabordre
 * @param mixed $table
 */
function tabordre($table)
{
    $champ = "";
    $ordre = "";
    if(array_key_exists("champ",$_GET)) $champ = $_GET['champ'];
    if(array_key_exists("ordre",$_GET)) $ordre = $_GET['ordre'];
    $champ = sec($champ);
    $ordre = sec($ordre);

    switch($table)
    {
    case "portef":
        switch($champ)
        {
        case "nomactionportef": $champordre = "nomsicav"; break;
        case "nombreportef":    $champordre = "nombsicav"; break;
        case "ansvaleur":       $champordre = "ansvaltotsicav"; break;
        case "valeuractportef": $champordre = "valtotsicav"; break;
        case "benefportef":     $champordre = "benefsicav"; break;
        default:                $champordre = "cacval.nom"; break;
        }
        break;
    case "lstactions":
        switch($champ)
        {
        case "partjoueur":
        case "part":            $champordre = "part"; break;
        case "valeuraction":    $champordre = "valeur"; break;
        case "nomaction":       $champordre = "nom"; break;
        default:                $champordre = "libellesecteur ASC , nom"; break;
        }
        break;
    case "historique":
        switch($champ)
        {
        case "datehisto":       $champordre = "LADATE"; break;
        case "nomhisto":        $champordre = "LENOM"; break;
        case "senshisto":       $champordre = "LESENS"; break;
        case "nombrehisto":     $champordre = "LENOMBRE"; break;
        case "valhthisto":      $champordre = "LETOTHT"; break;
        case "taxehisto":       $champordre = "LATAXE"; break;
        case "totalttchisto":   $champordre = "LETTC"; break;
        case "profithisto":     $champordre = "PROFITOP"; break;
        default:                $champordre = "LADATE"; $ordre = "d"; break;
        }
        break;
    case "classement":
        switch($champ)
        {
        case "pseudoclasse":     $champordre = "pseudonyme"; break;
        case "capitalclasse":    $champordre = "capital"; break;
        case "pourcbenefclasse": $champordre = "prog"; break;
        default:                 $champordre = "prog"; $ordre = "d"; break;
        }
        break;
    case "classementequipe":
        switch($champ)
        {
        case "nomequipeclasse":  $champordre = "titregroupe"; break;
        case "pourcbenefclasse": $champordre = "prog"; break;
        case "nbjoueursclasse":  $champordre = "nbjoueurs"; break;
        default:                 $champordre = "prog"; $ordre = "d"; break;
        }
        break;
    case "profilequipe":
        switch($champ)
        {
        case "Pseudonyme":   $champordre = "pseudonyme"; break;
        case "Dateinscr":    $champordre = "datejoint"; break;
        case "Capitalinscr": $champordre = "capitalinscr"; break;
        case "Portefeuille": $champordre = "capital"; break;
        case "Plusvalue":    $champordre = "prog"; break;
        default:             $champordre = "pseudonyme"; $ordre = "c"; break;
        }
        break;
    default:
        $champordre = "1";
        break;
    }
    if($ordre == "d")
        $champordre .= " DESC";
    else
        $champordre .= " ASC";

    return $champordre;
}

/**
 * Fonction lienordre
 * @param mixed $champ
 * @param mixed $titre
 */
function lienordre($champ,$titre)
{
    $champans = "";
    $ordreans = "";
    if(array_key_exists("champ",$_GET)) $champans = $_GET['champ'];
    if(array_key_exists("ordre",$_GET)) $ordreans = $_GET['ordre'];
    $champans = sec($champans);
    $ordreans = sec($ordreans);

    $nouvchamp = $champ;
    $nouvordre = "c";

    if($champans == $champ)
    {
        if($ordreans == "d") $nouvordre = "c";
        if($ordreans == "c") $nouvordre = "d";
    }

    $url = getnewurl("ordre", $nouvordre);
    $url = getnewurl("champ", $nouvchamp, $url);

    return "<a href=\"index.php?$url\">$titre</a>";
}

/**
 * Fonction bbtohtml
 * @param mixed $text
 */
function bbtohtml($text)
{
    global $skinrep;
    $bbcode = [
        "[list]", "[*]", "[/list]",
        "[img]", "[/img]",
        "[b]", "[/b]",
        "[u]", "[/u]",
        "[i]", "[/i]",
        '[color="', "[/color]",
        "[size=", "[/size]",
        '[url="', "[/url]",
        "[mail=\"", "[/mail]",
        "[code]", "[/code]",
        "[quote]", "[/quote]",
        '"]',
        ']',":D",":)",":(",":o ",":shock:",":? ","8)",":lol:",":x",":oops:",":cry:",":evil:",":roll:",":wink:",":!:",":?:",":idea:",":arrow:",":neutral:",":mrgreen:"
    ];
    $htmlcode = [
        "<ul>", "<li>", "</ul>",
        "<img src=\"", "\">",
        "<b>", "</b>",
        "<u>", "</u>",
        "<i>", "</i>",
        "<span style=\"color:", "</span>",
        "<span style=\"font-size:", "</span>",
        '<a href="', "</a>",
        "<a href=\"mailto:", "</a>",
        "<code>", "</code>",
        opentab(" width=100% ").openligne("","citation")."<td>", "</td></tr></table>",
        '">','">',
        "<img src=\"$skinrep/smiles/icon_biggrin.gif\" title=\"Very Happy\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_smile.gif\" title=\"Smile\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_sad.gif\" title=\"Sad\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_surprised.gif\" title=\"Surprised\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_eek.gif\" title=\"Shocked\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_confused.gif\" title=\"Confused\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_cool.gif\" title=\"Cool\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_lol.gif\" title=\"Laughing\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_mad.gif\" title=\"Mad\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_redface.gif\" title=\"Embarassed\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_cry.gif\" title=\"Crying or Very sad\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_evil.gif\" title=\"Evil or Very Mad\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_rolleyes.gif\" title=\"Rolling Eyes\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_wink.gif\" title=\"Wink\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_exclaim.gif\" title=\"Exclamation\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_question.gif\" title=\"Question\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_idea.gif\" title=\"Idea\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_arrow.gif\" title=\"Arrow\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_neutral.gif\" title=\"Neutral\" border=\"0\">",
        "<img src=\"$skinrep/smiles/icon_mrgreen.gif\" title=\"Mr. Green\" border=\"0\">"
    ];
    $newtext = str_replace($bbcode, $htmlcode, $text ?? '');
    return nl2br($newtext);
}

/**
 * Fonction estadmingroupe
 * @param mixed $idcompte
 * @param mixed $idgroupe
 */
function estadmingroupe($idcompte,$idgroupe=0)
{
    $ligne = getgroupbyadmin($idcompte);
    if(is_object($ligne) && ($ligne->idgroupe == $idgroupe || $idgroupe == 0))
    {
        return 1;
    } else {
        return 0;
    }
}

/**
 * Fonction estmembregroupe
 * @param mixed $idcompte
 */
function estmembregroupe($idcompte)
{
    $ligne = getgroupbymembre($idcompte);
    return is_object($ligne) ? 1 : 0;
}

/**
 * Fonction getidgroupe
 * @param mixed $idcompte
 */
function getidgroupe($idcompte)
{
    $ligne = getgroupbyadmin($idcompte);
    return is_object($ligne) ? $ligne->idgroupe : -1;
}

/**
 * Fonction envoimail
 * @param mixed $email
 * @param mixed $titre
 * @param mixed $corps
 */
function envoimail($email,$titre,$corps)
{
    $from_email  = defined('EMAILADMIN') ? EMAILADMIN : 'admin@localhost';
    $entetedate  = date("D, j M Y H:i:s -0600");
    $entetemail  = "From: $from_email \n";
    $entetemail .= "Reply-To: $from_email \n";
    $entetemail .= "X-Mailer: PHP/" . phpversion() . "\n";
    $entetemail .= "Date: $entetedate";
    $titre = "NetTrader : ".$titre;
    $corps .= "\n\n\n\nPour ne plus recevoir d'email provenant du site Nettrader veuillez vous désinscrire de nettrader par le site via le lien \"R.A.Z. joueur\" (immédiat : ".(defined('ADDRNT') ? ADDRNT : '')."/index.php?do=formrazjoueur ) ou contacter l'administrateur en répondant à ce mail.";
    if(isset($_SERVER['REMOTE_ADDR']) && $_SERVER['REMOTE_ADDR'] != "127.0.0.1")
        @mail($email, $titre, stripslashes($corps), stripslashes($entetemail));
    return 0;
}

/**
 * Fonction retiftrue
 * @param mixed $data
 * @param mixed $condition
 * @param mixed $else
 */
function retiftrue($data,$condition,$else="")
{
    if($condition)
        return $data;
    else
        return $else;
}

/**
 * Fonction majstats
 */
function majstats()
{
    $nbstats = getnbstats();
    if($nbstats > 0) {
        srand(intval(date("dm")));
        $numstat = rand(1, $nbstats);
        exepublicreq($numstat);
    }
}

/**
 * Fonction print_reward
 * @param mixed $medor
 * @param mixed $medargent
 * @param mixed $medbronze
 */
function print_reward($medor,$medargent,$medbronze)
{
    global $skinrep;
    return str_repeat("<IMG SRC=\"$skinrep/premier.png\" border=0>", intval($medor)) .
           str_repeat("<IMG SRC=\"$skinrep/deus.png\" border=0>", intval($medargent)) .
           str_repeat("<IMG SRC=\"$skinrep/tres.png\" border=0>", intval($medbronze));
}

/**
 * Fonction forum_peut_editer
 * @param mixed $lignemessage
 * @param mixed $infoforum
 */
function forum_peut_editer($lignemessage,$infoforum)
{
    global $internaute;
    if(!is_object($internaute) || !is_object($lignemessage)) return false;
    $id_compte = isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $auth_level = isset($internaute->authlevel) ? $internaute->authlevel : 0;
    return ($lignemessage->idcompte == $id_compte || $auth_level > 1);
}

/**
 * Fonction geturlaide
 * @param mixed $yahooname
 */
function geturlaide($yahooname)
{
    return "http://fr.finance.yahoo.com/echarts?s=$yahooname#symbol=$yahooname;range=1m";
}
?>