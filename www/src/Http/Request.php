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
        return $this->getMethod() === 'POST';
    }

    /**
     * Retourne la méthode HTTP de la requête (GET, POST, PUT, DELETE, OPTIONS...).
     */
    public function getMethod(): string
    {
        return strtoupper((string)$this->server('REQUEST_METHOD', 'GET'));
    }

    /**
     * Récupère le corps de la requête décodé depuis JSON.
     */
    public function getJson(): array
    {
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
        return [];
    }

    /**
     * Récupère le Bearer token dans l'en-tête Authorization.
     */
    public function getBearerToken(): ?string
    {
        $auth = (string)$this->server('HTTP_AUTHORIZATION', '');
        if (empty($auth)) {
            $auth = (string)$this->server('REDIRECT_HTTP_AUTHORIZATION', '');
        }
        if (empty($auth) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $auth = (string)($headers['Authorization'] ?? $headers['authorization'] ?? '');
        }
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Retourne l'adresse IP du client.
     */
    public function getClientIp(): string
    {
        return (string)$this->server('REMOTE_ADDR', '127.0.0.1');
    }
}
