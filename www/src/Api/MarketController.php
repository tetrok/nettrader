<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Service\TradingService;
use PDO;

class MarketController
{
    private TradingService $tradingService;

    public function __construct()
    {
        $this->tradingService = new TradingService();
    }

    /**
     * Résumé du marché (statut de la bourse, indices, top hausses, top baisses, dernières nouvelles).
     */
    public function getSummary(Request $request): void
    {
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $now = time();

        list($thour, $tmin) = explode(" ", date("H i", $now));
        $decimalHour = (int)$thour + round((int)$tmin / 60, 2);
        $dayOfWeek = (int)date('w', $now);
        $isMarketHours = ($decimalHour >= 9.25 && $decimalHour <= 17.917 && $dayOfWeek >= 1 && $dayOfWeek <= 5);

        // Récupérer les actions avec calcul de variation si cacvalmaj existe
        $query = "SELECT c.codesico, c.yahooname, c.nom, c.valeur, c.authachat, c.lasttime,
                         COALESCE(m.valeur, c.valeur) as prev_valeur
                  FROM cacval c
                  LEFT JOIN cacvalmaj m ON (c.codesico = m.codesico)
                  WHERE c.down = '1' OR c.valeur > 0
                  ORDER BY c.nom ASC";
        $stmt = ExecRequete($query, $conn);
        $allStocks = [];
        $totalStocks = 0;

        while ($row = LigneSuivante($stmt)) {
            $totalStocks++;
            $current = (float)$row->valeur;
            $prev = (float)$row->prev_valeur;
            $variation = $prev > 0 ? round((($current - $prev) / $prev) * 100, 2) : 0.0;

            $allStocks[] = [
                'code' => (int)$row->codesico,
                'ticker' => (string)$row->yahooname,
                'name' => (string)$row->nom,
                'price' => $current,
                'prevPrice' => $prev,
                'variation' => $variation,
                'authBuy' => ($row->authachat === '1'),
                'lastTime' => (int)$row->lasttime,
            ];
        }

        // Trier pour top hausses et top baisses
        $gainers = $allStocks;
        usort($gainers, fn($a, $b) => $b['variation'] <=> $a['variation']);
        $topGainers = array_slice(array_filter($gainers, fn($s) => $s['variation'] > 0), 0, 5);

        $losers = $allStocks;
        usort($losers, fn($a, $b) => $a['variation'] <=> $b['variation']);
        $topLosers = array_slice(array_filter($losers, fn($s) => $s['variation'] < 0), 0, 5);

        // Dernières actualités du jeu
        $newsList = [];
        $newsRaw = get_messagelist(0, 5, 0);
        if (is_array($newsRaw)) {
            foreach ($newsRaw as $n) {
                $newsList[] = [
                    'id' => (int)($n['idmessage'] ?? 0),
                    'author' => (string)($n['pseudonyme'] ?? 'Admin'),
                    'date' => (int)($n['datemess'] ?? 0),
                    'title' => (string)($n['titre'] ?? ''),
                    'content' => (string)($n['corps'] ?? ''),
                ];
            }
        }

        ApiResponse::success([
            'isMarketOpen' => $isMarketHours,
            'marketTime' => (int)get_tempsbourse(),
            'currentTime' => $now,
            'totalStocks' => $totalStocks,
            'topGainers' => $topGainers,
            'topLosers' => $topLosers,
            'recentNews' => $newsList,
        ]);
    }

    /**
     * Liste des valeurs cotées avec recherche et tri.
     */
    public function getStocks(Request $request): void
    {
        $search = trim($request->getString('search', ''));
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        $params = [];
        $sql = "SELECT c.codesico, c.yahooname, c.nom, c.valeur, c.authachat, c.lasttime,
                       COALESCE(m.valeur, c.valeur) as prev_valeur
                FROM cacval c
                LEFT JOIN cacvalmaj m ON (c.codesico = m.codesico)
                WHERE 1=1";

        if (!empty($search)) {
            $sql .= " AND (c.nom LIKE ? OR c.yahooname LIKE ? OR c.codesico = ?)";
            $params = ["%$search%", "%$search%", (int)$search];
        }

        $sql .= " ORDER BY c.nom ASC";

        $stmt = ExecRequete($sql, $conn, $params);
        $stocks = [];

        while ($row = LigneSuivante($stmt)) {
            $current = (float)$row->valeur;
            $prev = (float)$row->prev_valeur;
            $variation = $prev > 0 ? round((($current - $prev) / $prev) * 100, 2) : 0.0;

            $stocks[] = [
                'code' => (int)$row->codesico,
                'ticker' => (string)$row->yahooname,
                'name' => (string)$row->nom,
                'price' => $current,
                'prevPrice' => $prev,
                'variation' => $variation,
                'authBuy' => ($row->authachat === '1'),
                'lastTime' => (int)$row->lasttime,
            ];
        }

        ApiResponse::success($stocks);
    }

    /**
     * Fiche détaillée d'une valeur avec historique récent si disponible.
     */
    public function getStock(Request $request, int $code): void
    {
        if ($code <= 0) {
            ApiResponse::error("Code action invalide", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $stmt = ExecRequete("SELECT c.codesico, c.yahooname, c.nom, c.valeur, c.authachat, c.lasttime,
                                    COALESCE(m.valeur, c.valeur) as prev_valeur
                             FROM cacval c
                             LEFT JOIN cacvalmaj m ON (c.codesico = m.codesico)
                             WHERE c.codesico = ?", $conn, [$code]);
        $row = LigneSuivante($stmt);

        if (!is_object($row)) {
            ApiResponse::error("Action introuvable", 404);
        }

        $current = (float)$row->valeur;
        $prev = (float)$row->prev_valeur;
        $variation = $prev > 0 ? round((($current - $prev) / $prev) * 100, 2) : 0.0;

        // Générer des points de données historiques indicatifs basés sur les transactions récentes
        $historyStmt = ExecRequete("SELECT temps, valeurunique FROM historique WHERE codesico = ? ORDER BY temps DESC LIMIT 20", $conn, [$code]);
        $chartPoints = [];
        while ($hRow = LigneSuivante($historyStmt)) {
            $chartPoints[] = [
                'time' => (int)$hRow->temps,
                'price' => (float)$hRow->valeurunique,
            ];
        }
        $chartPoints = array_reverse($chartPoints);

        // Si aucun historique de transaction, créer un point avec la valeur actuelle et précédente
        if (empty($chartPoints)) {
            $chartPoints = [
                ['time' => time() - 3600, 'price' => $prev],
                ['time' => time(), 'price' => $current],
            ];
        }

        ApiResponse::success([
            'code' => (int)$row->codesico,
            'ticker' => (string)$row->yahooname,
            'name' => (string)$row->nom,
            'price' => $current,
            'prevPrice' => $prev,
            'variation' => $variation,
            'authBuy' => ($row->authachat === '1'),
            'lastTime' => (int)$row->lasttime,
            'history' => $chartPoints,
        ]);
    }
}
