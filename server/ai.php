<?php
declare(strict_types=1);

// Secrets come only from private server configuration, never from the request.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function fail(int $status): void {
    reply($status, ['error' => 'AI request could not be completed.']);
}
function textInput(array $input, string $field): string {
    $value = $input[$field] ?? null;
    if (!is_string($value) || trim($value) === '' || strlen($value) > 1500) fail(400);
    return trim($value);
}
function countInput(array $input, int $default, int $max): int {
    $value = $input['count'] ?? $default;
    if (!is_int($value) || $value < 1 || $value > $max) fail(400);
    return $value;
}
function isColor($color): bool {
    return is_string($color) && preg_match('/^#[a-fA-F0-9]{6}$/D', $color) === 1;
}
function isPalette($value, int $count): bool {
    return is_array($value) && array_is_list($value) && count($value) === $count
        && count(array_filter($value, 'isColor')) === $count;
}
function limitSetting(string $name, int $default): int {
    $value = getenv($name);
    if ($value === false || $value === '') return $default;
    if (!ctype_digit($value) || (int)$value < 1) fail(503);
    return (int)$value;
}

// Locked shared counters reserve quota BEFORE contacting OpenAI, including failures.
function reserveQuota(): void {
    $dir = realpath(getenv('CHROMAFORGE_AI_STATE_DIR') ?: '');
    $root = realpath($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__));
    $app = realpath(dirname(__DIR__));
    if (!$dir || !$root || !$app || !is_writable($dir)) fail(503);
    foreach ([$root, $app] as $public) {
        $prefix = strtolower(str_replace('\\', '/', $public)) . '/';
        $path = strtolower(str_replace('\\', '/', $dir)) . '/';
        if (str_starts_with($path, $prefix)) fail(503);
    }
    $limits = [limitSetting('CHROMAFORGE_AI_IP_PER_MINUTE', 10),
        limitSetting('CHROMAFORGE_AI_IP_PER_DAY', 30), limitSetting('CHROMAFORGE_AI_GLOBAL_PER_DAY', 200)];
    $handle = @fopen($dir . '/ai-quota.json', 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) fail(503);
    $raw = stream_get_contents($handle);
    $state = $raw === '' ? [] : json_decode($raw, true);
    if (!is_array($state)) fail(503);
    $now = time();
    $day = gmdate('Y-m-d', $now);
    if (($state['day'] ?? '') !== $day) $state = ['day' => $day, 'total' => 0, 'ips' => []];
    // Do not trust spoofable X-Forwarded-For headers. Configure the web server's trusted proxy handling.
    $ip = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $minute = intdiv($now, 60);
    $entry = $state['ips'][$ip] ?? ['day' => 0, 'minute' => $minute, 'count' => 0];
    if ($entry['minute'] !== $minute) { $entry['minute'] = $minute; $entry['count'] = 0; }
    if ($entry['count'] >= $limits[0] || $entry['day'] >= $limits[1] || $state['total'] >= $limits[2]) {
        header('Retry-After: ' . (($entry['day'] >= $limits[1] || $state['total'] >= $limits[2]) ? (86400 - $now % 86400) : (60 - $now % 60)));
        flock($handle, LOCK_UN); fclose($handle); fail(429);
    }
    $entry['count']++; $entry['day']++; $state['total']++;
    $state['ips'][$ip] = $entry;
    $encoded = json_encode($state);
    rewind($handle);
    if (!ftruncate($handle, 0) || fwrite($handle, $encoded) !== strlen($encoded) || !fflush($handle)) fail(503);
    flock($handle, LOCK_UN); fclose($handle);
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Allow: POST'); fail(405); }
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') fail(403);
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') fail(415);
    $raw = file_get_contents('php://input', false, null, 0, 8193);
    if ($raw === false || strlen($raw) > 8192) fail(413);
    $input = json_decode($raw, true);
    if (!is_array($input)) fail(400);
    $action = $input['action'] ?? null;
    if ($action === 'palette') {
        $count = countInput($input, 5, 12);
        $prompt = textInput($input, 'prompt');
        $system = "Generate exactly $count harmonious hex colors. Return ONLY a JSON array of six-digit hex strings.";
        $user = 'Palette for: ' . $prompt;
        $tokens = 300;
    } elseif ($action === 'variations') {
        $count = countInput($input, 3, 3);
        $base = $input['baseColors'] ?? null;
        if (!is_array($base) || count($base) < 1 || count($base) > 12 || !isPalette($base, count($base))) fail(400);
        $size = count($base);
        $system = "Suggest $count palette variations of $size colors each. Return ONLY a JSON array of arrays of six-digit hex strings.";
        $user = 'Base colors: ' . json_encode($base);
        $tokens = 1024;
    } elseif ($action === 'brand') {
        $user = 'Brand for: ' . textInput($input, 'industry') . ', Style: ' . textInput($input, 'style') . ', Mood: ' . textInput($input, 'mood');
        $system = 'Generate brand colors. Return ONLY JSON with primary, secondary, accent, background (six-digit hex strings), name (plain text, max 80 characters) and description (plain text, max 600 characters).';
        $tokens = 500;
    } else { fail(400); }

    require_once __DIR__ . '/environment.php';
    loadPrivateEnvironment();
    $key = getenv('OPENAI_API_KEY') ?: '';
    if (!$key || $key === 'YOUR_OPENAI_API_KEY_HERE' || preg_match('/\s/', $key) || !function_exists('curl_init')) fail(503);
    reserveQuota();
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
        CURLOPT_POSTFIELDS => json_encode(['model' => getenv('OPENAI_MODEL') ?: 'gpt-4o-mini',
            'messages' => [['role' => 'system', 'content' => $system], ['role' => 'user', 'content' => $user]],
            'max_tokens' => $tokens, 'temperature' => 0.8, 'store' => false]),
        CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 35,
        CURLOPT_FOLLOWLOCATION => false, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    // Never relay provider errors, headers, or credentials to the browser.
    if ($response === false || $status !== 200) fail(502);
    $envelope = json_decode($response, true);
    $content = $envelope['choices'][0]['message']['content'] ?? null;
    if (!is_string($content)) fail(502);
    $data = json_decode(trim(preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($content))), true);
    if ($action === 'palette' && !isPalette($data, $count)) fail(502);
    if ($action === 'variations') {
        if (!is_array($data) || !array_is_list($data) || count($data) !== $count) fail(502);
        foreach ($data as $palette) if (!isPalette($palette, $size)) fail(502);
    }
    if ($action === 'brand') {
        if (!is_array($data)) fail(502);
        $clean = [];
        foreach (['primary', 'secondary', 'accent', 'background'] as $field) {
            if (!isColor($data[$field] ?? null)) fail(502);
            $clean[$field] = $data[$field];
        }
        foreach (['name' => 80, 'description' => 600] as $field => $max) {
            if (!isset($data[$field]) || !is_string($data[$field]) || strlen($data[$field]) > $max) fail(502);
            // The existing board renders these strings into HTML templates.
            $clean[$field] = htmlspecialchars($data[$field], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }
        $data = $clean;
    }
    reply(200, ['data' => $data]);
} catch (Throwable $error) {
    fail(503);
}
