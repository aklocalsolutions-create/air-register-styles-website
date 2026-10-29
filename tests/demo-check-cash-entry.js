// After typing a cash amount in the payment sheet, Back and Pay must be fully on screen (default styles 01,27; pass ids to check others).
// Demo page at 1366x768 / 1024x768 (register frame is about 620px tall) and the register alone at 1024x620 and 1024x600; no scrolling allowed.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const port = process.env.DEMO_PORT || fs.readFileSync(path.join(__dirname, 'demo-port.txt'), 'utf8').trim(), BASE = `http://127.0.0.1:${port}/demo/`;
const OUT = process.env.SHOTDIR || path.join(__dirname, '../screenshots/fixes'); fs.mkdirSync(OUT, { recursive: true });
const window = {}; eval(fs.readFileSync(path.join(__dirname, '..', 'demo/demo-styles-config.js'), 'utf8')); const SLUG = Object.fromEntries(window.DEMO_STYLES.map(s => [s.id, s.slug]));
(async () => { const b = await chromium.launch(); const out = []; let ok = true;
  for (const id of (process.argv[2] || '01,27').split(',')) for (const [w, h, bare] of [[1366, 768], [1024, 768], [1024, 620, 1], [1024, 600, 1]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + (bare ? `register/index.html?style=${id}&bare=1` : `demo-style.html?style=${id}&view=reg`)); await p.waitForTimeout(800);
    let fr = bare ? p.mainFrame() : p.frame({ url: /register\/index\.html/ });
    await fr.evaluate(() => window.DEMO_RESET ? window.DEMO_RESET() : localStorage.removeItem('demoStore.register.v1')); await fr.evaluate(() => location.reload()); await p.waitForTimeout(1300);
    fr = bare ? p.mainFrame() : p.frame({ url: /register\/index\.html/ });
    for (const c of ['1001', '1003', '1006', '2001']) { await fr.evaluate(c => act('scan', { code: c }), c); await p.waitForTimeout(150); }
    await fr.evaluate(() => checkoutDialog()); await fr.waitForSelector('#cashIn'); await p.waitForTimeout(300);
    await fr.evaluate(() => { const l = document.querySelector('.pline[data-t="10"]'); if (l) l.click(); }); await p.waitForTimeout(250);
    await fr.locator('#cashIn').fill('20'); await fr.locator('#cashIn').dispatchEvent('input'); await p.waitForTimeout(400);
    const r = await fr.evaluate(() => { const W = innerWidth, H = innerHeight, f = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { full: r.width > 2 && r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1, bottom: Math.round(r.bottom) }; };
      return { frameH: H, keyOnly: getComputedStyle(document.getElementById('payOk')).display === 'none' && getComputedStyle(document.getElementById('payBack')).display === 'none', pay: f(document.getElementById('payOk')), back: f(document.getElementById('payBack')), cash: document.getElementById('cashIn').value, scrolled: (() => { let n = 0; for (let e = document.getElementById('payOk'); e; e = e.parentElement) n += e.scrollTop || 0; return n + scrollY; })() }; });
    const tag = `${w}x${h}${bare ? '-app' : ''}`, pass = !!((r.keyOnly || (r.pay && r.pay.full && r.back && r.back.full && !r.scrolled)) && !errs.length); if (!pass) ok = false; // keyOnly: the style hides Back/Pay by design (Esc / Enter)
    const shot = path.join(OUT, `${id}-${SLUG[id] || id}-${tag}-cash-entry.png`); await p.screenshot({ path: shot });
    out.push({ id, size: tag + (bare ? ' (app window)' : ' (demo page)'), pass, ...r, errs, shot }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${tag}`, JSON.stringify(r)); await p.close(); }
  fs.writeFileSync(path.join(__dirname, 'demo-cash-entry-results.json'), JSON.stringify(out, null, 1)); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close(); process.exit(ok ? 0 : 1); })();
