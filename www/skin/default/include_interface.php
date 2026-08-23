<?php

/**
 * Fichier: include_interface.php
 * Ce fichier contient les fonctions suivantes :
 * - Html_radio
 * - getgooglePub
 * - Html_texte
 * - Html_textezone
 * - Html_pass
 * - Html_bouton
 * - Html_head_liste
 * - Html_liste
 * - opentab
 * - closetab
 * - openligne
 * - closeligne
 * - opencol
 * - closecol
 * - openfont
 * - closefont
 * - html_header
 * - html_footer
 * - html_login
 * - return_link_menu
 * - html_menu
 */

/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/
function Html_radio($nom,$valeur,$texte,$checked,$add="")
{
    $source="<input type=\"radio\" value=\"$valeur\" $checked name=\"$nom\" id=\"$nom$valeur\" $add><label for=\"$nom$valeur\">$texte</label>";
    return $source;
}

/**
 * Fonction getgooglePub
 */
function getgooglePub()
{
    return "<script type=\"text/javascript\">
<!--
var bseuri = 'http://script.banstex.com/script/affichagejs.aspx?zid=39496&rnd=' + new String (Math.random()).substring (2, 11);
document.write('<scr'+'ipt language=\"javascript\" src=\"'+bseuri+'\"></scr'+'ipt>');
-->
</script>";
}

/**
 * Fonction Html_texte
 * @param mixed $nom
 * @param mixed $valeur
 * @param mixed $taille
 * @param mixed $longueurmax
 * @param mixed $add
 */
function Html_texte($nom,$valeur,$taille,$longueurmax,$add="")
{
    $source="<input name=\"$nom\" type=\"text\" value=\"$valeur\" size=\"$taille\" maxlength=\"$longueurmax\" $add class=\"post\">";
    return $source;
}

/**
 * Fonction Html_textezone
 * @param mixed $nom
 * @param mixed $lignes
 * @param mixed $colonnes
 * @param mixed $valeur
 * @param mixed $add
 */
function Html_textezone($nom,$lignes,$colonnes,$valeur,$add="")
{
    $source="<textarea name=\"$nom\" rows=\"$lignes\" $add cols=\"$colonnes\" wrap=\"virtual\" class=\"post\" >$valeur</textarea>";
    return $source;
}

/**
 * Fonction Html_pass
 * @param mixed $nom
 * @param mixed $valeur
 * @param mixed $taille
 * @param mixed $longueurmax
 * @param mixed $add
 */
function Html_pass($nom,$valeur,$taille,$longueurmax,$add="")
{
    $source="<input name=\"$nom\" type=\"password\" class=\"post\" value=\"$valeur\" size=\"$taille\" maxlength=\"$longueurmax\" $add>";
    return $source;
}

/**
 * Fonction Html_bouton
 * @param mixed $nom
 * @param mixed $valeur
 * @param mixed $add
 */
function Html_bouton($nom,$valeur,$add="")
{
    $source=" <input type=\"submit\" name=\"$nom\" class=\"mainoption\" value=\"$valeur\" $add>";
    return $source;
}

/**
 * Fonction Html_head_liste
 * @param mixed $nom
 * @param mixed $add
 */
function Html_head_liste($nom,$add="")
{
    return "<select name=\"$nom\" class=\"post\" $add>";
}

/**
 * Fonction Html_liste
 * @param mixed $nom
 * @param mixed $liste
 * @param mixed $add
 * @param mixed $defaut
 */
function Html_liste($nom,$liste,$add="",$defaut="")
{
    $source=Html_head_liste($nom,$add);
    if(is_array($liste))
    {
        foreach ($liste as $key => $val) {
            $def = ($key == $defaut) ? "selected" : "";
            $source .= "<option $def value=\"$key\">$val</option>";
        }
    }
    $source .= "</select>";
    return $source;
}

/**
 * Fonction opentab
 * @param mixed $attrib
 * @param mixed $type
 */
function opentab($attrib="",$type="")
{
    $add=$attrib;
    if($type=="invi")
    {
        $add.="";
    } else {
        $add.=" class=\"tab1\" ";
    }
    $return = "<table border=\"0\" cellpadding=\"4\" cellspacing=\"1\" $add >";
    return $return;
}

/**
 * Fonction closetab
 */
function closetab()
{
    return "</table>";
}

/**
 * Fonction openligne
 * @param mixed $type
 * @param mixed $cat
 */
