// Demo Store e2e: for every style in demo/styles-config.js, on the demo page (register + customer screen side by side):
// scan items, qty +, remove a line, 10% discount, check the totals math, pay cash with change, check the receipt and
// the customer screen, then a pretend card sale ("Approved - demo"). Collects JS errors and any non-local request.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), SHOTS = path.join(ROOT, 'screenshots');
const port = fs.readFileSync(path.join(__dirname, 'port.txt'), 'utf8').trim(), BASE = `http://127.0.0.1:${port}/demo/`;
const cfg = fs.readFileSync(path.join(ROOT, 'demo/styles-config.js'), 'utf8'); const window = {}; eval(cfg); const STYLES = window.DEMO_STYLES;
const only = process.argv[2] ? process.argv[2].split(',') : null;
const PAYSHOTS = ['03', '16', '22'];
const r2 = n => Math.round((n + 1e-9) * 100) / 100, money = n => '$' + r2(n).toFixed(2);
const PRICES = { 1001: 24.99, 1003: 12.00, 1006: 3.50, 2001: 7.99 };
function expectTotals(lines, pct) { // same math as register.js recalc (8% tax on each line, order % off)
  let item = 0, tax = 0; lines.forEach(([code, q]) => { const net = r2(PRICES[code] * q); item += net; tax += r2(net * 0.08); });
  item = r2(item); const od = r2(pct / 100 * item); return { item, od, due: r2(r2(item - od) + r2(tax * (1 - pct / 100))) };
}
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true }); 
  const browser = await chromium.launch(); const results = [];
  for (const s of STYLES.filter(x => !only || only.includes(x.id))) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
    const errs = [], ext = [], steps = []; const step = (name, ok, info = '') => { steps.push({ name, ok: !!ok, info }); if (!ok) console.log(`  FAIL ${s.id} ${name} ${info}`); };
    await ctx.addInitScript(() => { window.addEventListener('error', e => { try { (window.top.__errs = window.top.__errs || []).push(location.pathname + ': ' + (e.message || e.error)); } catch {} }); window.addEventListener('unhandledrejection', e => { try { (window.top.__errs = window.top.__errs || []).push(location.pathname + ': rejection ' + (e.reason && e.reason.message || e.reason)); } catch {} }); });
    page.on('pageerror', e => errs.push('page: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('request', r => { const u = r.url(); if (!u.startsWith(`http://127.0.0.1:${port}/`) && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('about:')) ext.push(u); });
    try {
      await page.goto(BASE + `style.html?style=${s.id}&view=split`); await page.waitForTimeout(400);
      let reg = page.frame({ url: /register\/index\.html/ });
      await reg.evaluate(() => window.DEMO_RESET()); await page.evaluate(() => { document.getElementById('reg').contentWindow.location.reload(); document.getElementById('cus').contentWindow.location.reload(); });
      await page.waitForTimeout(1500); reg = page.frame({ url: /register\/index\.html/ }); const cus = page.frame({ url: /customer\.html/ });
      const info = await reg.evaluate(() => ({ ds: document.documentElement.dataset.style, css: [...document.styleSheets].some(x => x.href && x.href.includes('/styles/style-' + document.documentElement.dataset.style)), loggedIn: S && S.loggedIn }));
      const tested = s.stage === 'tested';
      step(tested ? 'real style applied' : 'preview: register in Classic look', tested ? info.ds === s.id && info.css : info.ds === '00' && !info.css, JSON.stringify(info));
      step('stage badge', (await page.locator('#sname').innerText()).includes(tested ? 'Tested' : 'Preview - still in testing'));
      step('band + name visible', await page.locator('#demoBand').isVisible() && (await page.locator('#sname').innerText()).includes(`Style ${s.id}`) && (await page.locator('#sname').innerText()).includes(s.name));
      step('download placeholder', await page.locator('#dlSlot button.dl[disabled]').count() === 1 && (await page.locator('#dlSlot').innerText()).includes('Download - coming soon'));
      // ring up: scan 1001 and 1003 through the scan box (or the app's own scan call when a style hides the box), 1006 from a product button
      for (const code of ['1001', '1003']) {
        const vis = await reg.locator('#scanInput').isVisible().catch(() => false);
        if (vis) { await reg.locator('#scanInput').fill(code); await reg.locator('#scanInput').press('Enter'); } else await reg.evaluate(c => act('scan', { code: c }), code);
        await reg.waitForTimeout(350);
      }
      const bulk = reg.locator('[data-bulk="5"]').first();
      if (await bulk.isVisible().catch(() => false)) await bulk.click(); else await reg.evaluate(() => act('bulk-add', { index: 5 }));
      await reg.waitForTimeout(350);
      step('3 lines in cart', (await reg.evaluate(() => S.cart.length)) === 3);
      await reg.evaluate(() => act('qty-plus', { row: 0 })); await reg.evaluate(() => act('qty', { row: 1, qty: 3 })); await reg.waitForTimeout(200);
      await reg.evaluate(() => act('remove', { row: 2 })); await reg.waitForTimeout(200);
      await reg.evaluate(() => act('discount', { kind: 'percent', value: 10 })); await reg.waitForTimeout(500);
      const exp = expectTotals([[1006, 2], [1003, 3]], 10); // newest line is row 0 (same as the real register)
      const got = await reg.evaluate(() => ({ n: S.cart.length, q: S.cart.map(l => l.quantity), due: S.totals.due, item: S.totals.itemAmount, txt: document.body.innerText }));
      step('qty/remove', got.n === 2 && got.q.join() === '2,3', JSON.stringify(got.q));
      step('totals math', Math.abs(got.due - exp.due) < 0.005 && Math.abs(got.item - exp.item) < 0.005, `due ${got.due} expected ${exp.due}`);
      step('total on screen', got.txt.includes(money(exp.due).slice(1)), money(exp.due));
      await page.waitForTimeout(900);
      const ctxt = await cus.evaluate(() => document.body.innerText);
      step('customer screen shows sale', ctxt.includes(money(exp.due)) && /Plush Bear/i.test(ctxt) && /Bouncy Ball/i.test(ctxt) && !/Toy Robot/i.test(ctxt), money(exp.due));
      if (tested) { await page.locator('#vReg').click(); await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, `register-${s.id}-${s.slug}.png`) }); }
      else {
        await page.locator('#vMock').click(); await page.waitForTimeout(900);
        const mk = page.frame({ url: /mockups\// }); const mt = mk ? await mk.evaluate(() => document.body.innerText) : '';
        step('preview mockup loads', mk && mt.includes('PREVIEW - still in testing') && mt.length > 200);
        await page.screenshot({ path: path.join(SHOTS, `register-${s.id}-${s.slug}-preview.png`) });
        await page.locator('#vMockPay').click(); await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SHOTS, `payment-${s.id}-${s.slug}-preview.png`) });
        await page.locator('#vReg').click(); await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(SHOTS, `register-${s.id}-${s.slug}-classic-working.png`) });
      }
      await reg.evaluate(() => checkoutDialog()); await reg.waitForSelector('#cashIn', { timeout: 4000 });
      const tendered = Math.ceil(exp.due / 10) * 10 + 20, change = r2(tendered - exp.due);
      await reg.locator('#cashIn').fill(String(tendered)); await reg.locator('#cashIn').dispatchEvent('input'); await reg.waitForTimeout(250);
      step('change preview', (await reg.locator('#chg').innerText()).includes(change.toFixed(2)), `${await reg.locator('#chg').innerText()} vs ${change}`);
      if (PAYSHOTS.includes(s.id)) await page.screenshot({ path: path.join(SHOTS, `payment-cash-${s.id}-${s.slug}.png`) });
      await reg.locator('#payOk').click(); await reg.waitForSelector('#dPrint', { timeout: 4000 });
      step('sale complete + change', (await reg.locator('.donechg').innerText()).includes(change.toFixed(2)));
      await page.locator('#vSplit').click(); await page.waitForTimeout(900);
      const done = await cus.evaluate(() => document.getElementById('done').classList.contains('on') && document.body.innerText);
      step('customer screen done view', done && done.includes(money(exp.due)) && done.includes(money(change)));
      if (PAYSHOTS.includes(s.id)) await page.screenshot({ path: path.join(SHOTS, `customer-done-${s.id}-${s.slug}.png`) });
      await reg.locator('#dPrint').click(); await page.waitForSelector('#demoReceipt', { timeout: 3000 });
      step('receipt total/change', (await page.locator('#rcTotal').innerText()) === money(exp.due) && (await page.locator('#rcChange').innerText()) === money(change) && (await page.locator('#demoReceipt').innerText()).includes('DEMO RECEIPT'));
      if (PAYSHOTS.includes(s.id)) await page.screenshot({ path: path.join(SHOTS, `receipt-${s.id}-${s.slug}.png`) });
      await page.locator('#demoRcClose').click();
      step('done closed after print', (await reg.locator('#dPrint').count()) === 0);
      // pretend card sale
      await reg.evaluate(() => act('scan', { code: '2001' })); await reg.waitForTimeout(300);
      const due2 = expectTotals([[2001, 1]], 0).due;
      await reg.evaluate(() => checkoutDialog()); await reg.waitForSelector('#pa-20', { timeout: 4000 });
      await reg.locator('#pa-20').fill(due2.toFixed(2)); await reg.locator('#pa-20').dispatchEvent('input'); await reg.locator('#payOk').click();
      await reg.waitForFunction(() => /approved - demo/i.test((document.getElementById('payBody') || {}).innerText || ''), null, { timeout: 5000 });
      step('card approved - demo', true);
      if (PAYSHOTS.includes(s.id)) await page.screenshot({ path: path.join(SHOTS, `payment-card-${s.id}-${s.slug}.png`) });
      await reg.waitForSelector('#dPrint', { timeout: 6000 });
      const rec = await reg.evaluate(() => window.DEMO_RECEIPT());
      step('card sale recorded', rec && Math.abs(rec.total - due2) < 0.005 && rec.tenders.some(t => /approved - demo/i.test(t.name)) && rec.change === 0, JSON.stringify(rec && rec.tenders));
      await reg.locator('#dNew').click(); await reg.waitForTimeout(300);
      // thumbnail for the gallery: register only, plain

    } catch (e) { step('flow', false, e.message.split('\n')[0]); }
    const ferrs = await page.evaluate(() => window.__errs || []).catch(() => []);
    const allErr = [...errs, ...ferrs].filter(x => !/favicon/.test(x));
    step('no JS errors', !allErr.length, allErr.slice(0, 3).join(' | '));
    step('no outside requests', !ext.length, ext.slice(0, 3).join(' '));
    const pass = steps.every(x => x.ok); results.push({ id: s.id, name: s.name, stage: s.stage, pass, passed: steps.filter(x => x.ok).length, total: steps.length, fails: steps.filter(x => !x.ok), errors: allErr });
    console.log(`${pass ? 'PASS' : 'FAIL'} Style ${s.id} ${s.name} ${steps.filter(x => x.ok).length}/${steps.length}`);
    await ctx.close();
  }
  // gallery
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const g = await ctx.newPage(); const gerr = [];
  g.on('pageerror', e => gerr.push(e.message)); await g.goto(BASE + 'index.html'); await g.waitForTimeout(800);
  const cards = await g.locator('.card').count(), dls = await g.locator('.card button.dl[disabled]').count(), links = await g.locator('a[href*="is.gd"], a[href*="airbiz"]').count();
  await g.screenshot({ path: path.join(SHOTS, 'gallery.png') }); await g.screenshot({ path: path.join(SHOTS, 'gallery-full.png'), fullPage: true });
  results.push({ id: 'gallery', pass: cards === STYLES.length && dls === STYLES.length && !links && !gerr.length, info: { cards, disabledDownloads: dls, outsideLinks: links, errors: gerr } });
  console.log('gallery', JSON.stringify(results[results.length - 1]));
  fs.writeFileSync(path.join(__dirname, only ? 'results-' + only.join('-') + '.json' : 'results.json'), JSON.stringify(results, null, 1));
  await browser.close();
})();
