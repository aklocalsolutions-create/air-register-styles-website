// Air Register 1.1 extras (UI): Open Drawer button, calculator, price check, Put Aside, cart search, status bar,
// zoom, sale note, customers (F3) and gift cards. Uses the helpers from app.js (S, A, api, act, modal, toast, …).
'use strict';
let flashT = null;
function flash(text, ok) {
  let f = $('flash'); if (!f) { f = document.createElement('div'); f.id = 'flash'; document.body.appendChild(f); }
  f.textContent = text; f.className = ok === false ? 'bad' : ''; f.style.display = '';
  clearTimeout(flashT); flashT = setTimeout(() => { f.style.display = 'none'; }, ok === false ? 4000 : 1800);
}
const when = t => (t ? new Date(t).toLocaleString('en-US') : '');

// ---------- Open Drawer button (one click, no dialog) ----------
if ($('drawerBtn')) $('drawerBtn').onclick = async e => { e.stopPropagation(); const b = $('drawerBtn'); if (b.disabled) return; b.disabled = true; try { await drawer(); } finally { b.disabled = false; focusScan(); } };

// ---------- zoom (remembered on this PC) ----------
const ZKEY = 'airreg.zoom';
function applyZoom(z) { z = Math.min(2, Math.max(0.6, Math.round(z * 10) / 10)); localStorage.setItem(ZKEY, String(z)); document.body.style.zoom = z; if ($('stZoom')) $('stZoom').textContent = z === 1 ? '' : 'Zoom ' + Math.round(z * 100) + '%'; return z; }
const zoomNow = () => Number(localStorage.getItem(ZKEY)) || 1;
applyZoom(zoomNow());
A['zoom-in'] = () => applyZoom(zoomNow() + 0.1); A['zoom-out'] = () => applyZoom(zoomNow() - 0.1); A['zoom-reset'] = () => applyZoom(1);
window.addEventListener('keydown', e => { // Ctrl + numpad plus/minus, and Ctrl+Shift+= ('+')
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  if (e.code === 'NumpadAdd' || e.key === '+') { e.preventDefault(); e.stopImmediatePropagation(); A['zoom-in'](); }
  else if (e.code === 'NumpadSubtract' || e.key === '_') { e.preventDefault(); e.stopImmediatePropagation(); A['zoom-out'](); }
}, true);
window.addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); applyZoom(zoomNow() + (e.deltaY < 0 ? 0.1 : -0.1)); } }, { passive: false });

// ---------- status bar ----------
window.afterRefresh = () => {
  if (!S.loggedIn) return;
  const net = $('stNet'); net.textContent = S.online ? '● online' : '● OFFLINE (AIR POS server not reachable)'; net.className = 'net' + (S.online ? '' : ' off');
  $('stShop').textContent = `Shop: ${S.user.shop}`;
  $('stStation').textContent = S.station && S.station.name ? `Register: ${S.station.name}` : (S.station && S.station.device ? `PC: ${S.station.device}` : ''); $('stStation').title = S.station && S.station.name ? 'AIR POS station' + (S.station.device ? ' (this PC: ' + S.station.device + ')' : '') : 'No AIR POS station name is set for this register, so the PC name is shown';
  $('stUser').textContent = `Cashier: ${S.user.user}${S.user.manager ? ' (manager)' : ''}`;
  $('stSession').textContent = S.session && S.session.number ? `Session ${S.session.number}` : 'Not clocked in';
  $('stAside').textContent = S.asideCount ? `${S.asideCount} put aside (Ctrl+Shift+L)` : '';
  $('stVer').textContent = 'v' + (S.version || '');
  const nl = $('noteLine'); nl.style.display = S.note ? '' : 'none'; nl.textContent = S.note ? '📝 Note: ' + S.note : ''; nl.onclick = () => run('note');
};

