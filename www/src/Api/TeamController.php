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

    /**
     * Récupère le statut et les détails de l'équipe du joueur connecté.
     */
    public function getMyTeam(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        // 1. L'utilisateur fait-il partie d'une équipe ?
        $groupRow = getgroupbymembre($userId);
        $team = null;
        $isLeader = false;

        if (is_object($groupRow) && isset($groupRow->idgroupe) && (int)$groupRow->idgroupe > 0) {
            $teamId = (int)$groupRow->idgroupe;
            $fullTeam = getinfogroupe($teamId);
            $isLeader = ((int)$fullTeam->idcompte === $userId);

            $membersStmt = getcompositionequipe($teamId);
            $members = [];
            while ($m = LigneSuivante($membersStmt)) {
                $members[] = [
                    'userId' => (int)($m->idcompte ?? 0),
                    'pseudo' => (string)$m->pseudonyme,
                    'joinDate' => (string)$m->dateinscription,
                    'capitalJoin' => (float)$m->capitalinscr,
                    'currentCapital' => (float)$m->capital,
                    'performance' => (float)$m->prog,
                    'isLeader' => ((int)$m->idcompte === (int)$fullTeam->idcompte),
                ];
            }

            // Invitations en attente envoyées par cette équipe (si leader)
            $pendingInvitesSent = [];
            if ($isLeader) {
                $invStmt = ExecRequete(
                    "SELECT c.idcompte, c.pseudonyme FROM invitegroupe ig JOIN compte c ON ig.idcompte = c.idcompte WHERE ig.idgroupe = ? ORDER BY c.pseudonyme ASC",
                    $conn,
                    [$teamId]
                );
                while ($inv = LigneSuivante($invStmt)) {
                    $pendingInvitesSent[] = [
                        'userId' => (int)$inv->idcompte,
                        'pseudo' => (string)$inv->pseudonyme,
                    ];
                }
            }

            $team = [
                'id' => (int)$fullTeam->idgroupe,
                'name' => (string)$fullTeam->titregroupe,
                'tag' => (string)$fullTeam->initialgroupe,
                'description' => (string)$fullTeam->descriptiongroupe,
                'website' => (string)($fullTeam->urlsite ?? ''),
                'forumId' => isset($fullTeam->idforum) && (int)$fullTeam->idforum > 0 ? (int)$fullTeam->idforum : null,
                'leader' => [
                    'id' => (int)$fullTeam->idcompte,
                    'pseudo' => (string)$fullTeam->pseudonyme,
                ],
                'medals' => [
                    'gold' => (int)($fullTeam->medor ?? 0),
                    'silver' => (int)($fullTeam->medargent ?? 0),
                    'bronze' => (int)($fullTeam->medbronze ?? 0),
                ],
                'members' => $members,
                'pendingInvitesSent' => $pendingInvitesSent,
            ];
        }

        // 2. A-t-il une demande de création ou de modification d'équipe en attente de modération ?
        $pendingVerif = null;
        $verifStmt = ExecRequete("SELECT * FROM verifgroupe WHERE idcompte = ? ORDER BY idverifgroupe DESC LIMIT 1", $conn, [$userId]);
        $verifRow = LigneSuivante($verifStmt);
        if (is_object($verifRow)) {
            $pendingVerif = [
                'id' => (int)$verifRow->idverifgroupe,
                'name' => (string)$verifRow->titregroupe,
                'tag' => (string)$verifRow->initialgroupe,
                'website' => (string)$verifRow->urlsite,
                'description' => (string)$verifRow->descriptiongroupe,
                'isModification' => ((int)$verifRow->idgroupe > 0),
            ];
        }

        ApiResponse::success([
            'hasTeam' => ($team !== null),
            'isLeader' => $isLeader,
            'team' => $team,
            'pendingApproval' => $pendingVerif,
        ]);
    }

    /**
     * Récupère les invitations reçues par l'utilisateur connecté.
     */
    public function getMyInvitations(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        $stmt = ExecRequete(
            "SELECT g.idgroupe, g.titregroupe, g.initialgroupe, g.descriptiongroupe, g.urlsite, c.pseudonyme as leader_pseudo, c.idcompte as leader_id
             FROM invitegroupe ig
             JOIN groupe g ON ig.idgroupe = g.idgroupe
             JOIN compte c ON g.idcompte = c.idcompte
             WHERE ig.idcompte = ?
             ORDER BY g.titregroupe ASC",
            $conn,
            [$userId]
        );

        $invitations = [];
        while ($row = LigneSuivante($stmt)) {
            $invitations[] = [
                'teamId' => (int)$row->idgroupe,
                'name' => (string)$row->titregroupe,
                'tag' => (string)$row->initialgroupe,
                'description' => (string)$row->descriptiongroupe,
                'website' => (string)($row->urlsite ?? ''),
                'leader' => [
                    'id' => (int)$row->leader_id,
                    'pseudo' => (string)$row->leader_pseudo,
                ],
            ];
        }

        ApiResponse::success($invitations);
    }

    /**
     * Refuser une invitation reçue.
     */
    public function rejectInvitation(Request $request, int $teamId): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        ExecRequete("DELETE FROM invitegroupe WHERE idcompte = ? AND idgroupe = ?", $conn, [$userId, $teamId]);

        ApiResponse::success(null, "Invitation refusée.");
    }

    /**
     * Recherche des traders disponibles pour être invités dans une équipe.
     */
    public function searchCandidates(Request $request, int $teamId): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $team = getinfogroupe($teamId);
        if (!is_object($team) || (int)$team->idcompte !== $userId) {
            ApiResponse::error("Seul le chef d'équipe peut rechercher des candidats.", 403);
        }

        $query = trim($request->getString('q', ''));
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        if (strlen($query) > 0) {
            $stmt = ExecRequete(
                "SELECT c.idcompte, c.pseudonyme 
                 FROM compte c 
                 WHERE c.authlevel = '1' 
                   AND c.idcompte NOT IN (SELECT idcompte FROM membregroupe)
                   AND c.idcompte NOT IN (SELECT idcompte FROM invitegroupe WHERE idgroupe = ?)
                   AND c.pseudonyme LIKE ? 
                 ORDER BY c.pseudonyme ASC 
                 LIMIT 20",
                $conn,
                [$teamId, "%$query%"]
            );
        } else {
            $stmt = ExecRequete(
                "SELECT c.idcompte, c.pseudonyme 
                 FROM compte c 
                 WHERE c.authlevel = '1' 
                   AND c.idcompte NOT IN (SELECT idcompte FROM membregroupe)
                   AND c.idcompte NOT IN (SELECT idcompte FROM invitegroupe WHERE idgroupe = ?)
                 ORDER BY c.dateactivite DESC 
                 LIMIT 20",
                $conn,
                [$teamId]
            );
        }

        $candidates = [];
        while ($row = LigneSuivante($stmt)) {
            $candidates[] = [
                'userId' => (int)$row->idcompte,
                'pseudo' => (string)$row->pseudonyme,
            ];
        }

        ApiResponse::success($candidates);
    }

    /**
     * Inviter un joueur dans l'équipe.
     */
    public function invitePlayer(Request $request, int $teamId): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $team = getinfogroupe($teamId);
        if (!is_object($team) || (int)$team->idcompte !== $userId) {
            ApiResponse::error("Seul le chef d'équipe peut inviter des membres.", 403);
        }

        $payload = $request->getJson();
        $targetUserId = (int)($payload['userId'] ?? 0);

        if ($targetUserId <= 0) {
            ApiResponse::error("Identifiant de joueur requis.", 400);
        }

        if (estmembregroupe($targetUserId)) {
            ApiResponse::error("Ce joueur fait déjà partie d'une équipe.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        if (membreestinvite($targetUserId, $teamId)) {
            ApiResponse::error("Ce joueur a déjà été invité dans cette équipe.", 400);
        }

        ExecRequete("INSERT INTO invitegroupe (idgroupe, idcompte) VALUES (?, ?)", $conn, [$teamId, $targetUserId]);

        // Envoyer un message interne au joueur invité
        $subject = "Invitation à rejoindre l'équipe {$team->titregroupe}";
        $content = "Bonjour,\n\nLe chef d'équipe de [{$team->initialgroupe}] {$team->titregroupe} vous invite à rejoindre son club de trading.\nVous pouvez consulter et accepter cette invitation depuis l'onglet Équipes de NetTrader.";
        add_msg($userId, $targetUserId, $subject, $content);

        ApiResponse::success(null, "Invitation envoyée avec succès !");
    }

    /**
     * Annuler une invitation envoyée.
     */
    public function cancelInvitation(Request $request, int $teamId, int $targetUserId): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $team = getinfogroupe($teamId);
        if (!is_object($team) || (int)$team->idcompte !== $userId) {
            ApiResponse::error("Seul le chef d'équipe peut annuler une invitation.", 403);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        ExecRequete("DELETE FROM invitegroupe WHERE idgroupe = ? AND idcompte = ?", $conn, [$teamId, $targetUserId]);

        ApiResponse::success(null, "Invitation annulée.");
    }

    /**
     * Exclure un membre de l'équipe (chef uniquement).
     */
    public function kickMember(Request $request, int $teamId, int $targetUserId): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $team = getinfogroupe($teamId);
        if (!is_object($team) || (int)$team->idcompte !== $userId) {
            ApiResponse::error("Seul le chef d'équipe peut exclure des membres.", 403);
        }

        if ($targetUserId === $userId) {
            ApiResponse::error("Le chef ne peut pas s'exclure lui-même. Utilisez 'Quitter l'équipe'.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        ExecRequete("DELETE FROM membregroupe WHERE idgroupe = ? AND idcompte = ?", $conn, [$teamId, $targetUserId]);

        // Message informatif à l'exclu
        add_msg($userId, $targetUserId, "Exclusion d'équipe", "Vous avez été retiré de l'équipe {$team->titregroupe}.");

        ApiResponse::success(null, "Le membre a été exclu de l'équipe.");
    }

    /**
     * Mettre à jour les informations d'une équipe (soumission pour modération admin).
     */
    public function updateTeam(Request $request, int $teamId): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $team = getinfogroupe($teamId);
        if (!is_object($team) || (int)$team->idcompte !== $userId) {
            ApiResponse::error("Seul le chef d'équipe peut modifier les informations.", 403);
        }

        $payload = $request->getJson();
        $name = trim((string)($payload['name'] ?? $team->titregroupe));
        $tag = trim((string)($payload['tag'] ?? $team->initialgroupe));
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

        if (!empty($website) && !filter_var($website, FILTER_VALIDATE_URL)) {
            ApiResponse::error("L'adresse du site web est invalide.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $check = ExecRequete("SELECT idgroupe FROM groupe WHERE (titregroupe = ? OR initialgroupe = ?) AND idgroupe != ?", $conn, [$name, $tag, $teamId]);
        if (LigneSuivante($check)) {
            ApiResponse::error("Ce nom d'équipe ou ce sigle est déjà utilisé par une autre équipe.", 409);
        }

        domodifgroupe($teamId, $userId, $name, $tag, $website, $description);

        ApiResponse::success(null, "Modifications soumises à la validation d'un administrateur.");
    }
}

