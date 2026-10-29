const { chromium } = require('playwright');
(async () => {
  const port = require('fs').readFileSync(__dirname + '/demo-port.txt', 'utf8').trim();
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 820 } });
  p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') console.log('console', m.type(), m.text()); });
  p.on('pageerror', e => console.log('pageerror', e.message));
  p.on('request', r => { if (!r.url().startsWith('http://127.0.0.1')) console.log('EXT', r.url()); });
  await p.goto(`http://127.0.0.1:${port}/demo/register/index.html?style=${process.argv[2]||'19'}&bare=1`); await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => ({ ds: document.documentElement.dataset.style, bulk: document.querySelectorAll('[data-bulk]').length, login: getComputedStyle(document.getElementById('login')).display, title: document.title })));
  await p.screenshot({ path: '/tmp/smoke.png' }); await b.close();
})();
