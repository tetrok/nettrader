<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use PDO;

class AuthController
{
    /**
     * Connexion d'un utilisateur.
     * Accepte login (email ou pseudo) et mot de passe.
     */
    public function login(Request $request): void
    {
        $payload = $request->getJson();
        $login = trim((string)($payload['login'] ?? $payload['email'] ?? $request->post('login', $request->post('email', ''))));
        $password = (string)($payload['password'] ?? $payload['motDePasse'] ?? $request->post('password', $request->post('motDePasse', '')));

        if (empty($login) || empty($password)) {
            ApiResponse::error("Veuillez renseigner votre identifiant et votre mot de passe.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $user = null;

        if (strpos($login, '@') !== false) {
            $user = ChercheInternaute(0, $conn, $login);
        } else {
            $user = ChercheComptePseudo($login, $conn);
        }

        if (!is_object($user)) {
            ApiResponse::error("Identifiant ou mot de passe incorrect.", 401);
        }

        if (nbessai($user->idcompte) >= 25) {
            ApiResponse::error("Nombre d'essais dépassé. Veuillez réessayer ultérieurement.", 403);
        }

        $passwordMatch = false;
        if (password_verify($password, (string)$user->passe)) {
            $passwordMatch = true;
        } elseif ($user->passe === md5($password)) {
            $passwordMatch = true;
            // Mise à niveau transparente du hash vers BCRYPT
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            ExecRequete("UPDATE compte SET passe = ? WHERE idcompte = ?", $conn, [$newHash, $user->idcompte]);
            $user->passe = $newHash;
        }

        if (!$passwordMatch) {
            $now = time();
            ExecRequete("INSERT INTO `tabforcing` (`idcompte`, `dateforcing`) VALUES (?, ?)", $conn, [$user->idcompte, $now]);
            ApiResponse::error("Identifiant ou mot de passe incorrect.", 401);
        }

        // Création de la session sécurisée avec CSPRNG
        $sessionId = bin2hex(random_bytes(32));
        $now = time();
        $limit = $now + (3600 * 24 * 7); // 7 jours

        ExecRequete("INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) VALUES (?, ?, ?, ?)", $conn, [
            $sessionId, $user->idcompte, $limit, $now
        ]);
        ExecRequete("UPDATE compte SET dateactivite = ? WHERE idcompte = ?", $conn, [$now, $user->idcompte]);

        // Session PHP native
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['idcompte'] = $user->idcompte;
        }

        // Cookie de session NetTrader
        setcookie("nettrader2session", "$user->idcompte-" . md5($user->idcompte . $user->passe . ($user->cookiesess ?? '')), [
            'expires' => $limit,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        $userSession = UserSession::current();
        $userSession->setUser($user);

        ApiResponse::success([
            'token' => $sessionId,
            'user' => [
                'id' => (int)$user->idcompte,
                'pseudo' => (string)$user->pseudonyme,
                'email' => (string)$user->email,
                'cashback' => (float)$user->cashback,
                'authlevel' => (int)$user->authlevel,
                'isAdmin' => ((int)$user->idcompte === 1 || (int)$user->authlevel > 1),
                'level' => (int)($user->idniveau ?? 1),
                'vad' => (bool)($user->vad ?? false),
            ]
        ], "Connexion réussie");
    }

    /**
     * Inscription d'un nouvel utilisateur.
     */
    public function register(Request $request): void
    {
        $payload = $request->getJson();
        $pseudo = trim((string)($payload['pseudo'] ?? ''));
        $email = trim((string)($payload['email'] ?? ''));
        $password = (string)($payload['password'] ?? '');
        $level = (int)($payload['level'] ?? 1);
        $mailSemaine = (int)($payload['mailSemaine'] ?? 0);
        $mailJour = (int)($payload['mailJour'] ?? 0);

        if (empty($pseudo) || empty($email) || empty($password)) {
            ApiResponse::error("Le pseudo, l'email et le mot de passe sont obligatoires.", 400);
        }

        if (strlen($pseudo) < 3 || strlen($pseudo) > 30) {
            ApiResponse::error("Le pseudonyme doit comporter entre 3 et 30 caractères.", 400);
        }

        if (!preg_match('/^[a-zA-Z0-9_\-\. ]+$/u', $pseudo)) {
            ApiResponse::error("Le pseudonyme contient des caractères non autorisés (seuls les lettres, chiffres, tirets et points sont acceptés).", 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
            ApiResponse::error("Format d'adresse e-mail invalide.", 400);
        }

        if (strlen($password) < 6) {
            ApiResponse::error("Le mot de passe doit comporter au moins 6 caractères.", 400);
        }

        if (strlen($password) > 128) {
            ApiResponse::error("Le mot de passe ne doit pas dépasser 128 caractères.", 400);
        }

        if (!in_array($level, [1, 2, 3], true)) {
            $level = 1;
        }

        $mailJour = !empty($mailJour) ? 1 : 0;
        $mailSemaine = !empty($mailSemaine) ? 1 : 0;

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        // Vérification unicité pseudo & email
        $res = ExecRequete("SELECT pseudonyme, email FROM compte WHERE pseudonyme = ? OR email = ?", $conn, [$pseudo, $email]);
        while ($row = LigneSuivante($res)) {
            if (strtolower($row->pseudonyme) === strtolower($pseudo)) {
                ApiResponse::error("Ce pseudonyme est déjà utilisé par un autre joueur.", 409);
            }
            if (strtolower($row->email) === strtolower($email)) {
                ApiResponse::error("Cette adresse email est déjà enregistrée.", 409);
            }
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $now = time();
        $capdeb = defined('CAPDEB') ? (float)CAPDEB : 10000.0;

        $insertSql = "INSERT INTO `compte` (
            `pseudonyme`, `nom`, `prenom`, `passe`, `dateinscr`,
            `adresse`, `cp`, `ville`, `tel`, `email`,
            `etablissement`, `idniveau`, `cashback`, `maildaily`, `mailweekly`,
            `lastpostaction`, `dateactivite`
        ) VALUES (?, '', '', ?, ?, '', '', '', '', ?, '', ?, ?, ?, ?, '0', ?)";

        $res = ExecRequete($insertSql, $conn, [
            $pseudo, $hash, $now, $email, $level, $capdeb, $mailJour, $mailSemaine, $now
        ]);

        if (!$res) {
            ApiResponse::error("Erreur lors de la création du compte.", 500);
        }

        $newUserId = (int)$conn->lastInsertId();

        // Envoi d'email de bienvenue
        $title = "Bienvenue sur NetTrader 2 !";
        $body = "Bonjour $pseudo,\n\nBienvenue sur NetTrader 2 ! Votre compte a été créé avec un capital initial de " . number_format($capdeb, 2, ',', ' ') . " €.\n\nBons trades !";
        envoimail($email, $title, $body);

        ApiResponse::success([
            'id' => $newUserId,
            'pseudo' => $pseudo,
            'email' => $email,
            'cashback' => $capdeb,
        ], "Inscription réussie avec succès ! Vous pouvez maintenant vous connecter.", 201);
    }

    /**
     * Déconnexion.
     */
    public function logout(Request $request): void
    {
        $session = UserSession::current();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        if ($session->isLoggedIn()) {
            $userId = $session->getId();
            ExecRequete("DELETE FROM session WHERE idcompte = ?", $conn, [$userId]);
            $tag = md5(microtime());
            ExecRequete("UPDATE compte SET cookiesess = ? WHERE idcompte = ?", $conn, [$tag, $userId]);
        }

        $bearer = $request->getBearerToken();
        if (!empty($bearer)) {
            ExecRequete("DELETE FROM session WHERE idSession = ?", $conn, [$bearer]);
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION = [];
            session_destroy();
        }

        setcookie("nettrader2session", "", time() - 3600, "/");

        ApiResponse::success(null, "Déconnexion réussie");
    }

    /**
     * Informations sur l'utilisateur connecté.
     */
    public function me(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $user = $session->getUser();
        ApiResponse::success([
            'id' => $session->getId(),
            'pseudo' => $session->getPseudo(),
            'email' => $session->getEmail(),
            'cashback' => $session->getCashback(),
            'authlevel' => $session->getAuthLevel(),
            'isAdmin' => $session->isAdmin(),
            'level' => (int)($user->idniveau ?? 1),
            'vad' => (bool)($user->vad ?? false),
            'skin' => $session->getSkinRep(),
            'dateinscr' => (int)($user->dateinscr ?? 0),
        ]);
    }

    /**
     * Demande de réinitialisation de mot de passe.
     */
    public function requestPasswordReset(Request $request): void
    {
        $payload = $request->getJson();
        $pseudoOrEmail = trim((string)($payload['login'] ?? $payload['pseudo'] ?? $payload['email'] ?? ''));

        if (empty($pseudoOrEmail)) {
            ApiResponse::error("Veuillez renseigner votre pseudo ou votre email.", 400);
        }

        $msg = formsendpass($pseudoOrEmail);
        ApiResponse::success(null, strip_tags($msg));
    }
}
