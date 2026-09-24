<?php

namespace NetTrader\Repository;

use PDO;

/**
 * Repository pour les ordres de bourse (table ordre).
 */
class OrderRepository extends BaseRepository
{
    public function findById(int $orderId): ?object
    {
        return $this->fetchOne("SELECT * FROM ordre WHERE idordre = ?", [$orderId]);
    }

    /**
     * Recherche un ordre actif appartenant à un compte par son ID ou date de création.
     */
    public function findActiveByAccountAndIdentifier(int $accountId, string $identifier): ?object
    {
        $sql = "SELECT idordre, datecreation, codesico, idcompte, sens, nbr, etat 
                FROM ordre 
                WHERE idcompte = ? AND (datecreation = ? OR idordre = ?)";
        return $this->fetchOne($sql, [$accountId, $identifier, (int)$identifier]);
    }

    public function countPendingOrders(): int
    {
        $res = $this->fetchOne("SELECT COUNT(*) as c FROM ordre WHERE etat = '1'");
        return $res ? (int)$res->c : 0;
    }

    /**
     * Récupère la liste des ordres en attente pour un compte donné avec les détails de l'action.
     */
    public function getPendingOrdersByAccount(int $accountId): array
    {
        $sql = "SELECT o.idordre, o.codesico, o.idcompte, o.datecreation, o.sens, o.nbr, 
                       o.pourc, o.tempslim, o.coursmin, o.coursmax, o.etat,
                       c.nom, c.valeur AS current_price, c.yahooname
                FROM ordre o
                JOIN cacval c ON o.codesico = c.codesico
                WHERE o.idcompte = ? AND o.etat = '1'
                ORDER BY o.datecreation DESC";
        return $this->fetchAll($sql, [$accountId]);
    }

    /**
     * Calcule la quantité d'actions déjà engagée dans des ordres en attente.
     */
    public function getPendingQuantity(int $accountId, int $codeSico, string $sens = 'vente'): int
    {
        // Normalisation du sens : 'V' ou 'vente'
        $sensParam = (strtoupper($sens) === 'V' || strtolower($sens) === 'vente') ? 'vente' : 'achat';
        $sql = "SELECT COALESCE(SUM(nbr), 0) as total 
                FROM ordre 
                WHERE idcompte = ? AND codesico = ? AND sens = ? AND etat = '1'";
        $res = $this->fetchOne($sql, [$accountId, $codeSico, $sensParam]);
        return $res ? (int)$res->total : 0;
    }

    /**
     * Insère un nouvel ordre de bourse.
     */
    public function createOrder(
        int $accountId,
        int $codeSico,
        string $sens,
        int $quantity,
        ?float $pourc = null,
        int $tempslim = 0,
        float $coursmin = 0.0,
        float $coursmax = 0.0,
        ?int $dateCreation = null
    ): int {
        $sensNormalized = (strtoupper($sens) === 'A' || strtolower($sens) === 'achat') ? 'achat' : 'vente';
        $now = $dateCreation ?? time();
        $pourcVal = ($pourc === null || (int)$pourc === 0) ? null : $pourc;

        $sql = "INSERT INTO ordre (codesico, idcompte, datecreation, sens, nbr, pourc, tempslim, coursmin, coursmax, etat)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '1')";

        $this->execute($sql, [
            $codeSico,
            $accountId,
            $now,
            $sensNormalized,
            $quantity,
            $pourcVal,
            $tempslim,
            $coursmin,
            $coursmax,
        ]);

        return $this->lastInsertId();
    }

    /**
     * Annule un ordre spécifique appartenant à un compte.
     */
    public function cancelOrder(int $orderId, int $accountId): bool
    {
        return $this->execute("DELETE FROM ordre WHERE idordre = ? AND idcompte = ?", [$orderId, $accountId]);
    }

    /**
     * Annule tous les ordres en attente d'un compte.
     */
    public function cancelAllOrders(int $accountId): int
    {
        $stmt = $this->query("DELETE FROM ordre WHERE idcompte = ?", [$accountId]);
        return $stmt->rowCount();
    }

    /**
     * Récupère tous les ordres en attente dont les conditions de cours sont atteintes.
     */
    public function getExecutableOrders(): array
    {
        $sql = "SELECT o.*, c.valeur as cours_actuel
                FROM ordre o
                JOIN cacval c ON o.codesico = c.codesico
                WHERE o.etat = '1'
                  AND (o.tempslim = 0 OR o.tempslim >= UNIX_TIMESTAMP())
                  AND (
                      (o.sens = 'achat' AND (o.coursmax = 0 OR c.valeur <= o.coursmax) AND (o.coursmin = 0 OR c.valeur >= o.coursmin))
                      OR
                      (o.sens = 'vente' AND (o.coursmin = 0 OR c.valeur >= o.coursmin) AND (o.coursmax = 0 OR c.valeur <= o.coursmax))
                  )";
        return $this->fetchAll($sql);
    }
}
