<?php

namespace NetTrader\Repository;

use PDO;

/**
 * Repository pour les cotations et actions boursières (table cacval et market_sync_log).
 */
class StockRepository extends BaseRepository
{
    public function findByCode(int $codeSico): ?object
    {
        return $this->fetchOne("SELECT * FROM cacval WHERE codesico = ?", [$codeSico]);
    }

    public function findByTicker(string $ticker): ?object
    {
        return $this->fetchOne("SELECT * FROM cacval WHERE yahooname = ?", [$ticker]);
    }

    public function countTotal(): int
    {
        $res = $this->fetchOne("SELECT COUNT(*) as c FROM cacval");
        return $res ? (int)$res->c : 0;
    }

    public function countTracked(): int
    {
        $res = $this->fetchOne("SELECT COUNT(*) as c FROM cacval WHERE down = '1'");
        return $res ? (int)$res->c : 0;
    }

    public function countBuyable(): int
    {
        $res = $this->fetchOne("SELECT COUNT(*) as c FROM cacval WHERE down = '1' AND authachat = '1'");
        return $res ? (int)$res->c : 0;
    }

    /**
     * Récupère la liste des actions actives pour le marché.
     */
    public function getAllTracked(bool $onlyBuyable = false): array
    {
        $sql = "SELECT codesico, yahooname, nom, valeur, lasttime, authachat, down, idsecteur, idmarket 
                FROM cacval 
                WHERE down = '1' AND is_archived = '0'";
        if ($onlyBuyable) {
            $sql .= " AND authachat = '1'";
        }
        $sql .= " ORDER BY nom ASC";
        return $this->fetchAll($sql);
    }

    /**
     * Recherche textuelle d'actions par ticker ou raison sociale.
     */
    public function searchStocks(string $search = '', int $limit = 50, int $offset = 0): array
    {
        $sql = "SELECT codesico, yahooname, nom, valeur, lasttime, authachat, down 
                FROM cacval 
                WHERE down = '1' AND is_archived = '0'";
        $params = [];
        if (!empty($search)) {
            $sql .= " AND (nom LIKE ? OR yahooname LIKE ?)";
            $params = ["%$search%", "%$search%"];
        }
        $sql .= " ORDER BY nom ASC LIMIT $offset, $limit";
        return $this->fetchAll($sql, $params);
    }

    /**
     * Récupère les actions avec leur cours actuel et précédent (pour calcul de variation).
     */
    public function getStocksWithVariation(?string $search = null, bool $trackedOrPositiveOnly = false): array
    {
        $sql = "SELECT c.codesico, c.yahooname, c.nom, c.valeur, c.authachat, c.lasttime,
                       COALESCE(m.valeur, c.valeur) as prev_valeur
                FROM cacval c
                LEFT JOIN cacvalmaj m ON (c.codesico = m.codesico)
                WHERE c.is_archived = '0'";
        $params = [];

        if ($trackedOrPositiveOnly) {
            $sql .= " AND (c.down = '1' OR c.valeur > 0)";
        }

        if (!empty($search)) {
            if (is_numeric($search)) {
                $sql .= " AND (c.nom LIKE ? OR c.yahooname LIKE ? OR c.codesico = ?)";
                $params = ["%$search%", "%$search%", (int)$search];
            } else {
                $sql .= " AND (c.nom LIKE ? OR c.yahooname LIKE ?)";
                $params = ["%$search%", "%$search%"];
            }
        }

        $sql .= " ORDER BY c.nom ASC";

        return $this->fetchAll($sql, $params);
    }

    /**
     * Récupère une action spécifique avec son cours précédent.
     */
    public function getStockWithVariation(int $codeSico): ?object
    {
        $sql = "SELECT c.codesico, c.yahooname, c.nom, c.valeur, c.authachat, c.lasttime,
                       COALESCE(m.valeur, c.valeur) as prev_valeur
                FROM cacval c
                LEFT JOIN cacvalmaj m ON (c.codesico = m.codesico)
                WHERE c.codesico = ?";
        return $this->fetchOne($sql, [$codeSico]);
    }

