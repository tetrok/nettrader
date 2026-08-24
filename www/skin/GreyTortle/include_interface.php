<?

/**
 * Fichier: include_interface.php
 * Ce fichier contient les fonctions suivantes :
 * - Html_radio
 * - getgooglePub
 * - Html_textezone
 * - Html_texte
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
 * - html_anime
 * - StartAnim
 * - defilimg
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
$source="<input type=\"radio\" value=\"$valeur\" $checked name=\"$nom\" $add>$texte";
return $source;
}

//function getgooglePub()
//{
//	return "<script type=\"text/javascript\"><!--
//google_ad_client = \"pub-7151069878409822\";
///* 728x90, turtle */
//google_ad_slot = \"0973697802\";
//google_ad_width = 728;
//google_ad_height = 90;
////-->
//</script>
//<script type=\"text/javascript\"
//src=\"http://pagead2.googlesyndication.com/pagead/show_ads.js\">
//</script>";
//}


//function getgooglePub()
//{
//	$ad_cycle=array("<!-- Affiliate Code Do NOT Modify--><a href=\"http://system.referfx.com/processing/clickthrgh.asp?btag=a_1569b_1534\"  target=\"_blank\"><img src=\"http://system.referfx.com/processing/impressions.asp?btag=a_1569b_1534\" alt=\"GFC Markets\" border=0 width=\"728\"  height=\"90\" ></a><!-- End affiliate Code-->",
//"<!-- Affiliate Code Do NOT Modify--><a href=\"http://system.referfx.com/processing/clickthrgh.asp?btag=a_1569b_1560\"  target=\"_blank\"><img src=\"http://system.referfx.com/processing/impressions.asp?btag=a_1569b_1560\" alt=\"GFC Markets\" border=0 width=\"728\"  height=\"90\" ></a><!-- End affiliate Code-->",
//"<!-- Affiliate Code Do NOT Modify--><a href=\"http://system.referfx.com/processing/clickthrgh.asp?btag=a_1569b_1823\"  target=\"_blank\"><img src=\"http://system.referfx.com/processing/impressions.asp?btag=a_1569b_1823\" alt=\"GFC Markets\" border=0 width=\"728\"  height=\"90\" ></a><!-- End affiliate Code-->");
//	return $ad_cycle[array_rand($ad_cycle)];
//}

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
 * Fonction Html_texte
 * @param mixed $nom
 * @param mixed $valeur
 * @param mixed $taille
 * @param mixed $longueurmax
 * @param mixed $add
 */
function Html_texte($nom,$valeur,$taille,$longueurmax,$add="")
{
$source="<input name=\"$nom\" type=\"text\" class=\"textbox\" value=\"$valeur\" size=\"$taille\" maxlength=\"$longueurmax\" $add>";
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
$source="<input name=\"$nom\" type=\"password\"  class=\"textbox\" value=\"$valeur\" size=\"$taille\" maxlength=\"$longueurmax\" $add>";
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
$source=" <input type=\"submit\" name=\"$nom\" class=\"bouton\" value=\"$valeur\" $add>";
return $source;
}
/**
 * Fonction Html_head_liste
 * @param mixed $nom
 * @param mixed $add
 */
function Html_head_liste($nom,$add="") // $liste = array('25' => '25 %', '50' => '50 %', '75' => '75%')
{
return "<select name=\"$nom\" class=\"select\" $add>";
}

/**
 * Fonction Html_liste
 * @param mixed $nom
 * @param mixed $liste
 * @param mixed $add
 * @param mixed $defaut
 */
function Html_liste($nom,$liste,$add="",$defaut="") // $liste = array('25' => '25 %', '50' => '50 %', '75' => '75%')
{
$source=Html_head_liste($nom,$add);
foreach ($liste as $key => $val) {
   $def="";
   if($key==$defaut)
   {
   		$def="selected";
   }
   $source.= "<option $def value=\"$key\">$val</option>";
   
}
$source.="</select>";
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
	$add.=" border=\"0\"";
}else{
	if($type=="fond")
	{
		$add.="border=0  bgcolor=\"E7E9F0\"";
	}else{
		$add.="border=\"0\" cellspacing=\"0\" cellpadding=\"5\" bgcolor=\"E7E9F0\"";
	}
}
$return = "<table  $add  >";
return $return;
}
/**
 * Fonction closetab
 */
