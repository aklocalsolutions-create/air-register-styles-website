const { chromium } = require('playwright');
(async () => { const port = require('fs').readFileSync(__dirname + '/port.txt', 'utf8').trim(); const [id, w, h, dsf] = process.argv.slice(2);
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(dsf || 1) }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/demo/register/index.html?style=${id}&bare=1`); await p.evaluate(() => DEMO_RESET()); await p.reload(); await p.waitForTimeout(900);
  for (const c of ['1001','1003','1006']) await p.evaluate(c => act('scan', { code: c }), c); await p.waitForTimeout(600);
  console.log(JSON.stringify(await p.evaluate(() => { const W = innerWidth; return { sw: document.documentElement.scrollWidth, W,
    over: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 8).map(e => e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 40) + ' r=' + Math.round(e.getBoundingClientRect().right)) }; })));
  await p.screenshot({ path: `/tmp/d-${id}-${w}.png` }); await b.close(); })();
