<?php

/**
 * Script de tests automatisés pour la vérification des contrôles de sécurité et métier
 * sur l'API REST NetTrader 2.
 * Compatible PHP 7.4+
 */

require_once __DIR__ . '/../autoload.php';
require_once __DIR__ . '/../const.php';
require_once __DIR__ . '/../constbdd.php';
require_once __DIR__ . '/../lang/lang_fr.php';
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../db_reqtableaux.php';
require_once __DIR__ . '/../db_reqfunction.php';
require_once __DIR__ . '/../nt2_function.php';
require_once __DIR__ . '/../nt2_pages.php';
require_once __DIR__ . '/../nt2_adminfunction.php';

use NetTrader\Service\TradingService;

$conn = Connexion(NOM, PASSE, BASE, SERVEUR);

$passed = 0;
$failed = 0;

function assertTest($name, $condition, $detail = '')
{
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] $name\n";
        $passed++;
    } else {
        echo "  [FAIL] $name - Detail: $detail\n";
        $failed++;
    }
}

function apiRequest($method, $path, $token = null, $data = null)
{
    $url = 'http://localhost/api/' . ltrim($path, '/');
    $ch = curl_init($url);
    $headers = ['Content-Type: application/json'];
    if ($token) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($response, true);
    return [
        'code' => $httpCode,
        'body' => $response,
        'json' => is_array($json) ? $json : [],
    ];
}

function rawRequest($method, $url, $headers = [], $data = null, $followLocation = false)
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, $followLocation);
    curl_setopt($ch, CURLOPT_HEADER, true);

    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($data) ? json_encode($data) : $data);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $redirectUrl = curl_getinfo($ch, CURLINFO_REDIRECT_URL);
    curl_close($ch);

    $headerStr = substr((string)$response, 0, $headerSize);
    $bodyStr = substr((string)$response, $headerSize);

    return [
        'code' => $httpCode,
        'headers' => $headerStr,
        'redirect' => $redirectUrl,
        'body' => $bodyStr,
    ];
}

echo "\n=== DEMARRAGE DES TESTS DES CONTROLES API REST ===\n\n";

$userId = 2;
$testToken = md5('tok_' . microtime() . $userId);

// S'assurer que le compte de test existe
$userCheck = ExecRequete("SELECT idcompte FROM compte WHERE idcompte = ?", $conn, [$userId]);
if (!LigneSuivante($userCheck)) {
    ExecRequete("INSERT INTO compte (idcompte, pseudonyme, passe, email, idniveau, cashback, dateinscr, dateactivite, authlevel) VALUES (?, 'TraderTest', ?, 'tradertest@test.com', 3, 5000.00, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), 0)", $conn, [$userId, password_hash('TempPass123!', PASSWORD_BCRYPT)]);
}

// Nettoyer et initialiser la session de test
ExecRequete("DELETE FROM session WHERE idSession = ? OR idcompte = ?", $conn, [$testToken, $userId]);
ExecRequete("INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) VALUES (?, ?, ?, ?)", $conn, [
    $testToken, $userId, time() + 86400, time()
]);

// Nettoyer l'état des ordres et du portefeuille de test
ExecRequete("DELETE FROM ordre WHERE idcompte = ?", $conn, [$userId]);
ExecRequete("DELETE FROM portef WHERE idcompte = ? AND codesico IN (167, 5229)", $conn, [$userId]);
ExecRequete("UPDATE cacval SET authachat = '1', down = '1', is_archived = '0' WHERE codesico = 167", $conn);

// -------------------------------------------------------------
// SECTION 1 : Tests Unitaires Métier (TradingService)
// -------------------------------------------------------------
echo "1. Tests Métier TradingService :\n";
$tradingService = new TradingService();

// Niveau 1 (Débutant, vad=0, seuil=1, plage=0)
ExecRequete("UPDATE compte SET idniveau = 1, cashback = 5000.00 WHERE idcompte = ?", $conn, [$userId]);

// Test 1.1 : Vendre action non possédée avec Niveau 1
$valRes = $tradingService->validateOrder($userId, [
    'sens' => 'vente',
    'codesicav' => 167,
    'quantity' => 10,
    'valmin' => 0,
    'valmax' => 0,
    'seuil' => '0',
], $conn);
assertTest("Refus de vente d'une action non possédée (Niveau 1 Débutant)", !$valRes['valid'] && strpos($valRes['error'], "ne possédez pas") !== false, $valRes['error'] ?? '');

// Test 1.2 : Ordre avec plage de cours interdit pour Niveau 1 (plage=0)
$valResSeuil = $tradingService->validateOrder($userId, [
    'sens' => 'achat',
    'codesicav' => 167,
    'quantity' => 1,
    'valmin' => 10,
    'valmax' => 15,
    'seuil' => '1',
], $conn);
assertTest("Refus d'ordre avec plage min/max pour Niveau 1", !$valResSeuil['valid'] && strpos($valResSeuil['error'], "plage de cours") !== false, $valResSeuil['error'] ?? '');

// Test 1.3 : Achat avec montant supérieur au cashback disponible
$valResCash = $tradingService->validateOrder($userId, [
    'sens' => 'achat',
    'codesicav' => 5229, // HERMES ~ 1331 €
    'quantity' => 100,  // 133 100 € >> 5000 €
    'valmin' => 0,
    'valmax' => 0,
    'seuil' => '0',
], $conn);
assertTest("Refus d'achat par manque de liquidités", !$valResCash['valid'] && strpos($valResCash['error'], "Liquidités insuffisantes") !== false, $valResCash['error'] ?? '');

// Test 1.4 : Vendre plus que le portefeuille disponible
ExecRequete("INSERT INTO portef (idcompte, codesico, quant, ansvaleur) VALUES (?, 167, 5, 14.93)", $conn, [$userId]);

$valResQty = $tradingService->validateOrder($userId, [
    'sens' => 'vente',
    'codesicav' => 167,
    'quantity' => 10, // possède 5, demande 10
    'valmin' => 0,
    'valmax' => 0,
    'seuil' => '0',
], $conn);
assertTest("Refus de vente si quantité > actions possédées", !$valResQty['valid'] && strpos($valResQty['error'], "Quantité insuffisante") !== false, $valResQty['error'] ?? '');

