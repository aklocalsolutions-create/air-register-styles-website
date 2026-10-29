// Air Register Styles — Style 22 Scan Hero: optional LOOK hooks.
// OWNER: the style-22 assistant ONLY (this file + demo-style-22-scan-hero.css). Shared files belong to the lead.
// Use only for decoration CSS cannot do (e.g. a read-only mirror of the cart, labels from /api/shortcuts).
// Rules: no clicks/keys/API writes, never move or remove app elements (the app redraws them); add only elements with
// class "st-deco" and remove them all in off(). Test: node tests/e2e-styles.js --style 22
// STATUS: STYLED (v1, button list declared). Adds the scan hero (rings, "Scan the next item"), the "Just added" card (read-only mirror of the
// selected cart line), the bottom key bar background, the cart count, and the payment hero (mirror of the balance).
// Reads the page only (textContent); no clicks, no keys, no API calls.
'use strict';
(function () {
  const SV = (p, sw) => '<svg viewBox="0 0 24 24"' + (sw ? ' stroke-width="' + sw + '"' : '') + '>' + p + '</svg>';
  const IC = {
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M16 8v8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  };
  let els = [], timer = 0;
  const mk = (cls, html) => { const d = document.createElement('div'); d.className = 'st-deco s22 ' + cls; d.setAttribute('aria-hidden', 'true'); d.innerHTML = html; document.body.appendChild(d); els.push(d); return d; };
  const txt = (el) => (el ? el.textContent.trim() : '');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let hero, last, count, payAmt, payH, cust, lastKey = '';
  function tick() {
    const gh = document.getElementById('gridhead'), ret = document.documentElement.getAttribute('data-mode') === 'return' || !!(gh && gh.classList.contains('ret'));
    hero.classList.toggle('s22-ret', ret);
    const h1 = hero.querySelector('h1'), p = hero.querySelector('p');
    const t1 = ret ? 'Scan the item to return' : 'Scan the next item', t2 = ret ? 'Return mode \u2014 scan or type the receipt number' : 'Barcode scanner ready \u00b7 or type a name, number or UPC';
    if (h1.textContent !== t1) h1.textContent = t1;
    if (p.textContent !== t2) p.textContent = t2;
    const r = document.querySelector('#cart tr.row.sel') || document.querySelector('#cart tr.row');
    let key = '';
    if (r && r.cells.length >= 7) {
      const top = r.getAttribute('data-row') === '0';
      key = [top, txt(r.cells[2]), txt(r.cells[3]), txt(r.cells[6]), r.classList.contains('neg')].join('|');
      if (key !== lastKey) {
        last.innerHTML = '<span class="e">' + SV(IC.box) + '</span><span><small>' + (top ? 'Just added' : 'Selected line') + '</small><b>' + esc(txt(r.cells[2]).replace(/\s+/g, ' ')) +
          '</b><span style="color:var(--s22-mut);font-size:12.5px">qty ' + esc(txt(r.cells[3])) + ' \u00b7 ' + esc(txt(r.cells[4])) + ' each</span></span><span class="sp"></span>' +
          '<kbd>+</kbd><kbd>\u2212</kbd><span class="pr">' + esc(txt(r.cells[6])) + '</span>';
        last.classList.toggle('neg', r.classList.contains('neg'));
      }
    }
    last.hidden = !key; lastKey = key;
    const n = txt(document.getElementById('info-items'));
    if (count.textContent !== n) count.textContent = n;
    const c = txt(document.getElementById('info-customer'));
    const ch = (!c || c === 'none') ? 'Add customer' : 'Customer<b>' + esc(c) + '</b>';
    if (cust.innerHTML !== ch) cust.innerHTML = ch;
    const refund = document.getElementById('refAmt');
    const due = txt(document.getElementById('payDue') || refund);
    if (payAmt.textContent !== due) payAmt.textContent = due;
    const ph = refund ? 'Refund to the customer' : 'Tap, insert or swipe';
    if (payH.textContent !== ph) payH.textContent = ph;
    payAmt.classList.toggle('neg', !!refund);
  }
  // On-screen controls = the mockup's (STYLES-PLAN 13.3). Everything else is display:none in demo-style-22-scan-hero.css
  // (CSS only: DOM + handlers untouched, so every key in app/shortcuts.json still works).
  //  rail: Items tile, Customers, History, Return, New, Hold, Settings (#setTop) · top bar: scanner dot (#hwPill), "F1 keys" (#helpPill)
  //  hero: F2 quick search (#qsIn, drops down under the scan box) + chips Open Item / Sale Discount / Tax Off
  //  bottom bar: Return, End of Day, Settings, Log out · cart: "Add customer" row (customer tile), Pay (checkout tile)
  AirStyle.declare('22', {
    buttons: ['customer', 'history', 'return', 'new-sale', 'hold', 'open-item', 'discount', 'tax-off', 'end-of-day', 'settings', 'logout',
              'checkout', '.tile[data-a="close"]', '#setTop', '#hwPill', '#helpPill', '#qsIn'],
    placeholder: 'Scan or type a barcode / SKU'
  });
  AirStyle.register('22', {
    on(ctx) {
      if (ctx.page !== 'register') return;
      hero = mk('s22-hero', '<div class="s22-rings"><div class="s22-core">' + SV(IC.scan, 1.8) + '</div></div><h1></h1><p></p>');
      mk('s22-scanic', SV(IC.search));
      mk('s22-f2', '<kbd>F2</kbd>');
      last = mk('s22-last', ''); last.hidden = true;
      mk('s22-bot', '');
      count = mk('s22-count', '');
      cust = mk('s22-cust', '');
      mk('s22-hold', '<kbd>Ctrl+H</kbd> hold');
      const pay = mk('s22-pay', '<div class="s22-rings"><div class="s22-core">' + SV(IC.card, 1.8) + '</div></div><h1>Tap, insert or swipe</h1><div class="amt"></div>');
      payAmt = pay.querySelector('.amt'); payH = pay.querySelector('h1');
      lastKey = ''; tick(); timer = setInterval(tick, 250);
    },
    off() {
      clearInterval(timer); timer = 0;
      els.forEach((e) => e.remove()); els = []; hero = last = count = payAmt = payH = cust = null; lastKey = '';
    },
  });
})();
