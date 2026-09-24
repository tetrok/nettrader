<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Repository\StockRepository;
use NetTrader\Service\TradingService;

class MarketController
{
    private TradingService $tradingService;
    private StockRepository $stockRepo;

    public function __construct(?StockRepository $stockRepo = null, ?TradingService $tradingService = null)
    {
        $this->stockRepo = $stockRepo ?? new StockRepository();
        $this->tradingService = $tradingService ?? new TradingService();
    }

    /**
     * Résumé du marché (statut de la bourse, indices, top hausses, top baisses, dernières nouvelles).
     */
    public function getSummary(Request $request): void
    {
        $now = time();

        list($thour, $tmin) = explode(" ", date("H i", $now));
        $decimalHour = (int)$thour + round((int)$tmin / 60, 2);
        $dayOfWeek = (int)date('w', $now);
        $isMarketHours = ($decimalHour >= 9.25 && $decimalHour <= 17.917 && $dayOfWeek >= 1 && $dayOfWeek <= 5);

        // Récupérer les actions avec calcul de variation
        $rows = $this->stockRepo->getStocksWithVariation(null, true);
        $allStocks = [];
        $totalStocks = count($rows);

        foreach ($rows as $row) {
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
        $rows = $this->stockRepo->getStocksWithVariation($search);
        $stocks = [];

        foreach ($rows as $row) {
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

        $row = $this->stockRepo->getStockWithVariation($code);

        if (!$row) {
            ApiResponse::error("Action introuvable", 404);
        }

        $current = (float)$row->valeur;
        $prev = (float)$row->prev_valeur;
        $variation = $prev > 0 ? round((($current - $prev) / $prev) * 100, 2) : 0.0;

        $period = $request->getString('period', '1m');
        $chartPoints = $this->stockRepo->getStockHistory($code, $period);

        ApiResponse::success([
            'code' => (int)$row->codesico,
            'ticker' => (string)$row->yahooname,
            'name' => (string)$row->nom,
            'price' => $current,
            'prevPrice' => $prev,
            'variation' => $variation,
            'authBuy' => ($row->authachat === '1'),
            'lastTime' => (int)$row->lasttime,
            'period' => $period,
            'history' => $chartPoints,
        ]);
    }

    /**
     * Récupère uniquement l'historique d'une valeur pour une période donnée.
     */
    public function getStockHistory(Request $request, int $code): void
    {
        if ($code <= 0) {
            ApiResponse::error("Code action invalide", 400);
        }

        $row = $this->stockRepo->getStockWithVariation($code);
        if (!$row) {
            ApiResponse::error("Action introuvable", 404);
        }

        $period = $request->getString('period', '1m');
        $chartPoints = $this->stockRepo->getStockHistory($code, $period);

        ApiResponse::success([
            'code' => $code,
            'period' => $period,
            'history' => $chartPoints,
        ]);
    }
}