    /**
     * Récupère l'historique des cotations pour une action selon la période demandée.
     *
     * @param int $codeSico Code SICOVAM de l'action
     * @param string $period Période ('1d', '1w', '1m', '1y')
     * @param int $maxPoints Nombre maximum de points retournés (downsampling régulier)
     * @return array Liste de points { time: int, price: float }
     */
    public function getStockHistory(int $codeSico, string $period = '1m', int $maxPoints = 80): array
    {
        $now = time();
        $normalizedPeriod = strtolower(trim($period));

        switch ($normalizedPeriod) {
            case '1d':
            case 'day':
            case 'jour':
            case '1j':
                $startTime = $now - 86400;
                break;
            case '1w':
            case 'week':
            case 'semaine':
            case '1s':
            case '7d':
                $startTime = $now - (7 * 86400);
                break;
            case '1y':
            case 'year':
            case 'annee':
            case 'année':
            case '1a':
            case '365d':
                $startTime = $now - (365 * 86400);
                break;
            case '1m':
            case 'month':
            case 'mois':
            case '30d':
            default:
                $startTime = $now - (30 * 86400);
                break;
        }

        $sql = "SELECT temps, valeur FROM stock_history 
                WHERE codesico = ? AND temps >= ? 
                ORDER BY temps ASC";
        $rows = $this->fetchAll($sql, [$codeSico, $startTime]);

        $points = [];
        foreach ($rows as $r) {
            $points[] = [
                'time' => (int)$r->temps,
                'price' => (float)$r->valeur,
            ];
        }

        // Si aucun point trouvé dans stock_history, repli sur cours et prev_valeur
        if (empty($points)) {
            $stock = $this->getStockWithVariation($codeSico);
            if ($stock) {
                $cur = (float)$stock->valeur;
                $prev = (float)$stock->prev_valeur;
                $points = [
                    ['time' => $startTime, 'price' => $prev > 0 ? $prev : $cur],
                    ['time' => $now, 'price' => $cur],
                ];
            }
        }

        // Downsampling si trop de points pour fluidifier le rendu SVG
        if (count($points) > $maxPoints && $maxPoints > 2) {
            $sampled = [];
            $total = count($points);
            $step = ($total - 1) / ($maxPoints - 1);

            for ($i = 0; $i < $maxPoints; $i++) {
                $idx = (int)round($i * $step);
                if ($idx >= $total) {
                    $idx = $total - 1;
                }
                $sampled[] = $points[$idx];
            }
            $sampled[0] = $points[0];
            $sampled[count($sampled) - 1] = $points[$total - 1];

            return $sampled;
        }

        return $points;
    }

    /**
     * Enregistre un point de cotation dans l'historique boursier.
     */
    public function recordStockPrice(int $codeSico, float $price, ?int $timestamp = null): void
    {
        $timestamp = $timestamp ?? time();
        $this->execute(
            "INSERT INTO stock_history (codesico, temps, valeur) VALUES (?, ?, ?)",
            [$codeSico, $timestamp, $price]
        );
    }


    /**
     * Récupère les indicateurs clés pour la supervision de la synchronisation de marché.
     */
    public function getMarketSyncOverview(): array
    {
        $totalStocks = $this->countTotal();
        $totalTracked = $this->countTracked();
        $totalDisabled = (int)($this->fetchOne("SELECT COUNT(*) as c FROM cacval WHERE down = '0'")->c ?? 0);
        $totalSuccess = (int)($this->fetchOne("SELECT COUNT(*) as c FROM cacval WHERE down = '1' AND last_status = 'success'")->c ?? 0);
        $totalFailed = (int)($this->fetchOne("SELECT COUNT(*) as c FROM cacval WHERE down = '1' AND last_status = 'failed'")->c ?? 0);
        $totalPending = (int)($this->fetchOne("SELECT COUNT(*) as c FROM cacval WHERE down = '1' AND last_status = 'pending'")->c ?? 0);
        $totalWithRetries = (int)($this->fetchOne("SELECT COUNT(*) as c FROM cacval WHERE down = '1' AND retry_count > 0")->c ?? 0);
        $totalFailuresAllTime = (int)($this->fetchOne("SELECT COALESCE(SUM(total_fails), 0) as c FROM cacval")->c ?? 0);

        $lastLog = $this->fetchOne("SELECT * FROM market_sync_log ORDER BY sync_time DESC LIMIT 1");
        $recentLogs = $this->fetchAll("SELECT id, sync_time, total_stocks, success_count, error_count, duration_seconds, details FROM market_sync_log ORDER BY sync_time DESC LIMIT 15");

        $logs = [];
        foreach ($recentLogs as $l) {
            $logs[] = [
                'id' => (int)$l->id,
                'syncTime' => (int)$l->sync_time,
                'totalStocks' => (int)$l->total_stocks,
                'successCount' => (int)$l->success_count,
                'errorCount' => (int)$l->error_count,
                'durationSeconds' => (float)$l->duration_seconds,
                'details' => (string)$l->details,
            ];
        }

        $successRate = ($totalTracked > 0) ? round(($totalSuccess / $totalTracked) * 100, 1) : 0;

        return [
            'overview' => [
                'totalStocks' => $totalStocks,
                'totalTracked' => $totalTracked,
                'totalDisabled' => $totalDisabled,
                'totalSuccess' => $totalSuccess,
                'totalFailed' => $totalFailed,
                'totalPending' => $totalPending,
                'totalWithRetries' => $totalWithRetries,
                'totalFailuresAllTime' => $totalFailuresAllTime,
                'successRate' => $successRate,
                'lastSyncTime' => $lastLog ? (int)$lastLog->sync_time : null,
                'lastSyncDuration' => $lastLog ? (float)$lastLog->duration_seconds : null,
                'lastSyncSuccess' => $lastLog ? (int)$lastLog->success_count : null,
                'lastSyncError' => $lastLog ? (int)$lastLog->error_count : null,
            ],
            'recentLogs' => $logs,
        ];
    }

