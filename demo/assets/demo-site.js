// DEMO STORE gallery + demo frame. Reads window.DEMO_STYLES from demo-styles-config.js.
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const safeColor = c => /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(c || '')) ? c : '#cccccc';
function safeHttp(url) {
  if (!url) return '';
  try { const u = new URL(url, location.href); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : ''; } catch { return ''; }
}
const FRAME_VIEWS = new Set(['reg', 'split', 'cust']);
const DL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
// "Download Air Register in this style": a disabled placeholder until the style's downloadUrl is set in demo-styles-config.js.
function downloadButton(s) {
  const label = `Download Air Register in this style (Style ${s.id} ${s.name})`;
  const href = safeHttp(s.downloadUrl);
  if (href) return `<a class="dl live" href="${esc(href)}" rel="noopener" title="${esc(label)}" data-download="${s.id}">${DL_ICON}Download</a>`;
  return `<button class="dl" type="button" disabled aria-disabled="true" title="${esc(label)} - coming soon" data-download="${s.id}">${DL_ICON}Download - coming soon</button>`;
}
function stageBadge(s) { return s.stage === 'tested' ? '<span class="badge ok" data-stage="tested">✔ Tested - working demo in this style</span>' : '<span class="badge pv" data-stage="preview">Preview - coming soon to Air Register</span>'; }
// small original preview drawn from the style's colours (used until a screenshot thumbnail exists)
function swatchThumb(s) {
  const [a, b, c] = (s.swatch || ['#345', '#9bd', '#eef']).map(safeColor);
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="200" fill="${c}"/><rect width="320" height="26" fill="${a}"/>
  <rect x="12" y="38" width="190" height="124" rx="8" fill="#fff" opacity=".9"/>${[0, 1, 2, 3, 4].map(i => `<rect x="22" y="${50 + i * 20}" width="${110 - i * 9}" height="9" rx="4" fill="${a}" opacity=".55"/><rect x="160" y="${50 + i * 20}" width="30" height="9" rx="4" fill="${a}" opacity=".35"/>`).join('')}
  <rect x="214" y="38" width="94" height="124" rx="8" fill="${b}"/>${[0, 1, 2].map(r => [0, 1].map(k => `<rect x="${222 + k * 42}" y="${46 + r * 38}" width="36" height="30" rx="6" fill="#fff" opacity=".75"/>`).join('')).join('')}
  <rect x="12" y="170" width="200" height="20" rx="6" fill="${a}" opacity=".25"/><rect x="214" y="170" width="94" height="20" rx="6" fill="${a}"/></svg>`;
}
function renderGallery() {
  const g = document.getElementById('grid'), list = window.DEMO_STYLES || [];
  g.innerHTML = list.map(s => `<article class="card" data-style="${s.id}">
    <a class="thumb" href="demo-style.html?style=${s.id}" aria-label="Open the Style ${s.id} ${esc(s.name)} ${s.stage === 'tested' ? 'demo' : 'preview'}"><span class="svg">${swatchThumb(s)}</span>
      <img alt="" src="assets/thumbs/demo-style-${s.id}.png" onerror="this.remove()" style="position:absolute;inset:0"><span class="no">Style ${s.id}</span></a>
    <div class="body"><h3>Style ${s.id} ${esc(s.name)}</h3>
      ${stageBadge(s)}${s.desc ? `<div class="meta">${esc(s.desc)}</div>` : ''}
      <div class="sw">${(s.swatch || []).map(c => `<i style="background:${safeColor(c)}"></i>`).join('')}</div>
      <div class="row"><a class="btn pri" href="demo-style.html?style=${s.id}">${s.stage === 'tested' ? 'Open demo' : 'See preview'}</a>${downloadButton(s)}</div></div></article>`).join('');
  document.getElementById('count').textContent = list.length;
}
function renderFrame() {
  const q = new URLSearchParams(location.search), id = (q.get('style') || '').padStart(2, '0');
  const s = (window.DEMO_STYLES || []).find(x => x.id === id) || (window.DEMO_STYLES || [])[0];
  document.title = `DEMO - Style ${s.id} ${s.name} - Demo Store`;
  const pv = s.stage !== 'tested';
  if (pv) { renderPreview(s); return; }
  document.getElementById('sname').innerHTML = `<span class="no">Style ${s.id}</span> ${esc(s.name)} ${stageBadge(s)}`;
  frameCommon(s);
  const reg = document.getElementById('reg'), cus = document.getElementById('cus'), stage = document.getElementById('stage');
  reg.src = `register/index.html?style=${encodeURIComponent(s.id)}`;
  const view = v => {
    if (!FRAME_VIEWS.has(v)) v = 'reg';
    stage.className = 'stage ' + v;
    if (v !== 'reg' && !cus.src.includes('customer')) cus.src = `register/demo-customer.html?style=${encodeURIComponent(s.id)}`;
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => view(b.dataset.view));
  const requested = q.get('view');
  view(FRAME_VIEWS.has(requested) ? requested : 'reg');
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
  document.getElementById('popBtn').onclick = () => window.open(`demo-window.html?page=customer&style=${s.id}`, 'demoCustomer', 'width=900,height=640');
  document.getElementById('resetBtn').onclick = () => { try { reg.contentWindow.DEMO_RESET(); } catch {} reg.src = reg.src; if (cus.src) cus.src = cus.src; };
}
// shared by the demo page and the preview page: style name + badge, download placeholder, style picker
function frameCommon(s) {
  document.getElementById('sname').innerHTML = `<span class="no">Style ${s.id}</span> ${esc(s.name)} ${stageBadge(s)}`;
  document.getElementById('dlSlot').innerHTML = downloadButton(s);
  const sel = document.getElementById('pick');
  sel.innerHTML = (window.DEMO_STYLES || []).map(x => `<option value="${x.id}"${x.id === s.id ? ' selected' : ''}>Style ${x.id} ${esc(x.name)}${x.stage === 'tested' ? '' : ' (preview)'}</option>`).join('');
  sel.onchange = () => { location.search = '?style=' + encodeURIComponent(sel.value); };
}
// 'preview' styles: not in Air Register yet. Shows the design mockup (switch screens with the buttons) and its pictures.
const PREVIEW_SHOTS = { sale: ['sale', 'Sale screen'], payment: ['pay', 'Payment screen'], customer: ['cfd', 'Customer screen'], menu: ['menu', 'Register menu'], keys: ['keys', 'Keys screen'] };
function renderPreview(s) {
  document.title = `DEMO - Style ${s.id} ${s.name} - Preview - Demo Store`;
  document.body.classList.add('isPreview');
  frameCommon(s);
  const pvw = s.preview || {}, dir = (typeof pvw.dir === 'string' && /^previews\/[a-z0-9-]+\/$/.test(pvw.dir)) ? pvw.dir : '';
  const shots = (pvw.shots || []).filter(k => PREVIEW_SHOTS[k]);
  document.getElementById('stage').remove();
  const note = document.getElementById('pvNote'); note.hidden = false;
  note.innerHTML = '<b>Preview - coming soon to Air Register.</b> This style is not in the Windows app yet. Below is its design with made-up Demo Store data: switch screens with the buttons, or scroll down for the pictures. Nothing on it is a working register.';
  const box = document.createElement('main'); box.className = 'pvWrap'; box.id = 'pvWrap';
  box.innerHTML = `${s.desc ? `<p class="pvDesc">${esc(s.desc)}</p>` : ''}<section class="pvLive"><div class="pvBar"><b>Clickable design mockup</b>${shots.map((k, i) => `<button class="btn${i ? '' : ' on'}" type="button" data-screen="${PREVIEW_SHOTS[k][0]}">${PREVIEW_SHOTS[k][1]}</button>`).join('')}</div>
    <div class="pvFrame" id="pvFrame" data-tag="DEMO · Preview - coming soon to Air Register · made-up data"><iframe id="pvMock" title="Style ${s.id} ${esc(s.name)} design mockup (preview)"></iframe></div></section>
    <section class="pvShots"><h2>Pictures</h2><div class="pvGrid">${shots.map(k => `<figure><a href="${dir}demo-${k}.png" target="_blank" rel="noopener"><img loading="lazy" src="${dir}demo-${k}.png" alt="Style ${s.id} ${esc(s.name)} preview - ${PREVIEW_SHOTS[k][1].toLowerCase()} (made-up demo data)"></a><figcaption>${PREVIEW_SHOTS[k][1]}</figcaption></figure>`).join('')}</div></section>`;
  document.body.appendChild(box);
  const f = document.getElementById('pvMock'), fr = document.getElementById('pvFrame');
  if (dir) f.src = dir + 'index.html#sale';
  box.querySelectorAll('[data-screen]').forEach(b => b.onclick = () => {
    box.querySelectorAll('[data-screen]').forEach(x => x.classList.toggle('on', x === b));
    if (dir) f.src = dir + 'index.html#' + b.dataset.screen;
  });
  const W = 1366, H = 768;
  const fit = () => { const k = Math.min(1, fr.clientWidth / W); f.style.width = W + 'px'; f.style.height = H + 'px'; f.style.transform = `scale(${k})`; fr.style.height = Math.round(H * k) + 20 + 'px'; };
  addEventListener('resize', fit); new ResizeObserver(fit).observe(fr); fit();
}
