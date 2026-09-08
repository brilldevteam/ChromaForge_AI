/**
 * ============================================================
 *  CHROMAFORGE AI — MASTER CONFIGURATION v1.0.0
 * ============================================================
 *  Public settings only. Never place secrets in this file.
 *  
 *  1. Set your Envato Purchase Code (required)
 *  2. Configure AI on the server (see AI_SETUP.md)
 *  3. Customize white-label branding
 *  4. Upload to your server
 * ============================================================
 */

const CHROMAFORGE_CONFIG = {

    // ================================================================
    // 1. LICENSE — Envato Purchase Code (REQUIRED)
    // ================================================================
    // Get your code: codecanyon.net > Downloads > License Certificate
    // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    
    LICENSE_KEY: 'YOUR_PURCHASE_CODE_HERE',

    // Your domain (for license binding)
    // e.g. 'mysite.com' or 'tools.mysite.com'
    LICENSED_DOMAIN: '',

    // Verification endpoint (points to included verify.php)
    VERIFY_ENDPOINT: 'server/verify.php',


    // ================================================================
    // 2. OPENAI — AI Features (OPTIONAL)
    // ================================================================
    // Relative to js/core.min.js; works under a subdirectory too.
    // The private key and model are configured on the PHP server.
    AI_ENDPOINT: '../server/ai.php',


    // ================================================================
    // 3. WHITE-LABEL — Customize Your Branding
    // ================================================================

    APP_NAME: 'ChromaForge AI',
    APP_TAGLINE: 'AI-Powered Color Intelligence',
    AUTHOR_NAME: 'Your Company',
    CONTACT_EMAIL: '',
    
    // Logo: leave empty for text logo, or set path e.g. 'assets/logo.svg'
    CUSTOM_LOGO_URL: '',
    FAVICON_URL: '',
    
    // Brand colors (affects buttons, gradients, accents)
    PRIMARY_COLOR: '#6366f1',
    SECONDARY_COLOR: '#ec4899',
    
    // Footer
    SHOW_POWERED_BY: true,
    CUSTOM_FOOTER_TEXT: '',
    
    // Social links (empty = hidden)
    SOCIAL_GITHUB: '',
    SOCIAL_TWITTER: '',
    SOCIAL_INSTAGRAM: '',
    SOCIAL_WEBSITE: '',


    // ================================================================
    // 4. APP SETTINGS
    // ================================================================
    
    APP_VERSION: '1.0.0',
    MAX_IMAGE_SIZE_MB: 5,
    DEFAULT_PALETTE_COUNT: 5,
    MAX_PALETTE_COUNT: 12,
    EXPORT_QUALITY: 0.95,
    PDF_DPI: 300,

    // Feature toggles (set false to hide from landing page)
    ENABLE_AI_FEATURES: true,
    ENABLE_BRAND_BOARD: true,
    ENABLE_IMAGE_PALETTE: true,
    ENABLE_GRADIENT_STUDIO: true,
    ENABLE_CONTRAST_CHECKER: true,
    ENABLE_COLOR_INSPECTOR: true,
    ENABLE_EXPORT_CENTER: true,
};

Object.freeze(CHROMAFORGE_CONFIG);
