<?php

namespace NetTrader\Repository;

use PDO;

/**
 * Repository pour le forum de discussion (sections, forums, sujets, messages).
 */
class ForumRepository extends BaseRepository
{
    public function getSections(): array
    {
        return $this->fetchAll("SELECT idsection, libellesection FROM f_section ORDER BY idsection ASC");
    }

    public function getSectionById(int $id): ?object
    {
        return $this->fetchOne("SELECT * FROM f_section WHERE idsection = ?", [$id]);
    }

    public function createSection(string $name): int
    {
        $this->execute("INSERT INTO f_section (libellesection) VALUES (?)", [$name]);
        return $this->lastInsertId();
    }

    public function getForums(?int $sectionId = null): array
    {
        $sql = "SELECT ff.*, COALESCE(fs.libellesection, 'Sans section') as libellesection
                FROM f_forum ff
                LEFT JOIN f_section fs ON ff.idsection = fs.idsection";
        $params = [];
        if ($sectionId !== null && $sectionId > 0) {
            $sql .= " WHERE ff.idsection = ?";
            $params = [$sectionId];
        }
        $sql .= " ORDER BY ff.idsection ASC, ff.idforum ASC";
        return $this->fetchAll($sql, $params);
    }

    public function getForumById(int $id): ?object
    {
        $sql = "SELECT ff.*, COALESCE(fs.libellesection, 'Sans section') as libellesection
                FROM f_forum ff
                LEFT JOIN f_section fs ON ff.idsection = fs.idsection
                WHERE ff.idforum = ?";
        return $this->fetchOne($sql, [$id]);
    }

    public function createForum(array $data): int
    {
        $sql = "INSERT INTO f_forum (idsection, nomforum, descriptionforum, authread, authwrite, nbsujets, nbmessages, idlastmessage)
                VALUES (?, ?, ?, ?, ?, 0, 0, 0)";
        $this->execute($sql, [
            $data['sectionId'],
            $data['name'],
            $data['description'] ?? '',
            $data['authread'] ?? 'ouvert',
            $data['authwrite'] ?? 'identifie',
        ]);
        return $this->lastInsertId();
    }

