<?php
/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/
/*
Fonction Liste:
ligne 239: joueur_liste_sicav([idCompte]) retourne toutes les sicav qui doivent être mis à jour [pour un joueur]
*/

function sec($input="")
{
    if (is_array($input)) {
        $output = [];
        foreach ($input as $key => $champ) {
            $output[$key] = sec($champ); // Récursivité
        }
    } else {
        // Connexion PDO active
        $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);

        if ($input === '' || $input === null) {
            $quoted = "''";
        } else {
            $quoted = $connexion->quote($input);
        }

        // Enlever les quotes ajoutées par PDO au début et à la fin
        if (strlen($quoted) >= 2 && substr($quoted, 0, 1) === "'" && substr($quoted, -1) === "'") {
            $escaped = substr($quoted, 1, -1);
        } else {
            $escaped = $quoted;
        }

        $output = htmlentities($escaped);
    }
    return $output;
}

function echoadmin($message)
{
    global $internaute;
    if ($internaute->idcompte == 1 || $_SERVER['REMOTE_ADDR'] == "127.0.0.1") {
        echo $message;
    }
    return 1;
}

function getmicrotime()
{
    list($usec, $sec) = explode(" ", microtime());
    return ((float)$usec + (float)$sec);
}
  
function cookievalide($idSession)
{
    $chainecookie = &$_COOKIE["nettrader2session"];
    if (isset($_COOKIE["nettrader2session"])) {
        $exploded_ligne = explode("-", $chainecookie);
        $idcompte = $exploded_ligne[0];
        $chainemd5 = $exploded_ligne[1];
        $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
        $tempinternaute = ChercheInternaute($idcompte, $connexion);
        list($hour, $min, $sec, $day, $mon, $yr) = explode(" ", date("H i s d m y"));
        $date3 = mktime(0, 0, 0, 0, 0, $yr);
        
        if (md5($tempinternaute->idcompte . $date3 . $tempinternaute->passe . $tempinternaute->cookiesess) == $chainemd5) {
            $maintenant = date("U");
            $tempsLimite = $maintenant + (3600 * 24); 

            $insSession = "INSERT INTO Session (idSession, idcompte, tempsLimite, tempsconnect) "
                        . "VALUES ('$idSession', '$idcompte', '$tempsLimite', '$maintenant')";       
            $resultat = ExecRequete($insSession, $connexion);
            forum_majtoutvuforum($idcompte);
            
            $requete = "UPDATE compte SET dateactivite = '$maintenant' WHERE idcompte='$idcompte'";
            $resultat = ExecRequete($requete, $connexion);
            session_register("$idcompte");
            return $idcompte;
        } else {
            return 0;
        }
    } else {
        return 0;
    }
}

if (!isset($FichierConnexion)) {
    $FichierConnexion = 1;

    function Connexion($pNom, $pMotPasse, $pBase, $pServeur)
    {
        static $connectbdd;
        if (!$connectbdd) {
            try {
                $dsn = "mysql:host=$pServeur;dbname=$pBase;charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_SILENT,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ];
                $connexion = new PDO($dsn, $pNom, $pMotPasse, $options);
            } catch (\PDOException $e) {
                echo "Désolé, connexion au serveur impossible : " . $e->getMessage() . "\n";
                die();
            }
            $connectbdd = $connexion;
        } else {
            $connexion = $connectbdd;
        }
        return $connexion;
    }
}

if (!isset($FichierExecRequete)) {
    $FichierExecRequete = 1;

    function ExecRequete($requete, $connexion)
    {
        global $nbreqexecuted, $tempssql, $last_pdo_stmt;
        $nbreqexecuted++;
        $tempdeb = getmicrotime();

        if (!($connexion instanceof PDO)) {
            $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
        }

        $resultat = $connexion->query($requete);
        $tempssql = $tempssql + round((getmicrotime() - $tempdeb), 2);

        if ($resultat !== false) {
            $last_pdo_stmt = $resultat;
            return $resultat;
        } else {  
            global $internaute, $do;
            $errorInfo = $connexion->errorInfo();
            $errorMsg = $errorInfo[2] ?? 'Erreur PDO inconnue';

            echoadmin("<B>Erreur dans l'exécution de la requête '$requete'.</B><BR>");
            echoadmin("<B>Message de MySQL :</B> " . $errorMsg);

            $corps = "Joueur: " . (is_object($internaute) ? $internaute->pseudonyme : 'Inconnu') . " \n"
                   . "<B>Message de MySQL :</B> " . $errorMsg . "\n"
                   . "Erreur dans l'exécution de la requête '$requete' \n"
                   . "do=$do";
            envoimail(EMAILADMIN, "NetTrader, Erreur MySql", $corps);
            echo "Une erreur s'est produite, l'auteur réglera ce problème dans les plus brefs délais.";
            die();
        }  
    }

    function LigneSuivante($resultat)
    {
        if ($resultat instanceof PDOStatement) {
            return $resultat->fetch(PDO::FETCH_OBJ);
        }
        return false;
    }
}

function ChercheInternaute($idcompte = 0, $connexion, $mail = "")
{
    $mail = sec($mail);
    if ($mail == "") {
        $requete = "SELECT * FROM compte,skin,niveau WHERE idcompte = '$idcompte' AND compte.skin = skin.idskin AND compte.idniveau = niveau.idniveau";
    } else {
        $requete = "SELECT * FROM compte,skin,niveau WHERE email = '$mail' AND compte.skin = skin.idskin AND compte.idniveau = niveau.idniveau";
    }
    $resultat = ExecRequete($requete, $connexion);
    return LigneSuivante($resultat);
}

