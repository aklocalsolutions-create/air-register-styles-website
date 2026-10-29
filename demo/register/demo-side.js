// Air Register 1.2.0 side panel: quick product search that stays open, and the bulk-item buttons (set up in Settings).
// Uses the helpers from demo-app.js (S, A, api, act, modal, toast, esc, money, focusScan, refresh).
'use strict';
// ---------- quick search (stays open: no closing on blur or clicks elsewhere) ----------
(() => {
  let rows = [], sel = 0, t = null, seq = 0;
  const box = $('qsIn'), res = $('qsRes');
  const draw = () => {
    res.innerHTML = rows.length ? rows.map((p, i) => `<div class="${i === sel ? 'sel' : ''}" data-i="${i}"><span>${esc(p.name)}<small>${esc(p.number)}${p.upc ? ' · ' + esc(p.upc) : ''}</small></span><b>${money(p.price)}</b></div>`).join('')
      : box.value.trim() ? '<p class="note" style="margin:4px">No products</p>' : '';
    res.querySelectorAll('[data-i]').forEach(d => d.onclick = () => add(rows[+d.dataset.i]));
  };
  const add = async p => {
    if (!p || !S.loggedIn) return;
    const r = await act('scan', { code: p.number });
    if (r && r.ok) focusScan(); // results stay listed for the next pick
  };
  const go = async () => {
    const q = box.value.trim(); const my = ++seq;
    if (!q) { rows = []; sel = 0; return draw(); }
    const r = await api('search', { keyword: q }); if (my !== seq) return;
    rows = (r.rows || []).slice(0, 30); sel = 0; draw();
  };
  box.oninput = () => { clearTimeout(t); t = setTimeout(go, 250); };
  box.onkeydown = e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, rows.length - 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); (rows.length ? Promise.resolve() : go()).then(() => add(rows[sel])); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); box.value = ''; rows = []; draw(); focusScan(); }
  };
  window.quickSearch = { go, rows: () => rows };
})();

// ---------- bulk items: quick buttons for loose / bulk products ----------
function bulkPriceDialog(i, slot) {
  modal(`<h2>${esc(slot.label)}</h2><p class="note">${esc(slot.name || slot.code)}</p><label class="f">Price</label><input class="f" id="bpIn" inputmode="decimal" autofocus><div id="bpMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel (Esc)</button><button class="pbtn g" id="bpOk">Add (Enter)</button></div>`, () => {
    $('bpOk').onclick = async () => { const x = await api('bulk-add', { index: i, price: Number($('bpIn').value) }); await refresh(); if (x.ok) { closeModal(); toast(x.message, true); } else msgIn($('bpMsg'), x); };
    $('bpIn').onkeydown = e => { if (e.key === 'Enter') $('bpOk').click(); };
  });
}
window.renderBulk = () => {
  const list = (S.settings && S.settings.bulkItems) || [], el = $('bulkBtns'); if (!el) return;
  const sig = JSON.stringify(list); if (el.dataset.sig === sig) return; el.dataset.sig = sig;
  el.innerHTML = list.length ? list.map((b, i) => `<button class="rbtn" data-bulk="${i}" title="${esc(b.name || b.code)}">${esc(b.label)}${b.askPrice ? '<small>price…</small>' : ''}</button>`).join('')
    : '<button class="rbtn" id="bulkSetup" style="grid-column:1/-1;background:#fff;color:#2c3e50">No bulk items yet<small>Set up in Settings (Ctrl+,)</small></button>';
  el.querySelectorAll('[data-bulk]').forEach(b => b.onclick = async () => {
    const i = +b.dataset.bulk, slot = list[i]; if (!slot) return;
    if (slot.askPrice) return bulkPriceDialog(i, slot);
    const r = await act('bulk-add', { index: i }); if (r && r.ok) focusScan();
  });
  if ($('bulkSetup')) $('bulkSetup').onclick = () => bulkSettingsDialog();
};

