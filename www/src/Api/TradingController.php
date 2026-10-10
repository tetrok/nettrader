<?php

/**
 * NetTrader 2 — Contrôleur REST des Opérations Boursières & Courtage
 *
 * Usage:
 *   Expose les fonctionnalités de négociation d'actifs pour le frontend (/api/trading).
 *
 * Logique & Fonctionnement:
 *   - getPortfolio() : retourne la valorisation totale, les liquidités, le PRU et les lignes d'actions détenues.
 *   - getPendingOrders() : liste les ordres d'achat et de vente actuellement en carnet d'ordres.
 *   - placeOrder() : valide et insère un nouvel ordre (au marché, limité, ou à seuil de déclenchement),
 *     contrôle les liquidités requises, les frais de courtage et les autorisations par niveau d'expertise.
 *   - cancelOrder() / cancelAllOrders() : retire les ordres en attente et libère les liquidités ou actions engagées.
 *   - updateOrder() : permet la modification du volume ou des seuils d'un ordre existant.
 *   - simulateOrder() : calcule les frais et taxes prévisionnels avant validation par le joueur.
 *   - getHistory() : consulte l'historique complet des transactions passées.
 */

namespace NetTrader\Api;

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use NetTrader\Repository\OrderRepository;
use NetTrader\Repository\PortfolioRepository;
use NetTrader\Repository\StockRepository;
use NetTrader\Repository\UserRepository;
use NetTrader\Service\TradingService;
use PDO;

class TradingController
{
    private TradingService $tradingService;
    private OrderRepository $orderRepo;
    private PortfolioRepository $portfolioRepo;
    private StockRepository $stockRepo;
    private UserRepository $userRepo;

