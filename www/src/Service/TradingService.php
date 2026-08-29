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
}
