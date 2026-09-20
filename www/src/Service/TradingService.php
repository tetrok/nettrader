<?php

namespace NetTrader\Service;

use NetTrader\Database\Database;
use PDO;

/**
 * Service métier dédié aux calculs financiers, règles boursières et passages d'ordres.
 */
class TradingService
{
    /**
     * Taux de courtage et commissions.
     */
    public const COMMISSION_RATE = 0.0030;
    public const TVA_RATE = 0.196;
    public const MINIMUM_TAX = 4.95;

    /**
     * Calcule le montant des taxes et frais de courtage pour une transaction.
     */
    public function calculateTax(float $stockValue, int $quantity): float
    {
        $tax = round(($quantity * $stockValue) * self::COMMISSION_RATE * (1 + self::TVA_RATE), 2);
        return max($tax, self::MINIMUM_TAX);
    }

    /**
     * Calcule la quantité maximale d'actions achetable selon la liquidité disponible.
     */
    public function getMaxBuyableShares(float $cashback, float $stockValue): int
    {
        if ($stockValue <= 0.0) {
            return 0;
        }
        if ($cashback < (self::MINIMUM_TAX + $stockValue)) {
            return 0;
        }
        $maxShares = (int)floor((0.99642482771815 * $cashback) / $stockValue);
        return max($maxShares, 0);
    }

    /**
     * Calcule le montant maximal de Vente À Découvert (VAD) autorisée pour un joueur.
     */
    public function getMaxVadPossible(int $accountId, ?PDO $conn = null): float
    {
        if ($accountId <= 0) {
            return 0.0;
        }

        $capitalHorsVad = function_exists('getplayercapitalhorsvad') ? (float)getplayercapitalhorsvad($accountId) : 0.0;
        $capitalVad     = function_exists('getplayercapitalvad') ? (float)getplayercapitalvad($accountId) : 0.0;

        $stmt = Database::execute("SELECT cashback FROM compte WHERE idcompte = ?", [$accountId], $conn);
        $row = Database::fetchObject($stmt);
        $cashback = is_object($row) && isset($row->cashback) ? (float)$row->cashback : 0.0;

        $limiteVad = ($cashback - $capitalVad) + $capitalHorsVad;
        $limiteVadPossible = $limiteVad - $capitalVad;

        return max($limiteVadPossible, 0.0);
    }

    /**
     * Vérifie si le marché boursier est actif pour le jeu.
     */
    public function isMarketOpen(?int $timestamp = null, ?int $accountId = null): bool
    {
        $timestamp = $timestamp ?? time();
        $deb = defined('DEBCONC') ? DEBCONC : 0;
        $fin = defined('FINCONC') ? FINCONC : 0;

        if ($accountId === 1) {
            return true;
        }

        return ($timestamp > $deb && $timestamp < $fin);
    }

    /**
     * Récupère la cotation actuelle d'un titre boursier.
     */
    public function getStockValue(int $codesico, ?PDO $conn = null): float
    {
        $stmt = Database::execute("SELECT valeur FROM cacval WHERE codesico = ?", [$codesico], $conn);
        $row = Database::fetchObject($stmt);
        return is_object($row) && isset($row->valeur) ? (float)$row->valeur : 0.0;
    }

    /**
     * Calcule le signe d'un montant (1, -1 ou 0).
     */
    public function getSign(float $val): int
    {
        if ($val > 0.0) {
            return 1;
        }
        if ($val < 0.0) {
            return -1;
        }
        return 0;
    }

    /**
     * Récupère les informations complètes d'un titre boursier.
     */
    public function getStockInfo(int $codesico, ?PDO $conn = null): ?object
    {
        $stmt = Database::execute("SELECT codesico, nom, valeur, authachat, lasttime FROM cacval WHERE codesico = ?", [$codesico], $conn);
        $row = Database::fetchObject($stmt);
        return is_object($row) ? $row : null;
    }

    /**
     * Retourne la quantité exacte d'un titre possédée par un joueur en portefeuille.
     */
    public function getOwnedStockQuantity(int $userId, int $codesico, ?PDO $conn = null): int
    {
        $stmt = Database::execute("SELECT quant FROM portef WHERE idcompte = ? AND codesico = ?", [$userId, $codesico], $conn);
        $row = Database::fetchObject($stmt);
        return (is_object($row) && isset($row->quant)) ? (int)$row->quant : 0;
    }

