// Checks for the style bots' 29 Oct layout fixes (19, 22, 23, 25, 27, 17, 30) on the demo page, plus every tested
// style at 125% zoom (1366x768 screen = 1093x614 CSS px at deviceScaleFactor 1.25). Fake demo data only.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.env.SHOTDIR || path.join(ROOT, 'screenshots', 'fixes');
const port = process.env.DEMO_PORT || fs.readFileSync(path.join(__dirname, 'demo-port.txt'), 'utf8').trim(), BASE = `http://127.0.0.1:${port}/demo/`;
const window = {}; eval(fs.readFileSync(path.join(ROOT, 'demo/demo-styles-config.js'), 'utf8'));
const TESTED = window.DEMO_STYLES.filter(s => s.stage === 'tested');
fs.mkdirSync(OUT, { recursive: true });
const results = []; let allOk = true;
const rec = (style, size, check, ok, info) => { results.push({ style, size, check, ok: !!ok, info }); if (!ok) allOk = false; console.log(`${ok ? 'PASS' : 'FAIL'} ${style} ${size} ${check}${ok ? '' : ' ' + JSON.stringify(info)}`); };
const inWin = `(el => { if (!el) return false; const r = el.getBoundingClientRect(), W = innerWidth, H = innerHeight; return r.width > 2 && r.height > 2 && r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1; })`;
async function open(b, id, w, h, dsf = 1, bare = false) { // bare: the register alone filling the window (like the real app)
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + (bare ? `register/index.html?style=${id}&bare=1` : `demo-style.html?style=${id}&view=reg`)); await p.waitForTimeout(800);
  let fr = bare ? p.mainFrame() : p.frame({ url: /register\/index\.html/ });
  await fr.evaluate(() => window.DEMO_RESET ? window.DEMO_RESET() : localStorage.removeItem('demoStore.register.v1')); await fr.evaluate(() => location.reload()); await p.waitForTimeout(1300);
  fr = bare ? p.mainFrame() : p.frame({ url: /register\/index\.html/ });
  for (const c of ['1001', '1003', '1006', '2001']) { await fr.evaluate(c => act('scan', { code: c }), c); await p.waitForTimeout(150); }
  await p.waitForTimeout(500); return { ctx, p, fr, errs };
}
const openPay = async (fr, p) => { await fr.evaluate(() => checkoutDialog()); await fr.waitForSelector('#cashIn'); await p.waitForTimeout(300);
  await fr.evaluate(() => { const l = document.querySelector('.pline[data-t="10"]'); if (l) l.click(); }); await p.waitForTimeout(300); };
