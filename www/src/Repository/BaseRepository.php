<?php

namespace NetTrader\Repository;

use NetTrader\Database\Database;
use PDO;
use PDOStatement;

/**
 * Classe de base pour la couche d'accès aux données (DAL).
 */
abstract class BaseRepository
{
    protected PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function getDb(): PDO
    {
        return $this->db;
    }

    /**
     * Exécute une requête préparée et retourne le statement PDO.
     */
    protected function query(string $sql, array $params = []): PDOStatement
    {
        $stmt = $this->db->prepare($sql);
        if ($stmt === false) {
            $err = $this->db->errorInfo();
            throw new \RuntimeException("Erreur préparation SQL: " . ($err[2] ?? 'inconnue') . " dans: $sql");
        }
        $res = $stmt->execute($params);
        if ($res === false) {
            $err = $stmt->errorInfo();
            throw new \RuntimeException("Erreur exécution SQL: " . ($err[2] ?? 'inconnue') . " dans: $sql");
        }
        return $stmt;
    }

    /**
     * Récupère une seule ligne sous forme d'objet ou null.
     */
    protected function fetchOne(string $sql, array $params = []): ?object
    {
        $stmt = $this->query($sql, $params);
        $row = $stmt->fetch(PDO::FETCH_OBJ);
        return $row !== false ? $row : null;
    }

    /**
     * Récupère toutes les lignes sous forme d'un tableau d'objets.
     */
    protected function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll(PDO::FETCH_OBJ);
    }

    /**
     * Exécute une commande d'écriture (INSERT, UPDATE, DELETE).
     */
    protected function execute(string $sql, array $params = []): bool
    {
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Retourne le dernier ID inséré.
     */
    protected function lastInsertId(): int
    {
        return (int)$this->db->lastInsertId();
    }
}
