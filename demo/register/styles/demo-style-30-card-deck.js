// Air Register Styles — Style 30 Card Deck: LOOK hooks only.
// OWNER: the style-30 assistant ONLY (this file + demo-style-30-card-deck.css). Shared files belong to the lead.
// Adds two decorative, non-clickable labels on the register page: the "Deal an item" title and the hint under the deck.
// Rules: no clicks/keys/API calls, never move or remove app elements; only ".st-deco" elements, all removed in off().
// Test: FAKE_PORT=6152 CHROME_PORT=9513 node tests/e2e-styles.js --style 30
// STATUS: STYLED.
'use strict';
AirStyle.register('30', {
  // the sale-screen buttons the mockup shows; every other [data-a] button stays in the page (hidden by CSS only) and its key still works
  buttons: ['new-sale', 'history', 'hold', 'load-hold', 'return', 'customer', 'end-of-day', 'logout', 'settings',
    'checkout', 'close', 'open-item', 'discount', 'tax-off',
    '#qsIn', '#bulkBtns > *', '#hwPill', '#helpPill'], // quick search, the dealt cards, the pill row
  placeholder: 'Scan or search items\u2026',
  on(ctx) {
    if (ctx.page !== 'register') return;
    const app = document.getElementById('app'); if (!app || app.querySelector('.cd-title')) return;
    const add = (cls, html) => { const d = document.createElement('div'); d.className = 'st-deco ' + cls; d.setAttribute('aria-hidden', 'true'); d.innerHTML = html; app.appendChild(d); };
    add('cd-title', '<b>Deal an item</b><small>Tap a card or scan \u2014 it slides into your hand.</small>');
    add('cd-hint', '\u2660 \u2665 \u2666 \u2663 \u00a0tap a card to deal it \u00b7 Alt+1\u20269 deals by number \u00b7 the gold card is Alt+1');
  },
  off() { document.querySelectorAll('.st-deco.cd-title, .st-deco.cd-hint').forEach(e => e.remove()); },
});
