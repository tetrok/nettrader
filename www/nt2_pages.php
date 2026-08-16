<?php
/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/
function inclskr()
{
    include_once ("skin/default/include_interface.php");
    include_once ("const.php");
    include_once ("constbdd.php");
    include_once ("db_connect.php");
    include_once ("db_reqtableaux.php");
    include_once ("db_reqfunction.php");
    include_once ("nt2_function.php");
    include_once ("nt2_pages.php");
    return "";
}

function achatvente($sicavselecta,$sicavselectv)
{
    global $internaute;
    $liste = portefeuille_joueur();
    $return = "";
    $return .= opentab(" align=center width=\"100%\"","invi").openligne("","invi").opencol(" valign=top width=\"45%\"");
    $has_items = (is_array($liste) && count($liste) > 0);
    $is_vad = (is_object($internaute) && isset($internaute->vad) && $internaute->vad);
    if($has_items || $is_vad)
    {    
        $return .= formvente($sicavselectv,$liste).closecol().opencol(" width=\"10%\" ").closecol().opencol(" valign=top width=\"45%\"");
    }
    $return .= formachat($sicavselecta).closecol().closeligne().closetab();
    $return .= formlistaction($liste);
    $return .= "<br><br>";
    $return .= form_list_ordre();
    $return .= "<br><br>";
    $return .= "<br><center><br><a href=\"index.php?do=lstactions\">".openfont("titre1").lang(126).closefont()."</a></center><br>";

    return $return;
}

function formlistaction($liste)
{
    global $internaute,$skinrep;
    $echo = "";
    $affichagedate = "";
    $totalport = 0;
    $totalbenef = 0;
    $value = [];
    if(is_array($liste) && count($liste) > 0)
    {
        $echo = opentab(" align=center width=\"90%\"  ");
        $echo .= openligne("","titre2");
        $echo .= opencol("colspan=\"4\"");
        $echo .= lang(24)." :";
        $echo .= closecol();
        $echo .= opencol();
        $echo .= htm_iconhelp("formlistaction");
        $echo .= closecol();
        $echo .= closeligne();
        $echo .= openligne("","titre");
        $echo .= opencol();
        $echo .= "<b>".lienordre("nomactionportef",lang(15))."</b>";
        $echo .= closecol();
        $echo .= opencol();
        $echo .= "<b>".lienordre("nombreportef",lang(17))."</b>";
        $echo .= closecol();
        $echo .= opencol();
        $echo .= "<b>".lienordre("ansvaleur",lang(113))."</b>";
        $echo .= closecol();
        $echo .= opencol();
        $echo .= "<b>".lienordre("valeuractportef",lang(112))."</b>";
        $echo .= closecol();
        $echo .= opencol();
        $echo .= "<b>".lienordre("benefportef",lang(114))."(%)</b>";
        $echo .= closecol();
        $echo .= closeligne();
        foreach ($liste as $key => $value)
        {
            $echo .= openligne();
            $echo .= opencol();
            $echo .= htm_iconinfo($value["helpurl"],$value["nomsicav"])."&nbsp;&nbsp;".$value["nomsicav"];
            $echo .= closecol();
            $echo .= opencol();
            $echo .= $value["nombsicav"];
            $echo .= closecol();
            $echo .= opencol();
            $echo .= round($value["ansvaltotsicav"],2)." € ( ".$value["ansvalsicav"]." €)";
            $echo .= closecol();
            $echo .= opencol();
            $echo .= round($value["valtotsicav"],2)." € ( ".$value["valsicav"]." €)";
            $echo .= closecol();
            $echo .= opencol();
            $clr = "";
            if(round($value["benefsicav"],2) > 0)
            {
                $clr = "gain";
            }
            if(round($value["benefsicav"],2) < 0)
            {
                $clr = "perte";
            }
            $echo .= "<font class=\"$clr\">";
            $echo .= round($value["benefsicav"],2)." € ( ".round($value["pourcentsicav"],2)." %)";
            $echo .= "</font>";
            $echo .= closecol();
            $echo .= closeligne();
            $totalport += round($value["valtotsicav"],2);
            $totalbenef += round($value["benefsicav"],2);
            $affichagedate = date("j/m/y H:i",$value["laststamp"]);
        }
    } else {
        $echo .= "<center>".lang(8)."</center>";
        $echo .= "<br><br>".opentab(" align=center width=\"90%\"");
    }
    $echo .= openligne().opencol("colspan=\"3\" align=\"right\" ","titre")."<b>".lang(24)."</b> : ".closecol().opencol();
    $echo .= round($totalport,2)." €";
    $echo .= closecol().opencol();
    if($totalport != 0)
    {
        $clr = "";
        if($totalbenef > 0)
        {
            $clr = "gain";
        }
        if($totalbenef < 0)
        {
            $clr = "perte";
        }
        $echo .= "<font class=\"$clr\">";
        if(($totalbenef < 0 && $totalbenef/$totalport > 0) || ($totalbenef > 0 && $totalbenef/$totalport < 0))
            $pourcbenef = round(($totalbenef/($totalport-$totalbenef))*100,2)*-1;
        else
            $pourcbenef = round(($totalbenef/($totalport-$totalbenef))*100,2);
        $echo .= round($totalbenef,2)." € ( ".$pourcbenef." %)";
        $echo .= "</font>";
    } else {
        $echo .= "0 € ( 0 %)";
    }
    $echo .= closecol().closeligne();

    $cashback = (is_object($internaute) && isset($internaute->cashback)) ? $internaute->cashback : 0;
    $prog = isset($value["prog"]) ? round(floatval($value["prog"]),2) : 0;

    $echo .= openligne().opencol("colspan=\"3\" align=\"right\" ","titre")."<b>CashBack</b> :".closecol().opencol();
    $echo .= ($cashback)." €";
    $echo .= closecol().opencol();
    $echo .= "-";
    $echo .= closecol().closeligne();

    $echo .= openligne().opencol("colspan=\"3\" align=\"right\" ","titre")."<b>".lang(115)."</b> :".closecol().opencol();
    $echo .= ($cashback + round($totalport,2))." €";
    $echo .= closecol().opencol();
    $echo .= $prog." %";
    $echo .= closecol().closeligne().closetab();

    return $echo;
}

function dovente($idcompte,$sicav,$nombre,$dernvaleur)
{
    $sicav = sec($sicav);
    $nombre = sec($nombre);
    $possede = joueur_possede($sicav,$idcompte);
    $nivjoueur = niv_joueur($idcompte);
    $vad_autorise = (is_object($nivjoueur) && isset($nivjoueur->vad) && $nivjoueur->vad);
    $nombsicav = is_object($possede) ? intval($possede->nombsicav) : 0;

    if(!($nombsicav > 0) && !$vad_autorise)
    {
        return lang(3);
    }

    if(!$vad_autorise)
    {
        if($nombsicav < intval($nombre) || $nombre <= 0)
        {
            return lang(1).$nombsicav.lang(2);
        }
    } else {
        $quantpos = $nombsicav;
        if($quantpos < 0)
            $quantpos = 0;
        $nbactionsmax = getnbactionmax(getmontantvadpossible($idcompte),$dernvaleur) + $quantpos;
        if(intval($nbactionsmax) < intval($nombre) || $nombre <= 0)
        {
            return lang(1).intval($nbactionsmax).lang(2);
        }
    }

    $NvQuant = $nombsicav - $nombre;
    if(is_object($possede) && $possede->nombsicav)
    {
        ModifAction($idcompte,$sicav,$NvQuant,$dernvaleur);
    } else {
        AjoutPort($idcompte,$sicav,$NvQuant,$dernvaleur);
    }

    $acrediter = $nombre * $dernvaleur;
    $taxe = gettaxe($dernvaleur,$nombre);
    $acrediter = $acrediter - $taxe;
    ModifLiquide($idcompte,$acrediter);

    if($nombsicav > $nombre)
    {
        $quantvendu = $nombre;
    } else {
        if($nombsicav > 0)
        {
            $quantvendu = $nombsicav;
        } else {
            $quantvendu = 0;
        }
    }
    $ansvaleur = (is_object($possede) && isset($possede->ansvaleur)) ? $possede->ansvaleur : $dernvaleur;
    $tottaxes = $taxe + gettaxe($ansvaleur, $nombre);
    $profit = ($dernvaleur - $ansvaleur) * $quantvendu - $tottaxes;
    AddHistorique($idcompte,"Vente",$sicav,$nombre,$dernvaleur, -$taxe,$profit);

    return "OK";
}

function inscrjeu($pseudo, $nom, $prenom, $adresse, $cp, $ville, $tel, $mail, $etab, $niveau, $mailsemaine, $mailjour)
{
    if (defined('FINCONC') && date("U") >= FINCONC) {
        return lang(69);
    }

    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    
    // Vérification existence
    if (defined('INCONC') && INCONC) {
        $resultat = ExecRequete("SELECT pseudonyme, adresse FROM compte WHERE pseudonyme LIKE '$pseudo' OR adresse LIKE '$adresse'", $connexion);
        while ($r = $resultat->fetch(PDO::FETCH_BOTH)) {
            if (strtolower($r["adresse"]) == strtolower($adresse)) {
                return "Un seul compte par foyer autorisé, cette adresse est déjà utilisée par un autre joueur.";
            } else {
                return "Le pseudonyme saisi existe déjà, veuillez en entrer un différent.";
            }
        }
    } else {
        $resultat = ExecRequete("SELECT pseudonyme, email FROM compte WHERE pseudonyme LIKE '$pseudo' OR email='$mail'", $connexion);
        while ($r = $resultat->fetch(PDO::FETCH_OBJ)) {    
            if ($r->pseudonyme == $pseudo) {
                return lang(85);
            } else {
                return lang(92);
            }
        }
    }

    if (!($niveau > 0)) {
        return "Niveau incorrect";
    }
    if (trim($pseudo) == "" || !($mailsemaine == 0 || $mailsemaine == 1) || !($mailjour == 0 || $mailjour == 1)) {
        return lang(170);
    }

    $passe = substr(md5(getmicrotime()), 0, 5);
    $cryptpasse = md5($passe);
    $maintenant = date("U");
    $capdeb = defined('CAPDEB') ? CAPDEB : '10000';

    if (defined('INCONC') && INCONC) {
        $sql = "INSERT INTO `compte` (
            `pseudonyme`, `nom`, `prenom`, `passe`, `dateinscr`, 
            `adresse`, `cp`, `ville`, `tel`, `email`, 
            `etablissement`, `idniveau`, `cashback`, `lastpostaction`, `dateactivite`
        ) VALUES (
            '$pseudo', '$nom', '$prenom', '$cryptpasse', '$maintenant', 
            '$adresse', '$cp', '$ville', '$tel', '$mail', 
            '$etab', '$niveau', '$capdeb', '0', '$maintenant'
        )";
    } else {
        $sql = "INSERT INTO `compte` (
            `pseudonyme`, `nom`, `prenom`, `passe`, `dateinscr`, 
            `adresse`, `cp`, `ville`, `tel`, `email`, 
            `etablissement`, `idniveau`, `cashback`, `maildaily`, `mailweekly`, 
            `lastpostaction`, `dateactivite`
        ) VALUES (
            '$pseudo', '$nom', '$prenom', '$cryptpasse', '$maintenant', 
            '$adresse', '$cp', '$ville', '$tel', '$mail', 
            '$etab', '$niveau', '$capdeb', '$mailjour', '$mailsemaine', 
            '0', '$maintenant'
        )";
    }

    ExecRequete($sql, $connexion);

    // Envoi de l'email
    if (defined('INCONC') && INCONC) {    
        $corps = "<Message généré automatiquement>\n<CONSERVEZ CE MESSAGE>\n\n  Bienvenue à Transac'Challenge, \n\n Votre inscription a été prise en compte et vous pouvez dès maintenant jouer, voici les informations pour vous identifier:\n Login: $mail \n Mot de Passe: $passe\n\n Vous pouvez à tout moment modifier toutes vos informations via le site de NetTrader Transac'Challenge:\n " . (defined('ADDRNTTRANSAC') ? ADDRNTTRANSAC : '');
        $titre = "Bienvenue à NetTrader - Transac'Challenge";            
    } else {
        $corps = "
<Message généré automatiquement>\n
<CONSERVEZ CE MESSAGE>\n\n
  Bienvenue dans NetTrader 2, \n\n
 Votre inscription a été prise en compte et vous pouvez dès maintenant jouer, voici les informations pour vous identifier:\n
 Login: $mail \n
 Mot de Passe: $passe\n\n
 Vous pouvez à tout moment modifier toutes vos informations via le site de NetTrader 2:\n
 " . (defined('ADDRNT') ? ADDRNT : '') . "

Bon Jeu ;)

L'auteur, FORTIN Nicolas
";
        $titre = "Bienvenue dans NetTrader II";        
    }

    envoimail($mail, $titre, $corps);
    return "<br><br>Vous êtes inscrit ! Votre mot de passe temporaire généré est : <b>$passe</b> (un récapitulatif a été envoyé par email).";
}

function jscript_av($nombre)
{
    return "<script language=\"Javascript\">
          function SetValeur(pourcent) {
          var nbr;
              if(pourcent>0 && pourcent<=100)
            {
          nbr=Math.round(pourcent/100*$nombre);
          document.form.nbr.value=nbr;
          document.form.nb2.value=pourcent;
          document.form.select[1].checked=true;
              }
          }
          function ChgQuant()
          {
            document.form.select[0].checked=true;
          }
          function sela_click1()
          {
            document.form.valmax.style.visibility=\"hidden\";
            document.form.valmin.style.visibility=\"hidden\";
          }
          function sela_click2()
          {  
            document.form.valmax.style.visibility=\"visible\";
            document.form.valmin.style.visibility=\"visible\";
          }
          function selv_click1()
          {
            document.form.valmin.style.visibility=\"hidden\";
            document.form.valmax.style.visibility=\"hidden\";
          }
          function selv_click2()
          {  
            document.form.valmin.style.visibility=\"visible\";
            document.form.valmax.style.visibility=\"visible\";
          }              
</script>";
}

function doachat($idcompte,$sicav,$nombre,$dernvaleur)
{
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $joueur = ChercheInternaute ($idcompte, $connexion);
    $sicav = sec($sicav);
    $nombre = sec(intval(sec($nombre)));

    $bddsico = dansliste($sicav);
    if(empty($bddsico))
    {
        return lang(10);
    }

    $cashback = is_object($joueur) ? $joueur->cashback : 0;
    $max = getnbactionmax($cashback, $dernvaleur);

    if($max < intval($nombre) || $nombre <= 0)
    {
        return lang(1).$max.lang(2);
    }

    $taxe = gettaxe($dernvaleur,$nombre);
    $cout = $nombre * $dernvaleur + $taxe;

    if($cout > $cashback)
    {
        return lang(11).$max.lang(2);
    }

    ModifLiquide($idcompte,-$cout);
    $possede = joueur_possede($sicav,$idcompte);

    if(empty($possede))
    {
        AjoutPort($idcompte,$sicav,$nombre,$dernvaleur);
    } else {
        $NvQuant = $possede->nombsicav + $nombre;
        ModifAction($idcompte,$sicav,$NvQuant,$dernvaleur);
    }

    $nombsicav = is_object($possede) ? $possede->nombsicav : 0;
    if($nombsicav >= 0)
    {
        $quantachat = 0;
    } else {
        if(abs($nombsicav) >= $nombre)
        {
            $quantachat = $nombre;
        } else {
            $quantachat = abs($nombsicav);
        }
    }
    $ansvaleur = (is_object($possede) && isset($possede->ansvaleur)) ? $possede->ansvaleur : $dernvaleur;
    $profit = -($dernvaleur - $ansvaleur) * $quantachat;
    AddHistorique($idcompte,"Achat",$sicav,$nombre,$dernvaleur, $taxe,$profit);

    return "OK";
}

function get_nextrefresh() 
{
    $maintenant = date("U");
    list($hour, $min, $sec, $day, $mon, $yr) = explode(" ",date("H i s d m y"));

    $date3 = mktime(9, 1, 0, $mon, $day+2, $yr);
    $date4 = mktime(9, 1, 0, $mon, $day+1, $yr);
    $date5 = mktime(9, 1, 0, $mon, $day, $yr);

    if(date("w",$maintenant) > 0 && date("w",$maintenant) < 6)
    {
        if(date("H",$maintenant) >= 9 && date("H",$maintenant) < 18)
        {
            $return = $maintenant + 100;
        } else {
            if(date("H",$maintenant) >= 18)
            {
                $return = $date4;
            } else {
                $return = $date5;
            }
        }
    } else {
        if(date("w",$maintenant) == 6)
        { 
            $return = $date3;
        } else {
            $return = $date4;
        }
    }
    $retour = $return - $maintenant;
    if($retour < 30) { $retour = 30; }
    return $retour;
}

