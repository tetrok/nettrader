<?php

/**
 * Fichier: progfunc.php
 * Ce fichier contient les fonctions suivantes :
 * - xmess
 * - expl
 * - bal
 * - generTab
 * - errorxmlmessage
 * - ControleProgAcces
 * - proglogin
 * - progdeco
 * - progportef
 * - proginfomess
 * - progordre
 * - progactionslist
 * - progachatmax
 * - progventemax
 * - proglsthisto
 * - progallinfo
 */

/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/
function xmess($mess)
{
	return("<message>".$mess."</message>");
}

/**
 * Fonction expl
 * @param mixed $xml
 */
function expl($xml)
{
global $explorer;
if($explorer)
    return "<pre>".htmlentities($xml)."</pre>";
else
	return $xml;
}

/**
 * Fonction bal
 * @param mixed $balise
 * @param mixed $valeur
 */
function bal($balise,$valeur)
{
	return "<$balise>$valeur</$balise>";
}

/**
 * Fonction generTab
 * @param mixed $tabVal
 * @param mixed $tabchamps
 * @param mixed $nomtab
 * @param mixed $nomligne
 */
function generTab($tabVal,$tabchamps,$nomtab,$nomligne)
{
global $explorer;
$nomligntmp=$nomligne;
if($explorer)
{
	$rt=chr(13).chr(10);
	$esp="  ";
}else{
	$rt="";
	$esp="";
}
$xml="<$nomtab>$rt";
if(is_array($tabVal))
{
	foreach($tabVal as $ligne)
	{
		$xml.="$esp<$nomligne>$rt";
		foreach($tabchamps as $key=>$cols)
		{
			$nomligntmp=$cols;
			if(is_string($key)) $nomligntmp=$key;
			if(strstr($cols,"date")) $ligne[$nomligntmp]=date("j/m/y H:i:s",$ligne[$nomligntmp]);
			if(is_numeric($ligne[$nomligntmp])) $ligne[$nomligntmp]=strtr($ligne[$nomligntmp],".",",");
			$xml.="$esp$esp<$cols>$ligne[$nomligntmp]</$cols>$rt";
		}
		$xml.="$esp</$nomligne>$rt";
	}
}
$xml.="</$nomtab>$rt";


return expl($xml);
}


/**
 * Fonction errorxmlmessage
 * @param mixed $erreurcode
 */
function errorxmlmessage($erreurcode)
{
$message="";
switch($erreurcode)
{
	case 1:
		$message="Mot de Passe invalide";
		break;
	case 2:
		$message="Utilisateur inconnu";
		break;
	case 3:
		$message="Session expir�";
		break;
	case 4:
		$message="Utilisateur inconnu";
		break;
	case 5:
		$message="Utilisateur inconnu";
		break;
	case 6:
		$message="Nombre d'essai d�pass�, veuillez r�essayer dans quelques minutes.";
		break;
}



return "<erreur>vrai</erreur><codeerreur>$erreurcode</codeerreur><message>$message</message>";
}



/**
 * Fonction ControleProgAcces
 * @param mixed $session
 */
function ControleProgAcces($session)
{
	global $internaute;
	$connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
	$testinternaute=ChercheSession ($session, $connexion);

	if(!is_object($testinternaute) || $testinternaute->tempsLimite < date("U"))
	{
  		//session expiree
		//echo "(".$testinternaute->tempsLimite.")";
  		exit(errorxmlmessage(3));
	}else{
	        $internaute=$testinternaute;
	        // session encore valide
	        $maintenant = date("U");
	        $requete  = "UPDATE compte SET dateactivite = ? WHERE idcompte = ?";
		$resultat = ExecRequete ($requete, $connexion, [$maintenant, $internaute->idcompte]);
		return "";  //si session encore valide
	}
}

/**
 * Fonction proglogin
 * @param mixed $pseudo
 * @param mixed $pass
 */
function proglogin($pseudo,$pass)
{
  // on test le login et mot de passe, si c'est bon on cree la session
  $connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
  $tempinternaute = ChercheComptePseudo ($pseudo, $connexion);

  if(is_object($tempinternaute) && $tempinternaute->authlevel>=1 && nbessai($tempinternaute->idcompte)>=3)
  {
        exit(errorxmlmessage(6)); //nombre d'essai depasse
  }

  if(is_object($tempinternaute) && $tempinternaute->passe==$pass and $tempinternaute->authlevel>=1)
  {
	//si utilisateur correcte
	//on cree une session
	$internaute=$tempinternaute;
	$maintenant = date ("U");
        $tempsLimite = $maintenant + (3600 * 24);
	$idsession=md5(getmicrotime()+rand(1,200));
        $insSession = "INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) "
                     . "VALUES (?, ?, ?, ?)";
        $resultat = ExecRequete ($insSession, $connexion, [$idsession, $internaute->idcompte, $tempsLimite, $maintenant]);
        $requete  = "UPDATE compte SET dateactivite = ? WHERE idcompte = ?";
        $resultat = ExecRequete ($requete, $connexion, [$maintenant, $internaute->idcompte]);
		$internaute=ChercheSession ($idsession, $connexion);
        return "<erreur>faux</erreur><session>$idsession</session><vad>$internaute->vad</vad>";
  }else{
	if(!is_object($tempinternaute))  //Si utilisateur non trouve
	{
 		exit(errorxmlmessage(2));
	}else{       //mot de passe invalide
		$maintenant = date ("U");
		$insSession = "INSERT INTO `tabforcing` ( `idcompte` , `dateforcing` ) VALUES (?, ?);";
      		$resultat = ExecRequete ($insSession, $connexion, [$tempinternaute->idcompte, $maintenant]);
	        exit(errorxmlmessage(1));
	}
  }
}