    public function updateForum(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        if (isset($data['name'])) {
            $fields[] = "nomforum = ?";
            $params[] = $data['name'];
        }
        if (isset($data['description'])) {
            $fields[] = "descriptionforum = ?";
            $params[] = $data['description'];
        }
        if (isset($data['sectionId'])) {
            $fields[] = "idsection = ?";
            $params[] = (int)$data['sectionId'];
        }
        if (isset($data['authread'])) {
            $fields[] = "authread = ?";
            $params[] = $data['authread'];
        }
        if (isset($data['authwrite'])) {
            $fields[] = "authwrite = ?";
            $params[] = $data['authwrite'];
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $id;
        return $this->execute("UPDATE f_forum SET " . implode(", ", $fields) . " WHERE idforum = ?", $params);
    }

    public function deleteForum(int $id): bool
    {
        $topics = $this->fetchAll("SELECT idsujet FROM f_sujet WHERE idforum = ?", [$id]);
        foreach ($topics as $t) {
            $this->deleteTopic((int)$t->idsujet);
        }
        $this->execute("DELETE FROM f_readforum WHERE idforum = ?", [$id]);
        return $this->execute("DELETE FROM f_forum WHERE idforum = ?", [$id]);
    }

    public function getTopics(int $forumId, int $limit = 25, int $offset = 0): array
    {
        $sql = "SELECT s.idsujet, s.idforum, s.txtsujet, s.s_nbmessages, s.nblectures, s.idlastmessage,
                       c.pseudonyme as author,
                       lm.datepost as last_date
                FROM f_sujet s
                LEFT JOIN compte c ON s.idcompteauteur = c.idcompte
                LEFT JOIN f_message lm ON lm.idmessage = s.idlastmessage
                WHERE s.idforum = ?
                ORDER BY s.idlastmessage DESC, s.idsujet DESC
                LIMIT $offset, $limit";
        return $this->fetchAll($sql, [$forumId]);
    }

    public function countTopics(int $forumId): int
    {
        $res = $this->fetchOne("SELECT COUNT(*) as c FROM f_sujet WHERE idforum = ?", [$forumId]);
        return $res ? (int)$res->c : 0;
    }

    public function getTopicById(int $id): ?object
    {
        $sql = "SELECT s.*, f.nomforum, f.authread, f.authwrite 
                FROM f_sujet s
                JOIN f_forum f ON s.idforum = f.idforum
                WHERE s.idsujet = ?";
        return $this->fetchOne($sql, [$id]);
    }

    public function createTopic(int $forumId, int $accountId, string $title, string $content): int
    {
        $now = time();
        $this->execute(
            "INSERT INTO f_sujet (idforum, txtsujet, idcompteauteur, s_nbmessages, nblectures, idlastmessage) VALUES (?, ?, ?, 0, 0, 0)",
            [$forumId, $title, $accountId]
        );
        $topicId = $this->lastInsertId();

        $this->execute(
            "INSERT INTO f_message (idsujet, datepost, idcompte) VALUES (?, ?, ?)",
            [$topicId, $now, $accountId]
        );
        $messageId = $this->lastInsertId();

        $this->execute(
            "INSERT INTO f_corps (idmessage, contenu) VALUES (?, ?)",
            [$messageId, $content]
        );

        $this->execute(
            "UPDATE f_sujet SET idlastmessage = ? WHERE idsujet = ?",
            [$messageId, $topicId]
        );

        $this->syncForum($forumId);
        return $topicId;
    }

    public function updateTopic(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        if (isset($data['title'])) {
            $fields[] = "txtsujet = ?";
            $params[] = $data['title'];
        }
        if (isset($data['forumId'])) {
            $fields[] = "idforum = ?";
            $params[] = (int)$data['forumId'];
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $id;
        return $this->execute("UPDATE f_sujet SET " . implode(", ", $fields) . " WHERE idsujet = ?", $params);
    }

    public function deleteTopic(int $topicId): bool
    {
        $topic = $this->getTopicById($topicId);
        $forumId = $topic ? (int)$topic->idforum : 0;

        $messages = $this->fetchAll("SELECT idmessage FROM f_message WHERE idsujet = ?", [$topicId]);
        foreach ($messages as $m) {
            $this->execute("DELETE FROM f_corps WHERE idmessage = ?", [$m->idmessage]);
        }
        $this->execute("DELETE FROM f_message WHERE idsujet = ?", [$topicId]);
        $this->execute("DELETE FROM f_readsujet WHERE idsujet = ?", [$topicId]);
        $res = $this->execute("DELETE FROM f_sujet WHERE idsujet = ?", [$topicId]);

        if ($forumId > 0) {
            $this->syncForum($forumId);
        }
        return $res;
    }

    public function getMessages(int $topicId, int $limit = 25, int $offset = 0): array
    {
        $sql = "SELECT m.idmessage, m.idsujet, m.datepost, m.idcompte,
                       c.contenu,
                       u.pseudonyme, u.authlevel, u.idniveau
                FROM f_message m
                JOIN f_corps c ON m.idmessage = c.idmessage
                LEFT JOIN compte u ON m.idcompte = u.idcompte
                WHERE m.idsujet = ?
                ORDER BY m.idmessage ASC
                LIMIT $offset, $limit";
        return $this->fetchAll($sql, [$topicId]);
    }

    public function countMessages(int $topicId): int
    {
        $res = $this->fetchOne("SELECT COUNT(*) as c FROM f_message WHERE idsujet = ?", [$topicId]);
        return $res ? (int)$res->c : 0;
    }

    public function postMessage(int $topicId, int $accountId, string $content): int
    {
        $now = time();
        $this->execute(
            "INSERT INTO f_message (idsujet, datepost, idcompte) VALUES (?, ?, ?)",
            [$topicId, $now, $accountId]
        );
        $messageId = $this->lastInsertId();

        $this->execute(
            "INSERT INTO f_corps (idmessage, contenu) VALUES (?, ?)",
            [$messageId, $content]
        );

        $topic = $this->getTopicById($topicId);
        $forumId = $topic ? (int)$topic->idforum : 0;

        $msgCount = $this->countMessages($topicId);
        $this->execute(
            "UPDATE f_sujet SET s_nbmessages = ?, idlastmessage = ? WHERE idsujet = ?",
            [max(0, $msgCount - 1), $messageId, $topicId]
        );

        if ($forumId > 0) {
            $this->syncForum($forumId);
        }
        return $messageId;
    }

    public function updateMessage(int $messageId, string $content): bool
    {
        return $this->execute("UPDATE f_corps SET contenu = ? WHERE idmessage = ?", [$content, $messageId]);
    }

    public function deleteMessage(int $messageId): bool
    {
        $msg = $this->fetchOne("SELECT fm.idsujet, fs.idforum FROM f_message fm JOIN f_sujet fs ON fm.idsujet = fs.idsujet WHERE fm.idmessage = ?", [$messageId]);
        if (!$msg) {
            return false;
        }
        $topicId = (int)$msg->idsujet;
        $forumId = (int)$msg->idforum;

        $this->execute("DELETE FROM f_corps WHERE idmessage = ?", [$messageId]);
        $this->execute("DELETE FROM f_message WHERE idmessage = ?", [$messageId]);

        $remain = $this->countMessages($topicId);
        if ($remain === 0) {
            $this->execute("DELETE FROM f_readsujet WHERE idsujet = ?", [$topicId]);
            $this->execute("DELETE FROM f_sujet WHERE idsujet = ?", [$topicId]);
        } else {
            $lastMsg = $this->fetchOne("SELECT MAX(idmessage) as m FROM f_message WHERE idsujet = ?", [$topicId]);
            $lastMsgId = $lastMsg ? (int)$lastMsg->m : 0;
            $this->execute("UPDATE f_sujet SET s_nbmessages = ?, idlastmessage = ? WHERE idsujet = ?", [max(0, $remain - 1), $lastMsgId, $topicId]);
        }

        $this->syncForum($forumId);
        return true;
    }

    /**
     * Synchronise les compteurs de messages/sujets et le dernier message d'une rubrique.
     */
    public function syncForum(int $forumId): void
    {
        $sql = "UPDATE f_forum ff 
                SET nbsujets = (SELECT COUNT(*) FROM f_sujet fs WHERE fs.idforum = ff.idforum),
                    nbmessages = COALESCE((SELECT SUM(fs.s_nbmessages) FROM f_sujet fs WHERE fs.idforum = ff.idforum), 0),
                    idlastmessage = COALESCE((SELECT MAX(fs.idlastmessage) FROM f_sujet fs WHERE fs.idforum = ff.idforum), 0)
                WHERE ff.idforum = ?";
        $this->execute($sql, [$forumId]);
    }
}
