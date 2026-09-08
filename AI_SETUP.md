# AI setup

The API key lives in .env beside index.html. PHP reads it and contacts OpenAI. The browser only calls server/ai.php; it receives neither the key nor OpenAI authorization headers.

## Local use

1. Copy .env.example to .env if .env does not exist. Put your real key in OPENAI_API_KEY in .env. Leave your existing .env alone if already configured.
2. Stop the old PHP server with Ctrl+C, then run from the application folder:

    php -S 127.0.0.1:8000 router.php

3. Open http://127.0.0.1:8000. The router blocks .env and other non-public files. Keep router.php in the command: a plain PHP static server does not apply .htaccess rules.
4. http://127.0.0.1:8000/.env must return 404, never the file contents.

PHP's router behavior: https://www.php.net/manual/en/features.commandline.webserver.php

## Hostinger CloudPanel

Use a PHP site with PHP 8.1+ and cURL. Keep .env in the application root with index.html, readable by the site's PHP user (Linux file mode 0600).

Before uploading the real .env, paste the rules from server/cloudpanel-security.conf inside each server block serving the app in CloudPanel's Vhost Editor, before existing regex location blocks. Save, then verify /.env and /.env.example return 403 or 404 over HTTPS. CloudPanel uses NGINX; the included Apache .htaccess does not configure NGINX. These server rules have been prepared locally, not applied to your host.

CloudPanel Vhost Editor: https://www.cloudpanel.io/docs/v2/frontend-area/vhost/

## Settings

.env.example lists the key, model, and adjustable request limits. Leave CHROMAFORGE_AI_STATE_DIR blank to keep quota counters in the automatically created application-name-private sibling folder. This folder now holds usage counters, not the root .env. Existing counters are preserved. PHP needs write permission on that folder.

Existing nonempty PHP process variables override .env values. CHROMAFORGE_ENV_FILE can select a different private configuration file. The old sibling .env location remains a fallback only when the root .env is absent.

The loader accepts NAME=value, optional matching quotes, blank lines, and full-line # comments. Values are literal; no interpolation, shell commands, or inline comments. Keep secrets out of JavaScript and .env.example. .gitignore excludes real .env files from Git; HTTP access is blocked by the router or hosting rules above.

## Free-tool usage controls

Defaults are 10 AI attempts per IP per minute, 30 per IP per UTC day, and 200 total per UTC day. Configure positive integer environment variables `CHROMAFORGE_AI_IP_PER_MINUTE`, `CHROMAFORGE_AI_IP_PER_DAY`, and `CHROMAFORGE_AI_GLOBAL_PER_DAY` to adjust these. Valid attempts, including provider failures, consume quota. Daily counters reset at midnight UTC. Keep the state directory persistent: deleting it resets quotas.

These are request caps, not an exact currency budget. You pay the model's input/output token costs. Visitors cannot supply arbitrary messages, model names, output limits, or destination URLs. Requests and output are bounded and validated. The key and provider error details are never returned to the frontend.

The endpoint is intentionally available to anonymous clients. Rate limits reduce abuse but do not authenticate visitors; automated users can exhaust the shared daily quota. Multiple clients behind one IP share a quota. With a reverse proxy/CDN, configure trusted real-client-IP handling on the web server; the PHP endpoint intentionally ignores forwarded headers. For multiple servers, use a shared atomic quota store before scaling (the supplied file lock is intended for one server).

Missing key or unusable quota storage disables AI safely. Existing manual tools remain available; AI Palette keeps its random-palette fallback. Existing branding, export tools, and purchase licensing remain in place.

OpenAI guidance: https://developers.openai.com/api/reference/overview

## Local verification

Run `node tests/ai.test.cjs`. Tests use a local PHP server and a mocked provider, never a real API key or paid request. Live provider access and visual browser QA must still be checked on your host.
