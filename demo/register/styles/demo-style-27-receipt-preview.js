// Air Register Styles — Style 27 Receipt Preview: LOOK hooks (read-only).
// OWNER: the style-27 assistant ONLY (this file + demo-style-27-receipt-preview.css). Shared files belong to the lead.
// Adds only .st-deco elements to .wrap: two column cards (behind the real controls) and a live receipt preview that
// mirrors what is already on screen (#cart, #totals, the customer tile, the status bar and, while the Payment screen
// is open, its amounts). It only READS the DOM: no server calls, no key handlers, no clicks, no print logic.
// Everything is removed in off(). Test: FAKE_PORT=… CHROME_PORT=… node tests/e2e-styles.js --style 27
// STATUS: BUILT.
'use strict';
(() => {
  let timer = null, sig = '';
  const $ = id => document.getElementById(id);
  const txt = e => (e && e.textContent || '').trim();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pr = (a, b, cls) => `<div class="pr ${cls || ''}"><span>${esc(a)}</span><span>${esc(b)}</span></div>`;
  const money = s => /^-?\$?-?[\d,]+\.\d\d$/.test(String(s).trim());

  function read() {
    const heads = [...document.querySelectorAll('#cartHead th')].map(th => txt(th).toLowerCase());
    const col = n => heads.findIndex(h => h === n);
    const ci = { name: col('name'), qty: col('qty'), price: col('price'), disc: col('discount'), total: col('total'), code: col('lookup code') };
    const lines = [...document.querySelectorAll('#cart tr.row')].map(tr => {
      const td = [...tr.children].map(txt); const g = k => (ci[k] >= 0 ? td[ci[k]] : '') || '';
      return { name: g('name') || td.find(x => x && !money(x) && !/^\d+$/.test(x)) || '', qty: g('qty'), price: g('price'), disc: g('disc'), total: g('total') || td[td.length - 1], code: g('code'), neg: tr.classList.contains('neg') };
    });
    const tot = [...document.querySelectorAll('#totals > div')].map(d => { const s = d.querySelectorAll('span'); return { k: txt(s[0]), v: txt(s[s.length - 1]), cls: d.className }; });
    const pay = document.querySelector('#modalRoot .fullpay');
    let tender = null;
    if (pay) {
      tender = { lines: [...pay.querySelectorAll('.pline')].map(p => ({ k: txt(p.querySelector('.plbl')), v: (p.querySelector('input') || {}).value || '', on: p.classList.contains('on') })),
        paid: txt($('payTend')), chg: txt($('chg')), bal: txt($('payDue')) };
    }
    const shop = txt($('stShop')).replace(/^Shop:\s*/i, '') || txt($('subtitle')).split('·').pop().trim() || 'Air Register';
    const cashier = txt($('stUser')).replace(/^Cashier:\s*/i, '').replace(/\s*\(.*\)$/, '');
    const order = (o => (/\d/.test(o) ? o : ''))(txt($('stOrder')));
    const cust = txt($('info-customer'));
    const mode = document.documentElement.dataset.mode || '';
    return { lines, tot, tender, shop, cashier, order, cust, mode, title: txt($('gridTitle')) };
  }

  function render(box, d) {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) + ' ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const T = k => (d.tot.find(t => t.k.toLowerCase() === k) || {}).v;
    const lines = d.lines.length ? d.lines.map(l => pr(`${l.qty || 1} ${l.name}`, l.total, l.neg ? 'neg' : '') +
      pr(`  @ ${l.price}${l.code ? ' · ' + l.code : ''}${l.disc ? ' · disc ' + l.disc : ''}`, '', 'sm')).join('')
      : '<div class="c" style="color:#999;padding:8px 0">— no items yet —</div>';
    const sums = d.tot.filter(t => !/^(rows|quantity|total)$/i.test(t.k)).map(t => pr(t.k.toUpperCase(), t.v, /neg|taxoff/.test(t.cls) ? 'neg' : '')).join('');
    let tender;
    if (d.tender) {
      const paid = d.tender.lines.filter(x => x.v && Number(x.v) !== 0);
      const sel = (d.tender.lines.find(x => x.on) || {}).k || '';
      tender = paid.map(x => pr(x.k.toUpperCase(), '$' + Number(x.v).toFixed(2))).join('') + pr('CHANGE', d.tender.chg || '$0.00') +
        (sel ? `<div class="c"><span class="st27-stamp">${esc(sel.toUpperCase())} · READY</span></div>` : '');
    } else tender = pr('TENDER', '— pending —', 'mut');
    const cust = !d.cust || /^none$/i.test(d.cust) ? 'WALK-IN' : d.cust.toUpperCase();
    box.querySelector('.st27-paper').innerHTML =
      `<div class="c"><h4>${esc(d.shop)}</h4>${d.mode === 'return' ? 'RETURN' : 'SALE'}${d.order ? ' · ' + esc(d.order) : ''}${d.cashier ? '<br>' + esc(d.cashier) : ''}<br>${esc(date)}</div><hr>` +
      `<div class="st27-lines">${lines}</div><hr>${sums}<hr>${pr('TOTAL', T('total') || '$0.00', 'tt')}${tender}<hr>` +
      pr('ITEMS', T('quantity') || '0') + pr('CUSTOMER', cust) +
      `<div class="c ft">Returns within 30 days with receipt</div><div class="flex"></div><div class="bc"></div><div class="c">* THANK YOU! *</div>`;
  }

  function tick(box) {
    const d = read(); const s = JSON.stringify(d) + new Date().getMinutes();
    if (s !== sig) { sig = s; render(box, d); }
  }

  // On-screen controls = the mockup's (STYLES-PLAN §13.3). Everything else is hidden by CSS only; every key still works.
  AirStyle.declare('27', {
    buttons: ['new-sale', 'history', 'hold', 'load-hold', 'return', 'end-of-day', 'logout', 'open-item', 'discount', 'tax-off',
      '.tile[data-a="close"]', '.tile[data-a="customer"]', '.tile[data-a="checkout"]', '#setTop', '#qsIn', '#bulkBtns'],
  });

  AirStyle.register('27', {
    on(ctx) {
      if (ctx.page !== 'register') return; // the customer display is CSS only
      const wrap = document.querySelector('.wrap'); if (!wrap || wrap.querySelector('.st27-rcpt')) return;
      for (const c of ['c1', 'c2']) { const e = document.createElement('div'); e.className = 'st-deco st27-card ' + c; e.setAttribute('aria-hidden', 'true'); wrap.insertBefore(e, wrap.firstChild); }
      const box = document.createElement('div'); box.className = 'st-deco st27-rcpt'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = '<div class="ch">&#9776; Receipt preview<i></i><small>live</small></div><div class="rc"><div class="st27-paper"></div></div><div class="rcf">&#10003; Prints when the sale is finished</div>';
      wrap.appendChild(box); sig = ''; tick(box);
      timer = setInterval(() => tick(box), 300);
    },
    off() {
      if (timer) clearInterval(timer); timer = null; sig = '';
      document.querySelectorAll('.st27-rcpt, .st27-card').forEach(e => e.remove());
    },
  });
})();
