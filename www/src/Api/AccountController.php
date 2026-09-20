<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use PDO;

class AccountController
{
    /**
     * Récupère le profil détaillé du joueur connecté.
     */
    public function getProfile(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $user = ChercheInternaute($userId, $conn, '');

        if (!is_object($user)) {
            ApiResponse::error("Utilisateur introuvable", 404);
        }

        ApiResponse::success([
            'id' => (int)$user->idcompte,
            'pseudo' => (string)$user->pseudonyme,
            'email' => (string)$user->email,
            'level' => (int)($user->idniveau ?? 1),
            'cashback' => (float)$user->cashback,
            'mailDaily' => (bool)($user->maildaily ?? false),
            'mailWeekly' => (bool)($user->mailweekly ?? false),
            'skin' => (string)($user->repskin ?? 'default'),
            'dateRegistered' => (int)($user->dateinscr ?? 0),
            'totalTransactions' => (int)listhistocount($userId),
        ]);
    }

    /**
     * Met à jour le profil du joueur (email, niveau, abonnements mails).
     */
    public function updateProfile(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $user = ChercheInternaute($userId, $conn, '');

        if (!is_object($user)) {
            ApiResponse::error("Utilisateur introuvable", 404);
        }

        $payload = $request->getJson();

        // 1. Validation de l'email (préservation si non fourni dans le payload)
        if (array_key_exists('email', $payload)) {
            $email = trim((string)$payload['email']);
            if (empty($email)) {
                ApiResponse::error("L'adresse e-mail ne peut pas être vide.", 400);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                ApiResponse::error("Format d'adresse e-mail invalide.", 400);
            }
            if (strlen($email) > 100) {
                ApiResponse::error("L'adresse e-mail ne doit pas dépasser 100 caractères.", 400);
            }

            $checkStmt = ExecRequete("SELECT idcompte FROM compte WHERE email = ? AND idcompte != ?", $conn, [$email, $userId]);
            if (LigneSuivante($checkStmt)) {
                ApiResponse::error("Cette adresse email est déjà utilisée par un autre joueur.", 409);
            }
        } else {
            $email = (string)$user->email;
        }

        // 2. Validation du niveau (autorisé uniquement entre 1 et 3 : Débutant, Initié, Expert)
        if (array_key_exists('level', $payload)) {
            $level = (int)$payload['level'];
            if (!in_array($level, [1, 2, 3], true)) {
                ApiResponse::error("Niveau invalide. Niveaux autorisés : 1 (Débutant), 2 (Initié), 3 (Expert).", 400);
            }
        } else {
            $level = (int)($user->idniveau ?? 1);
        }

        // 3. Validation des préférences de notification par email
        $mailDaily = array_key_exists('mailDaily', $payload)
            ? (!empty($payload['mailDaily']) ? 1 : 0)
            : (int)($user->maildaily ?? 0);

        $mailWeekly = array_key_exists('mailWeekly', $payload)
            ? (!empty($payload['mailWeekly']) ? 1 : 0)
            : (int)($user->mailweekly ?? 0);

        $query = "UPDATE compte SET email = ?, idniveau = ?, maildaily = ?, mailweekly = ? WHERE idcompte = ?";
        ExecRequete($query, $conn, [$email, $level, $mailDaily, $mailWeekly, $userId]);

        ApiResponse::success(null, "Profil mis à jour avec succès.");
    }

    /**
     * Modification du mot de passe.
     */
    public function changePassword(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $payload = $request->getJson();

        $currentPassword = (string)($payload['currentPassword'] ?? '');
        $newPassword = (string)($payload['newPassword'] ?? '');
        $confirmPassword = (string)($payload['confirmPassword'] ?? '');

        if (empty($currentPassword) || empty($newPassword)) {
            ApiResponse::error("Veuillez renseigner votre mot de passe actuel et le nouveau mot de passe.", 400);
        }

        if ($newPassword !== $confirmPassword) {
            ApiResponse::error("La confirmation du mot de passe ne correspond pas.", 400);
        }

        if (strlen($newPassword) < 6) {
            ApiResponse::error("Le nouveau mot de passe doit comporter au moins 6 caractères.", 400);
        }

        if (strlen($newPassword) > 128) {
            ApiResponse::error("Le mot de passe ne doit pas dépasser 128 caractères.", 400);
        }

        $user = ChercheInternaute($userId, $conn, '');
        $passwordMatch = false;
        if (password_verify($currentPassword, (string)$user->passe) || $user->passe === md5($currentPassword)) {
            $passwordMatch = true;
        }

        if (!$passwordMatch) {
            ApiResponse::error("Le mot de passe actuel est incorrect.", 403);
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        ExecRequete("UPDATE compte SET passe = ? WHERE idcompte = ?", $conn, [$newHash, $userId]);

        // Révocation de toutes les autres sessions actives du compte pour empêcher les accès résiduels
        $bearer = $request->getBearerToken();
        if (!empty($bearer)) {
            ExecRequete("DELETE FROM session WHERE idcompte = ? AND idSession != ?", $conn, [$userId, $bearer]);
        } else {
            ExecRequete("DELETE FROM session WHERE idcompte = ?", $conn, [$userId]);
        }
        $tag = md5(microtime());
        ExecRequete("UPDATE compte SET cookiesess = ? WHERE idcompte = ?", $conn, [$tag, $userId]);

        ApiResponse::success(null, "Votre mot de passe a été modifié avec succès.");
    }

    /**
     * Remise à Zéro (RAZ) du compte du joueur.
     */
    public function resetAccount(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $payload = $request->getJson();

        $password = (string)($payload['password'] ?? '');
        $confirmText = trim((string)($payload['confirmText'] ?? ''));

        if ($confirmText !== 'OK') {
            ApiResponse::error("Veuillez saisir le texte de confirmation 'OK'.", 400);
        }

        $user = ChercheInternaute($userId, $conn, '');
        $passwordMatch = false;
        if (password_verify($password, (string)$user->passe) || $user->passe === md5($password)) {
            $passwordMatch = true;
        }

        if (!$passwordMatch) {
            ApiResponse::error("Mot de passe incorrect.", 403);
        }

        if (estadmingroupe($userId)) {
            fctgetoffteammaster($userId);
        }

        fctdoraz($userId, 0);

        ApiResponse::success([
            'cashback' => defined('CAPDEB') ? (float)CAPDEB : 10000.0,
        ], "Votre compte a été réinitialisé à 10 000 €. Bon retour dans la compétition !");
    }
}
