<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use PDO;

class TeamController
{
    /**
     * Récupère les détails d'une équipe et sa composition.
     */
    public function getTeam(Request $request, int $id): void
    {
        if ($id <= 0) {
            ApiResponse::error("Identifiant d'équipe invalide", 400);
        }

        $team = getinfogroupe($id);
        if (!is_object($team) || !isset($team->idgroupe) || (int)$team->idgroupe <= 0) {
            ApiResponse::error("Équipe introuvable", 404);
        }

        $membersStmt = getcompositionequipe($id);
        $members = [];
        while ($m = LigneSuivante($membersStmt)) {
            $members[] = [
                'userId' => (int)($m->idcompte ?? 0),
                'pseudo' => (string)$m->pseudonyme,
                'joinDate' => (string)$m->dateinscription,
                'capitalJoin' => (float)$m->capitalinscr,
                'currentCapital' => (float)$m->capital,
                'performance' => (float)$m->prog,
                'isLeader' => ((int)$m->idcompte === (int)$team->idcompte),
            ];
        }

        ApiResponse::success([
            'id' => (int)$team->idgroupe,
            'name' => (string)$team->titregroupe,
            'tag' => (string)$team->initialgroupe,
            'description' => (string)$team->descriptiongroupe,
            'website' => (string)($team->urlsite ?? ''),
            'leader' => [
                'id' => (int)$team->idcompte,
                'pseudo' => (string)$team->pseudonyme,
            ],
            'medals' => [
                'gold' => (int)($team->medor ?? 0),
                'silver' => (int)($team->medargent ?? 0),
                'bronze' => (int)($team->medbronze ?? 0),
            ],
            'members' => $members,
        ]);
    }

    /**
     * Création d'une nouvelle équipe.
     */
    public function createTeam(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $payload = $request->getJson();

        $name = trim((string)($payload['name'] ?? ''));
        $tag = trim((string)($payload['tag'] ?? ''));
        $website = trim((string)($payload['website'] ?? ''));
        $description = trim((string)($payload['description'] ?? ''));

        if (empty($name) || empty($tag)) {
            ApiResponse::error("Le nom de l'équipe et le sigle sont obligatoires.", 400);
        }

        if (strlen($name) < 3 || strlen($name) > 50) {
            ApiResponse::error("Le nom de l'équipe doit comporter entre 3 et 50 caractères.", 400);
        }

        if (strlen($tag) < 2 || strlen($tag) > 10) {
            ApiResponse::error("Le sigle de l'équipe doit comporter entre 2 et 10 caractères.", 400);
        }

        if (strlen($description) > 1000) {
            ApiResponse::error("La description ne doit pas dépasser 1000 caractères.", 400);
        }

        if (!empty($website) && !filter_var($website, FILTER_VALIDATE_URL)) {
            ApiResponse::error("L'adresse du site web est invalide.", 400);
        }

        if (estadmingroupe($userId) || estmembregroupe($userId)) {
            ApiResponse::error("Vous êtes déjà membre ou responsable d'une équipe.", 409);
        }

        $verifLine = getverifgroupe(0, $userId);
        $verif = is_object($verifLine) ? LigneSuivante($verifLine) : null;
        if (is_object($verif) && (int)$verif->idcompte === $userId) {
            ApiResponse::error("Vous avez déjà une demande de création d'équipe en attente de validation.", 409);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $check = ExecRequete("SELECT idgroupe FROM groupe WHERE titregroupe = ? OR initialgroupe = ?", $conn, [$name, $tag]);
        if (LigneSuivante($check)) {
            ApiResponse::error("Ce nom d'équipe ou ce sigle est déjà utilisé par une autre équipe.", 409);
        }

        ob_start();
        $msg = doajgroupe($userId, $name, $tag, $website, $description);
        ob_end_clean();

        ApiResponse::success(null, strip_tags($msg) ?: "Demande de création d'équipe transmise avec succès.", 201);
    }

    /**
     * Rejoindre une équipe suite à invitation.
     */
    public function joinTeam(Request $request, int $id): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        if ($id <= 0) {
            ApiResponse::error("Identifiant d'équipe invalide.", 400);
        }

        $userId = $session->getId();

        $team = getinfogroupe($id);
        if (!is_object($team) || !isset($team->idgroupe) || (int)$team->idgroupe <= 0) {
            ApiResponse::error("Équipe introuvable.", 404);
        }

        if (estmembregroupe($userId) || estadmingroupe($userId)) {
            ApiResponse::error("Vous appartenez déjà à une équipe. Veuillez d'abord la quitter avant d'en rejoindre une nouvelle.", 409);
        }

        if (!membreestinvite($userId, $id)) {
            ApiResponse::error("Vous n'avez pas reçu d'invitation pour rejoindre cette équipe.", 403);
        }

        ob_start();
        dojoingroupe($id);
        ob_end_clean();

        if (estmembregroupe($userId)) {
            ApiResponse::success(null, "Vous avez rejoint l'équipe avec succès !");
        } else {
            ApiResponse::error("Impossible de rejoindre cette équipe.", 400);
        }
    }

    /**
     * Quitter l'équipe actuelle.
     */
    public function leaveTeam(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        if (!estmembregroupe($userId) && !estadmingroupe($userId)) {
            ApiResponse::error("Vous ne faites partie d'aucune équipe.", 400);
        }

        ob_start();
        $msg = doquittegroupe("OK");
        ob_end_clean();

        ApiResponse::success(null, strip_tags($msg) ?: "Vous avez quitté l'équipe.");
    }
}