function closetab()
{
$return = "</table>";
return $return;
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
		$add.=" class=\"tabtitre\" ";
		break;
	case "titre2":
		$add.=" class=\"titre\" ";
		break;
	case "citation":
		$add.=" class=\"citation\" ";
		break;
}
$return = "<tr $add>";
return $return;
}
/**
 * Fonction closeligne
 * @param mixed $type
 */
function closeligne($type="")
{
$return = "</tr>";
return $return;
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
		$add =" bgcolor=#D9DFEF";
		break;
	default :
		$add =$type;
}
if($cat=="titre")
{
	$add.=" class=\"tabtitre\" ";
}
$return = "<td $add>";
return $return;
}
/**
 * Fonction closecol
 * @param mixed $type
 */
function closecol($type="")
{
$return = "</td>";
return $return;
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
		$echo .=" size=4 ";
		break;
	default :
		$echo .=" size=3 "; //taille normalle
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
$echo ="</font";
$echo .= ">";
return $echo;
}

/**
 * Fonction html_header
 */
function html_header()
{
global $tempsdebexec,$skinrep;
$tempsdebexec=getmicrotime();
$echo="<html>\n
<head>\n
<title>".TITRE_JEU."</title>\n
<link href=\"$skinrep/style.css\" rel=\"stylesheet\" type=\"text/css\">
".html_anime()."</head>
<body link=\"#000000\" vlink=\"#000000\" alink=\"#000000\">
\n
<div align=center>\n
<table width=770 cellspacing=0 border=0  bgcolor=EFEFEF>\n
<tr>\n
<td bgcolor=2B2D33><div align=center>";
/* $echo.="<SCRIPTLANGUAGE=\"JavaScript\">StartAnim();</SCRIPT>"; */
$echo.="<IMG SRC=\"$skinrep/top_gris1.jpg\" BORDER=0>";
$echo.="</div>\n
</td>\n
</tr>\n
<tr>\n
<td bgcolor=2B2D33> <table border=0 width=100% cellspacing=0 cellpadding=0>\n
<tr height=28>
<td align=left valign=\"midle\" background=$skinrep/menu_vide.jpg>".html_menu()."</td><td align=right background=$skinrep/menu_vide.jpg>".html_login();
					  
	$echo .="<tr><td><br>";

	return $echo;
}

/**
 * Fonction html_footer
 */
function html_footer()
{
global $nbreqexecuted,$tempsdebexec,$internaute,$skinrep;
$tempsexec = round(getmicrotime()-$tempsdebexec,2);
$info="";
if($internaute->authlevel>1 OR $internaute->idcompte==16)
{
	$info="<font class=\"footer\"><i><center>$nbreqexecuted requ�tes ex�cut�es et $tempsexec secondes d'execution.</center></i></font><br>";
}
	$info.="<font class=\"footer\"><center><i>Cr�� par: <a href=\"index.php?do=contactauteur\" class=\"Liencreateur\" target=\"_blank\">FORTIN Nicolas</a> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Design: POTHIER Guillaume</i></center></font>";
$echo = "";
$echo.= "<br></div></td>
</tr>
<tr>
<td bgcolor=2B2D33>
<div align=center><hr>$info</div>

<br>
<div align=center><a href=\"index.php?do=formhelp\" class=\"Liencreateur\" >".lang(160)."</a> <a href=\"index.php?do=formfaq\" class=\"Liencreateur\" >".lang(166)."</a></div><hr>

</td>
</tr>
</table>
</div>
</body>
</html>";
	return $echo;
}

/**
 * Fonction html_login
 */
