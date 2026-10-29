// Air Register Styles — Style 23 Spreadsheet: LOOK hooks only.
// OWNER: the style-23 assistant ONLY (this file + demo-style-23-spreadsheet.css). Shared files belong to the lead.
// Adds read-only .st-deco pieces on the register page: the A..F column-letter row and the scan-hint row in the sheet, the
// formula-bar name box + "fx" in front of the scan box, the sheet-tab strip above the status bar, and the Keys pane
// (text table: every menu button, then every keyboard-only action hidden by the CSS, with its key). The name box and
// the Keys pane only READ the app's own buttons/labels (#cart, #actions, #tiles, #right, #qsPanel).
// No clicks, no keys, no API calls; nothing in the app is moved or removed; off() removes everything it added.
// Test: FAKE_PORT=6136 CHROME_PORT=9509 node tests/e2e-styles.js --style 23
// STATUS: STYLED.
'use strict';
(function () {
  let added = [], mo = null, mo2 = null, raf = 0;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const txt = n => n ? n.textContent.replace(/\s+/g, ' ').trim() : '';
  const shown = b => b.offsetParent !== null || getComputedStyle(b).display !== 'none';
  // one entry per app button: [label, key, group, red, visible-in-menu]
  const GRP = { 'new-sale': 'Sale', history: 'Sale', hold: 'Sale', return: 'Sale', 'load-hold': 'Sale', 'aside-put': 'Sale', 'aside-load': 'Sale', customer: 'Screen',
    'tax-off': 'Pricing', discount: 'Pricing', 'open-item': 'Pricing', promo: 'Pricing', 'extra-charge': 'Pricing', 'item-discount': 'Pricing',
    'end-of-day': 'Register', settings: 'Register', logout: 'Register', drawer: 'Register', 'clock-out': 'Register', 'cash-move': 'Register', hw: 'Register' };
  function entries() {
    const out = [], seen = new Set();
    const add = (b, label, key, group) => {
      const a = b.dataset.a; if (!a || seen.has(a + '|' + key + '|' + label)) return; seen.add(a + '|' + key + '|' + label);
      out.push([label, key, GRP[a] || group, b.classList.contains('red'), shown(b), b]);
    };
    document.querySelectorAll('#actions .abtn[data-a]').forEach(b => add(b, txt(b.querySelector('.t')), txt(b.querySelector('.k')), 'Actions'));
    document.querySelectorAll('#tiles .tile[data-a]').forEach(b => {
      const t = [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      add(b, t, txt(b.querySelector('.k')), 'Screen');
    });
    let grp = '';
    document.querySelectorAll('#right > h3, #right .rbtn[data-a]').forEach(b => {
      if (b.tagName === 'H3') { grp = txt(b); return; }
      const t = [...b.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      add(b, t, txt(b.querySelector('small')), grp || 'Register');
    });
    // a key that also has a visible button is listed once, as that button
    const vk = new Set(out.filter(e => e[4]).map(e => e[1]));
    const col = e => e[5] ? (parseInt(getComputedStyle(e[5]).gridColumnStart, 10) || 99) : 99;
    return out.filter(e => e[4] || !vk.has(e[1])).sort((x, y) => (y[4] - x[4]) || (x[4] ? col(x) - col(y) : 0)).map(e => e.slice(0, 5));
  }
  function keysHtml() {
    const all = entries(), vis = all.filter(e => e[4]), hid = all.filter(e => !e[4]);
    let n = 0;
    const r = (cls, a, b, c) => `<div class="${cls}"><span>${++n}</span><span>${a}</span><span>${b}</span><span>${c}</span></div>`;
    const row = e => r('s23-kr' + (e[3] ? ' red' : ''), esc(e[0]), e[1] ? `<kbd>${esc(e[1])}</kbd>` : '', esc(e[2]));
    const qs = txt(document.querySelector('#qsPanel h3 small'));
    let h = '<div class="s23-kc"><span></span><span>H</span><span>I</span><span>J</span></div>';
    h += r('s23-kt', 'Keys', '', '') + r('s23-kh', 'Action', 'Key', 'Group');
    h += vis.map(row).join('');
    if (qs) h += r('s23-kr', 'Quick search', `<kbd>${esc(qs)}</kbd>`, 'Search');
    if (hid.length) h += r('s23-ks', 'Keyboard only', '', '') + hid.map(row).join('');
    return h;
  }
  const el = (tag, cls, html) => { const e = document.createElement(tag); e.className = 'st-deco ' + cls; if (html != null) e.innerHTML = html; added.push(e); return e; };
  // the mockup's menu row, left to right; every other [data-a] button is hidden by style-23 CSS only (its key still works)
  const BUTTONS = ['new-sale', 'history', 'hold', 'return', 'customer', 'close', 'checkout', 'tax-off', 'discount', 'open-item', 'end-of-day', 'settings', 'logout', '#helpPill', '#qsIn'];
  AirStyle.register('23', {
    buttons: BUTTONS,
    on(ctx) {
      if (ctx.page !== 'register') return;
      const box = document.querySelector('.gridbox');
      if (box && !box.querySelector('.s23-cols')) box.insertBefore(el('div', 's23-cols', ['', 'A', 'B', 'C', 'D', 'E', 'F'].map(x => `<span>${x}</span>`).join('')), box.firstChild);
      const row = document.querySelector('.scanrow');
      let nb = null;
      if (row && row.parentNode && !row.parentNode.querySelector('.s23-nb')) {
        nb = el('div', 's23-nb', 'A1'); const fx = el('div', 's23-fx', 'fx');
        row.parentNode.insertBefore(nb, row); row.parentNode.insertBefore(fx, row);
      }
      const app = document.getElementById('app'), status = app && app.querySelector(':scope > .status');
      if (status && !app.querySelector('.s23-tabs')) app.insertBefore(el('div', 's23-tabs',
        '<span class="s23-t-sale"><i class="s23-grid"></i>Sale</span><span class="s23-t-ret">Return</span><span class="s23-add">+</span>'), status);
      const gb = document.querySelector('.gridbox');
      if (gb && !gb.querySelector('.s23-hintrow')) gb.appendChild(el('div', 's23-hintrow',
        '<span>\u23ce scan\u2026</span><span>Type or scan in the fx bar \u00b7 <kbd>F2</kbd> quick search \u00b7 <kbd>F7</kbd> open item</span>'));
      const wrap = document.querySelector('.wrap');
      if (wrap && !wrap.querySelector('.s23-keys')) {
        const kp = el('div', 's23-keys'); kp.setAttribute('aria-hidden', 'true'); wrap.appendChild(kp);
        const draw = () => { raf = 0; const h = keysHtml(); if (kp.innerHTML !== h) kp.innerHTML = h; };
        draw();
        mo2 = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(draw); });
        ['actions', 'right', 'tiles'].forEach(id => { const t = document.getElementById(id); if (t) mo2.observe(t, { childList: true }); });
      }
      const cart = document.getElementById('cart');
      if (nb && cart) {
        const upd = () => { nb.textContent = 'A' + (cart.querySelectorAll('tr.row').length + 1); };
        upd(); mo = new MutationObserver(upd); mo.observe(cart, { childList: true });
      }
    },
    off(ctx) {
      if (mo) { mo.disconnect(); mo = null; }
      if (mo2) { mo2.disconnect(); mo2 = null; }
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      added.forEach(e => e.remove()); added = [];
      document.querySelectorAll('.st-deco.s23-cols, .st-deco.s23-nb, .st-deco.s23-fx, .st-deco.s23-tabs, .st-deco.s23-hintrow, .st-deco.s23-keys').forEach(e => e.remove());
    },
  });
})();
