<?php

namespace NetTrader\Service;

/**
 * Service d'interaction avec Yahoo Finance pour la découverte, le screener et les cotations.
 */
class YahooFinanceService
{
    private string $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    private static ?string $cachedCookie = null;
    private static ?string $cachedCrumb = null;
    private static int $cacheExpiry = 0;



    /**
     * Obtient un tuple [cookie, crumb] pour les appels à l'API Yahoo Screener.
     */
    public function getSessionCookieAndCrumb(): ?array
    {
        if (self::$cachedCookie && self::$cachedCrumb && time() < self::$cacheExpiry) {
            return ['cookie' => self::$cachedCookie, 'crumb' => self::$cachedCrumb];
        }

        // 1. Récupération du cookie sur fc.yahoo.com
        $ch = curl_init("https://fc.yahoo.com");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, $this->userAgent);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $res = curl_exec($ch);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        curl_close($ch);

        if (!$res) {
            return null;
        }

        $headers = substr($res, 0, $headerSize);
        preg_match_all("/^Set-Cookie:\s*([^;]*)/mi", $headers, $matches);
        if (empty($matches[1])) {
            return null;
        }
        $cookie = implode("; ", $matches[1]);

        // 2. Récupération du crumb sur /v1/test/getcrumb
        $ch = curl_init("https://query1.finance.yahoo.com/v1/test/getcrumb");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, $this->userAgent);
        curl_setopt($ch, CURLOPT_COOKIE, $cookie);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $crumb = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || empty($crumb) || str_contains($crumb, '<html')) {
            return null;
        }

        self::$cachedCookie = $cookie;
        self::$cachedCrumb = trim($crumb);
        self::$cacheExpiry = time() + 3600; // Valide 1 heure

        return ['cookie' => self::$cachedCookie, 'crumb' => self::$cachedCrumb];
    }

    /**
     * Récupère le cours et les métadonnées pour un symbole donné via l'API chart Yahoo.
     */
    public function getQuote(string $ticker): ?array
    {
        $ticker = trim($ticker);
        if (empty($ticker)) {
            return null;
        }

        $url = "https://query1.finance.yahoo.com/v8/finance/chart/" . urlencode($ticker) . "?interval=1d&range=1d";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, $this->userAgent);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$res) {
            return null;
        }

        $data = json_decode($res, true);
        $meta = $data['chart']['result'][0]['meta'] ?? null;
        if (!$meta) {
            return null;
        }

        $price = (float)($meta['regularMarketPrice'] ?? 0.0);
        $instrumentType = strtoupper((string)($meta['instrumentType'] ?? ''));

        // Rejeter formellement toute valeur sans cotation active ou instrument parasite
        if ($price <= 0.0 || ($instrumentType !== '' && $instrumentType !== 'EQUITY')) {
            return null;
        }

        $name = !empty($meta['shortName']) ? (string)$meta['shortName'] : (!empty($meta['longName']) ? (string)$meta['longName'] : (string)($meta['symbol'] ?? $ticker));

        return [
            'symbol' => (string)($meta['symbol'] ?? $ticker),
            'name' => $name,
            'price' => $price,
            'currency' => (string)($meta['currency'] ?? 'EUR'),
            'exchange' => (string)($meta['exchangeName'] ?? 'PAR'),
            'timezone' => (string)($meta['exchangeTimezoneName'] ?? 'Europe/Paris'),
        ];
    }

    /**
     * Récupère en lot (batch) les cotations pour une liste de symboles via l'API quote de Yahoo Finance.
     * En cas de symbole manquant ou non renvoyé en lot, bascule automatiquement sur un repli unitaire (fallback).
     *
     * @param string[] $tickers Liste des symboles (ex: ['MC.PA', 'AI.PA'])
     * @return array<string, array{symbol: string, name: string, price: float, currency: string, time: int, retried: bool}>
     */
    public function getQuotes(array $tickers): array
    {
        $cleanTickers = [];
        foreach ($tickers as $t) {
            $trimmed = trim((string)$t);
            if (!empty($trimmed)) {
                $cleanTickers[] = $trimmed;
            }
        }
        $cleanTickers = array_values(array_unique($cleanTickers));
        if (empty($cleanTickers)) {
            return [];
        }

        $session = $this->getSessionCookieAndCrumb();
        $quotes = [];

        // Traitement par lots de 50 symboles pour optimiser et éviter toute troncature d'URL
        $chunks = array_chunk($cleanTickers, 50);

        foreach ($chunks as $chunk) {
            $batchSymbols = implode(',', $chunk);
            $url = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" . urlencode($batchSymbols);
            if ($session && !empty($session['crumb'])) {
                $url .= "&crumb=" . urlencode($session['crumb']);
            }

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERAGENT, $this->userAgent);
            if ($session && !empty($session['cookie'])) {
                curl_setopt($ch, CURLOPT_COOKIE, $session['cookie']);
            }
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $res) {
                $data = json_decode($res, true);
                $results = $data['quoteResponse']['result'] ?? [];
                foreach ($results as $item) {
                    $sym = (string)($item['symbol'] ?? '');
                    $price = (float)($item['regularMarketPrice'] ?? 0.0);
                    $time = (int)($item['regularMarketTime'] ?? time());
                    $name = !empty($item['shortName']) ? (string)$item['shortName'] : (!empty($item['longName']) ? (string)$item['longName'] : $sym);
                    if ($sym !== '' && $price > 0) {
                        $quotes[$sym] = [
                            'symbol' => $sym,
                            'name' => $name,
                            'price' => $price,
                            'currency' => (string)($item['currency'] ?? 'EUR'),
                            'time' => $time,
                            'retried' => false,
                        ];
                    }
                }
            }

            // Pour chaque ticker du lot qui n'a pas été renvoyé, tentative de repli (retry unitaire via chart API)
            foreach ($chunk as $t) {
                if (!isset($quotes[$t])) {
                    $single = $this->getQuote($t);
                    if ($single && ($single['price'] ?? 0) > 0) {
                        $quotes[$t] = [
                            'symbol' => $t,
                            'name' => (string)($single['name'] ?? $t),
                            'price' => (float)$single['price'],
                            'currency' => (string)($single['currency'] ?? 'EUR'),
                            'time' => time(),
                            'retried' => true,
                        ];
                    }
                }
            }
        }

        return $quotes;
    }

    /**
     * Recherche de symboles via l'API Search Yahoo.
     */
    public function search(string $query, int $limit = 15): array
    {
        $query = trim($query);
        if (empty($query)) {
            return [];
        }

        $url = "https://query1.finance.yahoo.com/v1/finance/search?" . http_build_query([
            'q' => $query,
            'quotesCount' => $limit,
            'newsCount' => 0,
            'enableFuzzyQuery' => false,
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, $this->userAgent);
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $res = curl_exec($ch);
        curl_close($ch);

        if (!$res) {
            return [];
        }

        $data = json_decode($res, true);
        $rawQuotes = $data['quotes'] ?? [];
        $results = [];

        foreach ($rawQuotes as $q) {
            if (($q['quoteType'] ?? '') !== 'EQUITY') {
                continue;
            }
            $symbol = (string)($q['symbol'] ?? '');
            if (empty($symbol)) {
                continue;
            }

            $results[] = [
                'symbol' => $symbol,
                'name' => (string)($q['shortname'] ?? $q['longname'] ?? $symbol),
                'exchange' => (string)($q['exchange'] ?? ''),
                'sector' => (string)($q['sector'] ?? ''),
                'industry' => (string)($q['industry'] ?? ''),
                'isParis' => str_ends_with($symbol, '.PA') || ($q['exchange'] ?? '') === 'PAR',
            ];
        }

        return $results;
    }

    /**
     * Interroge le Screener Yahoo pour récupérer la liste des actions d'Euronext Paris.
     */
    public function screenParisEquities(int $limit = 50, int $offset = 0, string $search = ''): array
    {
        // Si recherche par mot-clé, utiliser l'API Search pour des résultats immédiats et pertinents
        if (!empty($search)) {
            $searchResults = $this->search($search, $limit);
            $items = [];
            foreach ($searchResults as $sr) {
                $quote = $this->getQuote($sr['symbol']);
                if ($quote) {
                    $items[] = [
                        'symbol' => $sr['symbol'],
                        'name' => $sr['name'],
                        'price' => (float)$quote['price'],
                        'currency' => (string)$quote['currency'],
                        'marketCap' => 0.0,
                        'volume' => 0,
                        'exchange' => (string)($sr['exchange'] ?: 'PAR'),
                    ];
                }
            }
            return [
                'total' => count($items),
                'items' => $items,
            ];
        }

        $session = $this->getSessionCookieAndCrumb();
        if (!$session) {
            return ['total' => 0, 'items' => [], 'error' => 'Impossible d\'obtenir la session Yahoo (cookie/crumb).'];
        }

        $url = "https://query1.finance.yahoo.com/v1/finance/screener?crumb=" . urlencode($session['crumb']);

        $operands = [
            ["operator" => "eq", "operands" => ["exchange", "PAR"]],
            ["operator" => "eq", "operands" => ["quoteType", "EQUITY"]],
            ["operator" => "gt", "operands" => ["intradaymarketcap", 1000000]], // Filtre les obligations et coquilles vides
        ];

        // Demander un buffer suffisant pour combler les éventuels symboles obligataires filtrés
        $fetchSize = min(max($limit + 30, 25), 250);

        $queryPayload = [
            "size" => $fetchSize,
            "offset" => $offset,
            "sortField" => "intradaymarketcap",
            "sortType" => "DESC",
            "quoteType" => "EQUITY",
            "query" => [
                "operator" => "AND",
                "operands" => $operands,
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($queryPayload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
        curl_setopt($ch, CURLOPT_COOKIE, $session['cookie']);
        curl_setopt($ch, CURLOPT_USERAGENT, $this->userAgent);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$res) {
            return ['total' => 0, 'items' => [], 'error' => "Erreur HTTP Screener: $httpCode"];
        }

        $data = json_decode($res, true);
        $result = $data['finance']['result'][0] ?? [];
        $total = (int)($result['total'] ?? 0);
        $quotes = $result['quotes'] ?? [];

        $items = [];
        foreach ($quotes as $q) {
            $symbol = (string)($q['symbol'] ?? '');
            if (empty($symbol)) {
                continue;
            }

            // Exclure les obligations qui s'immiscent parfois (symboles CASA..., OAT, etc.)
            if (str_starts_with($symbol, 'ACAL') || str_starts_with($symbol, 'FR00')) {
                continue;
            }

            $items[] = [
                'symbol' => $symbol,
                'name' => (string)($q['shortName'] ?? $q['longName'] ?? $symbol),
                'price' => (float)($q['regularMarketPrice'] ?? 0.0),
                'currency' => (string)($q['currency'] ?? 'EUR'),
                'marketCap' => (float)($q['marketCap'] ?? 0.0),
                'volume' => (int)($q['regularMarketVolume'] ?? 0),
                'exchange' => (string)($q['exchange'] ?? 'PAR'),
            ];

            if (count($items) >= $limit) {
                break;
            }
        }

        return [
            'total' => $total,
            'items' => $items,
        ];
    }
}

