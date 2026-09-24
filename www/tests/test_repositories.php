<?php

require_once __DIR__ . '/../autoload.php';
require_once __DIR__ . '/../const.php';
require_once __DIR__ . '/../constbdd.php';
require_once __DIR__ . '/../db_connect.php';

use NetTrader\Repository\StockRepository;
use NetTrader\Repository\UserRepository;
use NetTrader\Repository\OrderRepository;
use NetTrader\Repository\PortfolioRepository;
use NetTrader\Repository\ForumRepository;

$passed = 0;
$failed = 0;

function assertRepo(string $name, bool $condition, string $detail = '') {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] $name\n";
        $passed++;
    } else {
        echo "  [FAIL] $name - Detail: $detail\n";
        $failed++;
    }
}

echo "\n=== DEMARRAGE DES TESTS UNITAIRES DE LA COUCHE REPOSITORIES (DAL) ===\n\n";

// 1. StockRepository
echo "1. Tests StockRepository :\n";
$stockRepo = new StockRepository();
$totalStocks = $stockRepo->countTotal();
assertRepo("StockRepository::countTotal() > 0", $totalStocks > 0, "Total: $totalStocks");

$trackedStocks = $stockRepo->countTracked();
assertRepo("StockRepository::countTracked() > 0", $trackedStocks > 0, "Tracked: $trackedStocks");

$stockByTicker = $stockRepo->findByTicker('AI.PA');
assertRepo("StockRepository::findByTicker('AI.PA') retourne une action valide", $stockByTicker !== null && $stockByTicker->yahooname === 'AI.PA', "Nom: " . ($stockByTicker->nom ?? 'N/A'));

$stockByCode = $stockRepo->findByCode(12007);
assertRepo("StockRepository::findByCode(12007) retourne l'action Air Liquide", $stockByCode !== null && strpos($stockByCode->nom, 'AIR LIQUIDE') !== false, "Nom: " . ($stockByCode->nom ?? 'N/A'));

$syncOverview = $stockRepo->getMarketSyncOverview();
assertRepo("StockRepository::getMarketSyncOverview() retourne overview et recentLogs", isset($syncOverview['overview'], $syncOverview['recentLogs']) && is_array($syncOverview['recentLogs']), "Keys: " . implode(', ', array_keys($syncOverview)));

$history1d = $stockRepo->getStockHistory(12040, '1d');
assertRepo("StockRepository::getStockHistory(12040, '1d') retourne des points chronologiques", count($history1d) > 0 && isset($history1d[0]['time']) && isset($history1d[0]['price']), "Count: " . count($history1d));

$history1w = $stockRepo->getStockHistory(12040, '1w');
assertRepo("StockRepository::getStockHistory(12040, '1w') retourne plus de points que 1d", count($history1w) >= count($history1d), "Count 1w: " . count($history1w) . ", 1d: " . count($history1d));

$history1m = $stockRepo->getStockHistory(12040, '1m');
assertRepo("StockRepository::getStockHistory(12040, '1m') retourne des points", count($history1m) > 0, "Count: " . count($history1m));

$history1y = $stockRepo->getStockHistory(12040, '1y');
assertRepo("StockRepository::getStockHistory(12040, '1y') retourne l'historique annuel ordonné", count($history1y) > 0 && $history1y[0]['time'] < $history1y[count($history1y) - 1]['time'], "Count: " . count($history1y));

$syncStocks = $stockRepo->getMarketSyncStocks(['status' => 'all'], 5);
assertRepo("StockRepository::getMarketSyncStocks() retourne les données enrichies", count($syncStocks) > 0 && isset($syncStocks[0]['ticker'], $syncStocks[0]['lastStatus']), "Count: " . count($syncStocks));


// 2. UserRepository
echo "\n2. Tests UserRepository :\n";
$userRepo = new UserRepository();
$adminUser = $userRepo->findById(1);
assertRepo("UserRepository::findById(1) retourne le compte administrateur", $adminUser !== null && (int)$adminUser->idcompte === 1, "Pseudo: " . ($adminUser->pseudonyme ?? 'N/A'));

$userByPseudo = $userRepo->findByPseudo('Administrateur');
assertRepo("UserRepository::findByPseudo('Administrateur') retourne l'utilisateur", $userByPseudo !== null && (int)$userByPseudo->idcompte === 1, "ID: " . ($userByPseudo->idcompte ?? 'N/A'));

$totalPlayers = $userRepo->countTotalPlayers();
assertRepo("UserRepository::countTotalPlayers() > 0", $totalPlayers > 0, "Total: $totalPlayers");

$activeSessions = $userRepo->countActiveSessions();
assertRepo("UserRepository::countActiveSessions() retourne un entier >= 0", $activeSessions >= 0, "Active: $activeSessions");

$leaderboard = $userRepo->getLeaderboard(5);
assertRepo("UserRepository::getLeaderboard() retourne les meilleurs joueurs", count($leaderboard) > 0 && isset($leaderboard[0]->total_capital), "Count: " . count($leaderboard));


