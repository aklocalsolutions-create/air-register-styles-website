// The DEMO label must sit outside every app screen: a strip above each iframe (demo-style.html) or above the screen (demo-window.html).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const window = {}; eval(fs.readFileSync(path.join(__dirname, '../demo/demo-styles-config.js'), 'utf8'));
const port = fs.readFileSync(__dirname + '/demo-port.txt', 'utf8').trim(), BASE = `http://127.0.0.1:${port}/demo/`, SH = path.join(__dirname, '../screenshots/ribbon/');
fs.mkdirSync(SH, { recursive: true });
const SIZES = [[1366, 768, 1], [1024, 768, 1], [390, 844, 2], [1093, 614, 1.25]];
(async () => { const b = await chromium.launch(); const out = []; let ok = true;
  for (const s of window.DEMO_STYLES.filter(x => x.stage === 'tested')) for (const [w, h, dsf] of (['11', '25', '30', '19'].includes(s.id) ? SIZES : [SIZES[0]])) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + `demo-style.html?style=${s.id}&view=split`); await p.waitForTimeout(1300);
    const r = await p.evaluate(() => [...document.querySelectorAll('.pane')].filter(pn => pn.offsetParent).map(pn => {
      const pr = pn.getBoundingClientRect(), fr = pn.querySelector('iframe').getBoundingClientRect(), tag = getComputedStyle(pn, '::before');
      const inApp = (() => { try { return !!pn.querySelector('iframe').contentDocument.getElementById('demoRibbon'); } catch { return 'n/a'; } })();
      return { pane: pn.id, tag: tag.content, stripH: parseFloat(tag.height), iframeTop: Math.round(fr.top - pr.top), clear: fr.top - pr.top >= parseFloat(tag.height) - 0.5, inAppRibbon: inApp };
    }));
    const pass = r.length > 0 && r.every(x => x.clear && x.inAppRibbon === false && /DEMO/.test(x.tag)) && !errs.length; ok = ok && pass;
    if (s.id === '30' && dsf === 1.25) await p.screenshot({ path: SH + '30-card-deck-1366at125pct-in-demo-page.png' });
    if (w === 1366) await p.screenshot({ path: SH + `split-${s.id}-${s.slug}.png` });
    out.push({ id: s.id, size: `${w}x${h}@${dsf}`, pass, panes: r, errs }); console.log(pass ? 'PASS' : 'FAIL', s.id, `${w}x${h}@${dsf}`, JSON.stringify(r.map(x => [x.pane, x.iframeTop, x.inAppRibbon])), errs.join(' | '));
    await p.close();
  }
  // opened on its own -> wrapped in demo-window.html with the strip above
  for (const [pg, file] of [['index', 'index.html'], ['customer', 'demo-customer.html']]) { const p = await b.newPage({ viewport: { width: 1366, height: 768 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + `register/${file}?style=30`); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ url: location.pathname + location.search, strip: document.getElementById('strip') && document.getElementById('strip').innerText, iframeTop: document.getElementById('scr') && document.getElementById('scr').getBoundingClientRect().top }));
    const pass = /window\.html/.test(r.url) && /DEMO/.test(r.strip || '') && r.iframeTop >= 22 && !errs.length; ok = ok && pass;
    await p.screenshot({ path: SH + `window-${pg}-30.png` }); out.push({ id: 'window-' + pg, pass, ...r, errs }); console.log(pass ? 'PASS' : 'FAIL', 'window', pg, JSON.stringify(r), errs.join(' | ')); await p.close(); }
  fs.writeFileSync(__dirname + '/demo-ribbon-results.json', JSON.stringify(out, null, 1)); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); await b.close(); })();
