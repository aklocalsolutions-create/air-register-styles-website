// Air Register Styles — Style 11 Liquid Glass: optional LOOK hooks.
// OWNER: the style-11 assistant ONLY (this file + demo-style-11-liquid-glass.css). Shared files belong to the lead.
// Use only for decoration CSS cannot do (e.g. a read-only mirror of the cart, labels from /api/shortcuts).
// Rules: no clicks/keys/API writes, never move or remove app elements (the app redraws them); add only elements with
// class "st-deco" and remove them all in off(). Test: node tests/e2e-styles.js --style 11
// STATUS: BUILT (2026-10-28). Adds read-only .st-deco pieces (pointer-events:none, aria-hidden):
//   register: the "Just added" hero card (copy of the selected / newest cart line) and the "More" header;
//   payment:  the right-column "Keyboard" help box and the "On this ticket" list (copy of the cart rows).
// It only READS the DOM (MutationObserver), never clicks, types, calls the server or touches app elements.
'use strict';
(() => {
  let mo = null, mo2 = null, raf = 0;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const deco = (cls, parent) => {
    const d = document.createElement('div'); d.className = 'st-deco s11-glass ' + cls; d.setAttribute('aria-hidden', 'true');
    (parent || document.body).appendChild(d); return d;
  };
  const txt = (tr, i) => { const td = tr && tr.children[i]; return td ? td.textContent.trim() : ''; };
  const initials = n => { const w = String(n || '').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase(); };
  const set = (el, html) => { if (el && el.__h !== html) { el.__h = html; el.innerHTML = html; } };

  function heroHtml() {
    const rows = [...document.querySelectorAll('#cart tr.row')];
    const ret = document.documentElement.dataset.mode === 'return';
    if (!rows.length) {
      return { cls: 'empty' + (ret ? ' ret' : ''), html: `<div class="lbl"><span>${ret ? 'Return' : 'Just added'}</span><span>empty ticket</span></div>`
        + `<div class="art">⌁</div><h2>${ret ? 'Scan items to return' : 'Ready to scan'}</h2><p>Scan a barcode or type a lookup code · F2 quick search</p><div class="qn">0</div><div class="pr">$0.00</div>` };
    }
    const sel = rows.find(r => r.classList.contains('sel')) || rows[0];
    const n = rows.indexOf(sel) + 1, name = txt(sel, 2), code = txt(sel, 1), price = txt(sel, 4), disc = txt(sel, 5);
    return { cls: (ret || sel.classList.contains('neg') ? 'ret' : ''), html:
      `<div class="lbl"><span>${ret ? 'Return line' : 'Just added'}</span><span>Line ${n} of ${rows.length}</span></div>`
      + `<div class="art">${esc(initials(name))}</div><h2>${esc(name)}</h2>`
      + `<p>${esc(code)}${price ? ' · ' + esc(price) + ' each' : ''}${disc && !/^[-–—]?$/.test(disc) && !/^\$?0(\.00)?$/.test(disc) ? ' · ' + esc(disc) + ' off' : ''}</p>`
      + `<div class="qn">${esc(txt(sel, 3))}</div><div class="pr">${esc(txt(sel, 6))}</div>` };
  }

  function paySide(modal) {
    let side = modal.querySelector(':scope > .s11-payside');
    if (!side) {
      side = document.createElement('div'); side.className = 'st-deco s11-payside'; side.setAttribute('aria-hidden', 'true'); modal.appendChild(side);
    }
    const rows = [...document.querySelectorAll('#cart tr.row')];
    const items = rows.slice(0, 5).map(r => `<div class="il"><span>${esc(txt(r, 2))} ×${esc(txt(r, 3))}</span><span>${esc(txt(r, 6))}</span></div>`).join('')
      + (rows.length > 5 ? `<div class="il"><span>+ ${rows.length - 5} more</span><span></span></div>` : '');
    const refund = !!modal.querySelector('#refBody'); // the Refund window (demo-extras.js) shares .fullpay; its keys differ
    set(side, `<div class="box"><h5>Keyboard</h5>`
      + (refund
        ? `<div class="kr"><kbd>\u2191 \u2193</kbd> how to give it back</div><div class="kr"><kbd>Enter</kbd> refund</div><div class="kr"><kbd>Esc</kbd> back</div></div>`
        : `<div class="kr"><kbd>Enter</kbd> next payment type</div><div class="kr"><kbd>+</kbd> full balance</div>`
          + `<div class="kr"><kbd>Enter</kbd> finish at $0.00</div><div class="kr"><kbd>Esc</kbd> back to sale</div><div class="kr"><kbd>Alt+P</kbd> pay</div></div>`)
      + `<div class="box"><h5>On this ticket</h5><div class="ilist">${items || '<div class="il"><span>no items</span></div>'}</div></div>`);
  }

  function update() {
    raf = 0;
    const hero = document.querySelector('.st-deco.s11-hero');
    if (hero) { const h = heroHtml(); const c = 'st-deco s11-glass s11-hero ' + h.cls; if (hero.className !== c) hero.className = c; set(hero, h.html); }
    const modal = document.querySelector('#modalRoot .modal.fullpay');
    if (modal) paySide(modal);
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };

  // Mockup button set (STYLES-PLAN 13.3): only these show on the sale screen. Every other [data-a] button stays in the DOM,
  // hidden by demo-style-11-liquid-glass.css only, and its shortcut keeps working. Selectors = non-[data-a] controls kept:
  // #helpPill (the mockup's "F1 keys"), #qsIn + #bulkBtns (the bottom dock standing in for the mockup's carousel).
  const S11_BUTTONS = ['new-sale', 'history', 'hold', 'load-hold', 'return', 'customer', 'close', 'checkout', 'qty-minus', 'qty-plus',
    'open-item', 'discount', 'tax-off', 'promo', 'extra-charge', 'gift-card', 'price-check', 'reprint', 'aside-put', 'clock-out', 'drawer',
    'end-of-day', 'settings', 'logout', 'local:help', '#helpPill', '#qsIn', '#bulkBtns > *'];
  if (AirStyle.declare) AirStyle.declare('11', { buttons: S11_BUTTONS, placeholder: 'Search or scan' });
  AirStyle.register('11', {
    on(ctx) {
      if (ctx.page !== 'register') return;
      deco('s11-hero');
      const mh = deco('s11-morehead'); mh.classList.remove('s11-glass'); mh.textContent = 'More';
      mo = new MutationObserver(muts => { if (muts.some(m => !(m.target.closest && m.target.closest('.st-deco')))) queue(); });
      mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
      mo2 = new MutationObserver(queue); mo2.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
      update();
    },
    off() {
      if (mo) { mo.disconnect(); mo = null; }
      if (mo2) { mo2.disconnect(); mo2 = null; }
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      document.querySelectorAll('.st-deco.s11-hero, .st-deco.s11-morehead, .st-deco.s11-payside').forEach(e => e.remove());
    },
  });
})();
