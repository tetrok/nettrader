<?php

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use NetTrader\Service\TradingService;
use PDO;

class TradingController
{
    private TradingService $tradingService;

    public function __construct()
    {
        $this->tradingService = new TradingService();
    }

    /**
     * Récupère le portefeuille complet de l'utilisateur connecté.
     */
    public function getPortfolio(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $userId = $session->getId();
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);

        // Recharger le cashback à jour depuis la BDD
        $cashback = (float)GetCashBack($userId);

        $rawPositions = portefeuille_joueur();
        $positions = [];
        $totalPositionsValue = 0.0;
        $totalPositionsBuyValue = 0.0;

        foreach ($rawPositions as $row) {
            $code = (int)$row['codesicav'];
            $name = (string)$row['nomsicav'];
            $qty = (int)$row['nombsicav'];
            $currentPrice = (float)$row['valsicav'];
            $buyPrice = (float)$row['ansvalsicav'];
            $totalValue = (float)$row['valtotsicav'];
            $gainLoss = (float)$row['benefsicav'];
            $gainLossPercent = (float)$row['pourcentsicav'];

            $totalPositionsValue += $totalValue;
            $totalPositionsBuyValue += ($buyPrice * $qty);

            $pendingQty = $this->tradingService->getPendingSellOrderQuantity($userId, $code, $conn);
            $availableQty = max(0, $qty - $pendingQty);

            $positions[] = [
                'code' => $code,
                'name' => $name,
                'quantity' => $qty,
                'availableQuantity' => $availableQty,
                'pendingQuantity' => $pendingQty,
                'currentPrice' => $currentPrice,
                'buyPrice' => $buyPrice,
                'totalValue' => round($totalValue, 2),
                'gainLoss' => round($gainLoss, 2),
                'gainLossPercent' => round($gainLossPercent, 2),
                'isVad' => ($qty < 0),
            ];
        }

        $initialCapital = defined('CAPDEB') ? (float)CAPDEB : 10000.0;
        $totalCapital = round($cashback + $totalPositionsValue, 2);
        $totalPerformance = round($totalCapital - $initialCapital, 2);
        $totalPerformancePercent = $initialCapital > 0 ? round(($totalPerformance / $initialCapital) * 100, 2) : 0.0;

        $vadPossible = $this->tradingService->getMaxVadPossible($userId, $conn);

