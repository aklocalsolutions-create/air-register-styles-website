// Tested styles: (1) side by side with the style bot's own app screenshots (sale, payment, customer display) at 1366x800,
// (2) the demo page at common widths: sale, payment and customer screen, with layout checks. Fake demo data only.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'screenshots');
const port = fs.readFileSync(path.join(__dirname, 'demo-port.txt'), 'utf8').trim(), BASE = `http://127.0.0.1:${port}/demo/`;
const window = {}; eval(fs.readFileSync(path.join(ROOT, 'demo/demo-styles-config.js'), 'utf8'));
const TESTED = window.DEMO_STYLES.filter(s => s.stage === 'tested' && (!process.argv[2] || process.argv[2].split(',').includes(s.id)));
const SIZES = [[1920, 1080], [1366, 768], [1280, 800], [1024, 768], [390, 844]];
const REF = '/workspace/air-register-styles-work/screens/styles';
async function ring(fr) {
  await fr.evaluate(() => window.DEMO_RESET()); await fr.evaluate(() => location.reload()); await fr.waitForTimeout(1200);
  for (const c of ['1001', '1003', '1006']) { await fr.evaluate(c => act('scan', { code: c }), c); await fr.waitForTimeout(150); }
  await fr.waitForTimeout(500);
}
const layout = fr => fr.evaluate(() => {
  const W = innerWidth, H = innerHeight, vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), st = getComputedStyle(el); return r.width > 4 && r.height > 4 && st.visibility !== 'hidden' && st.display !== 'none' && r.right <= W + 2 && r.bottom <= H + 2 && r.left >= -2 && r.top >= -2; };
  const payBtn = [...document.querySelectorAll('[data-a="checkout"],button,[role=button],.tile,a')].find(b => (b.dataset.a === 'checkout' || /(^|\s)(payment|pay)\b/i.test((b.innerText || '').slice(0, 40))) && vis(b));
  const totalShown = document.body.innerText.includes(S.totals.due.toFixed(2));
  return { hOverflow: document.documentElement.scrollWidth > W + 2, payVisible: !!payBtn, totalShown, scanVisible: vis(document.getElementById('scanInput')) };
});
(async () => {
  const b = await chromium.launch(); const report = [];
  for (const s of TESTED) {
    const dir = path.join(OUT, 'widths', `${s.id}-${s.slug}`); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(path.join(OUT, 'compare'), { recursive: true });
    const r = { id: s.id, name: s.name, compare: {}, widths: [], errors: [] };
    // (1) app-vs-site at the bots' screenshot size
    { const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } }); const p = await ctx.newPage(); p.on('pageerror', e => r.errors.push(e.message));
      await p.goto(BASE + `register/index.html?style=${s.id}&bare=1`); await p.waitForTimeout(600); await ring(p.mainFrame());
      await p.screenshot({ path: path.join(OUT, 'compare', `site-${s.id}-sale.png`) });
      await p.evaluate(() => checkoutDialog()); await p.waitForSelector('#cashIn'); await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(OUT, 'compare', `site-${s.id}-payment.png`) });
      const c = await ctx.newPage(); c.on('pageerror', e => r.errors.push('customer: ' + e.message)); await c.setViewportSize({ width: 1366, height: 800 });
      await c.goto(BASE + `register/demo-customer.html?style=${s.id}&bare=1`); await c.waitForTimeout(1200);
      await c.screenshot({ path: path.join(OUT, 'compare', `site-${s.id}-customer.png`) });
      await ctx.close(); }
    // (2) the demo page at each width
    for (const [w, h] of SIZES) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(w < 500 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await ctx.addInitScript(() => addEventListener('error', e => { try { (top.__e = top.__e || []).push(e.message); } catch {} }));
      await p.goto(BASE + `demo-style.html?style=${s.id}&view=reg`); await p.waitForTimeout(700);
      let reg = p.frame({ url: /register\/index\.html/ }); await ring(reg); reg = p.frame({ url: /register\/index\.html/ });
      const tag = `${w}x${h}`;
      const page = await p.evaluate(() => ({ band: !!document.getElementById('demoBand') && document.getElementById('demoBand').getBoundingClientRect().bottom <= innerHeight, hOverflow: document.documentElement.scrollWidth > innerWidth + 2,
        frameH: Math.round(document.getElementById('reg').getBoundingClientRect().height), dl: !!document.querySelector('#dlSlot .dl[disabled]') }));
      const sale = await layout(reg);
      await p.screenshot({ path: path.join(dir, `${tag}-sale.png`) });
      await reg.evaluate(() => checkoutDialog()); await reg.waitForSelector('#cashIn'); await reg.waitForTimeout(400);
      const pay = await reg.evaluate(() => { const W = innerWidth, H = innerHeight, f = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.right <= W + 2 && r.bottom <= H + 2 && r.left >= -2 && r.top >= -2; };
        return { cashInVisible: f(document.getElementById('cashIn')), payOkVisible: f(document.getElementById('payOk')), keyOnly: getComputedStyle(document.getElementById('payOk')).display === 'none' && getComputedStyle(document.getElementById('payBack')).display === 'none', dueVisible: f(document.getElementById('payTotal')), hOverflow: document.documentElement.scrollWidth > W + 2 }; });
      await p.screenshot({ path: path.join(dir, `${tag}-payment.png`) });
      await reg.evaluate(() => document.getElementById('payBack') && document.getElementById('payBack').click()); await p.waitForTimeout(300);
      await p.locator('#vCust').click(); await p.waitForTimeout(1300);
      const cus = p.frame({ url: /customer\.html/ });
      const cu = await cus.evaluate(() => { const W = innerWidth, H = innerHeight, side = document.getElementById('side'), r = side.getBoundingClientRect(); const big = side.querySelector('.big');
        const rb = big && big.getBoundingClientRect(); return { saleView: document.getElementById('sale').classList.contains('on'), totalVisible: !!rb && rb.width > 4 && rb.right <= W + 2 && rb.bottom <= H + 2, hOverflow: document.documentElement.scrollWidth > W + 2 }; });
      await p.screenshot({ path: path.join(dir, `${tag}-customer.png`) });
      const fe = await p.evaluate(() => top.__e || []);
      const ok = page.band && !page.hOverflow && page.dl && !sale.hOverflow && sale.payVisible && sale.totalShown && pay.cashInVisible && (pay.payOkVisible || pay.keyOnly) /* keyOnly: style hides Pay/Back by design (Enter / Esc) */ && cu.saleView && cu.totalVisible && !errs.length && !fe.length;
      r.widths.push({ size: tag, ok, page, sale, pay, customer: cu, errors: [...errs, ...fe] });
      console.log(`${ok ? 'PASS' : 'FAIL'} ${s.id} ${tag}`, ok ? '' : JSON.stringify({ page, sale, pay, cu, errs, fe }));
      await ctx.close();
    }
    report.push(r);
  }
  fs.writeFileSync(path.join(__dirname, process.argv[2] ? 'demo-widths-results-' + process.argv[2].replace(/,/g, '-') + '.json' : 'demo-widths-results.json'), JSON.stringify(report, null, 1));
  await b.close();
})();
