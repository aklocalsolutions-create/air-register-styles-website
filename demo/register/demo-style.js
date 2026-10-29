// Air Register Styles — style switcher. OWNER: lead only (style assistants: do not edit; ask the lead).
// LOOK ONLY: this file sets attributes on <html>, runs the active style's optional look hooks and draws Settings > Style.
// It never changes the sale, totals, tax, payments, returns, inventory or any AIR POS call, and adds no global keys.
//
// <html data-style="NN">   active style ('00' = Classic = today's look: no style CSS rule may match it)
// <html data-page="register|customer">
// <html data-mode="login|clockin|sale|return">  (register page; follows the app's own state; 'return' = Ctrl+R return-scan
//                                                lines on (S.mix.on) or a return-mode screen)
// <html data-return="1">   while return-scan (Ctrl+R) is on; removed when it is off
// <html data-modal="1">    while a window/dialog (or the Settings page) is open
// <html data-settings="1"> while the Settings page is open
//
// Where the choice lives (precedence): settings.json "style" on the server (saved by Settings > Style, approved backend
// field; the customer display reads it from /api/customer-state) > localStorage 'airreg.style' (cache, avoids a flash at
// start) > window.AIRREG_STYLE_DEFAULT (demo-style-boot.js = install default) > '00'.
//
// Per-style declarations (optional, in the style's OWN js file; see STYLES-PLAN.md 13.3):
//   AirStyle.declare('NN', { buttons: ['checkout', 'customer', ...], placeholder: 'Scan or type a code' })
//   buttons     = the data-a actions this style shows on the sale screen (its mockup); every other [data-a] button stays in
//                 the DOM, hidden by the style's CSS only, and its shortcut keeps working. Omitted = all Classic buttons.
//   placeholder = text for #scanInput while the style is active (Classic's own text comes back on any other style).
//   Style 00 ignores declarations. register('NN', {...}) also accepts these two fields.
'use strict';
(function () {
  const LS = 'airreg.style', html = document.documentElement;
  const list = () => (window.AIR_STYLES || [{ id: '00', name: 'Classic' }]);
  const valid = id => typeof id === 'string' && list().some(s => s.id === id);
  const bootDefault = () => (valid(window.AIRREG_STYLE_DEFAULT) ? window.AIRREG_STYLE_DEFAULT : '00');
  const page = /customer/.test(location.pathname) ? 'customer' : 'register';
  const hooks = {}, meta = {}; let cur = null, ready = false, classicPh = null;
  const lsGet = () => { try { return localStorage.getItem(LS); } catch { return null; } };
  const lsSet = v => { try { localStorage.setItem(LS, v); } catch {} };

  function apply(id) {
    if (!valid(id)) id = bootDefault();
    if (id === cur) return id;
    const prev = cur; cur = id; html.dataset.style = id;
    if (ready) { run(prev, 'off'); run(id, 'on'); placeholder(); }
    return id;
  }
  function declare(id, m) {
    if (!m || typeof m !== 'object') return;
    const d = meta[id] || (meta[id] = {});
    if (Array.isArray(m.buttons)) d.buttons = m.buttons.filter(x => typeof x === 'string' && x).slice();
    if (typeof m.placeholder === 'string') d.placeholder = m.placeholder;
    if (ready && id === cur) placeholder();
  }
  function placeholder() { // look only: the scan box's hint text
    const el = document.getElementById('scanInput'); if (!el) return;
    if (classicPh === null) classicPh = el.getAttribute('placeholder') || '';
    const d = cur !== '00' && meta[cur], want = d && typeof d.placeholder === 'string' && d.placeholder ? d.placeholder : classicPh;
    if (el.getAttribute('placeholder') !== want) el.setAttribute('placeholder', want);
  }
  function run(id, what) { const h = id && hooks[id]; if (h && typeof h[what] === 'function') { try { h[what]({ page, html }); } catch (e) { console.error('style ' + id + ' ' + what, e); } } }

  // 1) at once (script is in <head>, before the page draws): no flash
  html.dataset.page = page;
  apply(page === 'register' ? (valid(lsGet()) ? lsGet() : bootDefault()) : bootDefault());

  // 2) the saved choice from the server
  async function fromServer() {
    try {
      const r = await fetch(page === 'customer' ? '/api/customer-state' : '/api/state', { cache: 'no-store' }); const j = await r.json();
      const s = page === 'customer' ? j.style : (j.settings && j.settings.style);
      if (valid(s)) { apply(s); if (page === 'register') lsSet(s); }
      else if (page === 'customer') apply(bootDefault());
    } catch {}
  }
  // 3) page-state attributes for style CSS (register page only; read-only look at the app's state)
  function marks() {
    let mode = 'login', ret = false;
    try { if (typeof S !== 'undefined' && S && S.loggedIn) { ret = S.mode === 'return' || !!(S.mix && S.mix.on); mode = ret ? 'return' : (S.mode || 'sale'); } } catch {}
    if (html.dataset.mode !== mode) html.dataset.mode = mode;
    if ((html.dataset.return === '1') !== ret) { if (ret) html.dataset.return = '1'; else delete html.dataset.return; }
    const mr = document.getElementById('modalRoot'), open = !!(mr && mr.firstChild);
    const st = !!document.getElementById('stTabs');
    if ((html.dataset.modal === '1') !== open) { if (open) html.dataset.modal = '1'; else delete html.dataset.modal; }
    if ((html.dataset.settings === '1') !== st) { if (st) html.dataset.settings = '1'; else delete html.dataset.settings; }
  }

  // ---------- Settings > Style (Ctrl+8) ----------
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function tab() {
    modal(`<h2>Style</h2><p class="systyle-note">Pick how Air Register looks on this computer. Only the look changes: keys, buttons, sales, payments and returns work the same in every style. The customer display follows the chosen style.</p>
      <div id="syList" class="sylist" role="listbox" aria-label="Styles">${list().map(s => `<button type="button" class="sybtn${s.id === cur ? ' on' : ''}" role="option" aria-selected="${s.id === cur}" data-style-id="${s.id}">
        <span class="sysw">${(s.swatch || []).map(c => `<i style="background:${e(c)}"></i>`).join('')}</span><b>${e(s.id)}</b> <span>${e(s.name)}</span>${s.id === cur ? ' <em>(in use)</em>' : ''}</button>`).join('')}</div>
      <div id="syMsg" class="msg"></div>`, () => {
      const box = document.getElementById('syList');
      box.querySelectorAll('[data-style-id]').forEach(b => { b.onclick = () => choose(b.dataset.styleId); });
      box.addEventListener('keydown', ev => { // arrows move inside the list only (local to this tab)
        if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return; ev.preventDefault();
        const bs = [...box.querySelectorAll('[data-style-id]')], i = bs.indexOf(document.activeElement);
        const n = bs[(i < 0 ? 0 : i + (ev.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]; n.focus();
      });
      const on = box.querySelector('.sybtn.on') || box.querySelector('.sybtn'); if (on) setTimeout(() => on.focus(), 0);
    });
  }
  async function choose(id) {
    if (!valid(id)) return;
    // Only this page's look (and Classic, which is the inline CSS) is loaded. Another id would change data-style with no stylesheet.
    if (id !== '00' && window.DEMO_STYLE && id !== window.DEMO_STYLE) {
      const m = document.getElementById('syMsg');
      if (m) { m.className = 'msg err'; m.textContent = 'Open that style from the demo list. This page only has the look you started with.'; }
      return;
    }
    apply(id); lsSet(id);
    document.querySelectorAll('#syList [data-style-id]').forEach(b => { const on = b.dataset.styleId === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on);
      const em = b.querySelector('em'); if (em) em.remove(); if (on) b.insertAdjacentHTML('beforeend', ' <em>(in use)</em>'); });
    const m = document.getElementById('syMsg'); let x = null;
    try { x = await api('settings', { style: id }); } catch {}
    if (m) { if (x && x.ok) { m.className = 'msg ok'; m.textContent = 'Style saved: ' + (list().find(s => s.id === id) || {}).name; } else { m.className = 'msg err'; m.textContent = 'Style changed on this screen, but it could not be saved for the customer display' + (x && x.message ? ': ' + x.message : ''); } }
  }

  window.AirStyle = {
    page, list, valid, current: () => cur, bootDefault, apply, choose, tab,
    // per-style look hooks (optional): AirStyle.register('NN', { on(ctx) {...}, off(ctx) {...} }) — must undo everything in off()
    register(id, h) { hooks[id] = h || {}; declare(id, h); if (ready && id === cur) run(id, 'on'); },
    // per-style declarations (optional): AirStyle.declare('NN', { buttons: [...data-a], placeholder: '...' })
    declare,
    meta: id => { const d = meta[id] || {}; return { buttons: d.buttons ? d.buttons.slice() : null, placeholder: d.placeholder == null ? null : d.placeholder }; },
  };
  document.addEventListener('DOMContentLoaded', () => {
    ready = true; run(cur, 'on'); placeholder();
    fromServer();
    if (page === 'customer') setInterval(fromServer, 1500); // follows a style changed on the register within ~2 s
    else { marks(); setInterval(marks, 250); }
  });
})();
