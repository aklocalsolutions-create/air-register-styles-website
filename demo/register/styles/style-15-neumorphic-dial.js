// Air Register Styles — Style 15 Neumorphic Dial: LOOK hooks only.
// OWNER: the style-15 assistant ONLY (this file + style-15-neumorphic-dial.css). Shared files belong to the lead.
// What it adds: one read-only "st-deco" mirror of the #totals rows (Subtotal / Discount / Tax ...) at the bottom of the
// left sale card, because the real #totals sits inside the dial and shows only the Total there.
// Rules kept: no clicks/keys/API, never moves or removes app elements; everything added has class "st-deco" and off() removes it.
// Test: node tests/e2e-styles.js --style 15
// STATUS: BUILT 2026-10-29.
'use strict';
(function () {
  let box = null, sub = null, obs = null, obs2 = null;
  const SKIP = /^(rows|quantity|before tax|total)$/i;
  function draw() {
    const t = document.getElementById('totals'); if (!t || !box) return;
    const rows = [...t.children].filter(r => !r.classList.contains('total') && r.children.length >= 2 && !SKIP.test(r.children[0].textContent.trim()));
    const sig = rows.map(r => r.className + '|' + r.children[0].textContent + '|' + r.children[r.children.length - 1].textContent).join('#');
    if (box.dataset.sig === sig) return; box.dataset.sig = sig;
    box.textContent = '';
    for (const r of rows) {
      const d = document.createElement('div'); if (/\b(off|on|red)\b/.test(r.className)) d.className = 'on';
      const a = document.createElement('span'), b = document.createElement('span');
      a.textContent = r.children[0].textContent; b.textContent = r.children[r.children.length - 1].textContent;
      d.append(a, b); box.append(d);
    }
  }

  // On-screen controls = the mockup's (STYLES-PLAN 13.3). Everything else is hidden by the style CSS only; every key still works.
  AirStyle.declare('15', {
    buttons: [
      // ring around the dial (#actions)
      'new-sale', 'history', 'hold', 'load-hold', 'aside-put', 'return', 'customer', 'drawer', 'end-of-day', 'clock-out', 'logout',
      // Pay pill in the dial
      'checkout',
      // More list (#right)
      'open-item', 'discount', 'tax-off', 'promo', 'extra-charge', 'gift-card', 'price-check', 'reprint', 'settings',
      // header "F1 keys", search box, quick add grid
      '#helpPill', '#qsIn', '#bulkBtns'
    ],
    placeholder: 'Search or scan'
  });
  // "2 items · no customer" line under the Total in the dial (read-only copy of the hidden Items / Customer tiles' text)
  function drawSub() {
    if (!sub) return;
    const info = a => { const e = document.querySelector('#tiles .tile[data-a="' + a + '"] .info'); return e ? e.textContent.trim() : ''; };
    const items = info('close'), cu = info('customer');
    const txt = [items, !cu || /^none$/i.test(cu) ? 'no customer' : cu].filter(Boolean).join(' · ');
    if (sub.textContent !== txt) sub.textContent = txt;
  }
  AirStyle.register('15', {
    on(ctx) {
      if (ctx.page !== 'register') return;
      const wrap = document.querySelector('#app .wrap'), t = document.getElementById('totals'); if (!wrap || !t || box) return;
      box = document.createElement('div'); box.className = 'st-deco st15-sum'; box.setAttribute('aria-hidden', 'true');
      wrap.append(box); draw();
      obs = new MutationObserver(draw); obs.observe(t, { childList: true, subtree: true, characterData: true, attributes: true });
      const tiles = document.getElementById('tiles');
      if (tiles) { sub = document.createElement('div'); sub.className = 'st-deco st15-subline'; sub.setAttribute('aria-hidden', 'true'); wrap.append(sub); drawSub();
        obs2 = new MutationObserver(drawSub); obs2.observe(tiles, { childList: true, subtree: true, characterData: true }); }
    },
    off() {
      if (obs) obs.disconnect(); obs = null;
      if (obs2) obs2.disconnect(); obs2 = null;
      if (box) box.remove(); box = null;
      if (sub) sub.remove(); sub = null;
      document.querySelectorAll('.st15-sum, .st15-subline').forEach(e => e.remove());
    },
  });
})();
