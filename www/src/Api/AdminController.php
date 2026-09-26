<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use NetTrader\Repository\StockRepository;
use NetTrader\Repository\UserRepository;
use NetTrader\Repository\OrderRepository;
use NetTrader\Repository\ForumRepository;
use NetTrader\Service\YahooFinanceService;
use PDO;

class AdminController
{
    private StockRepository $stockRepo;
    private UserRepository $userRepo;
    private OrderRepository $orderRepo;
    private ForumRepository $forumRepo;
    private YahooFinanceService $yahooService;

    public function __construct(
        ?StockRepository $stockRepo = null,
        ?UserRepository $userRepo = null,
        ?OrderRepository $orderRepo = null,
        ?ForumRepository $forumRepo = null,
        ?YahooFinanceService $yahooService = null
    ) {
        $this->stockRepo = $stockRepo ?? new StockRepository();
        $this->userRepo = $userRepo ?? new UserRepository();
        $this->orderRepo = $orderRepo ?? new OrderRepository();
        $this->forumRepo = $forumRepo ?? new ForumRepository();
        $this->yahooService = $yahooService ?? new YahooFinanceService();
    }

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

        $playersCount = $this->userRepo->countTotalPlayers();
        $ordersCount = $this->orderRepo->countPendingOrders();
        $activeSessions = $this->userRepo->countActiveSessions();
        $stocksCount = $this->stockRepo->countTotal();
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

        $total = $this->userRepo->countPlayers($search);
        $rows = $this->userRepo->searchPlayers($search, $limit, $offset);

        $players = [];
        foreach ($rows as $p) {
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
     * Vue d'ensemble du suivi des cotations (KPIs et logs récents).
     */
    public function getMarketSyncOverview(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $data = $this->stockRepo->getMarketSyncOverview();
        ApiResponse::success($data);
    }

    /**
     * Liste paginée des valeurs pour le monitoring des cotations.
     */
    public function getMarketSyncStocks(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $search = trim($request->getString('search', ''));
        $status = trim($request->getString('status', 'all'));
        $page = max(1, $request->getInt('page', 1));
        $limit = min(200, max(5, $request->getInt('limit', 25)));
        $offset = ($page - 1) * $limit;
        $sort = $request->getString('sort', 'last_attempt');
        $order = strtolower($request->getString('order', 'desc')) === 'asc' ? 'ASC' : 'DESC';

        $filters = ['search' => $search, 'status' => $status];
        $total = $this->stockRepo->countMarketSyncStocks($filters);
        $items = $this->stockRepo->getMarketSyncStocks($filters, $limit, $offset, $sort, $order);

        ApiResponse::success([
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int)ceil($total / $limit),
        ]);
    }

    /**
     * Activer ou désactiver le suivi d'une valeur (toggle down).
     */
    public function toggleStockTracking(Request $request, int $codesico): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $isTracked = $this->stockRepo->toggleTracking($codesico);
        if ($isTracked === null) {
            ApiResponse::error("Valeur introuvable.", 404);
        }