function execute_ordre()
{
    $liste = get_ordre();
    if(is_array($liste) && count($liste) > 0 && tempsjeu())
    {
        foreach ($liste as $key => $value)
        {       
            $possede = joueur_possede($value["codesico"],$value["idcompte"]);
            $nivjoueur = niv_joueur($value["idcompte"]);
            $has_vad = (is_object($nivjoueur) && isset($nivjoueur->vad) && $nivjoueur->vad);
            $nombsicav = is_object($possede) ? $possede->nombsicav : 0;
            if($nombsicav > 0 || $value["sens"] == "achat" || $has_vad)
            {
                $retourne = efface_ordre($value["codesico"],$value["idcompte"],$value["datecreation"]);
                if($retourne == 0)
                {
                    return "";
                }
                if($value["pourc"] > 0)
                {
                    if($value["sens"] == "achat")
                    {
                        $nombre = floor(getnbactionmax(GetCashBack($value["idcompte"]),$value["valeur"]) * $value["pourc"]);
                    }
                    if($value["sens"] == "vente")
                    {
                        if($has_vad)
                            $nombsicav = getnbactionmax(getmontantvadpossible($value["idcompte"]),$value["valeur"]) + $nombsicav;
                        $nombre = floor($nombsicav * $value["pourc"]);
                    }
                } else {
                    $nombre = $value["nbr"];
                }
                $echo = "";
                $multip = 1;
                $sens = "";
                if($value["sens"] == "achat")
                {
                    $echo = doachat($value["idcompte"],$value["codesico"],$nombre,$value["valeur"]);
                    $multip = 1;
                    $sens = lang(46);
                }
                if($value["sens"] == "vente")
                {
                    $echo = dovente($value["idcompte"],$value["codesico"],$nombre,$value["valeur"]);
                    $multip = -1;
                    $sens = lang(47);
                }
                if($echo == "OK")
                {
                    $taxe = gettaxe($value["valeur"],$nombre);
                    $corps = "<br><br>".tab_mess_ordre($value["datecreation"],$value["tempslim"],$value["nom"],$value["sens"],$value["nbr"],$value["coursmin"],$value["valeur"],$value["coursmax"],$value["pourc"])."<br><br>"
                    .$sens.": ".$value["nom"].
                    "<br>".lang(14).": ".date("j/m/y H:i:s").
                    "<br>".lang(43)." ".$value["valeur"]." €
                    <br>".lang(51)." :".$nombre.
                    "<br>".lang(44)." ".$value["valeur"]*$nombre." €
                    <br>".lang(45)." ".$taxe."<br>".lang(20).": ".(($nombre*$value["valeur"])+($multip*$taxe))." €";
                } else {
                    add_msg(1,$value["idcompte"],$sens.": ".lang(60).$value["nom"],lang(60).": ".$echo."<br><br>".tab_mess_ordre($value["datecreation"],$value["tempslim"],$value["nom"],$value["sens"],$value["nbr"],$value["coursmin"],$value["valeur"],$value["coursmax"],$value["pourc"])."<br><br>");
                }
            }
        }
    }
    return "";
}

function tab_mess_ordre($datecreation,$tempslim,$nom,$sens,$nombre,$valmin,$valeur,$valmax,$pourc)
{
    if($nombre == 0) { $nombre = (round($pourc*100,2))." %"; }
    if($valmax == -1) { $valmax = ""; }
    if($valmin == 0) { $valmin = ""; }
    $html = openfont().lang(41).closefont()." :<br>";
    $html .= lang(50)." : ".date("j/m/y H:i:s",$datecreation)."<br>";
    $html .= lang(65)." : ".date("j/m/y H:i:s",$tempslim)."<br>";
    $html .= lang(15)." : ".$nom."<br>";
    $html .= lang(16)." : ".$sens."<br>";
    $html .= lang(51)." : ".$nombre."<br>";
    $html .= lang(52)." : ".$valmin."<br>";
    $html .= lang(53)." : ".$valeur."<br>";
    $html .= lang(54)." : ".$valmax."<br><br>";
    return $html;
}

function form_list_ordre()
{
    return list_ordre_sens("achat")."<br>".list_ordre_sens("vente");
}

function list_ordre_sens($sens)
{
    $retour = "";
    $tab = get_ordrelist("AND sens='$sens'");
    $nbtotordres = (is_array($tab) ? count($tab) : 0);
    if($nbtotordres > 0)
    {
        $retour = jscript_ordre();
        $retour .= opentab(" align=center width=\"90%\"  ").openligne("","titre2").opencol("colspan=\"8\"").lang(55)." ($sens) :".closecol().opencol().htm_iconhelp("listordre").closecol().closeligne();

        $secure_val = defined('SECURE') ? SECURE : 0;
        $taba = get_ordrelist("AND tempslim>UNIX_TIMESTAMP() AND (NOT $secure_val OR lasttime>=datecreation) AND etat='1' AND sens='$sens'");
        $nbattordres = 0;
        if(is_array($taba) && count($taba) > 0)
        {   
            $retour .= form_list_ordrefe($taba,lang(129));
            $nbattordres = count($taba);
        }
        
        $nblimitordres = 0;
        if($nbtotordres - $nbattordres > 0)
        {
            $tabb = get_ordrelist("AND (tempslim<UNIX_TIMESTAMP() OR ($secure_val AND lasttime<datecreation)) AND etat='1' AND sens='$sens'");
            if(is_array($tabb) && count($tabb) > 0)
            {
                $retour .= form_list_ordrefe($tabb,lang(130),1);
                $nblimitordres = count($tabb);
            }
        }
        if($nbtotordres - $nbattordres - $nblimitordres > 0)
        {
            if($nbattordres + $nblimitordres > 0) 
                $tabc = get_ordrelist("AND etat='0' AND sens='$sens'");
            else 
                $tabc = $tab;
            if (is_array($tabc)) {
                $retour .= form_list_ordrefe($tabc,lang(131));
            }
        }
        $retour .= closetab();
    }
    return $retour;
}

function form_list_ordrefe($liste,$titre,$indiDecalage=0)
{
    global $skinrep;
    if(is_array($liste) && count($liste) > 0)
    {
        $retour = openligne("","titre").opencol("colspan=\"9\"").$titre.closecol().closeligne();
        $icontoutsuppr = "<a href=\"index.php?do=supprtoutordre\" onclick=\"return confirmLink(this, '".lang(212)."')\"><img title=\"".lang(212)."\" src=\"$skinrep/suppr.gif\" border=\"0\"></a>";
        $retour .= openligne("","titre").opencol().$icontoutsuppr.closecol().opencol()."<b>".lang(50)."</b>".closecol().opencol()."<b>".lang(65)."</b>".closecol().opencol()."<b>".lang(15)."</b>".closecol().opencol()."<b>".lang(16).closecol().opencol()."<b>".lang(51)."</b>".closecol().opencol()."<b>".lang(52)."</b>".closecol().opencol()."<b>".lang(53)."</b>".closecol().opencol()."<b>".lang(54)."</b>".closecol().closeligne();
        foreach ($liste as $key => $value)
        {
            $retour .= openligne();
            $nombre = $value["nbr"];
            if($nombre == 0) { $nombre = (round($value["pourc"]*100,2))." %"; }
            $valmax = $value["coursmax"];
            $valmin = $value["coursmin"];
            if($valmax == -1) { $valmax = ""; }
            if($valmin == 0) { $valmin = ""; }
            $aj = "";
            $calc = $value["datecreation"] - $value["lasttime"];
            if($indiDecalage && $calc > 0 && $calc < 3600) { $aj = " (".date("i \m\i\\n",$calc).")"; }
            $clr = "";
            if($value["tempslim"] < date("U"))
                $clr = "perte";
            $retour .= opencol()."<a href=\"index.php?do=supprordre&idordre=".$value["datecreation"]."\" onclick=\"return confirmLink(this, '".date("j/m/y H:i:s",$value["datecreation"])."')\"><img title=\"".lang(66)."\" src=\"$skinrep/suppr.gif\" border=\"0\"></a>".closecol().opencol().date("j/m/y H:i:s",$value["datecreation"]).$aj.closecol().opencol()."<font class=\"$clr\">".date("j/m/y H:i:s",$value["tempslim"])."</font>".closecol().opencol().$value["nom"].closecol().opencol().$value["sens"].closecol().opencol().$nombre.closecol().opencol().$valmin.closecol().opencol().$value["valeur"].closecol().opencol().$valmax.closecol();
            $retour .= closeligne();
        }
    } else {
        $retour = "";
    }
    return $retour;
}

function htm_iconhelp($form)
{
    global $skinrep;
    return "<a href=\"index.php?do=formhelp#$form\"><img align=\"right\" border=\"0\" src=\"$skinrep/interr.gif\"></a>";
}

function htm_iconinfo($siconame,$nom)
{
    global $skinrep;
    return "<a href=\"index.php?do=profilaction&yn=$siconame\"><img title=\"".lang(134).$nom."\" src=\"$skinrep/info.gif\" border=\"0\"></a>";
}

function profilaction($yahooname)
{
    $limit = date("U") - 24*3600*9;
    $laction = donnactionyn($yahooname);
    if (!is_object($laction)) return msgtab("Action introuvable", "Erreur");
    $lstat = stataction($laction->codesico,$limit);
    $lordrea = ordreactionachat($laction->codesico,$laction->lasttime,$laction->valeur);
    $lordrev = ordreactionvente($laction->codesico,$laction->lasttime,$laction->valeur);
    $corps = lang(15)." : $laction->nom<br>";
    $corps .= lang(180)." : $laction->libellesecteur<br>";
    $corps .= lang(53)." : $laction->valeur €<br>";
    $corps .= lang(14)." : ".date("j M Y H:i a",$laction->lasttime)."<br>";
    $corps .= "<a href=\"".geturlaide($yahooname)."\" target=\"_blank\" title=\"".lang(134).$laction->nom."\">".lang(185)."</a>";

    $lignevide = openligne().opencol()."-".closecol().opencol()."-".closecol().opencol()."-".closecol().opencol()."-".closecol().opencol()."-".closecol().opencol()."-".closecol().closeligne();
    $lignevide2 = openligne().opencol()."-".closecol().opencol()."-".closecol().opencol()."-".closecol().opencol()."-".closecol().closeligne();
    $tabhisto = opentab("width=\"100%\"").openligne("","titre2").opencol(" colspan=\"6\" ").lang(12)." ".lang(6).closecol().closeligne().openligne("","titre").opencol().lang(14).closecol().opencol().lang(16).closecol().opencol().lang(17).closecol().opencol().lang(181).closecol().opencol().lang(210).closecol().opencol().lang(273).closecol().closeligne();
    $i = 0;
    while($ligne = LigneSuivante($lstat))
    {
        $tabhisto .= openligne().opencol().$ligne->jour.closecol().opencol().$ligne->sens.closecol().opencol().$ligne->nb.closecol().opencol().round($ligne->valeurechang,2)." €".closecol().opencol().round($ligne->profit,2)." €".closecol().opencol().round($ligne->perte,2)." €".closecol().closeligne();
        $i++;
    }
    if($i < 9)
    {
        $tabhisto .= str_repeat($lignevide,9-$i);
    }
    $tabhisto .= closetab();

    $tabordres = opentab("width=\"100%\"").openligne("","titre2").opencol(" colspan=\"4\" ").lang(184).closecol().closeligne().openligne("","titre").opencol().lang(182).closecol().opencol().lang(112).closecol().opencol().lang(183).closecol().opencol().lang(51).closecol().closeligne();
    $i = 0;
    $ltabordres = "";
    while($ligne = LigneSuivante($lordrev))
    {
        if(intval($ligne->quant) == 0) { $ligne->quant = "-"; }
        if(intval($ligne->prc) == 0) { $ligne->prc = "-"; } else { $ligne->prc = round($ligne->prc,2)." %"; }
        $ltabordres .= openligne().opencol().lang(47).closecol().opencol().$ligne->valeur." €".closecol().opencol().$ligne->prc.closecol().opencol().$ligne->quant.closecol().closeligne();
        $i++;
    }
    if($i < 4)
    {
        $tabordres .= str_repeat($lignevide2,4-$i).$ltabordres;
    } else {
        $tabordres .= $ltabordres;
    }

    $tabordres .= openligne().opencol().lang(53).closecol().opencol().$laction->valeur." €".closecol().opencol()."-".closecol().opencol()."-".closecol().closeligne();
    $ltabordres = "";
    $i = 0;
    while($ligne = LigneSuivante($lordrea))
    {
        if(intval($ligne->quant) == 0) { $ligne->quant = "-"; }
        if(intval($ligne->prc) == 0) { $ligne->prc = "-"; } else { $ligne->prc = round($ligne->prc,2)." %"; }
        $ltabordres .= openligne().opencol().lang(46).closecol().opencol().$ligne->valeur." €".closecol().opencol().$ligne->prc.closecol().opencol().$ligne->quant.closecol().closeligne();
        $i++;
    }
    if($i < 4)
    {
        $tabordres .= $ltabordres.str_repeat($lignevide2,4-$i);
    } else {
        $tabordres .= $ltabordres;
    }

    $tabordres .= closetab();
    $corps .= opentab("width=\"100%\"","invi").openligne().opencol().$tabhisto.closecol().opencol().$tabordres.closecol().closeligne().closetab();

    return msgtab($corps,$laction->nom." - ".$laction->libellesecteur);
}

function txt_help($idhelpshowcomment=0)
{
    global $internaute;
    $html = "";
    $req = get_listeaide();
    $reqc = get_listecomment($idhelpshowcomment);
    $liste = "";
    $laide = "";
    $txtaide = "";
    $anschap = 0;
    while($ligne = LigneSuivante($req))
    {
        if($anschap <> $ligne->idchapaide)
        {
            if($liste <> "") $liste .= "</ul>";
            $anschap = $ligne->idchapaide;
            $liste .= openfont("titre1")."$ligne->titrechap".closefont()."<ul>";
        }
        $liste .= "<li><a href=\"#$ligne->lnkaide\"> $ligne->titreaide</a></li><br>";
        $laidetitre = "<a name=\"$ligne->lnkaide\">".$ligne->titreaide."</a>";
        $laide .= $ligne->txtaide."<br>".html_lien($ligne->nbcomment." ".lang(159)." >>",getnewurl("idaide",$ligne->idligne)."#$ligne->lnkaide")."<br><br><br>";
        if($ligne->idligne == $idhelpshowcomment)
        {
            while($lignecomment = LigneSuivante($reqc))
            {
                $messsuppr = "";
                $is_admin = is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel > 1;
                $is_author = is_object($internaute) && isset($internaute->idcompte) && $lignecomment->auteurid == $internaute->idcompte;
                if($is_author || $is_admin) 
                    $messsuppr = html_lien("[ ".lang(163)." ]","do=suppcomment&idcomment=$lignecomment->idcomment#$ligne->lnkaide");
                $laide .= "<br><hr>".lang(161)." ".$lignecomment->pseudonyme." ".lang(162)." ".date("j M Y H:i a",$lignecomment->datecomment)." ".$messsuppr."<br><br>".bbtohtml($lignecomment->textecomment);
            }
            if(is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 1)
            {
                $laide .= "<br><hr><br><br><form method=\"POST\" action=\"index.php?".getnewurl("do","postemessage")."#$ligne->lnkaide\"><input type=\"hidden\" name=\"idaide\" value=\"$idhelpshowcomment\"><center><textarea name=\"message\" rows=\"8\" cols=\"25\" wrap=\"virtual\" style=\"width:450px\" tabindex=\"3\" class=\"post\"></textarea></center><br><br><center>".Html_bouton('valider',lang(164))."</center></form>";
            }
        }
        $txtaide .= msgtab($laide,$laidetitre);
        $laide = "";
    }
    $liste .= "</ul>";

    $html .= msgtab($liste,lang(158)).$txtaide;
    return openfont("titre1").lang(160).closefont()."<br><br>".$html;
}

function txt_faq($idhelpshowcomment=0)
{
    global $internaute;
    $html = "";
    $req = get_listefaq();
    $reqc = get_listecommentfaq($idhelpshowcomment);
    $liste = "";
    $laide = "";
    $txtaide = "";
    $liste .= "<ul>";
    while($ligne = LigneSuivante($req))
    {
        $liste .= "<li><a href=\"#$ligne->lnkaide\"> $ligne->titreaide</a></li><br>";
        $laidetitre = "<a name=\"$ligne->lnkaide\">".$ligne->titreaide."</a>";
        $laide .= $ligne->txtaide."<br><br>".html_lien($ligne->nbcomment." ".lang(165)." >>",getnewurl("idaide",$ligne->idligne)."#$ligne->lnkaide")."<br><br><br>";
        if($ligne->idligne == $idhelpshowcomment)
        {
            while($lignecomment = LigneSuivante($reqc))
            {
                $messsuppr = "";
                $is_admin = is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel > 1;
                $is_author = is_object($internaute) && isset($internaute->idcompte) && $lignecomment->auteurid == $internaute->idcompte;
                if($is_author || $is_admin) 
                    $messsuppr = html_lien("[ ".lang(163)." ]","do=suppcommentfaq&idcomment=$lignecomment->idcomment#$ligne->lnkaide");
                $laide .= "<br><hr>".lang(161)." ".$lignecomment->pseudonyme." ".lang(162)." ".date("j M Y H:i a",$lignecomment->datecomment)." ".$messsuppr."<br><br>".bbtohtml($lignecomment->textecomment);
            }
            if(is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 1)
            {
                $laide .= "<br><hr><br><br><form method=\"POST\" action=\"index.php?".getnewurl("do","postemessagefaq")."#$ligne->lnkaide\"><input type=\"hidden\" name=\"idaide\" value=\"$idhelpshowcomment\"><center><textarea name=\"message\" rows=\"8\" cols=\"25\" wrap=\"virtual\" style=\"width:450px\" tabindex=\"3\" class=\"post\"></textarea></center><br><br><center>".Html_bouton('valider',lang(164))."</center></form>";
            }
        }
        $txtaide .= msgtab($laide,$laidetitre);
        $laide = "";
    }
    $liste .= "</ul>";

    $html .= msgtab($liste,lang(158)).$txtaide;
    return openfont("titre1").lang(166).closefont()."<br><br>".$html;
}