// ---------- calculator (Ctrl+Shift+C) ----------
function calcEval(src) { // + - * / % ( ) and decimals, no eval
  const t = src.replace(/×/g, '*').replace(/÷/g, '/').match(/\d*\.?\d+|[-+*/%()]/g) || []; let i = 0;
  const peek = () => t[i], next = () => t[i++];
  const prim = () => { const x = next(); if (x === '(') { const v = expr(); next(); return v; } if (x === '-') return -prim(); if (x === '+') return prim(); const n = Number(x); if (!isFinite(n)) throw 0; return n; };
  const post = () => { let v = prim(); while (peek() === '%') { next(); v = v / 100; } return v; };
  const term = () => { let v = post(); while (peek() === '*' || peek() === '/') { const o = next(), r = post(); v = o === '*' ? v * r : v / r; } return v; };
  const expr = () => { let v = term(); while (peek() === '+' || peek() === '-') { const o = next(), r = term(); v = o === '+' ? v + r : v - r; } return v; };
  const v = expr(); if (i < t.length || !isFinite(v)) throw 0; return Math.round(v * 1e8) / 1e8;
}
A.calculator = () => {
  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '%', '+', 'C', '(', ')', '='];
  modal(`<h2>Calculator</h2><input class="f" id="clIn" autofocus autocomplete="off" style="text-align:right;font-size:24px"><div id="clOut" class="due" style="justify-content:flex-end;min-height:30px"></div>
    <div class="calc">${keys.map(k => `<button class="${k === '=' ? 'eq' : /[÷×+\-%]/.test(k) ? 'op' : ''}" data-k="${k}">${k}</button>`).join('')}</div>
    <p class="note">Type or click. Enter = result, Esc = close. Nothing is added to the sale.</p>`, () => {
    const inp = $('clIn'), show = () => { try { $('clOut').textContent = inp.value.trim() ? '= ' + calcEval(inp.value) : ''; } catch { $('clOut').textContent = ''; } };
    const eq = () => { try { inp.value = String(calcEval(inp.value)); } catch { $('clOut').textContent = 'Check the sum'; return; } show(); };
    $('modalRoot').querySelectorAll('.calc button').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.k; if (k === 'C') inp.value = ''; else if (k === '=') return eq(); else inp.value += k; show(); inp.focus(); });
    inp.oninput = show; inp.onkeydown = e => { if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); eq(); } };
    inp.addEventListener('click', e => e.stopPropagation());
  });
};

// ---------- price check (Ctrl+I) ----------
A['price-check'] = () => {
  modal(`<h2>Price check</h2><p class="note" style="margin-top:0">Scan or type an item. Nothing is added to the sale.</p>
    <input class="f" id="pcCode" placeholder="Scan, number, UPC or name" autofocus autocomplete="off"><div id="pcRes"></div><div id="pcMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Done (Esc)</button></div>`, () => {
    const go = async () => {
      const code = $('pcCode').value.trim(); if (!code) return; $('pcCode').select();
      const r = await api('price-check', { code });
      if (!r.ok) { $('pcRes').innerHTML = ''; return msgIn($('pcMsg'), r); }
      msgIn($('pcMsg'), { ok: true, message: '' });
      if (r.item) { const p = r.item; $('pcRes').innerHTML = `<div class="pcard"><div><b>${esc(p.name)}</b> · ${esc(p.number)}${p.upc ? ' · UPC ' + esc(p.upc) : ''}</div><div class="big">${money(p.price)}</div>
        ${p.originalPrice && p.originalPrice !== p.price ? `<div class="note">Regular ${money(p.originalPrice)}</div>` : ''}${p.bulkPrice ? `<div class="note">Bulk: ${money(p.bulkPrice)} each from ${p.bulkPriceQuantity}</div>` : ''}
        <div class="due"><span>In stock</span><b>${p.stock == null ? 'unknown' : p.stock + ' ' + esc(p.unitName || '')}</b></div>${p.taxRate != null ? `<div class="note">Tax ${p.taxRate}%</div>` : ''}</div>`; }
      else $('pcRes').innerHTML = `<table class="mini" style="margin-top:8px"><tbody>${r.list.map(p => `<tr><td>${esc(p.number)}</td><td>${esc(p.name)}</td><td class="n">${p.price == null ? '' : money(p.price)}</td><td class="n">stock ${p.stock ?? '?'}</td></tr>`).join('')}</tbody></table>`;
    };
    $('pcCode').onkeydown = e => { if (e.key === 'Enter') go(); };
  });
};

