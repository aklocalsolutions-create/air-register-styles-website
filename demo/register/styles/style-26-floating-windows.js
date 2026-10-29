// Air Register Styles — Style 26 Floating Windows: LOOK hooks only.
// OWNER: the style-26 assistant ONLY (this file + style-26-floating-windows.css). Shared files belong to the lead.
// Adds one decorative, non-clickable .st-deco element: the macOS-like menu words in the top bar
// ("Sale  Items  Customers  Window"). No clicks/keys/API calls; never moves or removes app elements; off() removes it.
// Test: FAKE_PORT=6144 CHROME_PORT=9511 node tests/e2e-styles.js --style 26
// STATUS: STYLED
'use strict';
// On-screen controls = the mockup's (STYLES-PLAN 13.3). Everything else is display:none in style-26 CSS only; every key works.
// Dock: New, History, Hold, Return | Customer, Items, (Payment = ticket's Payment tile) | End of Day, Settings, Log out.
// Sale tools: Open Item, Sale Discount, Tax Off. Customer window = Customer tile (Find F3). Catalog = Quick search (#qsIn).
// Keypad spot = Bulk items window (#bulkBtns).
AirStyle.declare('26', {
  buttons: ['new-sale', 'history', 'hold', 'return', 'customer', 'end-of-day', 'logout', 'settings',
            'open-item', 'discount', 'tax-off', 'checkout', '.tile[data-a="close"]', '#qsIn', '#bulkBtns'],
});
AirStyle.register('26', {
  on(ctx) {
    if (ctx.page !== 'register') return;
    const top = document.querySelector('#app > .top'); if (!top || top.querySelector('.s26-menu')) return;
    const m = document.createElement('span'); m.className = 'st-deco s26-menu'; m.setAttribute('aria-hidden', 'true');
    for (const w of ['Sale', 'Items', 'Customers', 'Window']) { const s = document.createElement('span'); s.textContent = w; m.appendChild(s); }
    const b = top.querySelector('b'); if (b && b.nextSibling) top.insertBefore(m, b.nextSibling); else top.appendChild(m);
  },
  off(ctx) { document.querySelectorAll('.s26-menu.st-deco').forEach(e => e.remove()); },
});
