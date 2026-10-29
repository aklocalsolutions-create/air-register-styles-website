// Air Register Styles — Style 19 Dual Cashier: LOOK hooks only.
// OWNER: the style-19 assistant ONLY (this file + style-19-dual-cashier.css). Shared files belong to the lead.
// Adds only class "st-deco" elements (not clickable; removed in off()):
//   - the Lane 1 card + header (a read-only mirror of the cashier / item count / mode already on screen),
//   - "Shared devices" under the key column (read-only mirror of the hardware / session / network pills),
//   - Lane 2: a static VISUAL PLACEHOLDER (fixed sample content, no data, no clicks). All sales stay in Lane 1.
// No API calls, no key handlers, no clicks; never moves or removes app elements. Test: node tests/e2e-styles.js --style 19
// STATUS: STYLED
'use strict';
(function () {
  let els = [], timer = null;
  const txt = id => { const e = document.getElementById(id); return e ? (e.textContent || '').trim() : ''; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mk = (cls, html, parent, before) => { const d = document.createElement('div'); d.className = 'st-deco ' + cls; d.setAttribute('aria-hidden', 'true'); d.innerHTML = html;
    if (before) parent.insertBefore(d, before); else parent.appendChild(d); els.push(d); return d; };

  const L2_TILES = [['🫧', 'Bubble Wand 3-Pack', '$4.99'], ['🧩', 'Puzzle Animals', '$12.99'], ['🚗', 'Race Car Pull-Back', '$7.99'], ['🪁', 'Rainbow Kite', '$15.00'],
    ['🖍️', 'Crayon Box', '$6.49'], ['🦖', 'Dino Figure Set', '$18.99'], ['🎲', 'Family Board Game', '$22.99'], ['🪀', 'Classic Yo-Yo', '$3.99'], ['🎁', 'Gift Bag', '$1.50'],
    ['🏀', 'Mini Basketball', '$9.99'], ['🤖', 'Wind-Up Robot', '$11.50'], ['🧃', 'Juice Box', '$1.25']];
  const L2_LINES = [['🪁', 'Rainbow Kite', '1 × $15.00', '$15.00'], ['🦖', 'Dino Figure Set', '1 × $18.99', '$18.99'], ['🖍️', 'Crayon Box', '2 × $6.49', '$12.98', 1], ['🧃', 'Juice Box', '3 × $1.25', '$3.75']];

  function lane2Html() {
    return `<div class="s19-head"><span class="s19-pill">● Ringing up</span><span class="s19-tag">Lane 2 · preview only</span><div class="s19-who" style="text-align:right"><b>cashier2 · Lane 2</b><small>Ticket #1043 · 7 items · sample</small></div><span class="s19-av">C2</span></div>
      <div class="s19-srch"><kbd>Ctrl+Shift+S</kbd><span>Search or scan</span><span style="margin-left:auto">⌕</span></div>
      <div class="s19-main"><div class="s19-grid">${L2_TILES.map(([i, n, p]) => `<div><i>${i}</i>${esc(n)}<em>${p}</em></div>`).join('')}</div>
        <div class="s19-lines">${L2_LINES.map(([i, n, q, t, on]) => `<div class="${on ? 'on' : ''}"><i>${i}</i><span>${esc(n)}<small>${q}</small></span><span>${t}</span></div>`).join('')}</div></div>
      <div class="s19-chips"><span>Hold<kbd>Ctrl+H</kbd></span><span>Open Item<kbd>F7</kbd></span><span>Tax Off<kbd>F5</kbd></span><span>Discount<kbd>F6</kbd></span><span>Customer<kbd>F3</kbd></span></div>
      <div class="s19-tot"><span class="s19-pay">Pay<kbd>F12</kbd></span><span class="s19-big"><small>TOTAL</small>$55.22</span><span class="s19-sum"><span>Subtotal</span><b>$50.72</b><span>Discount</span><b>$0.00</b><span>Tax 8.875%</span><b>$4.50</b></span></div>`;
  }

  function update() {
    const head = document.querySelector('.s19-lane1 .s19-head'); if (!head) return;
    const html = document.documentElement;
    const user = txt('stUser').replace(/^cashier:\s*/i, '') || 'cashier';
    const ini = (user.match(/[A-Za-z0-9]/) || ['C'])[0].toUpperCase() + '1';
    const items = txt('info-items'), order = txt('stOrder'), sess = txt('sessPill');
    const paying = !!document.querySelector('#modalRoot .fullpay'), ret = html.dataset.mode === 'return';
    const cartRows = document.querySelectorAll('#cart tr.row').length;
    const pill = paying ? '● Paying' : ret ? '● Return' : cartRows ? '● Ringing up' : '● Ready';
    const sub = [items || (cartRows ? cartRows + ' lines' : 'no items'), order, sess].filter(Boolean).join(' · ');
    const want = `<span class="s19-av">${esc(ini)}</span><div class="s19-who"><b>${esc(user)} · Lane 1</b><small>${esc(sub)}</small></div><span class="s19-pill${ret ? ' ret' : ''}">${pill}</span>`;
    if (head.dataset.k !== want) { head.innerHTML = want; head.dataset.k = want; }
    const dev = document.querySelector('.s19-dev'); if (!dev) return;
    const hw = document.getElementById('hwPill'), hwc = hw ? (hw.classList.contains('bad') ? 'bad' : hw.classList.contains('warn') ? 'warn' : '') : '';
    const net = txt('stNet').replace(/^●\s*/, ''), netc = (document.getElementById('stNet') || { classList: { contains: () => false } }).classList.contains('off') ? 'bad' : '';
    const dw = `<h4>Shared devices</h4><div><span>Printer / drawer</span><span class="${hwc}" title="">${esc((hw ? hw.textContent : '').replace(/^printer\/drawer:\s*/i, '') || '—')}</span></div>
      <div><span>Network</span><span class="${netc}">${esc(net || '—')}</span></div><div><span>Session</span><span class="warn">${esc(sess || '—')}</span></div><div><span>Card reader</span><span class="l2">lane 1</span></div>`;
    if (dev.dataset.k !== dw) { dev.innerHTML = dw; dev.dataset.k = dw; }
  }

  // On-screen controls = the mockup's (sale screen). Every other [data-a] button stays in the DOM, hidden by CSS only; its key still works.
  const BUTTONS = ['new-sale', 'history', 'hold', 'load-hold', 'aside-put', 'drawer', 'return', 'customer', 'end-of-day', 'clock-out', 'logout',
    'checkout', 'open-item', 'reprint', 'discount', 'tax-off', 'promo', 'extra-charge', 'gift-card', 'price-check', 'settings',
    'qty-plus', 'qty-minus', 'remove', 'cart-search', '#helpPill', '#qsIn'];
  AirStyle.register('19', {
    buttons: BUTTONS, placeholder: 'Search or scan',  // scan box hint text from the mockup
    on(ctx) {
      if (ctx.page !== 'register') return;
      const wrap = document.querySelector('#app > .wrap'); if (!wrap) return;
      mk('s19-lane s19-lane1', '<div class="s19-head"></div>', wrap, wrap.firstChild);
      mk('s19-lane s19-lane2 s19-l2c', lane2Html(), wrap);
      const act = document.querySelector('aside.actions'); if (act) mk('s19-dev', '', act);
      update(); timer = setInterval(update, 400);
    },
    off() { if (timer) clearInterval(timer); timer = null; els.forEach(e => e.remove()); els = []; },
  });
})();
