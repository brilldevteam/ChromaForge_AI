<?php
// Development server: php -S 127.0.0.1:8000 router.php
// Only public application assets and the two application endpoints are routable.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$path = str_replace('\\', '/', $path);
$file = realpath(__DIR__ . $path);
if ($path === '/') $file = realpath(__DIR__ . '/index.html');
$root = str_replace('\\', '/', __DIR__) . '/';
$resolved = $file ? str_replace('\\', '/', $file) : '';
$relative = str_starts_with($resolved, $root) ? substr($resolved, strlen($root)) : '';
$allowed = $relative === 'index.html'
    || in_array($relative, ['server/ai.php', 'server/verify.php'], true)
    || preg_match('~^(?:pages|css|js|assets)/[a-zA-Z0-9_./-]+\.(?:html|css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$~D', $relative);
if (!$file || !is_file($file) || !$allowed || preg_match('~(?:^|/)\.~', $path)) {
    http_response_code(404);
    header('Content-Type: text/plain');
    header('Cache-Control: no-store');
    echo 'Not found';
    return true;
}
return false;
