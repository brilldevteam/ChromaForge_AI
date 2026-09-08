<?php
/**
 * ChromaForge AI — Envato License Verification
 * 
 * SETUP:
 * 1. Get token: build.envato.com/create-token/
 *    Permissions: "Verify Purchases of Your Items"
 * 2. Set ENVATO_PERSONAL_TOKEN below
 * 3. Set ENVATO_ITEM_ID to your CodeCanyon item ID
 */

define('ENVATO_PERSONAL_TOKEN', 'YOUR_ENVATO_PERSONAL_TOKEN_HERE');
define('ENVATO_ITEM_ID', 'YOUR_CODECANYON_ITEM_ID_HERE');
define('LICENSES_FILE', __DIR__ . '/licenses.json');
define('MAX_DOMAINS_PER_LICENSE', 1);
define('ENABLE_DOMAIN_LOCK', true);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { echo json_encode(['valid' => false, 'error' => 'POST required']); exit; }

$input = json_decode(file_get_contents('php://input'), true);
$code = trim($input['purchase_code'] ?? '');
$domain = trim($input['domain'] ?? '');

if (empty($code)) { echo json_encode(['valid' => false, 'error' => 'Purchase code required']); exit; }
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $code)) {
    echo json_encode(['valid' => false, 'error' => 'Invalid format']); exit;
}

// Verify with Envato API
function verifyEnvato($code) {
    if (ENVATO_PERSONAL_TOKEN === 'YOUR_ENVATO_PERSONAL_TOKEN_HERE') {
        return ['valid' => true, 'item_id' => ENVATO_ITEM_ID, 'license' => 'Regular License', 'dev_mode' => true];
    }
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => "https://api.envato.com/v3/market/author/sale?code=" . urlencode($code),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . ENVATO_PERSONAL_TOKEN, 'User-Agent: ChromaForge/1.0'],
        CURLOPT_TIMEOUT => 15, CURLOPT_SSL_VERIFYPEER => true
    ]);
    $resp = curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($err) return ['valid' => false, 'error' => 'Connection failed'];
    if ($http === 404) return ['valid' => false, 'error' => 'Invalid purchase code'];
    if ($http !== 200) return ['valid' => false, 'error' => 'API error (HTTP ' . $http . ')'];
    $data = json_decode($resp, true);
    if (!$data) return ['valid' => false, 'error' => 'Invalid response'];
    $itemId = $data['item']['id'] ?? '';
    if (ENVATO_ITEM_ID !== 'YOUR_CODECANYON_ITEM_ID_HERE' && (string)$itemId !== ENVATO_ITEM_ID) {
        return ['valid' => false, 'error' => 'Code is for a different product'];
    }
    return ['valid' => true, 'item_id' => $itemId, 'license' => $data['license'] ?? 'Regular License',
            'buyer' => $data['buyer'] ?? '', 'sold_at' => $data['sold_at'] ?? ''];
}

// Domain lock
function checkDomain($code, $domain, $max) {
    if (!ENABLE_DOMAIN_LOCK || empty($domain)) return true;
    $lics = file_exists(LICENSES_FILE) ? json_decode(file_get_contents(LICENSES_FILE), true) ?: [] : [];
    $hash = md5($code);
    if (!isset($lics[$hash])) {
        $lics[$hash] = ['domains' => [$domain], 'activated' => date('Y-m-d H:i:s'), 'last' => date('Y-m-d H:i:s')];
        file_put_contents(LICENSES_FILE, json_encode($lics, JSON_PRETTY_PRINT)); return true;
    }
    $domains = $lics[$hash]['domains'] ?? [];
    if (in_array($domain, $domains)) { $lics[$hash]['last'] = date('Y-m-d H:i:s'); file_put_contents(LICENSES_FILE, json_encode($lics, JSON_PRETTY_PRINT)); return true; }
    if (count($domains) >= $max) return false;
    $lics[$hash]['domains'][] = $domain; $lics[$hash]['last'] = date('Y-m-d H:i:s');
    file_put_contents(LICENSES_FILE, json_encode($lics, JSON_PRETTY_PRINT)); return true;
}

$result = verifyEnvato($code);
if (!$result['valid']) { echo json_encode($result); exit; }

$maxDom = (stripos($result['license'] ?? '', 'extended') !== false) ? 5 : MAX_DOMAINS_PER_LICENSE;
if (!checkDomain($code, $domain, $maxDom)) {
    echo json_encode(['valid' => false, 'error' => 'License active on another domain. Max ' . $maxDom . ' domain(s). Contact support to transfer.']); exit;
}

echo json_encode(['valid' => true, 'license' => $result['license'] ?? 'Regular', 'domain' => $domain, 'message' => 'License verified']);