    /**
     * Liste paginée des actions avec filtres pour le tableau de bord du fetcher.
     */
    public function getMarketSyncStocks(
        array $filters = [],
        int $limit = 25,
        int $offset = 0,
        string $sort = 'last_attempt',
        string $order = 'DESC'
    ): array {
        $allowedSorts = [
            'last_attempt' => 'last_attempt',
            'fail_count' => 'fail_count',
            'total_fails' => 'total_fails',
            'retry_count' => 'retry_count',
            'valeur' => 'valeur',
            'nom' => 'nom',
            'yahooname' => 'yahooname',
            'lasttime' => 'lasttime',
        ];
        $sortColumn = $allowedSorts[$sort] ?? 'last_attempt';
        $orderDir = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';

        [$whereClause, $params] = $this->buildFilterConditions($filters);

        $sql = "SELECT codesico, yahooname, nom, valeur, lasttime, lasttimedown, last_attempt, 
                       last_status, fail_count, total_fails, retry_count, last_error, authachat, down 
                FROM cacval 
                WHERE $whereClause 
                ORDER BY $sortColumn $orderDir, codesico ASC 
                LIMIT $offset, $limit";

        $rows = $this->fetchAll($sql, $params);
        $items = [];
        foreach ($rows as $row) {
            $items[] = [
                'codesico' => (int)$row->codesico,
                'ticker' => (string)$row->yahooname,
                'name' => (string)$row->nom,
                'price' => (float)$row->valeur,
                'lastTime' => (int)$row->lasttime,
                'lastAttempt' => (int)$row->last_attempt,
                'lastStatus' => (string)$row->last_status,
                'failCount' => (int)$row->fail_count,
                'totalFails' => (int)$row->total_fails,
                'retryCount' => (int)$row->retry_count,
                'lastError' => $row->last_error ? (string)$row->last_error : null,
                'isTracked' => ($row->down === '1'),
                'authAchat' => ($row->authachat === '1'),
            ];
        }
        return $items;
    }

    public function countMarketSyncStocks(array $filters = []): int
    {
        [$whereClause, $params] = $this->buildFilterConditions($filters);
        $res = $this->fetchOne("SELECT COUNT(*) as total FROM cacval WHERE $whereClause", $params);
        return $res ? (int)$res->total : 0;
    }

