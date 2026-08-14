<?php
require __DIR__ . '/vendor/autoload.php';

use Necmicolak\YahooFinance\YahooFinance;

$yahoo = new YahooFinance();
$data = $yahoo->info("AAPL");
print_r($data);