// Test 1.5 : Déduction des ordres de vente actifs en attente
// Ajouter un ordre actif de vente pour 3 actions sur les 5 possédées
ExecRequete("INSERT INTO ordre (codesico, idcompte, datecreation, sens, nbr, tempslim, coursmin, coursmax, etat) VALUES (167, ?, ?, 'vente', 3, ?, 0, -1, '1')", $conn, [
    $userId, time() - 10, time() + 86400
]);

$valResEngage = $tradingService->validateOrder($userId, [
    'sens' => 'vente',
    'codesicav' => 167,
    'quantity' => 3, // disponible = 5 - 3 = 2
    'valmin' => 0,
    'valmax' => 0,
    'seuil' => '0',
], $conn);
assertTest("Refus de vente si actions déjà engagées dans d'autres ordres", !$valResEngage['valid'] && strpos($valResEngage['error'], "déjà engagée") !== false, $valResEngage['error'] ?? '');

// Vente de la quantité résiduelle exacte (2 actions) doit être autorisée :
$valResOk = $tradingService->validateOrder($userId, [
    'sens' => 'vente',
    'codesicav' => 167,
    'quantity' => 2,
    'valmin' => 0,
    'valmax' => 0,
    'seuil' => '0',
], $conn);
assertTest("Autorisation de vente pour la quantité résiduelle disponible (2 actions)", $valResOk['valid'], $valResOk['error'] ?? '');

// Nettoyer
ExecRequete("DELETE FROM ordre WHERE idcompte = ?", $conn, [$userId]);
ExecRequete("DELETE FROM portef WHERE idcompte = ? AND codesico IN (167, 5229)", $conn, [$userId]);


// -------------------------------------------------------------
// SECTION 2 : Tests HTTP REST Trading (/api/trading/orders)
// -------------------------------------------------------------
echo "\n2. Tests Endpoints HTTP Trading (/api/trading/orders) :\n";

// Test 2.1 : Vendre une action non possédée via l'API REST HTTP
$httpSellUnowned = apiRequest('POST', '/trading/orders', $testToken, [
    'sens' => 'vente',
    'codesicav' => 167,
    'quantity' => 5,
]);
assertTest(
    "HTTP 400 sur tentative de vente d'action non possédée via REST",
    $httpSellUnowned['code'] === 400 && strpos($httpSellUnowned['body'], 'ne possédez pas') !== false,
    "Code: {$httpSellUnowned['code']}, Reponse: {$httpSellUnowned['body']}"
);

// Test 2.2 : Achat au-dessus des fonds disponibles via REST
$httpBuyTooMuch = apiRequest('POST', '/trading/orders', $testToken, [
    'sens' => 'achat',
    'codesicav' => 5229,
    'quantity' => 100,
]);
assertTest(
    "HTTP 400 sur achat avec fonds insuffisants via REST",
    $httpBuyTooMuch['code'] === 400 && strpos($httpBuyTooMuch['body'], 'Liquidités insuffisantes') !== false,
    "Code: {$httpBuyTooMuch['code']}, Reponse: {$httpBuyTooMuch['body']}"
);

// Test 2.3 : Ordre avec plage de cours avec compte Niveau 1 Débutant via REST
$httpSeuilLevel1 = apiRequest('POST', '/trading/orders', $testToken, [
    'sens' => 'achat',
    'codesicav' => 167,
    'quantity' => 1,
    'valmin' => 10,
    'valmax' => 15,
    'seuil' => '1',
]);
assertTest(
    "HTTP 400 sur ordre avec plage de cours non autorisé pour Niveau 1",
    $httpSeuilLevel1['code'] === 400 && strpos($httpSeuilLevel1['body'], 'plage de cours') !== false,
    "Code: {$httpSeuilLevel1['code']}, Reponse: {$httpSeuilLevel1['body']}"
);

// Test 2.4 : Annulation d'un ordre inexistant ou appartenant à un autre joueur
$httpCancelInvalid = apiRequest('DELETE', '/trading/orders/999999999', $testToken);
assertTest(
    "HTTP 404 sur annulation d'un ordre non existant / non autorisé",
    $httpCancelInvalid['code'] === 404,
    "Code: {$httpCancelInvalid['code']}, Reponse: {$httpCancelInvalid['body']}"
);


// -------------------------------------------------------------
// SECTION 3 : Tests HTTP Profil & Compte (/api/account/...)
// -------------------------------------------------------------
echo "\n3. Tests Endpoints HTTP Compte (/api/account/...) :\n";

$userBefore = ChercheInternaute($userId, $conn, '');
$origEmail = $userBefore->email;

// Test 3.1 : Mise à jour de profil sans envoyer le champ email
$httpUpdateNoEmail = apiRequest('PUT', '/account/profile', $testToken, [
    'level' => 2,
    'mailDaily' => 1,
]);
$userAfter = ChercheInternaute($userId, $conn, '');
assertTest(
    "Préservation de l'e-mail si absent du payload PUT /account/profile",
    $httpUpdateNoEmail['code'] === 200 && !empty($userAfter->email) && $userAfter->email === $origEmail,
    "Email en BDD: '{$userAfter->email}'"
);

// Test 3.2 : Rejet de niveau invalide (> 3)
$httpUpdateBadLevel = apiRequest('PUT', '/account/profile', $testToken, [
    'level' => 999,
]);
assertTest(
    "HTTP 400 lors de la tentative de définir un niveau invalide (999)",
    $httpUpdateBadLevel['code'] === 400 && strpos($httpUpdateBadLevel['body'], 'Niveau invalide') !== false,
    "Code: {$httpUpdateBadLevel['code']}, Reponse: {$httpUpdateBadLevel['body']}"
);

// Test 3.3 : Changement de mot de passe et révocation des autres sessions
$otherToken = md5('other_session_' . microtime());
ExecRequete("INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) VALUES (?, ?, ?, ?)", $conn, [
    $otherToken, $userId, time() + 86400, time()
]);
// Définir un mot de passe connu temporaire
$testPass = 'TempPass123!';
$newPass = 'NewSecurePass456!';
ExecRequete("UPDATE compte SET passe = ? WHERE idcompte = ?", $conn, [password_hash($testPass, PASSWORD_BCRYPT), $userId]);

// Mauvais mot de passe actuel -> 403
$httpPassWrong = apiRequest('PUT', '/account/password', $testToken, [
    'currentPassword' => 'WrongPass',
    'newPassword' => $newPass,
    'confirmPassword' => $newPass,
]);
assertTest("HTTP 403 lors d'un mot de passe actuel erroné", $httpPassWrong['code'] === 403);

