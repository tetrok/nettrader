<?php

/**
 * Fichier: db_connect.php
 * Ce fichier contient les fonctions suivantes :
 * - sec
 * - echoadmin
 * - getmicrotime
 * - cookievalide
 * - Connexion
 * - ExecRequete
 * - LigneSuivante
 * - ChercheInternaute
 * - nbessai
 * - ChercheSession
 * - SessionValide
 * - CreerSession
 * - ControleAcces
 * - deconnection
 * - ChercheComptePseudo
 */

/**
* NetTrader 2
*
* @package NetTrader
* @license http://www.gnu.org/licenses/agpl.html AGPL Version 3
* @author Nicolas Fortin <nfortin@nettrader.fr>
*/

/**
 * Fonction sec (Obsolète : remplacée par les requêtes préparées PDO)
 * @deprecated
 * @param mixed $input
 * @return mixed
 */
function sec($input = "")
{
    if (is_array($input)) {
        $output = [];
        foreach ($input as $key => $champ) {
            $output[$key] = sec($champ);
        }
        return $output;
    }
    return $input;
}

/**
 * Fonction echoadmin
 * @param mixed $message
 */
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

/**
 * Fonction getmicrotime
 */
function getmicrotime()
{
    list($usec, $sec) = explode(" ", microtime());
    return ((float)$usec + (float)$sec);
}
  
/**
 * Fonction cookievalide
 * @param mixed $idSession
 */
function cookievalide($idSession)
{
    if (isset($_COOKIE["nettrader2session"])) {
        $chainecookie = $_COOKIE["nettrader2session"];
        $exploded_ligne = ($chainecookie !== null) ? explode("-", $chainecookie) : array();
        if (!is_array($exploded_ligne) || count($exploded_ligne) < 2) return 0;
        
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
                            . "VALUES (?, ?, ?, ?)";       
                ExecRequete($insSession, $connexion, [$idSession, $idcompte, $tempsLimite, $maintenant]);
                forum_majtoutvuforum($idcompte);
                
                $requete = "UPDATE compte SET dateactivite = ? WHERE idcompte = ?";
                ExecRequete($requete, $connexion, [$maintenant, $idcompte]);
                $_SESSION['idcompte'] = $idcompte;
                return $idcompte;
            }
        }
    }
    return 0;
}

if (!isset($FichierConnexion)) {
    $FichierConnexion = 1;

    /**
     * Fonction Connexion
     * @param mixed $pNom
     * @param mixed $pMotPasse
     * @param mixed $pBase
     * @param mixed $pServeur
     */
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

    /**
     * Fonction ExecRequete
     * @param mixed $requete
     * @param mixed $connexion
     * @param array $params
     */
    function ExecRequete($requete, $connexion = null, $params = [])
    {
        global $nbreqexecuted, $tempssql, $last_pdo_stmt;
        $nbreqexecuted++;
        $tempdeb = getmicrotime();

        if (!($connexion instanceof PDO)) {
            $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
        }

        try {
            if (!empty($params)) {
                $resultat = $connexion->prepare($requete);
                if ($resultat !== false) {
                    $resultat->execute($params);
                }
            } else {
                $resultat = $connexion->query($requete);
            }
        } catch (\PDOException $e) {
            $resultat = false;
        }

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
            echo "<b>Erreur dans l'exécution de la requête :</b><br><code>" . e($requete) . "</code><br><br>";
            echo "<b>Message de MySQL :</b> " . e($errorMsg) . "<br>";
            echo "</div>";
            die();
        }  
    }

    /**
     * Fonction LigneSuivante
     * @param mixed $resultat
     */
    function LigneSuivante($resultat)
    {
        if ($resultat instanceof PDOStatement) {
            return $resultat->fetch(PDO::FETCH_OBJ);
        }
        return false;
    }
}

/**
 * Fonction ChercheInternaute
 * @param mixed $idcompte
 * @param mixed $connexion
 * @param mixed $mail
 */
function ChercheInternaute($idcompte = 0, $connexion, $mail = "")
{
    if ($mail == "") {
        $requete = "SELECT * FROM compte,skin,niveau WHERE idcompte = ? AND compte.idskin = skin.idskin AND compte.idniveau = niveau.idniveau";
        $resultat = ExecRequete($requete, $connexion, [$idcompte]);
    } else {
        $requete = "SELECT * FROM compte,skin,niveau WHERE email = ? AND compte.idskin = skin.idskin AND compte.idniveau = niveau.idniveau";
        $resultat = ExecRequete($requete, $connexion, [$mail]);
    }
    return LigneSuivante($resultat);
}

/**
 * Fonction nbessai
 * @param mixed $idcompte
 */
function nbessai($idcompte)
{
    $depuis = date("U") - 5 * 60;
    $query = "SELECT COUNT(idcompte) as nbessai FROM `tabforcing` WHERE idcompte = ? AND dateforcing > ?";
    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $run_query = ExecRequete($query, $connexion, [$idcompte, $depuis]);
    $resultat = LigneSuivante($run_query);
    return is_object($resultat) ? $resultat->nbessai : 0;
}

/**
 * Fonction ChercheSession
 * @param mixed $idSession
 * @param mixed $connexion
 */
function ChercheSession($idSession, $connexion) 
{
    $requete = "SELECT * FROM session,compte,skin,niveau WHERE idSession = ? AND session.idcompte = compte.idcompte AND compte.idskin = skin.idskin AND compte.idniveau = niveau.idniveau ORDER BY tempsLimite DESC";
    $resultat = ExecRequete($requete, $connexion, [$idSession]);
    return LigneSuivante($resultat);
}

