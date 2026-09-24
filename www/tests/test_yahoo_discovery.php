<?php

require_once __DIR__ . '/../constbdd.php';
require_once __DIR__ . '/../autoload.php';

use NetTrader\Service\YahooFinanceService;
use NetTrader\Repository\StockRepository;
use NetTrader\Database\Database;

function assertTest(string $desc, bool $condition, string $extra = ''): void {
    if ($condition) {
        echo "  [PASS] $desc\n";
    } else {
        echo "  [FAIL] $desc " . ($extra ? "($extra)" : "") . "\n";
        exit(1);
    }
}

echo "=== DÉBUT DES TESTS YAHOO FINANCE & DISCOVERY ===\n\n";

$service = new YahooFinanceService();
$repo = new StockRepository();

// 1. Test des constituants d'indices prédéfinis
echo "1. Test des constituants d'indices :\n";
$cac40 = $service->getIndexConstituents('cac40');
assertTest("CAC 40 retourne 40 valeurs", count($cac40['constituents']) === 40, "Count: " . count($cac40['constituents']));
assertTest("Le premier symbole CAC 40 est AI.PA", ($cac40['constituents'][0]['symbol'] ?? '') === 'AI.PA');

$sbf120 = $service->getIndexConstituents('sbf120');
assertTest("SBF 120 retourne au moins 80 valeurs", count($sbf120['constituents']) >= 80, "Count: " . count($sbf120['constituents']));

// 2. Test de récupération d'une cotation en direct via chart API
echo "\n2. Test de récupération de cotation Yahoo (MC.PA) :\n";
$quote = $service->getQuote('MC.PA');
assertTest("Quote MC.PA non null", $quote !== null);
assertTest("Symbole MC.PA conforme", ($quote['symbol'] ?? '') === 'MC.PA');
assertTest("Cours MC.PA > 0", ($quote['price'] ?? 0) > 0, "Prix: " . ($quote['price'] ?? 0));
assertTest("Devise EUR", ($quote['currency'] ?? '') === 'EUR');

// 3. Test de session Yahoo et Screener Euronext Paris
echo "\n3. Test Screener Euronext Paris :\n";
$screen = $service->screenParisEquities(10, 0);
assertTest("Screener retourne des éléments", !empty($screen['items']), "Erreur: " . ($screen['error'] ?? 'Aucune'));
assertTest("Total des valeurs disponibles > 50", ($screen['total'] ?? 0) > 50, "Total: " . ($screen['total'] ?? 0));

// 4. Test StockRepository: calcul du code Sicovam libre
echo "\n4. Test StockRepository getNextAvailableSicoCode :\n";
$nextCode = $repo->getNextAvailableSicoCode();
assertTest("Prochain code Sicovam est > 0", $nextCode > 0, "Next: $nextCode");
$existingStock = $repo->findByCode($nextCode);
assertTest("Le code Sicovam proposé n'est pas déjà pris", $existingStock === null);

// 5. Test StockRepository: findExistingTickersMap
echo "\n5. Test findExistingTickersMap :\n";
$map = $repo->findExistingTickersMap(['AI.PA', 'MC.PA', 'TICKER_INEXISTANT_XYZ.PA']);
assertTest("AI.PA est trouvé dans la base", isset($map['AI.PA']));
assertTest("TICKER_INEXISTANT_XYZ.PA n'est pas dans la base", !isset($map['TICKER_INEXISTANT_XYZ.PA']));

// 6. Test StockRepository: bulkImportStocks (simulation insertion puis rollback / nettoyage)
echo "\n6. Test bulkImportStocks avec activation immédiate :\n";
$testTicker = 'TESTYF_' . time() . '.PA';
$importRes = $repo->bulkImportStocks([
    [
        'yahooname' => $testTicker,
        'nom' => 'Test Yahoo Stock',
        'valeur' => 42.50,
        'authachat' => '1',
        'down' => '1',
    ]
]);
assertTest("bulkImportStocks signale un succès", $importRes['success'] === true);
assertTest("1 action créée", $importRes['created'] === 1);

// Vérifier l'insertion effective en base
$inserted = $repo->findByTicker($testTicker);
assertTest("L'action de test a été insérée", $inserted !== null);
assertTest("down='1' (activée)", $inserted->down === '1');
assertTest("authachat='1' (achetable)", $inserted->authachat === '1');
assertTest("valeur initiale = 42.5", abs((float)$inserted->valeur - 42.5) < 0.001);

// Nettoyage de l'action de test
Database::getConnection()->prepare("DELETE FROM cacval WHERE yahooname = ?")->execute([$testTicker]);
$cleaned = $repo->findByTicker($testTicker);
assertTest("Nettoyage de l'action de test réussi", $cleaned === null);

echo "\n=== TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS ! ===\n";
