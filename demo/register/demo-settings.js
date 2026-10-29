// 1.2.0 (owner): Settings as ONE full-screen page with tabs. Layout only: every tab reuses the existing settings
// builders (same saved keys, defaults, permissions and Save / Print test / Test drawer / Save diagnostics code).
// Helper notes are hidden; only failure messages stay inline (a success shows briefly in the page header).
const ST_TABS = [
  ['printer', 'Printer & Drawer', 'Ctrl+1'], ['returns', 'Returns', 'Ctrl+2'], ['screen', 'Screen', 'Ctrl+3'],
  ['touch', 'Touch', 'Ctrl+4'], ['bulk', 'Bulk items', 'Ctrl+5'], ['buttons', 'Buttons', 'Ctrl+6'], ['remote', 'Remote help', 'Ctrl+7'], ['style', 'Style', 'Ctrl+8'], // Air Register Styles: look only (demo-style.js)
]; // no "Cards" tab: Air Register has no card settings of its own (card terminals are set up in AIR POS)

// ---------- on-screen buttons: show or hide per PC (any cashier) ----------
const BTN_KEY = 'airreg.hiddenButtons';
// Locked = needed to run a sale safely: always shown, can't be hidden.
const BTN_LOCKED = new Set(['T:checkout', 'T:customer', 'T:close', 'L:new-sale', 'L:logout', 'R:settings']);
function btnHidden() { try { return new Set(JSON.parse(localStorage.getItem(BTN_KEY) || '[]')); } catch { return new Set(); } }
function btnSave(set) { try { localStorage.setItem(BTN_KEY, JSON.stringify([...set].filter(k => !BTN_LOCKED.has(k)))); } catch {} applyButtons(); }
function btnId(el) { return (el.closest('#actions') ? 'L:' : el.closest('#right') ? 'R:' : el.closest('#tiles') ? 'T:' : '?:') + el.dataset.a; }
// every on-screen button, in screen order: [{ id, label, key, area }]
function btnList() {
  const out = [], seen = new Set();
  const add = (el, area) => { const id = btnId(el); if (seen.has(id)) return; seen.add(id); const k = el.querySelector('.k, small, kbd'), c = el.cloneNode(true);
    c.querySelectorAll('.k, small, kbd, .ic, .info').forEach(x => x.remove()); const label = c.textContent.replace(/\s+/g, ' ').trim();
    out.push({ id, label, key: k ? k.textContent.trim() : '', area }); };
  document.querySelectorAll('#tiles [data-a]').forEach(el => add(el, 'Top tiles'));
  document.querySelectorAll('#actions [data-a]').forEach(el => add(el, 'Left side'));
  let sec = 'Right side';
  document.querySelectorAll('#right > *').forEach(el => { if (el.tagName === 'H3') sec = el.textContent.trim(); else el.querySelectorAll('[data-a]').forEach(b => add(b, sec)); });
  if ($('bulkPanel')) out.push({ id: 'P:bulk', label: 'Bulk items panel', key: 'Alt + 1-9', area: 'Bulk items' });
  return out;
}
// ---------- on-screen buttons: move (pick which button sits in each slot), per PC (any cashier) ----------
// A slot is a fixed place on screen, named after the button that sits there by default. Buttons move only inside
// their own panel (Left side / Right side) so they keep the same look. Keys and menus stay tied to the function:
// moving a button moves the element (its data-a and click stay with it). Locked buttons never move or get replaced.
const LAY_KEY = 'airreg.buttonLayout', LAY_GROUPS = { L: '#actions', R: '#right' };
function layRead() { try { const o = JSON.parse(localStorage.getItem(LAY_KEY) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch { return {}; } }
// one comment-node anchor per slot, put where the button was first drawn (a redraw makes fresh buttons + anchors)
function slotAnchors(g) {
  const root = document.querySelector(LAY_GROUPS[g]); if (!root) return [];
  root.querySelectorAll('[data-a]').forEach(el => { if (!el.dataset.a || el.dataset.slot) return; el.dataset.slot = btnId(el); el.before(document.createComment('slot ' + el.dataset.slot)); });
  const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  while (w.nextNode()) if (w.currentNode.data.startsWith('slot ')) out.push({ slot: w.currentNode.data.slice(5), anchor: w.currentNode });
  return out;
}
// who sits in each slot; anything odd in the saved layout (unknown, locked, duplicate) = default layout
function layOcc(slots, lay) {
  const ids = new Set(slots), occ = {}, used = new Set(), def = () => Object.fromEntries(slots.map(s => [s, s]));
  for (const s of slots) {
    const b = BTN_LOCKED.has(s) ? s : (lay[s] || s);
    if (!ids.has(b) || (BTN_LOCKED.has(b) && b !== s) || used.has(b)) return def();
    used.add(b); occ[s] = b;
  }
  return occ;
}
function applyLayout() {
  const lay = layRead();
  for (const g of Object.keys(LAY_GROUPS)) {
    const sl = slotAnchors(g); if (!sl.length) continue;
    const els = new Map(); document.querySelectorAll(LAY_GROUPS[g] + ' [data-a]').forEach(el => { if (el.dataset.slot) els.set(el.dataset.slot, el); });
    const occ = layOcc(sl.map(s => s.slot), lay);
    sl.forEach(({ slot, anchor }) => { const el = els.get(occ[slot]); if (el && anchor.nextSibling !== el) anchor.after(el); });
  }
}
// put button `btn` in `slot`; the button that was there takes btn's old slot (a swap: no duplicates)
function laySet(slot, btn) {
  const g = slot[0]; if (!LAY_GROUPS[g] || btn[0] !== g || BTN_LOCKED.has(slot) || BTN_LOCKED.has(btn)) return false;
  const sl = slotAnchors(g).map(s => s.slot); if (!sl.includes(slot) || !sl.includes(btn)) return false;
  const lay = layRead(), occ = layOcc(sl, lay), from = sl.find(s => occ[s] === btn), was = occ[slot];
  occ[slot] = btn; occ[from] = was;
  const out = Object.fromEntries(Object.entries(lay).filter(([k]) => k[0] !== g));
  for (const s of sl) if (occ[s] !== s) out[s] = occ[s];
  try { localStorage.setItem(LAY_KEY, JSON.stringify(out)); } catch {}
  applyButtons(); return true;
}
function layReset() { try { localStorage.removeItem(LAY_KEY); } catch {} applyButtons(); }
function applyButtons() {
  applyLayout(); const hid = btnHidden();
  document.querySelectorAll('#tiles [data-a], #actions [data-a], #right [data-a]').forEach(el => { const id = btnId(el); el.classList.toggle('uhid', hid.has(id) && !BTN_LOCKED.has(id)); });
  // no gaps: a section title goes when all its buttons are hidden; a 2x2 group lets its last button span when odd
  document.querySelectorAll('#right h3').forEach(h => { const g = h.nextElementSibling; if (g) { const all = [...g.querySelectorAll('[data-a]')]; const off = all.length > 0 && all.every(b => b.classList.contains('uhid')); h.classList.toggle('uhid', off); g.classList.toggle('uhid', off); } });
  document.querySelectorAll('#actions .hgrp').forEach(g => { const vis = [...g.querySelectorAll('[data-a]')].filter(b => !b.classList.contains('uhid'));
    g.querySelectorAll('[data-a]').forEach(b => { b.style.gridColumn = ''; }); g.classList.toggle('uhid', !vis.length); if (vis.length % 2) vis[vis.length - 1].style.gridColumn = '1 / -1'; });
  const bp = $('bulkPanel'); if (bp) bp.classList.toggle('uhid', hid.has('P:bulk'));
}
// re-apply whenever the panels are drawn again
(() => { let q = 0; const mo = new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; applyButtons(); }); });
  ['actions', 'right', 'tiles'].forEach(id => { if ($(id)) mo.observe($(id), { childList: true, subtree: true }); }); applyButtons(); })();