/**
 * Fonction progdeco
 */
function progdeco()
{
	global $internaute;
	if (!is_object($internaute)) return "deconnecte";
	$connexion = Connexion (NOM, PASSE, BASE, SERVEUR);
    $requete  = "DELETE FROM session WHERE idcompte = ? OR tempsLimite < UNIX_TIMESTAMP()";
	$resultat = ExecRequete ($requete, $connexion, [$internaute->idcompte]);
	$tag=md5(getmicrotime());
    $requete = "UPDATE compte SET cookiesess = ? WHERE idcompte = ?";
	$resultat = ExecRequete ($requete, $connexion, [$tag, $internaute->idcompte]);
	$internaute="";
    return "deconnecte";
}

/**
 * Fonction progportef
 */
function progportef()
{
global $internaute;
$req=progreqportef();
$portef="<portef>";
while($ligne=lignesuivante($req))
{
	$portef.="<action>";
	$portef.="<code>".$ligne->codesicav."</code>";
	$portef.="<nom>".$ligne->nomsicav."</nom>";
	$portef.="<nombre>".$ligne->nombsicav."</nombre>";
	$portef.="<valachat>".round($ligne->ansvalsicav,4)."</valachat>";
	$portef.="<valactuel>".$ligne->valsicav."</valactuel>";
	$portef.="</action>";
}
$portef.="</portef>";
$portef.="<cashback>$internaute->cashback</cashback>";
$portef.="<cashbackInitial>".CAPDEB."</cashbackInitial>";
return $portef;
}

/**
 * Fonction proginfomess
 * @param mixed $ver
 * @param mixed $log
 */
function proginfomess($ver,$log)
{
$data=progreqinfomess();
$html="<message>$data->progmess</message><clique>$data->addrclic</clique><ouverture>$data->addrpopup</ouverture>";

return $html;
}

/**
 * Fonction progordre
 */
function progordre()
{ //codesico idcompte datecreation sens nbr pourc tempslim coursmin coursmax etat
$tabval=get_ordrelist();
$tabchamps=array("codesico","nom","etat","nbr","datecreation","pourc","tempslim"=>"datelimit","coursmin","coursmax","sens","valeur");
$nomtab="ordres";
$nomligne="ordre";
$portef=generTab($tabval,$tabchamps,$nomtab,$nomligne);

return $portef;
}

/**
 * Fonction progactionslist
 */
function progactionslist()
{ //liste des actions que le joueur peut acheter
$tabval=listvaleur();
$tabchamps=array("codesicav","nomsicav","valeur","yahooname");
$nomtab="actions";
$nomligne="action";
$lstactions=generTab($tabval,$tabchamps,$nomtab,$nomligne);

return $lstactions."<finjour>".finjour()."</finjour>";
}

/**
 * Fonction progachatmax
 * @param mixed $codesico
 */
function progachatmax($codesico)
{
global $internaute;
$valeuraction=getvaleur($codesico);
$xml="<nbactionmax>".getnbactionmax($internaute->cashback,$valeuraction)."</nbactionmax><valeur>$valeuraction</valeur>";
return $xml;
}

/**
 * Fonction progventemax
 * @param mixed $codesico
 */
function progventemax($codesico)
{
global $internaute;

$jpossede=joueur_possede($codesico,$internaute->idcompte);
if($internaute->vad)
{
	if($jpossede->nombsicav<0) $jpossede->nombsicav = 0;
	$valeuraction=getvaleur($codesico);
	$nbactions=getnbactionmax(getmontantvadpossible($internaute->idcompte),$valeuraction)+$jpossede->nombsicav; //si on ne possede pas cette action alors on calcul le nombre maximal d'action a vendre en d�couvert
}else{
    $nbactions=$jpossede;
}
return "<nbactionmax>$nbactions</nbactionmax><valeur>$valeuraction</valeur>";
}

/**
 * Fonction proglsthisto
 * @param mixed $depuis
 */
function proglsthisto($depuis)
{ //codesico idcompte datecreation sens nbr pourc tempslim coursmin coursmax etat
$tabval=listhisto(0,999,$depuis);
$tabchamps=array("LADATE"=>"dateexe","LENOM","LESENS","LENOMBRE","LEHT","LATAXE","LETTC","UNIX");
$nomtab="historique";
$nomligne="ordre";
$histo=generTab($tabval,$tabchamps,$nomtab,$nomligne);

return $histo;
}



/**
 * Fonction progallinfo
 * @param mixed $codesico
 */
function progallinfo($codesico)
{
global $internaute;
$jpossede=joueur_possede($codesico,$internaute->idcompte);
$valeuraction=getvaleur($codesico);
if($internaute->vad)
{
	if($jpossede->nombsicav<0) $jpossede->nombsicav = 0;
	$nbactions=getnbactionmax(getmontantvadpossible($internaute->idcompte),$valeuraction)+$jpossede->nombsicav; //si on ne possede pas cette action alors on calcul le nombre maximal d'action a vendre en d�couvert
}else{
    $nbactions=$jpossede->nombsicav;
}
return "<nbactionmaxachat>".getnbactionmax($internaute->cashback,$valeuraction).
"</nbactionmaxachat><nbactionmaxvente>".intval($nbactions)."</nbactionmaxvente><valeur>$valeuraction</valeur>
<quantportef>".intval($jpossede->nombsicav)."</quantportef><finjour>".finjour()."</finjour>";
}

?>