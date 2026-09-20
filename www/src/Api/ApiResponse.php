<?php

namespace NetTrader\Api;

/**
 * Helper standardisé pour les réponses JSON de l'API REST.
 */
class ApiResponse
{
    public static function json(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    public static function success($data = null, string $message = '', int $statusCode = 200): void
    {
        self::json([
            'success' => true,
            'data' => $data,
            'message' => $message,
        ], $statusCode);
    }

    public static function error(string $message, int $statusCode = 400, $data = null): void
    {
        self::json([
            'success' => false,
            'error' => $message,
            'data' => $data,
        ], $statusCode);
    }
}
