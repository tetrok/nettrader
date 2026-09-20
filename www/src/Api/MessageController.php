<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use PDO;

class MessageController
{
    /**
     * Récupère la boîte de réception des messages.
     */
    public function getInbox(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $page = max(1, $request->getInt('page', 1));
        $limit = min(100, max(5, $request->getInt('limit', 20)));
        $offset = ($page - 1) * $limit;

        $totalCount = (int)listmessagescount($userId);
        $rawMessages = get_messagelist($offset, $limit, $userId);

        $items = [];
        foreach ($rawMessages as $m) {
            $items[] = [
                'id' => (int)($m['idmsg'] ?? $m['idmessage'] ?? 0),
                'senderId' => (int)($m['idenvoyeur'] ?? 0),
                'senderPseudo' => (string)($m['pseudonyme'] ?? 'Système'),
                'title' => (string)$m['titre'],
                'content' => (string)$m['corps'],
                'date' => (int)$m['datemess'],
                'isRead' => (($m['etat'] ?? '') === 'lu' || (int)($m['vu'] ?? 0) === 1),
            ];
        }

        ApiResponse::success([
            'items' => $items,
            'page' => $page,
            'limit' => $limit,
            'total' => $totalCount,
            'totalPages' => (int)ceil($totalCount / $limit),
            'unreadCount' => (int)getnvmessages(),
        ]);
    }

    /**
     * Envoie un message privé à un trader.
     */
    public function sendMessage(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $payload = $request->getJson();

        $destRecipient = trim((string)($payload['recipient'] ?? ''));
        $title = trim((string)($payload['title'] ?? ''));
        $content = trim((string)($payload['content'] ?? ''));

        if (empty($destRecipient) || empty($title) || empty($content)) {
            ApiResponse::error("Le destinataire, le titre et le message sont obligatoires.", 400);
        }

        if (strlen($title) > 120) {
            ApiResponse::error("Le titre du message ne doit pas dépasser 120 caractères.", 400);
        }

        if (strlen($content) > 5000) {
            ApiResponse::error("Le contenu du message ne doit pas dépasser 5000 caractères.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $destUser = null;

        if (is_numeric($destRecipient)) {
            $destUser = ChercheInternaute((int)$destRecipient, $conn, '');
        } else {
            $destUser = ChercheComptePseudo($destRecipient, $conn);
        }

        if (!is_object($destUser) || !isset($destUser->idcompte)) {
            ApiResponse::error("Destinataire introuvable.", 404);
        }

        $destId = (int)$destUser->idcompte;

        if ($destId === $userId) {
            ApiResponse::error("Vous ne pouvez pas vous envoyer un message privé à vous-même.", 400);
        }

        // Limite anti-spam
        if ($session->getAuthLevel() < 2 && function_exists('getnvmessagesenvoye')) {
            $maxUnread = defined('MAX_MESSAGE_ENVOYE_NON_LU') ? MAX_MESSAGE_ENVOYE_NON_LU : 15;
            if (getnvmessagesenvoye($userId) > $maxUnread) {
                ApiResponse::error("Vous avez trop de messages non lus en attente. Veuillez patienter avant d'en envoyer d'autres.", 429);
            }
        }

        add_msg($userId, $destId, $title, $content);

        ApiResponse::success(null, "Message envoyé avec succès.");
    }

    /**
     * Supprime un message.
     */
    public function deleteMessage(Request $request, int $id): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        if ($id <= 0) {
            ApiResponse::error("Identifiant de message invalide", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        // Vérifier que le message appartient bien au joueur
        $stmt = ExecRequete("SELECT idcompte FROM messages WHERE idmsg = ?", $conn, [$id]);
        $row = LigneSuivante($stmt);

        if (!is_object($row) || (int)$row->idcompte !== $session->getId()) {
            ApiResponse::error("Message introuvable ou non autorisé.", 404);
        }

        dodelmessage($id);
        ApiResponse::success(null, "Message supprimé.");
    }
}
