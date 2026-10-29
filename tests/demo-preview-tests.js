// Demo Store checks for the gallery and the 'preview' style pages (design mockup + pictures, no register):
// gallery card counts, each preview page at 4 window sizes: DEMO band, "DEMO -" title, preview label, disabled download,
// mockup loads and switches screens, pictures load, no JS errors, no request outside this site.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const port = fs.readFileSync(path.join(__dirname, 'demo-port.txt'), 'utf8').trim(), BASE = `http://127.0.0.1:${port}/demo/`;
const window = {}; eval(fs.readFileSync(path.join(__dirname, '..', 'demo/demo-styles-config.js'), 'utf8')); const STYLES = window.DEMO_STYLES;
const SIZES = [[1920, 1080], [1366, 768], [1024, 768], [390, 844]];
const SHOTDIR = process.env.SHOTDIR || path.join(__dirname, '..', 'screenshots', 'new-styles');
(async () => {
  fs.mkdirSync(SHOTDIR, { recursive: true });
  const b = await chromium.launch(); const results = []; let fails = 0;
  const check = (r, name, ok, info = '') => { r.steps.push({ name, ok: !!ok, info }); if (!ok) { fails++; console.log(`  FAIL ${r.page} ${r.size} ${name} ${info}`); } };
  for (const [w, h] of SIZES) {
    const pages = [['gallery', 'index.html']].concat(STYLES.filter(s => s.stage === 'preview' || s.preview).map(s => [s.id, `demo-style.html?style=${s.id}`]));
    for (const [id, url] of pages) {
      const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
      const errs = [], ext = [], bad = []; const r = { page: id, size: `${w}x${h}`, steps: [] };
      p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      p.on('request', q => { const u = q.url(); if (!u.startsWith(`http://127.0.0.1:${port}/`) && !/^(data|blob|about):/.test(u)) ext.push(u); });
      p.on('response', q => { if (q.status() >= 400) bad.push(q.status() + ' ' + q.url()); });
      await p.goto(BASE + url); await p.waitForTimeout(900);
      check(r, 'DEMO band visible', await p.locator('#demoBand').isVisible());
      check(r, 'title starts "DEMO -"', (await p.title()).startsWith('DEMO -'), await p.title());
      if (id === 'gallery') {
        const tested = await p.locator('.card [data-stage=tested]').count(), prev = await p.locator('.card [data-stage=preview]').count(), all = await p.locator('.card').count();
        check(r, '19 cards, all tested (none left in preview)', tested === 19 && prev === 0 && all === 19, `${tested}+${prev}=${all}`);
        const ids = await p.$$eval('.card', a => a.map(x => x.dataset.style).join(','));
        check(r, 'no style 31 or 34', !/\b(31|34)\b/.test(ids), ids);
        check(r, 'new styles 32-37 show the Tested badge', (await p.$$eval('.card', a => a.filter(x => ['32','33','35','36','37'].includes(x.dataset.style) && /Tested/.test(x.innerText)).length)) === 5);
        const sw = await p.locator('#easySwitch').boundingBox(), band = await p.locator('#demoBand').boundingBox();
        check(r, '"Easy to switch" shown below the DEMO band', sw && band && sw.y >= band.y + band.height - 1 && sw.x >= 0 && sw.x + sw.width <= w + 1 && (await p.locator('#easySwitch').innerText()).includes('Easy to switch') && (await p.locator('#easySwitch').innerText()).includes('not yet in a released version') && !/screens and keys/.test(await p.locator('#easySwitch').innerText()), JSON.stringify(sw));
        await p.locator('#easySwitch').screenshot({ path: path.join(SHOTDIR, `demo-gallery-easy-to-switch-${w}x${h}.png`) });
        check(r, '19 disabled download placeholders', await p.locator('.card button.dl[disabled]').count() === 19);
        const thumbs = await p.$$eval('.card .thumb img', a => a.filter(i => i.complete && i.naturalWidth > 0).length);
        check(r, 'all 19 thumbnails load', thumbs === 19, String(thumbs));
        await p.screenshot({ path: path.join(SHOTDIR, `demo-gallery-${w}x${h}.png`), fullPage: true });
      } else if (STYLES.find(x => x.id === id).stage === 'tested') {
        // tested style that began as a preview: live register + its design pictures behind the "Design pictures" button
        const s = STYLES.find(x => x.id === id);
        const nm = await p.locator('#sname').innerText();
        check(r, 'name + Tested label', nm.includes(`Style ${id}`) && nm.includes(s.name) && nm.includes('Tested'), nm);
        check(r, 'live register on page', await p.locator('#reg').count() === 1 && !!p.frame({ url: /register\/index\.html/ }));
        check(r, 'download disabled placeholder', await p.locator('#dlSlot button.dl[disabled]').count() === 1);
        await p.locator('#shotsBtn').click(); await p.waitForTimeout(300);
        const imgs = await p.$$eval('#dsBox .pvGrid img', a => { a.forEach(i => i.loading = 'eager'); return a.length; }); await p.waitForTimeout(700);
        const ok = await p.$$eval('#dsBox .pvGrid img', a => a.filter(i => i.complete && i.naturalWidth === 1366).length);
        check(r, `design pictures load (${s.preview.shots.length})`, imgs === s.preview.shots.length && ok === imgs, `${ok}/${imgs}`);
        await p.screenshot({ path: path.join(SHOTDIR, `demo-style-${id}-${s.slug}-pictures-${w}x${h}.png`) });
        await p.keyboard.press('Escape'); await p.waitForTimeout(200);
        check(r, 'pictures close with Esc', await p.locator('#dsBox').count() === 0);
      } else {
        const s = STYLES.find(x => x.id === id);
        const nm = await p.locator('#sname').innerText();
        check(r, 'name + preview label', nm.includes(`Style ${id}`) && nm.includes(s.name) && nm.includes('Preview - coming soon to Air Register'), nm);
        check(r, 'preview note shown', (await p.locator('#pvNote').innerText()).includes('Preview - coming soon to Air Register'));
        check(r, 'no register on page', await p.locator('#reg').count() === 0 && !(await p.locator('#vReg').isVisible()));
        check(r, 'download disabled placeholder', await p.locator('#dlSlot button.dl[disabled]').count() === 1);
        const mk = p.frame({ url: /previews\/demo-style-/ }); const mt = mk ? await mk.evaluate(() => document.body.innerText) : '';
        check(r, 'mockup loads with DEMO ribbon', mk && mt.length > 200 && mt.includes('Preview - coming soon to Air Register'));
        const mt0 = mk ? await mk.title() : ''; check(r, 'mockup title starts "DEMO -"', mt0.startsWith('DEMO -'), mt0);
        const fb = await p.locator('#pvFrame').boundingBox(); check(r, 'mockup fits the window width', fb && fb.x >= 0 && fb.x + fb.width <= w + 1, JSON.stringify(fb));
        const btns = await p.locator('.pvBar [data-screen]').all(); let sw = true;
        for (const bt of btns) { const scr = await bt.getAttribute('data-screen'); await bt.click(); await p.waitForTimeout(250);
          const f = p.frame({ url: /previews\/demo-style-/ }); const ds = f ? await f.evaluate(() => document.body.dataset.screen) : ''; if (ds !== scr) sw = false; }
        check(r, `screen buttons switch (${btns.length})`, btns.length === s.preview.shots.length && sw);
        await btns[0].click(); await p.waitForTimeout(250);
        const imgs = await p.$$eval('.pvGrid img', a => { a.forEach(i => i.loading = 'eager'); return a.length; }); await p.waitForTimeout(600);
        const ok = await p.$$eval('.pvGrid img', a => a.filter(i => i.complete && i.naturalWidth === 1366).length);
        check(r, `pictures load (${s.preview.shots.length})`, imgs === s.preview.shots.length && ok === imgs, `${ok}/${imgs}`);
        await p.screenshot({ path: path.join(SHOTDIR, `demo-style-${id}-${s.slug}-${w}x${h}.png`), fullPage: true });
      }
      const pw = await p.evaluate(() => document.documentElement.scrollWidth); check(r, 'no sideways scroll', pw <= w + 1, String(pw));
      check(r, 'no JS errors', errs.length === 0, errs.join(' | ')); check(r, 'no outside requests', ext.length === 0, ext.join(' ')); check(r, 'no missing files', bad.length === 0, bad.join(' '));
      results.push({ ...r, pass: r.steps.every(x => x.ok), passed: r.steps.filter(x => x.ok).length, total: r.steps.length });
      console.log(`${r.page.padEnd(7)} ${r.size.padEnd(9)} ${r.steps.filter(x => x.ok).length}/${r.steps.length}`);
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(__dirname, 'demo-preview-results.json'), JSON.stringify(results, null, 1));
  console.log(fails ? `FAILED ${fails}` : `ALL PASS (${results.length} pages)`); await b.close(); process.exit(fails ? 1 : 0);
})();
