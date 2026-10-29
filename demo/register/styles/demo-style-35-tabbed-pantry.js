// Air Register Styles — Style 35 Tabbed Pantry: LOOK hooks only.
// OWNER: the style-35 assistant ONLY (this file + demo-style-35-tabbed-pantry.css). Shared files belong to the lead.
// Mockup: /workspace/ui-mockup/v3/style-35-tabbed-pantry (sale.png, payment.png, customer.png, README.md)
// Adds one decorative, non-clickable element on the register page: the keyboard legend as the white box under the list.
// Rules: no clicks/keys/API calls, never move or remove app elements; only ".st-deco" elements, all removed in off().
// Test: node tests/style-suite.js --style 35 --base 7320 --chrome 9516
// STATUS: STYLED.
'use strict';
AirStyle.register('35', {
  // the mockup shows all 42 on-screen buttons (KEYS.md) + the Quick search box + the Bulk items panel ("Touch Item");
  // the top-bar pills and Settings button are not in the mockup, so they are hidden by CSS only (their keys still work)
  buttons: ['new-sale', 'history', 'hold', 'load-hold', 'aside-put', 'aside-load', 'drawer', 'return', 'customer', 'end-of-day', 'clock-out', 'logout',
    'close', 'checkout',
    'open-item', 'reprint', 'search', 'discount', 'tax-off', 'promo', 'extra-charge', 'clear-customer',
    'gift-card', 'gift-multi', 'gift-balance', 'price-check', 'cart-search', 'note', 'calculator', 'zoom-reset',
    'qty-plus', 'qty-minus', 'qty-edit', 'remove', 'item-discount', 'cash-move', 'settings', 'local:help', 'hw',
    '#qsIn', '#bulkPanel'],
  on(ctx) {
    if (ctx.page !== 'register') return;
    const app = document.getElementById('app'); if (!app || app.querySelector('.st-deco.tp-legend')) return;
    const d = document.createElement('div'); d.className = 'st-deco tp-legend'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = 'Keys: <kbd>F2</kbd> Quick search \u00b7 <kbd>Ctrl+C</kbd> Payment (no text selected) \u00b7 <kbd>Esc / Ctrl+Shift+O</kbd> Close / back to sale \u00b7 ' +
      '<kbd>Ctrl+Alt+= / Ctrl+Alt+\u2212</kbd> \u00b7 <kbd>Ctrl++ / Ctrl+_</kbd> Zoom \u00b7 <kbd>Ctrl+Shift+Q</kbd> Exit';
    app.appendChild(d);
  },
  off() { document.querySelectorAll('.st-deco.tp-legend').forEach(e => e.remove()); },
});
