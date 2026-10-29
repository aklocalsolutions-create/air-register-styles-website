// Style 22 Scan Hero: the four pay boxes (Due, Paid, Balance, Change) must be fully visible after typing cash.
// Register alone at 1024x620 and 1024x768, and the demo page at 1024x768 and 1366x768 (register frame about 620px tall).
// (Pay sits outside the sheet in this style, so for Pay/Back only "inside the window and not covered" is checked.)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const port = process.env.DEMO_PORT || fs.readFileSync(path.join(__dirname, 'demo-port.txt'), 'utf8').trim(), BASE = `http://127.0.0.1:${port}/demo/`;
const OUT = process.env.SHOTDIR || path.join(__dirname, '../screenshots/fixes'); fs.mkdirSync(OUT, { recursive: true });
(async () => { const b = await chromium.launch(); const out = []; let ok = true;
  for (const [w, h, bare] of [[1024, 620, 1], [1024, 768, 1], [1024, 768], [1366, 768]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + (bare ? 'register/index.html?style=22&bare=1' : 'demo-style.html?style=22&view=reg')); await p.waitForTimeout(1000);
    const fr = bare ? p.mainFrame() : p.frame({ url: /register\/index\.html/ });
    for (const c of ['1001', '1003', '1006', '2001']) { await fr.evaluate(c => act('scan', { code: c }), c); await p.waitForTimeout(120); }
    await fr.evaluate(() => checkoutDialog()); await fr.waitForSelector('#cashIn'); await p.waitForTimeout(300);
    await fr.locator('#cashIn').fill('20'); await fr.locator('#cashIn').dispatchEvent('input'); await p.waitForTimeout(400);
    const r = await fr.evaluate(() => { const W = innerWidth, H = innerHeight;
      const seen = (e, clip = true) => { if (!e) return { found: false }; const q = e.getBoundingClientRect(); let full = q.width > 2 && q.left >= -1 && q.top >= -1 && q.right <= W + 1 && q.bottom <= H + 1;
        for (let a = e.parentElement; clip && a && full; a = a.parentElement) { const s = getComputedStyle(a); if (/(hidden|auto|scroll|clip)/.test(s.overflow + s.overflowY + s.overflowX)) { const c = a.getBoundingClientRect(); if (q.top < c.top - 1 || q.bottom > c.bottom + 1 || q.left < c.left - 1 || q.right > c.right + 1) full = false; } }
        const top = document.elementFromPoint((q.left + q.right) / 2, (q.top + q.bottom) / 2); const onTop = !!top && (e === top || e.contains(top));
        return { found: true, full: full && onTop, text: e.innerText.replace(/\n/g, ' '), box: [q.left, q.top, q.right, q.bottom].map(Math.round) }; };
      return { frameH: H, due: seen(document.querySelector('#payBody .pn.total')), paid: seen(document.querySelector('#payBody .pn.tend')), balance: seen(document.querySelector('#payBody .pn.left')), change: seen(document.querySelector('#payBody .pn.chg')),
        pay: seen(document.getElementById("payOk"), false), back: seen(document.getElementById("payBack"), false) }; });
    const tag = `${w}x${h}${bare ? '-app' : ''}`, boxes = ['due', 'paid', 'balance', 'change'].every(k => r[k].full), pass = boxes && r.pay.full && r.back.full && !errs.length; if (!pass) ok = false;
    const shot = path.join(OUT, `22-scan-hero-${tag}-payboxes.png`); await p.screenshot({ path: shot });
    out.push({ size: tag + (bare ? ' (app window)' : ' (demo page)'), pass, boxes, ...r, errs, shot });
    console.log(`${pass ? 'PASS' : 'FAIL'} 22 ${tag} boxes:${boxes} pay:${r.pay.full} back:${r.back.full}`, ['due', 'paid', 'balance', 'change'].map(k => k + '=' + r[k].box).join(' ')); await p.close(); }
  fs.writeFileSync(path.join(__dirname, 'demo-check-22-payboxes.json'), JSON.stringify(out, null, 1)); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); await b.close(); process.exit(ok ? 0 : 1); })();
