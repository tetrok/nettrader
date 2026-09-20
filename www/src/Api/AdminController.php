<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use PDO;

class AdminController
{
    private function checkAdmin(UserSession $session): void
    {
        if (!$session->isLoggedIn() || !$session->isAdmin()) {
            ApiResponse::error("Accès réservé aux administrateurs", 403);
        }
    }

    /**
     * Tableau de bord administration avec statistiques clés.
     */
    public function getDashboard(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        $playersCount = (int)LigneSuivante(ExecRequete("SELECT COUNT(*) as c FROM compte", $conn))->c;
        $ordersCount = (int)LigneSuivante(ExecRequete("SELECT COUNT(*) as c FROM ordre", $conn))->c;
        $activeSessions = (int)LigneSuivante(ExecRequete("SELECT COUNT(*) as c FROM session WHERE tempsLimite > UNIX_TIMESTAMP()", $conn))->c;
        $stocksCount = (int)LigneSuivante(ExecRequete("SELECT COUNT(*) as c FROM cacval", $conn))->c;
        $pendingTeams = (int)LigneSuivante(ExecRequete("SELECT COUNT(*) as c FROM verifgroupe", $conn))->c;

        ApiResponse::success([
            'totalPlayers' => $playersCount,
            'pendingOrders' => $ordersCount,
            'activeSessions' => $activeSessions,
            'totalStocks' => $stocksCount,
            'pendingTeamApprovals' => $pendingTeams,
            'phpVersion' => phpversion(),
            'serverTime' => time(),
        ]);
    }

