// DEMO STORE gallery + demo frame. Reads window.DEMO_STYLES from styles-config.js.
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
// "Download Air Register in this style": a disabled placeholder until the style's downloadUrl is set in styles-config.js.
function downloadButton(s) {
  const label = `Download Air Register in this style (Style ${s.id} ${s.name})`;
  if (s.downloadUrl) return `<a class="dl live" href="${esc(s.downloadUrl)}" rel="noopener" title="${esc(label)}" data-download="${s.id}">${DL_ICON}Download</a>`;
  return `<button class="dl" type="button" disabled aria-disabled="true" title="${esc(label)} - coming soon" data-download="${s.id}">${DL_ICON}Download - coming soon</button>`;
}
function stageBadge(s) { return s.stage === 'tested' ? '<span class="badge ok" data-stage="tested">✔ Tested - working demo in this style</span>' : '<span class="badge pv" data-stage="preview">Preview - still in testing</span>'; }
// small original preview drawn from the style's colours (used until a screenshot thumbnail exists)
function swatchThumb(s) {
  const [a, b, c] = s.swatch || ['#345', '#9bd', '#eef'];
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="200" fill="${c}"/><rect width="320" height="26" fill="${a}"/>
  <rect x="12" y="38" width="190" height="124" rx="8" fill="#fff" opacity=".9"/>${[0, 1, 2, 3, 4].map(i => `<rect x="22" y="${50 + i * 20}" width="${110 - i * 9}" height="9" rx="4" fill="${a}" opacity=".55"/><rect x="160" y="${50 + i * 20}" width="30" height="9" rx="4" fill="${a}" opacity=".35"/>`).join('')}
  <rect x="214" y="38" width="94" height="124" rx="8" fill="${b}"/>${[0, 1, 2].map(r => [0, 1].map(k => `<rect x="${222 + k * 42}" y="${46 + r * 38}" width="36" height="30" rx="6" fill="#fff" opacity=".75"/>`).join('')).join('')}
  <rect x="12" y="170" width="200" height="20" rx="6" fill="${a}" opacity=".25"/><rect x="214" y="170" width="94" height="20" rx="6" fill="${a}"/></svg>`;
}
function renderGallery() {
  const g = document.getElementById('grid'), list = window.DEMO_STYLES || [];
  g.innerHTML = list.map(s => `<article class="card" data-style="${s.id}">
    <a class="thumb" href="style.html?style=${s.id}" aria-label="Open the Style ${s.id} ${esc(s.name)} demo"><span class="svg">${swatchThumb(s)}</span>
      <img alt="" src="assets/thumbs/style-${s.id}.png" onerror="this.remove()" style="position:absolute;inset:0"><span class="no">Style ${s.id}</span></a>
    <div class="body"><h3>Style ${s.id} ${esc(s.name)}</h3>
      ${stageBadge(s)}
      <div class="sw">${(s.swatch || []).map(c => `<i style="background:${c}"></i>`).join('')}</div>
      <div class="row"><a class="btn pri" href="style.html?style=${s.id}">Open demo</a>${downloadButton(s)}</div></div></article>`).join('');
  document.getElementById('count').textContent = list.length;
}
function renderFrame() {
  const q = new URLSearchParams(location.search), id = (q.get('style') || '').padStart(2, '0');
  const s = (window.DEMO_STYLES || []).find(x => x.id === id) || (window.DEMO_STYLES || [])[0];
  document.title = `Style ${s.id} ${s.name} - Demo Store (DEMO)`;
  const pv = s.stage !== 'tested';
  document.getElementById('sname').innerHTML = `<span class="no">Style ${s.id}</span> ${esc(s.name)} ${stageBadge(s)}`;
  document.body.classList.toggle('isPreview', pv);
  document.getElementById('dlSlot').innerHTML = downloadButton(s);
  const sel = document.getElementById('pick');
  sel.innerHTML = (window.DEMO_STYLES || []).map(x => `<option value="${x.id}"${x.id === s.id ? ' selected' : ''}>Style ${x.id} ${esc(x.name)}</option>`).join('');
  sel.onchange = () => { location.search = '?style=' + sel.value; };
  const reg = document.getElementById('reg'), cus = document.getElementById('cus'), mock = document.getElementById('mock'), stage = document.getElementById('stage');
  reg.src = `register/index.html?style=${s.id}`;
  document.getElementById('pvNote').hidden = !pv;
  const view = v => { if (!pv && /^mock/.test(v)) v = 'reg';
    if (/^mock/.test(v)) { const want = s.mockup + (v === 'mockpay' ? '#pay' : '#sale'); if (!mock.src.endsWith(want)) mock.src = want; }
    stage.className = 'stage ' + (/^mock/.test(v) ? 'mock' : v); if (v !== 'reg' && !/^mock/.test(v) && !cus.src.includes('customer')) cus.src = `register/customer.html?style=${s.id}`;
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v)); };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => view(b.dataset.view));
  view(q.get('view') || (pv ? 'mock' : 'reg'));
  // Fit to screen: below FIT_MIN px the screens are drawn at a desktop size and scaled down, so no style is squashed.
  const FIT_MIN = 1000, DESK_W = 1280;
  const fit = () => {
    const on = stage.clientWidth < FIT_MIN; stage.classList.toggle('fit', on); document.body.classList.toggle('fitOn', on);
    stage.querySelectorAll('.pane').forEach(pn => { const f = pn.querySelector('iframe'), w = pn.clientWidth, h = pn.clientHeight - 20;
      if (!on || !w) { f.style.width = f.style.height = f.style.transform = ''; return; }
      const k = w / DESK_W; f.style.width = DESK_W + 'px'; f.style.height = Math.round(h / k) + 'px'; f.style.transform = `scale(${k})`; f.style.transformOrigin = '0 0'; });
  };
  const view0 = view; window.DEMO_VIEW = v => { view0(v); fit(); };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => window.DEMO_VIEW(b.dataset.view));
  addEventListener('resize', fit); new ResizeObserver(fit).observe(stage); fit();
  window.DEMO_ICON_BASE = 'assets/icons/';
  window.DEMO_OPEN_RECEIPT = rec => window.DEMO_RENDER_RECEIPT(rec, document.body);
  document.getElementById('rcBtn').onclick = () => { let rec = null; try { rec = reg.contentWindow.DEMO_RECEIPT(); } catch {} window.DEMO_OPEN_RECEIPT(rec); };
  document.getElementById('popBtn').onclick = () => window.open(`window.html?page=customer&style=${s.id}`, 'demoCustomer', 'width=900,height=640');
  document.getElementById('resetBtn').onclick = () => { try { reg.contentWindow.DEMO_RESET(); } catch {} reg.src = reg.src; if (cus.src) cus.src = cus.src; };
}
