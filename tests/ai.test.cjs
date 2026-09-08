const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'chromaforge-test-'));
const children = [];
const fakeKey = 'TEST-SECRET-NOT-A-REAL-KEY';
async function start(env, mock) {
    const port = await new Promise(resolve => {
        const socket = net.createServer();
        socket.listen(0, '127.0.0.1', () => { const p = socket.address().port; socket.close(() => resolve(p)); });
    });
    const args = mock ? ['-n', '-d', `auto_prepend_file=${path.join(temp, 'provider.php')}`] : [];
    const child = spawn('php', [...args, '-S', `127.0.0.1:${port}`, '-t', root, path.join(root, 'router.php')], {
        cwd: root, env: { ...process.env, OPENAI_API_KEY: '', CHROMAFORGE_ENV_FILE: path.join(temp, 'disabled.env'), ...env }, stdio: 'ignore', windowsHide: true
    });
    children.push(child);
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 100; i++) {
        try { await fetch(url); return url; } catch { await new Promise(r => setTimeout(r, 50)); }
    }
    throw new Error('PHP server did not start');
}
async function request(url, body, expected, extra = {}) {
    const response = await fetch(url + '/server/ai.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body)
    });
    const raw = await response.text();
    assert.equal(response.status, expected, raw);
    assert.ok(!raw.includes(fakeKey), 'Secret must never reach client');
    return JSON.parse(raw);
}
async function main() {
    const lint = spawnSync('php', ['-l', 'server/ai.php'], { cwd: root, encoding: 'utf8' });
    assert.equal(lint.status, 0, lint.stdout + lint.stderr);
    // Parse every existing script and inline page script to catch accidental syntax damage.
    for (const file of fs.readdirSync(path.join(root, 'js'))) {
        if (file.endsWith('.js')) new vm.Script(fs.readFileSync(path.join(root, 'js', file), 'utf8'));
    }
    for (const file of ['index.html', ...fs.readdirSync(path.join(root, 'pages')).map(f => 'pages/' + f)]) {
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
    }
    const source = fs.readFileSync(path.join(root, 'js/core.min.js'), 'utf8');
    const config = fs.readFileSync(path.join(root, 'js/config.js'), 'utf8');
    assert.ok(!/OPENAI_API_KEY|api\.openai\.com|Authorization/.test(source + config));
    let sent;
    const context = vm.createContext({ window: {}, document: { currentScript: { src: 'https://example.test/tools/js/core.min.js' } },
        location: { origin: 'https://example.test', protocol: 'https:' }, URL, AbortController, setTimeout, clearTimeout,
        fetch: async (url, options) => { sent = { url, options }; return { ok: true, status: 200, json: async () => ({ data: ['#123456'] }) }; }
    });
    vm.runInContext(config + '\n' + source, context);
    const engine = context.window.CFAIEngine;
    assert.equal(engine.isConfigured(), true);
    assert.equal(typeof context.window.CFUtils.toggleTheme, 'function');
    await engine.generatePalette('Ocean', 1);
    assert.equal(sent.url, 'https://example.test/tools/server/ai.php');
    assert.deepEqual(JSON.parse(sent.options.body), { action: 'palette', prompt: 'Ocean', count: 1 });
    assert.equal(sent.options.headers.Authorization, undefined);
    await engine.suggestVariations(['#123456']);
    assert.equal(JSON.parse(sent.options.body).action, 'variations');
    await engine.generateBrandColors('Shop', 'modern', 'calm');
    assert.equal(JSON.parse(sent.options.body).action, 'brand');
    context.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: fakeKey }) });
    await assert.rejects(engine.generatePalette('Ocean'), /usage limit/);
    context.location.protocol = 'file:';
    assert.equal(engine.isConfigured(), false);

    fs.writeFileSync(path.join(temp, 'disabled.env'), 'OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE');
    const missing = await start({}, false);
    for (const route of ['/.env', '/%2eenv', '/.env.example', '/.env.bak', '/.git/config', '/server/licenses.json']) {
        const response = await fetch(missing + route);
        assert.equal(response.status, 404, route);
        assert.equal(await response.text(), 'Not found');
    }
    for (const route of ['/index.html', '/pages/palette-ai.html', '/js/core.min.js', '/css/style.css']) assert.equal((await fetch(missing + route)).status, 200);
    assert.equal((await fetch(missing + '/server/ai.php')).status, 405);
    await request(missing, { action: 'palette', prompt: 'Ocean' }, 503);
    await request(missing, { action: 'anything' }, 400);
    await request(missing, { action: 'palette', prompt: 'Ocean', count: 99 }, 400);
    await request(missing, { action: 'palette', prompt: 'Ocean' }, 403, { 'Sec-Fetch-Site': 'cross-site' });
    await request(missing, { action: 'palette', prompt: 'x'.repeat(9000) }, 413);
    await request(missing, { action: 'palette', prompt: 'Ocean' }, 415, { 'Content-Type': 'text/plain' });

    // PHP -n has no cURL extension. These stubs verify the production request contract without network access.
    fs.writeFileSync(path.join(temp, 'provider.php'), `<?php
foreach (['CURLOPT_POST','CURLOPT_RETURNTRANSFER','CURLOPT_HTTPHEADER','CURLOPT_POSTFIELDS','CURLOPT_CONNECTTIMEOUT','CURLOPT_TIMEOUT','CURLOPT_FOLLOWLOCATION','CURLOPT_SSL_VERIFYPEER','CURLOPT_SSL_VERIFYHOST','CURLINFO_HTTP_CODE'] as $i => $name) define($name, $i + 1);
function curl_init($url) { if ($url !== 'https://api.openai.com/v1/chat/completions') throw new Exception('Wrong destination'); return new stdClass(); }
function curl_setopt_array($ch, $options) { $ch->options = $options; }
function curl_exec($ch) {
    $o = $ch->options;
    if (!in_array('Authorization: Bearer ' . getenv('OPENAI_API_KEY'), $o[CURLOPT_HTTPHEADER], true)) throw new Exception('Missing authorization');
    $p = json_decode($o[CURLOPT_POSTFIELDS], true);
    if ($p['model'] !== 'gpt-4o-mini' || $p['max_tokens'] > 1024 || $p['store'] !== false) throw new Exception('Unsafe request');
    $system = $p['messages'][0]['content']; $user = $p['messages'][1]['content'];
    $ch->status = 200;
    if (str_contains($user, 'PROVIDER_ERROR')) { $ch->status = 401; return json_encode(['error' => getenv('OPENAI_API_KEY')]); }
    if (str_contains($user, 'INVALID_OUTPUT')) $data = ['<script>'];
    elseif (str_contains($system, 'Generate brand')) $data = ['primary'=>'#123456','secondary'=>'#234567','accent'=>'#345678','background'=>'#ffffff','name'=>'<img src=x onerror=alert(1)>','description'=>'A calm brand'];
    elseif (str_contains($system, 'variations')) $data = [['#123456'],['#234567'],['#345678']];
    else $data = ['#123456'];
    return json_encode(['choices'=>[['message'=>['content'=>json_encode($data)]]]]);
}
function curl_getinfo($ch, $option) { return $ch->status; }
function curl_close($ch) {}
`);
    const hosted = await start({ OPENAI_API_KEY: fakeKey, CHROMAFORGE_AI_STATE_DIR: temp, CHROMAFORGE_AI_GLOBAL_PER_DAY: '5' }, true);
    const result = await request(hosted, { action: 'palette', prompt: 'Ocean', count: 1, model: 'ignored', max_tokens: 999999 }, 200);
    assert.deepEqual(result.data, ['#123456']);
    const brand = await request(hosted, { action: 'brand', industry: 'Shop', style: 'modern', mood: 'calm' }, 200);
    assert.ok(!brand.data.name.includes('<img'));
    assert.ok(brand.data.name.includes('&lt;img'));
    const variations = await request(hosted, { action: 'variations', baseColors: ['#123456'] }, 200);
    assert.equal(variations.data.length, 3);
    await request(hosted, { action: 'palette', prompt: 'INVALID_OUTPUT', count: 1 }, 502);
    await request(hosted, { action: 'palette', prompt: 'PROVIDER_ERROR', count: 1 }, 502);
    await request(hosted, { action: 'palette', prompt: 'Ocean', count: 1 }, 429);
    assert.equal(JSON.parse(fs.readFileSync(path.join(temp, 'ai-quota.json'))).total, 5);
    const unsafe = await start({ OPENAI_API_KEY: fakeKey, CHROMAFORGE_AI_STATE_DIR: root }, true);
    await request(unsafe, { action: 'palette', prompt: 'Ocean', count: 1 }, 503);
    for (const variable of ['CHROMAFORGE_AI_IP_PER_MINUTE', 'CHROMAFORGE_AI_IP_PER_DAY']) {
        const stateDir = fs.mkdtempSync(path.join(temp, 'quota-'));
        const limited = await start({ OPENAI_API_KEY: fakeKey, CHROMAFORGE_AI_STATE_DIR: stateDir, [variable]: '1' }, true);
        await request(limited, { action: 'palette', prompt: 'Ocean', count: 1 }, 200);
        await request(limited, { action: 'palette', prompt: 'Ocean', count: 1 }, 429);
    }
    fs.writeFileSync(path.join(temp, 'ai-quota.json'), 'corrupted');
    await request(hosted, { action: 'palette', prompt: 'Ocean', count: 1 }, 503);
    const privateDir = fs.mkdtempSync(path.join(temp, 'env-'));
    const envFile = path.join(privateDir, '.env');
    const template = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    fs.writeFileSync(envFile, template);
    const fromFile = await start({ CHROMAFORGE_ENV_FILE: envFile, CHROMAFORGE_AI_STATE_DIR: '' }, true);
    await request(fromFile, { action: 'palette', prompt: 'Ocean', count: 1 }, 503);
    fs.writeFileSync(envFile, template.replace('YOUR_OPENAI_API_KEY_HERE', '"' + fakeKey + '"'));
    await request(fromFile, { action: 'palette', prompt: 'Ocean', count: 1 }, 200);
    assert.equal(JSON.parse(fs.readFileSync(path.join(privateDir, 'ai-quota.json'))).total, 1);
    fs.writeFileSync(envFile, template.replace('YOUR_OPENAI_API_KEY_HERE', fakeKey).replace('gpt-4o-mini', 'ignored-file-model'));
    const precedence = await start({ CHROMAFORGE_ENV_FILE: envFile, OPENAI_MODEL: 'gpt-4o-mini', CHROMAFORGE_AI_STATE_DIR: '' }, true);
    await request(precedence, { action: 'palette', prompt: 'Ocean', count: 1 }, 200);
    const publicConfig = await start({ CHROMAFORGE_ENV_FILE: path.join(root, '.env.example') }, true);
    await request(publicConfig, { action: 'palette', prompt: 'Ocean', count: 1 }, 503);
    const missingConfig = await start({ CHROMAFORGE_ENV_FILE: path.join(temp, 'missing.env') }, true);
    await request(missingConfig, { action: 'palette', prompt: 'Ocean', count: 1 }, 503);
    console.log('PASS: private .env loading, placeholder handling, automatic quota directory, environment precedence, public/missing config rejection.');
    console.log('PASS: syntax, frontend contracts, private configuration, request validation, all AI actions, sanitized errors/output, global/IP quotas, corrupt and unsafe storage rejection. No paid API calls.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
    await Promise.all(children.map(child => new Promise(resolve => { child.once('exit', resolve); child.kill(); })));
    const resolved = path.resolve(temp);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('chromaforge-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
});
