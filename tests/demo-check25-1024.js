// Style 25 at 1024x768: header title and Payment chip must fit (no clipping, no overlap with neighbours).
const { chromium } = require('playwright'); const fs = require('fs');
const port = fs.readFileSync(__dirname + '/demo-port.txt', 'utf8').trim();
(async () => { const b = await chromium.launch(); const out = [];
  for (const [w, h] of [[1024, 768], [1280, 800], [1366, 768]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${port}/demo/register/index.html?style=25&bare=1`); await p.waitForTimeout(1500);
    // add an item so the Payment chip shows an amount
    await p.locator('.item, .tile[data-pid], [data-pid]').first().click().catch(() => {}); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const R = e => { const x = e.getBoundingClientRect(); return { l: x.left, r: x.right, t: x.top, b: x.bottom, w: x.width, h: x.height }; };
      const vis = e => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
      const ov = (a, c) => a.l < c.r - 0.5 && c.l < a.r - 0.5 && a.t < c.b - 0.5 && c.t < a.b - 0.5;
      const title = document.querySelector('.s25-ht b'), pay = document.querySelector('.tiles .tile[data-a="checkout"]');
      const clipped = e => e.scrollWidth > e.clientWidth + 1;
      const others = [...document.querySelectorAll('.s25-head button, .s25-head a, .abtn, .tiles .tile, #right .rbtn')].filter(e => vis(e) && e !== pay && !e.contains(title) && !pay.contains(e));
      const hit = el => others.filter(o => !o.contains(el) && !el.contains(o) && ov(R(el), R(o))).map(o => (o.dataset.a || o.className || o.tagName) + ':' + o.innerText.trim().slice(0, 20));
      const vw = innerWidth;
      return { title: { text: title && title.innerText, clipped: title && clipped(title), inView: title && R(title).r <= vw, overlaps: title ? hit(title) : ['missing'] },
               pay: { text: pay && pay.innerText.replace(/\s+/g, ' '), clipped: pay && clipped(pay), inView: pay && R(pay).r <= vw && R(pay).l >= 0, overlaps: pay ? hit(pay) : ['missing'] },
               pageOverflowX: document.documentElement.scrollWidth > vw };
    });
    const pass = r.title.text && !r.title.clipped && r.title.inView && !r.title.overlaps.length && r.pay.text && !r.pay.clipped && r.pay.inView && !r.pay.overlaps.length && !r.pageOverflowX && !errs.length;
    const shot = `${__dirname}/../screenshots/check-25-${w}x${h}-header-payment.png`; await p.screenshot({ path: shot });
    out.push({ size: `${w}x${h}`, pass, ...r, errs, shot }); console.log(pass ? 'PASS' : 'FAIL', w, JSON.stringify(r), errs.join('|')); await p.close(); }
  fs.writeFileSync(__dirname + '/demo-check-25-1024.json', JSON.stringify(out, null, 1)); await b.close(); })();
