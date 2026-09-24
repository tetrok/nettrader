<?php

require_once __DIR__ . '/../autoload.php';
require_once __DIR__ . '/../const.php';

use NetTrader\Database\Database;

/**
 * Seeder pour générer l'historique des cotations boursières en base de données.
 */
function seedStockHistory(bool $force = false): void
{
    $pdo = Database::getConnection();
    
    // Vérifier si la table stock_history contient déjà des enregistrements
    $checkStmt = $pdo->query("SELECT COUNT(*) as cnt FROM stock_history");
    $count = (int)($checkStmt->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);
    
    if ($count > 0 && !$force) {
        echo "[INFO] stock_history contient déjà $count enregistrements. Utilisez --force pour réinitialiser.\n";
        return;
    }
    
    if ($force && $count > 0) {
        echo "[INFO] Purge de la table stock_history...\n";
        $pdo->exec("TRUNCATE TABLE stock_history");
    }

    // Récupérer toutes les actions suivies ou ayant une valeur positive
    $sql = "SELECT c.codesico, c.yahooname, c.nom, c.valeur, c.lasttime,
                   COALESCE(m.valeur, c.valeur) as prev_valeur
            FROM cacval c
            LEFT JOIN cacvalmaj m ON (c.codesico = m.codesico)
            WHERE c.down = '1' OR c.valeur > 0
            ORDER BY c.codesico ASC";
    $stocks = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    echo "[INFO] Démarrage du peuplement pour " . count($stocks) . " actions...\n";

    $now = time();
    $insertStmt = $pdo->prepare("INSERT INTO stock_history (codesico, temps, valeur) VALUES (?, ?, ?)");

    $pdo->beginTransaction();
    $totalInserted = 0;

    foreach ($stocks as $stock) {
        $code = (int)$stock['codesico'];
        $currentPrice = (float)$stock['valeur'];
        if ($currentPrice <= 0) {
            $currentPrice = 50.0;
        }
        $prevPrice = (float)$stock['prev_valeur'];
        if ($prevPrice <= 0) {
            $prevPrice = $currentPrice;
        }

        // Graine pseudo-aléatoire reproductible par code action
        mt_srand($code + 2026);

        // 1. Liste des timestamps à générer :
        // - Année : 1 point par jour entre J-365 et J-31 (~235 points)
        // - Mois : 1 point par jour entre J-30 et J-8 (~22 points)
        // - Semaine : 4 points par jour entre J-7 et J-2 (~24 points)
        // - Jour : 24 points sur les dernières 24h (toutes les heures ou 30 min)
        $timestamps = [];

        // Année & Mois (J-365 à J-8)
        for ($d = 365; $d >= 8; $d--) {
            // Exclure les week-ends
            $dayOfWeek = (int)date('w', $now - ($d * 86400));
            if ($dayOfWeek === 0 || $dayOfWeek === 6) {
                continue;
            }
            // Clôture à 17h30
            $t = strtotime(date('Y-m-d 17:30:00', $now - ($d * 86400)));
            $timestamps[] = $t;
        }

        // Semaine (J-7 à J-2) : 4 points par jour ouvré
        for ($d = 7; $d >= 2; $d--) {
            $dayOfWeek = (int)date('w', $now - ($d * 86400));
            if ($dayOfWeek === 0 || $dayOfWeek === 6) {
                continue;
            }
            foreach (['09:30:00', '12:00:00', '14:30:00', '17:30:00'] as $hour) {
                $t = strtotime(date("Y-m-d $hour", $now - ($d * 86400)));
                $timestamps[] = $t;
            }
        }

        // Dernières 24 heures (Jour) : points réguliers
        $dayStart = $now - 86400;
        for ($step = 1; $step <= 24; $step++) {
            $t = $dayStart + ($step * 3600);
            if ($t < $now) {
                $timestamps[] = $t;
            }
        }
        // Timestamp actuel
        $timestamps[] = $now;

        // Dédupliquer et trier
        $timestamps = array_unique($timestamps);
        sort($timestamps);

        // 2. Génération de la courbe en marche aléatoire rétrograde ancrée sur $currentPrice
        $pointCount = count($timestamps);
        $prices = array_fill(0, $pointCount, $currentPrice);

        // On part de la fin vers le début pour que le dernier point soit exactement $currentPrice
        $currentWalk = $currentPrice;
        for ($i = $pointCount - 2; $i >= 0; $i--) {
            $dtHours = max(1, ($timestamps[$i + 1] - $timestamps[$i]) / 3600);
            // Volatilité adaptée à l'intervalle de temps
            $volatility = 0.004 * sqrt($dtHours);
            $shock = (mt_rand(-1000, 1000) / 1000.0) * $volatility;
            
            // Si on est à l'avant-dernier point (la veille), on tend vers $prevPrice
            if ($i === $pointCount - 2) {
                $currentWalk = $prevPrice;
            } else {
                $currentWalk = $currentWalk / (1 + $shock);
            }
            
            // Garder des prix cohérents et strictement positifs
            if ($currentWalk < 1.0) {
                $currentWalk = 1.0 + (mt_rand(1, 100) / 100.0);
            }
            $prices[$i] = round($currentWalk, 4);
        }

        // Enregistrer les points
        for ($i = 0; $i < $pointCount; $i++) {
            $insertStmt->execute([$code, $timestamps[$i], $prices[$i]]);
            $totalInserted++;
        }
    }

    $pdo->commit();
    echo "[SUCCÈS] $totalInserted points d'historique insérés avec succès dans stock_history.\n";
}

$force = in_array('--force', $argv ?? []);
seedStockHistory($force);