/**
 * Fonction SessionValide
 * @param mixed $connexion
 * @param mixed $session
 */
function SessionValide($connexion, $session)
{
    $maintenant = date("U");
    if (!is_object($session) || $session->tempsLimite < $maintenant) {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        setcookie("nettrader2session", "", time() + 3600 * 24 * 30, "/");
        if (is_object($session)) {
            $sessId = $session->idSession;
            $requete = "DELETE FROM session WHERE idSession = ? OR tempsLimite < ?";
            ExecRequete($requete, $connexion, [$sessId, $maintenant]);
        }
        return false;
    } else {
        if ($session->tempsconnect < $maintenant - 5 * 60) {
            $requete = "UPDATE session SET tempsconnect = ? WHERE idcompte = ?";
            ExecRequete($requete, $connexion, [$maintenant, $session->idcompte]);
            forum_majtoutvuforum($session->idcompte);
            $requete = "UPDATE compte SET dateactivite = ? WHERE idcompte = ?";
            ExecRequete($requete, $connexion, [$maintenant, $session->idcompte]);
        }
        return true;
    }
}

/**
 * Fonction CreerSession
 * @param mixed $connexion
 * @param mixed $email
 * @param mixed $motDePasse
 * @param mixed $idSession
 * @param mixed $souvenir
 */
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
        $passwordMatch = false;
        if (password_verify($motDePasse, (string)$internaute->passe)) {
            $passwordMatch = true;
        } elseif ($internaute->passe === md5($motDePasse)) {
            $passwordMatch = true;
            // Mise à niveau transparente du hash vers BCRYPT
            $newHash = password_hash($motDePasse, PASSWORD_BCRYPT);
            ExecRequete("UPDATE compte SET passe = ? WHERE idcompte = ?", $connexion, [$newHash, $internaute->idcompte]);
            $internaute->passe = $newHash;
        }

        if ($passwordMatch) {
            $maintenant = date("U");
            $tempsLimite = $maintenant + (3600 * 24); 

            $insSession = "INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) "
                        . "VALUES (?, ?, ?, ?)";       
            ExecRequete($insSession, $connexion, [$idSession, $internaute->idcompte, $tempsLimite, $maintenant]);
            forum_majtoutvuforum($internaute->idcompte);
            $requete = "UPDATE compte SET dateactivite = ? WHERE idcompte = ?";
            ExecRequete($requete, $connexion, [$maintenant, $internaute->idcompte]);
            
            list($hour, $min, $sec, $day, $mon, $yr) = explode(" ", date("H i s d m y"));
            $date3 = mktime(0, 0, 0, 0, 0, $yr);
            if ($souvenir == 1) {
                setcookie("nettrader2session", "$internaute->idcompte-" . md5($internaute->idcompte . $date3 . $internaute->passe . $internaute->cookiesess), [
                    'expires' => time() + 3600 * 24 * 30,
                    'path' => '/',
                    'httponly' => true,
                    'samesite' => 'Lax'
                ]);
            }
            $_SESSION['idcompte'] = $internaute->idcompte;
            return "TRUE";
        }
        $maintenant = date("U");
        $insSession = "INSERT INTO `tabforcing` (`idcompte`, `dateforcing`) VALUES (?, ?);";       
        ExecRequete($insSession, $connexion, [$internaute->idcompte, $maintenant]); 
        $internaute = "";
        include_once("lang/lang_fr.php"); 
        return "<B>" . lang(26) . "<P></B>\n";
    } else {
        $internaute = "";
        include_once("lang/lang_fr.php"); 
        return "<B>" . lang(27) . "</B><P>\n";
    }
}

/**
 * Fonction ControleAcces
 * @param mixed &$email
 * @param mixed &$motDePasse
 * @param mixed &$emailInternaute
 * @param mixed $idSession
 * @param mixed $souvenir
 */
function ControleAcces(&$email, &$motDePasse, &$emailInternaute, $idSession, $souvenir)
{
    global $internaute;
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
        $message = CreerSession($connexion, $email, $motDePasse, $idSession, $souvenir);
        if ($message == "TRUE") {
            $emailInternaute = $email;
            return "Bienvenue " . $internaute->pseudonyme . "<br><br>";
        } else {
            return $message;
        }
    }
}

/**
 * Fonction deconnection
 */
function deconnection()
{
    global $internaute;
    if (!is_object($internaute)) return "";
    effacvieuxordres();
    $connexion = Connexion(NOM, PASSE, BASE, SERVEUR);
    $requete = "DELETE FROM session WHERE idcompte = ? OR tempsLimite < UNIX_TIMESTAMP()";
    setcookie("nettrader2session", "", time() - 3600, "/");
    ExecRequete($requete, $connexion, [$internaute->idcompte]);
    $tag = md5(getmicrotime());
    $requete = "UPDATE compte SET cookiesess = ? WHERE idcompte = ?";
    ExecRequete($requete, $connexion, [$tag, $internaute->idcompte]);
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
    $internaute = "";
    return lang(37);
}

/**
 * Fonction ChercheComptePseudo
 * @param mixed $pseudo
 * @param mixed $connexion
 */
function ChercheComptePseudo($pseudo, $connexion)
{
    $requete = "SELECT * FROM compte WHERE pseudonyme = ?";
    $resultat = ExecRequete($requete, $connexion, [$pseudo]);
    return LigneSuivante($resultat);
}
?>