// Bon mot de passe actuel -> 200
$httpPassOk = apiRequest('PUT', '/account/password', $testToken, [
    'currentPassword' => $testPass,
    'newPassword' => $newPass,
    'confirmPassword' => $newPass,
]);
assertTest("HTTP 200 lors du changement réussi de mot de passe", $httpPassOk['code'] === 200);

// Vérifier que l'autre session a été révoquée
$checkOther = ExecRequete("SELECT idSession FROM session WHERE idSession = ?", $conn, [$otherToken]);
$otherExists = (bool)LigneSuivante($checkOther);
assertTest("Révocation automatique des autres sessions actives lors du changement de mot de passe", !$otherExists);

// Rétablir le mot de passe original
ExecRequete("UPDATE compte SET passe = ? WHERE idcompte = ?", $conn, [$userBefore->passe, $userId]);


// -------------------------------------------------------------
// SECTION 4 : Tests HTTP Équipes (/api/teams/...)
// -------------------------------------------------------------
echo "\n4. Tests Endpoints HTTP Équipes (/api/teams/...) :\n";

// Test 4.1 : Création avec tag trop court
$httpCreateBadTag = apiRequest('POST', '/teams', $testToken, [
    'name' => 'Equipe Invalide',
    'tag' => 'X',
]);
assertTest(
    "HTTP 400 lors de la création d'équipe avec un tag trop court (< 2 car.)",
    $httpCreateBadTag['code'] === 400 && strpos($httpCreateBadTag['body'], 'entre 2 et 10') !== false,
    "Code: {$httpCreateBadTag['code']}, Reponse: {$httpCreateBadTag['body']}"
);

// Test 4.2 : Rejoindre une équipe sans invitation
$httpJoinNoInvite = apiRequest('POST', '/teams/999/join', $testToken);
assertTest(
    "HTTP 404/403 sur adhésion sans invitation ou groupe inexistant",
    in_array($httpJoinNoInvite['code'], [403, 404], true),
    "Code: {$httpJoinNoInvite['code']}, Reponse: {$httpJoinNoInvite['body']}"
);


// -------------------------------------------------------------
// SECTION 5 : Tests HTTP Messagerie (/api/messages)
// -------------------------------------------------------------
echo "\n5. Tests Endpoints HTTP Messagerie (/api/messages) :\n";

// Test 5.1 : Envoi à soi-même
$httpSelfMsg = apiRequest('POST', '/messages', $testToken, [
    'recipient' => (string)$userId,
    'title' => 'Mon titre',
    'content' => 'Mon texte',
]);
assertTest(
    "HTTP 400 lors d'un envoi de message à soi-même",
    $httpSelfMsg['code'] === 400 && strpos($httpSelfMsg['body'], 'vous-même') !== false,
    "Code: {$httpSelfMsg['code']}, Reponse: {$httpSelfMsg['body']}"
);

// Test 5.2 : Envoi avec caractères spéciaux SQL (test anti-injection)
$httpSqlMsg = apiRequest('POST', '/messages', $testToken, [
    'recipient' => '1', // Admin
    'title' => "Injection Test ' OR '1'='1",
    'content' => "Contenu contenant des apostrophes ' et guillemets \" sécurisé par PDO.",
]);
assertTest(
    "HTTP 200 sur message avec caractères spéciaux (pas de plantage SQL)",
    $httpSqlMsg['code'] === 200,
    "Code: {$httpSqlMsg['code']}, Reponse: {$httpSqlMsg['body']}"
);

// Nettoyage message
ExecRequete("DELETE FROM messages WHERE idenvoyeur = ? AND titre LIKE 'Injection Test%'", $conn, [$userId]);


// -------------------------------------------------------------
// SECTION 6 : Tests Inscription (/api/auth/register)
// -------------------------------------------------------------
echo "\n6. Tests Endpoints HTTP Inscription (/api/auth/register) :\n";

// Test 6.1 : Pseudo trop court
$httpRegShort = apiRequest('POST', '/auth/register', null, [
    'pseudo' => 'yo',
    'email' => 'valid@test.com',
    'password' => 'secret123',
]);
assertTest(
    "HTTP 400 sur inscription avec pseudo trop court",
    $httpRegShort['code'] === 400 && strpos($httpRegShort['body'], 'entre 3 et 30') !== false,
    "Code: {$httpRegShort['code']}, Reponse: {$httpRegShort['body']}"
);

// Test 6.2 : Pseudo contenant des balises / caractères invalides
$httpRegXss = apiRequest('POST', '/auth/register', null, [
    'pseudo' => '<admin>',
    'email' => 'valid@test.com',
    'password' => 'secret123',
]);
assertTest(
    "HTTP 400 sur inscription avec pseudo non autorisé (caractères spéciaux / balises)",
    $httpRegXss['code'] === 400 && strpos($httpRegXss['body'], 'non autorisés') !== false,
    "Code: {$httpRegXss['code']}, Reponse: {$httpRegXss['body']}"
);


// -------------------------------------------------------------
// SECTION 7 : Tests Forum & Formatage des liens (FormattingService & API)
// -------------------------------------------------------------
echo "\n7. Tests Forum & Formatage des Liens BBCode / REST :\n";

use NetTrader\Service\FormattingService;
$formattingService = new FormattingService();

// Test 7.1 : Formatage des liens BBCode avec guillemets simples/doubles et entités
$bbInput1 = '[url="http://fun-trades.com/index.php?ref=5737"]fun-trades[/url]';
$bbRes1 = $formattingService->parseBBCode($bbInput1);
assertTest(
    "Parseur BBCode : conversion valide de [url=\"...\"] en <a href=\"...\">",
    strpos($bbRes1, '<a href="http://fun-trades.com/index.php?ref=5737"') !== false && strpos($bbRes1, 'fun-trades</a>') !== false && strpos($bbRes1, '[url=') === false,
    "Result: $bbRes1"
);

// Test 7.2 : Formatage des liens BBCode avec entités &quot; (cas historique de la BDD)
$bbInput2 = '[url=&quot;http://www.marketadvices.com&quot;]Market Advices[/url]';
$bbRes2 = $formattingService->parseBBCode($bbInput2);
assertTest(
    "Parseur BBCode : conversion valide de [url=&quot;...&quot;] en <a href=\"...\">",
    strpos($bbRes2, '<a href="http://www.marketadvices.com"') !== false && strpos($bbRes2, 'Market Advices</a>') !== false && strpos($bbRes2, '[url=') === false,
    "Result: $bbRes2"
);

