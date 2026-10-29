const { chromium } = require('playwright');
(async () => { const port = require('fs').readFileSync(__dirname + '/demo-port.txt', 'utf8').trim();
  const b = await chromium.launch(); const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/demo/register/index.html?style=16&bare=1`); await p.evaluate(() => DEMO_RESET()); await p.reload(); await p.waitForTimeout(800);
  for (const c of ['1006','1003']) await p.evaluate(c => act('scan', { code: c }), c);
  const c = await ctx.newPage(); await c.goto(`http://127.0.0.1:${port}/demo/register/demo-customer.html?style=16&bare=1`); await c.waitForTimeout(1500);
  console.log(JSON.stringify(await c.evaluate(() => document.body.innerText)));
  await c.screenshot({path:'/tmp/c16.png'}); await b.close(); })();
