const { chromium } = require('playwright');
(async () => { const port = require('fs').readFileSync(__dirname + '/demo-port.txt', 'utf8').trim();
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
  await p.goto(`http://127.0.0.1:${port}/demo/register/index.html?style=11&bare=1`); await p.waitForTimeout(900);
  console.log(await p.evaluate(() => [...document.querySelectorAll('#actions .abtn')].filter(b => b.getBoundingClientRect().top < 80).map(b => b.dataset.a + ':' + Math.round(b.getBoundingClientRect().right)).join(' ')));
  await b.close(); })();