// Test 7.3 : Formatage de [url]lien[/url] sans attribut
$bbInput3 = '[url]http://blog.nettrader.fr[/url]';
$bbRes3 = $formattingService->parseBBCode($bbInput3);
assertTest(
    "Parseur BBCode : conversion valide de [url]http://...[/url]",
    strpos($bbRes3, '<a href="http://blog.nettrader.fr"') !== false && strpos($bbRes3, 'http://blog.nettrader.fr</a>') !== false && strpos($bbRes3, '[url]') === false,
    "Result: $bbRes3"
);

// Test 7.4 : Sécurité XSS - Neutralisation des schémas malveillants javascript:
$bbInputXss = '[url=javascript:alert(1)]Hack[/url]';
$bbResXss = $formattingService->parseBBCode($bbInputXss);
assertTest(
    "Sécurité : neutralisation des liens non sécurisés (javascript:)",
    strpos($bbResXss, 'href="javascript:') === false,
    "Result: $bbResXss"
);

// Test 7.5 : Endpoint REST GET /api/forums/topics/7 (vérification de formattedContent et liens valides)
$httpTopic = apiRequest('GET', '/forums/topics/7');
$firstMsg = $httpTopic['json']['data']['messages'][0] ?? null;
$hasValidFormattedLink = $firstMsg && isset($firstMsg['formattedContent']) && strpos($firstMsg['formattedContent'], '<a href="http://fun-trades.com') !== false && strpos($firstMsg['formattedContent'], '[url=') === false;
assertTest(
    "API REST : /api/forums/topics/7 retourne formattedContent avec liens valides",
    $httpTopic['code'] === 200 && $hasValidFormattedLink,
    "Code: {$httpTopic['code']}, FirstMsg formatted: " . ($firstMsg['formattedContent'] ?? 'null')
);

// -------------------------------------------------------------
// SECTION 8 : Tests Administration & Modération du Forum (/api/admin/forum/...)
// -------------------------------------------------------------
echo "\n8. Tests Administration & Modération du Forum (/api/admin/forum/...) :\n";

// 8.1 : Sécurité - Utilisateur non-admin bloqué (HTTP 403)
$resNonAdmin = apiRequest('GET', '/admin/forum/forums', $testToken);
assertTest(
    "Sécurité : rejet HTTP 403 pour utilisateur non-admin sur /admin/forum/forums",
    $resNonAdmin['code'] === 403,
    "Code: {$resNonAdmin['code']}"
);

// Créer un token admin de test lié au compte admin #1
$adminToken = md5('admin_tok_' . microtime() . '1');
ExecRequete("DELETE FROM session WHERE idSession = ?", $conn, [$adminToken]);
ExecRequete("INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) VALUES (?, 1, ?, ?)", $conn, [
    $adminToken, time() + 86400, time()
]);

// 8.2 : Admin - Lister les sections
$resSections = apiRequest('GET', '/admin/forum/sections', $adminToken);
assertTest(
    "Admin : consultation des sections du forum (/admin/forum/sections)",
    $resSections['code'] === 200 && is_array($resSections['json']['data']) && count($resSections['json']['data']) > 0,
    "Code: {$resSections['code']}, Data count: " . count($resSections['json']['data'] ?? [])
);

// 8.3 : Admin - Créer un nouveau forum
$newForumPayload = [
    'name' => 'Forum Test Admin ' . time(),
    'description' => 'Description temporaire pour tests automatisés',
    'sectionId' => 2,
    'authread' => 'ouvert',
    'authwrite' => 'identifie',
];
$resCreateForum = apiRequest('POST', '/admin/forum/forums', $adminToken, $newForumPayload);
$createdForumId = $resCreateForum['json']['data']['id'] ?? 0;
assertTest(
    "Admin : création d'une nouvelle rubrique de forum (/admin/forum/forums)",
    $resCreateForum['code'] === 201 && $createdForumId > 0,
    "Code: {$resCreateForum['code']}, Created ID: $createdForumId"
);

// 8.4 : Admin - Modifier la rubrique créée
$updateForumPayload = [
    'name' => 'Forum Test Admin Modifié',
    'description' => 'Description mise à jour',
    'sectionId' => 3,
    'authread' => 'admin',
    'authwrite' => 'admin',
];
$resUpdateForum = apiRequest('PUT', "/admin/forum/forums/$createdForumId", $adminToken, $updateForumPayload);
assertTest(
    "Admin : mise à jour des paramètres d'une rubrique (PUT /admin/forum/forums/{id})",
    $resUpdateForum['code'] === 200,
    "Code: {$resUpdateForum['code']}"
);

// 8.5 : Admin - Poster un sujet de test dans le forum créé
$newTopicPayload = [
    'forumId' => $createdForumId,
    'subject' => 'Sujet Test Modération ' . time(),
    'content' => 'Message initial contenant du texte a moderer.',
];
$resPostTopic = apiRequest('POST', '/forums/posts', $adminToken, $newTopicPayload);
assertTest(
    "Forum : création d'un sujet de test pour modération",
    $resPostTopic['code'] === 200,
    "Code: {$resPostTopic['code']}, Msg: " . ($resPostTopic['json']['message'] ?? '')
);

// 8.6 : Admin - Rechercher et lister les sujets dans ce forum
$resGetTopics = apiRequest('GET', "/admin/forum/topics?forumId=$createdForumId", $adminToken);
$foundTopics = $resGetTopics['json']['data']['items'] ?? [];
$targetTopic = $foundTopics[0] ?? null;
$targetTopicId = $targetTopic['id'] ?? 0;
assertTest(
    "Admin : recherche et listing des sujets d'un forum (/admin/forum/topics)",
    $resGetTopics['code'] === 200 && $targetTopicId > 0,
    "Code: {$resGetTopics['code']}, Topic ID: $targetTopicId"
);

// 8.7 : Admin - Déplacer le sujet vers le forum 2 et le renommer
$resMoveTopic = apiRequest('PUT', "/admin/forum/topics/$targetTopicId", $adminToken, [
    'title' => 'Sujet Renommé par Admin',
    'forumId' => 2,
]);
assertTest(
    "Admin : renommage et déplacement de sujet vers un autre forum (/admin/forum/topics/{id})",
    $resMoveTopic['code'] === 200,
    "Code: {$resMoveTopic['code']}"
);

