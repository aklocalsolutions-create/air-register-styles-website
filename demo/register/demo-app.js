'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => (S.currency || '$') + (Number(n) || 0).toFixed(2);
let S = {}, selectedRow = null, keys = [], busy = false;
const SUBTAG = { temp: 10, extra: 20 };

// Every call has a time limit, so the screen can never freeze on a hung request. A local server that is gone
// (restarting after a crash: the launcher watchdog brings it back) shows "Reconnecting…" and is retried for reads.
const API_SLOW = new Set(['pay-tender', 'pay-cash', 'finish-sale', 'return-confirm', 'card-retry', 'z-generate', 'x-report', 'report-print', 'print', 'print-return', 'test-print', 'test-drawer', 'drawer', 'drawer-sale', 'login', 'clock-out']);
function reconnecting(on) {
  let o = $('reconn'); if (!o && on) { o = document.createElement('div'); o.id = 'reconn'; o.innerHTML = '<div>Reconnecting to Air Register…<small>Your sale is saved on this PC. Nothing is lost.</small></div>'; document.body.appendChild(o); }
  if (o) o.style.display = on ? '' : 'none';
}
async function api(name, body, opt = {}) {
  const ms = opt.timeoutMs || (name === 'state' ? 8000 : API_SLOW.has(name) ? 100000 : 30000);
  for (let attempt = 0; ; attempt++) {
    let r;
    try { r = await fetch('/api/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(ms) }); }
    catch (e) {
      const timeout = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
      // a money call that timed out may still be running on the server: never resend it blindly; the server checks before charging again
      if (timeout || attempt >= 20 || name !== 'state' && !opt.retry) { reconnecting(false); return { ok: false, retryable: true, message: timeout ? 'Air Register is taking too long to answer. Press Retry (it checks first, nothing is taken twice).' : 'Air Register is restarting. Press Retry in a moment.' }; }
      reconnecting(true); await new Promise(res => setTimeout(res, 1500)); continue;
    }
    reconnecting(false);
    const j = await r.json().catch(() => ({ ok: false, retryable: true, message: 'Bad reply from Air Register (HTTP ' + r.status + '). Press Retry.' }));
    if (name !== 'state' && (j.loggedOut || j.loggedIn === false && name !== 'login')) await refresh();
    return j;
  }
}
function toast(m, ok) { const t = $('toast'); t.textContent = m || ''; t.className = 'msg ' + (ok === false ? 'err' : ok ? 'ok' : ''); }
async function act(name, body, opts = {}) {
  if (busy) return; busy = true; document.body.classList.add('busy');
  try {
    const r = await api(name, body); if (!opts.silent || !r.ok) toast(r.message, r.ok);
    if (!r.ok && r.retryable && window.retryOffer) window.retryOffer(() => act(name, body, opts));
    await refresh(); return r;
  } finally { busy = false; document.body.classList.remove('busy'); }
}

// F5 Tax Off: a cashier who is not an AIR POS manager needs a manager's login (same dialog as Restart PC)
async function taxOff() {
  const r = await act('tax-exempt', {});
  if (r && !r.ok && r.needManager) managerLogin('Tax Off', 'A manager must approve Tax Off for this sale.', async m => {
    const x = await api('tax-exempt', { on: true, ...m }); if (!x.ok) return x;
    closeModal(); toast(x.message, true); await refresh(); return null;
  });
}
// ---------- modal helper ----------
function closeModal() { $('modalRoot').innerHTML = ''; focusScan(); }
function modalOpen() { return !!$('modalRoot').firstChild; }
function modal(html, onMount, cls = '') {
  $('modalRoot').innerHTML = `<div class="el-overlay ${cls ? cls + '-ov' : ''}" id="ov"><div class="modal ${cls}" role="dialog">${html}</div></div>`;
  // Owner: a click / tap OUTSIDE the window closes it, exactly like Esc (each window's own Esc rule applies: the payment
  // screen goes back one step and never drops a running card payment or a paid amount).
  // (the full-screen payment screen has no "outside")
  if (cls !== 'fullpay') $('ov').addEventListener('mousedown', e => { if (e.target !== e.currentTarget) return; e.preventDefault(); (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })); });
  $('modalRoot').querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  if (onMount) onMount();
  const f = $('modalRoot').querySelector('[autofocus]'); if (f) { f.focus(); f.select && f.select(); }
}
function focusScan() { if (!modalOpen() && S.loggedIn && S.mode !== 'clockin') $('scanInput').focus(); }

// ---------- login ----------
const LS_CO = 'airreg.lastCompany', LS_US = 'airreg.lastUser';
function showLogin(show) { if (!document.getElementById('lgCompany')) { document.getElementById('login').style.display = 'none'; return; } // DEMO: no login form
  $('login').style.display = show ? 'flex' : 'none';
  if (show && !$('login').dataset.init) {
    $('login').dataset.init = 1;
    $('lgCompany').value = localStorage.getItem(LS_CO) || ''; $('lgUser').value = localStorage.getItem(LS_US) || '';
    ($('lgCompany').value ? ($('lgUser').value ? $('lgPw') : $('lgUser')) : $('lgCompany')).focus();
  }
}
$('loginForm').onsubmit = async e => {
  e.preventDefault(); $('lgMsg').textContent = ''; $('lgBtn').disabled = true; $('lgBtn').textContent = 'Logging in…';
  const company = $('lgCompany').value.trim(), user = $('lgUser').value.trim(), pwEl = $('lgPw');
  try {
    const r = await api('login', { company, user, password: pwEl.value });
    pwEl.value = ''; // never kept in the page
    if (r.ok) { localStorage.setItem(LS_CO, company); localStorage.setItem(LS_US, user); delete $('login').dataset.init; toast(r.message, true); }
    else { $('lgMsg').textContent = r.message; pwEl.focus(); }
  } finally { $('lgBtn').disabled = false; $('lgBtn').textContent = 'Log In'; await refresh(); }
};

// ---------- clock in / out ----------
function clockInDialog() {
  if (modalOpen()) return;
  const exp = S.session && S.session.expectedAmount;
  modal(`<h2>Clock In</h2><p>Count the cash in the drawer and enter the starting amount.</p>
    ${exp != null ? `<p class="note">Expected: ${money(exp)}</p>` : ''}
    <label class="f">Starting cash</label><input class="f" id="ciAmt" inputmode="decimal" value="0" autofocus>
    <div class="row2"><button class="pbtn s" id="ciOut">Log out</button><button class="pbtn g" id="ciOk">Clock In (Enter)</button></div>`, () => {
    $('ciOk').onclick = async () => { const r = await act('clock-in', { amount: Number($('ciAmt').value) || 0 }); if (r && r.ok) closeModal(); };
    $('ciOut').onclick = async () => { closeModal(); await act('logout'); };
    $('ciAmt').onkeydown = e => { if (e.key === 'Enter') $('ciOk').click(); };
  });
}
async function clockOutDialog() {
  const e = await api('clock-out-expected');
  modal(`<h2>Clock Out</h2><p>Count the drawer. Expected cash: <b>${money(e.expected)}</b></p>
    <label class="f">Counted cash</label><input class="f" id="coAmt" inputmode="decimal" value="${(e.expected || 0).toFixed(2)}" autofocus>
    <p class="note">Clocking out ends the register session and logs you out.</p>
    <div class="row2"><button class="pbtn s" data-close>Cancel (Esc)</button><button class="pbtn r" id="coOk">Clock Out</button></div>`, () => {
    $('coOk').onclick = async () => { const r = await act('clock-out', { amount: Number($('coAmt').value) || 0 }); if (r && r.ok) closeModal(); };
    $('coAmt').onkeydown = ev => { if (ev.key === 'Enter') $('coOk').click(); };
  });
}

