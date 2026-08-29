<?php

namespace NetTrader\Auth;

/**
 * Encapsule la session utilisateur, l'identité du joueur connecté et la vérification des permissions.
 */
class UserSession
{
    private static ?UserSession $instance = null;
    private ?object $user = null;

    public function __construct(?object $user = null)
    {
        $this->user = $user;
    }

    /**
     * Récupère l'instance singleton de la session active.
     */
    public static function current(): self
    {
        if (self::$instance === null) {
            global $internaute;
            self::$instance = new self(is_object($internaute) ? $internaute : null);
        }
        return self::$instance;
    }

    /**
     * Définit ou met à jour l'utilisateur connecté.
     */
    public function setUser(?object $user): void
    {
        $this->user = $user;
        global $internaute;
        $internaute = $user;
    }

    /**
     * Retourne l'objet utilisateur sous-jacent (compatible avec le legacy $internaute).
     */
    public function getUser(): ?object
    {
        if ($this->user === null) {
            global $internaute;
            if (is_object($internaute)) {
                $this->user = $internaute;
            }
        }
        return $this->user;
    }

    /**
     * Vérifie si un utilisateur est actuellement authentifié.
     */
    public function isLoggedIn(): bool
    {
        $user = $this->getUser();
        return is_object($user) && isset($user->idcompte) && (int)$user->idcompte > 0;
    }

    /**
     * Identifiant du compte joueur.
     */
    public function getId(): int
    {
        $user = $this->getUser();
        return (is_object($user) && isset($user->idcompte)) ? (int)$user->idcompte : 0;
    }

    /**
     * Pseudonyme du joueur.
     */
    public function getPseudo(): string
    {
        $user = $this->getUser();
        return (is_object($user) && isset($user->pseudonyme)) ? (string)$user->pseudonyme : '';
    }

    /**
     * Email du joueur.
     */
    public function getEmail(): string
    {
        $user = $this->getUser();
        return (is_object($user) && isset($user->email)) ? (string)$user->email : '';
    }

    /**
     * Liquidités actuelles (cashback) du joueur.
     */
    public function getCashback(): float
    {
        $user = $this->getUser();
        return (is_object($user) && isset($user->cashback)) ? (float)$user->cashback : 0.0;
    }

    /**
     * Répertoire du skin associé au joueur.
     */
    public function getSkinRep(): string
    {
        $user = $this->getUser();
        if (is_object($user) && isset($user->nomrep) && !empty($user->nomrep)) {
            return 'skin/' . $user->nomrep;
        }
        return 'skin/default';
    }

    /**
     * Identifiant du skin associé.
     */
    public function getSkinId(): int
    {
        $user = $this->getUser();
        return (is_object($user) && isset($user->idskin)) ? (int)$user->idskin : 1;
    }

    /**
     * Niveau d'autorisation / privilèges.
     */
    public function getAuthLevel(): int
    {
        $user = $this->getUser();
        return (is_object($user) && isset($user->authlevel)) ? (int)$user->authlevel : 0;
    }

    /**
     * Vérifie si le joueur est administrateur (idcompte = 1 ou authlevel > 1).
     */
    public function isAdmin(): bool
    {
        return $this->getId() === 1 || $this->getAuthLevel() > 1;
    }

    /**
     * Vérifie si le joueur peut modifier ou supprimer un message de forum.
     */
    public function canEditForumPost(?object $post): bool
    {
        if (!$this->isLoggedIn() || !is_object($post)) {
            return false;
        }
        $authorId = isset($post->idcompte) ? (int)$post->idcompte : -1;
        return $this->getId() === $authorId || $this->isAdmin();
    }

    /**
     * Vérifie si le joueur est administrateur d'un groupe spécifique.
     */
    public function isGroupAdmin(int $groupId = 0): bool
    {
        if (!$this->isLoggedIn()) {
            return false;
        }
        if (function_exists('estadmingroupe')) {
            return (bool)estadmingroupe($this->getId(), $groupId);
        }
        return false;
    }

    /**
     * Vérifie si le joueur est membre d'un groupe.
     */
    public function isGroupMember(int $groupId): bool
    {
        if (!$this->isLoggedIn()) {
            return false;
        }
        if (function_exists('estmembregroupe')) {
            return (bool)estmembregroupe($this->getId());
        }
        return false;
    }
}