// 8.8 : Admin - Rechercher le message et le modérer
$resGetMessages = apiRequest('GET', "/admin/forum/messages?topicId=$targetTopicId", $adminToken);
$foundMessages = $resGetMessages['json']['data']['items'] ?? [];
$targetMsg = $foundMessages[0] ?? null;
$targetMsgId = $targetMsg['id'] ?? 0;
assertTest(
    "Admin : recherche des messages d'une discussion (/admin/forum/messages)",
    $resGetMessages['code'] === 200 && $targetMsgId > 0,
    "Code: {$resGetMessages['code']}, Msg ID: $targetMsgId"
);

$resUpdateMsg = apiRequest('PUT', "/admin/forum/messages/$targetMsgId", $adminToken, [
    'content' => '[Ce message a été modéré par un administrateur.]',
]);
assertTest(
    "Admin : édition modératrice d'un message (/admin/forum/messages/{id})",
    $resUpdateMsg['code'] === 200,
    "Code: {$resUpdateMsg['code']}"
);

// 8.9 : Admin - Synchroniser les compteurs du forum
$resSync = apiRequest('POST', "/admin/forum/forums/$createdForumId/sync", $adminToken);
assertTest(
    "Admin : synchronisation manuelle des compteurs d'une rubrique (/admin/forum/forums/{id}/sync)",
    $resSync['code'] === 200,
    "Code: {$resSync['code']}"
);

// 8.10 : Admin - Supprimer le sujet déplacé
$resDelTopic = apiRequest('DELETE', "/admin/forum/topics/$targetTopicId", $adminToken);
assertTest(
    "Admin : suppression complète d'un sujet et messages associés (/admin/forum/topics/{id})",
    $resDelTopic['code'] === 200,
    "Code: {$resDelTopic['code']}"
);

// 8.11 : Admin - Supprimer la rubrique de test créée
$resDelForum = apiRequest('DELETE', "/admin/forum/forums/$createdForumId", $adminToken);
assertTest(
    "Admin : suppression d'une rubrique de forum (/admin/forum/forums/{id})",
    $resDelForum['code'] === 200,
    "Code: {$resDelForum['code']}"
);

// Nettoyer la session admin de test
ExecRequete("DELETE FROM session WHERE idSession = ?", $conn, [$adminToken]);


// -------------------------------------------------------------
// SECTION 9 : Tests de Sécurité et Durcissement (Remédiation)
// -------------------------------------------------------------
echo "\n9. Tests de Sécurité et Durcissement (Remédiation) :\n";

// Test 9.1 : Suppression de l'accès client VB6
$resVb6 = rawRequest('GET', 'http://localhost/prog.php');
assertTest(
    "Suppression accès VB6 : /prog.php renvoie HTTP 404",
    $resVb6['code'] === 404,
    "Code: {$resVb6['code']}"
);

// Test 9.2 : Rejet de cmd.php sans clé secrète
$resCmdNoKey = rawRequest('GET', 'http://localhost/cmd.php?do=checkscore');
assertTest(
    "cmd.php : Rejet HTTP 403 en l'absence de clé secrète CRON_SECRET",
    $resCmdNoKey['code'] === 403 && strpos($resCmdNoKey['body'], 'Accès refusé') !== false,
    "Code: {$resCmdNoKey['code']}, Reponse: {$resCmdNoKey['body']}"
);

// Test 9.3 : Acceptation de cmd.php avec en-tête X-Cron-Key
$resCmdWithKey = rawRequest('GET', 'http://localhost/cmd.php?do=checkscore', [
    'X-Cron-Key: nettrader_cron_secure_token_secret'
]);
assertTest(
    "cmd.php : Exécution autorisée avec clé valide dans l'en-tête X-Cron-Key",
    $resCmdWithKey['code'] === 200,
    "Code: {$resCmdWithKey['code']}"
);

// Test 9.4 : Protection du dossier tests/ contre l'accès HTTP public
$resTestsDir = rawRequest('GET', 'http://localhost/tests/test_api_controls.php');
assertTest(
    "tests/ : Accès web direct interdit (HTTP 403) via .htaccess",
    $resTestsDir['code'] === 403,
    "Code: {$resTestsDir['code']}"
);

// Test 9.5 : Génération sécurisée de session CSPRNG (64 caractères hexadécimaux)
$resLoginSec = apiRequest('POST', '/auth/login', null, [
    'login' => 'TraderTest',
    'password' => 'TempPass123!',
]);
$secToken = $resLoginSec['json']['data']['token'] ?? '';
assertTest(
    "Session : Jeton généré avec CSPRNG (64 caractères hexadécimaux / 256 bits)",
    strlen($secToken) === 64 && ctype_xdigit($secToken),
    "Longueur: " . strlen($secToken) . ", Token: $secToken"
);

// Test 9.6 : Vérification de la conversion de toutes les tables vers InnoDB
$checkEngine = $conn->query("SELECT COUNT(*) as c FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'nettrader' AND ENGINE != 'InnoDB'");
$nonInnodb = (int)$checkEngine->fetch(PDO::FETCH_OBJ)->c;
assertTest(
    "Base de données : 100% des tables sont migrées sous le moteur InnoDB",
    $nonInnodb === 0,
    "Nombre de tables non-InnoDB: $nonInnodb"
);

// Test 9.7 : Restreinte de la politique CORS contre les origines non autorisées
$resCorsEvil = rawRequest('OPTIONS', 'http://localhost/api/auth/me', [
    'Origin: https://evil-attacker-site.com',
    'Access-Control-Request-Method: GET',
]);
$headersEvil = $resCorsEvil['headers'];
$corsReflectedEvil = (strpos($headersEvil, 'Access-Control-Allow-Origin: https://evil-attacker-site.com') !== false);
assertTest(
    "CORS : Rejet de la réflexion arbitraire d'origines tierces non autorisées",
    !$corsReflectedEvil,
    "Headers: " . trim($headersEvil)
);

// Test 9.8 : Protection contre l'Open Redirect dans redir.php (domaines externes et nettrader.fr interdit)
$resRedir = rawRequest('GET', 'http://localhost/redir.php?url=https://malicious-phishing.com');
$resRedirNettrader = rawRequest('GET', 'http://localhost/redir.php?url=https://nettrader.fr');
$isRedirectToIndex = (strpos($resRedir['headers'], 'Location: index.php') !== false)
    && (strpos($resRedirNettrader['headers'], 'Location: index.php') !== false);
assertTest(
    "Open Redirect : Redirection vers index.php pour les domaines non autorisés (y compris nettrader.fr)",
    $isRedirectToIndex,
    "Headers: " . trim($resRedir['headers']) . " | NetTrader: " . trim($resRedirNettrader['headers'])
);