function btRow(slot, occ, info, hid, fixed) {
  const b = info.get(occ) || { label: occ, key: '' }, lk = BTN_LOCKED.has(slot);
  const pick = lk || fixed ? `<span class="btname">${esc(b.label)}</span>`
    : `<button type="button" class="btsel" data-slot="${esc(slot)}" aria-haspopup="listbox" title="Choose the button for this place"><span class="btname">${esc(b.label)}</span><span class="btcar">▾</span></button>`;
  return `<div class="btrow${lk ? ' lk' : ''}" data-row="${esc(slot)}"><input type="checkbox" title="Show this button" data-bt="${esc(occ)}" ${lk || !hid.has(occ) ? 'checked' : ''} ${lk ? 'disabled' : ''}>${pick}${b.key ? `<span class="btkey">${esc(b.key)}</span>` : ''}${lk ? '<span class="btlock" title="Locked: needed to run a sale (can\'t be moved or hidden)">🔒</span>' : ''}</div>`;
}
function btRender() {
  const box = $('btBox'); if (!box) return;
  const info = new Map(btnList().map(b => [b.id, b])), hid = btnHidden(), lay = layRead(), secs = [];
  const sec = (name, rows) => { if (rows.length) secs.push(`<h3>${esc(name)}</h3><div class="btlist">${rows.join('')}</div>`); };
  sec('Top tiles', [...document.querySelectorAll('#tiles [data-a]')].map(el => btRow(btnId(el), btnId(el), info, hid, true)));
  for (const g of Object.keys(LAY_GROUPS)) {
    const sl = slotAnchors(g), occ = layOcc(sl.map(s => s.slot), lay); let cur = null, rows = [];
    sl.forEach(({ slot, anchor }) => {
      const name = g === 'L' ? 'Left side' : ((anchor.parentNode.previousElementSibling || {}).textContent || 'Right side').trim();
      if (name !== cur) { if (cur) sec(cur, rows); cur = name; rows = []; }
      rows.push(btRow(slot, occ[slot], info, hid));
    });
    if (cur) sec(cur, rows);
  }
  if ($('bulkPanel')) sec('Bulk items', [btRow('P:bulk', 'P:bulk', new Map([['P:bulk', { label: 'Bulk items panel', key: 'Alt + 1-9' }]]), hid, true)]);
  box.innerHTML = secs.join('');
  box.querySelectorAll('[data-bt]').forEach(c => { c.onchange = () => { const s = btnHidden(); if (c.checked) s.delete(c.dataset.bt); else s.add(c.dataset.bt); btnSave(s); }; });
  box.querySelectorAll('.btsel').forEach(b => { b.onclick = e => { e.stopPropagation(); btDrop(b); }; });
}
// the slot's dropdown: a scrolling list of every movable button in that panel (picking one swaps the two)
function btDrop(b) {
  const open = document.querySelector('.btdrop'), same = open && open.parentNode === b.parentNode; btClose(); if (same) return;
  const slot = b.dataset.slot, sl = slotAnchors(slot[0]).map(s => s.slot), occ = layOcc(sl, layRead()), info = new Map(btnList().map(x => [x.id, x]));
  const d = document.createElement('div'); d.className = 'btdrop'; d.setAttribute('role', 'listbox');
  d.innerHTML = sl.filter(id => !BTN_LOCKED.has(id)).map(id => { const x = info.get(id) || { label: id, key: '' };
    return `<button type="button" role="option" data-pick="${esc(id)}" class="${occ[slot] === id ? 'cur' : ''}" aria-selected="${occ[slot] === id}"><span>${esc(x.label)}</span><span class="btkey">${esc(x.key)}</span></button>`; }).join('');
  b.parentNode.appendChild(d);
  d.querySelectorAll('[data-pick]').forEach(p => { p.onclick = e => { e.stopPropagation(); btClose(); if (p.dataset.pick !== occ[slot]) laySet(slot, p.dataset.pick); btRender(); }; });
  const cur = d.querySelector('.cur') || d.querySelector('[data-pick]');
  setTimeout(() => { if (cur.isConnected) { cur.scrollIntoView({ block: 'nearest' }); cur.focus(); } }, 30);
}
function btClose() { document.querySelectorAll('.btdrop').forEach(d => d.remove()); }
document.addEventListener('click', e => { if (!(e.target.closest && e.target.closest('.btdrop'))) btClose(); });
// while a dropdown is open: Up/Down move, Enter picks, Esc closes only the dropdown (not the Settings page)
window.addEventListener('keydown', e => {
  const d = document.querySelector('.btdrop'); if (!d) return;
  const items = [...d.querySelectorAll('[data-pick]')], i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { const s = d.parentNode.querySelector('.btsel'); btClose(); if (s) s.focus(); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const n = items[Math.max(0, Math.min(items.length - 1, i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1)))]; n.focus(); n.scrollIntoView({ block: 'nearest' }); }
  else if (e.key === 'Enter' && i >= 0) items[i].click();
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
function buttonsTab() {
  modal(`<h2>Buttons</h2><div id="btBox"></div>
    <div class="row2" style="justify-content:flex-start"><button class="pbtn s" id="btAll">Show all buttons</button><button class="pbtn s" id="btLay">Reset to default layout</button></div>`, () => {
    btRender();
    $('btAll').onclick = () => { btnSave(new Set()); btRender(); };
    $('btLay').onclick = () => { layReset(); btRender(); };
  });
}

// ---------- the other tabs: the existing builders; parts that belong to another tab are hidden, not removed ----------
function stHide(el) { if (el) el.classList.add('sthide'); }
function lab(id) { return $(id) && $(id).closest('label'); }
function returnsTab() {
  const st = S.settings || {}, mgr = !!(S.user && S.user.manager);
  modal(`<h2>Returns</h2><label class="f chk"><input type="checkbox" id="seRT" ${mgr ? '' : 'disabled'}> Refund tax on returns without a receipt ${mgr ? '' : '<small>(manager only)</small>'}</label>
    <div id="rtMsg" class="msg"></div><div class="row2" style="justify-content:flex-start">${mgr ? '<button class="pbtn g" id="rtOk">Save</button>' : ''}</div>`, () => {
    $('seRT').checked = st.refundTaxNoReceipt !== false;
    if ($('rtOk')) $('rtOk').onclick = async () => { const x = await api('settings', { refundTaxNoReceipt: $('seRT').checked }); await refresh(); msgIn($('rtMsg'), x); };
  });
}
function screenTab() {
  touchSettingsDialog();
  stHide($('tkK')); stHide($('tkK').previousElementSibling);
  const box = document.createElement('div');
  box.innerHTML = `<label class="f chk"><input type="checkbox" id="seSides"> Hide sidebars <kbd>Ctrl+B</kbd></label>
    <label class="f">Zoom</label><div class="row2" style="justify-content:flex-start;margin-top:0;align-items:center"><button class="pbtn s" id="stZo">−</button><b id="stZv" style="min-width:56px;text-align:center"></b><button class="pbtn s" id="stZi">+</button><button class="pbtn s" id="stZr">100%</button><button class="pbtn s" id="stPanels">Reset sidebar sizes</button></div>`;
  $('tkK').parentNode.insertBefore(box, $('tkK').nextSibling);
  const zv = () => { $('stZv').textContent = Math.round(zoomNow() * 100) + '%'; };
  $('stZo').onclick = () => { applyZoom(zoomNow() - 0.1); zv(); }; $('stZi').onclick = () => { applyZoom(zoomNow() + 0.1); zv(); }; $('stZr').onclick = () => { applyZoom(1); zv(); }; zv();
  $('seSides').checked = document.body.classList.contains('nosides'); $('seSides').onchange = e => setSides(e.target.checked);
  $('stPanels').onclick = () => { if (window.resetPanelWidths) window.resetPanelWidths(); stFlash('Sidebar sizes reset'); };
}
function touchTab() {
  touchSettingsDialog();
  ['tkF', 'tkCD', 'tkR', 'tkPE'].forEach(id => stHide(lab(id))); stHide($('tkPinRow')); stHide($('tkPw'));
  $('modalRoot').querySelectorAll('.modal h3').forEach(stHide);
}
function remoteTab() {
  const p = remoteDialog();
  const a = document.createElement('a'); a.className = 'pbtn s'; a.id = 'seLog'; a.href = '/export/log'; a.download = 'air-register-log.txt'; a.textContent = 'Export log';
  if ($('rhBtns')) $('rhBtns').insertBefore(a, $('rhBtns').firstChild);
  return p;
}
const ST_BUILD = { printer: () => printerSettings(), returns: returnsTab, screen: screenTab, touch: touchTab, bulk: () => bulkSettingsDialog(), buttons: buttonsTab, remote: remoteTab, style: () => AirStyle.tab() };

let stSeq = 0, stTab = 'printer';
function stFlash(m) { const f = $('stFlash'); if (!f) return; f.textContent = m; f.classList.add('on'); clearTimeout(stFlash.t); stFlash.t = setTimeout(() => f.classList.remove('on'), 4000); }
function stDecorate(tab) {
  const md = $('modalRoot').querySelector('.modal'); if (!md || md.classList.contains('stpage')) return;
  md.classList.add('stpage'); $('ov').classList.add('stpage-ov');
  const h = md.querySelector('h2'); if (h) h.remove();
  if (tab === 'printer') { stHide(lab('seRT')); stHide($('seRTnote')); } // refund tax lives on the Returns tab (Save still sends it unchanged)
  md.querySelectorAll('[data-close]').forEach(b => b.remove()); // one Close, in the header
  const body = document.createElement('div'); body.className = 'stbody'; body.dataset.tab = tab;
  while (md.firstChild) body.appendChild(md.firstChild);
  md.innerHTML = `<div class="sthead"><h1>Settings</h1><span id="stFlash" role="status"></span><button class="pbtn s" data-close>Close <kbd>Esc</kbd></button></div>
    <div id="stTabs" class="sttabs" role="tablist">${ST_TABS.map(([k, t, key]) => `<button role="tab" data-tab="${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${esc(t)} <kbd>${key}</kbd></button>`).join('')}</div>`;
  md.appendChild(body);
  md.querySelector('[data-close]').onclick = closeModal;
  md.querySelectorAll('#stTabs [data-tab]').forEach(b => { b.onclick = () => settingsPage(b.dataset.tab); });
  // a success shows briefly in the header; failures stay where they happened
  new MutationObserver(() => body.querySelectorAll('.msg.ok').forEach(m => { if (m.textContent) stFlash(m.textContent); m.textContent = ''; m.className = 'msg'; }))
    .observe(body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
}
async function settingsPage(tab) {
  tab = ST_BUILD[tab] ? tab : stTab; stTab = tab; const my = ++stSeq;
  const p = ST_BUILD[tab]();
  if (tab === 'remote') { stDecorate(tab); return p; } // header first; the status fills in when it arrives
  await p; if (my === stSeq) stDecorate(tab);
}
settingsDialog = () => settingsPage('printer');
A['settings'] = settingsDialog;
ST_TABS.forEach(([k]) => { A['settings-' + k] = () => settingsPage(k); });
A['touch-settings'] = () => settingsPage('screen'); A['bulk-settings'] = () => settingsPage('bulk'); A['remote-help'] = () => settingsPage('remote');