function openligne($type="",$cat="")
{
    $add=$type;
    switch ($cat)
    {
        case "titre":
            $add.=" class=\"row1\" ";
            break;
        case "titre2":
            $add.=" class=\"row2\" ";
            break;
        case "citation":
            $add.=" class=\"citation\" ";
            break;
        case "invi":
            break;
        default:
            $add.=" class=\"row3\"";
            break;
    }
    return "<tr $add>";
}

/**
 * Fonction closeligne
 * @param mixed $type
 */
function closeligne($type="")
{
    return "</tr>";
}

/**
 * Fonction opencol
 * @param mixed $type
 * @param mixed $cat
 */
function opencol($type="",$cat="")
{
    switch($type)
    {
        case "back":
            $add =" class=\"row1\" ";
            break;
        case "standart":
            $add =" class=\"row3\" ";
            break;
        default:
            $add =$type;
    }
    if($cat=="titre")
    {
        $add.=" class=\"row1\" ";
    }
    return "<td $add>";
}

/**
 * Fonction closecol
 * @param mixed $type
 */
function closecol($type="")
{
    return "</td>";
}

/**
 * Fonction openfont
 * @param mixed $fonttype
 */
function openfont($fonttype="")
{
    $echo ="<font";
    switch($fonttype)
    {
        case "titre1":
            $echo .=" class=\"titre2\" ";
            break;
        default:
            $echo .=" size=3 ";
    }
    $echo .= ">";
    return $echo;
}

/**
 * Fonction closefont
 * @param mixed $fonttype
 */
function closefont($fonttype="")
{
    return "</font>";
}

/**
 * Fonction html_header
 */
function html_header()
{
    global $tempsdebexec,$skinrep;
    $tempsdebexec=getmicrotime();
    $echo="<html>
<head>
<meta http-equiv=\"Content-Type\" content=\"text/html; charset=ISO-8859-1\">
<meta http-equiv=\"Content-Style-Type\" content=\"text/css\">
<link href=\"$skinrep/style.css\" rel=\"stylesheet\" type=\"text/css\">
<title>".(defined('TITRE_JEU') ? TITRE_JEU : 'NetTrader')."</title>
<link rel=\"chapter NetTrader\" href=\"index.php?do=accueil\" title=\"Accueil\" />
<link rel=\"chapter NetTrader\" href=\"index.php?do=formachatvente&info=".(defined('ADSENSEKEYWORD') ? ADSENSEKEYWORD : '')."\" title=\"Portefeuille\" />
<link rel=\"chapter NetTrader\" href=\"index.php?do=lstactions\" title=\"Achat Vente\" />
<link rel=\"chapter NetTrader\" href=\"index.php?do=historique\" title=\"Historique\" />
<link rel=\"chapter NetTrader\" href=\"index.php?do=classement\" title=\"Classement\" />
<link rel=\"chapter NetTrader\" href=\"index.php?do=listemessage\" title=\"Messagerie\" />
<link rel=\"chapter NetTrader\" href=\"index.php?do=profil\" title=\"Profil Joueur\" />
<link rel=\"chapter NetTrader\" href=\"http://nettrader.apinc.org/phpBB2/\" title=\"Forum NetTrader\" />

</head>
<body bgcolor=\"#000000\" text=\"#FFFFFF\" link=\"#FFFFFF\" vlink=\"#8EC0DA\"> 
<table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"10\" align=\"center\"> 
  <tr> 
    <td class=\"back1\">
    <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">
        <tr> 
          <td><a href=\"index.php\"><img src=\" $skinrep/logonet2.gif\" border=\"0\" title=\"Accueil NetTrader 2\" vspace=\"1\" /></a></td>
          <td align=\"center\" width=\"100%\" valign=\"middle\"><span class=\"titre1\">NetTrader</span><br> 
            <span class=\"gen\">Jeu de simulation boursière </span><br> <br>".html_menu()."</td> 
        </tr> 
    </table>".html_login()."";
    return $echo;
}

/**
 * Fonction html_footer
 */
