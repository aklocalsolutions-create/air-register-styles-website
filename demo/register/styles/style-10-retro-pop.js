// Air Register Styles — Style 10 Retro Pop: optional LOOK hooks.
// OWNER: the style-10 assistant ONLY (this file + style-10-retro-pop.css). Shared files belong to the lead.
// Use only for decoration CSS cannot do (e.g. a read-only mirror of the cart, labels from /api/shortcuts).
// Rules: no clicks/keys/API writes, never move or remove app elements (the app redraws them); add only elements with
// class "st-deco" and remove them all in off(). Test: node tests/e2e-styles.js --style 10
// STATUS: STYLED. Register page only: three read-only mirrors (text copied from what the app already shows):
//   - LCD line in the top bar: last/selected cart item, item count, cashier
//   - big TOTAL in the top bar (copied from #totals .total)
//   - store header at the top of the receipt tape (from the status bar shop name)
//   - payment window head: tender, amount, change, paid/total and the big balance (from the payment window's numbers)
// Nothing here clicks, listens to keys, calls the server or changes app elements.
'use strict';
(function () {
  let timer = null;
  const txt = (el) => (el && el.textContent || '').replace(/\s+/g, ' ').trim();
  const mk = (cls, parent, before) => {
    const d = document.createElement('div'); d.className = 'st-deco ' + cls; d.setAttribute('aria-hidden', 'true');
    if (before) parent.insertBefore(d, before); else parent.appendChild(d); return d;
  };
  const put = (el, html) => { if (el && el.__rp !== html) { el.__rp = html; el.innerHTML = html; } };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function draw() {
    const top = document.querySelector('#app .top'), box = document.querySelector('#app .gridbox');
    if (!top || !box) return;
    let lcd = top.querySelector('.st-deco.rp-lcd'), tot = top.querySelector('.st-deco.rp-tot');
    if (!lcd) lcd = mk('rp-lcd', top); if (!tot) tot = mk('rp-tot', top);
    let store = box.querySelector(':scope > .st-deco.rp-store'); if (!store) store = mk('rp-store', box, box.firstChild);
    else if (box.firstChild !== store) box.insertBefore(store, box.firstChild);

    const rows = [...document.querySelectorAll('#cart tr.row')];
    const row = document.querySelector('#cart tr.row.sel') || rows[rows.length - 1];
    const ret = document.documentElement.getAttribute('data-mode') === 'return';
    let line1 = ret ? 'Return mode' : 'Ready — scan an item';
    if (row) {
      const c = row.children, name = txt(c[2]), qty = txt(c[3]), sum = txt(c[6]);
      line1 = `${name} ×${qty} &nbsp; ${sum}`;
    }
    const totRow = document.querySelector('#totals .total');
    const label = totRow ? txt(totRow.firstElementChild) : 'Total';
    const total = totRow ? txt(totRow.lastElementChild) : '$0.00';
    const user = txt(document.getElementById('stUser')).replace(/^(User|Cashier):\s*/i, '');
    const items = txt(document.getElementById('info-items'));
    put(lcd, `<i>${ret ? 'Return' : (row ? (document.querySelector('#cart tr.row.sel') ? 'Selected item' : 'Last item') : 'Air Register')}</i>` +
      `<b>${esc(line1).replace(/&amp;nbsp;/g, '&nbsp;')}</b><i>${esc([items, user && 'Cashier ' + user].filter(Boolean).join(' · '))}</i>`);
    put(tot, `<small>${esc(label || 'Total')}</small><b>${esc(total)}</b>`);
    const shop = txt(document.getElementById('stShop')).replace(/^Shop:\s*/i, '');
    const when = txt(document.getElementById('stTime'));
    put(store, `<b>★ ${esc(shop || 'Air Register')} ★</b><small>${esc(when)}</small>`);
  }

  // payment window head: tender / amounts / balance, copied from the payment window's own numbers
  function drawPay() {
    const head = document.querySelector('.modal.fullpay .payhead');
    if (!head) return;
    if (!document.getElementById('payBody')) { head.querySelectorAll('.st-deco').forEach((e) => e.remove()); return; } // refund screen: no mirror
    let lcd = head.querySelector('.st-deco.rp-plcd'), tot = head.querySelector('.st-deco.rp-ptot');
    if (!lcd) lcd = mk('rp-plcd', head); if (!tot) tot = mk('rp-ptot', head);
    const g = (id) => txt(document.getElementById(id));
    const on = document.querySelector('.modal.fullpay .pline.on'), tab = document.querySelector('.modal.fullpay .tab.on');
    const tender = on ? txt(on.querySelector('.plbl')) : tab ? txt(tab) : '';
    const amt = on ? ((on.querySelector('.pamt') || {}).value || '') : '';
    const due = g('payDue'), paid = g('payTend'), chg = g('chg'), total = g('payTotal');
    put(lcd, `<i>${esc(tender ? 'Tender: ' + tender : 'Payment')}</i>` +
      `<b>${esc(tender ? `${tender} in ${amt ? '$' + amt : '—'}` : '')}${chg ? esc(' · Change ' + chg) : ''}</b>` +
      `<i>${esc([paid && 'Paid ' + paid, total && 'Total ' + total].filter(Boolean).join(' · '))}</i>`);
    put(tot, due ? `<small>Balance due</small><b>${esc(due)}</b>` : '');
  }

  // the mockup's on-screen controls (everything else is hidden by style-10-retro-pop.css only; all shortcuts keep working):
  // row 1 F1 F3 F5 F6 F7 F8 F9 Esc Ctrl+G Ctrl+I, row 2 New History Hold LoadHold Return Drawer EndDay Settings ClockOut LogOut,
  // big PAY (F12), the "department" keys = Bulk item buttons, and the search box (Quick search, Ctrl+Shift+S) in the keypad spot
  AirStyle.declare('10', {
    buttons: ['local:help', 'customer', 'tax-off', 'discount', 'open-item', 'extra-charge', 'promo', 'close', 'gift-card', 'price-check',
      'new-sale', 'history', 'hold', 'load-hold', 'return', 'drawer', 'end-of-day', 'settings', 'clock-out', 'logout',
      'checkout', '#qsPanel', '#bulkPanel'],
    placeholder: 'Scan / search item…'
  });
  AirStyle.register('10', {
    on(ctx) {
      if (!ctx || ctx.page !== 'register') return;
      const tick = () => { draw(); drawPay(); }; tick(); timer = setInterval(tick, 250);
    },
    off(ctx) {
      if (timer) clearInterval(timer); timer = null;
      document.querySelectorAll('.st-deco.rp-lcd, .st-deco.rp-tot, .st-deco.rp-store, .st-deco.rp-plcd, .st-deco.rp-ptot').forEach((e) => e.remove());
    },
  });
})();
