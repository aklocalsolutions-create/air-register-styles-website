// Style 25: after several sales and re-renders there must be exactly one send button and one scan icon (no CSS hiding).
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const port = fs.readFileSync(__dirname + '/port.txt', 'utf8').trim();
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1366, height: 768 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/demo/register/index.html?style=25&bare=1`); await p.evaluate(() => localStorage.removeItem('demoStore.register.v1'));
  await p.reload(); await p.waitForTimeout(900);
  const count = () => p.evaluate(() => { const vis = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').length;
    return { send: document.querySelectorAll('.s25-send').length, sendVisible: vis('.s25-send'), scanic: document.querySelectorAll('.s25-scanic').length, scanicVisible: vis('.s25-scanic'), sw: document.documentElement.scrollWidth }; });
  const log = [{ step: 'load', ...(await count()) }];
  for (let sale = 1; sale <= 4; sale++) {
    for (const c of ['1001', '1003', '1006']) { await p.locator('#scanInput').fill(c); await p.locator('#scanInput').press('Enter'); await p.waitForTimeout(150); }
    await p.evaluate(() => window.dispatchEvent(new Event('resize'))); await p.waitForTimeout(200);
    log.push({ step: 'sale ' + sale + ' rung up', ...(await count()) });
    await p.evaluate(() => checkoutDialog()); await p.waitForSelector('#cashIn', { timeout: 4000 });
    await p.locator('#cashIn').fill('100'); await p.locator('#cashIn').dispatchEvent('input'); await p.waitForTimeout(200);
    await p.locator('#payOk').click(); await p.waitForSelector('#dPrint', { timeout: 4000 }); await p.waitForTimeout(300);
    await p.keyboard.press('Escape'); await p.evaluate(() => { const d = document.querySelector('#dDone, #dNew, [data-a="new-sale"]'); if (d) d.click(); }); await p.waitForTimeout(400);
    log.push({ step: 'sale ' + sale + ' paid, new sale', ...(await count()) });
  }
  await p.reload(); await p.waitForTimeout(900); log.push({ step: 'reload', ...(await count()) });
  const pass = log.every(l => l.send === 1 && l.scanic === 1 && l.sendVisible === 1 && l.scanicVisible === 1 && l.sw <= 1366) && !errs.length;
  await p.locator('#scanInput').fill('1001'); await p.locator('#scanInput').press('Enter'); await p.waitForTimeout(300);
  await p.screenshot({ path: __dirname + '/../screenshots/check-25-after-4-sales.png' });
  fs.writeFileSync(__dirname + '/check-25.json', JSON.stringify({ pass, errs, log }, null, 1));
  console.log(pass ? 'PASS' : 'FAIL', JSON.stringify(log), errs); await b.close(); })();