function html_footer()
{
    global $nbreqexecuted,$tempsdebexec,$internaute,$skinrep,$tempssql;
    $tempsexec = round(getmicrotime()-$tempsdebexec,2);
    $info="";
    if(is_object($internaute) && ((isset($internaute->authlevel) && $internaute->authlevel > 1) || (isset($internaute->idcompte) && $internaute->idcompte == 1)))
    {
        if($tempsexec > $tempssql)
        {
            $tempsphp = round($tempsexec - $tempssql, 2);
        } else {
            $tempsphp = round($tempssql - $tempsexec, 2);
        }
        $info="<br><font class=\"genmed\">$nbreqexecuted requêtes exécutées et $tempsphp secondes d'execution PHP, $tempssql secondes d'execution Mysql, total $tempsexec secondes.</font>";
    }
    $echo= "<br>
      <br> 
      ".opentab("width=\"90%\" align=\"center\"").openligne("","titre").opencol()."Qui est en ligne ?".closecol().closeligne().openligne()." 
         
          <td><font class=\"genmed\">".connectstat()."</font>$info</td> 
        </tr> 
      </table> 

      <br><center>
         <span class=\"gensmall\">Les cours de la bourse ont 15 minutes de différés <br><br> &copy; Créé par <a href=\"index.php?do=contactauteur\" target=\"_blank\" class=\"copyright\">FORTIN Nicolas</a></span>
      </center><br><center>".(defined('LIGNEPARTENAIRES') ? LIGNEPARTENAIRES : '')."</center>
  </tr> 
</table>";

    if(!is_object($internaute) || !isset($internaute->authlevel) || $internaute->authlevel < 1)
    {
        $echo.="<center><script type=\"text/javascript\"><!--
        google_ad_client = \"pub-7151069878409822\";
        google_ad_width = 468;
        google_ad_height = 15;
        google_ad_format = \"468x15_0ads_al_s\";
        google_ad_channel = \"\";
        google_color_border = \"000000\";
        google_color_bg = \"000000\";
        google_color_link = \"FFFFFF\";
        google_color_text = \"000000\";
        google_color_url = \"008000\";
        //--></script>
        <script type=\"text/javascript\"
          src=\"http://pagead2.googlesyndication.com/pagead/show_ads.js\">
        </script></center>";
    }
    $echo.="
</body>
</html>
";
    return $echo;
}

/**
 * Fonction html_login
 * @param mixed $frommenu
 */
function html_login($frommenu=0)
{   
    global $internaute,$do,$skinrep;
    $echo="";
    if((!is_object($internaute) || $do=="deconnect") && ($do!="frmlogin" || $frommenu) && $do!="forminscription")
    {
        $echo =" <br> <FORM METHOD='POST' ACTION='index.php?do=login' NAME='Form'>
      ".opentab("width=\"90%\" align=\"center\"")."
        ".openligne("","titre").opencol().lang(71)."</td>".openligne()."
          ".opencol(" align=\"center\"")."<span class=\"gensmall\"><b></b>&nbsp;&nbsp;Email : ".Html_texte('email',retiftrue("demo",$do!="frmlogin"),"30","50")."&nbsp;&nbsp;&nbsp;Mot de passe : ".Html_pass('motDePasse',retiftrue("demo",$do!="frmlogin"),"10","30")."&nbsp;&nbsp;&nbsp;".lang(80)."<input name=\"souvenir\" type=\"checkbox\" value=\"1\">&nbsp;&nbsp;&nbsp;".Html_bouton("ident",lang(71))."</span></td>
        </tr>
      </table></form>";
    }
    return $echo;
}

/**
 * Fonction return_link_menu
 * @param mixed $head
 * @param mixed $footer
 * @param mixed $before
 */
function return_link_menu($head,$footer,$before)
{
    global $do,$skinrep,$internaute;
    $liste = listmenu();
    if(empty($liste) || !is_array($liste)) { return 1; }
    $retour="";
    foreach ($liste as $key => $value)
    {
        $retour.=$head."<a href=".$value["link_menu"]." class=\"mainmenu\"><nobr><img src=\"$skinrep/men".$value["text_id"].".gif\" title=\"".lang($value["text_id"])."\" border=\"\" > ".lang($value["text_id"])."</nobr></a>".$footer;
    }
    if(is_object($internaute) && isset($internaute->idcompte) && $internaute->idcompte > 0 && $do<>"deconnect")
    {
        $pseudo = isset($internaute->pseudonyme) ? $internaute->pseudonyme : '';
        $retour .= $head."<nobr><a href=\"index.php?do=deconnect\" class=\"mainmenu\"><img border=\"0\" title=\"$pseudo\" src=\"$skinrep/delog.gif\"> ".lang(70)." [ $pseudo ]</a></nobr>".$footer;
    } else {
        $retour .= $head."<nobr><a href=\"index.php?do=frmlogin\" class=\"mainmenu\"><img border=\"0\" src=\"$skinrep/delog.gif\"> ".lang(71)."</a></nobr>".$footer;
    }
    return $retour;
}

/**
 * Fonction html_menu
 */
function html_menu()
{   
    return return_link_menu("", "&nbsp;&nbsp;&nbsp;", 1);
}
?>