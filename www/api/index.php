<?php

/**
 * NetTrader 2 - Passerelle API REST
 * Point d'entrée unique pour l'IHM React
 */

// 1. Initialisation Session & En-têtes CORS
$allowedOrigins = array_filter([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    getenv('FRONTEND_URL') ?: null,
]);
$incomingOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$corsOrigin = in_array($incomingOrigin, $allowedOrigins, true) ? $incomingOrigin : 'http://localhost:3000';

header("Access-Control-Allow-Origin: $corsOrigin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Vary: Origin");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);
ini_set('display_errors', '0');

// 2. Chargement des dépendances et de l'environnement legacy
require_once __DIR__ . '/../autoload.php';
require_once __DIR__ . '/../const.php';
require_once __DIR__ . '/../constbdd.php';
require_once __DIR__ . '/../lang/lang_fr.php';
require_once __DIR__ . '/../skin/default/include_interface.php';
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../db_reqtableaux.php';
require_once __DIR__ . '/../db_reqfunction.php';
require_once __DIR__ . '/../nt2_function.php';
require_once __DIR__ . '/../nt2_pages.php';
require_once __DIR__ . '/../nt2_adminfunction.php';

use NetTrader\Http\Request;
use NetTrader\Auth\UserSession;
use NetTrader\Api\ApiResponse;
use NetTrader\Api\AuthController;
use NetTrader\Api\TradingController;
use NetTrader\Api\MarketController;
use NetTrader\Api\LeaderboardController;
use NetTrader\Api\AccountController;
use NetTrader\Api\TeamController;
use NetTrader\Api\MessageController;
use NetTrader\Api\ForumController;
use NetTrader\Api\ContentController;
use NetTrader\Api\AdminController;

$request = Request::createFromGlobals();
$userSession = UserSession::current();
$userSession->resolveFromRequest($request);

// 3. Extraction et normalisation de la route
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
// Nettoyage du préfixe /api ou /api/index.php
$path = preg_replace('#^.*?/api(?:/index\.php)?/?#', '', $uri);
$path = trim((string)$path, '/');

if (empty($path)) {
    $path = trim($request->getString('route', ''), '/');
}

$method = $request->getMethod();
$segments = explode('/', $path);

