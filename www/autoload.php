<?php

/**
 * NetTrader 2 — Autoloader PSR-4 & Compatibilité PHP
 *
 * Usage:
 *   Ce fichier charge dynamiquement les classes du namespace NetTrader\
 *   à partir du répertoire src/ sans nécessiter d'outils externes obligatoires.
 *   Il est inclus au démarrage par l'API REST (api/index.php), les scripts CLI et le front legacy.
 *
 * Logique & Fonctionnement:
 *   - Déclare une fonction anonyme via spl_autoload_register.
 *   - Découpe le namespace "NetTrader\" pour mapper le nom qualifié vers le chemin de fichier (ex: NetTrader\Api\AuthController -> src/Api/AuthController.php).
 *   - Fournit des polyfills PHP 8 (str_contains, str_starts_with, str_ends_with) pour assurer la rétrocompatibilité sous PHP 7.4.
 */

spl_autoload_register(function (string $class): void {
    $prefix = 'NetTrader\\';
    $baseDir = __DIR__ . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

// Polyfills PHP 8 pour environnement PHP 7.4
if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool {
        return $needle === '' || strpos($haystack, $needle) !== false;
    }
}
if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool {
        return $needle === '' || strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with(string $haystack, string $needle): bool {
        return $needle === '' || $needle === substr($haystack, -strlen($needle));
    }
}

