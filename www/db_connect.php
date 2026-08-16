<?php
/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/

function sec($input="")
{
    if (is_array($input)) {
        $output = [];
        foreach ($input as $key => $champ) {
            $output[$key] = sec($champ);
        }
    } else {
        $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);

        if ($input === '' || $input === null) {
            $quoted = "''";
        } else {
            $quoted = $connexion->quote($input);
        }

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
    $id_compte = (is_object($internaute) && isset($internaute->idcompte)) ? $internaute->idcompte : 0;
    $remote_addr = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
    if ($id_compte == 1 || $remote_addr == "127.0.0.1") {
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
    if (isset($_COOKIE["nettrader2session"])) {
        $chainecookie = $_COOKIE["nettrader2session"];
        $exploded_ligne = explode("-", $chainecookie);
        if (count($exploded_ligne) < 2) return 0;
        
        $idcompte = $exploded_ligne[0];
        $chainemd5 = $exploded_ligne[1];
        $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
        $tempinternaute = ChercheInternaute($idcompte, $connexion);
        
        if (is_object($tempinternaute)) {
            list($hour, $min, $sec, $day, $mon, $yr) = explode(" ", date("H i s d m y"));
            $date3 = mktime(0, 0, 0, 0, 0, $yr);
            
            if (md5($tempinternaute->idcompte . $date3 . $tempinternaute->passe . $tempinternaute->cookiesess) == $chainemd5) {
                $maintenant = date("U");
                $tempsLimite = $maintenant + (3600 * 24); 

                $insSession = "INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) "
                            . "VALUES ('$idSession', '$idcompte', '$tempsLimite', '$maintenant')";       
                ExecRequete($insSession, $connexion);
                forum_majtoutvuforum($idcompte);
                
                $requete = "UPDATE compte SET dateactivite = '$maintenant' WHERE idcompte='$idcompte'";
                ExecRequete($requete, $connexion);
                $_SESSION['idcompte'] = $idcompte;
                return $idcompte;
            }
        }
    }
    return 0;
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

            // Affichage direct pour déboguer le problème en local
            echo "<div style='background:#fff; color:#b00; padding:15px; border:2px solid #b00; font-family:monospace;'>";
            echo "<b>Erreur dans l'exécution de la requête :</b><br><code>" . htmlspecialchars($requete) . "</code><br><br>";
            echo "<b>Message de MySQL :</b> " . htmlspecialchars($errorMsg) . "<br>";
            echo "</div>";
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
    return is_object($resultat) ? $resultat->nbessai : 0;
}

function ChercheSession($idSession, $connexion) 
{
    $idSession = sec($idSession);    
    $requete = "SELECT * FROM session,compte,skin,niveau WHERE idSession = '$idSession' AND session.idcompte = compte.idcompte AND compte.skin = skin.idskin AND compte.idniveau=niveau.idniveau ORDER BY tempsLimite DESC";
    $resultat = ExecRequete($requete, $connexion);
    return LigneSuivante($resultat);
}

function SessionValide($connexion, $session)
{
    $maintenant = date("U");
    if (!is_object($session) || $session->tempsLimite < $maintenant) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        setcookie("nettrader2session", "", time() + 3600 * 24 * 30, "/");
        if (is_object($session)) {
            $sessId = sec($session->idSession);
            $requete = "DELETE FROM session WHERE idSession='$sessId' OR tempsLimite<'$maintenant'";
            ExecRequete($requete, $connexion);
        }
        return false;
    } else {
        if ($session->tempsconnect < $maintenant - 5 * 60) {
            $requete = "UPDATE session SET tempsconnect = '$maintenant' WHERE idcompte='$session->idcompte'";
            ExecRequete($requete, $connexion);
            forum_majtoutvuforum($session->idcompte);
            $requete = "UPDATE compte SET dateactivite = '$maintenant' WHERE idcompte='$session->idcompte'";
            ExecRequete($requete, $connexion);
        }
        return true;
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

            $insSession = "INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) "
                        . "VALUES ('$idSession', '$internaute->idcompte', '$tempsLimite', '$maintenant')";       
            ExecRequete($insSession, $connexion);
            forum_majtoutvuforum($internaute->idcompte);
            $requete = "UPDATE compte SET dateactivite = '$maintenant' WHERE idcompte='$internaute->idcompte'";
            ExecRequete($requete, $connexion);
            
            list($hour, $min, $sec, $day, $mon, $yr) = explode(" ", date("H i s d m y"));
            $date3 = mktime(0, 0, 0, 0, 0, $yr);
            if ($souvenir == 1) {
                setcookie("nettrader2session", "$internaute->idcompte-" . md5($internaute->idcompte . $date3 . $internaute->passe . $internaute->cookiesess), time() + 3600 * 24 * 30, "/");
            }
            $_SESSION['idcompte'] = $internaute->idcompte;
            return "TRUE";
        }
        $maintenant = date("U");
        $insSession = "INSERT INTO `tabforcing` (`idcompte`, `dateforcing`) VALUES ('$internaute->idcompte', '$maintenant');";       
        ExecRequete($insSession, $connexion); 
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

    if (!empty($email)) {
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
    if (!is_object($internaute)) return "";
    effacvieuxordres();
    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $requete = "DELETE FROM session WHERE idcompte='$internaute->idcompte' OR tempsLimite<UNIX_TIMESTAMP()";
    setcookie("nettrader2session", "", time() - 3600, "/");
    ExecRequete($requete, $connexion);
    $tag = md5(getmicrotime());
    $requete = "UPDATE compte SET cookiesess='$tag' WHERE idcompte='$internaute->idcompte'";
    ExecRequete($requete, $connexion);
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
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