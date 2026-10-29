// Style 30 at 125% zoom with 12 items in the sale. Two ways: browser/display zoom (1366x768 screen at 125% =
// 1093x614 CSS px, deviceScaleFactor 1.25) and the app's own zoom (1366x768 with body.style.zoom = 1.25).
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = __dirname + '/../screenshots/zoom/';
(async () => { const port = fs.readFileSync(__dirname + '/port.txt', 'utf8').trim(); const b = await chromium.launch(); const report = [];
  for (const mode of ['browser', 'app']) {
    const vp = mode === 'browser' ? { width: 1093, height: 614 } : { width: 1366, height: 768 };
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1.25 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${port}/demo/register/index.html?style=30&bare=1`); await p.evaluate(() => localStorage.removeItem('demoStore.register.v1'));
    await p.reload(); await p.waitForTimeout(900);
    if (mode === 'app') { await p.evaluate(() => { document.body.style.zoom = '1.25'; window.dispatchEvent(new Event('resize')); }); await p.waitForTimeout(500); }
    for (const c of ['1001','1002','1003','1004','1005','1006','2001','2002','2003','2004','2005','2006']) await p.evaluate(c => act('scan', { code: c }), c), await p.waitForTimeout(120);
    await p.waitForTimeout(600);
    const m = await p.evaluate(() => {
      const R = e => e && e.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      const ov = (a, b) => a && b && a.width && b.width && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const title = R(document.querySelector('.cd-title')), pills = [R(document.querySelector('.bottom > div:first-child')), R(document.querySelector('#qsPanel'))];
      const titleVisible = !!title && title.width > 0 && getComputedStyle(document.querySelector('.cd-title')).display !== 'none';
      const cs = getComputedStyle(document.documentElement), z = parseFloat(document.body.style.zoom || 1);
      const L = parseFloat(cs.getPropertyValue('--cd-L')) || 0, Rw = parseFloat(cs.getPropertyValue('--cd-R')) || 0;
      // the side panels: the ticket column (left) and the ticket/store column (right); find them from the card positions
      const cards = [...document.querySelectorAll('#bulkBtns > .rbtn')].map(R).filter(r => r.width);
      const lines = document.querySelector('#lines') || document.querySelector('#cart'), side = document.querySelector('#actions');
      const leftEdge = lines ? R(lines).right : L * z, rightEdge = side ? R(side).left : W - Rw * z;
      const cardsOverLeft = cards.filter(r => r.left < leftEdge - 1).length, cardsOverRight = cards.filter(r => r.right > rightEdge + 1).length;
      const clipped = [...document.querySelectorAll('#actions *, .status *')].filter(e => { const r = R(e); return r.width && e.children.length === 0 && (r.right > W + 1 || r.bottom > H + 1 || (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible')); })
        .map(e => (e.id ? '#' + e.id : e.className || e.tagName) + ' "' + (e.textContent || '').trim().slice(0, 30) + '"');
      return { css: W + 'x' + H, zoom: z, lines: document.querySelectorAll('#lines .line, #lines [data-i], #lines tr').length, title: titleVisible ? 'visible' : 'hidden',
        titleOverlapsPills: titleVisible && pills.some(p => ov(title, p)), cards: cards.length, leftEdge: Math.round(leftEdge), rightEdge: Math.round(rightEdge), cardsOverLeft, cardsOverRight,
        pageOverflowX: document.documentElement.scrollWidth > W, clipped: clipped.slice(0, 12) };
    });
    const shot = OUT + `30-card-deck-1366at125pct-${mode}-zoom-12items.png`; await p.screenshot({ path: shot });
    report.push({ mode, ...m, errors: errs, shot }); await p.close();
  }
  fs.writeFileSync(__dirname + '/zoom-30.json', JSON.stringify(report, null, 1)); console.log(JSON.stringify(report, null, 1)); await b.close(); })();
