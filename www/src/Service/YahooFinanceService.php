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
     * Composants officiels du CAC 40 (Euronext Paris).
     */
    public const CAC40_CONSTITUENTS = [
        ['symbol' => 'AI.PA', 'name' => 'Air Liquide'],
        ['symbol' => 'AIR.PA', 'name' => 'Airbus'],
        ['symbol' => 'ALO.PA', 'name' => 'Alstom'],
        ['symbol' => 'MT.PA', 'name' => 'ArcelorMittal'],
        ['symbol' => 'CS.PA', 'name' => 'AXA'],
        ['symbol' => 'BNP.PA', 'name' => 'BNP Paribas'],
        ['symbol' => 'EN.PA', 'name' => 'Bouygues'],
        ['symbol' => 'CAP.PA', 'name' => 'Capgemini'],
        ['symbol' => 'CA.PA', 'name' => 'Carrefour'],
        ['symbol' => 'ACA.PA', 'name' => 'Crédit Agricole'],
        ['symbol' => 'BN.PA', 'name' => 'Danone'],
        ['symbol' => 'DSY.PA', 'name' => 'Dassault Systèmes'],
        ['symbol' => 'EDEN.PA', 'name' => 'Edenred'],
        ['symbol' => 'ENGI.PA', 'name' => 'Engie'],
        ['symbol' => 'EL.PA', 'name' => 'EssilorLuxottica'],
        ['symbol' => 'ERF.PA', 'name' => 'Eurofins Scientific'],
        ['symbol' => 'RMS.PA', 'name' => 'Hermès International'],
        ['symbol' => 'KER.PA', 'name' => 'Kering'],
        ['symbol' => 'OR.PA', 'name' => "L'Oréal"],
        ['symbol' => 'LR.PA', 'name' => 'Legrand'],
        ['symbol' => 'MC.PA', 'name' => 'LVMH'],
        ['symbol' => 'ML.PA', 'name' => 'Michelin'],
        ['symbol' => 'ORA.PA', 'name' => 'Orange'],
        ['symbol' => 'RI.PA', 'name' => 'Pernod Ricard'],
        ['symbol' => 'PUB.PA', 'name' => 'Publicis Groupe'],
        ['symbol' => 'RNO.PA', 'name' => 'Renault'],
        ['symbol' => 'SAF.PA', 'name' => 'Safran'],
        ['symbol' => 'SGO.PA', 'name' => 'Saint-Gobain'],
        ['symbol' => 'SAN.PA', 'name' => 'Sanofi'],
        ['symbol' => 'SU.PA', 'name' => 'Schneider Electric'],
        ['symbol' => 'GLE.PA', 'name' => 'Société Générale'],
        ['symbol' => 'STLAP.PA', 'name' => 'Stellantis'],
        ['symbol' => 'STMPA.PA', 'name' => 'STMicroelectronics'],
        ['symbol' => 'TEP.PA', 'name' => 'Teleperformance'],
        ['symbol' => 'HO.PA', 'name' => 'Thales'],
        ['symbol' => 'TTE.PA', 'name' => 'TotalEnergies'],
        ['symbol' => 'URW.PA', 'name' => 'Unibail-Rodamco-Westfield'],
        ['symbol' => 'VIE.PA', 'name' => 'Veolia'],
        ['symbol' => 'DG.PA', 'name' => 'Vinci'],
        ['symbol' => 'WLN.PA', 'name' => 'Worldline'],
    ];

    /**
     * Composants complémentaires de l'indice SBF 120 (CAC Next 20 & CAC Mid 60).
     */
    public const SBF120_EXTRA_CONSTITUENTS = [
        ['symbol' => 'ADP.PA', 'name' => 'Aéroports de Paris'],
        ['symbol' => 'AKE.PA', 'name' => 'Arkema'],
        ['symbol' => 'AMUN.PA', 'name' => 'Amundi'],
        ['symbol' => 'ATE.PA', 'name' => 'Alten'],
        ['symbol' => 'ATO.PA', 'name' => 'Atos'],
        ['symbol' => 'BB.PA', 'name' => 'BIC'],
        ['symbol' => 'BIM.PA', 'name' => 'bioMérieux'],
        ['symbol' => 'BOL.PA', 'name' => 'Bolloré'],
        ['symbol' => 'BVI.PA', 'name' => 'Bureau Veritas'],
        ['symbol' => 'CARM.PA', 'name' => 'Carmila'],
        ['symbol' => 'COFA.PA', 'name' => 'Coface'],
        ['symbol' => 'COV.PA', 'name' => 'Covivio'],
        ['symbol' => 'DBG.PA', 'name' => 'Derichebourg'],
        ['symbol' => 'ELIS.PA', 'name' => 'Elis'],
        ['symbol' => 'ENX.PA', 'name' => 'Euronext'],
        ['symbol' => 'ERA.PA', 'name' => 'Eramet'],
        ['symbol' => 'EUTL.PA', 'name' => 'Eutelsat Communications'],
        ['symbol' => 'FDJ.PA', 'name' => 'La Française des Jeux'],
        ['symbol' => 'FGR.PA', 'name' => 'Eiffage'],
        ['symbol' => 'GFC.PA', 'name' => 'Gecina'],
        ['symbol' => 'GTT.PA', 'name' => 'Gaztransport & Technigaz'],
        ['symbol' => 'ICAD.PA', 'name' => 'Icade'],
        ['symbol' => 'IDIP.PA', 'name' => 'ID Logistics Group'],
        ['symbol' => 'IPN.PA', 'name' => 'Ipsen'],
        ['symbol' => 'IPS.PA', 'name' => 'Ipsos'],
        ['symbol' => 'JCDX.PA', 'name' => 'JCDecaux'],
        ['symbol' => 'KOF.PA', 'name' => 'Kaufman & Broad'],
        ['symbol' => 'MF.PA', 'name' => 'Wendel'],
        ['symbol' => 'MMB.PA', 'name' => 'Lagardère'],
        ['symbol' => 'NEX.PA', 'name' => 'Nexans'],
        ['symbol' => 'NXI.PA', 'name' => 'Nexity'],
        ['symbol' => 'NK.PA', 'name' => 'Imerys'],
        ['symbol' => 'OPM.PA', 'name' => 'OPmobility (Plastic Omnium)'],
        ['symbol' => 'RXL.PA', 'name' => 'Rexel'],
        ['symbol' => 'SCR.PA', 'name' => 'SCOR SE'],
        ['symbol' => 'SEB.PA', 'name' => 'SEB'],
        ['symbol' => 'SESL.PA', 'name' => 'SES-imagotag (VusionGroup)'],
        ['symbol' => 'SO.PA', 'name' => 'Sodexo'],
        ['symbol' => 'SOI.PA', 'name' => 'Soitec'],
        ['symbol' => 'SOP.PA', 'name' => 'Sopra Steria Group'],
        ['symbol' => 'SPIE.PA', 'name' => 'SPIE'],
        ['symbol' => 'TFI.PA', 'name' => 'TF1'],
        ['symbol' => 'UBI.PA', 'name' => 'Ubisoft Entertainment'],
        ['symbol' => 'VAC.PA', 'name' => 'Vallourec'],
        ['symbol' => 'VLLP.PA', 'name' => 'Vicat'],
        ['symbol' => 'VALN.PA', 'name' => 'Valneva'],
        ['symbol' => 'VIRP.PA', 'name' => 'Virbac'],
        ['symbol' => 'VIV.PA', 'name' => 'Vivendi'],
        ['symbol' => 'VRAP.PA', 'name' => 'Verallia'],
        ['symbol' => 'BEN.PA', 'name' => 'Bénéteau'],
        ['symbol' => 'FNAC.PA', 'name' => 'Fnac Darty'],
        ['symbol' => 'TRIG.PA', 'name' => 'Trigano'],
        ['symbol' => 'SMCP.PA', 'name' => 'SMCP'],
        ['symbol' => 'RBO.PA', 'name' => 'Rubis'],
        ['symbol' => 'SK.PA', 'name' => 'SECHE ENVIRONNEMENT'],
        ['symbol' => 'PLX.PA', 'name' => 'Pluxee'],
    ];

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
        $name = !empty($meta['shortName']) ? (string)$meta['shortName'] : (string)($meta['symbol'] ?? $ticker);

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
        $fetchSize = min(max($limit + 15, 25), 100);

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


    /**
     * Retourne la liste des constituants pour un indice donné ('cac40' ou 'sbf120').
     */
    public function getIndexConstituents(string $indexKey): array
    {
        $key = strtolower(trim($indexKey));
        if ($key === 'cac40' || $key === 'cac 40') {
            return [
                'key' => 'cac40',
                'name' => 'CAC 40',
                'constituents' => self::CAC40_CONSTITUENTS,
            ];
        }

        if ($key === 'sbf120' || $key === 'sbf 120') {
            $all = array_merge(self::CAC40_CONSTITUENTS, self::SBF120_EXTRA_CONSTITUENTS);
            // Dédupliquer par symbole
            $unique = [];
            foreach ($all as $item) {
                $unique[$item['symbol']] = $item;
            }
            return [
                'key' => 'sbf120',
                'name' => 'SBF 120',
                'constituents' => array_values($unique),
            ];
        }

        return [
            'key' => $key,
            'name' => strtoupper($key),
            'constituents' => [],
        ];
    }
}