    /**
     * Calcule la quantité d'un titre actuellement engagée dans des ordres de vente actifs en attente.
     */
    public function getPendingSellOrderQuantity(int $userId, int $codesico, ?PDO $conn = null): int
    {
        $stmt = Database::execute(
            "SELECT SUM(nbr) as total_qty FROM ordre WHERE idcompte = ? AND codesico = ? AND sens = 'vente' AND etat = '1' AND tempslim > ?",
            [$userId, $codesico, time()],
            $conn
        );
        $row = Database::fetchObject($stmt);
        return (is_object($row) && isset($row->total_qty)) ? (int)$row->total_qty : 0;
    }

    /**
     * Retourne la quantité vendable disponible (actions possédées moins ordres de vente actifs).
     */
    public function getAvailableSellQuantity(int $userId, int $codesico, ?PDO $conn = null): int
    {
        $owned = $this->getOwnedStockQuantity($userId, $codesico, $conn);
        $pendingSell = $this->getPendingSellOrderQuantity($userId, $codesico, $conn);
        return max(0, $owned - $pendingSell);
    }

    /**
     * Calcule le montant total des liquidités bloquées par des ordres d'achat en attente.
     */
    public function getCommittedBuyCash(int $userId, ?PDO $conn = null): float
    {
        $stmt = Database::execute(
            "SELECT o.nbr, o.coursmax, c.valeur 
             FROM ordre o 
             LEFT JOIN cacval c ON o.codesico = c.codesico 
             WHERE o.idcompte = ? AND o.sens = 'achat' AND o.etat = '1' AND o.tempslim > ?",
            [$userId, time()],
            $conn
        );
        $total = 0.0;
        while ($row = Database::fetchObject($stmt)) {
            $qty = (int)$row->nbr;
            $price = ((float)$row->coursmax > 0) ? (float)$row->coursmax : (float)$row->valeur;
            if ($price > 0 && $qty > 0) {
                $total += ($qty * $price) + $this->calculateTax($price, $qty);
            }
        }
        return round($total, 2);
    }

    /**
     * Retourne les liquidités réelles disponibles (cashback moins ordres d'achat en attente).
     */
    public function getAvailableCash(int $userId, ?PDO $conn = null): float
    {
        $cashback = function_exists('GetCashBack') ? (float)GetCashBack($userId) : 0.0;
        $committed = $this->getCommittedBuyCash($userId, $conn);
        return max(0.0, round($cashback - $committed, 2));
    }

    /**
     * Récupère le niveau et les permissions associées du joueur.
     */
    public function getUserLevelInfo(int $userId, ?PDO $conn = null): ?object
    {
        $stmt = Database::execute(
            "SELECT n.* FROM compte c JOIN niveau n ON c.idniveau = n.idniveau WHERE c.idcompte = ?",
            [$userId],
            $conn
        );
        $row = Database::fetchObject($stmt);
        return is_object($row) ? $row : null;
    }

