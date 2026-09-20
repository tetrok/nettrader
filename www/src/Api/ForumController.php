<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use NetTrader\Service\FormattingService;
use PDO;

class ForumController
{
    /**
     * Liste des forums / rubriques disponibles.
     */
    public function getForums(Request $request): void
    {
        $stmt = get_listeforums();
        $forums = [];

        while ($f = LigneSuivante($stmt)) {
            $forums[] = [
                'id' => (int)$f->frmid,
                'name' => (string)$f->nomforum,
                'description' => (string)($f->descriptionforum ?? ''),
                'topicsCount' => (int)($f->nbsujets ?? 0),
                'messagesCount' => (int)($f->nbmessages ?? 0),
                'hasUnread' => ((int)($f->notif_new ?? 0) === 1),
            ];
        }

        ApiResponse::success($forums);
    }

    /**
     * Liste des sujets dans un forum.
     */
    public function getTopics(Request $request, int $forumId): void
    {
        if ($forumId <= 0) {
            ApiResponse::error("Identifiant de forum invalide", 400);
        }

        $forum = get_infoforum($forumId);
        if (!is_object($forum)) {
            ApiResponse::error("Forum introuvable", 404);
        }

        $page = max(1, $request->getInt('page', 1));
        $limit = min(50, max(5, $request->getInt('limit', 20)));
        $offset = ($page - 1) * $limit;

        $stmt = get_listesujets($forumId, $offset, $limit);
        $topics = [];

        while ($t = LigneSuivante($stmt)) {
            $topics[] = [
                'id' => (int)$t->numsujet,
                'title' => (string)($t->txtsujet ?? $t->titresujet ?? ''),
                'author' => (string)($t->pseudoauteur ?? ''),
                'authorId' => (int)($t->idcompteauteur ?? 0),
                'repliesCount' => (int)($t->s_nbmessages ?? $t->nbreponses ?? 0),
                'viewsCount' => (int)($t->nblectures ?? $t->nbvisites ?? 0),
                'lastPoster' => (string)($t->lastpseudo ?? ''),
                'lastPostDate' => (int)($t->datepost ?? 0),
                'hasUnread' => ((int)($t->notif_new ?? 0) === 1),
            ];
        }

        ApiResponse::success([
            'forum' => [
                'id' => (int)$forum->idforum,
                'name' => (string)$forum->nomforum,
                'description' => (string)($forum->descriptionforum ?? ''),
            ],
            'topics' => $topics,
            'page' => $page,
            'limit' => $limit,
            'total' => (int)($forum->nbsujets ?? count($topics)),
        ]);
    }

    /**
     * Liste des messages d'un sujet.
     */
    public function getTopicMessages(Request $request, int $topicId): void
    {
        if ($topicId <= 0) {
            ApiResponse::error("Identifiant de sujet invalide", 400);
        }

        $topic = get_infosujet($topicId);
        if (!is_object($topic)) {
            ApiResponse::error("Sujet introuvable", 404);
        }

        $page = max(1, $request->getInt('page', 1));
        $limit = min(50, max(5, $request->getInt('limit', 20)));
        $offset = ($page - 1) * $limit;

        $stmt = get_listemessages($topicId, $offset, $limit);
        $messages = [];
        $formatter = new FormattingService();

        while ($m = LigneSuivante($stmt)) {
            $rawContent = (string)($m->contenu ?? $m->corps ?? '');
            $messages[] = [
                'id' => (int)$m->idmessage,
                'authorId' => (int)$m->idcompte,
                'authorPseudo' => (string)$m->auteur,
                'date' => (int)$m->datepost,
                'subject' => (string)($m->txtsujet ?? $m->titremessage ?? ''),
                'content' => $rawContent,
                'formattedContent' => $formatter->parseBBCode($rawContent),
                'teamName' => !empty($m->titregroupe) ? (string)$m->titregroupe : null,
                'teamId' => !empty($m->idgroupe) ? (int)$m->idgroupe : null,
            ];
        }

        ApiResponse::success([
            'topic' => [
                'id' => (int)$topic->idsujet,
                'title' => (string)($topic->txtsujet ?? $topic->titresujet ?? ''),
                'forumId' => (int)$topic->idforum,
                'forumName' => (string)$topic->nomforum,
            ],
            'messages' => $messages,
            'page' => $page,
            'limit' => $limit,
            'total' => (int)($topic->s_nbmessages ?? $topic->nbreponses ?? count($messages)),
        ]);
    }

    /**
     * Publie un message (création d'un sujet ou réponse).
     */
    public function postMessage(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $payload = $request->getJson();
        $forumId = (int)($payload['forumId'] ?? 0);
        $topicId = (int)($payload['topicId'] ?? 0);
        $subject = trim((string)($payload['subject'] ?? ''));
        $content = trim((string)($payload['content'] ?? ''));
        $editId = (int)($payload['editMessageId'] ?? 0);

        if ($forumId <= 0) {
            ApiResponse::error("Identifiant de forum manquant ou invalide.", 400);
        }

        if (empty($content)) {
            ApiResponse::error("Le corps du message ne peut pas être vide.", 400);
        }

        if (strlen($content) > 10000) {
            ApiResponse::error("Le corps du message ne doit pas dépasser 10 000 caractères.", 400);
        }

        if ($topicId === 0 && empty($subject)) {
            ApiResponse::error("Le titre du sujet est obligatoire.", 400);
        }

        if (strlen($subject) > 150) {
            ApiResponse::error("Le titre du sujet ne doit pas dépasser 150 caractères.", 400);
        }

        if (!forum_peutposter($userId, $forumId)) {
            ApiResponse::error("Vous n'avez pas l'autorisation d'écrire dans ce forum.", 403);
        }

        if ($editId > 0) {
            $msgInfo = get_infomessage($editId);
            if (!is_object($msgInfo) || !isset($msgInfo->idmessage)) {
                ApiResponse::error("Message à modifier introuvable.", 404);
            }
            $infoforum = get_infoforum($forumId);
            if (!forum_peut_editer($msgInfo, $infoforum)) {
                ApiResponse::error("Vous n'êtes pas autorisé à modifier ce message.", 403);
            }
        }

        ob_start();
        $res = doforum_postmessage($subject, $content, $forumId, $topicId, ($editId > 0 ? 1 : 0), $editId);
        ob_end_clean();

        $cleanRes = trim(strip_tags((string)$res));
        if (empty($cleanRes) || stripos($cleanRes, "pas l'autorisation") !== false) {
            ApiResponse::error("Action non autorisée.", 403);
        }

        if (stripos($cleanRes, 'patienter') !== false || stripos($cleanRes, 'anti-flood') !== false) {
            ApiResponse::error($cleanRes, 429);
        }

        ApiResponse::success(null, $cleanRes ?: "Message publié avec succès.");
    }
}
