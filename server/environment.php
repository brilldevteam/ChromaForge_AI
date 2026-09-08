<?php
declare(strict_types=1);

// Root .env is server-only: use router.php locally and the supplied NGINX rules on CloudPanel.
function loadPrivateEnvironment(): void {
    $app = dirname(__DIR__);
    $configured = getenv('CHROMAFORGE_ENV_FILE');
    $legacyDir = dirname($app) . '/' . basename($app) . '-private';
    $candidate = $configured ?: (is_file($app . '/.env') ? $app . '/.env' : $legacyDir . '/.env');
    if (!file_exists($candidate)) {
        if ($configured) throw new RuntimeException('Private configuration unavailable');
        return; // Existing PHP process environment configuration remains supported.
    }
    $file = realpath($candidate);
    $root = realpath($_SERVER['DOCUMENT_ROOT'] ?? $app);
    if (!$file || !$root || !is_file($file) || !is_readable($file)) throw new RuntimeException('Private configuration unavailable');
    foreach ([$root, $app] as $public) {
        $prefix = strtolower(str_replace('\\', '/', $public)) . '/';
        if ($file !== realpath($app . '/.env') && str_starts_with(strtolower(str_replace('\\', '/', $file)), $prefix)) {
            throw new RuntimeException('Configuration must be outside the public directory');
        }
    }
    $allowed = ['OPENAI_API_KEY', 'OPENAI_MODEL', 'CHROMAFORGE_AI_STATE_DIR',
        'CHROMAFORGE_AI_IP_PER_MINUTE', 'CHROMAFORGE_AI_IP_PER_DAY', 'CHROMAFORGE_AI_GLOBAL_PER_DAY'];
    $raw = file_get_contents($file, false, null, 0, 16385);
    if ($raw === false || strlen($raw) > 16384) throw new RuntimeException('Invalid private configuration');
    $values = [];
    foreach (preg_split('/\r\n|\n|\r/', $raw) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!preg_match('/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/D', $line, $match)) throw new RuntimeException('Invalid private configuration');
        [$all, $name, $value] = $match;
        if (!in_array($name, $allowed, true)) throw new RuntimeException('Unsupported private setting');
        if ($value !== '' && ($value[0] === '"' || $value[0] === "'")) {
            if (strlen($value) < 2 || substr($value, -1) !== $value[0]) throw new RuntimeException('Invalid quoted value');
            $value = substr($value, 1, -1);
        }
        if (str_contains($value, "\0")) throw new RuntimeException('Invalid private configuration');
        $values[$name] = $value;
    }
    // No evaluation, shell expansion, or interpolation; nonempty process variables win.
    foreach ($values as $name => $value) {
        if ((getenv($name) === false || getenv($name) === '') && $value !== '') putenv($name . '=' . $value);
    }
    if (!getenv('CHROMAFORGE_AI_STATE_DIR')) {
        $state = $file === realpath($app . '/.env') ? $legacyDir : dirname($file);
        if (!is_dir($state) && !mkdir($state, 0700, true)) throw new RuntimeException('Quota directory unavailable');
        putenv('CHROMAFORGE_AI_STATE_DIR=' . $state);
    }
}