function nbessai($idcompte)
{
    $depuis = date("U") - 5 * 60;
    $query = "SELECT COUNT(idcompte) as nbessai FROM `tabforcing` WHERE idcompte='$idcompte' AND dateforcing>'$depuis'";
    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete($query, $connexion);
    $resultat = LigneSuivante($run_query);
    return $resultat->nbessai;
}

function ChercheSession($idSession, $connexion) 
{
    $idSession = sec($idSession);    
    $requete = "SELECT * FROM Session,compte,skin,niveau WHERE idSession = '$idSession' AND Session.idcompte = compte.idcompte AND compte.skin = skin.idskin AND compte.idniveau=niveau.idniveau ORDER BY tempsLimite DESC";
    $resultat = ExecRequete($requete, $connexion);
    return LigneSuivante($resultat);
}

function SessionValide($connexion, $session)
{
    $maintenant = date("U");
    if ($session->tempsLimite < $maintenant) {
        session_destroy();
        setcookie("nettrader2session", "", time() + 3600 * 24 * 30, "/");
        $session->idSession = sec($session->idSession);
        $requete = "DELETE FROM Session WHERE idSession='$session->idSession' OR tempsLimite<'$maintenant'";
        $resultat = ExecRequete($requete, $connexion);
        return FALSE;
    } else {
        if ($session->tempsconnect < $maintenant - 5 * 60) {
            $requete = "UPDATE Session SET tempsconnect = '$maintenant' WHERE idcompte='$session->idcompte'";
            $resultat = ExecRequete($requete, $connexion);
            forum_majtoutvuforum($session->idcompte);
            $requete = "UPDATE compte SET dateactivite = '$maintenant' WHERE idcompte='$session->idcompte'";
            $resultat = ExecRequete($requete, $connexion);
        }
        return TRUE;
    }
}

function CreerSession($connexion, $email, $motDePasse, $idSession, $souvenir)
{
    global $internaute;
    $internaute = ChercheInternaute(0, $connexion, $email);
    
    if (is_object($internaute)) {
        if (nbessai($internaute->idcompte) >= 25) {
            include_once("lang/lang_fr.php");
            $internaute = "";
            return lang(88);      
        }      
        if ($internaute->passe == md5($motDePasse)) {
            $maintenant = date("U");
            $tempsLimite = $maintenant + (3600 * 24); 

            $insSession = "INSERT INTO Session (idSession, idcompte, tempsLimite, tempsconnect) "
                        . "VALUES ('$idSession', '$internaute->idcompte', '$tempsLimite', '$maintenant')";       
            $resultat = ExecRequete($insSession, $connexion);
            forum_majtoutvuforum($internaute->idcompte);
            $requete = "UPDATE compte SET dateactivite = '$maintenant' WHERE idcompte='$internaute->idcompte'";
            $resultat = ExecRequete($requete, $connexion);
            
            list($hour, $min, $sec, $day, $mon, $yr) = explode(" ", date("H i s d m y"));
            $date3 = mktime(0, 0, 0, 0, 0, $yr);
            if ($souvenir == 1) {
                setcookie("nettrader2session", "$internaute->idcompte-" . md5($internaute->idcompte . $date3 . $internaute->passe . $internaute->cookiesess), time() + 3600 * 24 * 30, "/");
            }
            session_register("$internaute->idcompte");
            return "TRUE";
        }
        $maintenant = date("U");
        $insSession = "INSERT INTO `tabforcing` (`idcompte`, `dateforcing`) VALUES ('$internaute->idcompte', '$maintenant');";       
        $resultat = ExecRequete($insSession, $connexion); 
        $internaute = "";
        include_once("lang/lang_fr.php"); 
        return "<B>" . lang(26) . "<P></B>\n";
    } else {
        $internaute = "";
        include_once("lang/lang_fr.php");
        return "<B>" . lang(27) . "</B><P>\n";
    }
}

function ControleAcces(&$email, &$motDePasse, &$emailInternaute, $idSession, $souvenir)
{
    global $internaute;
    $emailInternaute = sec($emailInternaute);
    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $sessionCourante = ChercheSession($idSession, $connexion);
    
    if (!(is_object($sessionCourante))) {
        cookievalide($idSession);
        $sessionCourante = ChercheSession($idSession, $connexion);
    }

    if (is_object($sessionCourante)) {
        if (SessionValide($connexion, $sessionCourante)) {
            $internaute = $sessionCourante;
            return;
        } else {
            return "<B>Votre session n'est pas (ou plus) valide.<P></B>\n";
        }
    }

    if (isset($email)) {
        $email = sec($email);
        $message = CreerSession($connexion, $email, $motDePasse, $idSession, $souvenir);
        if ($message == "TRUE") {
            $emailInternaute = $email;
            return "Bienvenue " . $internaute->pseudonyme . "<br><br>";
        } else {
            return $message;
        }
    }
}

function deconnection()
{
    global $internaute;
    effacvieuxordres();
    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $requete = "DELETE FROM Session WHERE idcompte='$internaute->idcompte' OR tempsLimite<UNIX_TIMESTAMP()";
    setcookie("nettrader2session", "", time() - 3600, "/");
    $resultat = ExecRequete($requete, $connexion);
    $tag = md5(getmicrotime());
    $requete = "UPDATE compte SET cookiesess='$tag' WHERE idcompte='$internaute->idcompte'";
    $resultat = ExecRequete($requete, $connexion);
    session_destroy();
    $internaute = "";
    return lang(37);
}

function ChercheComptePseudo($pseudo, $connexion)
{
    $requete = "SELECT * FROM compte WHERE pseudonyme = '$pseudo'";
    $resultat = ExecRequete($requete, $connexion);
    return LigneSuivante($resultat);
}
?>