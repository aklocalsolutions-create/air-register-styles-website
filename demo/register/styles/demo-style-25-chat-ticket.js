// Air Register Styles — Style 25 Chat Ticket: optional LOOK hooks.
// OWNER: the style-25 assistant ONLY (this file + demo-style-25-chat-ticket.css). Shared files belong to the lead.
// Rules: no clicks/keys/API writes, never move or remove app elements (the app redraws them); add only elements with
// class "st-deco" and remove them all in off(). Test: node tests/e2e-styles.js --style 25
// What it adds (all read-only, pointer-events none): the "Ticket" header text over the sale column, a small cashier
// card on top of the dark sidebar, the composer's scan icon and "Enter" send hint (one each), and the "Slash commands & keys"
// label and the mockup's short key list under the /return row. Text is copied from what the app already shows (title, cart rows, user/session pills); nothing is computed.
// It also keeps the newest (or the selected) chat bubble in view by scrolling the cart box (look only).
'use strict';
(() => {
  let timer = null, lastSig = '';
  const q = (s, r) => (r || document).querySelector(s);
  const mk = (tag, cls, html) => { const e = document.createElement(tag); e.className = 'st-deco ' + cls; if (html != null) e.innerHTML = html; return e; };
  const txt = (s) => { const e = q(s); return e ? e.textContent.trim() : ''; };

  function addRegister() {
    const gb = q('.gridbox'), center = q('.center'), acts = q('aside.actions'), scanrow = q('.scanrow'), ra = q('#rightAside');
    if (center && !q('.s25-head')) center.insertBefore(mk('div', 's25-head', '<span class="s25-hic">🧾</span><span class="s25-ht"><b class="s25-title">Ticket</b><small class="s25-sub"></small></span>'), center.firstChild);
    if (acts && !q('.s25-me')) acts.insertBefore(mk('div', 's25-me', '<span class="s25-av">AR</span><span><b class="s25-user"></b><small class="s25-shop"></small></span>'), acts.firstChild);
    // each decoration exactly once: add only if missing, and drop any stray extra copy
    const once = (sel) => { const all = document.querySelectorAll(sel); for (let i = 1; i < all.length; i++) all[i].remove(); return all.length > 0; };
    if (scanrow && !once('.s25-scanic')) scanrow.insertBefore(mk('span', 's25-scanic', '⌁'), scanrow.firstChild);
    if (scanrow && !once('.s25-send')) scanrow.appendChild(mk('span', 's25-send', '<kbd>Enter</kbd><i>➤</i>'));
    if (ra && !q('.s25-klab')) ra.insertBefore(mk('div', 's25-klab', 'Slash commands &amp; keys'), ra.firstChild);
    // the mockup's key list (text only; the keys themselves are handled by the app as always)
    if (ra && !q('.s25-keys')) ra.appendChild(mk('div', 's25-keys', [['/items', 'Esc'], ['/open item', 'F7'], ['/discount', 'F6'], ['/tax off', 'F5'],
      ['/customer', 'F3'], ['/pay', 'F12']].map(x => '<div><span>' + x[0] + '</span><kbd>' + x[1] + '</kbd></div>').join('')));
  }

  function tick() {
    if (document.documentElement.getAttribute('data-style') !== '25') return;
    addRegister();
    const rows = document.querySelectorAll('#cart tr.row');
    const title = txt('#gridTitle');
    const ret = typeof S !== 'undefined' && S && S.mode === 'return'; // read only
    const mixed = !ret && (document.documentElement.getAttribute('data-return') === '1' || /^RETURN/.test(title));
    const user = txt('#stUser').replace(/^User:\s*/, ''), sess = txt('#stSession'), sub = txt('#subtitle');
    const t = q('.s25-title'), s = q('.s25-sub');
    const num = (typeof S !== 'undefined' && S && S.order && S.order.number) ? String(S.order.number) : ''; // read only
    if (t) t.textContent = (ret ? 'Return' : 'Ticket') + (num ? ' #' + num : ret ? '' : mixed ? ' · returning items' : ' · new sale');
    if (s) s.textContent = (ret ? title : (q('#memChip') ? txt('#memChip') : 'Walk-in')) + ' · ' + rows.length + (rows.length === 1 ? ' line' : ' lines') + ' · ' + (rows.length ? (ret || mixed ? 'returning' : 'scanning') : 'waiting for the first scan');
    const u = q('.s25-user'), sh = q('.s25-shop');
    if (u) u.textContent = user || 'Cashier';
    if (sh) sh.textContent = [sub.split('·').pop().trim(), sess].filter(Boolean).join(' · ');
    const av = q('.s25-me .s25-av'); if (av && user) av.textContent = user.slice(0, 2).toUpperCase();
    // keep the newest / selected bubble in view (cart box scroll only)
    const sel = q('#cart tr.row.sel');
    const sig = rows.length + '|' + (sel ? sel.getAttribute('data-row') : '') + '|' + (rows[0] ? rows[0].textContent : '');
    if (sig !== lastSig) { lastSig = sig; if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' }); }
  }

  // the mockup's on-screen buttons (data-a names / selectors); every other button is hidden by the CSS only, keys unchanged
  const BUTTONS = ['new-sale', 'load-hold', 'end-of-day', 'settings', 'logout', 'customer', 'hold', 'history',
    'close', 'open-item', 'discount', 'tax-off', 'checkout', 'return', '#hwPill', '#sizeL', '#sizeR'];
  const PLACEHOLDER = 'Scan, type an item code, or a quantity like *3…';

  AirStyle.register('25', {
    buttons: BUTTONS, placeholder: PLACEHOLDER,
    on(ctx) {
      if (ctx.page !== 'register') return;
      lastSig = ''; tick(); if (!timer) timer = setInterval(tick, 250);
    },
    off(ctx) {
      if (timer) { clearInterval(timer); timer = null; }
      document.querySelectorAll('.s25-head, .s25-me, .s25-scanic, .s25-send, .s25-klab, .s25-keys').forEach(e => e.remove());
      lastSig = '';
    },
  });
})();