function html_login()
{   
global $internaute,$do,$skinrep;

	if($internaute>0 AND $do<>"deconnect")
	{
		$echo = "<b><a href=index.php?do=deconnect><img border=\"0\" title=\"$internaute->pseudonyme\" src=\"$skinrep/disconnect.jpg\"></a></b></td></tr></table></td></tr>";
	}else{
		$echo ="<FORM  METHOD='POST' ACTION='index.php?do=login' NAME='Form'><b>Membres :</b>&nbsp;&nbsp;Email : <INPUT class=textbox maxLength=30 size=10 name=email>&nbsp;&nbsp;Password : <INPUT class=textbox type=password maxLength=30 NAME='motDePasse' size=10>&nbsp;&nbsp;<INPUT class=bouton type=submit value=Ok name=ident></td></tr></table></td></tr></form>";
	}
return $echo;
}

/**
 * Fonction return_link_menu
 * @param mixed $head
 * @param mixed $footer
 * @param mixed $before
 */
function return_link_menu($head,$footer,$before) //to do: creer colonne dans bdd avec la valeur de do, puis mettra la valeur global ici et comparer pour pouvoir changer les images si page en cours
{
global $do,$skinrep;
$liste = listmenu();
if($liste==""){return 1;}
$retour="";
//$idpic=get_idmenu();
//if($do=="")
//{
//	$idpic=5;
//}
foreach ($liste as $key => $value)
	{
		
		if($before)
		{
			//$retour.=$head."<a href=".$value["link_menu"]."><b>".lang($value["text_id"])."</b></a>".$footer;
			//if($value["text_id"]==intval($idpic))
			if((!(strpos((string)$value["alldo"],"|".$do."|"  ) === false) AND $do<>"") or $do==$value["do"])
			{
				//$retour.=$head."<img src=\"$skinrep/men".$value["idmenu"].".jpg\" border=\"\" >".$footer;
				$retour.=$head."<a href=".$value["link_menu"]."><img src=\"$skinrep/men".$value["text_id"].".jpg\" title=\"".lang($value["text_id"])."\" border=\"\" ></a>".$footer;
			}else{
				$retour.=$head."<a href=".$value["link_menu"]."><img src=\"$skinrep/men".$value["text_id"]."_no.jpg\" title=\"".lang($value["text_id"])."\" border=\"\" ></a>".$footer;
			}
			
		}else{
			// $retour.="<a href=".$value["link_menu"].">".$head.lang($value["text_id"]).$footer."</a>";
		}
	}
return $retour;
}

/**
 * Fonction html_menu
 */
function html_menu()
{   
global $internaute,$do,$skinrep;
		
$echo = return_link_menu("","",1);
    return $echo;
}

/**
 * Fonction html_anime
 */
function html_anime()
{
global $skinrep;
$html="<script langage=javascript>\n
\n
//fonctions pour l'animation\n
i = new Array;\n
version = navigator.appVersion.substring(0,1);\n
if (version >= 3)\n
{\n
i0 = new Image;\n
i0.src = '$skinrep/top_gris1.jpg';\n
i[0] = i0.src;\n
i1 = new Image;\n
i1.src = '$skinrep/top_gris.jpg';\n
i[1] = i1.src;\n
}\n
\n
\n
a = 0;\n
/**
 * Fonction StartAnim
 */
function StartAnim()\n
{\n
if (version >= 3)\n
{\n
document.write('<IMG SRC=\"$skinrep/top_gris1.jpg\" BORDER=0 NAME=defil>');\n
defilimg()\n
}\n
else\n
{\n
document.write('<IMG SRC=\"$skinrep/top_gris.jpg\" BORDER=0 >')\n
}\n
}\n
\n
/**
 * Fonction defilimg
 */
function defilimg()\n
{\n
if (a == 2)\n
{\n
a = 0;\n
}\n
if (version >= 3) {\n
document.defil.src = i[a];\n
tempo = setTimeout(\"defilimg()\",720);\n
a++;\n
} \n
}\n
\n
</script>";

return ""; //$html;
}

?>