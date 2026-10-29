// DEMO STORE: picks the style from ?style=NN (must be listed in ../demo-styles-config.js), loads only that style's CSS,
// and tells the copied register screens to use it. Loaded in <head> after demo-styles-config.js and before demo-style.js.
'use strict';
(() => {
  // Opened on its own (not inside the demo page)? Show it inside ../demo-window.html, which draws the DEMO strip above it.
  // ?bare=1 skips this (used only by the automated tests).
  const qs = new URLSearchParams(location.search);
  if (window.top === window && qs.get('bare') !== '1') {
    window.DEMO_LOAD_STYLE_JS = () => {};
    location.replace('../demo-window.html?page=' + (/customer/.test(location.pathname) ? 'customer' : 'register') + '&style=' + encodeURIComponent(qs.get('style') || ''));
    return;
  }
  const list = window.DEMO_STYLES || [];
  const want = (new URLSearchParams(location.search).get('style') || '').padStart(2, '0');
  const s = list.find(x => x.id === want && x.stage === 'tested') || null; // 'preview' styles run in the Classic look until tested
  window.DEMO_STYLE = s ? s.id : '00';
  window.DEMO_STYLE_ENTRY = s;
  window.AIRREG_STYLE_DEFAULT = window.DEMO_STYLE;
  try { localStorage.setItem('airreg.style', window.DEMO_STYLE); } catch {}
  // the Settings > Style picker only lists the demo's styles
  window.AIR_STYLES = [{ id: '00', slug: 'classic', name: 'Classic', swatch: ['#34495e', '#b6d4e7', '#eef2f5'] }].concat(list.map(x => ({ id: x.id, slug: x.slug, name: x.name, swatch: x.swatch })));
  if (s && s.css) document.write(`<link rel="stylesheet" href="styles/demo-style-${s.id}-${s.slug}.css">`);
  document.write('<link rel="stylesheet" href="demo-kit/demo-site-fixes.css">');
  window.DEMO_LOAD_STYLE_JS = () => { if (s && s.js) document.write(`<script src="styles/demo-style-${s.id}-${s.slug}.js"><\/script>`); };
})();
