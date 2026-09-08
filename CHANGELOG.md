# Changelog

## 2026-09-08

- Updated configuration to prefer `.env` beside `index.html`, as requested. Added a local PHP router that blocks secret-file downloads, Apache protection, and CloudPanel NGINX rules to apply before deployment. Verified root configuration loading, blocked HTTP access to `.env`, and existing AI tests. CloudPanel rules have not been applied remotely.

- Added `.env.example` and a private `.env` loader with CloudPanel setup instructions. The default file lives in an application-name-private sibling directory; files inside the public directory are rejected. Verified private-file loading, placeholder behavior, environment precedence, and path rejection with mocked AI requests.

- Moved all three AI operations from direct browser requests to a same-site PHP endpoint; removed public API-key and model configuration.
- Kept existing `CFAIEngine` methods, general utilities, page layouts, manual tools, exports, branding, and licensing integration.
- Added private PHP environment configuration, bounded operation-specific prompts, output validation, generic errors, timeouts, and atomic per-IP/global request quotas.
- Added setup instructions and automated tests using a mocked provider. PHP/JavaScript syntax and AI request/response/error/quota checks pass locally. Real-key activation, live deployment, and visual browser QA remain to be completed on the hosting server.