        ApiResponse::success([
            'cashback' => round($cashback, 2),
            'initialCapital' => $initialCapital,
            'totalPositionsValue' => round($totalPositionsValue, 2),
            'totalCapital' => $totalCapital,
            'totalPerformance' => $totalPerformance,
            'totalPerformancePercent' => $totalPerformancePercent,
            'vadPossible' => round($vadPossible, 2),
            'positions' => $positions,
        ]);
    }

    /**
     * Récupère les ordres en attente du joueur.
     */
    public function getOrders(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $ordersRaw = get_ordrelist();
        $orders = [];

        foreach ($ordersRaw as $row) {
            $orders[] = [
                'id' => (string)$row['datecreation'],
                'code' => (int)$row['codesico'],
                'name' => (string)($row['nom'] ?? ''),
                'sens' => (string)$row['sens'], // 'A' (achat) ou 'V' (vente)
                'quantity' => (int)$row['nbr'],
                'valmin' => (float)($row['coursmin'] ?? $row['valmin'] ?? 0.0),
                'valmax' => (float)($row['coursmax'] ?? $row['valmax'] ?? 0.0),
                'currentValue' => (float)($row['valeur'] ?? 0.0),
                'dateCreation' => (int)$row['datecreation'],
                'tempsLimite' => (int)$row['tempslim'],
            ];
        }

        ApiResponse::success($orders);
    }

    /**
     * Passage d'un ordre d'achat ou de vente.
     */
    public function placeOrder(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $payload = $request->getJson();
        $sens = trim((string)($payload['sens'] ?? 'achat'));
        $codesicav = (int)($payload['codesicav'] ?? 0);
        $nbr = (int)($payload['quantity'] ?? $payload['nbr'] ?? 0);
        $valminNum = (float)str_replace(',', '.', (string)($payload['valmin'] ?? '0'));
        $valmaxNum = (float)str_replace(',', '.', (string)($payload['valmax'] ?? '0'));
        $valmin = (string)$valminNum;
        $valmax = (string)$valmaxNum;

        // Si des seuils de cours sont définis, activer le mode seuil
        $hasThreshold = ($valminNum > 0 || $valmaxNum > 0);
        $seuil = (string)($payload['seuil'] ?? ($hasThreshold ? '1' : '0'));

        // Formatage de la validité pour creer_ordre (attendu: "d/m/Y H:i")
        $validity = $payload['validity'] ?? $payload['tempsmin'] ?? null;
        if (is_numeric($validity) && (int)$validity > 0) {
            $valInt = (int)$validity;
            if ($valInt <= 365) {
                // Nombre de jours de validité
                $tempsmin = date('d/m/Y H:i', time() + ($valInt * 86400));
            } else {
                // Timestamp Unix
                $tempsmin = date('d/m/Y H:i', $valInt);
            }
        } elseif (is_string($validity) && preg_match('#\d{1,2}/\d{1,2}/\d{4}#', $validity)) {
            $tempsmin = $validity;
        } else {
            $tempsmin = date('d/m/Y H:i', time() + (30 * 86400));
        }

        $select = (string)($payload['select'] ?? '1');
        $ansval = (string)($payload['ansval'] ?? '');
        $nb2 = (string)($payload['nb2'] ?? '0');

        if ($codesicav <= 0) {
            ApiResponse::error("Veuillez sélectionner un titre valide.", 400);
        }

        if ($nbr <= 0) {
            ApiResponse::error("La quantité doit être supérieure à zéro.", 400);
        }

        // 1. Validation métier stricte (possession, VAD, liquidités, ordres actifs, seuils)
        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $validation = $this->tradingService->validateOrder($session->getId(), [
            'sens' => $sens,
            'codesicav' => $codesicav,
            'quantity' => $nbr,
            'valmin' => $valminNum,
            'valmax' => $valmaxNum,
            'seuil' => $seuil,
            'validity' => $validity,
        ], $conn);

        if (!$validation['valid']) {
            ApiResponse::error($validation['error'] ?? "Ordre non valide.", 400);
        }

        // 2. Appel à la fonction legacy d'ordre
        $res = creer_ordre(
            $sens,
            $codesicav,
            $nbr,
            $valmin,
            $valmax,
            $tempsmin,
            $select,
            $ansval,
            $seuil,
            $nb2
        );

        $parsed = $this->tradingService->parseLegacyOrderResult($res);
        if (!$parsed['success']) {
            ApiResponse::error($parsed['message'], 400);
        }

        ApiResponse::success([
            'message' => $parsed['message'],
        ], $parsed['message']);
    }

    /**
     * Annule un ordre en attente.
     */
    public function cancelOrder(Request $request, string $id): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        if (empty($id)) {
            ApiResponse::error("Identifiant d'ordre manquant", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $checkStmt = ExecRequete("SELECT idordre FROM ordre WHERE idcompte = ? AND datecreation = ?", $conn, [$session->getId(), $id]);
        $order = LigneSuivante($checkStmt);

        if (!is_object($order)) {
            ApiResponse::error("Ordre introuvable ou vous n'êtes pas autorisé à l'annuler.", 404);
        }

        $res = supprordre($id);
        ApiResponse::success(null, strip_tags($res));
    }

    /**
     * Annule tous les ordres en attente du joueur.
     */
    public function cancelAllOrders(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $res = supprtoutordre();
        ApiResponse::success(null, strip_tags($res));
    }

    /**
     * Récupère l'historique des transactions exécutées.
     */
    public function getHistory(Request $request): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        $page = max(1, $request->getInt('page', 1));
        $limit = min(100, max(5, $request->getInt('limit', 20)));
        $offset = ($page - 1) * $limit;

        $userId = $session->getId();
        $totalCount = (int)listhistocount($userId);
        $rawHistory = listhisto($offset, $limit);

        $items = [];
        foreach ($rawHistory as $row) {
            $items[] = [
                'date' => (int)($row['UNIX'] ?? $row['temps'] ?? 0),
                'name' => (string)($row['LENOM'] ?? ''),
                'sens' => (string)($row['LESENS'] ?? ''),
                'quantity' => (int)($row['LENOMBRE'] ?? 0),
                'totalExclTax' => (float)($row['LETOTHT'] ?? 0.0),
                'tax' => (float)($row['LATAXE'] ?? 0.0),
                'totalInclTax' => (float)($row['LETTC'] ?? 0.0),
                'profit' => (string)($row['PROFITOP'] ?? '0 €'),
            ];
        }

        ApiResponse::success([
            'items' => $items,
            'page' => $page,
            'limit' => $limit,
            'total' => $totalCount,
            'totalPages' => (int)ceil($totalCount / $limit),
        ]);
    }

    /**
     * Calcule la taxe et la quantité max achetable/vendable pour une action donnée.
     */
    public function calculateSimulation(Request $request): void
    {
        $session = UserSession::current();
        $code = $request->getInt('codesico', 0);
        $qty = max(1, $request->getInt('quantity', 1));

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $stockPrice = $this->tradingService->getStockValue($code, $conn);
        $tax = $this->tradingService->calculateTax($stockPrice, $qty);
        $total = round(($stockPrice * $qty) + $tax, 2);

        $maxBuyable = 0;
        $maxVad = 0.0;
        $ownedQuantity = 0;
        $availableSellQuantity = 0;
        $pendingSellQuantity = 0;
        $availableCash = 0.0;
        $canVad = false;
        $canThreshold = false;
        $canRange = false;

        if ($session->isLoggedIn()) {
            $userId = $session->getId();
            $availableCash = $this->tradingService->getAvailableCash($userId, $conn);
            $maxBuyable = $this->tradingService->getMaxBuyableShares($availableCash, $stockPrice);
            $maxVad = $this->tradingService->getMaxVadPossible($userId, $conn);

            $ownedQuantity = $this->tradingService->getOwnedStockQuantity($userId, $code, $conn);
            $pendingSellQuantity = $this->tradingService->getPendingSellOrderQuantity($userId, $code, $conn);
            $availableSellQuantity = $this->tradingService->getAvailableSellQuantity($userId, $code, $conn);

            $levelInfo = $this->tradingService->getUserLevelInfo($userId, $conn);
            $canVad = (bool)($levelInfo->vad ?? false);
            $canThreshold = (bool)($levelInfo->seuil ?? false);
            $canRange = (bool)($levelInfo->plage ?? false);
        }

        ApiResponse::success([
            'code' => $code,
            'stockPrice' => $stockPrice,
            'quantity' => $qty,
            'tax' => $tax,
            'total' => $total,
            'maxBuyable' => $maxBuyable,
            'maxVad' => $maxVad,
            'ownedQuantity' => $ownedQuantity,
            'availableSellQuantity' => $availableSellQuantity,
            'pendingSellQuantity' => $pendingSellQuantity,
            'availableCash' => $availableCash,
            'canVad' => $canVad,
            'canThreshold' => $canThreshold,
            'canRange' => $canRange,
        ]);
    }
}