try {
    // -------------------------------------------------------------
    // Routeur REST
    // -------------------------------------------------------------

    // Auth
    if ($path === 'auth/login' && $method === 'POST') {
        (new AuthController())->login($request);
    } elseif ($path === 'auth/register' && $method === 'POST') {
        (new AuthController())->register($request);
    } elseif ($path === 'auth/logout' && ($method === 'POST' || $method === 'GET')) {
        (new AuthController())->logout($request);
    } elseif ($path === 'auth/me' && $method === 'GET') {
        (new AuthController())->me($request);
    } elseif ($path === 'auth/password-reset' && $method === 'POST') {
        (new AuthController())->requestPasswordReset($request);
    }

    // Trading & Portefeuille
    elseif ($path === 'trading/portfolio' && $method === 'GET') {
        (new TradingController())->getPortfolio($request);
    } elseif ($path === 'trading/orders' && $method === 'GET') {
        (new TradingController())->getOrders($request);
    } elseif ($path === 'trading/orders' && $method === 'POST') {
        (new TradingController())->placeOrder($request);
    } elseif ($path === 'trading/orders' && $method === 'DELETE') {
        $orderId = $request->getString('id', '');
        if (!empty($orderId)) {
            (new TradingController())->cancelOrder($request, $orderId);
        } else {
            (new TradingController())->cancelAllOrders($request);
        }
    } elseif ($segments[0] === 'trading' && ($segments[1] ?? '') === 'orders' && isset($segments[2]) && $method === 'DELETE') {
        (new TradingController())->cancelOrder($request, $segments[2]);
    } elseif ($path === 'trading/history' && $method === 'GET') {
        (new TradingController())->getHistory($request);
    } elseif ($path === 'trading/simulate' && $method === 'GET') {
        (new TradingController())->calculateSimulation($request);
    }

    // Marché & Cotations
    elseif ($path === 'market/summary' && $method === 'GET') {
        (new MarketController())->getSummary($request);
    } elseif ($path === 'market/stocks' && $method === 'GET') {
        (new MarketController())->getStocks($request);
    } elseif ($segments[0] === 'market' && ($segments[1] ?? '') === 'stocks' && isset($segments[2]) && ($segments[3] ?? '') === 'history' && $method === 'GET') {
        (new MarketController())->getStockHistory($request, (int)$segments[2]);
    } elseif ($segments[0] === 'market' && ($segments[1] ?? '') === 'stocks' && isset($segments[2]) && $method === 'GET') {
        (new MarketController())->getStock($request, (int)$segments[2]);
    }

    // Classements
    elseif ($path === 'leaderboard/players' && $method === 'GET') {
        (new LeaderboardController())->getPlayers($request);
    } elseif ($path === 'leaderboard/teams' && $method === 'GET') {
        (new LeaderboardController())->getTeams($request);
    }

    // Profil & Compte
    elseif ($path === 'account/profile' && $method === 'GET') {
        (new AccountController())->getProfile($request);
    } elseif ($path === 'account/profile' && ($method === 'PUT' || $method === 'POST')) {
        (new AccountController())->updateProfile($request);
    } elseif ($path === 'account/password' && ($method === 'PUT' || $method === 'POST')) {
        (new AccountController())->changePassword($request);
    } elseif ($path === 'account/reset' && $method === 'POST') {
        (new AccountController())->resetAccount($request);
    }

    // Équipes
    elseif ($segments[0] === 'teams' && isset($segments[1]) && is_numeric($segments[1]) && $method === 'GET') {
        (new TeamController())->getTeam($request, (int)$segments[1]);
    } elseif ($path === 'teams' && $method === 'POST') {
        (new TeamController())->createTeam($request);
    } elseif ($segments[0] === 'teams' && isset($segments[1]) && is_numeric($segments[1]) && ($segments[2] ?? '') === 'join' && $method === 'POST') {
        (new TeamController())->joinTeam($request, (int)$segments[1]);
    } elseif ($path === 'teams/leave' && $method === 'POST') {
        (new TeamController())->leaveTeam($request);
    }

    // Messagerie
    elseif ($path === 'messages' && $method === 'GET') {
        (new MessageController())->getInbox($request);
    } elseif ($path === 'messages' && $method === 'POST') {
        (new MessageController())->sendMessage($request);
    } elseif ($segments[0] === 'messages' && isset($segments[1]) && is_numeric($segments[1]) && $method === 'DELETE') {
        (new MessageController())->deleteMessage($request, (int)$segments[1]);
    }

    // Forums
    elseif ($path === 'forums' && $method === 'GET') {
        (new ForumController())->getForums($request);
    } elseif ($segments[0] === 'forums' && isset($segments[1]) && is_numeric($segments[1]) && ($segments[2] ?? '') === 'topics' && $method === 'GET') {
        (new ForumController())->getTopics($request, (int)$segments[1]);
    } elseif ($segments[0] === 'forums' && ($segments[1] ?? '') === 'topics' && isset($segments[2]) && is_numeric($segments[2]) && $method === 'GET') {
        (new ForumController())->getTopicMessages($request, (int)$segments[2]);
    } elseif ($path === 'forums/posts' && $method === 'POST') {
        (new ForumController())->postMessage($request);
    }

    // Contenus / Aide / Règlement
    elseif ($path === 'content/rules' && $method === 'GET') {
        (new ContentController())->getRules($request);
    } elseif ($path === 'content/help' && $method === 'GET') {
        (new ContentController())->getHelp($request);
    } elseif ($path === 'content/faq' && $method === 'GET') {
        (new ContentController())->getFaq($request);
    } elseif ($path === 'content/contact' && $method === 'POST') {
        (new ContentController())->contact($request);
    }

    // Administration
    elseif ($path === 'admin/dashboard' && $method === 'GET') {
        (new AdminController())->getDashboard($request);
    } elseif ($path === 'admin/players' && $method === 'GET') {
        (new AdminController())->getPlayers($request);
    } elseif ($path === 'admin/jobs/execute-orders' && $method === 'POST') {
        (new AdminController())->executeOrdersJob($request);
    }

    // Administration - Suivi des Cotations & Mises à Jour
    elseif ($path === 'admin/market-sync/overview' && $method === 'GET') {
        (new AdminController())->getMarketSyncOverview($request);
    } elseif ($path === 'admin/market-sync/stocks' && $method === 'GET') {
        (new AdminController())->getMarketSyncStocks($request);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3], $segments[4]) &&
              $segments[0] === 'admin' && $segments[1] === 'market-sync' && $segments[2] === 'stocks' &&
              is_numeric($segments[3]) && $segments[4] === 'toggle-track' && $method === 'POST') {
        (new AdminController())->toggleStockTracking($request, (int)$segments[3]);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3], $segments[4]) &&
              $segments[0] === 'admin' && $segments[1] === 'market-sync' && $segments[2] === 'stocks' &&
              is_numeric($segments[3]) && $segments[4] === 'reset-errors' && $method === 'POST') {
        (new AdminController())->resetStockErrors($request, (int)$segments[3]);
    } elseif ($path === 'admin/market-sync/reset-all-errors' && $method === 'POST') {
        (new AdminController())->resetAllStockErrors($request);
    } elseif ($path === 'admin/market-sync/force-sync' && $method === 'POST') {
        (new AdminController())->forceMarketSync($request);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3], $segments[4]) &&
              $segments[0] === 'admin' && $segments[1] === 'market-sync' && $segments[2] === 'stocks' &&
              is_numeric($segments[3]) && $segments[4] === 'force-sync' && $method === 'POST') {
        (new AdminController())->forceStockSync($request, (int)$segments[3]);
    }

    // Administration - Catalogue & Gestion des Actions
    elseif ($path === 'admin/stocks' && $method === 'GET') {
        (new AdminController())->getStocks($request);
    } elseif ($path === 'admin/stocks' && $method === 'POST') {
        (new AdminController())->createStock($request);
    } elseif ($path === 'admin/stocks/metadata' && $method === 'GET') {
        (new AdminController())->getStockMetadata($request);
    } elseif ($path === 'admin/stocks/split' && $method === 'POST') {
        (new AdminController())->splitStock($request);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'stocks' &&
              is_numeric($segments[2]) && $segments[3] === 'toggle-buy' && $method === 'POST') {
        (new AdminController())->toggleStockAuthBuy($request, (int)$segments[2]);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'stocks' &&
              is_numeric($segments[2]) && $segments[3] === 'archive' && $method === 'POST') {
        (new AdminController())->archiveStock($request, (int)$segments[2]);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'stocks' &&
              is_numeric($segments[2]) && $segments[3] === 'unarchive' && $method === 'POST') {
        (new AdminController())->unarchiveStock($request, (int)$segments[2]);
    } elseif ($path === 'admin/stocks/archive-bulk' && $method === 'POST') {
        (new AdminController())->archiveBulkStocks($request);
    } elseif ($path === 'admin/stocks/delete-bulk' && $method === 'POST') {
        (new AdminController())->deleteBulkStocks($request);
    } elseif (isset($segments[0], $segments[1], $segments[2]) &&
              !isset($segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'stocks' &&
              is_numeric($segments[2]) && ($method === 'PUT' || $method === 'POST')) {
        (new AdminController())->updateStock($request, (int)$segments[2]);
    } elseif (isset($segments[0], $segments[1], $segments[2]) &&
              !isset($segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'stocks' &&
              is_numeric($segments[2]) && $method === 'DELETE') {
        (new AdminController())->deleteStock($request, (int)$segments[2]);
    }

    // Administration - Découverte & Indices Yahoo Finance
    elseif ($path === 'admin/yahoo/discover' && $method === 'GET') {
        (new AdminController())->discoverYahooMarket($request);
    } elseif (isset($segments[0], $segments[1], $segments[2]) &&
              $segments[0] === 'admin' && $segments[1] === 'yahoo' && $segments[2] === 'index' &&
              isset($segments[3]) && $method === 'GET') {
        (new AdminController())->getYahooIndex($request, $segments[3]);
    } elseif (isset($segments[0], $segments[1], $segments[2]) &&
              $segments[0] === 'admin' && $segments[1] === 'yahoo' && $segments[2] === 'sync-index' &&
              isset($segments[3]) && $method === 'POST') {
        (new AdminController())->syncYahooIndex($request, $segments[3]);
    } elseif ($path === 'admin/yahoo/import' && $method === 'POST') {
        (new AdminController())->importYahooStocks($request);
    }

    // Administration - Forum

    elseif ($path === 'admin/forum/sections' && $method === 'GET') {
        (new AdminController())->getForumSections($request);
    } elseif ($path === 'admin/forum/sections' && $method === 'POST') {
        (new AdminController())->createForumSection($request);
    } elseif ($path === 'admin/forum/forums' && $method === 'GET') {
        (new AdminController())->getForumForums($request);
    } elseif ($path === 'admin/forum/forums' && $method === 'POST') {
        (new AdminController())->createForum($request);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3], $segments[4]) &&
              $segments[0] === 'admin' && $segments[1] === 'forum' && $segments[2] === 'forums' &&
              is_numeric($segments[3]) && $segments[4] === 'sync' && $method === 'POST') {
        (new AdminController())->syncForum($request, (int)$segments[3]);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'forum' && $segments[2] === 'forums' &&
              is_numeric($segments[3]) && ($method === 'PUT' || $method === 'POST')) {
        (new AdminController())->updateForum($request, (int)$segments[3]);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'forum' && $segments[2] === 'forums' &&
              is_numeric($segments[3]) && $method === 'DELETE') {
        (new AdminController())->deleteForum($request, (int)$segments[3]);
    } elseif ($path === 'admin/forum/topics' && $method === 'GET') {
        (new AdminController())->getForumTopics($request);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'forum' && $segments[2] === 'topics' &&
              is_numeric($segments[3]) && ($method === 'PUT' || $method === 'POST')) {
        (new AdminController())->updateTopic($request, (int)$segments[3]);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'forum' && $segments[2] === 'topics' &&
              is_numeric($segments[3]) && $method === 'DELETE') {
        (new AdminController())->deleteTopic($request, (int)$segments[3]);
    } elseif ($path === 'admin/forum/messages' && $method === 'GET') {
        (new AdminController())->getForumMessages($request);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'forum' && $segments[2] === 'messages' &&
              is_numeric($segments[3]) && ($method === 'PUT' || $method === 'POST')) {
        (new AdminController())->updateForumMessage($request, (int)$segments[3]);
    } elseif (isset($segments[0], $segments[1], $segments[2], $segments[3]) &&
              $segments[0] === 'admin' && $segments[1] === 'forum' && $segments[2] === 'messages' &&
              is_numeric($segments[3]) && $method === 'DELETE') {
        (new AdminController())->deleteForumMessage($request, (int)$segments[3]);
    }

    // Route inconnue
    else {
        ApiResponse::error("Endpoint introuvable: [$method] $path", 404);
    }

} catch (\Throwable $e) {
    error_log("API Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    ApiResponse::error("Erreur interne du serveur.", 500);
}
