// Air Register Styles — Style 37 Maroon Console: LOOK hooks only.
// OWNER: the style-37 assistant ONLY (this file + demo-style-37-maroon-console.css). Shared files belong to the lead.
// Mockup: /workspace/ui-mockup/v3/style-37-maroon-console (sale.png, payment.png, keys.png, README.md)
// Adds one decorative, non-clickable element on the register page: the "keyboard only" legend at the top right.
// Rules: no clicks/keys/API calls, never move or remove app elements; only ".st-deco" elements, all removed in off().
// Test: node tests/style-suite.js --style 37 --base 7360 --chrome 9518
// STATUS: STYLED.
'use strict';
AirStyle.register('37', {
  // the mockup shows only the 5 left keys (Payment F12, Gift card Ctrl+G, Customer F3, Return Ctrl+R, Tax off F5), the 5 right
  // value boxes and the 3 bottom boxes; every other button is hidden by CSS only and its key still works (F1 lists them all).
  // The Customers tile is shown as the 5th right value box (customer name), not as a key.
  buttons: ['checkout', 'gift-card', 'customer', 'return', 'tax-off'],
  on(ctx) {
    if (ctx.page !== 'register') return;
    const app = document.getElementById('app'); if (!app || app.querySelector('.st-deco.mc-legend')) return;
    const d = document.createElement('div'); d.className = 'st-deco mc-legend'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = 'Keyboard only \u00b7 <kbd>F1</kbd> all keys \u00b7 <kbd>F2</kbd> quick search';
    app.appendChild(d);
  },
  off() { document.querySelectorAll('.st-deco.mc-legend').forEach(e => e.remove()); },
});
