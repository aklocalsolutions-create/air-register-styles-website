// DEMO STORE: small in-page extras for the copied register / customer screens.
// - (the DEMO label is drawn by the page around this screen - style.html or window.html - never on top of the app)
// - original product icons on the product buttons
// - the receipt opens in the demo frame (or here when opened alone)
'use strict';
(() => {
  // icons on product buttons (bulk item buttons + quick search rows)
  const iconFor = name => { const p = (window.DEMO_PRODUCTS || []).find(x => x.label === name || x.name === name); return p ? window.DEMO_ICON(p.icon) : null; };
  function decorate() {
    document.querySelectorAll('[data-bulk]').forEach(b => {
      if (b.querySelector('.demoIco')) return; const i = +b.dataset.bulk, p = (window.DEMO_PRODUCTS || [])[i]; if (!p) return;
      const img = document.createElement('img'); img.className = 'demoIco'; img.alt = ''; img.src = window.DEMO_ICON(p.icon);
      img.style.cssText = 'position:absolute;top:3px;left:3px;width:16px;height:16px;pointer-events:none;opacity:.95';
      if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
      b.appendChild(img); // corner badge: never changes the style's own button layout
    });
    // pretend card / cash art on the payment screen
    const ico = (el, n, css) => { if (!el || el.querySelector(':scope > .demoPayIco')) return; const i = document.createElement('img'); i.className = 'demoPayIco'; i.alt = ''; i.src = window.DEMO_ICON(n); i.style.cssText = css; el.prepend(i); };
    document.querySelectorAll('#payBody .cardbox').forEach(c => ico(c, 'card', 'width:84px;height:84px;display:block;margin:0 auto 6px'));
    document.querySelectorAll('#payBody .pline .plbl').forEach(l => { const t = l.parentElement.dataset.t; const n = t === '20' ? 'card' : t === '10' ? 'cash' : t === '50' ? 'receipt' : null; if (n) ico(l, n, 'width:22px;height:22px;vertical-align:middle;margin-right:6px'); });
    document.querySelectorAll('#payBody .cardbox').forEach(c => { if (/approved - demo/i.test(c.textContent) && !c.querySelector('.demoOk')) { const d = document.createElement('div'); d.className = 'demoOk'; d.textContent = 'APPROVED - DEMO (pretend card, no money moved)'; d.style.cssText = 'margin:8px auto 0;display:inline-block;background:#2b8a3e;color:#fff;font-weight:800;border-radius:6px;padding:4px 10px;font-size:13px'; c.appendChild(d); } });
  }
  window.DEMO_ICON_FOR = iconFor;
  new MutationObserver(() => decorate()).observe(document.documentElement, { childList: true, subtree: true });
  window.DEMO_SHOW_RECEIPT = () => {
    const rec = window.DEMO_RECEIPT && window.DEMO_RECEIPT();
    try { if (window.parent !== window && window.parent.DEMO_OPEN_RECEIPT) return window.parent.DEMO_OPEN_RECEIPT(rec); } catch {}
    if (window.DEMO_RENDER_RECEIPT) window.DEMO_RENDER_RECEIPT(rec, document.body);
  };
})();