// -------------------------------------------------------------
// SECTION 10 : Tests du module Admin Suivi des Cotations (Market Sync)
// -------------------------------------------------------------
echo "\n10. Tests Suivi des Cotations & Mises à Jour (/api/admin/market-sync/...) :\n";

// 10.1 : Rejet pour non-admin
$resNonAdminMarket = apiRequest('GET', '/admin/market-sync/overview', $testToken);
assertTest(
    "Market Sync : Rejet HTTP 403 pour utilisateur non-administrateur",
    $resNonAdminMarket['code'] === 403,
    "Code: {$resNonAdminMarket['code']}"
);

// Créer un token admin de test lié au compte admin #1
$adminToken2 = bin2hex(random_bytes(32));
ExecRequete("DELETE FROM session WHERE idSession = ?", $conn, [$adminToken2]);
ExecRequete("INSERT INTO session (idSession, idcompte, tempsLimite, tempsconnect) VALUES (?, 1, ?, ?)", $conn, [
    $adminToken2, time() + 86400, time()
]);

// 10.2 : Consultation de l'overview
$resOverview = apiRequest('GET', '/admin/market-sync/overview', $adminToken2);
$overviewData = $resOverview['json']['data']['overview'] ?? [];
assertTest(
    "Market Sync : Consultation vue d'ensemble (totalStocks, successRate, lastSyncTime)",
    $resOverview['code'] === 200 && isset($overviewData['totalStocks'], $overviewData['totalTracked'], $overviewData['successRate']),
    "Code: {$resOverview['code']}, Total: " . ($overviewData['totalStocks'] ?? 'N/A') . ", Rate: " . ($overviewData['successRate'] ?? 'N/A') . "%"
);

// 10.3 : Listing des valeurs avec filtre
$resStocks = apiRequest('GET', '/admin/market-sync/stocks?status=all&limit=10', $adminToken2);
$stocksData = $resStocks['json']['data']['items'] ?? [];
assertTest(
    "Market Sync : Listing paginé des valeurs boursières avec indicateurs de statut",
    $resStocks['code'] === 200 && count($stocksData) > 0 && isset($stocksData[0]['ticker'], $stocksData[0]['lastStatus']),
    "Code: {$resStocks['code']}, Count: " . count($stocksData)
);

// 10.4 : Filtrage des valeurs en échec
$resFailedStocks = apiRequest('GET', '/admin/market-sync/stocks?status=failed', $adminToken2);
$failedItems = $resFailedStocks['json']['data']['items'] ?? [];
assertTest(
    "Market Sync : Filtrage des valeurs en échec (status=failed)",
    $resFailedStocks['code'] === 200 && is_array($failedItems),
    "Code: {$resFailedStocks['code']}, Nb échecs: " . count($failedItems)
);

// 10.5 : Réinitialisation des erreurs d'une valeur
$targetStockCode = 12156; // CU.PA
$resResetOne = apiRequest('POST', "/admin/market-sync/stocks/$targetStockCode/reset-errors", $adminToken2);
assertTest(
    "Market Sync : Réinitialisation des compteurs d'échecs d'un titre spécifique",
    $resResetOne['code'] === 200,
    "Code: {$resResetOne['code']}"
);

// 10.6 : Basculement du statut de suivi (toggle-track)
$resToggle = apiRequest('POST', "/admin/market-sync/stocks/$targetStockCode/toggle-track", $adminToken2);
$isNowTracked = $resToggle['json']['data']['isTracked'] ?? null;
// Rétablir le statut initial
apiRequest('POST', "/admin/market-sync/stocks/$targetStockCode/toggle-track", $adminToken2);
assertTest(
    "Market Sync : Basculement du statut de suivi d'un titre (toggle-track)",
    $resToggle['code'] === 200 && $isNowTracked !== null,
    "Code: {$resToggle['code']}, isTracked: " . var_export($isNowTracked, true)
);

// 10.7 : Réinitialisation globale de tous les compteurs d'échecs
$resResetAll = apiRequest('POST', '/admin/market-sync/reset-all-errors', $adminToken2);
assertTest(
    "Market Sync : Réinitialisation globale de tous les compteurs d'échecs",
    $resResetAll['code'] === 200,
    "Code: {$resResetAll['code']}"
);

// 10.8 : Rejet HTTP 403 sur force-sync pour non-administrateur
$resNonAdminForce = apiRequest('POST', '/admin/market-sync/force-sync', $testToken);
assertTest(
    "Market Sync : Rejet HTTP 403 sur actualisation forcée pour non-administrateur",
    $resNonAdminForce['code'] === 403,
    "Code: {$resNonAdminForce['code']}"
);

// 10.9 : Actualisation forcée unitaire d'un titre actif
$activeStockRes = apiRequest('GET', '/admin/market-sync/stocks?status=success&limit=1', $adminToken2);
$activeStockCode = $activeStockRes['json']['data']['items'][0]['codesico'] ?? 12101;
$resForceOne = apiRequest('POST', "/admin/market-sync/stocks/$activeStockCode/force-sync", $adminToken2);
assertTest(
    "Market Sync : Actualisation forcée de la cotation d'un titre unitaire (POST .../force-sync)",
    $resForceOne['code'] === 200 && ($resForceOne['json']['data']['totalStocks'] ?? 0) === 1,
    "Code: {$resForceOne['code']}, Succès: " . ($resForceOne['json']['data']['successCount'] ?? 0)
);

// 10.10 : Actualisation forcée globale des cotations
$resForceAll = apiRequest('POST', '/admin/market-sync/force-sync', $adminToken2);
$forceAllData = $resForceAll['json']['data'] ?? [];
assertTest(
    "Market Sync : Actualisation forcée globale des cotations (POST /admin/market-sync/force-sync)",
    $resForceAll['code'] === 200 && ($forceAllData['totalStocks'] ?? 0) > 0 && ($forceAllData['successCount'] ?? 0) > 0,
    "Code: {$resForceAll['code']}, Total: " . ($forceAllData['totalStocks'] ?? 0) . ", Succès: " . ($forceAllData['successCount'] ?? 0) . ", Durée: " . ($forceAllData['durationSeconds'] ?? 0) . "s"
);

// -------------------------------------------------------------
// SECTION 11 : Tests Gestion & Catalogue des Actions (/api/admin/stocks/...)
// -------------------------------------------------------------
echo "\n11. Tests Gestion & Catalogue des Actions (/api/admin/stocks/...) :\n";