        ApiResponse::success([
            'codesico' => $codesico,
            'isTracked' => $isTracked,
        ], $isTracked ? "Suivi activé pour cette valeur." : "Suivi désactivé pour cette valeur.");
    }

    /**
     * Réinitialiser les compteurs d'échecs pour une valeur spécifique.
     */
    public function resetStockErrors(Request $request, int $codesico): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $stock = $this->stockRepo->findByCode($codesico);
        if (!$stock) {
            ApiResponse::error("Valeur introuvable.", 404);
        }

        $this->stockRepo->resetFailures($codesico);

        ApiResponse::success([
            'codesico' => $codesico,
        ], "Compteurs d'échecs réinitialisés pour cette valeur.");
    }

    /**
     * Réinitialiser les compteurs d'échecs pour toutes les valeurs suivies.
     */
    public function resetAllStockErrors(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $this->stockRepo->resetFailures(null);

        ApiResponse::success(null, "Tous les compteurs d'échecs ont été réinitialisés.");
    }

    /**
     * Forcer l'actualisation globale des cotations depuis Yahoo Finance pour tous les titres suivis.
     */
    public function forceMarketSync(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $result = $this->stockRepo->syncQuotes();

        ApiResponse::success(
            $result,
            "Actualisation forcée terminée : {$result['successCount']}/{$result['totalStocks']} valeurs synchronisées en {$result['durationSeconds']}s."
        );
    }

    /**
     * Forcer l'actualisation de la cotation pour un titre spécifique.
     */
    public function forceStockSync(Request $request, int $codesico): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $stock = $this->stockRepo->findByCode($codesico);
        if (!$stock) {
            ApiResponse::error("Valeur introuvable.", 404);
        }

        $result = $this->stockRepo->syncQuotes($codesico);

        if ($result['successCount'] > 0) {
            ApiResponse::success($result, "Cotation actualisée avec succès pour " . ($stock->yahooname ?? 'ce titre') . ".");
        } else {
            ApiResponse::error("Impossible de récupérer la cotation Yahoo Finance pour ce titre.", 502, $result);
        }
    }

    // -------------------------------------------------------------------------
    // Catalogue & Gestion des Actions Boursières
    // -------------------------------------------------------------------------

    /**
     * Liste paginée et filtrée des actions pour le catalogue d'administration.
     */
    public function getStocks(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $search = trim($request->getString('search', ''));
        $sectorId = $request->getInt('sectorId', 0);
        $marketId = $request->getInt('marketId', 0);
        $authBuy = $request->get('authBuy', 'all');
        $isTracked = $request->get('isTracked', 'all');
        $isArchived = $request->get('isArchived', '0');

        $page = max(1, $request->getInt('page', 1));
        $limit = min(200, max(5, $request->getInt('limit', 25)));
        $offset = ($page - 1) * $limit;
        $sort = $request->getString('sort', 'nom');
        $order = strtolower($request->getString('order', 'asc')) === 'desc' ? 'DESC' : 'ASC';

        $filters = [
            'search' => $search,
            'sectorId' => $sectorId,
            'marketId' => $marketId,
            'authBuy' => $authBuy,
            'isTracked' => $isTracked,
            'isArchived' => $isArchived,
        ];

        $total = $this->stockRepo->countAdminStocks($filters);
        $items = $this->stockRepo->getAdminStocks($filters, $limit, $offset, $sort, $order);

        ApiResponse::success([
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int)ceil($total / $limit),
        ]);
    }

    /**
     * Métadonnées pour les sélecteurs (secteurs et marchés).
     */
    public function getStockMetadata(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $metadata = $this->stockRepo->getSectorsAndMarkets();
        ApiResponse::success($metadata);
    }

    /**
     * Création d'une nouvelle action.
     */
    public function createStock(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $payload = $request->getJson();
        $code = (int)($payload['codesico'] ?? 0);
        $ticker = trim((string)($payload['yahooname'] ?? ''));
        $name = trim((string)($payload['nom'] ?? ''));
        $price = (float)($payload['valeur'] ?? 0.0);

        if ($code <= 0) {
            ApiResponse::error("Le code SICOVAM doit être un entier positif supérieur à zéro.", 400);
        }
        if (empty($ticker)) {
            ApiResponse::error("Le symbole / ticker boursier est obligatoire.", 400);
        }
        if (empty($name)) {
            ApiResponse::error("Le nom de l'action est obligatoire.", 400);
        }
        if ($price < 0) {
            ApiResponse::error("Le cours initial ne peut pas être négatif.", 400);
        }

        // Vérifier unicité du code
        if ($this->stockRepo->findByCode($code)) {
            ApiResponse::error("Une action avec ce code SICOVAM ($code) existe déjà.", 409);
        }

        // Vérifier unicité du ticker
        if ($this->stockRepo->findByTicker($ticker)) {
            ApiResponse::error("Une action avec ce ticker ($ticker) existe déjà.", 409);
        }

        $ok = $this->stockRepo->createStock($payload);
        if (!$ok) {
            ApiResponse::error("Erreur lors de la création de l'action.", 500);
        }

        ApiResponse::success(['codesico' => $code], "Action créée avec succès.", 201);
    }

    /**
     * Mise à jour d'une action existante.
     */
    public function updateStock(Request $request, int $code): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $stock = $this->stockRepo->findByCode($code);
        if (!$stock) {
            ApiResponse::error("Action introuvable.", 404);
        }

        $payload = $request->getJson();

        // Si modification du ticker, vérifier qu'il n'est pas déjà pris par une autre action
        if (!empty($payload['yahooname']) && $payload['yahooname'] !== $stock->yahooname) {
            $existing = $this->stockRepo->findByTicker(trim($payload['yahooname']));
            if ($existing && (int)$existing->codesico !== $code) {
                ApiResponse::error("Le ticker spécifié est déjà utilisé par une autre valeur.", 409);
            }
        }

        $this->stockRepo->updateStock($code, $payload);
        ApiResponse::success(['codesico' => $code], "Action mise à jour avec succès.");
    }

    /**
     * Suppression d'une action.
     */
    public function deleteStock(Request $request, int $code): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $result = $this->stockRepo->deleteStock($code);
        if (!$result['success']) {
            ApiResponse::error($result['error'] ?? "Impossible de supprimer l'action.", 400);
        }

        ApiResponse::success(null, "Action supprimée du catalogue avec succès.");
    }

    /**
     * Archive une action spécifique et clôture les positions ouvertes au dernier cours.
     */
    public function archiveStock(Request $request, int $code): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $result = $this->stockRepo->archiveStock($code);
        if (!$result['success']) {
            ApiResponse::error($result['error'] ?? "Impossible d'archiver l'action.", 400);
        }

        ApiResponse::success($result, "Action archivée avec succès. {$result['positionsClosed']} position(s) liquidée(s) au cours de {$result['settlementPrice']} €.");
    }

    /**
     * Désarchive une action.
     */
    public function unarchiveStock(Request $request, int $code): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $result = $this->stockRepo->unarchiveStock($code);
        if (!$result['success']) {
            ApiResponse::error($result['error'] ?? "Impossible de désarchiver l'action.", 400);
        }

        ApiResponse::success($result, "Action réactivée avec succès.");
    }

    /**
     * Archive un lot d'actions (ex: toutes celles en échec).
     */
    public function archiveBulkStocks(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $payload = $request->getJson();
        $codes = $payload['codes'] ?? [];

        if (empty($codes) || !is_array($codes)) {
            ApiResponse::error("Aucune action spécifiée pour l'archivage.", 400);
        }

        $result = $this->stockRepo->archiveBulkStocks($codes);
        ApiResponse::success($result, "{$result['archivedCount']} action(s) archivée(s) avec succès. {$result['totalPositionsClosed']} position(s) liquidée(s).");
    }

    /**
     * Suppression en masse d'actions avec validation par mot de passe administrateur.
     */
    public function deleteBulkStocks(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $payload = $request->getJson();
        $password = trim((string)($payload['adminPassword'] ?? ''));
        $codes = $payload['codes'] ?? [];

        if (empty($password)) {
            ApiResponse::error("Le mot de passe administrateur est requis pour confirmer la suppression en masse.", 400);
        }

        if (empty($codes) || !is_array($codes)) {
            ApiResponse::error("Aucune action spécifiée pour la suppression.", 400);
        }

        // Vérification sécurisée du mot de passe de l'administrateur connecté
        $adminId = $session->getId();
        if (!$this->userRepo->verifyPassword($adminId, $password)) {
            ApiResponse::error("Mot de passe administrateur incorrect. Suppression annulée.", 403);
        }

        $result = $this->stockRepo->deleteBulkStocks($codes);

        if ($result['deletedCount'] === 0 && !empty($result['errors'])) {
            ApiResponse::error("Aucune action n'a pu être supprimée : " . implode("; ", array_slice($result['errors'], 0, 3)), 400);
        }

        ApiResponse::success(
            $result,
            "{$result['deletedCount']} action(s) supprimée(s) avec succès du catalogue." .
            (!empty($result['errors']) ? " (" . count($result['errors']) . " échec(s))" : "")
        );
    }

    /**
     * Bascule d'autorisation d'achat d'un titre.
     */
    public function toggleStockAuthBuy(Request $request, int $code): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $newAuth = $this->stockRepo->toggleAuthBuy($code);
        if ($newAuth === null) {
            ApiResponse::error("Action introuvable.", 404);
        }

        ApiResponse::success([
            'codesico' => $code,
            'authBuy' => $newAuth,
        ], $newAuth ? "Achats autorisés pour cette valeur." : "Achats bloqués pour cette valeur.");
    }

    /**
     * Opération sur titre : Split (multiplication) ou Reverse-Split (division).
     */
    public function splitStock(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $payload = $request->getJson();
        $code = (int)($payload['codesico'] ?? 0);
        $type = (string)($payload['type'] ?? 'multiplier');
        $factor = (float)($payload['factor'] ?? 0.0);

        if ($code <= 0) {
            ApiResponse::error("Veuillez sélectionner une action valide.", 400);
        }
        if ($factor <= 0) {
            ApiResponse::error("Le facteur de fractionnement/division doit être supérieur à zéro.", 400);
        }

        $result = $this->stockRepo->splitStock($code, $type, $factor);
        if (!$result['success']) {
            ApiResponse::error($result['error'] ?? "Erreur lors de l'opération sur titre.", 400);
        }

        $label = ($type === 'multiplier' || $type === 'split') ? "Fractionnement (Split)" : "Regroupement (Reverse-split)";
        ApiResponse::success($result, "$label exécuté avec succès. Nouveau cours : {$result['newPrice']} €.");
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

    /**
     * Découverte des actions Euronext Paris via Yahoo Screener.
     */
    public function discoverYahooMarket(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $limit = min(max((int)$request->get('limit', 25), 1), 100);
        $offset = max((int)$request->get('offset', 0), 0);
        $search = trim((string)$request->get('search', ''));

        $screen = $this->yahooService->screenParisEquities($limit, $offset, $search);
        if (isset($screen['error']) && empty($screen['items'])) {
            ApiResponse::error($screen['error'], 502);
        }

        $items = $screen['items'] ?? [];
        $symbols = array_map(function ($it) {
            return $it['symbol'];
        }, $items);

        $existingMap = $this->stockRepo->findExistingTickersMap($symbols);

        $augmentedItems = [];
        foreach ($items as $it) {
            $sym = $it['symbol'];
            $exists = isset($existingMap[$sym]);
            $existingRow = $exists ? $existingMap[$sym] : null;

            $augmentedItems[] = array_merge($it, [
                'inDatabase' => $exists,
                'codesico' => $existingRow ? (int)$existingRow->codesico : null,
                'isTracked' => $existingRow ? ($existingRow->down === '1') : false,
                'isAuthBuy' => $existingRow ? ($existingRow->authachat === '1') : false,
                'currentDbPrice' => $existingRow ? (float)$existingRow->valeur : null,
            ]);
        }

        ApiResponse::success([
            'total' => (int)($screen['total'] ?? count($augmentedItems)),
            'limit' => $limit,
            'offset' => $offset,
            'items' => $augmentedItems,
        ]);
    }

    /**
     * Importe une sélection d'actions Yahoo dans la base de données avec activation immédiate.
     * Rejette formellement toute valeur sans cours actif (> 0).
     */
    public function importYahooStocks(Request $request): void
    {
        $session = UserSession::current();
        $this->checkAdmin($session);

        $payload = $request->getJson();
        $items = $payload['items'] ?? [];

        // Support d'un simple tableau de tickers ['MC.PA', 'OR.PA'] ou d'objets complets
        if (empty($items) && !empty($payload['tickers']) && is_array($payload['tickers'])) {
            foreach ($payload['tickers'] as $t) {
                $items[] = ['yahooname' => trim($t)];
            }
        }

        if (empty($items) || !is_array($items)) {
            ApiResponse::error("Aucune action spécifiée pour l'import.", 400);
        }

        $stocksToImport = [];
        $skipped = [];

        foreach ($items as $item) {
            $ticker = trim((string)($item['yahooname'] ?? $item['symbol'] ?? ''));
            if (empty($ticker)) {
                continue;
            }

            $name = trim((string)($item['nom'] ?? $item['name'] ?? ''));
            $price = (float)($item['valeur'] ?? $item['price'] ?? 0.0);

            // Si le nom ou le cours manquent ou sont invalides, interroger Yahoo pour les métadonnées fraîches
            if (empty($name) || $price <= 0.0) {
                $quote = $this->yahooService->getQuote($ticker);
                if ($quote) {
                    if (empty($name)) {
                        $name = $quote['name'];
                    }
                    if ($price <= 0.0) {
                        $price = (float)$quote['price'];
                    }
                }
            }

            // Exclusion stricte : si le cours n'est pas strictement supérieur à zéro, ne jamais importer !
            if ($price <= 0.0) {
                $skipped[] = $ticker;
                continue;
            }

            $stocksToImport[] = [
                'yahooname' => $ticker,
                'nom' => $name ?: $ticker,
                'valeur' => $price,
                'authachat' => '1',
                'down' => '1',
                'idsecteur' => (int)($item['idsecteur'] ?? 22),
                'idmarket' => (int)($item['idmarket'] ?? 1),
            ];
        }

        if (empty($stocksToImport)) {
            $msg = !empty($skipped)
                ? "Aucun symbole valide à importer. Symboles sans cotation active ignorés : " . implode(', ', $skipped)
                : "Aucun symbole valide à importer.";
            ApiResponse::error($msg, 400);
        }

        $result = $this->stockRepo->bulkImportStocks($stocksToImport);
        $result['skipped'] = $skipped;

        $msg = "Importation terminée ({$result['created']} ajoutées, {$result['updated']} mises à jour).";
        if (!empty($skipped)) {
            $msg .= " " . count($skipped) . " valeur(s) sans cotation ignorée(s).";
        }

        ApiResponse::success($result, $msg);
    }
}

