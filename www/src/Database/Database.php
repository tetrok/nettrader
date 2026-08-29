<?php

namespace NetTrader\Database;

use PDO;
use PDOStatement;

/**
 * Gestionnaire d'accès à la base de données et exécution de requêtes préparées.
 */
class Database
{
    private static ?PDO $connection = null;

    /**
     * Obtient la connexion PDO courante ou en initialise une nouvelle.
     */
    public static function getConnection(?string $host = null, ?string $db = null, ?string $user = null, ?string $pass = null): PDO
    {
        if (self::$connection === null) {
            $host = $host ?? (defined('SERVEUR') ? SERVEUR : (getenv('DB_HOST') ?: 'localhost'));
            $db   = $db   ?? (defined('BASE') ? BASE : (getenv('DB_NAME') ?: 'nettrader'));
            $user = $user ?? (defined('NOM') ? NOM : (getenv('DB_USER') ?: 'root'));
            $pass = $pass ?? (defined('PASSE') ? PASSE : (getenv('DB_PASSWORD') ?: ''));

            $dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_SILENT,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$connection = new PDO($dsn, $user, $pass, $options);
            } catch (\PDOException $e) {
                die("Désolé, connexion au serveur impossible : " . $e->getMessage() . "\n");
            }
        }
        return self::$connection;
    }

    /**
     * Définit manuellement une connexion PDO (ex: tests ou injection).
     */
    public static function setConnection(?PDO $conn): void
    {
        self::$connection = $conn;
    }

    /**
     * Exécute une requête SQL avec paramètres préparés optionnels.
     *
     * @param string $query Requête SQL
     * @param array $params Paramètres pour requête préparée
     * @param PDO|null $conn Connexion spécifique optionnelle
     * @return PDOStatement|false
     */
    public static function execute(string $query, array $params = [], ?PDO $conn = null)
    {
        $conn = $conn ?? self::getConnection();

        try {
            if (!empty($params)) {
                $stmt = $conn->prepare($query);
                if ($stmt !== false) {
                    $stmt->execute($params);
                    return $stmt;
                }
                return false;
            } else {
                return $conn->query($query);
            }
        } catch (\PDOException $e) {
            return false;
        }
    }

    /**
     * Récupère la première ligne sous forme d'objet.
     */
    public static function fetchObject($statement)
    {
        if ($statement instanceof PDOStatement) {
            return $statement->fetch(PDO::FETCH_OBJ);
        }
        return false;
    }

    /**
     * Récupère toutes les lignes sous forme de tableau associatif.
     */
    public static function fetchAll($statement): array
    {
        if ($statement instanceof PDOStatement) {
            return $statement->fetchAll(PDO::FETCH_ASSOC);
        }
        return [];
    }
}