// 11.1 : Rejet pour non-admin
$resStockForbidden = apiRequest('GET', '/admin/stocks', $testToken);
assertTest(
    "Catalogue Actions : Rejet HTTP 403 pour utilisateur non-administrateur",
    $resStockForbidden['code'] === 403,
    "Code: {$resStockForbidden['code']}"
);

// 11.2 : Consultation des métadonnées (secteurs & marchés)
$resMeta = apiRequest('GET', '/admin/stocks/metadata', $adminToken2);
$sectors = $resMeta['json']['data']['sectors'] ?? [];
$markets = $resMeta['json']['data']['markets'] ?? [];
assertTest(
    "Catalogue Actions : Récupération des secteurs et marchés (/admin/stocks/metadata)",
    $resMeta['code'] === 200 && count($sectors) > 0 && count($markets) > 0,
    "Code: {$resMeta['code']}, Secteurs: " . count($sectors) . ", Marchés: " . count($markets)
);

// 11.3 : Listing et recherche d'actions
$resSearch = apiRequest('GET', '/admin/stocks?search=Air', $adminToken2);
$searchItems = $resSearch['json']['data']['items'] ?? [];
assertTest(
    "Catalogue Actions : Recherche textuelle d'une action (/admin/stocks?search=Air)",
    $resSearch['code'] === 200 && count($searchItems) > 0 && isset($searchItems[0]['ticker']),
    "Code: {$resSearch['code']}, Résultats: " . count($searchItems)
);

// 11.4 : Création d'une action de test
$testStockCode = 99991;
$resCreate = apiRequest('POST', '/admin/stocks', $adminToken2, [
    'codesico' => $testStockCode,
    'yahooname' => 'TESTNT.PA',
    'nom' => 'Test NetTrader Corp',
    'valeur' => 50.0,
    'authachat' => '1',
    'down' => '1',
    'idsecteur' => 1,
    'idmarket' => 1,
]);
assertTest(
    "Catalogue Actions : Création d'une nouvelle action boursière (POST /admin/stocks)",
    $resCreate['code'] === 201 && ($resCreate['json']['data']['codesico'] ?? 0) === $testStockCode,
    "Code: {$resCreate['code']}, Reponse: {$resCreate['body']}"
);

// 11.5 : Mise à jour des informations de l'action
$resUpdate = apiRequest('PUT', "/admin/stocks/$testStockCode", $adminToken2, [
    'nom' => 'Test NetTrader Corp (Updated)',
    'valeur' => 55.5,
]);
$updatedStock = apiRequest('GET', "/market/stocks/$testStockCode");
assertTest(
    "Catalogue Actions : Mise à jour des propriétés (PUT /admin/stocks/{code})",
    $resUpdate['code'] === 200 && ($updatedStock['json']['data']['price'] ?? 0) == 55.5,
    "Code: {$resUpdate['code']}, Prix: " . ($updatedStock['json']['data']['price'] ?? 'N/A')
);

// 11.6 : Bascule de l'autorisation d'achat (toggle-buy)
$resToggleBuy = apiRequest('POST', "/admin/stocks/$testStockCode/toggle-buy", $adminToken2);
$isAuthBuy = $resToggleBuy['json']['data']['authBuy'] ?? null;
assertTest(
    "Catalogue Actions : Bascule d'autorisation d'achat (/admin/stocks/{code}/toggle-buy)",
    $resToggleBuy['code'] === 200 && $isAuthBuy === false,
    "Code: {$resToggleBuy['code']}, authBuy: " . var_export($isAuthBuy, true)
);

// 11.7 : Opération sur titre (Split 2 pour 1)
$resSplit = apiRequest('POST', '/admin/stocks/split', $adminToken2, [
    'codesico' => $testStockCode,
    'type' => 'multiplier',
    'factor' => 2.0,
]);
$stockAfterSplit = apiRequest('GET', "/market/stocks/$testStockCode");
$expectedPrice = round(55.5 / 2.0, 2);
assertTest(
    "Catalogue Actions : Opération de fractionnement / split (POST /admin/stocks/split)",
    $resSplit['code'] === 200 && abs(($stockAfterSplit['json']['data']['price'] ?? 0) - $expectedPrice) < 0.1,
    "Code: {$resSplit['code']}, Nouveau prix: " . ($stockAfterSplit['json']['data']['price'] ?? 'N/A')
);

// 11.8 : Archivage de l'action (POST /admin/stocks/{code}/archive)
$resArchive = apiRequest('POST', "/admin/stocks/$testStockCode/archive", $adminToken2);
$checkActiveAfterArchive = apiRequest('GET', "/admin/stocks?search=TESTNT&isArchived=0", $adminToken2);
$activeItemsAfter = $checkActiveAfterArchive['json']['data']['items'] ?? [];
$checkArchivedList = apiRequest('GET', "/admin/stocks?search=TESTNT&isArchived=1", $adminToken2);
$archivedItems = $checkArchivedList['json']['data']['items'] ?? [];

assertTest(
    "Catalogue Actions : Archivage de l'action et disparition de la liste active (POST /admin/stocks/{code}/archive)",
    $resArchive['code'] === 200 && ($resArchive['json']['success'] ?? false) === true && count($activeItemsAfter) === 0 && count($archivedItems) === 1,
    "Code: {$resArchive['code']}, ActiveCount: " . count($activeItemsAfter) . ", ArchivedCount: " . count($archivedItems) . ", Rep: {$resArchive['body']}"
);

// 11.9 : Désarchivage de l'action (POST /admin/stocks/{code}/unarchive)
$resUnarchive = apiRequest('POST', "/admin/stocks/$testStockCode/unarchive", $adminToken2);
$checkActiveAfterUnarchive = apiRequest('GET', "/admin/stocks?search=TESTNT&isArchived=0", $adminToken2);
$activeItemsRestored = $checkActiveAfterUnarchive['json']['data']['items'] ?? [];

assertTest(
    "Catalogue Actions : Désarchivage de l'action et réapparition dans la liste active (POST /admin/stocks/{code}/unarchive)",
    $resUnarchive['code'] === 200 && ($resUnarchive['json']['success'] ?? false) === true && count($activeItemsRestored) === 1,
    "Code: {$resUnarchive['code']}, RestoredCount: " . count($activeItemsRestored)
);

