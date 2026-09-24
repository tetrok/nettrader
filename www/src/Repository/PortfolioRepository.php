<?php

namespace NetTrader\Repository;

use PDO;

/**
 * Repository pour le portefeuille d'actions et l'historique des transactions.
 */
class PortfolioRepository extends BaseRepository
{
    /**
     * Récupère une position spécifique pour un compte.
     */
    public function getPosition(int $accountId, int $codeSico, bool $forUpdate = false): ?object
    {
        $sql = "SELECT p.idcompte, p.codesico, p.quant AS nombsicav, p.quant, p.ansvaleur, c.nom, c.valeur AS current_price, c.yahooname 
                FROM portef p
                LEFT JOIN cacval c ON p.codesico = c.codesico
                WHERE p.idcompte = ? AND p.codesico = ?";
        if ($forUpdate) {
            $sql .= " FOR UPDATE";
        }
        return $this->fetchOne($sql, [$accountId, $codeSico]);
    }

    /**
     * Récupère l'ensemble des positions en portefeuille d'un compte avec les cotations actuelles.
     */
    public function getPositions(int $accountId): array
    {
        $sql = "SELECT p.codesico, p.quant AS quantity, p.ansvaleur AS buy_price, 
                       c.nom AS name, c.valeur AS current_price, c.yahooname AS ticker
                FROM portef p
                JOIN cacval c ON p.codesico = c.codesico
                WHERE p.idcompte = ? AND p.quant != 0
                ORDER BY c.nom ASC";
        return $this->fetchAll($sql, [$accountId]);
    }

    /**
     * Ajoute une nouvelle ligne de position en portefeuille.
     */
    public function addPosition(int $accountId, int $codeSico, int $quantity, float $price): bool
    {
        return $this->execute(
            "INSERT INTO portef (idcompte, codesico, quant, ansvaleur) VALUES (?, ?, ?, ?)",
            [$accountId, $codeSico, $quantity, $price]
        );
    }

    /**
     * Modifie la quantité et le prix de revient unitaire (PRU) d'une position.
     */
    public function updatePosition(int $accountId, int $codeSico, int $newQuantity, float $price): bool
    {
        if ($newQuantity === 0) {
            return $this->deletePosition($accountId, $codeSico);
        }
        return $this->execute(
            "UPDATE portef SET quant = ?, ansvaleur = ? WHERE idcompte = ? AND codesico = ?",
            [$newQuantity, $price, $accountId, $codeSico]
        );
    }

    /**
     * Supprime une position nulle du portefeuille.
     */
    public function deletePosition(int $accountId, int $codeSico): bool
    {
        return $this->execute("DELETE FROM portef WHERE idcompte = ? AND codesico = ?", [$accountId, $codeSico]);
    }

    /**
     * Supprime l'intégralité du portefeuille d'un joueur (ex: remise à zéro).
     */
    public function resetPortfolio(int $accountId): bool
    {
        return $this->execute("DELETE FROM portef WHERE idcompte = ?", [$accountId]);
    }

    /**
     * Récupère l'historique des transactions passées pour un compte.
     */
    public function getHistory(int $accountId, int $limit = 50, int $offset = 0): array
    {
        $sql = "SELECT h.idhisto, h.temps, h.codesico, h.idcompte, h.sens, h.nbr AS quantity, 
                       h.valeurunique AS price, h.taxe, h.profit,
                       c.nom AS stock_name, c.yahooname AS ticker
                FROM historique h
                LEFT JOIN cacval c ON h.codesico = c.codesico
                WHERE h.idcompte = ?
                ORDER BY h.temps DESC, h.idhisto DESC
                LIMIT $offset, $limit";
        return $this->fetchAll($sql, [$accountId]);
    }

    /**
     * Enregistre une transaction dans l'historique financier.
     */
    public function addHistory(
        int $accountId,
        string $sens,
        int $codeSico,
        int $quantity,
        float $price,
        float $tax,
        float $profit,
        ?int $timestamp = null
    ): int {
        $now = $timestamp ?? time();
        $sensNormalized = (strtoupper($sens) === 'A' || strtolower($sens) === 'achat') ? 'Achat' : 'Vente';

        $this->execute(
            "INSERT INTO historique (temps, codesico, idcompte, sens, nbr, valeurunique, taxe, profit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [$now, $codeSico, $accountId, $sensNormalized, $quantity, $price, $tax, $profit]
        );

        return $this->lastInsertId();
    }

    /**
     * Calcule la valeur totale des positions en portefeuille (long et VAD).
     */
    public function getTotalPortfolioValue(int $accountId): float
    {
        $positions = $this->getPositions($accountId);
        $total = 0.0;
        foreach ($positions as $pos) {
            $total += ((float)$pos->quantity * (float)$pos->current_price);
        }
        return $total;
    }
}