function supprtoutordre()
{
    if(tempsjeu())
    {
        $message = lang(67);
        effacordresinactifs();
    } else {
        $message = lang(69);
    }
    return $message;
}

function supprordre($dateordre)
{
    if(tempsjeu())
    {
        $ordre = get_info_ordre($dateordre);
        if(!is_object($ordre) || !$ordre->datecreation) return lang(67);
        $secure_val = defined('SECURE') ? SECURE : 0;
        if(!$secure_val || ($ordre->datecreation > date("U")-5*60 || $ordre->datecreation < date("U")-20*60) || $ordre->etat == 0)
        {
            $message = lang(67);
            del_ordre($dateordre);
        } else {
            $message = lang(128).date("i \m\i\\n s \s\e\c",$ordre->datecreation+(20*60)-date("U"));
        }
    } else {
        $message = lang(69);
    }
    return $message;
}

function jscript_ordre()
{
    return "\n<script language=\"Javascript\">
function confirmLink(theLink, theSqlQuery)
{
    var is_confirmed = confirm('Voulez-vous supprimer l\'ordre du : ' + theSqlQuery);
    if (is_confirmed) {
        document.location.href=theLink;
    }
    return is_confirmed;
} 
</script>";
}

function jscript_inscr()
{
    $inconc_check = (defined('INCONC') && INCONC) ? " || document.forminscr.nom.value == \"\" || document.forminscr.prenom.value == \"\" || document.forminscr.adresse.value == \"\" || document.forminscr.cp.value == \"\" || document.forminscr.ville.value == \"\" || document.forminscr.tel.value == \"\" || document.forminscr.etab.value == \"\"" : "";
    return "<script language=\"Javascript\">
function test() 
{
    if (document.forminscr.pseudo.value == \"\" || document.forminscr.mail.value == \"\" $inconc_check )
    {
        window.alert(\"Veuillez remplir tout les champs.\");
        return false;
    }
    if (verif_email(document.forminscr.mail.value)== false)
    {
        window.alert(\"L'email doit obligatoirement être valide !\");
        return false;
    }
    document.forminscr.Submit.disabled=true;
    return true;
}
function verif_email(varp)
{
if (varp.indexOf(\"@\")==-1)
{
alert(\"Une adresse E-mail doit contenir un '@'\");
return false;
}
if (varp.indexOf(\".\")==-1)
{
alert(\"Une adresse E-mail doit contenir au moins un '.'\");
return false;
}
var indexa = varp.indexOf(\"@\");
var lindexa = varp.lastIndexOf(\"@\");
if (indexa != lindexa){
alert(\"Une adresse E-mail ne peut pas contenir plusieurs '@'\");
return false;
}
var lindexp = varp.lastIndexOf(\".\"); 
if(lindexp < indexa){
alert(\"Il doit y avoir un '.' APRES le @\");
return false;
}
return true;
}
</script>";
}

function jscript_groupe()
{
    return "<script language=\"Javascript\">
function test()
{
    if (document.frmajmodifgroupe.titreeq.value == \"\" || document.frmajmodifgroupe.titreeqcourt.value == \"\" )
    {
        window.alert(\"Veuillez remplir tout les champs obligatoire.\");
        return false;
    }
}
</script>";
}

function back_link()
{
    global $internaute;
    $echo = "<br><center>";
    $echo .= "<a href=\"http://nettrader.apinc.org/phpBB2/\" class=\"Lienbas\" target=\"_blank\" >[ Forum NetTrader2 ]</a>";
    $echo .= " - <a href=\"index.php?do=reglement\" class=\"Lienbas\" >[ Reglement ]</a>";
    if(is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 1)
    {
        $echo .= " - <a href=\"index.php?do=profil\" class=\"Lienbas\" >[ Profil ]</a>";
    }
    if(is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 2)
    {
        $echo .= " - <a href=\"index.php?do=formadmin\" class=\"Lienbas\" >[ Administration ]</a>";
    }
    $echo .= "</center>";
    return $echo;
}

function chgmdp($nouvpass,$nouvpassconfirm)
{
    global $internaute;
    if(!is_object($internaute)) return "";
    if(defined('IDCOMPTEDEMO') && IDCOMPTEDEMO == $internaute->idcompte)
        return "";
    if($nouvpass <> "")
    {
        if($nouvpass <> $nouvpassconfirm)
        {
            return "Le nouveau mot de passe ne correspond pas au mot de passe de confirmation, vous devez entrez le même mot de passe dans ces deux champs.";
        } else {
            $passe = md5($nouvpass);
        }
    } else {
        $passe = $internaute->passe;
    }

    $chainesql = "UPDATE `compte` SET `passe` = '$passe' WHERE `idcompte` = '$internaute->idcompte'";
    $corps = "Bonjour,\n\nVotre demande de modification de mot de passe est effectuée, voici votre nouveau mot de passe :\n\nlogin:$internaute->email\npasse:$nouvpass\n\nVeuillez imprimer, sauvegarder ou noter ces informations afin de ne pas les perdre.\n\n-Nicolas\n";
    envoimail($internaute->email,"Changement de mot de passe",$corps);
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    ExecRequete($chainesql,$connexion);

    return lang(87);
}

function editprofil($mail,$niveau,$nbhisto,$nbmsg,$nbclasse,$idskin,$mailjour,$mailsemaine)
{
    global $internaute;
    if(!is_object($internaute)) return "";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);

    if($internaute->pseudonyme == "demo" && $internaute->email != $mail) return "Vous ne pouvez pas changer l'email";

    if(!($nbhisto > 0 && $nbmsg > 0 && $nbclasse > 0))
    {
        return "Le nombre de ligne entré est incorrect !";
    }

    if(skin_existe($idskin) == 0)
    {
        return "Cette skin n'existe pas !";
    }

    if(!($mailsemaine == 0 || $mailsemaine == 1) || !($mailjour == 0 || $mailjour == 1))
        return "";

    $chainesql = "UPDATE `compte` SET
    `email` = '$mail',
    `idniveau` = '$niveau',
    `histonbl` = '$nbhisto',
    `msgnbl` = '$nbmsg',
    `classenbl` = '$nbclasse',
    `skin` = '$idskin',
    `maildaily` = '$mailjour',
    `mailweekly` = '$mailsemaine'
    WHERE `idcompte` = '$internaute->idcompte'";

    ExecRequete($chainesql,$connexion);
    return lang(87);
}

function jscript_profil()
{
    return "<script language=\"Javascript\">
function test() 
{
    if (document.forminscr.mail.value == \"\" || document.forminscr.lvl.value == \"\" )
    {
        window.alert(\"Veuillez remplir tout les champs.\");
        return false;
    }
    document.forminscr.Submit.disabled=true;
    return true;
}
</script>";
}

function jscript_profil2()
{
    return "<script language=\"Javascript\">
function test()
{
    if (document.forminscr.nmdp.value != document.forminscr.cnmdp.value )
    {
        window.alert(\"Le nouveau mot de passe de correspond pas à la confirmation, veuillez saisir le même mot de passe dans la zone de texte de confirmation.\");
        return false;
    }
    document.forminscr.Submit.disabled=true;
    return true;
}
</script>";
}

function classementequipes($ligncour,$moisan,$cherche="")
{
    global $internaute,$skinrep;
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $equipeinternaute = getgroupbymembre($id_compte);

    if($cherche == "" && is_object($equipeinternaute) && $equipeinternaute->idgroupe > 0)
    {
        $cherche = $equipeinternaute->titregroupe;
        $chaffiche = "";
    } else {
        $chaffiche = $cherche;
    }

    list($mon, $yr) = explode("-",$moisan);
    $date1 = mktime(1, 1, 1, $mon, 1, $yr);
    $ladate = date("Y-m-d",$date1);

    if($ligncour < 0) { $ligncour = 0; }
    if(is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 1)
    {
        $maxligne = $internaute->classenbl;
    } else {
        $maxligne = 30;
    }

    $res = listclassementequipe($ladate,$ligncour,$maxligne,$cherche);
    $theliste = is_object($res) ? $res->liste : [];
    $numligne = is_object($res) ? $res->nb : 0;

    $form = "<center>";
    $listemois = listmoisclassequipe();
    $act_grp = defined('ACTIVATION_GROUPE') ? ACTIVATION_GROUPE : 0;
    $form .= retiftrue("<a href=\"index.php?do=classement\">".lang(13)."</a> - <a href=\"index.php?do=classementequipe\">".lang(229)."</a><br><br>",$act_grp);
    $form .= "<FORM METHOD='GET' ACTION='index.php' NAME='Form'>";
    $form .= lang(228)." : ".Html_texte("cherche",$chaffiche,30,50)."<INPUT type=\"hidden\" name=\"do\" value=\"classementequipe\">";
    $form .= "&nbsp;&nbsp;&nbsp;";
    $form .= Html_liste("moisclasse",$listemois,"",$moisan);
    $form .= Html_bouton("valider","Afficher");
    $form .= "</form>";
    $form .= "</center>";
    if(empty($theliste)) { return $form.msgtab("Pas d'équipes !","Info :"); }
    $barre = barrepage($numligne,$maxligne,$ligncour,"&moisclasse=$moisan&cherche=$chaffiche");
    $retour = $barre;
    $span = 3;

    $retour .= "<br>".opentab(" align=\"center\" width=\"90%\" ").openligne("","titre2").opencol("colspan=\"$span\"").lang(229).closecol().opencol().htm_iconhelp("formclasseequipe").closecol().closeligne().openligne("","titre").
    opencol()."<b>".lang(61)."</b>".closecol().opencol()."<b>".lienordre("nomequipeclasse",lang(189))."</b>".closecol().opencol()."<b>".lienordre("pourcbenefclasse",lang(22))."</b>".closecol().opencol()."<b>".lienordre("nbjoueursclasse",lang(230))."</b>".closecol();
    $retour .= closeligne();

    $i = $ligncour;
    $cnt = is_array($theliste) ? count($theliste) : 0;
    for($li = 0; $li < $cnt; $li++)
    {
        $value = $theliste[$li];
        $i++;
        if(!compareclass(sec($value["titregroupe"]),$cherche))
        {
            $retour .= openligne();
        } else {
            $retour .= openligne("","titre2");
        }
        $retour .= opencol().$i.closecol().opencol().stripslashes($value["titregroupe"])." - "."<a href=\"?do=viewgroupeprofil&idgroupe=".$value["idgroupe"]."\">".$value["initialgroupe"]."</a>&nbsp;".str_repeat("<IMG SRC=\"$skinrep/premier.png\" border=0>",$value["medor"]).str_repeat("<IMG SRC=\"$skinrep/deus.png\" border=0>",$value["medargent"]).str_repeat("<IMG SRC=\"$skinrep/tres.png\" border=0>",$value["medbronze"]).closecol().opencol().$value["prog"]." %".closecol().opencol().$value["nbjoueurs"].closecol();
        $retour .= closeligne();
    }
    $retour .= closetab()."<br>";
    $retour .= $barre;
    return $form.$retour;
}

function formclasse($ligncour,$moisan,$cherche="")
{
    global $internaute;
    if($cherche == "" && is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 1)
    {
        $cherche = $internaute->pseudonyme;
        $chaffiche = "";
    } else {
        $chaffiche = $cherche;
    }

    list($mon, $yr) = explode("-",$moisan);
    $date1 = mktime(1, 1, 1, $mon, 1, $yr);
    $ladate = date("Y-m-d",$date1);

    if($ligncour < 0) { $ligncour = 0; }
    if(is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 1)
    {
        $maxligne = $internaute->classenbl;
    } else {
        $maxligne = 30;
    }

    $res = listclassement($ladate,$ligncour,$maxligne,$cherche);
    $nomsgroupes = gettabjoueursenequipes();
    $theliste = is_object($res) ? $res->liste : [];
    $secondeliste = is_object($res) ? $res->spec : [];
    $pos = is_object($res) ? $res->classement : -1;
    $deb = is_object($res) ? $res->deb : -1;
    $numligne = is_object($res) ? $res->nb : 0;

    $form = "<center>";
    $listemois = listmoisclass();
    $act_grp = defined('ACTIVATION_GROUPE') ? ACTIVATION_GROUPE : 0;
    $form .= retiftrue("<a href=\"index.php?do=classement\">".lang(13)."</a> - <a href=\"index.php?do=classementequipe\">".lang(229)."</a><br><br>",$act_grp);

    $form .= "<FORM METHOD='GET' ACTION='index.php' NAME='Form'>";
    $form .= lang(142)." : ".Html_texte("cherche",$chaffiche,30,50)."<INPUT type=\"hidden\" name=\"do\" value=\"classement\">";
    $form .= "&nbsp;&nbsp;&nbsp;";
    $form .= Html_liste("moisclasse",$listemois,"",$moisan);
    $form .= Html_bouton("valider","Afficher");
    $form .= "</form>";
    $form .= "</center>";
    if(empty($theliste)) { return $form.msgtab("Pas de joueurs !","Info :"); }
    $barre = barrepage($numligne,$maxligne,$ligncour,"&moisclasse=$moisan&cherche=$chaffiche");
    $retour = $barre;
    $span = (defined('INCONC') && INCONC) ? 4 : 3;
    $retour .= "<br>".opentab(" align=\"center\" width=\"90%\" ").openligne("","titre2").opencol("colspan=\"$span\"").lang(13).closecol().opencol().htm_iconhelp("formclasse").closecol().closeligne().openligne("","titre").opencol()."<b>".lang(61)."</b>".closecol().opencol()."<b>".lienordre("pseudoclasse",lang(21))."</b>".closecol().opencol()."<b>".lienordre("capitalclasse",lang(24))."</b>".closecol().opencol()."<b>".lienordre("pourcbenefclasse",lang(22))."</b>".closecol();
    if(defined('INCONC') && INCONC)
    {
        $retour .= opencol()."<b>".lang(23)."</b>".closecol();
    }
    $retour .= closeligne();

    $i = $ligncour;
    $cnt = is_array($theliste) ? count($theliste) : 0;
    $auth_admin = is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel > 1;
    for($li = 0; $li < $cnt; $li++)
    {
        $value = $theliste[$li];
        $i++;
        if(!compareclass(sec($value["pseudonyme"]),$cherche))
        { 
            $retour .= openligne();
        } else {
            $retour .= openligne("","titre2");    
        }
        $nomgroupe = "";
        if(is_array($nomsgroupes) && array_key_exists($value["idcompte"],$nomsgroupes))
            $nomgroupe = "&nbsp;<a href=\"?do=viewgroupeprofil&idgroupe=".$nomsgroupes[$value["idcompte"]][1]."\"><font class=\"gain\"><b>[".$nomsgroupes[$value["idcompte"]][0]."]</b></font></a>";
        $retour .= opencol().$i.closecol().opencol().retiftrue(" <a href=\"?do=incarner&idcompte=".$value["idcompte"]."\"><img src=\"skin/default/images/interr.gif\" border=\"0\"></a> ",$auth_admin).stripslashes($value["pseudonyme"]).$nomgroupe.closecol().opencol().$value["capital"]." €".closecol().opencol().$value["prog"]." %".closecol();
        $retour .= closeligne();
    }
    $retour .= closetab()."<br>";

    $retour .= $barre;
    if(($numligne > $pos || $maxligne + $numligne < $pos) && !empty($secondeliste))
    {
        $retour = $form."<br><br>".sous_formclasse($deb,$pos,$secondeliste,$cherche,$nomsgroupes).$retour;
    } else {
        $retour = $form.$retour;
    }

    return $retour;
}

function sous_formclasse($ligncour,$pos,$theliste,$cherche,$nomsgroupes)
{
    if(empty($theliste) || !is_array($theliste)) { return ""; }
    $span = (defined('INCONC') && INCONC) ? 4 : 3;

    $retour = "<br>".opentab(" align=\"center\" width=\"90%\" ").openligne("","titre2").opencol("colspan=\"$span\"").lang(13).closecol().opencol().htm_iconhelp("formclasse").closecol().closeligne().openligne("","titre").opencol()."<b>".lang(61)."</b>".closecol().opencol()."<b>".lang(21)."</b>".closecol().opencol()."<b>".lang(24)."</b>".closecol().opencol()."<b>".lang(22)."</b>".closecol();
    if(defined('INCONC') && INCONC)
    {
        $retour .= opencol()."<b>".lang(23)."</b>".closecol();
    }
    $retour .= closeligne();
    $i = $ligncour;
    $cnt = count($theliste);
    for($li = 0; $li < $cnt; $li++)
    {
        $value = $theliste[$li];
        $i++;
        if(!compareclass($value["pseudonyme"],$cherche))
        { 
            $retour .= openligne();
        } else {
            $retour .= openligne("","titre2");    
        }
        $grp_lbl = (is_array($nomsgroupes) && isset($nomsgroupes[$value["idcompte"]])) ? $nomsgroupes[$value["idcompte"]][0] : "";
        $grp_id = (is_array($nomsgroupes) && isset($nomsgroupes[$value["idcompte"]])) ? $nomsgroupes[$value["idcompte"]][1] : 0;
        $retour .= opencol().$i.closecol().opencol().stripslashes($value["pseudonyme"]).retiftrue("&nbsp;<a href=\"?do=viewgroupeprofil&idgroupe=".$grp_id."\"><font class=\"gain\"><b>[".$grp_lbl."]</b></font></a>",$grp_lbl).closecol().opencol().$value["capital"].closecol().opencol().$value["prog"]." %".closecol();
        if(defined('INCONC') && INCONC)
        {
            $retour .= opencol().stripslashes($value["etablissement"]).closecol();
        }
        $retour .= closeligne();
    }
    $retour .= closetab()."<br>";
    return $retour;
}

function formhisto($ligncour)
{
    global $internaute;
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $numligne = listhistocount($id_compte);
    if($ligncour < 0 || $ligncour > $numligne)
    {
        $ligncour = 0;
    }
    $maxligne = (is_object($internaute) && isset($internaute->histonbl)) ? $internaute->histonbl : 20;

    $liste = listhisto($ligncour,$maxligne);
    if(empty($liste) || !is_array($liste)) { return "Pas d'historique"; }
    $retour = "";
    $retour .= barrepage($numligne,$maxligne,$ligncour);
    $retour .= "<br>".opentab(" align=center width=\"90%\"");
    $retour .= openligne("","titre2").opencol("colspan=\"7\"").lang(12).closecol().opencol().htm_iconhelp("formhisto").closecol().closeligne();
    $retour .= openligne("","titre").opencol()."<b>".lienordre("datehisto",lang(14))."</b>".closecol().opencol()."<b>".lienordre("nomhisto",lang(15))."</b>".closecol().opencol()."<b>".lienordre("senshisto",lang(16))."</b>".closecol().opencol()."<b>".lienordre("nombrehisto",lang(17))."</b>".closecol().opencol()."<b>".lienordre("valhthisto",lang(18))."</b>".closecol().opencol()."<b>".lienordre("taxehisto",lang(19))."</b>".closecol().opencol()."<b>".lienordre("totalttchisto",lang(20))."</b>".closecol().opencol()."<b>".lienordre("profithisto",lang(210))."</b>".closecol().closeligne();
    foreach ($liste as $key => $value)
    {
        $clr = "";
        if(round($value["PROFITOP"],2) > 0.)
        {
            $clr = "gain";
        }
        if(round($value["PROFITOP"],2) < 0.)
        {
            $clr = "perte";
        }
        $retour .= openligne();
        $retour .= opencol().date("j/m/y H:i:s",$value["LADATE"]).closecol().opencol().$value["LENOM"].closecol().opencol().$value["LESENS"].closecol().opencol().$value["LENOMBRE"].closecol().opencol().$value["LEHT"].closecol().opencol().$value["LATAXE"].closecol().opencol().$value["LETTC"].closecol().opencol()."<font class=\"$clr\">".$value["PROFITOP"]."</font>".closecol();
        $retour .= closeligne();
    }
    $retour .= closetab()."<br>".barrepage($numligne,$maxligne,$ligncour);
    return $retour;
}

function form_messagerie($ligncour,$ouvre=0)
{
    global $internaute;
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $numligne = listmessagescount($id_compte);
    if($ligncour < 0 || $ligncour > $numligne)
    {
        $ligncour = 0;
    }
    $maxligne = (is_object($internaute) && isset($internaute->msgnbl)) ? $internaute->msgnbl : 10;
    $liste = get_messagelist($ligncour,$maxligne,$id_compte);
    $html = "<a href=\"index.php?do=nouvmessage&idjoueur=-1\">".lang(167)."</a><br>";
    if(is_array($liste) && count($liste) > 0)
    {
        $html .= barrepage($numligne,$maxligne,$ligncour)."<br>";
        foreach ($liste as $key => $value)
        {
            $corps = str_replace(array("&quot;"),array("\""), stripslashes($value["corps"]));
            $html .= opentab("width=\"90%\" align=\"center\" ").openligne("","titre").opencol().lang(56).$value["pseudonyme"].closecol().opencol().lang(57).date("j/m/y H:i:s",$value["datemess"]).closecol().opencol().lang(58).$value["titre"].closecol().closeligne();
            if($ouvre == $value["idmsg"] && $value["etat"] == "non lu")
                upd_msgetat($value["idmsg"]);
            if($value["etat"] == "lu" || $ouvre == $value["idmsg"])
            {
                $html .= openligne().opencol("colspan=\"3\"").bbtohtml($corps).closecol().closeligne();
                $html .= openligne().opencol("colspan=\"3\"")."<center><a href=\"index.php?do=nouvmessage&idjoueur=".$value["idenvoyeur"]."&titre=Re: ".$value["titre"]."\">".lang(175)."</a>&nbsp;&nbsp;&nbsp;&nbsp; <a href=\"index.php?do=delmessage&idmessage=".$value["idmsg"]."\" >".lang(176)."</a></center>".closecol().closeligne();
            }
            if($value["etat"] == "non lu" && $ouvre <> $value["idmsg"])
                $html .= openligne().opencol("colspan=\"3\"")."<center><a href=\"index.php?do=listemessage&ouvre=".$value["idmsg"]."&numligne=$ligncour\" >".lang(174)."</a></center>".closecol().closeligne();
            $html .= closetab()."<br>";
        }
    } else {
        $html .= msgtab(lang(91),lang(86));
    }
    $liste_env = get_messagelistenvoye($id_compte);
    if(is_array($liste_env) && count($liste_env) > 0 && $id_compte != 1)
    {
        $html .= "<br>".lang(178)." :<br><br>";
        foreach ($liste_env as $key => $value)
        {
            $corps = str_replace(array("&quot;"),array("\""), stripslashes($value["corps"]));
            $html .= opentab("width=\"90%\" align=\"center\" ").openligne("","titre").opencol().lang(219).$value["pseudonyme"].closecol().opencol().lang(57).date("j/m/y H:i:s",$value["datemess"]).closecol().opencol().lang(58).$value["titre"].closecol().closeligne();
            $html .= openligne().opencol("colspan=\"3\"").bbtohtml($corps).closecol().closeligne();
            $html .= openligne().opencol("colspan=\"3\"")."<center><a href=\"index.php?do=delmessage&idmessage=".$value["idmsg"]."\" >".lang(179)."</a></center>".closecol().closeligne();
            $html .= closetab()."<br>";
        }
    }
    $html .= "<br>".barrepage($numligne,$maxligne,$ligncour);
    return $html;
}

function form_nouvmessage($idjoueur,$sujet,$corps)
{
    global $internaute;
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $titre = lang(167);
    $form = "<form method=\"POST\" action=\"index.php?do=postmessage\">";
    if($idjoueur > 0)
    {
        $destinataire = ChercheInternaute ($idjoueur, $connexion);
        $form .= lang(168)." : ".(is_object($destinataire) ? $destinataire->pseudonyme : 'Inconnu');
        $form .= "<input type=\"hidden\" name=\"destinataire\" value=\"$idjoueur\">";
    } else {
        $joueurs = get_players();
        $listejoueurs = [];
        if(is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel > 1) 
            $listejoueurs[0] = "Tous";
        while($ligne = LigneSuivante($joueurs))
            $listejoueurs[$ligne->idcompte] = $ligne->pseudonyme;
        $form .= lang(168)." : ".Html_liste("destinataire",$listejoueurs);
    }
    $form .= "<br><br>".lang(58).Html_texte("titre",$sujet,100,250);
    $form .= "<br><br>".lang(171)."<br>".Html_textezone("corps",30,104,stripslashes($corps));
    $form .= "<br><br>".Html_bouton("envoyer",lang(169))."</form>";
    return msgtab($form,$titre);
}

function sendmessage($destinataire,$titre,$corps)
{
    global $internaute;
    if(!is_object($internaute)) return "";
    $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $dest = ChercheInternaute ($destinataire, $connexion);
    $dest_id = is_object($dest) ? $dest->idcompte : 0;
    if(trim($titre) == "" || trim($corps) == "" || (!($dest_id > 0) && $internaute->authlevel < 2))
        return msgtab(lang(172),lang(86)).form_nouvmessage($destinataire,$titre,$corps);

    if($internaute->authlevel < 2 && getnvmessagesenvoye($internaute->idcompte) > MAX_MESSAGE_ENVOYE_NON_LU)
        return msgtab(lang(205),lang(86)).form_nouvmessage($destinataire,$titre,$corps);

    if($internaute->authlevel > 1) $corps = html_entity_decode($corps);    
    add_msg($internaute->idcompte,$destinataire,$titre,$corps);
    return msgtab(lang(173),lang(86));
}

function txt_accueil()
{
    if(!defined('INCONC') || !INCONC)
    {
        $html = " Bienvenue dans NetTrader 2 <br><br>NetTrader 2 est un jeu accessible à tous qui vous permet de goûter aux joies et aux frayeurs de la Bourse mais sans le moindre risque. Achetez, Revendez, Gagnez ou Perdez, peu importe puisque vous ne jouez pas d'argent réel . Vous démarrez avec un capital de 10.000 € et vous devez réaliser le meilleur bénéfice. Vous figurez dans un classement sur le site de NetTrader pour être confronté à tous les autres performances.
        <br><br>
        Pour plus de réalisme, NetTrader utilise les véritables cours de la Bourse avec seulement 15 minutes de différés par rapport au réel.
        <br><br>
        Un jeu instructif qui révélera peut-être vos talents cachés.<br><br>

        NetTrader c'est :<br><br>

        -Un jeu à la fois palpitant et instructif<br>
        -10.000 € virtuel à faire fructifier<br>
        -Plus de 160 titres boursiers réel à acheter et vendre<br>
        -Une mise à jour des valeurs et du classement toute les 100 secondes !<br>
        -3 niveaux de difficulté, débutant, initié et expert<br>
        -Un très grand réalisme, les transactions sont soumises aux taxes et les cours ont seulement 15 minutes de différés<br>
        -L'execution des ordres d'achat et de vente peuvent se faire sur un seuil ou une plage de valeurs<br>
        -Vente à découvert et effet de levier sont au rendez-vous<br>
        -Plus de 1600 Traders ( joueurs ) en quête de la première place au classement !<br>
        ";
    } else {
        $html = "Texte du concours";
    }
    return $html;
}

function txt_regl()
{
    $html = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Les cours ne doivent être utilisé que pour le jeu virtuel.NetTrader 2 n'est pas un logiciel de gestion de portfeuille, tout est fictif et il n'y a rien à gagner.<br><br>Les comptes où les joueurs n'ont pas eu d'activité pendant deux mois ou plus seront supprimés afin de garder un classement propre, les détenteurs du compte ne recevrons jamais de mail pour les informer de la suppression de leur compte.";
    return msgtab($html,"REGLEMENT :");
}

function forminscription()
{
    if(defined('FINCONC') && date("U") >= FINCONC)
    {
        return lang(69);
    }
    $echo = jscript_inscr()."<br><br><br>
          <form name=\"forminscr\" method=\"post\" action=\"index.php?do=inscrjeu\"  onSubmit=\"return test();\">
              ".opentab("align=\"center\" ").openligne("","titre").opencol(" colspan=\"4\"")."<b>".lang(48)."</b>".closecol().closeligne()."
              ".openligne()." 
                <td align=\"right\"> &nbsp;Pseudonyme :&nbsp;".closecol()."
                ".opencol()." 
                  ".Html_texte("pseudo","",30,255)."
                  ".closecol()."
                <td align=\"right\"> &nbsp;Mot de passe :&nbsp;".closecol()."
                ".opencol()." 
                  <div align=\"left\"> 
                    ".lang(84)."
                     </div>
                ".closecol()."
              ".closeligne()."
              
              ".openligne()." 
                <td align=\"right\"> E-m@il :&nbsp;".closecol()."
                ".opencol()."  
                  ".Html_texte("mail","",30,255)."
                  ".closecol()."
                <td align=\"right\"> &nbsp;".lang(79)." :&nbsp;".closecol()."
                ".opencol()." 
                  <div align=\"left\"> 
                    ".Html_liste("lvl",array('1' => 'Débutant', '2' => 'Initié', '3' => 'Expert'))."
                     </div>
                ".closecol()."
              ".closeligne();
    if(defined('INCONC') && INCONC)
    {  
        $echo .= openligne()." 
        <td align=\"right\"> &nbsp;Nom :&nbsp; ".closecol()."
        ".opencol()." 
        ".Html_texte("nom","",30,255)."
        ".closecol()."
        <td align=\"right\"> Prenom :&nbsp;".closecol()."
        ".opencol()." 
        ".Html_texte("prenom","",30,255)."
        ".closecol()."
        ".closeligne()."
        ".openligne()." 
        <td align=\"right\" > Adresse :&nbsp;
        ".closecol()."
        <td> 
        ".Html_texte("adresse","",30,255)."               ".closecol()." 
        <td align=\"right\"> Ville :&nbsp;".closecol()."
        ".opencol()." 
        ".Html_texte("ville","",30,255)."
        ".closecol()."
        ".closeligne()."
        ".openligne()." 
        <td align=\"right\" > Code postal :&nbsp;
        ".closecol()."
        <td> 
        ".Html_texte("cp","",30,255)."               ".closecol()."
        <td align=\"right\"> Etablissement :&nbsp;".closecol()."
        ".opencol()." 
        ".Html_liste("etab",array('' => '- Faites votre choix -','CENTRALE PARIS' => 'CENTRALE PARIS','EDHEC Lille' => 'EDHEC Lille  ','EDHEC Nice' => 'EDHEC Nice','EM-LYON' => 'EM-LYON','ESC BORDEAUX' => 'ESC BORDEAUX','ESC LILLE' => 'ESC LILLE','ESC ROUEN' => 'ESC ROUEN','ESC TOULOUSE' => 'ESC TOULOUSE','ESCP-EAP' => 'ESCP-EAP','ESLSCA' => 'ESLSCA','ESSCA' => 'ESSCA','ESSEC' => 'ESSEC','HEC' => 'HEC','ISC' => 'ISC','PARIS DAUPHINE' => 'PARIS DAUPHINE','SCIENCE PO' => 'SCIENCE PO','POLYTECHNIQUE' => 'POLYTECHNIQUE','SORBONNE' => 'SORBONNE','ESG' => 'ESG','ESGF' => 'ESGF','ESGCI' => 'ESGCI','ESGI' => 'ESGI', 'ANCIENS TGE' => 'ANCIENS TGE','MASTERS PGSM' => 'MASTERS PGSM','ANCIENS PGSM' => 'ANCIENS PGSM','PROFESSEURS PGSM' => 'PROFESSEURS PGSM','ADMINISTRATION PGSM' => 'ADMINISTRATION PGSM'))."
        ".closecol()."
        ".closeligne()."".openligne()." 
        <td align=\"right\" > Telephone :&nbsp;".closecol()."
        ".opencol("colspan=\"3\"")."  
        ".Html_texte("tel","",30,255)."
        ".closecol().closeligne();
    }
                  
    $echo .= openligne().opencol(" colspan=\"4\"").lang(274)." &nbsp; ".
    Html_radio("mailjour",0,lang(277),"CHECKED").
    Html_radio("mailjour",1,lang(276),"")
    ."<br>".lang(275)." &nbsp;".
    Html_radio("mailsemaine",0,lang(277),"").
    Html_radio("mailsemaine",1,lang(276),"CHECKED")
    ."<br>".lang(136)."<br>".lang(137)."<br>".lang(138)."<br>".lang(139)."<br>".lang(140)."<br>".lang(141)
        .closecol().closeligne()."</table><br><br><center>".Html_bouton("Submit",lang(7))."</center>
          </form>";

    return $echo;
}

function formprofil()
{
    global $internaute;
    if(!is_object($internaute)) return "";
    $echo = jscript_profil()."<br><br><br>
          <form name=\"forminscr\" method=\"POST\" action=\"index.php?do=editprof\"   onSubmit=\"return test();\">
              ".opentab("align=\"center\" ","fond").openligne("","titre2").opencol(" colspan=\"4\"")."<b>".lang(63)."</b>".closecol().closeligne()."
              ".openligne()." 
                <td align=\"right\"> &nbsp;Pseudonyme :&nbsp;".closecol()."
                ".opencol()." 
                  $internaute->pseudonyme
                  ".closecol()."
                <td align=\"right\"> &nbsp;".lang(79)." :&nbsp;".closecol()."
                ".opencol()." 
                  <div align=\"left\"> 
                    ".Html_liste("lvl",array('1' => 'Débutant', '2' => 'Initié', '3' => 'Expert'),"",$internaute->idniveau)."
                     </div>
                ".closecol()."
              ".closeligne()."
              ".openligne()." 
                <td align=\"right\"> E-m@il :&nbsp;".closecol()."
                ".opencol()."  
                  ".Html_texte("mail",$internaute->email,30,255)."
                  ".closecol()."
                <td align=\"right\">".lang(73)." :&nbsp;".closecol()."
                ".opencol()."  
                  ".Html_liste("nbhisto",array('10' => '10 lignes', '20' => '20 lignes', '30' => '30 lignes', '50' => '50 lignes' ),"",$internaute->histonbl)."
                  ".closecol()."
              ".closeligne().openligne()." 
                <td align=\"right\">".lang(74)." :&nbsp;".closecol()."
                ".opencol()."  
                  ".Html_liste("nbmsg",array('5' => '5 lignes', '10' => '10 lignes', '15' => '15 lignes'),"",$internaute->msgnbl)."
                  ".closecol()."
                <td align=\"right\">".lang(75)." :&nbsp;".closecol()."
                ".opencol()."  
                  ".Html_liste("nbclasse",array('10' => '10 lignes', '20' => '20 lignes', '30' => '30 lignes', '50' => '50 lignes' ),"",$internaute->classenbl)."
                  ".closecol()."
              ".closeligne().openligne()."
                <td align=\"right\">".lang(72)." :&nbsp;".closecol()."
                ".opencol(" colspan=\"3\"").Html_liste("skin",listskin(),"",$internaute->idskin)."
                  ".closecol()
    .closeligne().openligne()."
                <td align=\"right\">".lang(274)." :&nbsp;".closecol()."
                ".opencol(" colspan=\"3\"").Html_radio("mailjour",0,lang(277),retiftrue("CHECKED",!$internaute->maildaily==1)).
    Html_radio("mailjour",1,lang(276),retiftrue("CHECKED",$internaute->maildaily==1))."
                  ".closecol()
    .closeligne().openligne()."
                <td align=\"right\">".lang(275)." :&nbsp;".closecol()."
                ".opencol(" colspan=\"3\"").Html_radio("mailsemaine",0,lang(277),retiftrue("CHECKED",!($internaute->mailweekly==1))).
    Html_radio("mailsemaine",1,lang(276),retiftrue("CHECKED",$internaute->mailweekly==1))."
                  ".closecol()
    .closeligne().openligne("","").opencol(" colspan=\"4\"")."<center>".Html_bouton("Submit",lang(64))."</center>".closecol().closeligne()."
              
            </table><br><br><center>

          </center></form>";

    return $echo;
}

function connectstat()
{
    $listeplayer = get_playerconnected();
    $nbplayer = (is_array($listeplayer) ? count($listeplayer) : 0);
    $liste = "";
    if(is_array($listeplayer) && $nbplayer > 0)
    {
        for($i=0; $i<$nbplayer; $i++)
        {
            if($i >= 1)
            {
                $liste .= ", ";
            }
            $liste .= $listeplayer[$i]['Pseudo'];
        }
    } else {
        $liste .= "Invité";
    }

    $echo = lang(81)." ".$nbplayer." ".lang(82)."<br>";
    $echo .= lang(83).$liste;
    return $echo;
}

function formcontact()
{
    return "Contacter l'auteur: contact_2012(chez)nettrader(point)fr\n";
}

function formachat($sicavselect)
{
    global $do,$internaute,$skinrep;
    $echo = "<center>".lang(31)." :<br><br><form method=\"post\" action=\"index.php?do=";
    $avpage = (is_object($internaute) && isset($internaute->avautrepage)) ? $internaute->avautrepage : 0;
    if($avpage == 0)
    {
        $echo .= "formachatvente&info=".(defined('ADSENSEKEYWORD') ? ADSENSEKEYWORD : '');
    } else {
        $echo .= "formachatseul&info=".(defined('ADSENSEKEYWORD') ? ADSENSEKEYWORD : '');
    }
    $echo .= "\">";
    $echo .= Html_head_liste("sicavselachat");
    $liste = listvaleur();
    if(empty($liste) || !is_array($liste)) { return ""; }
    $codesicav = "";
    $nomsicav = "";
    $urlname = "";
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $jpossede = null;
    foreach ($liste as $key => $value)
    {
        if($value["codesicav"] == $sicavselect)
        {
            $addon = "SELECTED";
            $nomsicav = $value["nomsicav"];
            $codesicav = $value["codesicav"];
            $urlname = $value["yahooname"];
            $jpossede = joueur_possede($value["codesicav"], $id_compte);
        } else {
            $addon = "";
        }
        $echo .= "<OPTION $addon VALUE=\"".$value["codesicav"]."\">".$value["nomsicav"];
    }
    $echo .= "</SELECT>".Html_bouton("Submit",lang(31))."</form></center>";
    if($sicavselect <> "")
    {
        $valeuraction = getvaleur(sec($codesicav));
        $cashback = is_object($internaute) && isset($internaute->cashback) ? $internaute->cashback : 0;
        if($valeuraction != 0)
        {
            $nbactions = getnbactionmax($cashback,$valeuraction);
        } else {
            $nbactions = 0;
        }
        $enteteformulaire = jscript_av($nbactions)."<form name=\"form\" method=\"post\" action=\"index.php?do=achataction\"  onSubmit=\"Submit.disabled=true;\">";
        $enteteformulaire .= "<input type=\"hidden\" name=\"sens\" value=\"achat\"><input type=\"hidden\" name=\"ansval\" value=\"$valeuraction\"><input type=\"hidden\" name=\"codesicav\" value=\"$sicavselect\">";
        $echo .= $enteteformulaire.opentab("align=\"center\"").openligne("","titre2").opencol();

        $echo .= opentab("width=\"100%\"","invi").openligne("","invi").opencol("width=\"20\" ").htm_iconinfo($urlname,$nomsicav).closecol().opencol(" align=\"center\"");
        $echo .= openfont("titre1").$nomsicav.closefont().": $valeuraction € / ".lang(28);

        $echo .= closecol().opencol("width=\"20\" ").htm_iconhelp("formachat");
        $echo .= closecol().closeligne().closetab();
        $echo .= closecol().closeligne();
        $echo .= openligne().opencol();

        $echo .= opentab("width=\"100%\"","invi");
        $echo .= openligne().opencol();
        $echo .= lang(29);
        $echo .= closecol().opencol();
        $liste = [];
        $jpos_nomb = is_object($jpossede) ? $jpossede->nombsicav : 0;
        if($jpos_nomb < 0 && $nbactions > 0)
        {
            $pourcpossede = round(abs($jpos_nomb)/$nbactions*100,4);
            if($pourcpossede*.25 <= 100) $liste[strval(round($pourcpossede*.25,4))] = "25 % ".lang(147);
            if($pourcpossede*.50 <= 100) $liste[strval(round($pourcpossede*.50,4))] = "50 % ".lang(147);
            if($pourcpossede*.75 <= 100) $liste[strval(round($pourcpossede*.75,4))] = "75 % ".lang(147);
            if($pourcpossede <= 100) $liste[strval($pourcpossede)] = "100 % ".lang(147);
        }
        $liste += array('25' => '25 %', '50' => '50 %', '75' => '75%','100' => '100%');
        $echo .= Html_liste("nb1",$liste,"onChange=\"SetValeur(this.value)\"");
        $echo .= lang(30)."<br><br>";
        $echo .= Html_texte("nb2","25","3","3","onKeyUp=\"SetValeur(this.value)\"")." % ".lang(30)."<br><br>";
        $echo .= closecol().closeligne();
        $echo .= closetab();

        $echo .= closecol().closeligne();
        $echo .= openligne().opencol("align=\"center\"");
        $seuil_active = (is_object($internaute) && isset($internaute->seuil) && $internaute->seuil == 1);
        $plage_active = (is_object($internaute) && isset($internaute->plage) && $internaute->plage == 1);

        if($seuil_active && !$plage_active)
        {
            $echo .= Html_radio("seuil","0",lang(68),"checked","onclick=\"sela_click1();\"").Html_radio("seuil","1",lang(150),"","onclick=\"sela_click2();\"")."<br><br>";
        }
        if($seuil_active && $plage_active)
        {
            $echo .= Html_radio("seuil","0",lang(68),"checked","onclick=\"sela_click1();\"").Html_radio("seuil","1",lang(149),"","onclick=\"sela_click2();\"")."<br><br>";
        }
        $echo .= lang(32).Html_texte("nbr",intval($nbactions*.25),"8","15","onKeyUp=\"ChgQuant()\"");
        if($seuil_active && !$plage_active)
        {
            $echo .= "<input type=\"hidden\" name=\"valmin\" value=\"0\">";
            $echo .= " ".lang(9)." ".lang(38).Html_texte("valmax",$valeuraction,"8","15"," style=\"visibility:hidden\" ")." €".lang(59)."<br>
            ".Html_radio("select","1",lang(17),"").Html_radio("select","0",lang(183),"checked")."
            <br><br>".lang(39).Html_texte("tempsmin",finjour(),"22","16")."
            <br><br>";
        } else {
            if($plage_active)
            {
                $echo .= " ".lang(9)."<br><br>".lang(151).Html_texte("valmin",0,"8","15"," style=\"visibility:hidden\" ")." ".lang(38)." ".Html_texte("valmax",$valeuraction,"8","15"," style=\"visibility:hidden\" ")." €<br>
                ".Html_radio("select","1",lang(17),"").Html_radio("select","0",lang(183),"checked")."
                <br><br>".lang(39).Html_texte("tempsmin",finjour(),"22","16")."
                <br><br>";
            } else {
                $echo .= " /$nbactions ".lang(9);
                $echo .= closecol().closeligne();
                $echo .= openligne().opencol("align=\"center\"");
                $echo .= "<input type=\"hidden\" name=\"valmin\" value=\"0\">
                <input type=\"hidden\" name=\"valmax\" value=\"$valeuraction\">
                <input type=\"hidden\" name=\"select\" value=\"0\">
                <input type=\"hidden\" name=\"tempsmin\" value=\"".finjour()."\">";
            }
        }
        $echo .= Html_bouton("Submit",lang(31));
        $echo .= closecol().closeligne();
        $echo .= closetab()."</form>";
    }
    return $echo;
}

function formvente($sicavselect,$liste=0)
{
    global $do,$internaute,$skinrep;
    $is_vad = (is_object($internaute) && isset($internaute->vad) && $internaute->vad);
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    if(($liste === 0 || $sicavselect != tabvaleurouzero($_POST,'sicavselvendr')) && !$is_vad)
    {
        $liste = portefeuille_joueur();
    }

    if($is_vad)
    {
        $liste = listvaleur();
    }

    $echo = "<center>".lang(34)." :<br><br><form method=\"post\" action=\"index.php?do=";
    $avpage = (is_object($internaute) && isset($internaute->avautrepage)) ? $internaute->avautrepage : 0;
    if($avpage == 0)
    {
        $echo .= "formachatvente&info=".(defined('ADSENSEKEYWORD') ? ADSENSEKEYWORD : '');
    } else {
        $echo .= "formventeseul&info=".(defined('ADSENSEKEYWORD') ? ADSENSEKEYWORD : '');
    }
    $echo .= "\">";
    $echo .= Html_head_liste("sicavselvendr");
    if(empty($liste) || !is_array($liste)) { return ""; }
    $valeuraction = 0;
    $nomsicav = "";
    $codesicav = "";
    $urlname = "";
    $nbactions = 0;
    $jpossede = new stdClass();
    $jpossede->nombsicav = 0;

    foreach ($liste as $key => $value)
    {
        if($value["codesicav"] == $sicavselect)
        {
            $addon = "SELECTED";
            $jpossede->nombsicav = 0;
            if(isset($value["nombsicav"]) && $value["nombsicav"])
            {
                $nbactions = $value["nombsicav"];
            } else {
                $jpossede = joueur_possede($value["codesicav"],$id_compte);
                if(is_object($jpossede) && $jpossede->nombsicav < 0) $jpossede->nombsicav = 0;
                $pos_val = is_object($jpossede) ? $jpossede->nombsicav : 0;
                $nbactions = getnbactionmax(getmontantvadpossible($id_compte),$value["valeur"]) + $pos_val;
            }
            if(isset($value["valsicav"]) && $value["valsicav"])
                 $valeuraction = $value["valsicav"];
            else
                $valeuraction = $value["valeur"];
            $nomsicav = $value["nomsicav"];
            $codesicav = $value["codesicav"];
            $urlname = $value["yahooname"];
        } else {
            $addon = "";
        }
        $echo .= "<OPTION $addon VALUE=\"".$value["codesicav"]."\">".$value["nomsicav"];
    }
    $echo .= "</SELECT> ".Html_bouton("Submit",lang(34))."</form></center>";
    if($sicavselect <> "")
    {
        $enteteformulaire = jscript_av($nbactions)."<form name=\"form\" method=\"post\" action=\"index.php?do=venteaction\"  onSubmit=\"Submit.disabled=true;\">";
        $enteteformulaire .= "<input type=\"hidden\" name=\"sens\" value=\"vente\"><input type=\"hidden\" name=\"ansval\" value=\"$valeuraction\"><input type=\"hidden\" name=\"codesicav\" value=\"$sicavselect\">";
        $echo .= $enteteformulaire.opentab("align=\"center\"").openligne("","titre2").opencol();
        $echo .= opentab("width=\"100%\"","invi").openligne("","invi").opencol("width=\"20\" ").htm_iconinfo($urlname,$nomsicav).closecol().opencol(" align=\"center\"");
        $echo .= openfont("titre1").$nomsicav.closefont().": $valeuraction € / ".lang(28);
        $echo .= closecol().opencol("width=\"20\" ").htm_iconhelp("formvente");
        $echo .= closecol().closeligne().closetab();
        $echo .= closecol().closeligne();
        $echo .= openligne().opencol();

        $echo .= opentab("width=\"100%\"","invi");
        $echo .= openligne().opencol();
        $echo .= lang(29);
        $echo .= closecol().opencol();
        if(!$is_vad)
        {
            $liste = array('25' => '25 %', '50' => '50 %', '75' => '75%','100' => '100%');
        } else {
            $liste = array('25' => '25 % '.lang(278), '50' => '50 % '.lang(278), '75' => '75% '.lang(278),'100' => '100% '.lang(278));
        }
        $jpos_nomb = (is_object($jpossede) && isset($jpossede->nombsicav)) ? $jpossede->nombsicav : 0;
        if($jpos_nomb > 0 && $nbactions > 0)
        {
            $pourcpossede = round($jpos_nomb/$nbactions*100,4);
            $liste[strval(round($pourcpossede*.25,4))] = "25 % ".lang(24);
            $liste[strval(round($pourcpossede*.50,4))] = "50 % ".lang(24);
            $liste[strval(round($pourcpossede*.75,4))] = "75 % ".lang(24);
            $liste[strval($pourcpossede)] = "100 % ".lang(24);
        }
        $echo .= Html_liste("nb1",$liste,"onChange=\"SetValeur(this.value)\"");
        $echo .= lang(33)."<br><br>";
        $echo .= Html_texte("nb2","25","3","3","onKeyUp=\"SetValeur(this.value)\"")." % ".lang(33)."<br><br>";
        $echo .= closecol().closeligne();
        $echo .= closetab();

        $echo .= closecol().closeligne();
        $echo .= openligne().opencol("align=\"center\"");
        $seuil_active = (is_object($internaute) && isset($internaute->seuil) && $internaute->seuil == 1);
        $plage_active = (is_object($internaute) && isset($internaute->plage) && $internaute->plage == 1);
        if($seuil_active)
        {
            $echo .= Html_radio("seuil","0",lang(68),"checked","onclick=\"selv_click1();\"").Html_radio("seuil","1","A seuil","","onclick=\"selv_click2();\"")."<br><br>";
        }
        $echo .= lang(35).Html_texte("nbr",intval($nbactions*.25),"8","15","onKeyUp=\"ChgQuant()\"");

        if($seuil_active && !$plage_active)
        {
            $echo .= "<input type=\"hidden\" name=\"valmax\" value=\"-1\">";
            $echo .= " ".lang(9)." ".lang(38).Html_texte("valmin",$valeuraction,"8","15"," style=\"visibility:hidden\" ")." € ".lang(42)."<br>
            ".Html_radio("select","1",lang(17),"").Html_radio("select","0",lang(183),"checked")."
            <br><br>".lang(39).Html_texte("tempsmin",finjour(),"22","16")."
            <br><br>";
        } else {
            if($plage_active)
            {
                $echo .= " ".lang(9)."<br><br>".lang(151).Html_texte("valmin",$valeuraction,"8","15"," style=\"visibility:hidden\" ")." ".lang(38)." ".Html_texte("valmax",-1,"8","15"," style=\"visibility:hidden\" ")." €<br>";
                $echo .= Html_radio("select","1",lang(17),"").Html_radio("select","0",lang(183),"checked")."
                <br><br>".lang(39).Html_texte("tempsmin",finjour(),"22","16")."
                <br><br>";
            } else {
                $echo .= " /$nbactions ".lang(9);
                $echo .= closecol().closeligne();
                $echo .= openligne().opencol("align=\"center\"");
                $echo .= "<input type=\"hidden\" name=\"valmin\" value=\"$valeuraction\">
                <input type=\"hidden\" name=\"valmax\" value=\"-1\">
                <input type=\"hidden\" name=\"select\" value=\"0\">
                <input type=\"hidden\" name=\"tempsmin\" value=\"".finjour()."\">";
            }
        }

        $echo .= Html_bouton("Submit",lang(34));
        $echo .= closecol().closeligne();
        $echo .= closetab()."</form>";
    }
    return $echo;
}

function form_news($ligncour)
{
    $numligne = listmessagescount(0);
    if($ligncour < 0 || $ligncour > $numligne)
    {
        $ligncour = 0;
    }
    $maxligne = 2;
    $liste = get_messagelist($ligncour,$maxligne,0);
    $html = "<br>";
    if(is_array($liste) && count($liste) > 0)
    {
        $html .= opentab("width=\"90%\" align=\"center\" ").openligne("","titre").opencol().lang(90).closecol().closeligne().openligne("","invi").opencol();
        $html .= barrepage($numligne,$maxligne,$ligncour)."<br>".closecol().closeligne().openligne("","invi").opencol();
        foreach ($liste as $key => $value)
        {
            $corps = stripslashes($value["corps"]);
            $html .= opentab("width=\"100%\" align=\"center\" ").openligne("","titre").opencol().lang(56).$value["pseudonyme"].closecol().opencol().lang(57).date("j/m/y H:i:s",$value["datemess"]).closecol().opencol().lang(58).$value["titre"].closecol().closeligne();
            $html .= openligne().opencol("colspan=\"3\"").bbtohtml($corps).closecol().closeligne().closetab()."<br>";
        }
        $html .= "<br>".closecol().closeligne().openligne("","invi").opencol().barrepage($numligne,$maxligne,$ligncour).closecol().closeligne().closetab();
    } else {
        $html .= msgtab("Pas de Nouvelles.","Information");
    }
    return $html;
}

function pgaccueil($numligne)
{
    global $internaute;
    $corps = "";
    $is_logged = (is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 1);
    if(!$is_logged)
        $corps .= msgtab(txt_accueil(),lang(89));
    else
        $corps .= msgtab("<!-- Debut shoutbox - http://www.i-tchat.com --><iframe src=\"http://www.i-tchat.com/shoutbox/shoutbox.php?idShoutbox=44311\" width=\"100%\" height=\"270\" frameborder=\"0\" allowtransparency=\"true\" >Votre navigateur n'est pas compatible avec le <a href=\"http://www.i-tchat.com\" onClick=\"window.open(this.href+'?44311');\">tchat</a>, cliquez ici pour voir le <a href=\"http://www.i-tchat.com\" onClick=\"window.open(this.href+'?44311');\">tchat gratuit</a>.</iframe><br />Ouvrir le <a href=\"http://www.i-tchat.com\" onClick=\"window.open(this.href+'?44311');return false;\">tchat</a> dans une popup.<!-- Fin shoutbox -->","Chat avec les joueurs");
    $corps .= form_news($numligne);
    return menu($corps);
}

function newpart($titre,$contenu1="",$contenu2="",$contenu3="",$contenu4="",$contenu5="",$contenu6="",$contenu7="",$contenu8="")
{
    $html = openligne("","titre").opencol();
    $html .= "$titre :";
    $html .= closecol().closeligne().openligne().opencol();
    if($contenu1 != "") $html .= $contenu1.imgdot();
    if($contenu2 != "") $html .= $contenu2.imgdot();
    if($contenu3 != "") $html .= $contenu3.imgdot();
    if($contenu4 != "") $html .= $contenu4.imgdot();
    if($contenu5 != "") $html .= $contenu5.imgdot();
    if($contenu6 != "") $html .= $contenu6.imgdot();
    if($contenu7 != "") $html .= $contenu7.imgdot();
    if($contenu8 != "") $html .= $contenu8.imgdot();
    $html .= closecol().closeligne();
    if(strlen($contenu1.$contenu2.$contenu3.$contenu4.$contenu5.$contenu6) > 0)
        return $html;
    else
        return "";
}

function menu($corps)
{
    global $internaute;
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $is_logged = is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel >= 1;
    $is_admin = is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel > 1;
    $act_grp = defined('ACTIVATION_GROUPE') ? ACTIVATION_GROUPE : 0;
    $ads_kw = defined('ADSENSEKEYWORD') ? ADSENSEKEYWORD : '';

    $html = opentab("align=\"center\" width=\"100%\"","invi").openligne("","invi").opencol("width=\"70%\" valign=\"top\"");
    $html .= $corps;
    $html .= closecol().opencol("valign=\"top\" width=\"30%\"")."<br>";
    $html .= opentab("width=\"100%\"");
    $html .= newpart(lang(95),
                    retiftrue("<a href=\"index.php?do=formachatvente&info=$ads_kw\">".lang(6)."</a>",$is_logged),
                    retiftrue("<a href=\"index.php?do=historique\">".lang(12)."</a>",$is_logged),
                    retiftrue("<a href=\"index.php?do=listemessage\">".lang(62)."</a>",$is_logged),
            retiftrue("<a href=\"index.php?do=forminscription\">".lang(7)."</a>",!$is_logged),
            retiftrue("<a href=\"index.php?do=formrecuppass\">".lang(101)."</a>",!$is_logged));
    $html .= newpart(lang(221),
            retiftrue("<a href=\"index.php?do=lstactions\">".lang(127)."</a>",$is_logged),
            "<a href=\"index.php?do=classement\">".lang(13)."</a>",
            retiftrue("<a href=\"index.php?do=classementequipe\">".lang(229)."</a>",$act_grp));
    $html .= newpart(lang(97),
            retiftrue("<a href=\"index.php?do=profil\">".lang(222)."</a>",$is_logged),
            retiftrue("<a href=\"index.php?do=chgmdp\">".lang(272)."</a>",$is_logged),
            retiftrue("<a href=\"index.php?do=ajgroupe\">".lang(187)."</a>",!estmembregroupe($id_compte) && $act_grp && $is_logged),
            retiftrue("<a href=\"index.php?do=modifgroupe\">".lang(188)."</a>",estadmingroupe($id_compte) && $act_grp && $is_logged),
            retiftrue("<a href=\"index.php?do=quittegroupe\">".lang(202)."</a>",estmembregroupe($id_compte) && $act_grp && $is_logged),
            retiftrue("<a href=\"index.php?do=formadmin\">".lang(99)."</a>",$is_admin),
            retiftrue("<a href=\"index.php?do=formrazjoueur\">".lang(111)."</a>",$is_logged));
    $html .= newpart(lang(223),
                    "<a href=\"index.php?do=reglement\">".lang(98)."</a>",
                    "<a href=\"index.php?do=formhelp\">".lang(160)."</a>",
                    "<a href=\"index.php?do=formfaq\">".lang(166)."</a>");
    $html .= newpart(lang(224),
                    "<a href=\"index.php?do=contactauteur\">".lang(104)."</a>",
                    "<a href=\"index.php?do=showlstforums\">".lang(240)."</a>");
    $html .= newpart(lang(211),
                    "<a href=\"http://www.lobourse.com\" target=\"_blank\">Débuter en bourse avec le site Lobourse.com</a>");

    $html .= closecol().closeligne();
    $html .= closetab();
    $html .= "<br><br>".txtfuncjour();
    $html .= closecol().closeligne().closetab();
    return $html;
}

function txtfuncjour()
{
    $html = "";
    if(istableexist("stats"))
    {
        $stats = exeanspublicreq();
        if(is_object($stats)) {
            $html = sorttableau($stats->req,$stats->titre,"100");
        }
    }
    return $html;
}

function imgdot()
{
    return "<br><img src=\"skin/dot.gif\" width=\"1\" height=\"12\"><br>";
}

function formrecuppass()
{
    return lang(103)."<br><br><center>".openform("dosendpass").lang(102)."&nbsp;&nbsp;&nbsp;".Html_texte("pseudo","",30,60)."<br><br>".Html_bouton("valide","Valider")."</form></center>";
}

function formsendpass($pseudo)
{
    if(strlen(strchr($pseudo,"@")) == 0)
    {
        $player = getinternauteinfo($pseudo);
    } else {
        $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
        $player = chercheinternaute(0,$connexion,$pseudo);
    }
    if(!is_object($player) || empty($player->passe))
    {
        return lang(107);
    } else {
        $adresse = (defined('ADDRNT') ? ADDRNT : '')."/index.php?do=rtrmdp&c=$player->pseudonyme&m=".md5($player->idcompte.$player->email.$player->passe);
        $corps = "Message généré automatiquement\n\n  Vous avez demandé à recevoir un nouveau mot de passe, afin de le recevoir rendez vous sur cette page :\n\n <a href=\"$adresse\">$adresse</a> \n\n Si le lien ne fonctionne pas allez sur :\n\n $adresse \n\n Si vous n'avez pas fait cette demande alors ne cliquez pas sur le lien pour que rien de change, en cas d'abus veuillez répondre à ce mail en informant sur l'abus.";
        $titre = "Demande de nouveau mot de passe";
        envoimail($player->email, $titre,$corps);
        return lang(109);
    }
}

function dosendpass($pseudo,$md5mdp)
{
    $player = getinternauteinfo($pseudo);
    if(is_object($player) && $md5mdp == md5($player->idcompte.$player->email.$player->passe))
    {
        $nouvmdp = substr(md5(getmicrotime()), 0, 5);
        setmdp($player->idcompte,$nouvmdp);
        $corps = "Message généré automatiquement \nCONSERVEZ CE MESSAGE !!!\n  :\n\n Voici vos informations :\n \n Email:$player->email \n Mot de passe:$nouvmdp";
        $titre = "Votre mot nouveau mot de passe";
        envoimail($player->email,$titre,$corps);
        return lang(108);
    } else {
        return lang(110);
    }
}

function frmrazjoueur()
{
    return msgtab(sec(lang(116))."<br>".lang(117)."<br><br><form METHOD=\"POST\" ACTION=\"index.php?do=doraz\">".lang(118)." :
".Html_pass("mdp","",30,50)." &nbsp;&nbsp;&nbsp;".lang(143)." : ".html_texte("validok","",10,2).
"&nbsp;&nbsp;&nbsp;".Html_bouton("valide","R.A.Z.")."<br>".
Html_radio("optiondel","1",lang(144),"")."<br>".
Html_radio("optiondel","0",lang(111),"CHECKED")
."</form> ",lang(119));
}

function doraz($mdp,$vok,$optdel)
{
    global $internaute;
    if(!is_object($internaute)) return "";
    if(md5($mdp) <> $internaute->passe)
    {
        return(msgtab(lang(26),lang(120)));
    } else {
        if($vok <> "OK")
        {
            return(msgtab(lang(121),lang(120)));
        } else {
            if(estadmingroupe($internaute->idcompte))
                fctgetoffteammaster($internaute->idcompte);
            fctdoraz($internaute->idcompte,$optdel);
            $idmess = $optdel ? 145 : 123;
            return(msgtab(lang($idmess),lang(146)));
        }
    }
}

function lstAction($typeAffiche="")
{
    global $internaute;
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $lstCodeSico = "";
    if($typeAffiche <> "")
    {
        if($typeAffiche == "secteur") $lstCodeSico = getCodesSicoSecteurPortef($id_compte);
        if($typeAffiche == "portef") $lstCodeSico = getCodesSicoPortef($id_compte);
        if($typeAffiche == "cote") $lstCodeSico = getCodesSicoCote($id_compte);
    } else {
        $lstCodeSico = getCodesSicoSecteurPortef($id_compte);
    }

    $sicavlist = get_sicavcat($lstCodeSico);
    $portef = portefeuille_joueur();
    $tabportef = [];
    if(is_array($portef) && count($portef) > 0)
    {
        $tot = 0;
        $cnt_portef = count($portef);
        for($i=0; $i<$cnt_portef; $i++)
        {
            $tot += $portef[$i]["valtotsicav"] * sign(sign($portef[$i]["valtotsicav"])+1);
        }
        for($i=0; $i<$cnt_portef; $i++)
        {
            if($tot > 0 && $portef[$i]["valtotsicav"] > 0)
                $tabportef[$portef[$i]["codesicav"]] = round(($portef[$i]["valtotsicav"] * sign(sign($portef[$i]["valtotsicav"])+1))/$tot*100,2);
        }
    }
    $tabportefall = get_acttotpossede();
    $tabcouleurall = couleurfonctionclasse($tabportefall);
    $tabcouleur = couleurfonctionclasse($tabportef);

    $html = "<center>".html_lien(lang(154),getnewurl("format","tous"))." ".html_lien(lang(155),getnewurl("format","secteur"))." ".html_lien(lang(156),getnewurl("format","portef"))." ".html_lien(lang(157),getnewurl("format","cote"))."</center><br>";
    $html .= opentab(" align=center width=\"90%\" ");
    $titre = openligne("","titre").opencol().lienordre("nomaction",lang(15)).closecol().opencol().lienordre("valeuraction",lang(112)).closecol().opencol("colspan=\"2\"").lienordre("part",lang(124)).closecol().opencol("colspan=\"2\"").lienordre("partjoueur",lang(125)).closecol().opencol().lang(6).closecol().closeligne();
    $html .= openligne("","titre2").opencol().lang(126)." &nbsp;&nbsp;&nbsp;&nbsp;".html_lien(lang(153),getnewurl("champ","")).closecol().opencol().htm_iconhelp("formlstactions").closecol().closeligne();
    $html .= opentab(" align=center width=\"90%\" ");
    $ans = "";
    if(array_key_exists("champ",$_GET)) $html .= $titre;

    $is_vad = (is_object($internaute) && isset($internaute->vad) && $internaute->vad);
    while($ligne = LigneSuivante($sicavlist))
    {
        if(($ans <> $ligne->libellesecteur || $ans == "") && !array_key_exists("champ",$_GET))
        {
            $html .= openligne("","titre").opencol("colspan=\"7\"").$ligne->libellesecteur.closecol().closeligne();
            $html .= $titre;
            $ans = $ligne->libellesecteur;
        }
        $html .= openligne("titre").opencol().htm_iconinfo($ligne->yahooname,$ligne->nom)."&nbsp;&nbsp;".$ligne->nom.closecol().opencol().$ligne->valeur." €".closecol().opencol("width=\"30\" bgcolor=\"".htmlourien(tabvaleurouzero($tabcouleurall,$ligne->codesico))."\"")."&nbsp;".closecol().opencol().round(tabvaleurouzero($tabportefall,$ligne->codesico),2)." %".closecol().opencol("width=\"30\" bgcolor=\"".htmlourien(tabvaleurouzero($tabcouleur,$ligne->codesico))."\"")."&nbsp;&nbsp;&nbsp;".closecol().opencol().round(tabvaleurouzero($tabportef,$ligne->codesico),2)." %".closecol().opencol()."<a href=\"".lnkachat($ligne->codesico)."\">".lang(31)."</a>"."&nbsp;&nbsp;&nbsp;";
        if($is_vad)
            $csico = $ligne->codesico;
        else
            $csico = isset($tabportef[$ligne->codesico]) ? intval($tabportef[$ligne->codesico]) : 0;
        $html .= lnkvente($ligne->codesico,$csico,lang(34));
        $html .= closecol().closeligne();
    }
    $html .= closetab();
    return $html;
}

function frminvitejoueur($idgroupe)
{
    $form = "<br>".opentab("align=\"center\"").openligne("","titre").opencol("colspan=\"2\"").lang(213).closecol().closeligne();
    $form .= "<form method=\"POST\" name=\"frminvite\" action=\"index.php?do=invitejoueur\">";
    $form .= openligne().opencol("align=\"right\"").lang(214)." :".closecol().opencol();

    $joueurs = getjoueursnotingroupe();
    $listejoueurs = [];
    while($ligne = LigneSuivante($joueurs))
        $listejoueurs[$ligne->idcompte] = $ligne->pseudonyme;
    $form .= Html_liste("idjoueur",$listejoueurs,"","");
    $form .= "<INPUT type=\"hidden\" name=\"titre\" value=\"".lang(215)."\">";
    $form .= "<INPUT type=\"hidden\" name=\"corps\" value='".lang(216)."\n[url=\"".(defined('ADDRNT') ? ADDRNT : '')."/index.php?do=acceptinvite&idgroupe=$idgroupe\"]".lang(218)."[/url]'>";
    $form .= closecol().closeligne();
    $form .= openligne().opencol("colspan=\"2\" align=\"center\" ").Html_bouton("envoyer",lang(217))."</form>";
    $form .= "<br>".closecol().closeligne().closetab();
    return $form;
}

function frmgroupeaction($idgroupe)
{
    $form = "<br>".opentab("align=\"center\"").openligne("","titre").opencol("colspan=\"2\"").lang(225).closecol().closeligne();
    $form .= openligne().opencol("colspan=\"2\"")."<a href=\"?do=supprtoutinvite\">".lang(226)."</a>".closecol().closeligne();
    $form .= closetab();
    return $form;
}

function frmexclurejoueur($idgroupe)
{
    $form = "<br>".opentab("align=\"center\"").openligne("","titre").opencol("colspan=\"2\"").lang(202).closecol().closeligne();
    $form .= "<form method=\"POST\" name=\"frmexclusion\" action=\"index.php?do=exclurejoueur\">";
    $form .= openligne().opencol("align=\"right\"").lang(214)." :".closecol().opencol();

    $joueurs = getmembrebygroup($idgroupe);
    $listejoueurs = [];
    $listejoueurs[] = "";
    while($ligne = LigneSuivante($joueurs))
        $listejoueurs[$ligne->idcompte] = $ligne->pseudonyme;
    $form .= Html_liste("idcompteexclu",$listejoueurs,"",0);
    $form .= closecol().closeligne();
    $form .= openligne().opencol("colspan=\"2\" align=\"center\" ").Html_bouton("envoyer",lang(203))."</form>";
    $form .= "<br>".closecol().closeligne().closetab();
    return $form;
}

function frmmodifajgroupe($idgroupe=0)
{
    global $internaute;
    $form = "";
    if($idgroupe > 0)
    {
        $form .= frminvitejoueur($idgroupe);
        $form .= frmgroupeaction($idgroupe);
    }
    $groupe = new stdClass();
    $groupe->urlsite = "http://";
    $groupe->titregroupe = "";
    $groupe->initialgroupe = "";
    $groupe->descriptiongroupe = "";
    if($idgroupe == 0)
    {
        $laction = "doajgroupe";
        $titre = lang(187);
    } else {
        $laction = "domodifgroupe";
        $titre = lang(188);
        if(is_object($internaute) && isset($internaute->idcompte))
            $groupe = getgroupbyadmin($internaute->idcompte);
    }

    $form .= jscript_groupe()."<br>".opentab("align=\"center\"").openligne("","titre").opencol("colspan=\"2\"").$titre.closecol().closeligne();
    $form .= openligne("","").opencol("colspan=\"2\"").lang(201).closecol().closeligne();
    $form .= "<form method=\"POST\" name=\"frmajmodifgroupe\"   onSubmit=\"return test();\" action=\"index.php?do=$laction\">";
    $form .= openligne().opencol("align=\"right\"").lang(189)." :".closecol().opencol().Html_texte("titreeq",$groupe->titregroupe,50,250).closecol().closeligne();
    $form .= openligne().opencol("align=\"right\"").lang(190)." :".closecol().opencol().Html_texte("titreeqcourt",$groupe->initialgroupe,25,5).closecol().closeligne();
    $form .= openligne().opencol("align=\"right\"").lang(192)." :".closecol().opencol();
    if($idgroupe == 0)
    {
        $form .= is_object($internaute) ? $internaute->pseudonyme : '';
    } else {
        $joueurs = getmembrebygroup($idgroupe);
        $listejoueurs = [];
        while($ligne = LigneSuivante($joueurs))
            $listejoueurs[$ligne->idcompte] = $ligne->pseudonyme;
        $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
        $form .= Html_liste("idchef",$listejoueurs,"",$id_compte);
    }
    $form .= closecol().closeligne();
    $form .= openligne().opencol("align=\"right\"")."* ".lang(198)." :".closecol().opencol()."<INPUT type=\"hidden\" name=\"idgroupe\" value=\"$idgroupe\">".Html_texte("urlsite",$groupe->urlsite,50,250).closecol().closeligne();

    $form .= openligne().opencol("colspan=\"2\" align=\"center\" ").
    lang(191)." :<br><br>".Html_textezone("corps",15,50,$groupe->descriptiongroupe).
    "<br><br>".Html_bouton("envoyer",lang(169))."</form>"
    ."<br><br>".lang(206).closecol().closeligne().closetab();
    $form .= "<br>";

    if($idgroupe > 0)
    {       
        $fin_jour = defined('EQUIPE_FINJOURVIRER') ? EQUIPE_FINJOURVIRER : 31;
        if(date("d") <= $fin_jour)
            $form .= frmexclurejoueur($idgroupe);
        else
            $form .= msgtab(lang(233),lang(146));
    }

    return $form;
}

function frmquittegroupe()
{
    $fin_jour = defined('EQUIPE_FINJOURVIRER') ? EQUIPE_FINJOURVIRER : 31;
    if(date("d") > $fin_jour)
        return msgtab(lang(204),lang(146));
    else
        return msgtab(lang(231)."<br>".lang(117)."<br><br><form METHOD=\"POST\" ACTION=\"index.php?do=doquittegroupe\">&nbsp;&nbsp;&nbsp;".lang(143)." : ".html_texte("validok","",10,2).
        "&nbsp;&nbsp;&nbsp;".Html_bouton("valide",lang(202))."<br>"."</form> ",lang(202));
}

function doquittegroupe($vok)
{
    global $internaute;
    if(!is_object($internaute)) return "";
    if($vok <> "OK")
    {
        return(msgtab(lang(121),lang(120)));
    } else {
        if(estadmingroupe($internaute->idcompte))
            fctgetoffteammaster($internaute->idcompte);
        else
            fctgetoffteam($internaute->idcompte);
        return(msgtab(lang(232),lang(202)));
    }
}

function doexcluregroupe($idcompteexclu)
{
    global $internaute;
    if(!is_object($internaute)) return "";
    $groupadmin = getgroupbymembre($internaute->idcompte);
    $groupmembre = getgroupbymembre($idcompteexclu);
    if(is_object($groupmembre) && is_object($groupadmin) && $groupmembre->idgroupe == $groupadmin->idgroupe)
    {
        if(estadmingroupe($internaute->idcompte))
        {
            if($internaute->idcompte == $idcompteexclu)
                fctgetoffteammaster($internaute->idcompte);
            else
                fctgetoffteam($idcompteexclu);
        }
        return(msgtab(lang(234),lang(202)));
    }
    return "";
}

function tabgroupeprofil($idgroupe)
{
    global $internaute;
    $form = "";
    $infogroupe = getinfogroupe($idgroupe);
    if(is_object($infogroupe) && $infogroupe->idgroupe > 0)
    {
        $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
        $form .= "<br>".opentab("align=\"center\"").openligne("","titre").opencol("colspan=\"2\"")."$infogroupe->titregroupe [$infogroupe->initialgroupe]".closecol().closeligne();
        $form .= openligne("","").opencol("colspan=\"2\"").lang(191)." :".closecol().closeligne();
        $form .= openligne("","").opencol("colspan=\"2\"").$infogroupe->descriptiongroupe.closecol().closeligne();
        $form .= openligne().opencol("align=\"left\"").lang(192)." :".closecol().opencol().html_lien($infogroupe->pseudonyme,"do=nouvmessage&idjoueur=$infogroupe->idcompte").closecol().closeligne();
        $form .= openligne().opencol("align=\"left\"").lang(236)." :".closecol().opencol().print_reward($infogroupe->medor,$infogroupe->medargent,$infogroupe->medbronze).closecol().closeligne();
        $form .= openligne().opencol("align=\"left\"").lang(198)." :".closecol().opencol()."<a href=\"$infogroupe->urlsite\" target=\"_blank\">$infogroupe->urlsite</a>".closecol().closeligne();
        $form .= retiftrue(openligne().opencol("align=\"left\"").lang(271)." :".closecol().opencol().html_lien(lang(240),"do=showlstsujets&idforum=$infogroupe->idforum").closecol().closeligne(),forum_peutlire($id_compte,$infogroupe->idforum));
        $form .= openligne("","").opencol("colspan=\"2\"").lang(235)." :".closecol().closeligne();
        $res = getcompositionequipe($idgroupe);
        $form .= openligne("","").opencol("colspan=\"2\"");
        $form .= opentab("width=\"100%\"").openligne("","titre").opencol().lienordre("Pseudonyme",lang(21)).closecol().opencol().lienordre("Dateinscr",lang(238)).closecol().opencol().lienordre("Capitalinscr",lang(237)).closecol().opencol().lienordre("Portefeuille",lang(24)).closecol().opencol().lienordre("Plusvalue",lang(22)).closecol().closeligne();
        while($ligne = LigneSuivante($res))
        {
            $form .= openligne().opencol().$ligne->pseudonyme.closecol().opencol().$ligne->dateinscription.closecol().opencol().$ligne->capitalinscr." €".closecol().opencol().$ligne->capital." €".closecol().opencol().$ligne->prog." %".closecol().closeligne();
        }
        $form .= closetab().closecol().closeligne();
        $form .= openligne().opencol("colspan=\"2\" align=\"center\" ")."".closecol().closeligne().closetab();
        $form .= "<br>";
    }
    return $form;
}

function lstforums()
{
    global $skinrep,$internaute;
    $reqforums = get_listeforums();
    $html = "<br>".opentab("align=\"center\" width=\"90%\" ");
    $anssection = "";
    $html .= openligne("","titre2").opencol("colspan=\"2\"")."<a href=\"\">".lang(158)."</a>".closecol().opencol().lang(243).closecol().opencol().lang(244).closecol().
    "<th>".lang(245)."</th>".closeligne();

    $toutvu = (is_object($internaute) && isset($internaute->toutvuforum)) ? $internaute->toutvuforum : mktime(1,0,0,date("m"),date("d"),date("y"));
    $is_admin = (is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel > 1);

    while($lignefo = LigneSuivante($reqforums))
    {
        if($anssection != $lignefo->libellesection)
        {
            $anssection = $lignefo->libellesection;
            $html .= openligne("","titre").opencol("colspan=\"5\"").$lignefo->libellesection.closecol().closeligne();
        }
        if($lignefo->notif_new && $lignefo->nbsujets > 0 && !($lignefo->datepost < $toutvu))
            $lnk = "<img src=\"$skinrep/nouvmess.png\" border=\"0\" TITLE=\"".lang(247)."\">";
        else
            $lnk = "<img src=\"$skinrep/pasnouvmess.png\" border=\"0\" TITLE=\"".lang(246)."\">";

        $html .= openligne("","").opencol("width=\"25\"").$lnk.closecol().
        opencol("width=\"80%\"")."<a href=\"?do=showlstsujets&idforum=".$lignefo->frmid."\">$lignefo->nomforum</a>"."<br>".$lignefo->descriptionforum.retiftrue("<div align=right>".html_lien("Synchroniser","do=syncforum&idforum=$lignefo->frmid")."</div>",$is_admin).closecol().opencol("align=\"center\"")."$lignefo->nbsujets".closecol().opencol("align=\"center\"")."$lignefo->nbmessages".closecol().
        opencol("width=\"20%\"")."<nobr>".retiftrue(date("j M Y H:i a",$lignefo->datepost)."</nobr><br>$lignefo->pseudonyme ".html_lien("<img src=\"$skinrep/goto.gif\" border=\"0\" TITLE=\"".lang(249)."\">","do=showlstposts&idsujet=$lignefo->idsujet&last=1#last"),$lignefo->idsujet,lang(248)).closecol().closeligne();
    }
    $html .= closetab();
    return $html;
}

function lstsujets($idforum,$numligne)
{
    global $skinrep,$internaute;
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $toutvu = (is_object($internaute) && isset($internaute->toutvuforum)) ? $internaute->toutvuforum : mktime(1,0,0,date("m"),date("d"),date("y"));
    $from = $numligne;
    $reqforums = get_listesujets($idforum,$from,NB_SUJETS_PAR_PAGE);
    $infoforum = get_infoforum($idforum);

    if(!forum_peutlire($id_compte,$idforum))
        return msgtab(lang(260),lang(261));
    $html = "";
    $nb_sujets = is_object($infoforum) ? $infoforum->nbsujets : 0;
    $nom_forum = is_object($infoforum) ? $infoforum->nomforum : '';
    $nb_messages = is_object($infoforum) ? $infoforum->nbmessages : 0;
    $barre = barrepage($nb_sujets,NB_SUJETS_PAR_PAGE,$numligne,"&idforum=$idforum");

    $html .= $barre."<br>".opentab("align=\"center\" width=\"90%\" ");
    $html .= openligne("","titre2")."<th colspan=\"2\" align=\"left\">"."<a href=\"?do=showlstforums\">".lang(158)."</a> -&#62; <a href=\"\">".$nom_forum."</a></th><th>".lang(251)."</th><th>".lang(252)."</th>".
    "<th>".lang(253)."</th><th>".lang(245)."</th>".closeligne();
    if(forum_peutposter($id_compte,$idforum))
        $html .= openligne("","titre").opencol("colspan=\"6\"")."<STRONG>".html_lien(lang(255),"do=forumpostmessage&idforum=$idforum")."</STRONG>".closecol().closeligne();
    if($nb_messages > 0)
    {
        while($lignefo = LigneSuivante($reqforums))
        {
            if($lignefo->notif_new && !($lignefo->datepost < $toutvu))
                $lnk = "<img src=\"$skinrep/nouvmess.png\" border=\"0\" TITLE=\"".lang(247)."\">";
            else
                $lnk = "<img src=\"$skinrep/pasnouvmess.png\" border=\"0\" TITLE=\"".lang(246)."\">";

            $html .= openligne("","").opencol("width=\"25\"").$lnk.closecol().
            opencol("width=\"80%\"").html_lien($lignefo->txtsujet,"do=showlstposts&idsujet=".$lignefo->numsujet).closecol().opencol("align=\"center\"")."$lignefo->pseudoauteur".closecol().opencol("align=\"center\"")."$lignefo->s_nbmessages".closecol().opencol("align=\"center\"")."$lignefo->nblectures".closecol().
            opencol("width=\"20%\"")."<span class=\"gensmall\"><nobr>".date("j M Y H:i a",$lignefo->datepost)."</nobr><br>$lignefo->lastpseudo </span> ".html_lien("<img src=\"$skinrep/goto.gif\" border=\"0\" TITLE=\"".lang(249)."\">","do=showlstposts&idsujet=$lignefo->numsujet&last=1#last").closecol().closeligne();
        }
    } else {
        $html .= openligne("","").opencol("colspan=\"6\"")."<center>".lang(254)."</center>".closecol().closeligne();
    }

    $html .= closetab()."<br>$barre";
    return $html;
}

function lstposts($idsujet,$numligne,$seelast=false)
{
    global $skinrep,$internaute;
    $id_compte = is_object($internaute) && isset($internaute->idcompte) ? $internaute->idcompte : 0;
    $toutvu = (is_object($internaute) && isset($internaute->toutvuforum)) ? $internaute->toutvuforum : mktime(1,0,0,date("m"),date("d"),date("y"));
    $infosujet = get_infosujet($idsujet);
    if(!is_object($infosujet)) return msgtab("Sujet introuvable", "Erreur");

    if($seelast && $infosujet->s_nbmessages+1 > NB_MESS_PAR_PAGE && $numligne == 0)
    {
        $numligne = ceil((($infosujet->s_nbmessages+1)/NB_MESS_PAR_PAGE))*NB_MESS_PAR_PAGE - NB_MESS_PAR_PAGE;
    }

    $reqforums = get_listemessages($idsujet,$numligne,NB_MESS_PAR_PAGE);
    if(!forum_peutlire($id_compte,$infosujet->idforum))
        return msgtab(lang(260),lang(261));
    $html = "";
    if($seelast || !$numligne)
    {
        $lastmess = forum_getlastmessagesujet($idsujet);
        if(is_object($lastmess) && !($lastmess->datepost < $toutvu))
            setsujetlu($idsujet);
        if(is_object($internaute) && isset($internaute->authlevel) && $internaute->authlevel < 2)
            forum_inc_nblectures($idsujet);
    }
    $barre = barrepage($infosujet->s_nbmessages+1,NB_MESS_PAR_PAGE,$numligne,"last=0");

    $html .= $barre."<br>".opentab("align=\"center\" width=\"90%\" ");
    $html .= openligne("","titre2")."<th colspan=\"2\" align=\"left\">"."<a href=\"?do=showlstforums\">".lang(158)."</a> -&#62; <a href=\"?do=showlstsujets&idforum=$infosujet->idforum\">$infosujet->nomforum</a> -&#62; <a href=\"\">".$infosujet->txtsujet."</a></th>".closeligne();
    $html .= openligne("","titre")."<th>".lang(251)."</th>"."<th>".lang(256)."</th>".closeligne();
    $peutposter = forum_peutposter($id_compte,$infosujet->idforum);
    while($lignefo = LigneSuivante($reqforums))
    {
        $html .= openligne("","").opencol("width=\"20%\" valign=\"top\"").retiftrue("<a name=\"last\"></a>",$lignefo->idmessage==$infosujet->idlastmessage)."<STRONG>".$lignefo->auteur."</STRONG><br>".retiftrue(print_reward($lignefo->medor,$lignefo->medargent,$lignefo->medbronze)."<br><a href=\"?do=viewgroupeprofil&idgroupe=$lignefo->idgroupe\"><font class=\"gain\">[$lignefo->initialgroupe]</font></a>",$lignefo->idgroupe)."<br><br>".lang(244).": $lignefo->nbpostforum"."<br>".lang(22).": ".round(floatval($lignefo->prog),2)." %".closecol().
        opencol("valign=\"top\"")."<span class=\"gensmall\">".retiftrue("<div style=\"display: inline;float: right;\">".retiftrue(html_lien(lang(268),"do=forumpostmessage&idmessage=$lignefo->idmessage&idsujet=$lignefo->idsujet&edit=1")." ",forum_peut_editer($lignefo,$infosujet)).html_lien(lang(257),"do=forumpostmessage&idmessage=$lignefo->idmessage&idsujet=$lignefo->idsujet")."</div>",$peutposter).date("j M Y H:i a",$lignefo->datepost)."</span><hr>".bbtohtml(str_replace(array("&quot;"),array("\""), stripslashes($lignefo->contenu))).closecol().closeligne();
    }

    $html .= closetab()."<br>$barre";
    return $html;
}

function javaforum()
{
    return "<script language=\"JavaScript\" type=\"text/javascript\">
var imageTag = false;
var theSelection = false;
var clientPC = navigator.userAgent.toLowerCase();
var clientVer = parseInt(navigator.appVersion);
var is_ie = ((clientPC.indexOf(\"msie\") != -1) && (clientPC.indexOf(\"opera\") == -1));
var is_win = ((clientPC.indexOf(\"win\")!=-1) || (clientPC.indexOf(\"16bit\") != -1));

b_help = \"Texte gras: [b]texte[/b] (alt+b)\";
i_help = \"Texte italique: [i]texte[/i] (alt+i)\";
u_help = \"Texte souligné: [u]texte[/u] (alt+u)\";
q_help = \"Citation: [quote]texte cité[/quote] (alt+q)\";
c_help = \"Afficher du code: [code]code[/code] (alt+c)\";
l_help = \"Liste: [list]texte[/list] (alt+l)\";
o_help = \"Liste ordonnée: [list=]texte[/list] (alt+o)\";
p_help = \"Insérer une image: [img]http://image_url/[/img] (alt+p)\";
w_help = \"Insérer un lien: [url]http://url/[/url] ou [url=http://url/]Nom[/url] (alt+w)\";
a_help = \"Fermer toutes les balises BBCode ouvertes\";
s_help = \"Couleur du texte: [color=red]texte[/color] Astuce: #FF0000 fonctionne aussi\";
f_help = \"Taille du texte: [size=x-small]texte en petit[/size]\";

bbcode = new Array();
bbtags = new Array('[b]','[/b]','[i]','[/i]','[u]','[/u]','[quote]','[/quote]','[code]','[/code]','[list]','[/list]','[list=]','[/list]','[img]','[/img]','[url=\"','\"]Texte du lien[/url]');

function helpline(help) {
    document.post.helpbox.value = eval(help + \"_help\");
}

function getarraysize(thearray) {
    for (i = 0; i < thearray.length; i++) {
        if ((thearray[i] == \"undefined\") || (thearray[i] == \"\") || (thearray[i] == null))
            return i;
    }
    return thearray.length;
}

function arraypush(thearray,value) {
    thearray[ getarraysize(thearray) ] = value;
}

function arraypop(thearray) {
    thearraysize = getarraysize(thearray);
    retval = thearray[thearraysize - 1];
    delete thearray[thearraysize - 1];
    return retval;
}

function checkForm() {
    if (document.post.message.value.length < 2) {
        alert(\"Vous devez entrer un message avant de poster.\");
        return false;
    } else {
        bbstyle(-1);
        return true;
    }
}

function emoticon(text) {
    var txtarea = document.post.message;
    text = ' ' + text + ' ';
    txtarea.value += text;
    txtarea.focus();
}

function bbfontstyle(bbopen, bbclose) {
    var txtarea = document.post.message;
    txtarea.value += bbopen + bbclose;
    txtarea.focus();
}

function bbstyle(bbnumber) {
    var txtarea = document.post.message;
    txtarea.focus();
    if (bbnumber == -1) {
        while (bbcode[0]) {
            butnumber = arraypop(bbcode) - 1;
            txtarea.value += bbtags[butnumber + 1];
        }
        imageTag = false;
        return;
    }
    txtarea.value += bbtags[bbnumber];
    arraypush(bbcode,bbnumber+1);
}

function storeCaret(textEl) {
    if (textEl.createTextRange) textEl.caretPos = document.selection.createRange().duplicate();
}
</script>";
}

function forum_postmessage($idforum=0,$idsujet=0,$idmessage=0,$corps="",$edit=0)
{
    global $skinrep;
    $mess = null;
    $suj = null;
    if($idmessage > 0)
    {
        $mess = get_infomessage($idmessage);
        if(is_object($mess)) $idsujet = $mess->idsujet;
    }

    if($idsujet > 0)
    {
        $suj = get_infosujet($idsujet);
        if(is_object($suj)) $idforum = $suj->idforum;
    }

    if($idforum > 0)
    {
        $forum = get_infoforum($idforum);
    } else {
        return msgtab("Le numero de forum n'est pas spécifié","Erreur");
    }

    if($edit && !forum_peut_editer($mess,$forum))
    {
        return "";
    }
    $idmesssujet = forum_getidmessagesujet($idsujet);

    $hiddeninfos = "<input type=\"hidden\" name=\"idmessage\" value=\"$idmessage\"><input type=\"hidden\" name=\"edit\" value=\"$edit\"><input type=\"hidden\" name=\"idforum\" value=\"$idforum\"><input type=\"hidden\" name=\"idsujet\" value=\"$idsujet\">";

    $form = javaforum();
    $form .= "<form action=\"?do=doforumpostmessage\" method=\"post\" name=\"post\" onsubmit=\"return checkForm(this)\">".opentab("width=\"50%\" align=\"center\"");
    $form .= "
    ".openligne("","titre")."
        <th class=\"thHead\" colspan=\"2\" height=\"25\"><b>".lang(258)."</b></th>
    ".closeligne()."
    ".retiftrue(openligne()."
      <td class=\"row1\" width=\"22%\"><span class=\"gen\"><b>Sujet</b></span></td>
      <td class=\"row2\" width=\"78%\"> <span class=\"gen\">
        <input type=\"text\" name=\"subject\" size=\"45\" maxlength=\"60\" style=\"width:450px\" tabindex=\"2\" class=\"post\" value=\"".retiftrue(is_object($suj)?$suj->txtsujet:'',$edit && $idmesssujet==$idmessage)."\" />
        </span> </td>
    ".closeligne(),!$idsujet||($edit && $idmesssujet==$idmessage))."
    ".openligne()."
      <td class=\"row1\" valign=\"top\">
      ".opentab("cellpadding=\"5\" cellspacing=\"0\" ","invi")."
                ".openligne("align=\"center\"","invi")."
                  <td colspan=\"4\" class=\"gensmall\"><b>Smilies</b></td>
        ".closeligne()."
                ".openligne("align=\"center\" valign=\"middle\"","invi")."
                  <td><a href=\"javascript:emoticon(':D')\"><img src=\"$skinrep/smiles/icon_biggrin.gif\" border=\"0\" alt=\"Very Happy\" title=\"Very Happy\" /></a></td>
                  <td><a href=\"javascript:emoticon(':)')\"><img src=\"$skinrep/smiles/icon_smile.gif\" border=\"0\" alt=\"Smile\" title=\"Smile\" /></a></td>
                  <td><a href=\"javascript:emoticon(':(')\"><img src=\"$skinrep/smiles/icon_sad.gif\" border=\"0\" alt=\"Sad\" title=\"Sad\" /></a></td>
                  <td><a href=\"javascript:emoticon(':o')\"><img src=\"$skinrep/smiles/icon_surprised.gif\" border=\"0\" alt=\"Surprised\" title=\"Surprised\" /></a></td>
        ".closeligne()."
                ".openligne("align=\"center\" valign=\"middle\"","invi")."
                  <td><a href=\"javascript:emoticon(':shock:')\"><img src=\"$skinrep/smiles/icon_eek.gif\" border=\"0\" alt=\"Shocked\" title=\"Shocked\" /></a></td>
                  <td><a href=\"javascript:emoticon(':?')\"><img src=\"$skinrep/smiles/icon_confused.gif\" border=\"0\" alt=\"Confused\" title=\"Confused\" /></a></td>
                  <td><a href=\"javascript:emoticon('8)')\"><img src=\"$skinrep/smiles/icon_cool.gif\" border=\"0\" alt=\"Cool\" title=\"Cool\" /></a></td>
                  <td><a href=\"javascript:emoticon(':lol:')\"><img src=\"$skinrep/smiles/icon_lol.gif\" border=\"0\" alt=\"Laughing\" title=\"Laughing\" /></a></td>
        ".closeligne()."
                ".openligne("align=\"center\" valign=\"middle\"","invi")."
                  <td><a href=\"javascript:emoticon(':x')\"><img src=\"$skinrep/smiles/icon_mad.gif\" border=\"0\" alt=\"Mad\" title=\"Mad\" /></a></td>
                  <td><a href=\"javascript:emoticon(':oops:')\"><img src=\"$skinrep/smiles/icon_redface.gif\" border=\"0\" alt=\"Embarassed\" title=\"Embarassed\" /></a></td>
                  <td><a href=\"javascript:emoticon(':cry:')\"><img src=\"$skinrep/smiles/icon_cry.gif\" border=\"0\" alt=\"Crying or Very sad\" title=\"Crying or Very sad\" /></a></td>
                  <td><a href=\"javascript:emoticon(':evil:')\"><img src=\"$skinrep/smiles/icon_evil.gif\" border=\"0\" alt=\"Evil or Very Mad\" title=\"Evil or Very Mad\" /></a></td>
        ".closeligne()."
                ".openligne("align=\"center\" valign=\"middle\"","invi")."
                  <td><a href=\"javascript:emoticon(':roll:')\"><img src=\"$skinrep/smiles/icon_rolleyes.gif\" border=\"0\" alt=\"Rolling Eyes\" title=\"Rolling Eyes\" /></a></td>
                  <td><a href=\"javascript:emoticon(':wink:')\"><img src=\"$skinrep/smiles/icon_wink.gif\" border=\"0\" alt=\"Wink\" title=\"Wink\" /></a></td>
                  <td><a href=\"javascript:emoticon(':!:')\"><img src=\"$skinrep/smiles/icon_exclaim.gif\" border=\"0\" alt=\"Exclamation\" title=\"Exclamation\" /></a></td>
                  <td><a href=\"javascript:emoticon(':?:')\"><img src=\"$skinrep/smiles/icon_question.gif\" border=\"0\" alt=\"Question\" title=\"Question\" /></a></td>
        ".closeligne()."
                ".openligne("align=\"center\" valign=\"middle\"","invi")."
                  <td><a href=\"javascript:emoticon(':idea:')\"><img src=\"$skinrep/smiles/icon_idea.gif\" border=\"0\" alt=\"Idea\" title=\"Idea\" /></a></td>
                  <td><a href=\"javascript:emoticon(':arrow:')\"><img src=\"$skinrep/smiles/icon_arrow.gif\" border=\"0\" alt=\"Arrow\" title=\"Arrow\" /></a></td>
                  <td><a href=\"javascript:emoticon(':neutral:')\"><img src=\"$skinrep/smiles/icon_neutral.gif\" border=\"0\" alt=\"Neutral\" title=\"Neutral\" /></a></td>
                  <td><a href=\"javascript:emoticon(':mrgreen:')\"><img src=\"$skinrep/smiles/icon_mrgreen.gif\" border=\"0\" alt=\"Mr. Green\" title=\"Mr. Green\" /></a></td>
        ".closeligne()."  </table>
      </td>
      <td class=\"row2\" valign=\"top\"><span class=\"gen\">
        <table width=\"450\" border=\"0\" cellspacing=\"0\" cellpadding=\"2\">
            <td colspan=\"9\"><span class=\"genmed\"> &nbsp;Couleur:
                    <select name=\"addbbcode18\" onChange=\"bbfontstyle('[color=' + this.form.addbbcode18.options[this.form.addbbcode18.selectedIndex].value + ']', '[/color]');this.selectedIndex=0;\" onMouseOver=\"helpline('s')\">
                      <option value=\"#444444\" class=\"genmed\">Défaut</option>
                      <option value=\"red\" class=\"genmed\">Rouge</option>
                      <option value=\"green\" class=\"genmed\">Vert</option>
                      <option value=\"blue\" class=\"genmed\">Bleu</option>
                    </select>
            </td>
            ".openligne()."
            <td colspan=\"9\">
<input type=\"text\" name=\"helpbox\" size=\"45\" style=\"width:450px\" tabindex=\"2\" class=\"post\" value=\"Astuce: Une mise en forme peut être appliquée au texte sélectionné.\" />
            </td>
            ".closeligne()."
            ".openligne()."
            <td colspan=\"9\"><span class=\"gen\">
              <textarea name=\"message\" rows=\"15\" cols=\"35\" wrap=\"virtual\" style=\"width:450px\" tabindex=\"3\" class=\"post\" onselect=\"storeCaret(this);\" onclick=\"storeCaret(this);\" onkeyup=\"storeCaret(this);\">".retiftrue(is_object($mess)?$mess->contenu:'',$idmessage && $edit).retiftrue(is_object($mess)?chr(13).chr(13)."[quote]$mess->contenu[/quote]":'',$idmessage && !$edit)."$corps</textarea>
            </span></td>
            ".closeligne()."
        </table>
        </span></td>
    ".closeligne().openligne().opencol(" colspan=\"2\" align=\"center\"").$hiddeninfos.Html_bouton("post",lang(169)).closecol().closeligne()."";

    $form .= closetab();
    return $form;
}

function formchgmdp()
{
    return jscript_profil2()."<br><br><br>
          <form name=\"forminscr\" method=\"POST\" action=\"index.php?do=dochgmdp\"   onSubmit=\"return test();\">
              ".opentab("align=\"center\" ","fond").openligne("","titre2").opencol(" colspan=\"4\"")."<b>".lang(272)." :</b>".closecol().closeligne()."
              ".openligne()."
                <td align=\"right\">Nouveau mot de passe :&nbsp;".closecol()."
                ".opencol()."
                  ".Html_pass("nmdp","",30,255)."
                  ".closecol()."
                <td align=\"right\"> Confirmation :&nbsp;".closecol()."
                ".opencol()."
                  ".Html_pass("cnmdp","",30,255)."
                  ".closecol()."
              ".closeligne()."
            </table><br><br><center>
                  ".Html_bouton("Submit",lang(64))."
          </center></form>";
}

function disabledaily($idcompte,$chainemd5)
{
    $lejoueur = getinfojoueur($idcompte);
    if(is_object($lejoueur) && md5($idcompte.$lejoueur->dateinscr) == $chainemd5)
    {
        deactivatedaystats($idcompte);
        return "Vous ne recevrez plus votre email quotidien de statistique.";
    } else {
        return "Informations incorrect";
    }
}

function disableweekly($idcompte,$chainemd5)
{
    $lejoueur = getinfojoueur($idcompte);
    if(is_object($lejoueur) && md5($idcompte.$lejoueur->dateinscr) == $chainemd5)
    {
        deactivateweekstats($idcompte);
        return "Vous ne recevrez plus votre email hebdomadaire de statistique.";
    } else {
        return "Informations incorrect";
    }
}

function junkoldsicav($idcompte, $chainemd5, $codesico)
{
    $lejoueur = getinfojoueur($idcompte);
    if(is_object($lejoueur) && md5($idcompte.$lejoueur->dateinscr) == $chainemd5)
    {
        $infoaction = getinfosicav($codesico);
        if(is_object($infoaction) && $infoaction->codesico > 0)
        {
            $outdated_delay = defined('CONSIDERER_OUTDATED_SICAV') ? CONSIDERER_OUTDATED_SICAV : 30;
            if($outdated_delay*3600*24 < date("U")-$infoaction->lasttime)
            {       
                $portef = joueur_possede($codesico,$idcompte);
                if(is_object($portef) && $portef->nombsicav > 0)
                {
                    ModifLiquide($idcompte,$portef->ansvaleur*$portef->nombsicav);
                    AddHistorique($idcompte,"vente",$codesico,$portef->nombsicav,$portef->ansvaleur, 0, 0);
                }
                if(is_object($portef) && $portef->nombsicav < 0)
                {
                    ModifLiquide($idcompte,$portef->ansvaleur*$portef->nombsicav);
                    AddHistorique($idcompte,"achat",$codesico,-$portef->nombsicav,$portef->ansvaleur, 0, 0);
                }
                ModifAction($idcompte,$codesico,0,0);
            } else {
                return "La dernière mise à jour de l'action est trop recente pour la supprimer de cette facon.";
            }
        } else {
            return "Vous n'avez pas cette action dans votre portefeuille !";
        }
    }
    return "";
}
?>