// Settings > Bulk items: pick existing AIR POS products (search or scan), give each a button label and an optional
// price prompt. Products are never created here.
function bulkSettingsDialog() {
  let list = JSON.parse(JSON.stringify((S.settings && S.settings.bulkItems) || [])), found = [];
  modal(`<h2>Bulk items (side buttons)</h2><p class="note" style="margin-top:0">Each button adds an existing AIR POS product. "Ask price" asks the cashier for the price (lower than the AIR POS price = line discount).</p>
    <div id="blRows"></div>
    <label class="f">Add a product: search or scan</label><input class="f" id="blQ" placeholder="Name, number or UPC (Enter)"><div class="qsres" id="blRes"></div>
    <div id="blMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Close (Esc)</button><button class="pbtn g" id="blOk">Save</button></div>`, () => {
    const draw = () => {
      $('blRows').innerHTML = list.length ? list.map((b, i) => `<div class="bulkrow"><input class="f" data-l="${i}" maxlength="30" value="${esc(b.label)}" placeholder="Button label"><span class="note" style="margin:0">${esc(b.name || b.code)} <small>(${esc(b.code)})</small></span>
        <label class="chk" style="margin:0"><input type="checkbox" data-a="${i}" ${b.askPrice ? 'checked' : ''}> Ask price</label><button class="pbtn s" data-x="${i}">✕</button></div>`).join('') : '<p class="note keep">No bulk items yet.</p>';
      $('blRows').querySelectorAll('[data-l]').forEach(x => x.oninput = () => { list[+x.dataset.l].label = x.value; });
      $('blRows').querySelectorAll('[data-a]').forEach(x => x.onchange = () => { list[+x.dataset.a].askPrice = x.checked; });
      $('blRows').querySelectorAll('[data-x]').forEach(x => x.onclick = () => { list.splice(+x.dataset.x, 1); draw(); });
    };
    const pick = p => { if (!p) return; if (list.length >= 12) return msgIn($('blMsg'), { ok: false, message: 'Up to 12 bulk items' }); list.push({ label: String(p.name || p.number).slice(0, 30), code: p.number, name: p.name, askPrice: false }); $('blQ').value = ''; $('blRes').innerHTML = ''; draw(); $('blQ').focus(); };
    const search = async () => {
      const q = $('blQ').value.trim(); if (!q) return;
      const r = await api('search', { keyword: q }); found = (r.rows || []).slice(0, 20);
      const exact = found.find(p => p.number === q || p.upc === q); if (exact) return pick(exact); // scanned barcode
      $('blRes').innerHTML = found.length ? found.map((p, i) => `<div data-i="${i}"><span>${esc(p.name)}<small>${esc(p.number)}</small></span><b>${money(p.price)}</b></div>`).join('') : '<p class="note keep">No products found. Bulk items must already exist in AIR POS.</p>';
      $('blRes').querySelectorAll('[data-i]').forEach(d => d.onclick = () => pick(found[+d.dataset.i]));
    };
    $('blQ').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); search(); } };
    $('blOk').onclick = async () => { const x = await api('settings', { bulkItems: list }); await refresh(); msgIn($('blMsg'), x.ok ? { ok: true, message: 'Bulk items saved' } : x); };
    draw();
  });
}
A['bulk-settings'] = bulkSettingsDialog;
// add "Bulk items…" next to the other extra Settings buttons (demo-pos.js adds #seMore)
(() => {
  const prev = settingsDialog;
  settingsDialog = async function () {
    await prev();
    const more = $('seMore'); if (!more || $('seBulk')) return;
    const b = document.createElement('button'); b.className = 'pbtn s'; b.id = 'seBulk'; b.textContent = 'Bulk items…'; b.onclick = bulkSettingsDialog; more.insertBefore(b, more.firstChild);
  };
  A['settings'] = settingsDialog;
})();
if (window.renderBulk && S && S.loggedIn) window.renderBulk();

// ---------- resizable side panels (owner, 1.2.0) ----------
// Drag the edge of the Actions panel or the right panel. Buttons reflow (CSS auto-fill grids): one long column when
// narrow, 2, 3+ columns when wider. Double-click an edge = default width. Widths are remembered on this PC.
(() => {
  const wrap = document.querySelector('.wrap'); if (!wrap) return;
  const LIM = { lw: [96, 640, 172], rw: [120, 720, 270] }, KEY = 'airreg.panels';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
  const set = (k, v) => { const [lo, hi, def] = LIM[k]; v = Math.round(Math.min(hi, Math.max(lo, Number(v) || def))); wrap.style.setProperty('--' + k, v + 'px'); saved[k] = v; return v; };
  const save = () => localStorage.setItem(KEY, JSON.stringify(saved));
  for (const k of Object.keys(LIM)) if (saved[k]) set(k, saved[k]);
  const zoom = () => Number(document.body.style.zoom) || 1;
  const drag = (el, k, sign) => {
    if (!el) return;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('drag');
      const x0 = e.clientX, w0 = saved[k] || LIM[k][2];
      const mv = ev => set(k, w0 + sign * (ev.clientX - x0) / zoom());
      const up = () => { el.classList.remove('drag'); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); save(); if (window.focusScan) focusScan(); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
    el.addEventListener('dblclick', () => { set(k, LIM[k][2]); delete saved[k]; save(); });
  };
  drag($('sizeL'), 'lw', 1); drag($('sizeR'), 'rw', -1);
  window.setPanelWidths = (lw, rw) => { if (lw) set('lw', lw); if (rw) set('rw', rw); save(); }; // used by the screen tests
  window.resetPanelWidths = () => { for (const k of Object.keys(LIM)) { set(k, LIM[k][2]); delete saved[k]; } save(); }; // Settings > Screen
})();
