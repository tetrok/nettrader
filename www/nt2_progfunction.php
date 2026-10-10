<?php

/**
 * NetTrader 2 — Passerelle de Données pour Client Desktop VB6 (Archivée)
 *
 * Usage:
 *   Contient les fonctions historiques d'exportation de données (ordres, cours)
 *   formatées au format texte/CSV avec séparateur point-virgule pour l'ancien client Visual Basic 6.
 *
 * Logique & Fonctionnement:
 *   - get_ordrelistprog() : sélectionne les ordres d'un joueur en base.
 *   - sorttableauprog() : formate le jeu d'enregistrements PDO en flux texte délimité.
 */

function get_ordrelistprog()
{
    global $internaute;
    if (!is_object($internaute) || !isset($internaute->idcompte)) return false;
    $idcompte = $internaute->idcompte;
    $query = "SELECT cacval.nom as Nom, FROM_UNIXTIME(datecreation, '%d/%c/%Y %H:%I:%S') as 'Date de création', sens, nbr as 'quantitée', pourc as 'pourcentage', coursmin as 'Cours mini', coursmax as 'Cours max', valeur 
FROM ordre
INNER JOIN cacval ON ordre.codesico = cacval.codesico
WHERE idcompte = ? ORDER BY datecreation DESC";
    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    return ExecRequete($query, $connexion, [$idcompte]);	
}

/**
 * Fonction sorttableauprog
 * @param mixed $resultat
 */
function sorttableauprog($resultat)
{
$qte=$resultat->columnCount();/*nombre de champs s�lectionn�s*/
$echo="";
	for ($i=0;$i<$qte;$i++)
	{
		 if($i<>0 && $i<$qte)
		 {
		 $echo.=";";
		 }
		 $echo.=(($meta = $resultat->getColumnMeta($i)) ? $meta['name'] : false);/*les noms des champs*/
	}
	while ($row =   $resultat->fetch(PDO::FETCH_ASSOC))
	{/*array des donn�es*/
		$echo.=chr(13);
		$i=0;
		foreach ($row as $elem)
		{/*pour chaque �l�ment...*/
			if($i<>0 && $i<$qte)
		 	{
		 	$echo.=";";
		 	}
			 $i++;
			 $echo.=str_replace([chr(13), chr(10)], "", stripslashes($elem));
		}
		
	}
return $echo;
}


/**
 * Fonction form_list_ordreprog
 */
function form_list_ordreprog()
{
global $skinrep;
$liste=get_ordrelistprog();
if($liste<>"")
{
$retour=sorttableauprog($liste);
}else{
$retour="0";
}
return $retour;
}


?>