// ---------- Put Aside / Load Aside (local on this PC) ----------
A['aside-put'] = async () => { if (S.mode === 'return') return toast('Not in return mode', false); const r = await act('aside-put'); if (r && r.ok) flash('Sale put aside'); };
A['aside-load'] = async () => {
  const r = await api('aside-list'); if (!(r.rows || []).length) return toast('Nothing is put aside on this register', false);
  modal(`<h2>Load Aside</h2><p class="note" style="margin-top:0">Sales parked on this register (kept on this PC, also after a restart).</p>
    <table><thead><tr><th>When</th><th>Cashier</th><th class="n">Lines</th><th class="n">Total</th><th></th></tr></thead><tbody>${r.rows.map((a, i) => `<tr><td>${when(a.at)}${a.member ? '<div class="note" style="margin:0">👤 ' + esc(a.member) + '</div>' : ''}${a.note ? '<div class="note" style="margin:0">📝 ' + esc(a.note) + '</div>' : ''}</td><td>${esc(a.user)}</td><td class="n">${a.lines}</td><td class="n">${money(a.due)}</td>
      <td style="white-space:nowrap"><button class="pbtn g" data-load="${esc(a.id)}" ${i === 0 ? 'autofocus' : ''}>Load</button> <button class="pbtn s" data-del="${esc(a.id)}">Delete</button></td></tr>`).join('')}</tbody></table>
    <div id="laMsg" class="msg"></div><div class="row2"><button class="pbtn s" data-close>Close (Esc)</button></div>`, () => {
    $('modalRoot').querySelectorAll('[data-load]').forEach(b => b.onclick = async () => { const x = await api('aside-load', { id: b.dataset.load }); await refresh(); if (x.ok) { closeModal(); toast(x.message, true); } else msgIn($('laMsg'), x); });
    $('modalRoot').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await api('aside-delete', { id: b.dataset.del }); await refresh(); closeModal(); A['aside-load'](); });
  });
};

// ---------- search within the cart (Ctrl+Shift+F) ----------
A['cart-search'] = () => {
  const rows = S.mode === 'return' ? (S.ret.subs || []) : (S.cart || []); if (!rows.length) return toast('The cart is empty', false);
  modal(`<h2>Find in this sale</h2><input class="f" id="csIn" placeholder="Name, number or UPC" autofocus autocomplete="off">
    <div style="max-height:50vh;overflow:auto;margin-top:8px"><table><tbody id="csRes"></tbody></table></div><p class="note">↑/↓ then Enter selects the line in the sale.</p>`, () => {
    let hits = [], sel = 0;
    const draw = () => { const q = $('csIn').value.trim().toLowerCase();
      hits = rows.map((r, i) => ({ r, i })).filter(({ r }) => !q || [r.name, r.number, r.upc].some(v => String(v || '').toLowerCase().includes(q))); sel = Math.min(sel, Math.max(hits.length - 1, 0));
      $('csRes').innerHTML = hits.map(({ r, i }, k) => `<tr class="row ${k === sel ? 'sel' : ''}" data-i="${i}"><td>${i + 1}</td><td>${esc(r.number)}</td><td>${esc(r.name)}</td><td class="n">× ${r.quantity}</td><td class="n">${money(r.total ?? r.price * r.quantity)}</td></tr>`).join('') || '<tr><td class="empty">No line matches</td></tr>';
      $('csRes').querySelectorAll('tr.row').forEach(tr => tr.onclick = () => pick(+tr.dataset.i)); };
    const pick = i => { selectedRow = i; closeModal(); refresh(); toast(`Line ${i + 1} selected: ${rows[i].name}`, true); };
    $('csIn').oninput = () => { sel = 0; draw(); };
    $('csIn').onkeydown = e => { if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, hits.length - 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); } else if (e.key === 'Enter' && hits[sel]) pick(hits[sel].i); };
    draw();
  });
};