// 11.10 : Suppression de l'action de test
$resDelete = apiRequest('DELETE', "/admin/stocks/$testStockCode", $adminToken2);
$checkDeleted = apiRequest('GET', "/market/stocks/$testStockCode");
assertTest(
    "Catalogue Actions : Suppression de l'action de test (DELETE /admin/stocks/{code})",
    $resDelete['code'] === 200 && $checkDeleted['code'] === 404,
    "Code: {$resDelete['code']}, CheckDeleted: {$checkDeleted['code']}"
);

// 11.11 : Suppression en masse - Rejet si mot de passe admin absent ou incorrect
$bulkTestStock1 = 99992;
$bulkTestStock2 = 99993;
apiRequest('POST', '/admin/stocks', $adminToken2, [
    'codesico' => $bulkTestStock1,
    'yahooname' => 'BULK1.PA',
    'nom' => 'Bulk Test Stock 1',
    'valeur' => 25.0,
    'authachat' => '0',
    'down' => '0',
    'idsecteur' => 1,
    'idmarket' => 1,
]);
apiRequest('POST', '/admin/stocks', $adminToken2, [
    'codesico' => $bulkTestStock2,
    'yahooname' => 'BULK2.PA',
    'nom' => 'Bulk Test Stock 2',
    'valeur' => 30.0,
    'authachat' => '0',
    'down' => '0',
    'idsecteur' => 1,
    'idmarket' => 1,
]);

$resBulkNoPass = apiRequest('POST', '/admin/stocks/delete-bulk', $adminToken2, [
    'codes' => [$bulkTestStock1, $bulkTestStock2],
    'adminPassword' => '',
]);
assertTest(
    "Catalogue Actions : Rejet HTTP 400 sur suppression en masse sans mot de passe admin",
    $resBulkNoPass['code'] === 400,
    "Code: {$resBulkNoPass['code']}, Rep: {$resBulkNoPass['body']}"
);

$resBulkWrongPass = apiRequest('POST', '/admin/stocks/delete-bulk', $adminToken2, [
    'codes' => [$bulkTestStock1, $bulkTestStock2],
    'adminPassword' => 'mauvaismotdepasse123',
]);
assertTest(
    "Catalogue Actions : Rejet HTTP 403 sur suppression en masse avec mot de passe admin erroné",
    $resBulkWrongPass['code'] === 403,
    "Code: {$resBulkWrongPass['code']}, Rep: {$resBulkWrongPass['body']}"
);

// 11.12 : Suppression en masse - Validation réussie avec mot de passe admin valide
$resBulkSuccess = apiRequest('POST', '/admin/stocks/delete-bulk', $adminToken2, [
    'codes' => [$bulkTestStock1, $bulkTestStock2],
    'adminPassword' => 'demo',
]);
$checkBulk1 = apiRequest('GET', "/market/stocks/$bulkTestStock1");
$checkBulk2 = apiRequest('GET', "/market/stocks/$bulkTestStock2");
assertTest(
    "Catalogue Actions : Succès HTTP 200 sur suppression en masse validée par mot de passe admin",
    $resBulkSuccess['code'] === 200 && ($resBulkSuccess['json']['data']['deletedCount'] ?? 0) === 2 && $checkBulk1['code'] === 404 && $checkBulk2['code'] === 404,
    "Code: {$resBulkSuccess['code']}, DeletedCount: " . ($resBulkSuccess['json']['data']['deletedCount'] ?? 0) . ", Check1: {$checkBulk1['code']}, Check2: {$checkBulk2['code']}"
);

// 12. Tests Historique Boursier & Sélecteur de Périodes (/api/market/stocks/...)
echo "\n12. Tests Historique des Cotations & Périodes (/api/market/stocks/...) :\n";

// 12.1 : Consultation de l'action avec période par défaut (1m)
$resStockDefault = apiRequest('GET', '/market/stocks/12040');
$dataDefault = $resStockDefault['json']['data'] ?? [];
assertTest(
    "Historique : /market/stocks/{code} inclut l'historique et la période par défaut",
    $resStockDefault['code'] === 200 && ($dataDefault['period'] ?? '') === '1m' && is_array($dataDefault['history'] ?? null) && count($dataDefault['history']) > 2,
    "Code: {$resStockDefault['code']}, Points: " . count($dataDefault['history'] ?? [])
);

// 12.2 : Consultation avec période 1d (Jour)
$resStock1d = apiRequest('GET', '/market/stocks/12040?period=1d');
$data1d = $resStock1d['json']['data'] ?? [];
assertTest(
    "Historique : /market/stocks/{code}?period=1d retourne les cotations intraday",
    $resStock1d['code'] === 200 && ($data1d['period'] ?? '') === '1d' && count($data1d['history'] ?? []) > 0,
    "Code: {$resStock1d['code']}, Points 1d: " . count($data1d['history'] ?? [])
);

// 12.3 : Consultation de l'endpoint dédié /history avec période 1w (Semaine)
$resHistory1w = apiRequest('GET', '/market/stocks/12040/history?period=1w');
$dataHistory1w = $resHistory1w['json']['data'] ?? [];
assertTest(
    "Historique : GET /market/stocks/{code}/history?period=1w retourne les points",
    $resHistory1w['code'] === 200 && ($dataHistory1w['period'] ?? '') === '1w' && is_array($dataHistory1w['history'] ?? null) && count($dataHistory1w['history']) > 0,
    "Code: {$resHistory1w['code']}, Points 1w: " . count($dataHistory1w['history'] ?? [])
);

// 12.4 : Consultation de l'endpoint dédié /history avec période 1y (Année)
$resHistory1y = apiRequest('GET', '/market/stocks/12040/history?period=1y');
$dataHistory1y = $resHistory1y['json']['data'] ?? [];
assertTest(
    "Historique : GET /market/stocks/{code}/history?period=1y retourne les points annuels ordonnés",
    $resHistory1y['code'] === 200 && ($dataHistory1y['period'] ?? '') === '1y' && count($dataHistory1y['history'] ?? []) > 20,
    "Code: {$resHistory1y['code']}, Points 1y: " . count($dataHistory1y['history'] ?? [])
);

// Nettoyage session admin
ExecRequete("DELETE FROM session WHERE idSession = ?", $conn, [$adminToken2]);


echo "\n=== BILAN DES TESTS ===\n";
echo "Total : " . ($passed + $failed) . " tests\n";
echo "Réussis : $passed\n";
echo "Échoués : $failed\n\n";

if ($failed > 0) {
    exit(1);
}
exit(0);
