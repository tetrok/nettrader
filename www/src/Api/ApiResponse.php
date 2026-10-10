<?php

/**
 * NetTrader 2 — Bâtisseur de Réponses HTTP JSON Normalisées
 *
 * Usage:
 *   Fournit une structure uniforme pour toutes les réponses émises par les contrôleurs de l'API REST.
 *
 * Logique & Fonctionnement:
 *   - success($data, $status = 200) : envoie un JSON avec header HTTP correspondant :
 *     { "success": true, "data": $data }
 *   - error($message, $status = 400) : envoie un JSON d'erreur :
 *     { "success": false, "error": $message, "data": null }
 */

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
