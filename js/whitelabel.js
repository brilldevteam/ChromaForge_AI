/**
 * ChromaForge AI — White-Label Engine
 * Reads CHROMAFORGE_CONFIG and applies branding across the app.
 */
const CFWhiteLabel = (() => {
    function apply() {
        const C = typeof CHROMAFORGE_CONFIG !== 'undefined' ? CHROMAFORGE_CONFIG : {};
        const root = document.documentElement;
        if (C.PRIMARY_COLOR) {
            const s = document.createElement('style');
            s.textContent = `.gradient-text{background:linear-gradient(135deg,${C.PRIMARY_COLOR},${C.SECONDARY_COLOR||'#ec4899'},#f59e0b)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important}.from-brand-500{--tw-gradient-from:${C.PRIMARY_COLOR}!important}.bg-brand-500{background-color:${C.PRIMARY_COLOR}!important}.text-brand-500{color:${C.PRIMARY_COLOR}!important}.border-brand-500{border-color:${C.PRIMARY_COLOR}!important}.hover\\:text-brand-500:hover{color:${C.PRIMARY_COLOR}!important}.hover\\:border-brand-500:hover{border-color:${C.PRIMARY_COLOR}!important}`;
            document.head.appendChild(s);
        }
        if (C.FAVICON_URL) {
            let link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon'; link.rel = 'shortcut icon'; link.href = C.FAVICON_URL;
            document.head.appendChild(link);
        }
        if (C.CUSTOM_LOGO_URL) {
            document.querySelectorAll('[data-cf-logo]').forEach(el => {
                el.innerHTML = `<img src="${C.CUSTOM_LOGO_URL}" alt="${C.APP_NAME}" style="max-height:32px;width:auto">`;
            });
        }
        if (C.APP_NAME && C.APP_NAME !== 'ChromaForge AI') {
            document.querySelectorAll('[data-cf-appname]').forEach(el => el.textContent = C.APP_NAME);
            document.title = document.title.replace('ChromaForge AI', C.APP_NAME);
        }
        document.querySelectorAll('[data-cf-footer]').forEach(el => {
            let html = C.CUSTOM_FOOTER_TEXT || `&copy; ${new Date().getFullYear()} ${C.APP_NAME || 'ChromaForge AI'}. All Rights Reserved.${C.AUTHOR_NAME ? ' &middot; ' + C.AUTHOR_NAME : ''}`;
            if (C.SHOW_POWERED_BY) html += ' <span style="opacity:0.5">| Powered by ChromaForge</span>';
            el.innerHTML = html;
        });
        const featureMap = {
            'ENABLE_AI_FEATURES': '[data-cf-feature="ai"]',
            'ENABLE_BRAND_BOARD': '[data-cf-feature="brand-board"]',
            'ENABLE_IMAGE_PALETTE': '[data-cf-feature="image-palette"]',
            'ENABLE_GRADIENT_STUDIO': '[data-cf-feature="gradient"]',
            'ENABLE_CONTRAST_CHECKER': '[data-cf-feature="contrast"]',
            'ENABLE_COLOR_INSPECTOR': '[data-cf-feature="inspector"]',
            'ENABLE_EXPORT_CENTER': '[data-cf-feature="export"]'
        };
        Object.keys(featureMap).forEach(key => {
            if (C[key] === false) document.querySelectorAll(featureMap[key]).forEach(el => el.style.display = 'none');
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
    else apply();
    return { apply };
})();
