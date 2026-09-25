<?php

namespace NetTrader\Repository;

use PDO;

/**
 * Repository pour les comptes utilisateurs, profils, niveaux et classements (table compte, niveau, session).
 */
class UserRepository extends BaseRepository
{
    public function findById(int $id, bool $forUpdate = false): ?object
    {
        $sql = "SELECT c.*, n.texteniveau, n.seuil, n.vad, n.plage 
                FROM compte c 
                LEFT JOIN niveau n ON c.idniveau = n.idniveau 
                WHERE c.idcompte = ?";
        if ($forUpdate) {
            $sql .= " FOR UPDATE";
        }
        return $this->fetchOne($sql, [$id]);
    }

    public function findByPseudo(string $pseudo): ?object
    {
        $sql = "SELECT c.*, n.texteniveau, n.seuil, n.vad, n.plage 
                FROM compte c 
                LEFT JOIN niveau n ON c.idniveau = n.idniveau 
                WHERE c.pseudonyme = ?";
        return $this->fetchOne($sql, [$pseudo]);
    }

    public function findByEmail(string $email): ?object
    {
        return $this->fetchOne("SELECT * FROM compte WHERE email = ?", [$email]);
    }

    public function countTotalPlayers(): int
    {
        $res = $this->fetchOne("SELECT COUNT(*) as c FROM compte");
        return $res ? (int)$res->c : 0;
    }

    public function countActiveSessions(): int
    {
        $res = $this->fetchOne("SELECT COUNT(*) as c FROM session WHERE tempsLimite > UNIX_TIMESTAMP()");
        return $res ? (int)$res->c : 0;
    }

    /**
     * Met à jour le solde de liquidités (cashback) d'un joueur par incrément/décrément.
     */
    public function updateCashback(int $id, float $amountDelta): bool
    {
        return $this->execute(
            "UPDATE compte SET cashback = cashback + ? WHERE idcompte = ?",
            [$amountDelta, $id]
        );
    }

    /**
     * Définit directement le solde de liquidités d'un joueur (ex: remise à zéro du capital).
     */
    public function setCashback(int $id, float $newAmount): bool
    {
        return $this->execute(
            "UPDATE compte SET cashback = ? WHERE idcompte = ?",
            [$newAmount, $id]
        );
    }

    /**
     * Met à jour le mot de passe haché d'un joueur.
     */
    public function updatePassword(int $id, string $hashedPassword): bool
    {
        return $this->execute(
            "UPDATE compte SET passe = ? WHERE idcompte = ?",
            [$hashedPassword, $id]
        );
    }

    /**
     * Vérifie si un mot de passe en clair correspond au compte (supporte Bcrypt et md5 legacy).
     */
    public function verifyPassword(int $id, string $plainPassword): bool
    {
        if (empty($plainPassword)) {
            return false;
        }
        $user = $this->findById($id);
        if (!$user || !isset($user->passe)) {
            return false;
        }
        if (password_verify($plainPassword, (string)$user->passe)) {
            return true;
        }
        if ((string)$user->passe === md5($plainPassword)) {
            // Mise à niveau transparente vers Bcrypt
            $newHash = password_hash($plainPassword, PASSWORD_BCRYPT);
            $this->updatePassword($id, $newHash);
            return true;
        }
        return false;
    }

    /**
     * Met à jour les champs du profil d'un joueur.
     */
    public function updateProfile(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        if (isset($data['email'])) {
            $fields[] = "email = ?";
            $params[] = $data['email'];
        }
        if (isset($data['nom'])) {
            $fields[] = "nom = ?";
            $params[] = $data['nom'];
        }
        if (isset($data['prenom'])) {
            $fields[] = "prenom = ?";
            $params[] = $data['prenom'];
        }
        if (isset($data['adresse'])) {
            $fields[] = "adresse = ?";
            $params[] = $data['adresse'];
        }
        if (isset($data['cp'])) {
            $fields[] = "cp = ?";
            $params[] = $data['cp'];
        }
        if (isset($data['ville'])) {
            $fields[] = "ville = ?";
            $params[] = $data['ville'];
        }
        if (isset($data['tel'])) {
            $fields[] = "tel = ?";
            $params[] = $data['tel'];
        }
        if (isset($data['idniveau'])) {
            $fields[] = "idniveau = ?";
            $params[] = (int)$data['idniveau'];
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $id;
        $sql = "UPDATE compte SET " . implode(", ", $fields) . " WHERE idcompte = ?";
        return $this->execute($sql, $params);
    }

    /**
     * Met à jour le timestamp de dernière activité.
     */
    public function updateLastActive(int $id): bool
    {
        return $this->execute(
            "UPDATE compte SET dateactivite = UNIX_TIMESTAMP() WHERE idcompte = ?",
            [$id]
        );
    }

    /**
     * Recherche de joueurs avec pagination pour l'administration.
     */
    public function searchPlayers(string $search = '', int $limit = 25, int $offset = 0): array
    {
        $sql = "SELECT idcompte, pseudonyme, email, cashback, dateinscr, dateactivite, idniveau, authlevel 
                FROM compte 
                WHERE 1=1";
        $params = [];
        if (!empty($search)) {
            $sql .= " AND (pseudonyme LIKE ? OR email LIKE ?)";
            $params = ["%$search%", "%$search%"];
        }
        $sql .= " ORDER BY dateactivite DESC LIMIT $offset, $limit";
        return $this->fetchAll($sql, $params);
    }

    public function countPlayers(string $search = ''): int
    {
        $sql = "SELECT COUNT(*) as c FROM compte WHERE 1=1";
        $params = [];
        if (!empty($search)) {
            $sql .= " AND (pseudonyme LIKE ? OR email LIKE ?)";
            $params = ["%$search%", "%$search%"];
        }
        $res = $this->fetchOne($sql, $params);
        return $res ? (int)$res->c : 0;
    }

    /**
     * Classement des joueurs calculé sur le capital total (liquidités + portefeuille).
     */
    public function getLeaderboard(int $limit = 50, int $offset = 0): array
    {
        $sql = "SELECT c.idcompte, c.pseudonyme, c.cashback, c.idniveau, c.dateinscr, c.dateactivite,
                       COALESCE(SUM(p.quant * cv.valeur), 0) as portfolio_value,
                       (c.cashback + COALESCE(SUM(p.quant * cv.valeur), 0)) as total_capital
                FROM compte c
                LEFT JOIN portef p ON c.idcompte = p.idcompte AND p.quant != 0
                LEFT JOIN cacval cv ON p.codesico = cv.codesico
                GROUP BY c.idcompte
                ORDER BY total_capital DESC
                LIMIT $offset, $limit";
        return $this->fetchAll($sql);
    }
}
