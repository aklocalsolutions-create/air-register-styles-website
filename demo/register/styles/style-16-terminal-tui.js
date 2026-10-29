/* Air Register Styles — Style 16 Terminal TUI (look only).
 * OWNER: the style-16 assistant ONLY. Adds only .st-deco elements (never clickable) and removes them all in off().
 * No API calls, no key handlers, no clicks: it only READS text that is already on screen.
 *  - register: a read-only "log" pane (mirrors the toast / scan message / opened screen with a time stamp) and the
 *    hint line on the right of the prompt.
 *  - payment: "received" pane (mirrors the active tender line + the Due/Paid/Change numbers), a keys pane listing the
 *    payment keys the app already has, and the "pay>" prompt line. Re-checked every 300 ms because the app re-renders.
 */
(function () {
  if (!window.AirStyle) return;
  let timer = null, obs = null, last = {}, lines = [];
  const q = (s, r) => (r || document).querySelector(s);
  const txt = s => { const e = q(s); return e ? (e.textContent || '').trim() : ''; };
  const mk = (cls, html, parent) => { const d = document.createElement('div'); d.className = 'st-deco ' + cls; d.setAttribute('aria-hidden', 'true'); d.innerHTML = html; parent.appendChild(d); return d; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hhmm = () => { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); };

  function log(msg, cls) {
    if (!msg) return;
    lines.push({ t: hhmm(), m: msg, c: cls || '' }); if (lines.length > 12) lines.shift();
    const box = q('.s16-log'); if (!box) return;
    const in_ = q('.s16-lines', box) || box; in_.innerHTML = lines.map(l => `<div class="${l.c}"><i>${l.t}</i>${esc(l.m)}</div>`).join('');
  }
  function tick() {
    const app = document.getElementById('app');
    if (app && !q('.s16-log', app)) { mk('s16-log', '<div class="s16-lines"></div>', app); if (!lines.length) log('air register ready · scan or type a lookup code, Enter adds it'); else log('style on'); }
    if (app && !q('.s16-hint', app)) mk('s16-hint', '<b>Enter</b> pay · <b>F3</b> customer · <b>F12</b> payment · <b>Ctrl+R</b> return · <b>F1</b> keys', app);
    // read-only watch of what the app already shows
    const toast = txt('#toast'), sm = q('#scanMsg'), smt = sm && sm.offsetParent ? txt('#scanMsg') : '';
    if (toast && toast !== last.toast) log(toast.toLowerCase(), q('#toast.err') ? 'er' : '');
    if (smt && smt !== last.sm) log('err: ' + smt, 'er');
    last.toast = toast; last.sm = smt;
    const mode = document.documentElement.getAttribute('data-mode') || '';
    if (mode !== last.mode) { if (last.mode !== undefined && mode) log('mode → ' + mode, 'am'); last.mode = mode; }
    const rows = document.querySelectorAll('#cart tr.row').length;
    if (rows !== last.rows) { if (last.rows !== undefined) log(rows ? `receipt: ${rows} line${rows === 1 ? '' : 's'} · total ${txt('#totals .total span:last-child')}` : 'receipt cleared'); last.rows = rows; }
    const h = q('#modalRoot .modal h2, #modalRoot .modal h1'), ht = h ? h.textContent.trim() : '';
    if (ht !== last.modal) { if (ht) log('open: ' + ht.toLowerCase(), 'am'); last.modal = ht; }
    pay();
  }
  function pay() {
    const m = q('.modal.fullpay');
    if (!m) return;
    if (!q('#payBody', m)) { m.querySelectorAll('.s16-pp, .s16-ppr').forEach(e => e.remove()); return; } // refund screen: no payment panes
    let recv = q('.s16-recv', m), keys = q('.s16-keys', m), pr = q('.s16-ppr', m);
    if (!recv) recv = mk('s16-pp s16-recv', '', m);
    if (!keys) keys = mk('s16-pp s16-keys', '<div class="lg">[ keys ]</div>'
      + [['next tender type', 'Enter'], ['full balance on line', '+'], ['move between lines', 'click'], ['pay (all typed lines)', 'Alt+P'], ['back to sale', 'Esc']]
        .map(([a, b]) => `<div class="kr"><span>${a}</span><b>${b}</b></div>`).join('')
      + '<div class="dim">ticket</div>', m);
    if (!pr) pr = mk('s16-ppr', '<b>pay&gt;</b><span class="cur"></span><span class="hint">Enter next · + full balance · Alt+P pay · Esc back</span>', m);
    const on = q('.pline.on', m), lbl = on ? txt('.pline.on .plbl') : '', inp = on ? q('.pamt', on) : null;
    const v = inp && inp.value ? inp.value : '0.00';
    const html = `<div class="lg">[ ${esc((lbl || 'payment').toLowerCase())} received ]</div><div class="big">$${esc(v)}</div>`
      + `<div class="row3"><div><small>due</small>${esc(txt('#payTotal'))}</div><div><small>paid</small>${esc(txt('#payTend'))}</div><div><small>change</small>${esc(txt('#chg'))}</div></div>`
      + `<div class="dim">${lbl ? 'typing goes into the highlighted line on the left' : esc(txt('.fullpay .cardbox .big') || 'working…')}</div>`;
    if (recv.__h !== html) { recv.innerHTML = html; recv.__h = html; }
    let tk = q('.s16-tk', keys); if (!tk) { tk = document.createElement('div'); tk.className = 's16-tk'; keys.appendChild(tk); }
    const rows = [...document.querySelectorAll('#cart tr.row')].slice(0, 8).map(r => { const td = r.children; return td.length >= 7 ? `<div><span>${esc(td[2].textContent.trim())} ×${esc(td[3].textContent.trim())}</span><span>${esc(td[6].textContent.trim())}</span></div>` : ''; }).join('');
    const th = `${rows}<div class="tt"><span>total due</span><span>${esc(txt('#payTotal'))}</span></div>`;
    if (tk.__h !== th) { tk.innerHTML = th; tk.__h = th; }
    const c = q('.cur', pr), cv = lbl ? `${lbl.toLowerCase()} ${v}` : '';
    if (c && c.textContent !== cv) c.textContent = cv;
  }
  // On-screen controls = the mockup's keys only; every other [data-a] button stays in the DOM, hidden by CSS
  // (style-16-terminal-tui.css), and its shortcut still works.
  AirStyle.declare('16', { buttons: [
    // keys pane, left column (#actions)
    'new-sale', 'history', 'hold', 'load-hold', 'aside-put', 'drawer', 'return', 'customer', 'end-of-day', 'clock-out', 'logout',
    // keys pane, right column (#right)
    'open-item', 'reprint', 'discount', 'tax-off', 'promo', 'extra-charge', 'gift-card', 'price-check', 'settings',
    // tmux tabs in the top bar (#tiles: customer F3 is covered above, items Esc, payment F12)
    'close', 'checkout',
    // top-bar status pills, the catalog prompt, bulk quick-add
    '#setTop', '#helpPill', '#hwPill', '#qsIn', '#bulkBtns'
  ] });

  AirStyle.register('16', {
    on() { if (document.documentElement.getAttribute('data-page') === 'customer') return; last = {}; tick(); timer = setInterval(tick, 300); },
    off() { clearInterval(timer); timer = null; if (obs) obs.disconnect(); obs = null; document.querySelectorAll('.s16-log, .s16-hint, .s16-recv, .s16-keys, .s16-ppr').forEach(e => e.remove()); }
  });
})();
