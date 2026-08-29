<?php

namespace NetTrader\Http;

/**
 * Encapsule les paramètres de requête HTTP (GET, POST, COOKIE, SERVER) et fournit des accesseurs typés et sécurisés.
 */
class Request
{
    private static ?Request $current = null;
    private array $get;
    private array $post;
    private array $cookie;
    private array $server;

    public function __construct(?array $get = null, ?array $post = null, ?array $cookie = null, ?array $server = null)
    {
        $this->get = $get ?? $_GET;
        $this->post = $post ?? $_POST;
        $this->cookie = $cookie ?? $_COOKIE;
        $this->server = $server ?? $_SERVER;
    }

    /**
     * Récupère la requête HTTP courante.
     */
    public static function createFromGlobals(): self
    {
        if (self::$current === null) {
            self::$current = new self();
        }
        return self::$current;
    }

    /**
     * Retourne l'action demandée (?do=...).
     */
    public function getAction(string $default = ''): string
    {
        return $this->getString('do', $default);
    }

    /**
     * Récupère une variable GET, ou POST si absente, ou une valeur par défaut.
     */
    public function get(string $key, $default = null)
    {
        if (array_key_exists($key, $this->get)) {
            return $this->get[$key];
        }
        if (array_key_exists($key, $this->post)) {
            return $this->post[$key];
        }
        return $default;
    }

    /**
     * Récupère une variable POST.
     */
    public function post(string $key, $default = null)
    {
        return $this->post[$key] ?? $default;
    }

    /**
     * Récupère un Cookie.
     */
    public function cookie(string $key, $default = null)
    {
        return $this->cookie[$key] ?? $default;
    }

    /**
     * Récupère une variable serveur.
     */
    public function server(string $key, $default = null)
    {
        return $this->server[$key] ?? $default;
    }

    /**
     * Récupère une valeur convertie en chaîne de caractères nettoyée.
     */
    public function getString(string $key, string $default = ''): string
    {
        $val = $this->get($key, $default);
        return is_scalar($val) ? trim((string)$val) : $default;
    }

    /**
     * Récupère une valeur entière.
     */
    public function getInt(string $key, int $default = 0): int
    {
        $val = $this->get($key, $default);
        return is_numeric($val) ? (int)$val : $default;
    }

    /**
     * Récupère une valeur flottante.
     */
    public function getFloat(string $key, float $default = 0.0): float
    {
        $val = $this->get($key, $default);
        if (is_string($val)) {
            $val = str_replace(',', '.', $val);
        }
        return is_numeric($val) ? (float)$val : $default;
    }

    /**
     * Vérifie si la méthode de requête est POST.
     */
    public function isPost(): bool
    {
        return strtoupper($this->server('REQUEST_METHOD', 'GET')) === 'POST';
    }

    /**
     * Retourne l'adresse IP du client.
     */
    public function getClientIp(): string
    {
        return (string)$this->server('REMOTE_ADDR', '127.0.0.1');
    }
}