    /**
     * Liste des joueurs pour modération.
     */
    public function getPlayers(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $search = trim($request->getString('search', ''));
        $page = max(1, $request->getInt('page', 1));
        $limit = min(100, max(5, $request->getInt('limit', 25)));
        $offset = ($page - 1) * $limit;

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $params = [];
        $sql = "SELECT idcompte, pseudonyme, email, cashback, dateinscr, dateactivite, idniveau, authlevel FROM compte WHERE 1=1";
        if (!empty($search)) {
            $sql .= " AND (pseudonyme LIKE ? OR email LIKE ?)";
            $params = ["%$search%", "%$search%"];
        }
        $countSql = "SELECT COUNT(*) as total FROM (" . $sql . ") as t";
        $total = (int)LigneSuivante(ExecRequete($countSql, $conn, $params))->total;

        $sql .= " ORDER BY dateactivite DESC LIMIT $offset, $limit";
        $stmt = ExecRequete($sql, $conn, $params);

        $players = [];
        while ($p = LigneSuivante($stmt)) {
            $players[] = [
                'id' => (int)$p->idcompte,
                'pseudo' => (string)$p->pseudonyme,
                'email' => (string)$p->email,
                'cashback' => (float)$p->cashback,
                'registeredAt' => (int)$p->dateinscr,
                'lastActive' => (int)$p->dateactivite,
                'level' => (int)$p->idniveau,
                'authLevel' => (int)$p->authlevel,
            ];
        }

        ApiResponse::success([
            'items' => $players,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int)ceil($total / $limit),
        ]);
    }

    /**
     * Forcer l'exécution des ordres boursiers en attente.
     */
    public function executeOrdersJob(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        execute_ordre();
        ApiResponse::success(null, "L'algorithme d'exécution des ordres a été exécuté.");
    }

    /**
     * Helper pour synchroniser les compteurs et le dernier message d'un forum.
     */
    private function syncForumInternal(int $forumId, $conn): void
    {
        $sql1 = "UPDATE f_sujet fs 
                 SET s_nbmessages = GREATEST(0, (SELECT COUNT(*) FROM f_message fm WHERE fm.idsujet = fs.idsujet) - 1),
                     idlastmessage = COALESCE((SELECT MAX(fm.idmessage) FROM f_message fm WHERE fm.idsujet = fs.idsujet), 0)
                 WHERE fs.idforum = ?";
        ExecRequete($sql1, $conn, [$forumId]);

        $sql2 = "UPDATE f_forum ff 
                 SET nbsujets = (SELECT COUNT(*) FROM f_sujet fs WHERE fs.idforum = ff.idforum),
                     nbmessages = COALESCE((SELECT COUNT(*) FROM f_message fm JOIN f_sujet fs ON fm.idsujet = fs.idsujet WHERE fs.idforum = ff.idforum), 0),
                     idlastmessage = COALESCE((SELECT MAX(fs.idlastmessage) FROM f_sujet fs WHERE fs.idforum = ff.idforum), 0)
                 WHERE ff.idforum = ?";
        ExecRequete($sql2, $conn, [$forumId]);
    }

    // -------------------------------------------------------------------------
    // Sections & Rubriques de Forums
    // -------------------------------------------------------------------------

    public function getForumSections(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $stmt = ExecRequete("SELECT idsection, libellesection FROM f_section ORDER BY idsection ASC", $conn);
        $sections = [];
        while ($s = LigneSuivante($stmt)) {
            $sections[] = [
                'id' => (int)$s->idsection,
                'name' => (string)$s->libellesection,
            ];
        }

        ApiResponse::success($sections);
    }

    public function createForumSection(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $payload = $request->getJson();
        $name = trim((string)($payload['name'] ?? ''));
        if (empty($name)) {
            ApiResponse::error("Le libellé de la section ne peut pas être vide.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        ExecRequete("INSERT INTO f_section (libellesection) VALUES (?)", $conn, [$name]);
        $newId = (int)$conn->lastInsertId();

        ApiResponse::success(['id' => $newId, 'name' => $name], "Section créée avec succès.", 201);
    }

    public function getForumForums(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $sql = "SELECT ff.*, COALESCE(fs.libellesection, 'Sans section') as libellesection
                FROM f_forum ff
                LEFT JOIN f_section fs ON ff.idsection = fs.idsection
                ORDER BY ff.idsection ASC, ff.idforum ASC";
        $stmt = ExecRequete($sql, $conn);

        $forums = [];
        while ($f = LigneSuivante($stmt)) {
            $forums[] = [
                'id' => (int)$f->idforum,
                'sectionId' => (int)$f->idsection,
                'sectionName' => (string)$f->libellesection,
                'name' => (string)$f->nomforum,
                'description' => (string)($f->descriptionforum ?? ''),
                'topicsCount' => (int)($f->nbsujets ?? 0),
                'messagesCount' => (int)($f->nbmessages ?? 0),
                'authread' => (string)($f->authread ?? 'ouvert'),
                'authwrite' => (string)($f->authwrite ?? 'identifie'),
            ];
        }

        ApiResponse::success($forums);
    }

    public function createForum(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $payload = $request->getJson();
        $name = trim((string)($payload['name'] ?? ''));
        $description = trim((string)($payload['description'] ?? ''));
        $sectionId = (int)($payload['sectionId'] ?? 1);
        $authread = in_array($payload['authread'] ?? '', ['ouvert', 'identifie', 'admin', 'groupe']) ? $payload['authread'] : 'ouvert';
        $authwrite = in_array($payload['authwrite'] ?? '', ['identifie', 'admin', 'groupe']) ? $payload['authwrite'] : 'identifie';

        if (empty($name)) {
            ApiResponse::error("Le nom du forum est obligatoire.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $sql = "INSERT INTO f_forum (idsection, nomforum, descriptionforum, nbsujets, nbmessages, idlastmessage, authread, authwrite)
                VALUES (?, ?, ?, 0, 0, 0, ?, ?)";
        ExecRequete($sql, $conn, [$sectionId, $name, $description, $authread, $authwrite]);
        $newId = (int)$conn->lastInsertId();

        ApiResponse::success(['id' => $newId], "Forum créé avec succès.", 201);
    }

    public function updateForum(Request $request, int $id): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        if ($id <= 0) {
            ApiResponse::error("Identifiant de forum invalide.", 400);
        }

        $payload = $request->getJson();
        $name = trim((string)($payload['name'] ?? ''));
        $description = trim((string)($payload['description'] ?? ''));
        $sectionId = (int)($payload['sectionId'] ?? 0);
        $authread = in_array($payload['authread'] ?? '', ['ouvert', 'identifie', 'admin', 'groupe']) ? $payload['authread'] : 'ouvert';
        $authwrite = in_array($payload['authwrite'] ?? '', ['identifie', 'admin', 'groupe']) ? $payload['authwrite'] : 'identifie';

        if (empty($name)) {
            ApiResponse::error("Le nom du forum est obligatoire.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $sql = "UPDATE f_forum SET nomforum = ?, descriptionforum = ?, idsection = ?, authread = ?, authwrite = ? WHERE idforum = ?";
        ExecRequete($sql, $conn, [$name, $description, $sectionId, $authread, $authwrite, $id]);

        ApiResponse::success(null, "Forum mis à jour avec succès.");
    }

    public function deleteForum(Request $request, int $id): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        if ($id <= 0) {
            ApiResponse::error("Identifiant de forum invalide.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        // Nettoyage en cascade des sujets et messages
        $stmt = ExecRequete("SELECT idsujet FROM f_sujet WHERE idforum = ?", $conn, [$id]);
        while ($row = LigneSuivante($stmt)) {
            $topicId = (int)$row->idsujet;
            ExecRequete("DELETE fc FROM f_corps fc INNER JOIN f_message fm ON fc.idmessage = fm.idmessage WHERE fm.idsujet = ?", $conn, [$topicId]);
            ExecRequete("DELETE FROM f_message WHERE idsujet = ?", $conn, [$topicId]);
            ExecRequete("DELETE FROM f_readsujet WHERE idsujet = ?", $conn, [$topicId]);
        }
        ExecRequete("DELETE FROM f_sujet WHERE idforum = ?", $conn, [$id]);
        ExecRequete("DELETE FROM f_readforum WHERE idforum = ?", $conn, [$id]);
        ExecRequete("DELETE FROM f_forum WHERE idforum = ?", $conn, [$id]);

        ApiResponse::success(null, "Forum et ses contenus supprimés avec succès.");
    }

    public function syncForum(Request $request, int $id): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        if ($id <= 0) {
            ApiResponse::error("Identifiant de forum invalide.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $this->syncForumInternal($id, $conn);

        ApiResponse::success(null, "Les compteurs du forum ont été resynchronisés.");
    }

    // -------------------------------------------------------------------------
    // Modération des Sujets
    // -------------------------------------------------------------------------

    public function getForumTopics(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $forumId = $request->getInt('forumId', 0);
        $search = trim($request->getString('search', ''));
        $page = max(1, $request->getInt('page', 1));
        $limit = min(100, max(5, $request->getInt('limit', 20)));
        $offset = ($page - 1) * $limit;

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $where = "1=1";
        $params = [];
        if ($forumId > 0) {
            $where .= " AND fs.idforum = ?";
            $params[] = $forumId;
        }
        if (!empty($search)) {
            $where .= " AND (fs.txtsujet LIKE ? OR ca.pseudonyme LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $countSql = "SELECT COUNT(*) as total FROM f_sujet fs LEFT JOIN compte ca ON fs.idcompteauteur = ca.idcompte WHERE $where";
        $total = (int)LigneSuivante(ExecRequete($countSql, $conn, $params))->total;

        $sql = "SELECT fs.*, ff.nomforum, ca.pseudonyme as pseudoauteur, cl.pseudonyme as lastpseudo, fm.datepost as lastdate
                FROM f_sujet fs
                LEFT JOIN f_forum ff ON fs.idforum = ff.idforum
                LEFT JOIN compte ca ON fs.idcompteauteur = ca.idcompte
                LEFT JOIN f_message fm ON fs.idlastmessage = fm.idmessage
                LEFT JOIN compte cl ON fm.idcompte = cl.idcompte
                WHERE $where
                ORDER BY fs.idlastmessage DESC
                LIMIT $offset, $limit";
        $stmt = ExecRequete($sql, $conn, $params);
        $items = [];
        while ($t = LigneSuivante($stmt)) {
            $items[] = [
                'id' => (int)$t->idsujet,
                'forumId' => (int)$t->idforum,
                'forumName' => (string)($t->nomforum ?? 'Inconnu'),
                'title' => (string)$t->txtsujet,
                'authorId' => (int)$t->idcompteauteur,
                'authorPseudo' => (string)($t->pseudoauteur ?? 'Inconnu'),
                'repliesCount' => (int)$t->s_nbmessages,
                'viewsCount' => (int)$t->nblectures,
                'lastPoster' => (string)($t->lastpseudo ?? '—'),
                'lastPostDate' => (int)($t->lastdate ?? 0),
            ];
        }

        ApiResponse::success([
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int)ceil($total / $limit),
        ]);
    }

    public function updateTopic(Request $request, int $id): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        if ($id <= 0) {
            ApiResponse::error("Identifiant de sujet invalide.", 400);
        }

        $payload = $request->getJson();
        $title = isset($payload['title']) ? trim((string)$payload['title']) : null;
        $targetForumId = isset($payload['forumId']) ? (int)$payload['forumId'] : 0;

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $topic = LigneSuivante(ExecRequete("SELECT * FROM f_sujet WHERE idsujet = ?", $conn, [$id]));
        if (!is_object($topic)) {
            ApiResponse::error("Sujet introuvable.", 404);
        }
        $oldForumId = (int)$topic->idforum;

        if ($title !== null && !empty($title)) {
            ExecRequete("UPDATE f_sujet SET txtsujet = ? WHERE idsujet = ?", $conn, [$title, $id]);
        }

        if ($targetForumId > 0 && $targetForumId !== $oldForumId) {
            ExecRequete("UPDATE f_sujet SET idforum = ? WHERE idsujet = ?", $conn, [$targetForumId, $id]);
            $this->syncForumInternal($oldForumId, $conn);
            $this->syncForumInternal($targetForumId, $conn);
        }

        ApiResponse::success(null, "Sujet mis à jour avec succès.");
    }

    public function deleteTopic(Request $request, int $id): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        if ($id <= 0) {
            ApiResponse::error("Identifiant de sujet invalide.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $topic = LigneSuivante(ExecRequete("SELECT idforum FROM f_sujet WHERE idsujet = ?", $conn, [$id]));
        if (!is_object($topic)) {
            ApiResponse::error("Sujet introuvable.", 404);
        }
        $forumId = (int)$topic->idforum;

        ExecRequete("DELETE fc FROM f_corps fc INNER JOIN f_message fm ON fc.idmessage = fm.idmessage WHERE fm.idsujet = ?", $conn, [$id]);
        ExecRequete("DELETE FROM f_message WHERE idsujet = ?", $conn, [$id]);
        ExecRequete("DELETE FROM f_readsujet WHERE idsujet = ?", $conn, [$id]);
        ExecRequete("DELETE FROM f_sujet WHERE idsujet = ?", $conn, [$id]);

        $this->syncForumInternal($forumId, $conn);
        ApiResponse::success(null, "Sujet supprimé avec succès.");
    }

    // -------------------------------------------------------------------------
    // Modération des Messages
    // -------------------------------------------------------------------------

    public function getForumMessages(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $query = trim($request->getString('query', ''));
        $author = trim($request->getString('author', ''));
        $topicId = $request->getInt('topicId', 0);
        $page = max(1, $request->getInt('page', 1));
        $limit = min(50, max(5, $request->getInt('limit', 20)));
        $offset = ($page - 1) * $limit;

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $where = "1=1";
        $params = [];
        if ($topicId > 0) {
            $where .= " AND fm.idsujet = ?";
            $params[] = $topicId;
        }
        if (!empty($query)) {
            $where .= " AND fc.contenu LIKE ?";
            $params[] = "%$query%";
        }
        if (!empty($author)) {
            $where .= " AND cpt.pseudonyme LIKE ?";
            $params[] = "%$author%";
        }

        $countSql = "SELECT COUNT(*) as total
                     FROM f_message fm
                     JOIN f_corps fc ON fm.idmessage = fc.idmessage
                     JOIN compte cpt ON fm.idcompte = cpt.idcompte
                     WHERE $where";
        $total = (int)LigneSuivante(ExecRequete($countSql, $conn, $params))->total;

        $sql = "SELECT fm.idmessage, fm.idsujet, fm.datepost, fm.idcompte, cpt.pseudonyme, fc.contenu, fs.txtsujet, fs.idforum, ff.nomforum
                FROM f_message fm
                JOIN f_corps fc ON fm.idmessage = fc.idmessage
                JOIN compte cpt ON fm.idcompte = cpt.idcompte
                JOIN f_sujet fs ON fm.idsujet = fs.idsujet
                JOIN f_forum ff ON fs.idforum = ff.idforum
                WHERE $where
                ORDER BY fm.idmessage DESC
                LIMIT $offset, $limit";
        $stmt = ExecRequete($sql, $conn, $params);
        $items = [];
        while ($m = LigneSuivante($stmt)) {
            $items[] = [
                'id' => (int)$m->idmessage,
                'topicId' => (int)$m->idsujet,
                'topicTitle' => (string)$m->txtsujet,
                'forumId' => (int)$m->idforum,
                'forumName' => (string)$m->nomforum,
                'authorId' => (int)$m->idcompte,
                'authorPseudo' => (string)$m->pseudonyme,
                'date' => (int)$m->datepost,
                'content' => (string)$m->contenu,
            ];
        }

        ApiResponse::success([
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int)ceil($total / $limit),
        ]);
    }

    public function updateForumMessage(Request $request, int $id): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        if ($id <= 0) {
            ApiResponse::error("Identifiant de message invalide.", 400);
        }

        $payload = $request->getJson();
        $content = trim((string)($payload['content'] ?? ''));
        if (empty($content)) {
            ApiResponse::error("Le contenu du message ne peut pas être vide.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        ExecRequete("UPDATE f_corps SET contenu = ? WHERE idmessage = ?", $conn, [$content, $id]);

        ApiResponse::success(null, "Message modéré avec succès.");
    }

    public function deleteForumMessage(Request $request, int $id): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        if ($id <= 0) {
            ApiResponse::error("Identifiant de message invalide.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $msg = LigneSuivante(ExecRequete("SELECT fm.idsujet, fs.idforum FROM f_message fm JOIN f_sujet fs ON fm.idsujet = fs.idsujet WHERE fm.idmessage = ?", $conn, [$id]));
        if (!is_object($msg)) {
            ApiResponse::error("Message introuvable.", 404);
        }
        $topicId = (int)$msg->idsujet;
        $forumId = (int)$msg->idforum;

        ExecRequete("DELETE FROM f_corps WHERE idmessage = ?", $conn, [$id]);
        ExecRequete("DELETE FROM f_message WHERE idmessage = ?", $conn, [$id]);

        $remain = (int)LigneSuivante(ExecRequete("SELECT COUNT(*) as c FROM f_message WHERE idsujet = ?", $conn, [$topicId]))->c;
        if ($remain === 0) {
            ExecRequete("DELETE FROM f_readsujet WHERE idsujet = ?", $conn, [$topicId]);
            ExecRequete("DELETE FROM f_sujet WHERE idsujet = ?", $conn, [$topicId]);
        } else {
            $lastMsgId = (int)LigneSuivante(ExecRequete("SELECT MAX(idmessage) as m FROM f_message WHERE idsujet = ?", $conn, [$topicId]))->m;
            ExecRequete("UPDATE f_sujet SET s_nbmessages = ?, idlastmessage = ? WHERE idsujet = ?", $conn, [$remain - 1, $lastMsgId, $topicId]);
        }

        $this->syncForumInternal($forumId, $conn);
        ApiResponse::success(null, "Message supprimé avec succès.");
    }
}