    private function buildFilterConditions(array $filters): array
    {
        $where = ["1=1"];
        $params = [];

        $search = trim($filters['search'] ?? '');
        if (!empty($search)) {
            $where[] = "(yahooname LIKE ? OR nom LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $status = $filters['status'] ?? 'all';
        if ($status === 'disabled') {
            $where[] = "down = '0'";
        } elseif ($status === 'success') {
            $where[] = "down = '1' AND last_status = 'success'";
        } elseif ($status === 'failed') {
            $where[] = "down = '1' AND last_status = 'failed'";
        } elseif ($status === 'pending') {
            $where[] = "down = '1' AND last_status = 'pending'";
        } elseif ($status === 'retried') {
            $where[] = "down = '1' AND retry_count > 0";
        }

        return [implode(" AND ", $where), $params];
    }

    /**
     * Bascule l'activation du téléchargement d'un titre.
     */
    public function toggleTracking(int $codeSico): ?bool
    {
        $stock = $this->findByCode($codeSico);
        if (!$stock) {
            return null;
        }
        $newDown = ($stock->down === '1') ? '0' : '1';
        $this->execute("UPDATE cacval SET down = ? WHERE codesico = ?", [$newDown, $codeSico]);
        return ($newDown === '1');
    }

    /**
     * Réinitialise les compteurs d'échecs.
     */
    public function resetFailures(?int $codeSico = null): bool
    {
        if ($codeSico !== null) {
            return $this->execute(
                "UPDATE cacval SET fail_count = 0, retry_count = 0, last_error = NULL, last_status = 'pending' WHERE codesico = ?",
                [$codeSico]
            );
        } else {
            return $this->execute(
                "UPDATE cacval SET fail_count = 0, retry_count = 0, last_error = NULL, last_status = 'pending' WHERE down = '1'"
            );
        }
    }

    /**
     * Met à jour le cours d'un titre.
     */
    public function updatePrice(string $ticker, float $price, int $timestamp): bool
    {
        return $this->execute(
            "UPDATE cacval SET valeur = ?, lasttime = ?, lasttimedown = ? WHERE yahooname = ?",
            [$price, $timestamp, $timestamp, $ticker]
        );
    }

    /**
     * Récupère la liste paginée et filtrée des actions pour la gestion administrative.
     */
    public function getAdminStocks(
        array $filters = [],
        int $limit = 25,
        int $offset = 0,
        string $sort = 'nom',
        string $order = 'ASC'
    ): array {
        $allowedSorts = [
            'nom' => 'c.nom',
            'codesico' => 'c.codesico',
            'yahooname' => 'c.yahooname',
            'valeur' => 'c.valeur',
            'authachat' => 'c.authachat',
            'down' => 'c.down',
            'lasttime' => 'c.lasttime',
            'sector' => 's.libellesecteur',
            'market' => 'm.marketname',
        ];
        $sortCol = $allowedSorts[$sort] ?? 'c.nom';
        $orderDir = strtoupper($order) === 'DESC' ? 'DESC' : 'ASC';

        [$whereClause, $params] = $this->buildAdminStockFilters($filters);

        $sql = "SELECT c.codesico, c.yahooname, c.nom, c.valeur, c.authachat, c.down, c.is_archived,
                       c.lasttime, c.last_attempt, c.last_status, c.fail_count, c.retry_count,
                       c.idsecteur, c.idmarket,
                       COALESCE(s.libellesecteur, 'Non spécifié') as sector_name,
                       COALESCE(m.marketname, 'Non spécifié') as market_name
                FROM cacval c
                LEFT JOIN secteurent s ON c.idsecteur = s.idsecteur
                LEFT JOIN market m ON c.idmarket = m.idmarket
                WHERE $whereClause
                ORDER BY $sortCol $orderDir, c.codesico ASC
                LIMIT $offset, $limit";

        $rows = $this->fetchAll($sql, $params);
        $items = [];
        foreach ($rows as $r) {
            $items[] = [
                'codesico' => (int)$r->codesico,
                'ticker' => (string)$r->yahooname,
                'name' => (string)$r->nom,
                'price' => (float)$r->valeur,
                'authBuy' => ($r->authachat === '1'),
                'isTracked' => ($r->down === '1'),
                'isArchived' => ($r->is_archived === '1'),
                'sectorId' => (int)$r->idsecteur,
                'marketId' => (int)$r->idmarket,
                'sectorName' => (string)$r->sector_name,
                'marketName' => (string)$r->market_name,
                'lastTime' => (int)$r->lasttime,
                'lastAttempt' => (int)$r->last_attempt,
                'lastStatus' => (string)$r->last_status,
                'failCount' => (int)$r->fail_count,
            ];
        }
        return $items;
    }

    public function countAdminStocks(array $filters = []): int
    {
        [$whereClause, $params] = $this->buildAdminStockFilters($filters);
        $sql = "SELECT COUNT(*) as c 
                FROM cacval c 
                LEFT JOIN secteurent s ON c.idsecteur = s.idsecteur
                LEFT JOIN market m ON c.idmarket = m.idmarket
                WHERE $whereClause";
        $res = $this->fetchOne($sql, $params);
        return $res ? (int)$res->c : 0;
    }

    private function buildAdminStockFilters(array $filters): array
    {
        $where = ["1=1"];
        $params = [];

        $search = trim($filters['search'] ?? '');
        if (!empty($search)) {
            if (is_numeric($search)) {
                $where[] = "(c.nom LIKE ? OR c.yahooname LIKE ? OR c.codesico = ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = (int)$search;
            } else {
                $where[] = "(c.nom LIKE ? OR c.yahooname LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
        }

        if (isset($filters['sectorId']) && (int)$filters['sectorId'] > 0) {
            $where[] = "c.idsecteur = ?";
            $params[] = (int)$filters['sectorId'];
        }

        if (isset($filters['marketId']) && (int)$filters['marketId'] > 0) {
            $where[] = "c.idmarket = ?";
            $params[] = (int)$filters['marketId'];
        }

        if (isset($filters['authBuy']) && $filters['authBuy'] !== 'all') {
            $where[] = "c.authachat = ?";
            $params[] = ($filters['authBuy'] === '1' || $filters['authBuy'] === true) ? '1' : '0';
        }

        if (isset($filters['isTracked']) && $filters['isTracked'] !== 'all') {
            $where[] = "c.down = ?";
            $params[] = ($filters['isTracked'] === '1' || $filters['isTracked'] === true) ? '1' : '0';
        }

        // Filtre d'archivage : par défaut on n'affiche que les non-archivées
        $isArchived = $filters['isArchived'] ?? '0';
        if ($isArchived === 'all') {
            // Pas de filtre
        } elseif ($isArchived === '1' || $isArchived === true) {
            $where[] = "c.is_archived = '1'";
        } else {
            $where[] = "c.is_archived = '0'";
        }

        return [implode(" AND ", $where), $params];
    }

    /**
     * Récupère la liste des secteurs et des marchés disponibles pour les formulaires.
     */
    public function getSectorsAndMarkets(): array
    {
        $sectors = $this->fetchAll("SELECT idsecteur, libellesecteur FROM secteurent ORDER BY libellesecteur ASC");
        $markets = $this->fetchAll("SELECT idmarket, marketname FROM market ORDER BY marketname ASC");

        $sectorList = [];
        foreach ($sectors as $s) {
            $sectorList[] = [
                'id' => (int)$s->idsecteur,
                'name' => (string)$s->libellesecteur,
            ];
        }

        $marketList = [];
        foreach ($markets as $m) {
            $marketList[] = [
                'id' => (int)$m->idmarket,
                'name' => (string)$m->marketname,
            ];
        }

        return [
            'sectors' => $sectorList,
            'markets' => $marketList,
        ];
    }

    /**
     * Crée une nouvelle action en base.
     */
    public function createStock(array $data): bool
    {
        $code = (int)($data['codesico'] ?? 0);
        $ticker = trim((string)($data['yahooname'] ?? ''));
        $name = trim((string)($data['nom'] ?? ''));
        $price = (float)($data['valeur'] ?? 0.0);
        $authBuy = (!empty($data['authachat']) && (string)$data['authachat'] !== '0') ? '1' : '0';
        $down = (!empty($data['down']) && (string)$data['down'] !== '0') ? '1' : '0';
        $idsecteur = (int)($data['idsecteur'] ?? 22);
        $idmarket = (int)($data['idmarket'] ?? 1);
        $now = time();

        $sql = "INSERT INTO cacval (codesico, yahooname, nom, valeur, lasttime, lasttimedown, last_attempt, last_status, authachat, down, idsecteur, idmarket)
                VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?)";
        return $this->execute($sql, [
            $code,
            $ticker,
            $name,
            $price,
            $now,
            $now,
            $authBuy,
            $down,
            $idsecteur,
            $idmarket,
        ]);
    }

    /**
     * Met à jour les propriétés d'une action existante.
     */
    public function updateStock(int $codeSico, array $data): bool
    {
        $fields = [];
        $params = [];

        if (isset($data['nom'])) {
            $fields[] = "nom = ?";
            $params[] = trim((string)$data['nom']);
        }
        if (isset($data['yahooname'])) {
            $fields[] = "yahooname = ?";
            $params[] = trim((string)$data['yahooname']);
        }
        if (isset($data['valeur'])) {
            $fields[] = "valeur = ?";
            $params[] = (float)$data['valeur'];
        }
        if (isset($data['authachat'])) {
            $fields[] = "authachat = ?";
            $params[] = (!empty($data['authachat']) && (string)$data['authachat'] !== '0') ? '1' : '0';
        }
        if (isset($data['down'])) {
            $fields[] = "down = ?";
            $params[] = (!empty($data['down']) && (string)$data['down'] !== '0') ? '1' : '0';
        }
        if (isset($data['idsecteur'])) {
            $fields[] = "idsecteur = ?";
            $params[] = (int)$data['idsecteur'];
        }
        if (isset($data['idmarket'])) {
            $fields[] = "idmarket = ?";
            $params[] = (int)$data['idmarket'];
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $codeSico;
        return $this->execute("UPDATE cacval SET " . implode(", ", $fields) . " WHERE codesico = ?", $params);
    }

    /**
     * Bascule l'autorisation d'achat d'un titre.
     */
    public function toggleAuthBuy(int $codeSico): ?bool
    {
        $stock = $this->findByCode($codeSico);
        if (!$stock) {
            return null;
        }
        $newAuth = ($stock->authachat === '1') ? '0' : '1';
        $this->execute("UPDATE cacval SET authachat = ? WHERE codesico = ?", [$newAuth, $codeSico]);
        return ($newAuth === '1');
    }

    /**
     * Supprime une action si elle n'est pas engagée dans des portefeuilles ou des ordres.
     */
    public function deleteStock(int $codeSico): array
    {
        $stock = $this->findByCode($codeSico);
        if (!$stock) {
            return ['success' => false, 'error' => "Action introuvable."];
        }

        $holdings = (int)($this->fetchOne("SELECT COUNT(*) as c FROM portef WHERE codesico = ? AND quant != 0", [$codeSico])->c ?? 0);
        if ($holdings > 0) {
            return ['success' => false, 'error' => "Impossible de supprimer : ce titre est détenu dans $holdings portefeuille(s). Désactivez plutôt son suivi ou bloquez les achats."];
        }

        $pendingOrders = (int)($this->fetchOne("SELECT COUNT(*) as c FROM ordre WHERE codesico = ? AND etat = '1'", [$codeSico])->c ?? 0);
        if ($pendingOrders > 0) {
            return ['success' => false, 'error' => "Impossible de supprimer : des ordres en attente existent pour ce titre. Annulez d'abord les ordres actifs."];
        }

        $this->execute("DELETE FROM cacvalmaj WHERE codesico = ?", [$codeSico]);
        $this->execute("DELETE FROM cacval WHERE codesico = ?", [$codeSico]);
        return ['success' => true, 'error' => null];
    }

    /**
     * Exécute une opération de division ou multiplication (Split / Reverse-Split).
     */
    public function splitStock(int $codeSico, string $type, float $factor): array
    {
        if ($factor <= 0) {
            return ['success' => false, 'error' => "Le facteur doit être strictement positif."];
        }

        $stock = $this->findByCode($codeSico);
        if (!$stock) {
            return ['success' => false, 'error' => "Action introuvable."];
        }

        $typeNorm = ($type === 'multiplier' || $type === 'split') ? 'multiplier' : 'diviser';
        $now = time();

        if ($typeNorm === 'multiplier') {
            // Split (multiplier la quantité, diviser le PRU et le cours)
            $this->execute(
                "INSERT INTO historique (temps, codesico, idcompte, sens, nbr, valeurunique, taxe, profit)
                 SELECT ?, codesico, idcompte, IF(quant > 0, 'Achat', 'Vente'), ABS(quant * (? - 1)), 0, 0, 0
                 FROM portef WHERE codesico = ? AND quant != 0",
                [$now, $factor, $codeSico]
            );
            $this->execute("UPDATE portef SET quant = ROUND(quant * ?), ansvaleur = ansvaleur / ? WHERE codesico = ?", [$factor, $factor, $codeSico]);
            $this->execute("UPDATE cacval SET valeur = ROUND(valeur / ?, 4) WHERE codesico = ?", [$factor, $codeSico]);
        } else {
            // Reverse-split (diviser la quantité, multiplier le PRU et le cours)
            $this->execute(
                "INSERT INTO historique (temps, codesico, idcompte, sens, nbr, valeurunique, taxe, profit)
                 SELECT ?, codesico, idcompte, IF(quant > 0, 'Vente', 'Achat'), ABS(quant - (quant / ?)), 0, 0, 0
                 FROM portef WHERE codesico = ? AND quant != 0",
                [$now, $factor, $codeSico]
            );
            $this->execute("UPDATE portef SET quant = ROUND(quant / ?), ansvaleur = ansvaleur * ? WHERE codesico = ?", [$factor, $factor, $codeSico]);
            $this->execute("UPDATE cacval SET valeur = ROUND(valeur * ?, 4) WHERE codesico = ?", [$factor, $codeSico]);
        }

        $updatedStock = $this->findByCode($codeSico);
        return [
            'success' => true,
            'newPrice' => $updatedStock ? (float)$updatedStock->valeur : 0.0,
        ];
    }

    /**
     * Archive une action boursière.
     * En cas d'archivage sur une position ouverte en portefeuille, l'action est liquidée/vendue au dernier cours connu.
     *
     * @param int $codeSico
     * @return array Rapport de l'opération
     */
    public function archiveStock(int $codeSico): array
    {
        $stock = $this->findByCode($codeSico);
        if (!$stock) {
            return ['success' => false, 'error' => "Action introuvable."];
        }

        $price = (float)$stock->valeur;
        $now = time();
        $positionsClosed = 0;
        $totalCashCredited = 0.0;
        $tradingService = new \NetTrader\Service\TradingService();

        // 1. Clôturer et annuler tous les ordres en attente pour cette valeur
        $this->execute(
            "DELETE FROM ordre WHERE codesico = ?",
            [$codeSico]
        );

        // 2. Liquider toutes les positions ouvertes en portefeuille (long et VAD)
        $positions = $this->fetchAll(
            "SELECT idcompte, quant, ansvaleur FROM portef WHERE codesico = ? AND quant != 0",
            [$codeSico]
        );

        foreach ($positions as $pos) {
            $accountId = (int)$pos->idcompte;
            $quant = (int)$pos->quant;
            $buyPrice = (float)$pos->ansvaleur;

            if ($quant > 0) {
                // Position acheteuse normale (Long) : vente au dernier cours connu
                $grossCredit = round($quant * $price, 2);
                $tax = $tradingService->calculateTax($price, $quant);
                $netCredit = max(0.0, round($grossCredit - $tax, 2));

                $totalTaxes = $tax + $tradingService->calculateTax($buyPrice, $quant);
                $profit = round(($price - $buyPrice) * $quant - $totalTaxes, 2);

                // Créditer les liquidités du joueur
                $this->execute(
                    "UPDATE compte SET cashback = ROUND(cashback + ?, 2) WHERE idcompte = ?",
                    [$netCredit, $accountId]
                );

                // Enregistrer l'opération dans l'historique
                $this->execute(
                    "INSERT INTO historique (temps, codesico, idcompte, sens, nbr, valeurunique, taxe, profit) 
                     VALUES (?, ?, ?, 'Vente', ?, ?, ?, ?)",
                    [$now, $codeSico, $accountId, $quant, $price, -$tax, $profit]
                );

                $positionsClosed++;
                $totalCashCredited += $netCredit;
            } elseif ($quant < 0) {
                // Position vendeuse à découvert (VAD) : rachat forcé au dernier cours
                $absQuant = abs($quant);
                $cost = round($absQuant * $price, 2);
                $tax = $tradingService->calculateTax($price, $absQuant);
                $netDebit = round($cost + $tax, 2);

                $totalTaxes = $tax + $tradingService->calculateTax($buyPrice, $absQuant);
                $profit = round(($buyPrice - $price) * $absQuant - $totalTaxes, 2);

                // Débiter les liquidités du joueur
                $this->execute(
                    "UPDATE compte SET cashback = ROUND(cashback - ?, 2) WHERE idcompte = ?",
                    [$netDebit, $accountId]
                );

                $this->execute(
                    "INSERT INTO historique (temps, codesico, idcompte, sens, nbr, valeurunique, taxe, profit) 
                     VALUES (?, ?, ?, 'Achat', ?, ?, ?, ?)",
                    [$now, $codeSico, $accountId, $absQuant, $price, -$tax, $profit]
                );

                $positionsClosed++;
            }

            // Supprimer la ligne de portefeuille liquidée
            $this->execute(
                "DELETE FROM portef WHERE idcompte = ? AND codesico = ?",
                [$accountId, $codeSico]
            );
        }

        // 3. Marquer l'action comme archivée, désactiver le scraper (down=0) et bloquer les achats (authachat=0)
        $this->execute(
            "UPDATE cacval SET is_archived = '1', down = '0', authachat = '0' WHERE codesico = ?",
            [$codeSico]
        );

        return [
            'success' => true,
            'codesico' => $codeSico,
            'ticker' => (string)$stock->yahooname,
            'name' => (string)$stock->nom,
            'settlementPrice' => $price,
            'positionsClosed' => $positionsClosed,
            'totalCashCredited' => $totalCashCredited,
        ];
    }

    /**
     * Désarchive une action précédemment archivée.
     */
    public function unarchiveStock(int $codeSico): array
    {
        $stock = $this->findByCode($codeSico);
        if (!$stock) {
            return ['success' => false, 'error' => "Action introuvable."];
        }

        $this->execute(
            "UPDATE cacval SET is_archived = '0', authachat = '1', down = '1' WHERE codesico = ?",
            [$codeSico]
        );

        return [
            'success' => true,
            'codesico' => $codeSico,
        ];
    }

    /**
     * Archive un groupe d'actions par leurs codes SICOVAM.
     */
    public function archiveBulkStocks(array $codesicos): array
    {
        $archivedCount = 0;
        $totalPositionsClosed = 0;
        $totalCash = 0.0;
        $errors = [];

        foreach ($codesicos as $code) {
            $codeInt = (int)$code;
            if ($codeInt <= 0) continue;
            $res = $this->archiveStock($codeInt);
            if ($res['success']) {
                $archivedCount++;
                $totalPositionsClosed += $res['positionsClosed'];
                $totalCash += $res['totalCashCredited'];
            } else {
                $errors[] = $res['error'] ?? "Erreur archivage #$codeInt";
            }
        }

        return [
            'success' => count($errors) === 0,
            'archivedCount' => $archivedCount,
            'totalPositionsClosed' => $totalPositionsClosed,
            'totalCashCredited' => round($totalCash, 2),
            'errors' => $errors,
        ];
    }

    /**
     * Calcule le prochain code SICOVAM disponible pour une nouvelle action.
     */
    public function getNextAvailableSicoCode(): int
    {
        $row = $this->fetchOne("SELECT COALESCE(MAX(codesico), 0) AS max_code FROM cacval");
        $next = ((int)($row->max_code ?? 0)) + 1;

        // Si le maximum atteint la limite de mediumint unsigned (16 777 215), chercher le premier trou disponible
        if ($next >= 16777000) {
            $existing = $this->fetchAll("SELECT codesico FROM cacval ORDER BY codesico ASC");
            $used = [];
            foreach ($existing as $e) {
                $used[(int)$e->codesico] = true;
            }
            for ($i = 10000; $i < 16777000; $i++) {
                if (!isset($used[$i])) {
                    return $i;
                }
            }
        }

        return $next;
    }

    /**
     * Récupère sous forme de dictionnaire [ticker => stockRow] les actions existantes pour une liste de symboles.
     */
    public function findExistingTickersMap(array $tickers): array
    {
        if (empty($tickers)) {
            return [];
        }

        // Nettoyer et dédupliquer les tickers
        $cleanTickers = array_values(array_unique(array_filter(array_map('trim', $tickers))));
        if (empty($cleanTickers)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($cleanTickers), '?'));
        $sql = "SELECT codesico, yahooname, nom, valeur, authachat, down, idsecteur, idmarket 
                FROM cacval 
                WHERE yahooname IN ($placeholders)";
        $rows = $this->fetchAll($sql, $cleanTickers);

        $map = [];
        foreach ($rows as $row) {
            $map[(string)$row->yahooname] = $row;
        }
        return $map;
    }

    /**
     * Importe ou met à jour en masse une liste d'actions avec activation immédiate.
     *
     * @param array $stocksToImport Liste de tableaux ['yahooname' => ..., 'nom' => ..., 'valeur' => ...]
     * @return array Rapport d'importation
     */
    public function bulkImportStocks(array $stocksToImport): array
    {
        $tickers = [];
        foreach ($stocksToImport as $item) {
            if (!empty($item['yahooname'])) {
                $tickers[] = trim($item['yahooname']);
            }
        }

        $existingMap = $this->findExistingTickersMap($tickers);
        $nextSico = $this->getNextAvailableSicoCode();

        $created = 0;
        $updated = 0;
        $errors = [];
        $now = time();

        foreach ($stocksToImport as $stockData) {
            $ticker = trim((string)($stockData['yahooname'] ?? ''));
            if (empty($ticker)) {
                continue;
            }

            $name = trim((string)($stockData['nom'] ?? $ticker));
            $price = (float)($stockData['valeur'] ?? 0.0);
            $authBuy = (!empty($stockData['authachat']) && (string)$stockData['authachat'] !== '0') ? '1' : '1';
            $down = (!empty($stockData['down']) && (string)$stockData['down'] !== '0') ? '1' : '1';
            $idsecteur = (int)($stockData['idsecteur'] ?? 22); // Par défaut: Non classée
            $idmarket = (int)($stockData['idmarket'] ?? 1);   // Par défaut: SRD / Euronext Paris

            if (isset($existingMap[$ticker])) {
                // L'action existe déjà : mise à jour et activation
                $existing = $existingMap[$ticker];
                $code = (int)$existing->codesico;

                $updateSql = "UPDATE cacval 
                              SET authachat = ?, down = ?, lasttime = ?, lasttimedown = ?" . 
                              ($price > 0 ? ", valeur = ?" : "") . 
                              " WHERE codesico = ?";
                $params = [$authBuy, $down, $now, $now];
                if ($price > 0) {
                    $params[] = $price;
                }
                $params[] = $code;

                $ok = $this->execute($updateSql, $params);
                if ($ok) {
                    $updated++;
                } else {
                    $errors[] = "Erreur lors de la mise à jour de $ticker";
                }
            } else {
                // Nouvelle action : insertion avec nouveau code SICOVAM
                $code = $nextSico++;
                $insertSql = "INSERT INTO cacval (codesico, yahooname, nom, valeur, lasttime, lasttimedown, last_attempt, last_status, authachat, down, idsecteur, idmarket)
                              VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?)";
                $ok = $this->execute($insertSql, [
                    $code,
                    $ticker,
                    $name,
                    $price,
                    $now,
                    $now,
                    $authBuy,
                    $down,
                    $idsecteur,
                    $idmarket,
                ]);

                if ($ok) {
                    $created++;
                    $existingMap[$ticker] = (object)[
                        'codesico' => $code,
                        'yahooname' => $ticker,
                        'nom' => $name,
                        'valeur' => $price,
                        'authachat' => $authBuy,
                        'down' => $down,
                    ];
                } else {
                    $errors[] = "Erreur lors de l'insertion de $ticker";
                }
            }
        }

        return [
            'success' => count($errors) === 0,
            'created' => $created,
            'updated' => $updated,
            'total' => $created + $updated,
            'errors' => $errors,
        ];
    }
}