const clipped = sel => `[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map(e => (e.id || e.className || e.tagName) + ':' + e.innerText.slice(0, 30))`;
(async () => {
  const b = await chromium.launch();
  // 19 at 1024: totals not clipped; Lane 2 says Preview only, no Pay
  { const { ctx, p, fr, errs } = await open(b, '19', 1024, 768);
    const r = await fr.evaluate(`(() => { const t = document.getElementById('totals'); const cl = [...t.querySelectorAll('*')].filter(e => e.offsetParent && e.children.length === 0 && (e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > t.getBoundingClientRect().right + 1)).map(e => e.innerText);
      const l2 = document.querySelector('.s19-lane2'); const lr = l2 && l2.getBoundingClientRect();
      return { clipped: cl, totalsIn: ${inWin}(t), lane2: !!l2, preview: !!l2 && /Preview only/.test(l2.innerText), pay: !!l2 && (!!l2.querySelector('.s19-pay') || /\\bPay\\b/.test(l2.innerText)), lane2In: !!lr && lr.right <= innerWidth + 1 }; })()`);
    rec('19', '1024x768', 'totals not clipped', !r.clipped.length && r.totalsIn, r);
    rec('19', '1024x768', "Lane 2 says 'Preview only', no Pay", r.lane2 && r.preview && !r.pay && r.lane2In, r);
    await p.screenshot({ path: path.join(OUT, '19-dual-cashier-1024x768-sale.png') });
    rec('19', '1024x768', 'no JS errors', !errs.length, errs); await ctx.close(); }
  // 22: pay drawer on screen
  for (const [w, h] of [[1366, 768], [1024, 768]]) { const { ctx, p, fr, errs } = await open(b, '22', w, h); await openPay(fr, p);
    const r = await fr.evaluate(`(() => { const f = ${inWin}, m = document.querySelector('.modal.fullpay'); const mr = m.getBoundingClientRect();
      return { drawer: f(m) || (mr.left >= -1 && mr.right <= innerWidth + 1 && mr.top >= -1 && mr.bottom <= innerHeight + 1), cashIn: f(document.getElementById('cashIn')), payOk: f(document.getElementById('payOk')), back: f(document.getElementById('payBack')), m: [mr.left, mr.top, mr.right, mr.bottom].map(Math.round) }; })()`);
    const rail = await fr.evaluate(() => { const st = document.getElementById('setTop'); if (!st) return ['no #setTop'];
      const a = st.getBoundingClientRect(); return [...document.querySelectorAll('button, .tile, .abtn')].filter(e => e !== st && e.offsetParent && !e.contains(st) && !st.contains(e)).filter(e => { const c = e.getBoundingClientRect(); return c.width > 4 && a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1; }).map(e => e.innerText.split('\n')[0]); });
    rec('22', `${w}x${h}`, 'left rail: Settings does not overlap other buttons', !rail.length, rail);
    rec('22', `${w}x${h}`, 'pay drawer on screen (sheet, cash box, Pay, Back)', r.drawer && r.cashIn && r.payOk && r.back, r);
    await p.screenshot({ path: path.join(OUT, `22-scan-hero-${w}x${h}-payment.png`) }); rec('22', `${w}x${h}`, 'no JS errors', !errs.length, errs); await ctx.close(); }
  // 23 at 1024: menu and quick search on screen
  { const { ctx, p, fr, errs } = await open(b, '23', 1024, 768);
    const r = await fr.evaluate(`(() => { const f = ${inWin}; const btns = [...document.querySelectorAll('#actions .abtn, #tiles .tile, #right .rbtn')].filter(e => getComputedStyle(e).display !== 'none' && e.offsetParent);
      return { buttons: btns.length, off: btns.filter(e => !f(e)).map(e => e.innerText.slice(0, 20)), qs: f(document.getElementById('qsIn')), hOverflow: document.documentElement.scrollWidth > innerWidth + 2 }; })()`);
    rec('23', '1024x768', 'menu and quick search on screen', r.buttons > 0 && !r.off.length && r.qs && !r.hOverflow, r);
    await p.screenshot({ path: path.join(OUT, '23-spreadsheet-1024x768-sale.png') }); rec('23', '1024x768', 'no JS errors', !errs.length, errs); await ctx.close(); }
  // 25: Pay and Back inside the window after Enter in the pay sheet
  for (const [w, h] of [[1366, 768], [1024, 768]]) { const { ctx, p, fr, errs } = await open(b, '25', w, h); await openPay(fr, p);
    await fr.locator('#cashIn').focus(); await fr.locator('#cashIn').press('Enter'); await p.waitForTimeout(400);
    const r = await fr.evaluate(`(() => { const f = ${inWin}; return { open: !!document.getElementById('payOk'), payOk: f(document.getElementById('payOk')), back: f(document.getElementById('payBack')) }; })()`);
    rec('25', `${w}x${h}`, 'Pay and Back inside the window (after Enter)', r.open && r.payOk && r.back, r);
    await p.screenshot({ path: path.join(OUT, `25-chat-ticket-${w}x${h}-payment.png`) }); rec('25', `${w}x${h}`, 'no JS errors', !errs.length, errs); await ctx.close(); }
  // 27: prices not clipped (sale lines, totals, pay sheet)
  for (const [w, h, bare] of [[1366, 768], [1024, 768], [1366, 768, 1], [1024, 768, 1]]) { const { ctx, p, fr, errs } = await open(b, '27', w, h, 1, !!bare); const W = `${w}x${h}${bare ? ' (app window)' : ' (demo page)'}`, F = `${w}x${h}${bare ? '-app' : ''}`;
    const sale = await fr.evaluate(`(() => [...document.querySelectorAll('#app *')].filter(e => e.offsetParent && e.children.length === 0 && /\\$?\\d+\\.\\d\\d/.test(e.innerText || e.value || '') && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map(e => e.innerText.slice(0, 20)))()`);
    await p.screenshot({ path: path.join(OUT, `27-receipt-preview-${F}-sale.png`) });
    const cols = await fr.evaluate(() => [...document.querySelectorAll('th')].filter(e => e.offsetParent).map(th => { let c = th.parentElement; while (c && getComputedStyle(c).overflowX === 'visible') c = c.parentElement; return [th.innerText.trim(), th.getBoundingClientRect().right <= c.getBoundingClientRect().right + 1]; }));
    rec('27', W, 'all ticket columns (Price, Discount, Total) in view without sideways scrolling', cols.length && cols.every(c => c[1]), cols.filter(c => !c[1]).map(c => c[0]));
    await openPay(fr, p);
    const pay = await fr.evaluate(`(() => { const f = ${inWin}; const m = document.querySelector('.modal.fullpay'); const cl = [...m.querySelectorAll('*')].filter(e => e.offsetParent && (e.tagName === 'INPUT' ? e.scrollWidth > e.clientWidth + 1 : e.children.length === 0 && /\\d\\.\\d\\d/.test(e.innerText) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible')).map(e => (e.id || e.className) + ':' + (e.value || e.innerText).slice(0, 20));
      return { clipped: cl, payOk: f(document.getElementById('payOk')), back: f(document.getElementById('payBack')), total: f(document.getElementById('payTotal')) }; })()`);
    rec('27', W, 'prices not clipped (sale + payment)', !sale.length && !pay.clipped.length && pay.total, { sale, pay });
    const scr = await fr.evaluate(() => { const b = document.getElementById('payOk'); let e = b && b.parentElement; while (e && !(e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY))) e = e.parentElement; return !!e; });
    rec('27', W, 'Pay and Back on screen with the cash chips open', pay.payOk && pay.back, { ...pay, payInScrollArea: scr });
    await p.screenshot({ path: path.join(OUT, `27-receipt-preview-${F}-payment.png`) }); rec('27', W, 'no JS errors', !errs.length, errs); await ctx.close(); }
  // 17: scan box keeps its width when a recovery notice shows
  for (const [w, h] of [[1920, 1080], [1366, 768], [1024, 768]]) { const { ctx, p, fr, errs } = await open(b, '17', w, h);
    const before = await fr.evaluate(() => Math.round(document.getElementById('scanInput').getBoundingClientRect().width));
    await fr.evaluate(() => { S.notice = { kind: 'info', message: 'DEMO: an unfinished sale was restored after a restart. Check it, then carry on or clear it.' }; noticeBanner(); }); await p.waitForTimeout(400);
    const r = await fr.evaluate(`(() => { const s = document.getElementById('scanInput'), n = document.getElementById('noticeBar'); return { scanW: Math.round(s.getBoundingClientRect().width), notice: !!n && ${inWin}(n), scanIn: ${inWin}(s) }; })()`);
    rec('17', `${w}x${h}`, "scan box doesn't collapse with a notice", r.notice && r.scanIn && r.scanW >= 180, { before, ...r });
    await p.screenshot({ path: path.join(OUT, `17-editorial-${w}x${h}-notice.png`) }); rec('17', `${w}x${h}`, 'no JS errors', !errs.length, errs); await ctx.close(); }
  // 30: $5 and $10 cash chips visible (1366, 1024, 125% zoom)
  for (const [w, h, d] of [[1366, 768, 1], [1024, 768, 1], [1093, 614, 1.25]]) { const { ctx, p, fr, errs } = await open(b, '30', w, h, d); await openPay(fr, p);
    const r = await fr.evaluate(`(() => { const f = ${inWin}; const g = l => document.querySelector('.fullpay .quick button[data-l="' + l + '"]'); const vis = e => !!e && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && f(e);
      return { c5: vis(g('5')), c10: vis(g('10')), c20: vis(g('20')), payOk: f(document.getElementById('payOk')), back: f(document.getElementById('payBack')) }; })()`);
    const tag = `${w}x${h}${d !== 1 ? '@' + d : ''}`;
    rec('30', tag, '$5 and $10 cash chips visible', r.c5 && r.c10 && r.payOk && r.back, r);
    await p.screenshot({ path: path.join(OUT, `30-card-deck-${tag}-payment.png`) }); rec('30', tag, 'no JS errors', !errs.length, errs); await ctx.close(); }
  // every tested style at 125% zoom: sale (scan box, Pay, total, no sideways scroll) and payment (cash box, Pay, Back)
  for (const s of TESTED) { const { ctx, p, fr, errs } = await open(b, s.id, 1093, 614, 1.25, true);
    const sale = await fr.evaluate(`(() => { const f = ${inWin}; const pay = [...document.querySelectorAll('[data-a="checkout"],button,.tile')].some(e => (e.dataset.a === 'checkout' || /(^|\\s)(payment|pay)\\b/i.test((e.innerText || '').slice(0, 40))) && f(e)); return { scan: f(document.getElementById('scanInput')), pay, total: document.body.innerText.includes(S.totals.due.toFixed(2)), hOverflow: document.documentElement.scrollWidth > innerWidth + 2 }; })()`);
    await openPay(fr, p);
    const pay = await fr.evaluate(`(() => { const f = ${inWin}; const hid = id => getComputedStyle(document.getElementById(id)).display === 'none'; return { cashIn: f(document.getElementById('cashIn')), payOk: f(document.getElementById('payOk')), back: f(document.getElementById('payBack')), keyOnly: hid('payOk') && hid('payBack') }; })()`);
    // keyOnly: the style hides Back/Pay on purpose and finishes with Enter / goes back with Esc (37 Maroon Console); then the cash box must be on screen
    if (pay.keyOnly) { pay.payOk = pay.back = 'hidden by design (Enter / Esc)'; }
    // if Pay/Back start below the fold, can the cashier scroll the payment sheet to reach them?
    const reach = await fr.evaluate(`(() => { const f = ${inWin}; const o = {}; for (const id of ['payBack', 'payOk']) { const e = document.getElementById(id); if (e) e.scrollIntoView({ block: 'nearest' }); o[id] = f(e); } o.pageScrolled = scrollY > 0 || document.documentElement.scrollTop > 0; return o; })()`);
    rec(s.id, '1093x614@1.25 (app window)', '125% zoom: sale screen on screen', sale.scan && sale.pay && sale.total && !sale.hOverflow && !errs.length, { sale, errs });
    rec(s.id, '1093x614@1.25 (app window)', '125% zoom: payment Pay+Back on screen without scrolling', pay.cashIn && (pay.keyOnly || (pay.payOk && pay.back)), pay);
    rec(s.id, '1093x614@1.25 (app window)', '125% zoom: payment Pay+Back reachable by scrolling the sheet', pay.cashIn && (pay.keyOnly || (reach.payOk && reach.payBack)) && !reach.pageScrolled, { ...reach, keyOnly: pay.keyOnly });
    await p.screenshot({ path: path.join(OUT, `zoom125-${s.id}-${s.slug}-payment.png`) }); await ctx.close(); }
  fs.writeFileSync(path.join(__dirname, 'demo-fix-results.json'), JSON.stringify({ allOk, results }, null, 1));
  console.log(allOk ? 'ALL PASS' : 'SOME FAILED'); await b.close(); process.exit(allOk ? 0 : 1);
})();