// 3. OrderRepository
echo "\n3. Tests OrderRepository :\n";
$orderRepo = new OrderRepository();
$pendingOrdersCount = $orderRepo->countPendingOrders();
assertRepo("OrderRepository::countPendingOrders() retourne un entier >= 0", $pendingOrdersCount >= 0, "Count: $pendingOrdersCount");

$userOrders = $orderRepo->getPendingOrdersByAccount(2);
assertRepo("OrderRepository::getPendingOrdersByAccount(2) retourne un tableau", is_array($userOrders), "Type: " . gettype($userOrders));

// Test création et annulation d'un ordre
$testOrderId = $orderRepo->createOrder(2, 12005, 'achat', 1, null, 0, 100.0, 200.0);
assertRepo("OrderRepository::createOrder() insère et retourne un ID valide", $testOrderId > 0, "ID: $testOrderId");

$fetchedOrder = $orderRepo->findById($testOrderId);
assertRepo("OrderRepository::findById() retrouve l'ordre nouvellement créé", $fetchedOrder !== null && (int)$fetchedOrder->idordre === $testOrderId, "Fetched ID: " . ($fetchedOrder->idordre ?? 'N/A'));

$cancelled = $orderRepo->cancelOrder($testOrderId, 2);
assertRepo("OrderRepository::cancelOrder() supprime l'ordre de test", $cancelled === true);

$afterCancel = $orderRepo->findById($testOrderId);
assertRepo("OrderRepository::findById() confirme la suppression", $afterCancel === null);


// 4. PortfolioRepository
echo "\n4. Tests PortfolioRepository :\n";
$portfolioRepo = new PortfolioRepository();
$positions = $portfolioRepo->getPositions(2);
assertRepo("PortfolioRepository::getPositions(2) retourne un tableau de positions", is_array($positions), "Count: " . count($positions));

$history = $portfolioRepo->getHistory(2, 5);
assertRepo("PortfolioRepository::getHistory(2) retourne l'historique financier", is_array($history), "Count: " . count($history));

// Test ajout, modification et suppression de position
$portfolioRepo->addPosition(2, 12005, 10, 150.0);
$pos = $portfolioRepo->getPosition(2, 12005);
assertRepo("PortfolioRepository::addPosition() insère la position de test", $pos !== null && (int)$pos->nombsicav === 10, "Quant: " . ($pos->nombsicav ?? 'N/A'));

$portfolioRepo->updatePosition(2, 12005, 15, 155.0);
$posUpdated = $portfolioRepo->getPosition(2, 12005);
assertRepo("PortfolioRepository::updatePosition() met à jour la position", $posUpdated !== null && (int)$posUpdated->nombsicav === 15, "Quant: " . ($posUpdated->nombsicav ?? 'N/A'));

$portfolioRepo->deletePosition(2, 12005);
$posDeleted = $portfolioRepo->getPosition(2, 12005);
assertRepo("PortfolioRepository::deletePosition() supprime la position", $posDeleted === null);


// 5. ForumRepository
echo "\n5. Tests ForumRepository :\n";
$forumRepo = new ForumRepository();
$sections = $forumRepo->getSections();
assertRepo("ForumRepository::getSections() retourne les sections", count($sections) > 0, "Count: " . count($sections));

$forums = $forumRepo->getForums();
assertRepo("ForumRepository::getForums() retourne les rubriques", count($forums) > 0, "Count: " . count($forums));

// Création d'un sujet et d'un message de test
$firstForumId = (int)$forums[0]->idforum;
$testTopicId = $forumRepo->createTopic($firstForumId, 1, 'Sujet Test DAL ' . time(), 'Contenu test');
assertRepo("ForumRepository::createTopic() crée un sujet et retourne un ID", $testTopicId > 0, "ID: $testTopicId");

$fetchedTopic = $forumRepo->getTopicById($testTopicId);
assertRepo("ForumRepository::getTopicById() retrouve le sujet", $fetchedTopic !== null && (int)$fetchedTopic->idsujet === $testTopicId);

$testMessageId = $forumRepo->postMessage($testTopicId, 1, 'Deuxieme message test');
assertRepo("ForumRepository::postMessage() ajoute une réponse", $testMessageId > 0, "Msg ID: $testMessageId");

$messages = $forumRepo->getMessages($testTopicId);
assertRepo("ForumRepository::getMessages() liste les messages du sujet", count($messages) === 2, "Count: " . count($messages));

$deletedTopic = $forumRepo->deleteTopic($testTopicId);
assertRepo("ForumRepository::deleteTopic() supprime le sujet et ses messages", $deletedTopic === true);


echo "\n=== BILAN DES TESTS REPOSITORIES ===\n";
echo "Total : " . ($passed + $failed) . " tests\n";
echo "Réussis : $passed\n";
echo "Échoués : $failed\n\n";

if ($failed > 0) {
    exit(1);
}