// ---------- dialogs ----------
const msgIn = (el, x) => { if (el && document.body.contains(el)) { el.textContent = x.message || ''; el.className = 'msg ' + (x.ok ? 'ok' : 'err'); } else toast(x.message, x.ok); };
// 1.2.0 payment keyboard rule (owner may change): true = when the typed amounts cover the sale (nothing left to pay), Enter finishes it.
// false = Enter only ever moves to the next line; the Pay button finishes.
const PAY_ENTER_COMPLETES = true;
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
// One payment screen for every tender. Any mix: cash, card, gift card, check, store credit, points.
let payTimer = null;
function nextBills(left) { // the next round bills above the amount due
  const out = []; [1, 5, 10, 20, 50, 100].forEach(b => { const v = Math.ceil((left + 1e-9) / b) * b; if (v > left + 0.004 && !out.includes(v) && v <= left + 100) out.push(v); });
  return out.sort((a, b) => a - b).slice(0, 4);
}
let stripeJs = null;
function loadStripeJs() {
  if (window.Stripe) return Promise.resolve();
  return stripeJs = stripeJs || new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'https://js.stripe.com/v3/'; s.onload = ok; s.onerror = () => { stripeJs = null; bad(new Error('Stripe.js did not load')); }; document.head.appendChild(s); });
}
async function checkoutDialog() {
  if (S.mode === 'return') return returnConfirmDialog();
  if (S.mix && S.mix.lines.length && (!S.cart.length || S.mix.net <= 0)) return refundDialog(); // no-receipt return (demo-extras.js)
  if (!S.cart.length) return toast('The order is empty — scan items first', false);
  const r = await api('pay-start'); await refresh();
  if (!r.ok) return toast(r.message, false);
  const payStartLast = S.lastOrderId;
  let gift = [], keyed = null, hi = 0, amounts = {}, extra = { chkNo: '', gcNo: '' }, queue = [], running = false; // keyed = { clientSecret, stripe, num, mounted } (memory only, never stored)
  // 1.2.0: full-screen payment view (layout knobs: the --pay-* variables + .fullpay rules in index.html)
  modal(`<div class="payhead"><h2>Payment</h2></div><div id="payBody"></div>`, () => { renderPay(); }, 'fullpay');
  function amountLeft() { return S.pay ? S.pay.remaining : S.totals.due; }
  function renderPay() {
    const p = S.pay; if (!$('payBody')) return;
    if (!p && S.completed && S.completed.result && S.completed.orderId !== payStartLast) { stopPayTimer(); return doneDialog(S.completed.result); } // card poll finished the sale
    if (!p) return;
    if (p.result && p.result.completed) { stopPayTimer(); return doneDialog(p.result); }
    const left = amountLeft(), m = S.member;
    const card = p.card;
    const tl = p.tenders.length ? `<table class="mini"><tbody>${p.tenders.map(t => `<tr><td>${esc(t.name)}</td><td class="n">${money(t.amount)}</td><td class="n st-${t.status}">${t.status === 'done' ? '✔ paid' : t.status === 'waiting' ? '… waiting' : '✖ ' + t.status}</td></tr>`).join('')}</tbody></table>` : '';
    // worker 2 (1.2.0): the three big numbers the cashier reads — Due / Paid / Balance (+ Change when cash is over)
    const nums = `<div class="pn total"><span>Due</span><b id="payTotal">${money(p.net != null && S.mix && S.mix.lines.length ? p.net : S.totals.due)}</b></div><div class="pn tend"><span>Paid</span><b id="payTend">${money(p.paid)}</b></div>
      <div class="pn left"><span>Balance</span><b id="payDue">${money(left)}</b></div><div class="pn chg"><span>Change</span><b id="chg">$0.00</b></div>`;
    let body = `${p.stockWarning ? `<div class="msg err" id="payStock" style="margin:0 0 6px">⚠ ${esc(p.stockWarning)}</div>` : ''}${tl}`;
    if (p.needManager) {
      body += `<div class="banner">Manager approval needed</div>
        <label class="f">Manager user</label><input class="f" id="mgUser" autocomplete="off" autofocus>
        <label class="f">Manager password</label><input class="f" id="mgPw" type="password" autocomplete="new-password">
        <div id="payMsg" class="msg"></div><div class="row2"><button class="pbtn s" id="payBack">Back (Esc)</button><button class="pbtn g" id="mgOk">Approve</button></div>`;
    } else if (card && card.kind === 'keyed' && card.status === 'keyed') {
      if (keyed && keyed.mounted && $('kForm')) return; // keep Stripe's iframes alive while the cashier types
      body += `<div class="cardbox" id="kForm"><div class="big">Keyed card ${money(card.amount)}</div>
        ${keyed && keyed.clientSecret ? `${S.keyed && S.keyed.test ? '<div class="note"><b>Stripe TEST mode</b></div>' : ''}
        <label class="f" style="text-align:left">Card number</label><div class="sfield" id="kNum"></div>
        <div style="display:flex;gap:8px"><div style="flex:1"><label class="f" style="text-align:left">Expiry</label><div class="sfield" id="kExp"></div></div><div style="flex:1"><label class="f" style="text-align:left">CVC</label><div class="sfield" id="kCvc"></div></div></div>` : '<div class="msg err">Card form closed: press Cancel and start again</div>'}</div>
        <div id="payMsg" class="msg"></div><div class="row2"><button class="pbtn r" id="cardCancel">Cancel card (Esc)</button>${keyed && keyed.clientSecret ? '<button class="pbtn g" id="kCharge">Charge card</button>' : ''}</div>`;
    } else if (card) {
      const decl = card.status === 'declined';
      body += `<div class="cardbox ${decl ? 'bad' : ''}"><div class="big">${decl ? 'Card not approved' : 'Card ' + money(card.amount)}</div>
        <div>${esc(card.message || '')}</div>${card.subMessage ? `<div class="note">${esc(card.subMessage)}</div>` : ''}${decl ? '' : `<div class="note">${card.seconds}s</div>`}</div>
        <div id="payMsg" class="msg"></div><div class="row2"><button class="pbtn r" id="cardCancel">${decl ? 'Use another payment' : 'Cancel card (Esc)'}</button>${decl ? '<button class="pbtn g" id="cardRetry" autofocus>Try card again (Enter)</button>' : ''}</div>`;
    } else if (left <= 0.004 && p.tenders.length) {
      body += `<div class="cardbox"><div class="big">Fully paid</div></div>
        <div id="payMsg" class="msg"></div>
        <div class="row2"><button class="pbtn g" id="payFinish" autofocus>Finish sale (Enter)</button></div>`;
    } else {
      const ls = payLines(), due = typedDue();
      if (hi >= ls.length) hi = 0;
      body += `<div class="plist" id="plist">${ls.map(([t, l], i) => `<div class="pline ${i === hi ? 'on' : ''}" data-i="${i}" data-t="${t}"><span class="plbl">${l}</span><input class="pamt" id="${t === 10 ? 'cashIn' : 'pa-' + t}" inputmode="decimal" autocomplete="off" placeholder="0.00" value="${esc(amounts[t] || '')}"></div>`
        + (i === hi && t === 40 ? `<div class="pextra"><input class="f" id="gcNo" placeholder="Gift card" value="${esc(extra.gcNo)}" autocomplete="off"><input class="f" id="gcPw" type="password" placeholder="PIN (if any)" autocomplete="new-password" style="max-width:150px"><button class="pbtn" id="gcAdd">Check</button><div id="gcList" style="width:100%">${gift.map(c => `<div class="gmRow"><span>${esc(String(c.number).length > 4 ? '**** ' + String(c.number).slice(-4) : c.number)}</span><b>${money(c.balance)}</b></div>`).join('')}</div></div>` : '')
        + (i === hi && t === 10 ? (() => { const r = Math.max(0, round2(amountLeft() - (typed() - (Number(amounts[10]) || 0)))); return `<div class="pextra quick"><button class="pbtn s" data-l="Exact" data-v="${r.toFixed(2)}">Exact</button><span id="nextBills">${nextBills(r).filter(v => ![5, 10, 20, 50, 100].includes(v)).map(v => `<button class="pbtn s nb" data-l="Exact" data-v="${v.toFixed(2)}">${money(v)}</button>`).join('')}</span>${[5, 10, 20, 50, 100].map(v => `<button class="pbtn s" data-l="${v}" data-v="${v}">$${v}</button>`).join('')}</div>`; })() : '')
        + (i === hi && t === 50 ? `<div class="pextra"><input class="f" id="chkNo" placeholder="Check number" value="${esc(extra.chkNo)}" autocomplete="off"></div>` : '')).join('')}</div>
        ${m && m.points > 0 && m.pointExchangeRate > 0 && !p.tenders.length ? `<div class="note"><a href="#" id="usePts">Use points (${m.points})</a>${m.usingPoints ? ' · ' + m.usingPoints + ' used' : ''}</div>` : ''}
        <div id="payMsg" class="msg"></div>
        <div class="row2"><button class="pbtn s" id="payBack">Back (Esc)</button><button class="pbtn g" id="payOk">${due <= 0.004 ? 'Pay — finish sale' : 'Pay ' + money(left - due)}</button></div>`;
    }
    const keep = {}; $('payBody').querySelectorAll('input').forEach(i => { if (i.id && i.type !== 'password') keep[i.id] = i.value; });
    $('payBody').innerHTML = `<div class="paygrid"><div class="paynums">${nums}</div><div class="payact">${body}</div></div>`;
    const back = $('payBack'); if (back) back.onclick = async () => { const x = await api('pay-close'); if (x.ok) { stopPayTimer(); closeModal(); refresh(); } else msgIn($('payMsg'), x); };
    if (p.needManager) {
      $('mgOk').onclick = async () => { const pw = $('mgPw').value; $('mgPw').value = ''; const x = await api('manager-approve', { user: $('mgUser').value, password: pw }); await refresh(); if (x.ok) renderPay(); else msgIn($('payMsg'), x); };
      $('mgPw').onkeydown = e => { if (e.key === 'Enter') $('mgOk').click(); };
      setTimeout(() => $('mgUser') && $('mgUser').focus(), 0); return;
    }
    if (card && card.kind === 'keyed' && card.status === 'keyed') {
      $('cardCancel').onclick = async () => { keyed = null; queue = []; const x = await api('card-cancel'); await refresh(); renderPay(); msgIn($('payMsg'), x); };
      if (keyed && keyed.clientSecret) mountKeyed();
      return;
    }
    if (card) {
      $('cardCancel').onclick = async () => { queue = []; const x = await api('card-cancel'); await refresh(); renderPay(); msgIn($('payMsg'), x); };
      if ($('cardRetry')) $('cardRetry').onclick = async () => { const x = await api('card-retry'); await refresh(); renderPay(); if (!x.ok) msgIn($('payMsg'), x); };
      startPayTimer(); return;
    }
    stopPayTimer();
    if ($('payFinish')) {
      $('payFinish').onclick = async () => { const b = $('payFinish'); b.disabled = true; const x = await api('finish-sale'); await refresh(); if (x.ok && x.completed) { stopPayTimer(); doneDialog(x); } else { renderPay(); msgIn($('payMsg'), x); } };
      if (S.pay.lastError) msgIn($('payMsg'), { ok: false, message: S.pay.lastError });
      setTimeout(() => $('payFinish') && $('payFinish').focus(), 0); return;
    }
    if ($('usePts')) $('usePts').onclick = e => { e.preventDefault(); pointsDialog(); };
    wireLines(keep);
    $('payOk').onclick = commit;
    if (queue.length && !running) runQueue(); // a card finished: go on with the next line of a split
  }
  // ---- 1.2.0 tender list: Credit Card, Cash, then the others ----
  function payLines() { return [[20, 'Credit Card'], [10, 'Cash'], [40, 'Gift Card'], [50, 'Check'], ...(S.keyed && S.keyed.enabled ? [[30, 'Keyed card']] : []), ...(S.member ? [[11, 'Store credit']] : [])]; }
  function typed() { return payLines().reduce((a, [t]) => a + (Number(amounts[t]) || 0), 0); }
  function typedDue() { return Math.max(0, round2(amountLeft() - typed())); }
  function updNums() {
    const left = amountLeft(), tp = typed(), cash = Number(amounts[10]) || 0, other = tp - cash;
    if ($('payDue')) $('payDue').textContent = money(typedDue());
    if ($('payTend')) $('payTend').textContent = money((S.pay ? S.pay.paid : 0) + tp);
    if ($('chg')) $('chg').textContent = money(Math.max(0, round2(cash - Math.max(0, left - other))));
    const bal = $('payDue'); if (bal && bal.parentElement) bal.parentElement.classList.toggle('zero', typedDue() <= 0.004);
    if ($('payOk')) $('payOk').textContent = typedDue() <= 0.004 && tp > 0 ? 'Pay — finish sale' : tp > 0 ? 'Pay ' + money(tp) : 'Pay';
  }
  function move(to) { const ls = payLines(); hi = (to + ls.length) % ls.length; payKeep(); renderPay(); }
  function payKeep() { payLines().forEach(([t]) => { const i = $(t === 10 ? 'cashIn' : 'pa-' + t); if (i) amounts[t] = i.value; }); if ($('gcNo')) extra.gcNo = $('gcNo').value; if ($('chkNo')) extra.chkNo = $('chkNo').value; }
  function wireLines() {
    const ls = payLines();
    $('payBody').querySelectorAll('.pline').forEach(row => row.onclick = e => { const i = +row.dataset.i; if (i !== hi) move(i); });
    ls.forEach(([t], i) => {
      const inp = $(t === 10 ? 'cashIn' : 'pa-' + t); if (!inp) return;
      inp.oninput = () => { amounts[t] = inp.value; updNums(); };
      inp.onkeydown = e => {
        if (e.key === '+' || e.code === 'NumpadAdd') { e.preventDefault(); const rest = Math.max(0, round2(amountLeft() - (typed() - (Number(amounts[t]) || 0)))); amounts[t] = rest ? rest.toFixed(2) : ''; inp.value = amounts[t]; updNums(); return; }
        if (e.key === 'Enter') { e.preventDefault(); amounts[t] = inp.value; if (PAY_ENTER_COMPLETES && typed() > 0 && typedDue() <= 0.004) return commit(); move(hi + 1); }
      };
      if (i === hi) setTimeout(() => { if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.pextra')) return; inp.focus(); inp.select(); }, 0);
    });
    if ($('gcAdd')) {
      $('gcAdd').onclick = async () => { const pw = $('gcPw').value; $('gcPw').value = ''; const x = await api('gift-verify', { number: $('gcNo').value, secret: pw }); msgIn($('payMsg'), x);
        if (x.ok && !gift.some(g => g.id === x.card.id)) { gift.push(x.card); extra.gcNo = ''; const bal = gift.reduce((a, c) => a + c.balance, 0); if (!(Number(amounts[40]) > 0)) amounts[40] = Math.min(bal, Math.max(0, round2(amountLeft() - (typed() - (Number(amounts[40]) || 0))))).toFixed(2); renderPay(); msgIn($('payMsg'), x); } };
      $('gcNo').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('gcAdd').click(); } };
    }
    $('payBody').querySelectorAll('.quick button[data-v]').forEach(b => b.onclick = e => { e.stopPropagation(); const c = $('cashIn'); amounts[10] = b.dataset.v; if (c) { c.value = b.dataset.v; c.focus(); } updNums(); });
    if ($('chkNo')) $('chkNo').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); payKeep(); if (typed() > 0 && typedDue() <= 0.004) commit(); else move(hi + 1); } };
    updNums();
  }
  // Pay every line that has an amount: card / gift / check / store credit first (in list order), cash last so change is right.
  async function commit() {
    payKeep(); if (running) return;
    const left = amountLeft(), ls = payLines().filter(([t]) => Number(amounts[t]) > 0);
    if (!ls.length) return msgIn($('payMsg'), { ok: false, message: 'Type an amount on a line, or press + to put the whole amount due on it' });
    const other = ls.filter(([t]) => t !== 10).reduce((a, [t]) => a + Number(amounts[t]), 0);
    if (other > left + 0.004) return msgIn($('payMsg'), { ok: false, message: `Only cash can be more than the amount due (${money(left)})` });
    if (Number(amounts[50]) > 0 && !String(extra.chkNo || '').trim()) { hi = payLines().findIndex(([t]) => t === 50); renderPay(); msgIn($('payMsg'), { ok: false, message: 'Type the check number, then Enter' }); return setTimeout(() => $('chkNo') && $('chkNo').focus(), 0); }
    if (amounts[40] > 0 && !gift.length) { hi = payLines().findIndex(([t]) => t === 40); renderPay(); return msgIn($('payMsg'), { ok: false, message: 'Scan the gift card and press Check first' }); }
    queue = [...ls.filter(([t]) => t !== 10), ...ls.filter(([t]) => t === 10)].map(([t]) => t);
    return runQueue();
  }
  async function runQueue() {
    if (running || !queue.length) return; running = true;
    try {
      while (queue.length) {
        const t = queue.shift(), b = { type: t };
        if (t === 10) b.tendered = Number(amounts[t]) || 0; else b.amount = Number(amounts[t]) || 0;
        if (t === 50) b.checkNumber = extra.chkNo;
        if (t === 40) b.giftCards = gift;
        const ok = $('payOk'); if (ok) ok.disabled = true;
        const x = await api('pay-tender', b); await refresh();
        if (x.completed) { queue = []; stopPayTimer(); return doneDialog(x); }
        if (!x.ok) { queue = []; renderPay(); msgIn($('payMsg'), x); return; }
        amounts[t] = ''; if (t === 40) gift = [];
        if (x.keyed && x.clientSecret) { keyed = { clientSecret: x.clientSecret }; renderPay(); return; } // Stripe form; the rest continues after
        if (x.waiting || (S.pay && S.pay.card)) { renderPay(); return; } // card terminal; the poll re-renders and resumes the queue
      }
      renderPay();
    } finally { running = false; }
  }
  // Stripe Elements  // Stripe Elements: card fields are Stripe's own iframes; we only ever hold the Element objects.
  async function mountKeyed() {
    if (keyed.mounted) return;
    try {
      if (!keyed.stripe) {
        const k = await api('keyed-key'); if (!k.ok) throw new Error(k.message);
        await loadStripeJs(); keyed.stripe = window.Stripe(k.key); // key = publishable key from AIR POS (RetailReceiveChannelGet)
      }
      if (!$('kNum')) return;
      const el = keyed.stripe.elements(), style = { base: { fontSize: '18px', color: '#2c3e50' } };
      keyed.num = el.create('cardNumber', { style, showIcon: true }); keyed.num.mount('#kNum');
      el.create('cardExpiry', { style }).mount('#kExp'); el.create('cardCvc', { style }).mount('#kCvc');
      keyed.mounted = true; keyed.num.on('ready', () => keyed.num.focus());
      $('kCharge').onclick = chargeKeyed;
    } catch (e) { msgIn($('payMsg'), { ok: false, message: 'Could not load the secure card form (internet needed): ' + (e.message || e) }); }
  }
  async function chargeKeyed() {
    const b = $('kCharge'); if (!b || b.disabled) return; b.disabled = true; b.textContent = 'Charging…'; $('cardCancel').disabled = true;
    let res; try { res = await keyed.stripe.confirmCardPayment(keyed.clientSecret, { payment_method: { card: keyed.num } }); } catch (e) { res = { error: { message: e.message || String(e) } }; }
    const st = res && res.paymentIntent && res.paymentIntent.status;
    if (res && !res.error && (st === 'requires_capture' || st === 'succeeded')) { // same success test as AIR POS
      keyed = null; await api('keyed-confirmed'); await refresh(); renderPay(); return;
    }
    const why = (res && res.error && res.error.message) || 'Card not accepted (' + (st || 'no status') + ')';
    if (res && res.error && ['validation_error'].includes(res.error.type)) { b.disabled = false; b.textContent = 'Charge card'; $('cardCancel').disabled = false; return msgIn($('payMsg'), { ok: false, message: why }); } // typo in the form: let them fix it
    keyed = null; const x = await api('keyed-failed', { message: why }); await refresh(); renderPay(); msgIn($('payMsg'), x);
  }
  function startPayTimer() { if (payTimer) return; payTimer = setInterval(async () => { if (!$('payBody')) return stopPayTimer(); await refresh(); renderPay(); }, 700); }
  function stopPayTimer() { clearInterval(payTimer); payTimer = null; }
  A.__payEsc = () => { if ($('cardCancel')) return $('cardCancel').click(); if ($('payBack')) $('payBack').click(); };
  A.__payEnter = () => { if ($('cardRetry')) $('cardRetry').click(); else if ($('payFinish')) $('payFinish').click(); else if ($('kCharge')) $('kCharge').click(); };
}
function pointsDialog() {
  const m = S.member; const rate = m.pointExchangeRate / 100;
  const max = Math.min(Math.floor(m.points), Math.ceil(S.totals.orderAmount / rate));
  modal(`<h2>Use points</h2><p>${esc(m.name)} has <b>${m.points}</b> points. 1 point = ${money(rate)}. Max on this sale: ${max}.</p>
    <input class="f" id="ptIn" inputmode="numeric" value="${m.usingPoints || max}" autofocus><div id="ptMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" id="ptBack">Back</button><button class="pbtn g" id="ptOk">Apply (Enter)</button></div>`, () => {
    $('ptOk').onclick = async () => { const x = await api('points', { points: Number($('ptIn').value) || 0 }); await refresh(); if (x.ok) { toast(x.message, true); closeModal(); checkoutDialog(); } else msgIn($('ptMsg'), x); };
    $('ptBack').onclick = () => { closeModal(); checkoutDialog(); };
    $('ptIn').onkeydown = e => { if (e.key === 'Enter') $('ptOk').click(); };
  });
}
// worker 2 (1.2.0): done screen. The receipt already printed on the server when the AIR POS terminal has "auto print on
// checkout" on (register.js, checkoutAutoPrint), so nothing prints twice. The change stays big on screen, Enter = next sale,
// P = print, and scanning the next item (a digit) closes this and starts the next sale at once.
function doneDialog(r) {
  const hw = [r.drawer, r.print].filter(Boolean).map(x => `<div class="${x.ok ? 'note' : 'banner'}">${esc(x.message)}</div>`).join('');
  const tl = (r.tenders || []).map(t => `<div class="due"><span>${esc(t.name)}</span><b>${money(t.receiveAmount && t.receiveAmount > t.amount ? t.receiveAmount : t.amount)}</b></div>`).join('');
  const gc = (r.giftCards || []).length ? `<div class="note" id="doneGifts"><b>Gift cards activated (${r.giftCards.length}):</b> ${r.giftCards.map(c => esc(c.masked) + ' ' + money(c.value)).join(' · ')}</div>` : '';
  modal(`<h2>Sale complete</h2><div class="due"><span>Total</span><b>${money(r.due)}</b></div>${tl}${gc}
    <div class="due donechg"><span>Change due</span><span class="big" style="color:#1e7b34">${money(r.change)}</span></div>${hw}<div id="doneMsg" class="msg"></div>
    <p class="note">Enter = next sale · scan the next item to start right away · P = print again</p>
    <div class="row2"><button class="pbtn s" id="dDrawer">Open Drawer</button><button class="pbtn" id="dPrint">Print Receipt (P)</button><button class="pbtn g" id="dNew" autofocus>New Sale (Enter)</button></div>`, () => {
    let gone = false;
    const next = async () => { if (gone) return; gone = true; closeModal(); api('dismiss').then(() => refresh()); focusScan(); };
    // 1.2.0: after a manual print, go straight back to a new sale (no Esc needed). If printing fails the box stays with the reason.
    $('dPrint').onclick = () => printOrder(r.orderId, $('doneMsg'), async x => { gone = true; await api('dismiss'); closeModal(); await refresh(); focusScan(); }); // printed: straight to the next sale, nothing shown
    $('dDrawer').onclick = async () => { msgIn($('doneMsg'), { ok: true, message: 'Opening drawer…' }); const x = await api('drawer-sale'); msgIn($('doneMsg'), x.needPassword ? { ok: false, message: 'Close this window and press Open Drawer (Ctrl+D) to open with a password.' } : x); };
    $('dNew').onclick = next;
    const box = $('dNew').closest('.modal') || $('modalRoot');
    box.addEventListener('keydown', e => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); return $('dPrint').click(); }
      if (/^[0-9]$/.test(e.key) && !gone) { // a scanner (or the cashier) is already on the next item
        e.preventDefault(); e.stopPropagation(); next(); const si = $('scanInput'); if (si) { si.value = e.key; si.focus(); }
      }
    });
  });
}
// Customer (member): look up by number/phone, search, add new, remove from sale
function memberDialog() {
  const m = S.member;
  modal(`<h2>Customer</h2>${m ? `<div class="cardbox"><b>${esc(m.name)}</b> · ${esc(m.number)}<div class="note">Points ${m.points} · Store credit ${money(m.availableBalance)}${m.allowCreditPayment ? ' (+ limit ' + money(m.creditAmount) + ')' : ''}</div></div>` : ''}
    <label class="f">Customer number, phone or name</label><div style="display:flex;gap:6px"><input class="f" id="mQ" autofocus><button class="pbtn" id="mGo">Find</button></div>
    <div id="mRes" style="max-height:38vh;overflow:auto;margin-top:6px"></div><div id="mMsg" class="msg"></div>
    <div class="row2">${m ? '<button class="pbtn r" id="mDel">Remove from sale</button>' : ''}<button class="pbtn s" id="mNew">New customer…</button><button class="pbtn s" data-close>Close (Esc)</button></div>`, () => {
    const go = async () => {
      const q = $('mQ').value.trim(); if (!q) return;
      const x = await api('member-attach', { number: q });
      if (x.ok) { toast(x.message, true); closeModal(); return refresh(); }
      const f = await api('member-find', { keyword: q });
      $('mRes').innerHTML = (f.rows || []).length ? `<table><tbody>${f.rows.map(r => `<tr class="row" data-n="${esc(r.number)}"><td>${esc(r.name)}</td><td>${esc(r.number)}</td><td>${esc(r.mobile || '')}</td></tr>`).join('')}</tbody></table>` : '';
      $('mRes').querySelectorAll('tr').forEach(tr => tr.onclick = async () => { const y = await api('member-attach', { number: tr.dataset.n }); if (y.ok) { toast(y.message, true); closeModal(); refresh(); } else msgIn($('mMsg'), y); });
      msgIn($('mMsg'), { ok: false, message: (f.rows || []).length ? 'Pick a customer' : 'No customer found. Use "New customer" to add one.' });
    };
    $('mGo').onclick = go; $('mQ').onkeydown = e => { if (e.key === 'Enter') go(); };
    if ($('mDel')) $('mDel').onclick = async () => { await act('member-detach'); closeModal(); };
    $('mNew').onclick = () => newMemberDialog($('mQ').value.trim());
  });
}
function newMemberDialog(pre) {
  const phone = /^[\d\s()+-]+$/.test(pre || '') ? pre : '';
  modal(`<h2>New customer</h2><label class="f">Phone (becomes the customer number) *</label><input class="f" id="nmPhone" value="${esc(phone)}" autofocus>
    <div style="display:flex;gap:8px"><div style="flex:1"><label class="f">First name *</label><input class="f" id="nmFirst"></div><div style="flex:1"><label class="f">Last name *</label><input class="f" id="nmLast"></div></div>
    <label class="f">Email</label><input class="f" id="nmEmail"><div id="nmMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel</button><button class="pbtn g" id="nmOk">Add and use (Enter)</button></div>`, () => {
    $('nmOk').onclick = async () => { const x = await api('member-add', { mobile: $('nmPhone').value, firstName: $('nmFirst').value, lastName: $('nmLast').value, email: $('nmEmail').value }); if (x.ok) { toast(x.message, true); closeModal(); refresh(); } else msgIn($('nmMsg'), x); };
    $('modalRoot').querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') $('nmOk').click(); });
  });
}
// Selected line: discount (% or $), tax rate
function lineDialog() {
  const row = selectedRow ?? 0, l = S.cart[row]; if (!l) return toast('Select a line first', false);
  modal(`<h2>Item discount</h2><p><b>${esc(l.name)}</b> · ${l.quantity} × ${money(l.price)} = ${money(l.price * l.quantity)}${l.discountAmount ? ` · now ${money(l.discountAmount)} off` : ''}</p>
    <div class="tabs"><button class="tab on" data-k="percent">% off</button><button class="tab" data-k="amount">$ off</button></div>
    <input class="f" id="ldVal" inputmode="decimal" value="" placeholder="e.g. 10" autofocus>
    <label class="f">Tax rate % for this line</label><input class="f" id="ldTax" inputmode="decimal" value="${l.taxRate ?? ''}">
    <div id="ldMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel</button>${l.custom ? '<button class="pbtn r" id="ldClr">Remove item discount</button>' : ''}<button class="pbtn g" id="ldOk">Apply (Enter)</button></div>`, () => {
    let kind = 'percent';
    $('modalRoot').querySelectorAll('.tab').forEach(b => b.onclick = () => { kind = b.dataset.k; $('modalRoot').querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b)); $('ldVal').focus(); });
    $('ldOk').onclick = async () => {
      const v = $('ldVal').value.trim(), t = $('ldTax').value.trim();
      if (v) { const x = await api('line-discount', { row, kind, value: Number(v) }); if (!x.ok) return msgIn($('ldMsg'), x); toast(x.message, true); }
      if (t !== '' && Number(t) !== l.taxRate) { const y = await api('line-tax', { row, rate: Number(t) }); if (!y.ok) return msgIn($('ldMsg'), y); }
      closeModal(); refresh();
    };
    if ($('ldClr')) $('ldClr').onclick = async () => { await act('line-discount', { row, kind: 'clear' }); closeModal(); };
    $('modalRoot').querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') $('ldOk').click(); });
  });
}
function tempItemDialog() { // Open Item: price (and an optional name, default "Item"); Enter adds it. AIR POS temporary item (type 10).
  modal(`<h2>Open Item</h2><label class="f">Price</label><input class="f" id="tiPrice" inputmode="decimal" autocomplete="off" autofocus>
    <label class="f">Name</label><input class="f" id="tiName" placeholder="Item" autocomplete="off"><div id="tiMsg" class="msg"></div>
    <div class="row2"><button class="pbtn g" id="tiOk">Add (Enter)</button></div>`, () => {
    let busy = false;
    $('tiOk').onclick = async () => { if (busy) return; busy = true; const x = await api('temp-item', { name: $('tiName').value, price: Number($('tiPrice').value), quantity: 1 }); busy = false; if (x.ok) { closeModal(); refresh(); } else msgIn($('tiMsg'), x); };
    $('modalRoot').querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('tiOk').click(); } });
  });
}
function extraChargeDialog() {
  const list = S.extraCharges || []; if (!list.length) return toast('No extra charges are set up (AIR POS back office → settings → extra charge)', false);
  modal(`<h2>Extra charge</h2><label class="f">Charge</label><select class="f" id="ecId">${list.map(x => `<option value="${esc(x.id)}" data-a="${x.defaultAmount || ''}">${esc(x.name)}</option>`).join('')}</select>
    <label class="f">Amount</label><input class="f" id="ecAmt" inputmode="decimal" value="${list[0].defaultAmount || ''}" autofocus><div id="ecMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel</button><button class="pbtn g" id="ecOk">Add (Enter)</button></div>`, () => {
    $('ecId').onchange = () => { $('ecAmt').value = $('ecId').selectedOptions[0].dataset.a; };
    $('ecOk').onclick = async () => { const x = await api('extra-charge', { chargeItemId: $('ecId').value, price: Number($('ecAmt').value) }); if (x.ok) { toast(x.message, true); closeModal(); refresh(); } else msgIn($('ecMsg'), x); };
    $('ecAmt').onkeydown = e => { if (e.key === 'Enter') $('ecOk').click(); };
  });
}
// End of day: X report (any time), Z report (closes the day), cash pay-in / pay-out
async function eodDialog() {
  const [x, z, dl] = await Promise.all([api('x-report'), api('z-list'), api('drawer-log')]);
  const r = x.report || {}, f = (l, v) => `<div class="due"><span>${l}</span><b>${v}</b></div>`;
  const when = t => t ? new Date(t).toLocaleString('en-US') : '';
  modal(`<h2>End of day</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
    <div><h3 style="margin:0">X report (now)</h3>${x.ok ? f('Gross sales', money(r.grossAmount)) + f('Net sales', money(r.amount)) + f('Returns', money(r.returnAmount)) : `<div class="banner">${esc(x.message)}</div>`}
      <div class="row2" style="justify-content:flex-start"><button class="pbtn s" id="xPrev">Preview</button><button class="pbtn" id="xPrint">Print X</button></div>
      <h3 style="margin:16px 0 0">Cash</h3><div class="row2" style="justify-content:flex-start"><button class="pbtn s" id="cIn">Pay in…</button><button class="pbtn s" id="cOut">Pay out…</button><button class="pbtn s" id="cOutClk">Clock out…</button></div>
      <h3 style="margin:16px 0 0">Drawer opens today (this PC)</h3><div class="note" style="margin:2px 0">${(dl.rows || []).filter(d => d.ok).length} opens, ${dl.noSale || 0} without a sale</div>
      <div style="max-height:18vh;overflow:auto" id="eodDrawer"><table class="mini"><tbody>${(dl.rows || []).slice(0, 50).map(d => `<tr><td>${new Date(d.at).toLocaleTimeString('en-US')}</td><td>${esc(d.user)}</td><td>${esc(d.reason)}</td><td class="${d.ok ? 'st-done' : 'st-declined'}">${d.ok ? 'opened' : 'failed'}</td></tr>`).join('') || '<tr><td class="note">None yet</td></tr>'}</tbody></table></div></div>
    <div><h3 style="margin:0">Z reports</h3><div style="max-height:34vh;overflow:auto"><table class="mini"><tbody>${(z.rows || []).map(row => `<tr><td>${esc(row.number)}<div class="note" style="margin:0">${when(row.time)}</div></td><td class="n">${money(row.net)}</td><td><button class="pbtn s" data-zp="${esc(row.id)}">View</button> <button class="pbtn" data-zr="${esc(row.id)}">Print</button></td></tr>`).join('') || '<tr><td class="empty" style="padding:20px">No Z reports yet</td></tr>'}</tbody></table></div>
      <div class="row2" style="justify-content:flex-start"><button class="pbtn r" id="zGen">Run Z (close the day)…</button></div></div></div>
    <div id="eMsg" class="msg"></div><div class="row2"><button class="pbtn s" data-close>Close (Esc)</button></div>`, () => {
    const prev = async (kind, id) => { msgIn($('eMsg'), { ok: true, message: 'Loading…' }); const p = await api('report-preview', { kind, id }); if (!p.ok) return msgIn($('eMsg'), p); msgIn($('eMsg'), { ok: true, message: '' }); pdfView(p.url, kind === 'z' ? 'Z report' : 'X report', () => eodDialog()); };
    const prn = async (kind, id) => { msgIn($('eMsg'), { ok: true, message: 'Printing…' }); msgIn($('eMsg'), await api('report-print', { kind, id })); };
    $('xPrev').onclick = () => prev('x'); $('xPrint').onclick = () => prn('x');
    $('modalRoot').querySelectorAll('[data-zp]').forEach(b => b.onclick = () => prev('z', b.dataset.zp));
    $('modalRoot').querySelectorAll('[data-zr]').forEach(b => b.onclick = () => prn('z', b.dataset.zr));
    $('zGen').onclick = async () => { if (!confirm('Run the Z report now? This closes the sales day for this register.')) return; const g = await api('z-generate'); msgIn($('eMsg'), g); if (g.ok) setTimeout(eodDialog, 700); };
    $('cIn').onclick = () => cashDialog('in'); $('cOut').onclick = () => cashDialog('out'); $('cOutClk').onclick = () => clockOutDialog();
  });
}
function pdfView(url, title, back) {
  modal(`<h2>${esc(title)}</h2><iframe src="${esc(url)}" style="width:min(900px,86vw);height:70vh;border:1px solid #ccd"></iframe><div class="row2"><button class="pbtn s" id="pvBack">Back (Esc)</button></div>`, () => { $('pvBack').onclick = () => back ? back() : closeModal(); });
}
async function cashChooser() { // Ctrl+K: pick Pay In or Pay Out (I / O keys, or click)
  const b = await api('drawer-balance');
  modal(`<h2>Cash in / out</h2><p class="note">Cash in drawer now: ${money(b.balance)}</p>
    <div class="row2"><button class="pbtn g" id="ccIn">Pay In (I)<br><small>add cash to drawer</small></button><button class="pbtn r" id="ccOut">Pay Out (O)<br><small>take cash from drawer</small></button></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel (Esc)</button></div>`, () => {
    $('ccIn').onclick = () => cashDialog('in'); $('ccOut').onclick = () => cashDialog('out');
    const kh = e => { if (!$('ccIn')) return document.removeEventListener('keydown', kh, true); const k = e.key.toLowerCase(); if (k === 'i' || k === 'o') { e.preventDefault(); e.stopPropagation(); document.removeEventListener('keydown', kh, true); cashDialog(k === 'i' ? 'in' : 'out'); } };
    document.addEventListener('keydown', kh, true); setTimeout(() => $('ccIn') && $('ccIn').focus(), 0);
  });
}
async function cashDialog(kind) {
  const b = await api('drawer-balance');
  modal(`<h2>${kind === 'in' ? 'Pay in (add cash to drawer)' : 'Pay out (take cash from drawer)'}</h2><p class="note">Cash in drawer now: ${money(b.balance)}</p>
    <label class="f">Amount</label><input class="f" id="cmAmt" inputmode="decimal" autofocus><label class="f">Reason</label><input class="f" id="cmRem" placeholder="e.g. change for the day, bought supplies">
    <div id="cmMsg" class="msg"></div><div class="row2"><button class="pbtn s" id="cmBack">Back</button><button class="pbtn g" id="cmOk">${kind === 'in' ? 'Pay in' : 'Pay out'} (Enter)</button></div>`, () => {
    $('cmOk').onclick = async () => { $('cmOk').disabled = true; const x = await api('cash-move', { kind, amount: Number($('cmAmt').value), remark: $('cmRem').value }); $('cmOk').disabled = false; if (x.ok) { toast(x.message, true); closeModal(); } else msgIn($('cmMsg'), x); };
    $('cmBack').onclick = () => cashChooser();
    $('modalRoot').querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') $('cmOk').click(); });
  });
}
async function settingsDialog() {
  const p = await api('printers'), st = S.settings || {};
  const ps = { printerType: 'auto', printerConn: 'windows', printerHost: '', printerPort: 9100, serialPort: '', serialBaud: 9600, printMethod: 'auto', printerCols: 48, printerCut: true, drawerPin: 2, codePage: 'pc437', imageMode: 'gsv0', ...st, ...(p.printer || {}) };
  const det = p.details || [], typeName = { epson: 'Epson', star: 'Star', generic: 'Generic ESC/POS' };
  const tOf = n => { const d = det.find(x => x.name === n); return d ? ' (' + (d.virtual ? 'virtual, skipped by Automatic' : d.receipt ? typeName[d.type] + ' receipt' : 'office / other: prints through its Windows driver') + (d.isDefault ? ', Windows default' : '') + (d.workOffline ? ', set to offline' : d.problem ? ', ' + d.problem : '') + ')' : ''; };
  const opts = [''].concat(p.printers || []);
  const sel = (id, list, v) => `<select class="f" id="${id}">${list.map(([k, t]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const ports = (p.ports || []).map(x => [x.port, x.port + (x.epsonVirtual ? ' (Epson TM Virtual Port)' : x.device ? ' (' + x.device.replace(/^\\Device\\/, '') + ')' : '')]);
  if (ps.serialPort && !ports.some(x => x[0] === ps.serialPort)) ports.push([ps.serialPort, ps.serialPort + ' (not found)']);
  modal(`<h2>Printer &amp; cash drawer</h2>
    <label class="f">Connection</label>${sel('seCn', [['windows', 'Windows printer (USB, installed in Windows)'], ['network', 'Network printer (IP address, port 9100)'], ['serial', 'COM port / Epson TM Virtual Port']], ps.printerConn)}
    <div id="seWin"><label class="f">Receipt printer</label><select class="f" id="seP">${opts.map(n => `<option value="${esc(n)}" ${n === st.printerName ? 'selected' : ''}>${n ? esc(n + tOf(n)) : 'Automatic' + (p.resolved ? ' (' + esc(p.resolved) + ')' : ' (receipt printer or Windows default)')}</option>`).join('')}
      ${st.printerName && !opts.includes(st.printerName) ? `<option selected value="${esc(st.printerName)}">${esc(st.printerName)} (not found)</option>` : ''}</select>
      ${(p.printers || []).length ? (p.reason ? `<p class="note" id="seWhy">Automatic pick: ${esc(p.resolved || '')} — ${esc(p.reason)}${p.method ? ' · prints ' + (p.method === 'driver' ? 'through the Windows driver' : 'direct (ESC/POS)') : ''}</p>` : '') : `<p class="note keep">${esc(p.message || 'No printers found on this PC.')}</p>`}</div>
    <div id="seNet"><label class="f">Printer IP address and port</label><div style="display:flex;gap:8px"><input class="f" id="seIP" placeholder="192.168.1.50" value="${esc(ps.printerHost)}" style="flex:3"><input class="f" id="sePort" type="number" value="${esc(ps.printerPort)}" style="flex:1"></div></div>
    <div id="seSer"><label class="f">Port</label>${ports.length ? sel('seCom', ports, ps.serialPort) : '<input class="f" id="seCom" placeholder="COM3" value="' + esc(ps.serialPort) + '">'}
      <label class="f">Speed (baud)</label>${sel('seBd', [9600, 19200, 38400, 57600, 115200].map(x => [x, x]), ps.serialBaud)}</div>
    <label class="f">Printer type</label>${sel('seT', [['auto', 'Auto (pick from the printer name)'], ['epson', 'Epson (TM-T20II / M267D, other TM)'], ['generic', 'Generic ESC/POS (M804, POS-80, Xprinter...)'], ['star', 'Star (TSP100 / TSP143)']], ps.printerType)}
    <p class="note" id="seDet">${p.detected ? 'Using: ' + esc(p.detected.label) + (p.detected.auto ? ' (picked automatically)' : '') : ''}</p>
    <div id="seGen"><label class="f">Characters per line</label>${sel('seCols', [[48, '48 (80 mm paper, normal)'], [42, '42 (80 mm, wider margins)'], [32, '32 (58 mm paper)']], ps.printerCols)}
      <label class="f">Paper cutter</label>${sel('seCut', [['1', 'Cut the paper after each receipt'], ['0', 'No cutter (tear off)']], ps.printerCut === false ? '0' : '1')}
      <label class="f">Code page (accents, €)</label>${sel('seCP', [['pc437', 'PC437 (USA, default)'], ['pc850', 'PC850 (Latin)'], ['pc858', 'PC858 (Latin + €)'], ['wpc1252', 'Windows-1252']], ps.codePage)}
      <label class="f">Picture command</label>${sel('seImg', [['gsv0', 'GS v 0 (most printers)'], ['escstar', 'ESC * (older printers that print garbage)']], ps.imageMode)}</div>
    <label class="f">Cash drawer</label>${sel('seDP', [[2, 'Drawer 1 (pin 2, normal)'], [5, 'Drawer 2 (pin 5)']], ps.drawerPin)}
    <label class="f">Open drawer after a sale</label>${sel('seC', [['cash', 'When cash or a check was taken (normal)'], ['every', 'After every sale'], ['airpos', 'Follow the AIR POS terminal setting'], ['off', 'Never (Open Drawer button only)']], st.drawerAutoOpen || 'cash')}
    <label class="f">Drawer wait (seconds)</label><input class="f" id="seDW" type="number" min="1" max="30" step="1" value="${esc(st.drawerWaitSec || 5)}">
    <p class="note" style="margin-top:2px">How long the register waits for the printer to confirm the drawer kick (1-30, default 5). After that the sale carries on with a short message.</p>
    <details id="seAdv"><summary class="note" style="cursor:pointer">Advanced: drawer pulse</summary>
      <label class="f">Drawer kick pulse</label>${sel('sePL', [[50, 'Standard (Epson ESC p 25/250: 50 ms on, 500 ms off; Star: printer default)'], [100, '100 ms'], [200, '200 ms'], [250, '250 ms (heavy / older drawers)']], st.drawerPulse || 50)}
      <p class="note">Leave on Standard unless the drawer clicks but does not pop open. Check the drawer's label for its rated pulse.</p></details>
    <label class="f chk" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="seRT" style="width:20px;height:20px" ${S.user && S.user.manager ? '' : 'disabled'}> Refund tax on returns without a receipt</label>
    <p class="note" id="seRTnote">On: the customer gets the price plus sales tax back. AIR POS reports won't show that refunded part as tax.${S.user && S.user.manager ? '' : ' Only a manager can change this.'}</p>
    <label class="f">Printing engine</label><select class="f" id="seH"><option value="auto">Built-in (fallback: AIR POS service if running)</option><option value="builtin">Built-in only</option><option value="airpos">AIR POS hardware service only (old way)</option></select>
    <div id="seMeth"><label class="f">Print receipts</label>${sel('seM', [['auto', 'Automatic (receipt printers direct, any other printer through its Windows driver)'], ['raw', 'Direct to printer (cut + drawer by Air Register)'], ['driver', 'Through the Windows printer driver']], ps.printMethod)}</div>
    <p class="note">${esc((S.hw && S.hw.message) || '')}. Auto print is switched on or off in AIR POS back office (terminal settings).</p><div id="seMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" id="seTP">Print test page</button><button class="pbtn s" id="seTD">Test drawer</button><button class="pbtn s" id="seDiag">Save diagnostics</button><button class="pbtn s" data-close>Close (Esc)</button><button class="pbtn g" id="seOk">Save</button></div>`, () => {
    $('seH').value = st.hardware || 'auto';  $('seRT').checked = st.refundTaxNoReceipt !== false;
    const show = () => {
      const cn = $('seCn').value, ty = $('seT').value, d = det.find(x => x.name === ($('seP').value || p.resolved));
      $('seWin').style.display = cn === 'windows' ? '' : 'none'; $('seNet').style.display = cn === 'network' ? '' : 'none'; $('seSer').style.display = cn === 'serial' ? '' : 'none';
      $('seMeth').style.display = cn === 'windows' ? '' : 'none';
      const eff = ty !== 'auto' ? ty : cn === 'windows' ? (d ? d.type : (p.detected && p.detected.type)) : cn === 'serial' && (p.ports || []).some(x => x.port === $('seCom').value && x.epsonVirtual) ? 'epson' : 'generic';
      $('seGen').style.display = eff === 'generic' ? '' : 'none';
      $('seDet').textContent = eff ? 'Using: ' + ({ epson: 'Epson TM-T20II (ESC/POS)', generic: 'Generic ESC/POS', star: 'Star TSP100 (raster)' }[eff] || eff) + (ty === 'auto' ? ' (picked automatically)' : '') : '';
    };
    ['seCn', 'seT', 'seP', 'seCom'].forEach(id => { if ($(id)) $(id).onchange = show; }); show();
    const save = async () => {
      const x = await api('settings', { printerName: $('seP').value, hardware: $('seH').value, drawerAutoOpen: $('seC').value, drawerWaitSec: Number($('seDW').value) || 5, drawerPulse: Number($('sePL').value) || 50, ...(S.user && S.user.manager ? { refundTaxNoReceipt: $('seRT').checked } : {}),
        printerConn: $('seCn').value, printerType: $('seT').value, printerHost: $('seIP').value, printerPort: Number($('sePort').value) || 9100, serialPort: $('seCom').value, serialBaud: Number($('seBd').value),
        printMethod: $('seM').value, printerCols: Number($('seCols').value), printerCut: $('seCut').value === '1', codePage: $('seCP').value, imageMode: $('seImg').value, drawerPin: Number($('seDP').value) });
      await refresh(); return x;
    };
    $('seOk').onclick = async () => { const x = await save(); msgIn($('seMsg'), x); };
    $('seTP').onclick = async () => { await save(); msgIn($('seMsg'), { ok: true, message: 'Printing…' }); msgIn($('seMsg'), await api('test-print')); };
    $('seDiag').onclick = async () => { msgIn($('seMsg'), { ok: true, message: 'Checking printers…' }); const x = await api('printer-diagnostics'); msgIn($('seMsg'), x); };
    $('seTD').onclick = async () => { await save(); msgIn($('seMsg'), { ok: true, message: 'Opening drawer…' }); const x = await api('test-drawer'); msgIn($('seMsg'), x.ok ? { ...x, message: x.message + ' (pin ' + $('seDP').value + ')' } : x); };
  });
}
async function promoDialog() {
  modal(`<h2>Promo code</h2><input class="f" id="pcIn" value="${esc(S.order.promotionalCode || '')}" autofocus><div id="pcMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel</button>${S.order.promotionalCode ? '<button class="pbtn r" id="pcClr">Remove</button>' : ''}<button class="pbtn g" id="pcOk">Apply (Enter)</button></div>`, () => {
    $('pcOk').onclick = async () => { const x = await api('promo-code', { code: $('pcIn').value }); await refresh(); if (x.ok) { toast(x.message, true); closeModal(); } else msgIn($('pcMsg'), x); };
    if ($('pcClr')) $('pcClr').onclick = async () => { await act('promo-code', { code: '' }); closeModal(); };
    $('pcIn').onkeydown = e => { if (e.key === 'Enter') $('pcOk').click(); };
  });
}
function qtyDialog() {
  const line = S.cart[selectedRow ?? 0]; if (!line) return toast('No line selected', false);
  modal(`<h2>Quantity</h2><p>${esc(line.name)}</p><input class="f" id="qIn" inputmode="decimal" value="${line.quantity}" autofocus>
    <div class="row2"><button class="pbtn s" data-close>Cancel</button><button class="pbtn g" id="qOk">OK (Enter)</button></div>`, () => {
    $('qOk').onclick = async () => { const r = await act('qty', { row: selectedRow ?? 0, qty: Number($('qIn').value) }); if (r && r.ok) closeModal(); };
    $('qIn').onkeydown = e => { if (e.key === 'Enter') $('qOk').click(); };
  });
}
function discountDialog() {
  if (!S.cart.length) return toast('The order is empty', false);
  const o = S.order;
  modal(`<h2>Order Discount</h2><p class="note">Items total ${money(S.totals.itemAmount)} (before order discount)</p>
    ${(S.discounts || []).length ? `<label class="f">Predefined discount</label><select class="f" id="dPre"><option value="">None</option>${S.discounts.map(d => `<option value="${esc(d.id)}" ${d.id === o.discountConfigSubId ? 'selected' : ''}>${esc(d.name)} — ${d.rate}%${d.membersOnly ? ' (members)' : ''}</option>`).join('')}</select>` : ''}
    <label class="f">Extra order discount</label><select class="f" id="dType"><option value="percent">Percentage (%)</option><option value="amount">Amount ($)</option></select>
    <label class="f">Value</label><input class="f" id="dVal" inputmode="decimal" value="${o.orderDiscountMethod === 20 ? o.orderDiscountAmount : o.orderDiscount}" autofocus>
    <div class="row2"><button class="pbtn s" data-close>Cancel</button><button class="pbtn r" id="dClr">Clear</button><button class="pbtn g" id="dOk">Apply (Enter)</button></div>`, () => {
    $('dType').value = o.orderDiscountMethod === 20 ? 'amount' : 'percent';
    if ($('dPre')) $('dPre').onchange = async () => { const r = await api('predefined-discount', { id: $('dPre').value || null }); toast(r.message, r.ok); await refresh(); if (!r.ok) $('dPre').value = S.order.discountConfigSubId || ''; };
    $('dOk').onclick = async () => { const r = await act('discount', { kind: $('dType').value, value: Number($('dVal').value) }); if (r && r.ok) closeModal(); };
    $('dClr').onclick = async () => { await act('discount', { kind: 'clear' }); closeModal(); };
    $('dVal').onkeydown = e => { if (e.key === 'Enter') $('dOk').click(); };
  });
}
function searchDialog() {
  modal(`<h2>Product Search</h2><input class="f" id="sIn" placeholder="Name, number or UPC" autofocus>
    <div style="max-height:52vh;overflow:auto;margin-top:8px"><table><thead><tr><th>Number</th><th>UPC</th><th>Name</th><th class="n">Price</th></tr></thead><tbody id="sRes"></tbody></table></div>
    <p class="note">↑/↓ to choose, Enter to add, Esc to close.</p>`, () => {
    let rows = [], sel = 0, t;
    const draw = () => { $('sRes').innerHTML = rows.map((p, i) => `<tr class="row ${i === sel ? 'sel' : ''}" data-i="${i}"><td>${esc(p.number)}</td><td>${esc(p.upc)}</td><td>${esc(p.name)}</td><td class="n">${money(p.price)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No products</td></tr>';
      $('sRes').querySelectorAll('tr.row').forEach(tr => tr.onclick = () => add(rows[+tr.dataset.i])); };
    const add = async p => { if (!p) return; closeModal(); await act('scan', { code: p.number }); };
    const go = async () => { const r = await api('search', { keyword: $('sIn').value.trim() }); rows = r.rows || []; sel = 0; draw(); };
    $('sIn').oninput = () => { clearTimeout(t); t = setTimeout(go, 300); };
    $('sIn').onkeydown = e => { if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, rows.length - 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); } else if (e.key === 'Enter') add(rows[sel]); };
    go();
  });
}
async function heldDialog() {
  const r = await api('held');
  if (!(r.rows || []).length) return toast('No held orders', false);
  modal(`<h2>Held Orders</h2><table><thead><tr><th>Order</th><th class="n">Qty</th><th class="n">Amount</th><th></th></tr></thead><tbody>${r.rows.map((o, i) => `<tr><td>${esc(o.number)}</td><td class="n">${o.quantity}</td><td class="n">${money((o.amount || 0) + (o.tax || 0))}</td>
    <td><button class="pbtn g" data-res="${esc(o.id)}" ${i === 0 ? 'autofocus' : ''}>Resume</button> <button class="pbtn s" data-void="${esc(o.id)}">Void</button></td></tr>`).join('')}</tbody></table>
    <div class="row2"><button class="pbtn s" data-close>Close (Esc)</button></div>`, () => {
    $('modalRoot').querySelectorAll('[data-res]').forEach(b => b.onclick = async () => {
      if (S.cart.length && !confirm('The current sale will be cleared. Resume the held order?')) return;
      closeModal(); await act('resume', { orderId: b.dataset.res }); });
    $('modalRoot').querySelectorAll('[data-void]').forEach(b => b.onclick = async () => { if (!confirm('Void this held order?')) return; const x = await api('void-held', { orderId: b.dataset.void }); toast(x.message || (x.ok ? 'Voided' : 'Void failed'), x.ok); closeModal(); heldDialog(); });
  });
}
// 1.2.0: date presets + totals + CSV export (opens in Excel)
const H_PRESETS = [['recent', 'Latest orders'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['lastweek', 'Last week'], ['month', 'This month'], ['lastmonth', 'Last month'], ['d30', 'Past 30 days'], ['d90', 'Past 90 days'], ['quarter', 'This quarter'], ['year', 'This year'], ['day', 'One date…']];
function hRange(p, day) {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0); const D = (y, m, d) => new Date(y, m, d); const y = d0.getFullYear(), m = d0.getMonth(), dd = d0.getDate(), wd = (d0.getDay() + 6) % 7; // weeks start Monday
  const r = { today: [d0, D(y, m, dd + 1)], yesterday: [D(y, m, dd - 1), d0], week: [D(y, m, dd - wd), D(y, m, dd + 1)], lastweek: [D(y, m, dd - wd - 7), D(y, m, dd - wd)], month: [D(y, m, 1), D(y, m, dd + 1)], lastmonth: [D(y, m - 1, 1), D(y, m, 1)],
    d30: [D(y, m, dd - 29), D(y, m, dd + 1)], d90: [D(y, m, dd - 89), D(y, m, dd + 1)], quarter: [D(y, m - m % 3, 1), D(y, m, dd + 1)], year: [D(y, 0, 1), D(y, m, dd + 1)] }[p];
  if (p === 'day' && day) { const [a, b, c] = day.split('-').map(Number); return [D(a, b - 1, c), D(a, b - 1, c + 1)]; }
  return r || null;
}
async function historyDialog(q = '', preset = 'recent', day = '') {
  const rg = hRange(preset, day);
  const r = await api('orders', { number: q || null, ...(rg ? { from: rg[0].toISOString(), to: rg[1].toISOString() } : {}) });
  const rows = r.rows || [], done = rows.filter(o => o.status === 20), sum = done.reduce((a, o) => a + (o.amount || 0) + (o.tax || 0), 0);
  modal(`<h2>Order History</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><input class="f" id="hQ" placeholder="Order number (Enter to search)" value="${esc(q)}" style="flex:2">
    <select class="f" id="hP" style="flex:1">${H_PRESETS.map(([k, l]) => `<option value="${k}" ${k === preset ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <input class="f" id="hD" type="date" value="${esc(day)}" style="flex:1;${preset === 'day' ? '' : 'display:none'}"><button class="pbtn s" id="hCsv">Export CSV</button></div>
    <div class="note" id="hSum">${rows.length} order${rows.length === 1 ? '' : 's'}${rg ? ` · ${done.length} completed · ${money(sum)}` : ''}${r.capped ? ' · showing the newest 750 only' : ''}</div>
    <div style="max-height:56vh;overflow:auto;margin-top:8px"><table><thead><tr><th>Order</th><th>Time</th><th>Status</th><th>Paid by</th><th class="n">Qty</th><th class="n">Total</th><th></th></tr></thead>
    <tbody>${rows.map(o => `<tr><td>${esc(o.number)}</td><td>${o.time ? esc(new Date(o.time).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })) : ''}</td><td>${esc(o.statusName)}</td><td>${esc(o.paymentTypeName)}</td><td class="n">${o.quantity}${o.quantityReturn ? ' (−' + o.quantityReturn + ')' : ''}</td><td class="n">${money((o.amount || 0) + (o.tax || 0))}</td>
    <td style="white-space:nowrap">${o.status === 20 ? `<button class="pbtn s" data-print="${esc(o.id)}">Reprint</button>${(o.quantityReturn || 0) < (o.quantity || 0) ? ` <button class="pbtn r" data-ret="${esc(o.id)}">Return</button>` : ''}` : ''}${o.status === 15 ? `<button class="pbtn g" data-res="${esc(o.id)}">Resume</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No orders</td></tr>'}</tbody></table></div>
    <div id="hMsg" class="msg"></div><div class="row2"><button class="pbtn s" data-close>Close (Esc)</button></div>`, () => {
    $('hQ').onkeydown = e => { if (e.key === 'Enter') historyDialog($('hQ').value.trim(), $('hP').value, $('hD').value); };
    $('hP').onchange = () => { if ($('hP').value === 'day') { $('hD').style.display = ''; $('hD').focus(); return; } historyDialog($('hQ').value.trim(), $('hP').value); };
    $('hD').onchange = () => { if ($('hD').value) historyDialog($('hQ').value.trim(), 'day', $('hD').value); };
    $('hCsv').onclick = () => {
      const cell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const csv = [['Order', 'Time', 'Status', 'Paid by', 'Qty', 'Returned', 'Amount', 'Tax', 'Total'].map(cell).join(',')].concat(rows.map(o => [o.number, o.time ? new Date(o.time).toLocaleString('en-US') : '', o.statusName, o.paymentTypeName, o.quantity, o.quantityReturn || 0, (o.amount || 0).toFixed(2), (o.tax || 0).toFixed(2), ((o.amount || 0) + (o.tax || 0)).toFixed(2)].map(cell).join(','))).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `orders-${preset}${day ? '-' + day : ''}.csv`; document.body.appendChild(a); a.click(); a.remove();
    };
    $('modalRoot').querySelectorAll('[data-print]').forEach(b => b.onclick = () => printOrder(b.dataset.print, $('hMsg')));
    $('modalRoot').querySelectorAll('[data-ret]').forEach(b => b.onclick = async () => { if (S.cart.length) return toast('Finish or hold the current sale first', false); closeModal(); await act('return-start', { kind: 'receipt', orderId: b.dataset.ret }); });
    $('modalRoot').querySelectorAll('[data-res]').forEach(b => b.onclick = async () => { closeModal(); await act('resume', { orderId: b.dataset.res }); });
    $('hQ').focus();
  });
}
function returnConfirmDialog() {
  const t = S.ret.totals; if (!S.ret.subs.length) return toast('Scan or tap the items being returned first', false);
  const pays = t.payments || [], cash = pays.some(p => p.paymentType === 10);
  modal(`<h2>Confirm Return</h2><div class="due"><span>Items</span><b>${t.quantity}</b></div>${S.ret.kind === 'receipt' ? `<div class="due"><span>Amount + tax</span><b>${money(t.amount)} + ${money(t.tax)}</b></div>` : ''}
    <p class="note" style="margin-bottom:0">Refund goes back the way the customer paid:</p>
    ${pays.map(p => `<div class="due"><span>${esc(p.name)}${p.paymentType === 20 || p.paymentType === 30 ? ' (back to the card; Air Register checks it with AIR POS)' : ''}</span><b>${money(p.amount)}</b></div>`).join('')}
    <div class="due"><span>Total refund</span><span class="big" style="color:#c0392b">${money(t.refund)}</span></div>
    <div class="row2"><button class="pbtn s" data-close>Back (Esc)</button><button class="pbtn r" id="rOk" autofocus>Refund ${money(t.refund)} (Enter)</button></div>`, () => {
    $('rOk').onclick = async () => { $('rOk').disabled = true; const r = await act('return-confirm'); if (r && r.ok) retDoneDialog(r, pays, cash); else $('rOk').disabled = false; };
  });
}
function retDoneDialog(r, pays = [], cash = true) {
  const hw = [r.drawer, r.print].filter(Boolean).map(x => `<div class="${x.ok ? 'note' : 'banner'}">${esc(x.message)}</div>`).join('');
  const cashAmt = pays.filter(p => p.paymentType === 10).reduce((a, p) => a + p.amount, 0);
  const cd = r.card; // receipt return to card: AIR POS status check (Completed / not finished)
  const cardHtml = cd ? `<div id="rdCard" class="${cd.done ? 'note' : 'banner'}" style="font-weight:700">${esc(cd.message)}</div>${cd.done ? '' : '<button class="pbtn r" id="rdCardRetry">Retry card refund</button>'}` : '';
  modal(`<h2>${cd && !cd.done ? 'Return recorded — card refund NOT finished' : 'Return complete'}</h2>${pays.map(p => `<div class="due"><span>${p.paymentType === 10 ? 'Give back cash' : esc(p.name)}</span><b>${money(p.amount)}</b></div>`).join('')}
    <div class="due"><span>${cash ? 'Cash to hand back' : 'Total refunded'}</span><span class="big" style="color:#c0392b">${money(cash ? cashAmt : r.refund)}</span></div>${cardHtml}${hw}<div id="rdMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" id="rdDrawer">Open Drawer</button><button class="pbtn" id="rdPrint">Print Return Receipt</button><button class="pbtn g" data-close autofocus>Done (Enter)</button></div>`, () => {
    $('rdPrint').onclick = async () => msgIn($('rdMsg'), await api('print-return', { returnId: r.returnId }));
    if ($('rdCardRetry')) $('rdCardRetry').onclick = async () => {
      const b = $('rdCardRetry'); b.disabled = true; $('rdCard').textContent = 'Checking the card refund with AIR POS…';
      const x = await api('card-refund-retry', { retId: cd.retId });
      if (x.busy) return; // a tap that arrived while the first was still running: the first one's answer shows
      $('rdCard').textContent = x.message; $('rdCard').className = x.ok ? 'note' : 'banner'; b.disabled = false; if (x.ok) b.remove(); refresh();
    };
    $('rdDrawer').onclick = async () => { msgIn($('rdMsg'), { ok: true, message: 'Opening drawer…' }); const x = await api('drawer-sale'); msgIn($('rdMsg'), x.needPassword ? { ok: false, message: 'Close this window and press Open Drawer (Ctrl+D) to open with a password.' } : x); };
  });
}
async function drawer() {
  const r = await act('drawer');
  if (r && !r.needPassword) flash(r.ok ? '💵 Drawer opened' : r.hw === 'timeout' ? '⚠ Drawer: no answer (see message below)' : '⚠ Drawer did not open (see message below)', r.ok);
  if (r && r.needPassword) modal(`<h2>Open Drawer</h2><label class="f">Your password</label><input class="f" type="password" id="dpw" autocomplete="new-password" autofocus>
    <div class="row2"><button class="pbtn s" data-close>Cancel</button><button class="pbtn g" id="dpOk">Open</button></div>`, () => {
    $('dpOk').onclick = async () => { const pw = $('dpw').value; $('dpw').value = ''; closeModal(); await act('drawer', { password: pw }); };
    $('dpw').onkeydown = e => { if (e.key === 'Enter') $('dpOk').click(); };
  });
}
async function logout() {
  if (S.cart && S.cart.length && !confirm('The current sale is not finished and will be lost. Log out anyway?')) return;
  await act('logout');
}


// Print / reprint an order receipt: ONE action, nothing on screen. The store's default template (with its default
// field text) goes straight to the default/auto-picked receipt printer. Only a FAILED print shows a short error.
async function printOrder(orderId, msgEl, onDone) {
  let r = await api('print', { orderId });
  if (r && r.needTemplate) r = await api('print', { orderId: r.orderId, choice: { templateIds: [r.defaultTemplateId || (r.templates[0] || {}).id].filter(Boolean) } });
  if (r && r.ok) return onDone ? onDone(r) : r;
  const m = 'Not printed: ' + ((r && r.message) || 'printer did not answer');
  if (msgEl && document.body.contains(msgEl)) { msgEl.textContent = m; msgEl.className = 'msg err'; } else toast(m, false);
  return r;
}

// ---------- actions ----------
const A = {
  'checkout': checkoutDialog, 'new-sale': () => (S.mode === 'return' ? act('return-cancel') : act('new-sale')),
  'hold': () => (S.mode === 'return' ? toast('Not in return mode', false) : act('hold')), 'load-hold': heldDialog, 'drawer': drawer,
  'return': () => (S.mode === 'return' ? act('return-cancel') : act('return-toggle', {}, { silent: true })), // no receipt: toggles return scanning (red lines)
  'history': () => historyDialog(), 'search': searchDialog, 'reprint': () => (S.lastOrderId ? printOrder(S.lastOrderId) : historyDialog()),
  'discount': discountDialog, 'qty-plus': () => act('qty-plus', { row: selectedRow ?? 0 }, { silent: true }), 'qty-minus': () => act('qty-minus', { row: selectedRow ?? 0 }, { silent: true }),
  'qty-edit': qtyDialog, 'remove': () => { const r = selectedRow ?? 0, n = S.mode === 'return' ? 0 : S.cart.length; return S.mix && r >= n && S.mix.lines[r - n] ? act('mix-remove', { row: r - n }) : act('remove', { row: r }); }, 'close': () => { const h = $('__airpos_help'); if (h) return h.remove(); if ($('payBody') && A.__payEsc) return A.__payEsc(); if (modalOpen()) return closeModal(); focusScan(); },
  'logout': logout, 'clock-out': clockOutDialog, 'card': checkoutDialog,
  'customer': memberDialog, 'item-discount': lineDialog, 'open-item': () => (S.mode === 'return' ? toast('Not in return mode', false) : tempItemDialog()),
  'extra-charge': () => (S.mode === 'return' ? toast('Not in return mode', false) : extraChargeDialog()), 'promo': () => (S.mode === 'return' ? toast('Not in return mode', false) : promoDialog()),
  'end-of-day': eodDialog, 'cash-move': () => cashChooser(), 'settings': settingsDialog,
  'clear-customer': () => (S.member ? act('member-detach') : toast('No customer on this sale', false)),
  'local:help': () => AirposShortcuts.helpOverlay(keys, 'Air Register keys'),
  'tax-off': () => (S.mode === 'return' ? toast('Tax Off is for sales', false) : !S.cart.length && !(S.order && S.order.taxExempt) ? toast('Scan items first, then F5 = Tax Off for this sale', false) : taxOff()),
  'qty-star': () => { const i = $('scanInput'); if (!i || modalOpen()) return; i.value = '*'; i.focus(); },
  'quick-search': () => { const q = $('qsIn'); if (q) { q.focus(); q.select(); } },
};
const LAYOUT = {
  actions: [
    ['New', 'Ctrl + Shift + N', '⊕', 'new-sale'], ['History', 'Ctrl + L', '🧾', 'history'], ['Hold', 'Ctrl + H', '🕒', 'hold'], ['Load Hold', 'Ctrl + Shift + H', '👥', 'load-hold'],
    ['Open Drawer', 'Ctrl + D', '💵', 'drawer'], ['Return', 'Ctrl + R', '↩', 'return', 'red'],
    ['Customer', 'F3', '👤', 'customer'], ['End of Day', 'Ctrl + E', '📊', 'end-of-day'], ['Clock Out', 'Ctrl + Shift + X', '⏱', 'clock-out'], ['Log Out', 'Ctrl + Shift + U', '⏻', 'logout', 'red'],
  ],
  right: [
    ['Transaction Actions', [['Open Item', 'F7', 'open-item'], ['Return', 'Ctrl + R', 'return', 'red'], ['Take Return', 'receipt · Ctrl + L', 'history'], ['Reprint Receipt', 'Ctrl + P', 'reprint'], ['Open Finder', 'Ctrl + F', 'search'], ['Sale Discount', 'F6', 'discount'], ['Tax Off', 'F5', 'tax-off'], ['Promo Code', 'F9', 'promo'], ['Extra Charge', 'F8', 'extra-charge'], ['Clear Customer', 'Shift + F3', 'clear-customer']]],
    ['Items', [['Qty +', '+', 'qty-plus'], ['Qty −', '−', 'qty-minus'], ['Set Qty', '* then number', 'qty-edit'], ['Remove Line', 'Del', 'remove', 'red'], ['Item Discount', 'F4', 'item-discount']]],
    ['Register', [['Cash In / Out', 'Ctrl + K', 'cash-move'], ['Settings', 'Ctrl + ,', 'settings'], ['Keys', 'F1', 'local:help'], ['Hardware check', 'Ctrl + Shift + D', 'hw']]],
  ],
};
A.hw = async () => { const r = await api('hardware'); toast(r.message, r.ok); refresh(); };
function run(a) { if (!a) return; if (!S.loggedIn) return; (A[a] || (() => toast('Unknown action', false)))(); }
function build() {
  const ab = ([l, k, ic, a, st]) => `<button class="abtn ${st || ''} ${a ? '' : 'na'}" data-a="${a || ''}" title="${a ? esc(l) : 'Not in Air Register yet'}"><span class="ic">${ic}</span><span><span class="t">${l}</span>${k ? `<span class="k">${k}</span>` : ''}</span></button>`;
  const HG = ['hold', 'load-hold', 'aside-put', 'aside-load'], hg = HG.map(a => LAYOUT.actions.find(b => b[3] === a)).filter(Boolean); // one 2x2 group: Hold | Load Hold / Put Aside | Load Aside
  $('actions').innerHTML = LAYOUT.actions.map(b => (hg.length && b[3] === hg[0][3] ? `<div class="hgrp">${hg.map(ab).join('')}</div>` : HG.includes(b[3]) ? '' : ab(b))).join('');
  $('right').innerHTML = LAYOUT.right.map(([g, bs]) => `<h3>${g}</h3><div class="rgrid">${bs.map(([l, k, a, st]) => `<button class="rbtn ${st || ''} ${a ? '' : 'na'}" data-a="${a || ''}" title="${a ? '' : 'Not in Air Register yet'}">${l}${k ? `<small>${k}</small>` : ''}</button>`).join('')}</div>`).join('');
  $('tiles').innerHTML = [['customer', 'Customers', '👤', 'customer', 'F3'], ['items', 'Items', '🛒', 'close', 'Esc'], ['payment', 'Payment', '💳', 'checkout', 'F12']] // top row: ONLY these three (F6 discount, F5 tax off, Ctrl+L History stay on keys + sidebars)
    .map(([id, l, ic, a, k]) => `<div class="tile ${id === 'items' ? 'active' : ''}" data-a="${a}"><span class="k">${k || ''}</span><span class="ic">${ic}</span>${l}<span class="info" id="info-${id}"></span></div>`).join('');
  document.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { run(b.dataset.a || null); });
}

const maskNo = n => { n = String(n || ''); return n.length > 4 ? '**** ' + n.slice(-4) : n; };
// ---------- render ----------
async function refresh() {
  try { S = await (await fetch('/api/state', { signal: AbortSignal.timeout(8000) })).json(); reconnecting(false); }
  catch { reconnecting(true); clearTimeout(refresh.t); refresh.t = setTimeout(() => refresh().then(() => { if (S.loggedIn) focusScan(); }), 2000); return; } // the launcher restarts the service; keep trying
  showLogin(!S.loggedIn);
  if (!S.loggedIn) { closeModal(); return; }
  if (S.mode === 'clockin') clockInDialog();
  if (S.pay && S.mode !== 'clockin' && !modalOpen()) setTimeout(() => { if (!modalOpen() && S.pay) checkoutDialog(); }, 0); // payment in progress (e.g. after a reload) reopens itself
  $('subtitle').textContent = `${S.user.company} · ${S.user.shop}`;
  const hw = S.hw || {}; $('hwPill').textContent = hw.via === 'builtin' ? 'printer/drawer: built-in' : hw.via === 'airpos' ? 'printer/drawer: AIR POS service' : 'printer/drawer: not found';
  $('hwPill').title = hw.message || ''; $('hwPill').className = 'pill ' + (hw.via ? 'ok' : 'warn'); $('hwPill').onclick = () => run('settings');
  $('sessPill').textContent = S.session && S.session.number ? 'Clocked in ' + S.session.number : 'not clocked in'; $('sessPill').className = 'pill ' + (S.session && S.session.number ? 'ok' : 'warn');
  const u = S.update || {}; const ready = u.state === 'ready';
  $('buildPill').textContent = (S.build === 'dev' ? 'DEV BUILD ' : '') + 'v' + (S.version || '') + (ready ? ' · update ' + u.available + ' ready' : '');
  $('buildPill').title = u.message || ''; $('buildPill').className = 'pill ' + (S.build === 'dev' ? 'bad' : ready ? 'ok' : '');
  const ret = S.mode === 'return';
  $('gridhead').className = 'gridhead' + (ret ? ' ret' : '');
  const mx = !ret && S.mix ? S.mix : { on: false, lines: [] }; $('gridhead').classList.toggle('ret', ret || mx.on);
  document.querySelectorAll('[data-a="return"]').forEach(b => b.classList.toggle('on', !!mx.on));
  $('gridTitle').textContent = ret ? (S.ret.kind === 'receipt' ? `RETURN for ${S.ret.order.number} — scan returned items` : 'RETURN MODE (no receipt) — scan returned items') : mx.on ? 'RETURN — scan returned items (Ctrl+R = back to sale)' : (S.order.resuming ? `Resumed order ${S.order.number || ''}` : 'Sale');
  $('gridInfo').innerHTML = ret ? (S.ret.order ? `Paid by ${esc(S.ret.order.payments)} · ` : '') + 'F12 = refund · Ctrl+R = cancel return'
    : (S.order && S.order.taxExempt ? '<span class="taxoff" title="F5 turns tax back on">TAX OFF</span> ' : '') + (S.member ? `<span class="memchip" id="memChip">👤 ${esc(S.member.name)} · ${S.member.points} pts${S.member.availableBalance ? ' · credit ' + money(S.member.availableBalance) : ''}</span>` : '');
  if ($('memChip')) $('memChip').onclick = () => run('customer');
  const rl = ret ? (S.ret.lines || []) : [];
  $('retLines').style.display = rl.length ? '' : 'none';
  $('retLines').innerHTML = rl.length ? `<b>On this receipt</b> (tap to return one): ` + rl.map(l => `<button class="rl ${l.left > 0 && l.refundable ? '' : 'na'}" data-code="${esc(l.code)}" title="${l.refundable ? '' : 'Not refundable'}">${esc(l.name)} · ${money(l.price)} <small>${l.left} left</small></button>`).join('') : '';
  $('retLines').querySelectorAll('button.rl:not(.na)').forEach(b => b.onclick = () => act('scan', { code: b.dataset.code }));
  const rows = ret ? S.ret.subs : S.cart, all = rows.length + mx.lines.length;
  if (selectedRow != null && selectedRow >= all) selectedRow = all ? all - 1 : null;
  $('cartHead').innerHTML = `<tr><th>#</th><th>Lookup Code</th><th>Name</th><th class="n">Qty</th><th class="n">Price</th><th class="n">${ret ? 'Max' : 'Discount'}</th><th class="n">Total</th></tr>`;
  $('cart').innerHTML = all ? rows.map((r, i) => `<tr class="row ${i === (selectedRow ?? 0) ? 'sel' : ''}" data-row="${i}"><td>${i + 1}</td><td>${esc(!ret && (r.type === 30 || r.type === 40) ? maskNo(r.number) : r.number)}</td><td>${esc(r.name)}${!ret && (r.type === 20 || r.type === 40) ? ` <span class="tag">${r.type === 20 ? 'charge' : 'reload'}</span>` : ''}</td><td class="n">${r.quantity}</td><td class="n">${money(r.price)}</td><td class="n">${ret ? (r.max ?? '') : (r.discountAmount ? '−' + money(r.discountAmount) + (r.custom && r.discount ? ` (${r.discount}%)` : '') : '')}</td><td class="n">${money(ret ? r.price * r.quantity : r.total)}</td></tr>`).join('')
      + mx.lines.map((r, j) => { const i = rows.length + j; return `<tr class="row neg ${i === (selectedRow ?? 0) ? 'sel' : ''}" data-row="${i}"><td>${i + 1}</td><td>${esc(r.number)}</td><td>${esc(r.name)} <span class="tag">return</span></td><td class="n">−${r.quantity}</td><td class="n">${money(r.price)}</td><td class="n"></td><td class="n">−${money(-r.total)}</td></tr>`; }).join('')
    : mx.lines.length ? '' : `<tr><td colspan="7" class="empty">${ret ? 'Return' : ''}</td></tr>`;
  document.querySelectorAll('#cart tr.row').forEach(tr => tr.onclick = () => { selectedRow = +tr.dataset.row; refresh(); focusScan(); });
  const t = S.totals, c = (l, v, cls = '') => `<div class="${cls}"><span>${l}</span><span>${v}</span></div>`;
  $('totals').innerHTML = ret ? c('Items', S.ret.totals.quantity) + c('Amount', money(S.ret.totals.amount)) + c('Tax', money(S.ret.totals.tax)) + c('Refund', money(S.ret.totals.refund), 'total')
    : c('Subtotal', money(t.itemAmount)) + c('Rows', S.cart.length) + c('Discount', money(t.discountAmount) + (S.order.orderDiscount ? ` (${S.order.orderDiscount}%)` : '')) + c('Quantity', t.quantity) + (t.pointDiscount ? c('Points used', '−' + money(t.pointDiscount)) : '') + (S.order.promotionalCode ? c('Promo', esc(S.order.promotionalCode)) : '')
      + c('Before tax', money(Math.max(0, (t.orderAmount || 0) - (t.pointDiscount || 0))), 'pretax') + c(S.order.taxExempt ? 'Tax (OFF)' : 'Tax', money(t.tax), S.order.taxExempt ? 'taxoffline' : '') + (mx.lines.length ? c('Return', '−' + money(mx.totals.refund), 'negline') + c(mx.net < 0 ? 'Refund' : 'Total', money(Math.abs(mx.net)), 'total' + (mx.net < 0 ? ' neg' : '')) : c('Total', money(t.due), 'total'));
  $('info-customer').textContent = S.member ? S.member.name : 'none'; $('info-items').textContent = S.cart.length ? `${t.quantity} items` : ''; 
  document.querySelectorAll('[data-a="tax-off"]').forEach(b => b.classList.toggle('on', !!S.order.taxExempt)); if (window.renderBulk) window.renderBulk(); $('info-payment').textContent = t.due ? 'Due ' + money(t.due) : '';
  $('stUser').textContent = `User: ${S.user.user}${S.user.manager ? ' (manager)' : ''}`; $('stSession').textContent = S.session && S.session.number ? `Session ${S.session.number}` : '';
  $('stOrder').textContent = S.lastOrderId ? 'Last sale saved' : '';
  if (window.afterRefresh) window.afterRefresh();
}

// Wrong / unknown barcode: a short message next to the scan box and a beep. No popup, focus stays in the scan box.
let lastScanKey = 0, beepCtx = null, scanMsgT = null;
function beep() {
  try { beepCtx = beepCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = beepCtx.createOscillator(), g = beepCtx.createGain();
    o.type = 'square'; o.frequency.value = 330; g.gain.value = 0.08; o.connect(g); g.connect(beepCtx.destination); o.start(); o.stop(beepCtx.currentTime + 0.25); window.__beeps = (window.__beeps || 0) + 1; } catch {}
}
function scanError(code, why) {
  beep(); toast(''); const m = $('scanMsg'); if (!m) return;
  m.textContent = `✖ Not found: ${String(code).slice(0, 40)}${why && !/not found/i.test(why) ? ' (' + why + ')' : ''} — check the barcode or press Ctrl+F to search`; m.style.display = '';
  $('scanInput').classList.add('bad'); clearTimeout(scanMsgT); scanMsgT = setTimeout(scanOk, 6000);
}
function scanOk() { clearTimeout(scanMsgT); const m = $('scanMsg'); if (m) { m.style.display = 'none'; m.textContent = ''; } $('scanInput').classList.remove('bad'); }
const MODAL_OK = new Set(['zoom-in', 'zoom-out', 'zoom-reset', 'calculator']);
async function init() {
  build();
  keys = (await (await fetch('/api/shortcuts')).json()).keys;
  AirposShortcuts.install(keys, entry => {
    if (!S.loggedIn) return;
    if (S.mode === 'clockin' && entry.action !== 'local:help') return;
    if (entry.action !== 'close' && entry.action !== 'local:help' && !MODAL_OK.has(entry.action) && !(/^settings(-|$)/.test(entry.action) && $('stTabs')) && modalOpen()) {
      if (!$('dNew')) return; // a window is open: only Esc / F1 / zoom / calculator
      $('dNew').click(); // the sale-done screen: a shortcut (Ctrl+L, Ctrl+F…) closes it and starts the next step
    }
    run(entry.action);
  }, { scanSelector: '#scanInput', isLogin: () => !S.loggedIn, isConfirm: () => false, isPayment: () => false });
  // belt and braces: reload/close keys never reach the browser
  window.addEventListener('keydown', e => { if (e.key === 'F5' || (e.ctrlKey && ['r', 'R', 'w', 'W'].includes(e.key))) e.preventDefault(); }, true);
  window.addEventListener('beforeunload', e => { if (S.cart && S.cart.length) { e.preventDefault(); e.returnValue = ''; } });
  // Scanner: Enter or Tab suffix ends a code. Codes scanned while the register is busy are queued, never dropped.
  const scanQ = []; let scanning = false;
  const pump = async () => {
    if (scanning) return; scanning = true;
    try { while (scanQ.length) { while (busy) await new Promise(r => setTimeout(r, 30)); const code = scanQ.shift(); selectedRow = 0; const r = await act('scan', { code }); if (r && !r.ok && !r.retryable && !r.busy) scanError(code, r.message); else if (r && r.ok) scanOk(); } }
    finally { scanning = false; }
  };
  window.queueScan = code => { scanQ.push(code); pump(); };
  $('scanInput').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return; const code = e.target.value.replace(/[\x00-\x1f\x7f]/g, '').trim();
    if (e.key === 'Tab') { if (!code) return; e.preventDefault(); }
    if (!code) { // 1.2.0: Enter on an empty scan box with items on the sale = Payment (same as F12). A scanner's Enter after a code still adds the item.
      if (e.key === 'Enter' && !e.repeat && S.mode === 'sale' && S.cart && (S.cart.length || (S.mix && S.mix.lines.length)) && !scanQ.length && !scanning && !busy && !modalOpen() && Date.now() - lastScanKey > 400) { e.preventDefault(); run('checkout'); }
      return;
    }
    const qm = /^\*\s*(\d{1,4}(?:\.\d{1,3})?)$/.exec(code) || /^(\d{1,4}(?:\.\d{1,3})?)\s*\*$/.exec(code);
    if (qm) { e.preventDefault(); e.target.value = ''; if (!S.cart.length) return toast('Scan an item first, then *N sets its quantity', false); act('qty', { row: selectedRow ?? 0, qty: Number(qm[1]) }); return; } // *5 = quantity 5 on the last / selected line
    lastScanKey = Date.now(); e.target.value = ''; window.queueScan(code);
  });
  // clicks go back to the scan box, except in the side panels (quick search, bulk items) and other text boxes
  document.addEventListener('click', e => { const t = e.target; if (t && t.closest && (t.closest('#qsPanel') || t.closest('#bulkPanel') || t.closest('input, select, textarea'))) return; setTimeout(focusScan, 0); });
  $('helpPill').onclick = () => run('local:help');
  $('setTop').onclick = () => run('settings'); // always-visible Settings in the top bar (also with sidebars hidden)
  setInterval(() => $('stTime').textContent = new Date().toLocaleString('en-US') , 1000);
  await refresh(); focusScan();
  setInterval(() => { if (!busy && !modalOpen()) refresh().catch(() => {}); }, 15000);
}
init();