// ---------- sale note (Ctrl+N / Alt+N) ----------
A.note = () => {
  if (S.mode === 'return') return toast('Notes are for sales', false);
  modal(`<h2>Sale note</h2><p class="note" style="margin-top:0">Prints under the receipt and shows in History on this PC. (AIR POS orders have no note field, so the note is kept on this register.)</p>
    <textarea class="f" id="snIn" rows="4" maxlength="300" style="font:inherit;font-size:16px" autofocus>${esc(S.note || '')}</textarea><div id="snMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel (Esc)</button>${S.note ? '<button class="pbtn r" id="snClr">Remove note</button>' : ''}<button class="pbtn g" id="snOk">Save (Ctrl+Enter)</button></div>`, () => {
    const save = async text => { const x = await api('note', { text }); await refresh(); if (x.ok) { closeModal(); toast(x.message, true); } else msgIn($('snMsg'), x); };
    $('snOk').onclick = () => save($('snIn').value); if ($('snClr')) $('snClr').onclick = () => save('');
    $('snIn').onkeydown = e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); $('snOk').click(); } };
    $('snIn').addEventListener('click', e => e.stopPropagation());
  });
};

// ---------- customers (F3): search name / phone / e-mail / number, card, edit, past purchases ----------
function custCard(m) {
  const f = (l, v) => `<div><span>${l}</span><b>${v}</b></div>`;
  return `<div class="custcard">${f('Name', esc([m.firstName, m.lastName].filter(Boolean).join(' ') || m.name))}${f('Phone', esc(m.mobile || '—'))}${f('E-mail', esc(m.email || '—'))}
    ${f('Customer #', esc(m.number))}${f('Points', m.points ?? 0)}${f('Store credit', money(m.balance ?? m.availableBalance ?? 0))}${m.allowCreditPayment ? f('Credit limit', money(m.creditAmount)) : ''}</div>${m.remark ? `<div class="note" style="margin:0">${esc(m.remark)}</div>` : ''}`;
}
A.customer = () => (S.member ? customerView(S.member.id) : customerSearch());
function customerSearch() {
  modal(`<h2>Customer</h2><label class="f">Name, phone, e-mail or customer number</label><div style="display:flex;gap:6px"><input class="f" id="mQ" autofocus autocomplete="off"><button class="pbtn" id="mGo">Find</button></div>
    <div id="mRes" style="max-height:44vh;overflow:auto;margin-top:6px"></div><div id="mMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" id="mNew">New customer…</button><button class="pbtn s" data-close>Close (Esc)</button></div>`, () => {
    let rows = [], sel = 0;
    const draw = () => { $('mRes').innerHTML = rows.length ? `<table><thead><tr><th>Name</th><th>Phone</th><th>E-mail</th><th>Customer #</th><th class="n">Points</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="row ${i === sel ? 'sel' : ''}" data-i="${i}"><td>${esc(r.name)}</td><td>${esc(r.mobile)}</td><td>${esc(r.email)}</td><td>${esc(r.number)}</td><td class="n">${r.points}</td></tr>`).join('')}</tbody></table>` : '';
      $('mRes').querySelectorAll('tr.row').forEach(tr => tr.onclick = () => customerView(rows[+tr.dataset.i].id)); };
    const go = async () => { const q = $('mQ').value.trim(); msgIn($('mMsg'), { ok: true, message: 'Searching…' }); const f = await api('member-find', { keyword: q }); rows = f.rows || []; sel = 0; draw();
      msgIn($('mMsg'), { ok: !!rows.length, message: rows.length ? `${rows.length} found — click one or press Enter for the highlighted one` : (f.message || 'No customer found') + '. Use "New customer" to add one.' }); };
    $('mGo').onclick = go;
    $('mQ').onkeydown = e => { if (e.key === 'Enter') { if (rows.length && $('mQ').dataset.q === $('mQ').value) customerView(rows[sel].id); else { $('mQ').dataset.q = $('mQ').value; go(); } } else if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, rows.length - 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); } };
    $('mNew').onclick = () => newMemberDialog($('mQ').value.trim());
  });
}
async function customerView(id) {
  const d = await api('member-details', { id }); if (!d.ok) return toast(d.message, false);
  const m = d.member, onSale = S.member && S.member.id === m.id;
  modal(`<h2>Customer</h2>${custCard(m)}<div id="cvMsg" class="msg"></div>
    <div class="row2" style="justify-content:flex-start">${S.mode === 'return' ? '' : onSale ? '<button class="pbtn r" id="cvDel">Remove from sale</button>' : '<button class="pbtn g" id="cvUse" autofocus>Use on this sale (Enter)</button>'}
      <button class="pbtn s" id="cvEdit">Edit…</button><button class="pbtn s" id="cvBuys">Past purchases</button><button class="pbtn s" id="cvFind">Find another</button><button class="pbtn s" data-close>Close (Esc)</button></div><div id="cvBuysBox"></div>`, () => {
    if ($('cvUse')) $('cvUse').onclick = async () => { const x = await api('member-attach', { number: m.number }); await refresh(); if (x.ok) { closeModal(); toast(x.message, true); } else msgIn($('cvMsg'), x); };
    if ($('cvDel')) $('cvDel').onclick = async () => { const x = await api('member-detach'); await refresh(); closeModal(); toast(x.message || 'Customer removed', x.ok); };
    $('cvEdit').onclick = () => editCustomer(m);
    $('cvFind').onclick = customerSearch;
    $('cvBuys').onclick = async () => {
      const r = await api('member-orders', { number: m.number }); if (!r.ok) return msgIn($('cvMsg'), r);
      $('cvBuysBox').innerHTML = `<h3 style="margin:12px 0 4px">Past purchases (${r.total})</h3><div style="max-height:34vh;overflow:auto"><table class="mini"><tbody>${r.rows.map(o => `<tr><td>${esc(o.number)}<div class="note" style="margin:0">${when(o.createTime)}</div></td><td>${esc(o.statusName)}</td><td>${esc(o.paymentTypeName || '')}</td><td class="n">${o.quantity}${o.quantityReturn ? ' (−' + o.quantityReturn + ')' : ''}</td><td class="n">${money(o.amount)}</td>
        <td style="white-space:nowrap">${o.status === 20 ? `<button class="pbtn s" data-print="${esc(o.id)}">Reprint</button> <button class="pbtn r" data-ret="${esc(o.id)}">Return</button>` : ''}</td></tr>`).join('') || '<tr><td class="note">No purchases yet</td></tr>'}</tbody></table></div>`;
      $('cvBuysBox').querySelectorAll('[data-print]').forEach(b => b.onclick = () => printOrder(b.dataset.print, $('cvMsg')));
      $('cvBuysBox').querySelectorAll('[data-ret]').forEach(b => b.onclick = async () => { if (S.cart.length) return msgIn($('cvMsg'), { ok: false, message: 'Finish, hold or put aside the current sale first' }); closeModal(); await act('return-start', { kind: 'receipt', orderId: b.dataset.ret }); });
    };
  });
}
function editCustomer(m) {
  const fld = (id, l, v, w) => `<div style="flex:${w || 1}"><label class="f">${l}</label><input class="f" id="${id}" value="${esc(v || '')}"></div>`;
  modal(`<h2>Edit customer ${esc(m.number)}</h2><div style="display:flex;gap:8px">${fld('ecFirst', 'First name *', m.firstName)}${fld('ecLast', 'Last name *', m.lastName)}</div>
    <div style="display:flex;gap:8px">${fld('ecPhone', 'Phone *', m.mobile)}${fld('ecEmail', 'E-mail', m.email, 1.4)}</div>
    <div style="display:flex;gap:8px">${fld('ecAddr', 'Address', m.address, 2)}${fld('ecZip', 'ZIP', m.zipCode)}</div>${fld('ecRem', 'Remark', m.remark)}
    <p class="note">The customer number stays ${esc(m.number)}. Points, credit and discounts are changed in AIR POS back office.</p><div id="ecMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" id="ecBack">Back</button><button class="pbtn g" id="ecSave">Save (Enter)</button></div>`, () => {
    $('ecBack').onclick = () => customerView(m.id);
    $('ecSave').onclick = async () => { $('ecSave').disabled = true; const x = await api('member-update', { id: m.id, firstName: $('ecFirst').value, lastName: $('ecLast').value, mobile: $('ecPhone').value, email: $('ecEmail').value, address: $('ecAddr').value, zipCode: $('ecZip').value, remark: $('ecRem').value }); $('ecSave').disabled = false;
      if (x.ok) { toast(x.message, true); await refresh(); customerView(m.id); } else msgIn($('ecMsg'), x); };
    $('modalRoot').querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') $('ecSave').click(); });
  });
}

// ---------- gift cards (Ctrl+G): balance, sell / activate, reload ----------
A['gift-balance'] = () => {
  modal(`<h2>Gift card</h2><label class="f">Gift card number</label><div style="display:flex;gap:6px"><input class="f" id="gNo" placeholder="Scan or type" autofocus autocomplete="off"><button class="pbtn" id="gChk">Check balance</button></div>
    <div id="gInfo"></div><div id="gMsg" class="msg"></div><div class="row2"><button class="pbtn" id="gMulti">Multiple Gift Cards…</button><button class="pbtn s" data-close>Close (Esc)</button></div>`, () => {
    $('gMulti').onclick = () => { closeModal(); A['gift-multi'](); };
    const show = async () => {
      const number = $('gNo').value.trim(); if (!number) return;
      const r = await api('gift-lookup', { number }); const c = r.card;
      if (!r.ok && !r.notFound) { $('gInfo').innerHTML = ''; return msgIn($('gMsg'), r); }
      msgIn($('gMsg'), { ok: r.ok, message: r.ok ? '' : `No gift card ${number} yet — you can sell it as a new card.` });
      const canSell = S.mode !== 'return' && !(S.pay);
      const sell = !c || !c.isSold;
      $('gInfo').innerHTML = (c ? `<div class="pcard"><div><b>Gift card ${esc(c.number)}</b>${c.member ? ' · ' + esc(c.member) : ''}</div><div class="big">${money(c.balance)}</div>
        <div class="note">${c.isSold ? 'Sold' + (c.soldOn ? ' on order ' + esc(c.soldOn) : '') + ` · used ${money(c.used)}` : 'Not sold yet (not active)'}${c.expireDate ? ' · expires ' + new Date(c.expireDate).toLocaleDateString('en-US') : ''}${c.expired ? ' · <b>EXPIRED</b>' : ''}</div></div>` : '')
        + (canSell && !(c && c.expired) ? `<h3 style="margin:14px 0 2px">${sell ? (c ? 'Sell / activate this card' : 'Sell a new card') : 'Reload this card'}</h3>
          <div style="display:flex;gap:8px">${sell && c ? '' : `<div style="flex:1"><label class="f">${sell ? 'Card value' : 'Amount to load'}</label><input class="f" id="gAmt" inputmode="decimal"></div>`}
          <div style="flex:1"><label class="f">Customer pays${sell && c ? ` (card value ${money(c.faceValue)})` : ' (blank = same)'}</label><input class="f" id="gPay" inputmode="decimal" placeholder="${sell && c ? c.faceValue.toFixed(2) : ''}"></div></div>
          <div class="row2" style="justify-content:flex-start"><button class="pbtn g" id="gAdd">${sell ? 'Add card sale to this sale' : 'Add reload to this sale'}</button></div><p class="note">The card is activated / loaded by AIR POS when the sale is paid.</p>` : '');
      if ($('gAdd')) $('gAdd').onclick = async () => {
        const x = await api('gift-line', { number, amount: $('gAmt') ? $('gAmt').value : c.faceValue, pay: $('gPay').value });
        await refresh(); if (x.ok) { closeModal(); toast(x.message, true); } else msgIn($('gMsg'), x); };
      const f = $('gAmt') || $('gPay'); if (f) { f.focus(); $('gInfo').querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') $('gAdd').click(); }); }
    };
    $('gChk').onclick = show; $('gNo').onkeydown = e => { if (e.key === 'Enter') show(); };
  });
};

// ---------- 1.2.0: sell several gift cards (Ctrl+Shift+G) ----------
// Enter the amount once, then scan cards one after another: every scan is added at once (no OK). Enter on an empty field = done.
// Optional "How many" shows a checklist N of N. Each card is its own line; AIR POS activates them all when the one checkout is paid.
A['gift-multi'] = () => giftSell(true);
A['gift-card'] = () => giftSell(false); // one card: amount, scan / type the card, Enter = added (no OK / confirm)
function giftSell(multi) {
  if (S.mode === 'return' || S.pay) return toast('Gift cards are sold in a sale (not during payment or a return)', false);
  const done = [];
  // Owner: clean and minimal. Title, Amount, Scan card, (Multiple) the list + count and total. Errors only when something fails.
  modal(`<h2>${multi ? 'Multiple Gift Cards' : 'Gift Card'}</h2>
    <label class="f">Amount</label><input class="f" id="gmAmt" inputmode="decimal" autocomplete="off">
    <label class="f">Scan card</label><input class="f" id="gmNo" autocomplete="off">
    ${multi ? '<div id="gmList" class="gmList"></div><div id="gmCount" class="due gmTot"></div>' : ''}<div id="gmMsg" class="msg"></div>
    <div class="row2"><button class="pbtn g" id="gmDone">${multi ? 'Done' : 'Add'}</button></div>`, () => {
    const amt = $('gmAmt'), no = $('gmNo'); if (multi && giftSell.lastAmt) amt.value = giftSell.lastAmt; amt.focus(); amt.select(); // last amount is offered again (type over it)
    const draw = () => {
      if (!multi) return; const ok = done.filter(d => d.ok);
      $('gmList').innerHTML = ok.map(d => `<div class="gmRow"><span>${esc(d.masked)}</span><b>${money(d.value)}</b></div>`).join('');
      $('gmCount').innerHTML = ok.length ? `<span>${ok.length} card${ok.length > 1 ? 's' : ''}</span><b>${money(ok.reduce((a, d) => a + (Number(d.value) || 0), 0))}</b>` : '';
    };
    // Done (or Enter on the empty field) = back to the sale: every card is a cart line "Gift Card **** 1234" at its amount,
    // counted in the totals; Enter / F12 then opens Payment and AIR POS activates the cards when the sale is paid.
    const finish = async () => { for (let i = 0; busy && i < 100; i++) await new Promise(r => setTimeout(r, 50)); closeModal(); if (multi && Number(amt.value) > 0) giftSell.lastAmt = amt.value;
      await refresh(); focusScan(); };
    let busy = false;
    const add = async () => {
      const number = no.value.replace(/[\r\n]/g, '').trim(); no.value = '';
      if (!number) return finish();
      if (busy) return; busy = true;
      if (multi && !(Number(amt.value) > 0)) { busy = false; amt.focus(); return msgIn($('gmMsg'), { ok: false, message: 'Enter the amount' }); }
      const x = await api('gift-line', { number, amount: amt.value }); busy = false;
      const masked = number.length > 4 ? '**** ' + number.slice(-4) : number;
      done.push(x.ok ? { ok: true, masked, value: x.gift ? x.gift.value : Number(amt.value), kind: x.gift && x.gift.kind } : { ok: false, masked, message: x.message });
      if (!x.ok) { beep(); msgIn($('gmMsg'), { ok: false, message: masked + ': ' + x.message }); } else { $('gmMsg').textContent = ''; $('gmMsg').className = 'msg'; }
      draw(); no.focus();
      if (!multi && x.ok) return finish();
    };
    amt.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); no.focus(); } };
    no.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    $('gmDone').onclick = () => (no.value.trim() ? add() : finish());
    draw();
  });
}

// ---------- buttons on the main screen ----------
LAYOUT.actions.splice(4, 0, ['Put Aside', 'Ctrl + Shift + A', '📥', 'aside-put'], ['Load Aside', 'Ctrl + Shift + L', '📤', 'aside-load']);
LAYOUT.right.splice(1, 0, ['Gift Cards', [['Gift Card', 'Ctrl + G', 'gift-card'], ['Multiple Gift Cards', 'Ctrl + Shift + G', 'gift-multi'], ['Gift Card Balance', 'Ctrl + Shift + B', 'gift-balance']]], ['Lookups', [['Price Check', 'Ctrl + I', 'price-check'], ['Find in Sale', 'Ctrl + Shift + F', 'cart-search'], ['Sale Note', 'Ctrl + N / Alt + N', 'note'], ['Calculator', 'Ctrl + Shift + C', 'calculator'], ['Zoom', 'Ctrl + 0 · Ctrl + = / −', 'zoom-reset']]]);
build();

// ---------- no-receipt return: refund screen (net is a refund, or return only) ----------
// Cash is the default line; Card (refunded by the cashier on the card machine, recorded in AIR POS) is the other. Up/Down or click picks, Enter refunds. Nothing else on screen.
function refundDialog() {
  const lines = [[10, 'Cash'], [20, 'Card — refund on card machine']]; let hi = 0, busy = false;
  const amt = () => Math.max(0, -(S.mix ? S.mix.net : 0));
  modal(`<div class="payhead"><h2>Refund</h2></div><div id="refBody" tabindex="-1" style="outline:none;max-width:560px;margin:0 auto">
    <div class="refbig" id="refAmt"></div><div id="refLines"></div><p class="msg" id="refMsg"></p></div>`, () => {
    const draw = () => {
      $('refAmt').textContent = money(amt());
      $('refLines').innerHTML = lines.map(([t, l], i) => `<div class="refl ${i === hi ? 'hi' : ''}" data-i="${i}"><span>${l}</span><span>${i === hi ? money(amt()) : ''}</span></div>`).join('');
      $('refLines').querySelectorAll('[data-i]').forEach(d => d.onclick = () => { hi = +d.dataset.i; draw(); go(); });
    };
    const go = async () => {
      if (busy) return; busy = true;
      const r = await api('mix-refund', { type: lines[hi][0] }); busy = false; await refresh();
      if (!r || !r.ok) { $('refMsg').textContent = (r && r.message) || 'Refund failed'; $('refMsg').className = 'msg err'; return; }
      refundDoneDialog(r);
    };
    const b = $('refBody'); b.focus(); draw();
    b.onkeydown = e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { hi = (hi + 1) % lines.length; draw(); e.preventDefault(); e.stopPropagation(); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); }
    };
  }, 'fullpay');
}
function refundDoneDialog(r) {
  const q = r.quickReturn || {}, back = q.back ?? q.refund ?? 0;
  modal(`<div id="rdBody" tabindex="-1" style="outline:none;text-align:center"><h2>${back ? 'Give back' : 'Done'}</h2>${back ? `<div class="refbig">${money(back)}</div><p style="font-size:18px">${q.backType === 'Card' ? 'Refund it on the card machine now (Air Register only records it)' : 'cash'}</p>` : ''}
    <button class="btn" id="rdNew">Next sale <kbd>Enter</kbd></button></div>`, () => {
    const next = () => { closeModal(); refresh().then(focusScan); };
    $('rdNew').onclick = next; $('rdBody').focus();
    $('rdBody').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); next(); } };
  });
}
