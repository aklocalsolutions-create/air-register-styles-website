/* Air Register Styles — Style 01 Clean Light (look only)
 * OWNER: the style-01 assistant ONLY. Only adds .st-deco elements (pointer-events:none, see demo-style-base.css) and removes them all in off().
 * No API calls, no key handlers, no clicks. Reads the on-screen cart/totals text to draw a read-only ticket card beside the Payment screen
 * (mockup payment.png) plus a static "Keyboard" help card. Nothing here changes sales, totals, tax, payments, refunds or inventory.
 * STATUS: STYLED + TESTED (2026-10-29) — style-suite --style 01: 16/16 tests PASS, exit 0; e2e-styles --style 01: 30 pass / 0 fail (button allow-list declared below; 53/53 shortcuts match Classic).
 */
'use strict';
(function () {
  let timer = null, sig = '';
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const txt = (n) => (n ? n.textContent.trim() : '');

  function drawTicket(box) {
    if (!document.querySelector('.modal.fullpay')) { if (sig) { sig = ''; box.replaceChildren(); } return; }
    const rows = [...document.querySelectorAll('#cart tr.row')].map(tr => { const td = tr.children; return [txt(td[2]), txt(td[3]), txt(td[6]), tr.classList.contains('neg')]; });
    const tots = [...document.querySelectorAll('#totals > div')].map(d => [txt(d.children[0]), txt(d.children[1]), d.className]);
    const head = txt(document.getElementById('gridTitle')) || 'Sale';
    const s = JSON.stringify([head, rows, tots]);
    if (s === sig) return; sig = s;
    const h = el('div', 'c1t-head'); h.append(el('b', '', head === 'Sale' ? 'Ticket' : head), el('small', '', rows.length + (rows.length === 1 ? ' line' : ' lines')));
    const list = el('div', 'c1t-list');
    rows.forEach(([n, q, t, neg], i) => { const r = el('div', 'c1t-row' + (neg ? ' neg' : '')); r.append(el('i', '', String(i + 1)), el('span', 'n', n.replace(/\s*(return|charge|reload)$/, '')), el('span', 'q', '×' + q.replace('−', '')), el('span', 't', t)); list.append(r); });
    const sum = el('div', 'c1t-sum');
    tots.filter(([l]) => !/^(Rows|Quantity|Items)$/.test(l)).forEach(([l, v, c]) => { const r = el('div', /\btotal\b/.test(c) ? 'big' : ''); r.append(el('span', '', l), el('span', '', v)); sum.append(r); });
    box.replaceChildren(h, list, sum);
  }

  // On-screen controls of this style (its mockup). Every other [data-a] button stays in the DOM, hidden by
  // demo-style-01-clean-light.css only, and its shortcut still works.
  const BUTTONS = [
    'new-sale', 'history', 'hold', 'return', 'customer', 'end-of-day', 'logout', // left rail (+ Customers row = tile 'customer')
    'close', 'checkout',                                                           // Items chip, Pay bar
    'discount', 'promo', 'open-item',                                              // ticket action row
    '#setTop', '#helpPill', '#hwPill', '#qsPanel', '#bulkPanel',                   // top pills, search pill, item tiles
  ];

  AirStyle.register('01', {
    buttons: BUTTONS,
    placeholder: 'Search or scan items…',
    on(ctx) {
      if (ctx.page !== 'register' || document.getElementById('c1PayTicket')) return;
      const t = el('div', 'st-deco c1-payticket'); t.id = 'c1PayTicket'; t.setAttribute('aria-hidden', 'true');
      const k = el('div', 'st-deco c1-paykeys'); k.id = 'c1PayKeys'; k.setAttribute('aria-hidden', 'true');
      k.append(el('b', '', 'Keyboard'));
      [['Enter', 'next payment type · finishes when paid'], ['+', 'put in the full balance'], ['Alt+P', 'pay'], ['Esc', 'back to sale']]
        .forEach(([key, what]) => { const r = el('div'); r.append(el('kbd', '', key), el('span', '', what)); k.append(r); });
      document.body.append(t, k);
      timer = setInterval(() => drawTicket(t), 300);
    },
    off() {
      if (timer) clearInterval(timer); timer = null; sig = '';
      document.querySelectorAll('#c1PayTicket, #c1PayKeys').forEach(n => n.remove());
    },
  });
})();