    /**
     * Valide l'ensemble des règles métier d'un ordre avant soumission.
     *
     * @param int $userId Identifiant du joueur
     * @param array $params Paramètres de l'ordre (sens, codesicav, quantity, valmin, valmax, seuil, validity)
     * @param PDO|null $conn Connexion PDO optionnelle
     * @return array ['valid' => bool, 'error' => ?string]
     */
    public function validateOrder(int $userId, array $params, ?PDO $conn = null): array
    {
        $sens = trim((string)($params['sens'] ?? ''));
        $codesicav = (int)($params['codesicav'] ?? 0);
        $quantity = (int)($params['quantity'] ?? 0);
        $valmin = (float)($params['valmin'] ?? 0.0);
        $valmax = (float)($params['valmax'] ?? 0.0);
        $seuil = (string)($params['seuil'] ?? '0');

        // 1. Marché ouvert
        if (!$this->isMarketOpen(time(), $userId)) {
            return ['valid' => false, 'error' => "Le marché est actuellement fermé."];
        }

        // 2. Sens de transaction
        if (!in_array($sens, ['achat', 'vente'], true)) {
            return ['valid' => false, 'error' => "Le sens de la transaction doit être 'achat' ou 'vente'."];
        }

        // 3. Quantité strictement positive
        if ($quantity <= 0) {
            return ['valid' => false, 'error' => "La quantité doit être supérieure à zéro."];
        }

        // 4. Titre boursier existant et négociable
        $stock = $this->getStockInfo($codesicav, $conn);
        if (!$stock || (int)$stock->authachat !== 1) {
            return ['valid' => false, 'error' => "Ce titre n'existe pas ou n'est pas autorisé à la négociation."];
        }
        $stockPrice = (float)$stock->valeur;
        if ($stockPrice <= 0.0) {
            return ['valid' => false, 'error' => "Le cours de cette action est invalide."];
        }

        // 5. Niveaux et règles de seuils
        $levelInfo = $this->getUserLevelInfo($userId, $conn);
        $canUseThreshold = (bool)($levelInfo->seuil ?? false);
        $canUseRange = (bool)($levelInfo->plage ?? false);
        $hasThreshold = ($seuil === '1' || $valmin > 0 || $valmax > 0);

        if ($hasThreshold && !$canUseThreshold) {
            return ['valid' => false, 'error' => "Les ordres à seuil ne sont pas autorisés pour votre niveau de joueur."];
        }

        if ($valmin > 0 && $valmax > 0 && !$canUseRange) {
            return ['valid' => false, 'error' => "Les ordres avec plage de cours (cours minimum et maximum simultanés) nécessitent le niveau Initié ou Expert."];
        }

        if ($hasThreshold) {
            if ($valmin < 0 || $valmax < 0) {
                return ['valid' => false, 'error' => "Les seuils de cours ne peuvent pas être négatifs."];
            }
            if ($valmin > 0 && $valmax > 0 && $valmin > $valmax) {
                return ['valid' => false, 'error' => "Le cours minimum ne peut pas dépasser le cours maximum."];
            }
        }

        // 6. Contrôle spécifique VENTE
        if ($sens === 'vente') {
            $isVadAllowed = (bool)($levelInfo->vad ?? false);
            $ownedShares = $this->getOwnedStockQuantity($userId, $codesicav, $conn);
            $pendingSell = $this->getPendingSellOrderQuantity($userId, $codesicav, $conn);
            $availableShares = max(0, $ownedShares - $pendingSell);

            if (!$isVadAllowed) {
                if ($ownedShares <= 0) {
                    return [
                        'valid' => false,
                        'error' => "Vous ne possédez pas cette action dans votre portefeuille et vous n'avez pas l'autorisation de vente à découvert (VAD)."
                    ];
                }
                if ($quantity > $availableShares) {
                    return [
                        'valid' => false,
                        'error' => "Quantité insuffisante : vous possédez {$ownedShares} action(s), dont {$pendingSell} déjà engagée(s) dans des ordres de vente en attente (disponible : {$availableShares})."
                    ];
                }
            } else {
                // VAD autorisée (Expert)
                $maxVad = $this->getMaxVadPossible($userId, $conn);
                $vadShares = $this->getMaxBuyableShares($maxVad, $stockPrice);
                $totalPossible = $availableShares + $vadShares;

                if ($quantity > $totalPossible) {
                    return [
                        'valid' => false,
                        'error' => "Quantité excessive pour votre capacité de vente (actions disponibles : {$availableShares}, capacité VAD : {$vadShares} action(s))."
                    ];
                }
            }
        }

        // 7. Contrôle spécifique ACHAT
        if ($sens === 'achat') {
            $tax = $this->calculateTax($stockPrice, $quantity);
            $totalRequired = round(($stockPrice * $quantity) + $tax, 2);
            $availableCash = $this->getAvailableCash($userId, $conn);

            if ($totalRequired > $availableCash) {
                $currentCash = function_exists('GetCashBack') ? (float)GetCashBack($userId) : 0.0;
                $committed = $this->getCommittedBuyCash($userId, $conn);
                return [
                    'valid' => false,
                    'error' => "Liquidités insuffisantes pour cet achat. Montant requis : " . number_format($totalRequired, 2, ',', ' ') . " € (Liquidités : " . number_format($currentCash, 2, ',', ' ') . " €, engagées dans d'autres ordres : " . number_format($committed, 2, ',', ' ') . " €, net disponible : " . number_format($availableCash, 2, ',', ' ') . " €)."
                ];
            }
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Analyse le retour brut de la fonction legacy creer_ordre.
     */
    public function parseLegacyOrderResult(string $result): array
    {
        $clean = trim(strip_tags($result));
        $successKeywords = [
            'acheté avec succès',
            'achetée avec succès',
            'vendu avec succès',
            'vendue avec succès',
            "en attente d'execution",
            "en attente d'exécution",
            'ordre créé',
            'ordre cree',
        ];

        foreach ($successKeywords as $kw) {
            if (stripos($clean, $kw) !== false) {
                return ['success' => true, 'message' => $clean];
            }
        }

        return ['success' => false, 'message' => $clean ?: "Une erreur est survenue lors de l'enregistrement de l'ordre."];
    }
}