    public function __construct(
        ?TradingService $tradingService = null,
        ?OrderRepository $orderRepo = null,
        ?PortfolioRepository $portfolioRepo = null,
        ?StockRepository $stockRepo = null,
        ?UserRepository $userRepo = null
    ) {
        $this->tradingService = $tradingService ?? new TradingService();
        $this->orderRepo = $orderRepo ?? new OrderRepository();
        $this->portfolioRepo = $portfolioRepo ?? new PortfolioRepository();
        $this->stockRepo = $stockRepo ?? new StockRepository();
        $this->userRepo = $userRepo ?? new UserRepository();
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
        $user = $this->userRepo->findById($userId);
        $cashback = $user ? (float)$user->cashback : (float)GetCashBack($userId);

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

            // Recherche de la date d'achat (dernière opération d'achat ou de VAD correspondante)
            $buyDate = null;
            $sensSearch = ($qty < 0) ? 'Vente' : 'Achat';
            $stmtHist = ExecRequete(
                "SELECT temps FROM historique WHERE idcompte = ? AND codesico = ? AND sens = ? ORDER BY temps DESC, idhisto DESC LIMIT 1",
                $conn,
                [$userId, $code, $sensSearch]
            );
            $histRow = LigneSuivante($stmtHist);
            if (is_object($histRow) && isset($histRow->temps)) {
                $buyDate = (int)$histRow->temps;
            } else {
                // Fallback si l'opération d'origine a été enregistrée avec un autre libellé
                $stmtHistFallback = ExecRequete(
                    "SELECT temps FROM historique WHERE idcompte = ? AND codesico = ? ORDER BY temps DESC, idhisto DESC LIMIT 1",
                    $conn,
                    [$userId, $code]
                );
                $histFallbackRow = LigneSuivante($stmtHistFallback);
                if (is_object($histFallbackRow) && isset($histFallbackRow->temps)) {
                    $buyDate = (int)$histFallbackRow->temps;
                }
            }

            $positions[] = [
                'code' => $code,
                'name' => $name,
                'quantity' => $qty,
                'availableQuantity' => $availableQty,
                'pendingQuantity' => $pendingQty,
                'currentPrice' => $currentPrice,
                'buyPrice' => $buyPrice,
                'buyDate' => $buyDate,
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
     * Modifie un ordre en attente.
     */
    public function updateOrder(Request $request, string $id): void
    {
        $session = UserSession::current();
        if (!$session->isLoggedIn()) {
            ApiResponse::error("Non authentifié", 401);
        }

        if (empty($id)) {
            ApiResponse::error("Identifiant d'ordre manquant", 400);
        }

        $userId = $session->getId();
        $order = $this->orderRepo->findActiveByAccountAndIdentifier($userId, $id);
        if (!$order) {
            ApiResponse::error("Ordre introuvable ou vous n'êtes pas autorisé à le modifier.", 404);
        }

        // Vérifier si le marché est ouvert
        if (!$this->tradingService->isMarketOpen(time(), $userId)) {
            ApiResponse::error("Le marché est actuellement fermé.", 400);
        }

        $payload = $request->getJson();
        $nbr = isset($payload['quantity']) ? (int)$payload['quantity'] : (int)$order->nbr;
        if ($nbr <= 0) {
            ApiResponse::error("La quantité doit être supérieure à zéro.", 400);
        }

        $valminNum = isset($payload['valmin']) ? (float)str_replace(',', '.', (string)$payload['valmin']) : (float)$order->coursmin;
        $valmaxNum = isset($payload['valmax']) ? (float)str_replace(',', '.', (string)$payload['valmax']) : (float)$order->coursmax;

        if ($valminNum < 0 || $valmaxNum < 0) {
            ApiResponse::error("Les seuils de cours ne peuvent pas être négatifs.", 400);
        }
        if ($valminNum > 0 && $valmaxNum > 0 && $valminNum > $valmaxNum) {
            ApiResponse::error("Le cours minimum ne peut pas dépasser le cours maximum.", 400);
        }

        $conn = Connexion(NOM, PASSE, BASE, SERVEUR);
        $levelInfo = $this->tradingService->getUserLevelInfo($userId, $conn);
        $canUseThreshold = (bool)($levelInfo->seuil ?? false);
        $canUseRange = (bool)($levelInfo->plage ?? false);
        $hasThreshold = ($valminNum > 0 || $valmaxNum > 0);

        if ($hasThreshold && !$canUseThreshold) {
            ApiResponse::error("Les ordres à seuil ne sont pas autorisés pour votre niveau de joueur.", 400);
        }
        if ($valminNum > 0 && $valmaxNum > 0 && !$canUseRange) {
            ApiResponse::error("Les ordres avec plage de cours nécessitent le niveau Initié ou Expert.", 400);
        }

        // Calcul tempsLimite
        $tempslim = (int)$order->tempslim;
        $validity = $payload['validity'] ?? null;
        if (is_numeric($validity) && (int)$validity > 0) {
            $valInt = (int)$validity;
            if ($valInt <= 365) {
                $tempslim = time() + ($valInt * 86400);
            } else {
                $tempslim = $valInt;
            }
        }

        // Contrôles spécifiques au sens
        $sens = (string)$order->sens;
        $codesico = (int)$order->codesico;
        $stock = $this->tradingService->getStockInfo($codesico, $conn);
        $stockPrice = $stock ? (float)$stock->valeur : 0.0;

        if ($sens === 'vente') {
            $isVadAllowed = (bool)($levelInfo->vad ?? false);
            $ownedShares = $this->tradingService->getOwnedStockQuantity($userId, $codesico, $conn);
            $pendingSellOther = (int)$this->orderRepo->fetchOne(
                "SELECT COALESCE(SUM(nbr), 0) as total FROM ordre WHERE idcompte = ? AND codesico = ? AND sens = 'vente' AND etat = '1' AND datecreation != ? AND idordre != ?",
                [$userId, $codesico, $order->datecreation, (int)$order->idordre]
            )->total;
            $availableShares = max(0, $ownedShares - $pendingSellOther);

            if (!$isVadAllowed) {
                if ($nbr > $availableShares) {
                    ApiResponse::error("Quantité insuffisante : vous disposez de {$availableShares} action(s) disponible(s).", 400);
                }
            } else {
                $maxVad = $this->tradingService->getMaxVadPossible($userId, $conn);
                $vadShares = $this->tradingService->getMaxBuyableShares($maxVad, $stockPrice);
                $totalPossible = $availableShares + $vadShares;
                if ($nbr > $totalPossible) {
                    ApiResponse::error("Quantité excessive pour votre capacité de vente ({$totalPossible} max).", 400);
                }
            }
        } elseif ($sens === 'achat') {
            $priceRef = ($valmaxNum > 0) ? $valmaxNum : $stockPrice;
            $tax = $this->tradingService->calculateTax($priceRef, $nbr);
            $totalRequired = round(($priceRef * $nbr) + $tax, 2);

            // Calcul des liquidités engagées par les AUTRES ordres d'achat
            $otherCommitted = 0.0;
            $stmtOther = Database::execute(
                "SELECT o.nbr, o.coursmax, c.valeur 
                 FROM ordre o 
                 LEFT JOIN cacval c ON o.codesico = c.codesico 
                 WHERE o.idcompte = ? AND o.sens = 'achat' AND o.etat = '1' AND o.tempslim > ? AND o.datecreation != ? AND o.idordre != ?",
                [$userId, time(), $order->datecreation, (int)$order->idordre],
                $conn
            );
            while ($rowO = Database::fetchObject($stmtOther)) {
                $q = (int)$rowO->nbr;
                $p = ((float)$rowO->coursmax > 0) ? (float)$rowO->coursmax : (float)$rowO->valeur;
                if ($p > 0 && $q > 0) {
                    $otherCommitted += ($q * $p) + $this->tradingService->calculateTax($p, $q);
                }
            }
            $currentCash = function_exists('GetCashBack') ? (float)GetCashBack($userId) : 0.0;
            $availableCashForOrder = max(0.0, round($currentCash - $otherCommitted, 2));

            if ($totalRequired > $availableCashForOrder) {
                ApiResponse::error("Liquidités insuffisantes pour modifier cet ordre. Requis : " . number_format($totalRequired, 2, ',', ' ') . " € (Disponible : " . number_format($availableCashForOrder, 2, ',', ' ') . " €).", 400);
            }
        }

        // Mettre à jour l'ordre
        $updateSql = "UPDATE ordre SET nbr = ?, coursmin = ?, coursmax = ?, tempslim = ? WHERE idcompte = ? AND (datecreation = ? OR idordre = ?)";
        ExecRequete($updateSql, $conn, [$nbr, $valminNum, $valmaxNum, $tempslim, $userId, $order->datecreation, (int)$order->idordre]);

        ApiResponse::success(null, "Ordre modifié avec succès !");
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

        $order = $this->orderRepo->findActiveByAccountAndIdentifier($session->getId(), $id);

        if (!$order) {
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
