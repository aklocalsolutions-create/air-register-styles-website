// DEMO STORE receipt (on screen only, nothing prints). window.DEMO_RENDER_RECEIPT(receipt, hostElement)
'use strict';
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const m = n => '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  const css = `.demoRcOv{position:fixed;inset:0;z-index:2147483100;background:rgba(15,18,30,.55);display:flex;align-items:center;justify-content:center;font-family:'Courier New',ui-monospace,monospace}
  .demoRc{position:relative;width:340px;max-height:86vh;overflow:auto;background:#fffefa;color:#1b1b1b;padding:22px 22px 30px;box-shadow:0 18px 50px rgba(0,0,0,.45);
    -webkit-mask:radial-gradient(circle 6px at 50% 100%,#0000 98%,#000) 0 0/16px 100% repeat-x;mask:linear-gradient(#000 0 0)}
  .demoRc h3{margin:0;text-align:center;font-size:20px;letter-spacing:.08em}.demoRc .c{text-align:center;font-size:12px;color:#555}
  .demoRc .stamp{margin:10px auto;text-align:center;border:2px dashed #c92a2a;color:#c92a2a;font-weight:700;padding:5px;font-size:12px;transform:rotate(-2deg)}
  .demoRc .r{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin:3px 0}.demoRc .r span:first-child{flex:1}
  .demoRc .it{display:grid;grid-template-columns:22px 1fr auto;gap:6px;align-items:center;font-size:13px;margin:5px 0}.demoRc .it img{width:20px;height:20px}
  .demoRc .it small{display:block;color:#666}.demoRc hr{border:0;border-top:1px dashed #999;margin:10px 0}.demoRc .tot{font-weight:700;font-size:16px}
  .demoRc .x{position:absolute;top:8px;right:10px;border:0;background:#eee;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:16px}
  .demoRc .bar{height:34px;margin-top:12px;background:repeating-linear-gradient(90deg,#222 0 2px,#fff 2px 4px,#222 4px 5px,#fff 5px 8px)}`;
  window.DEMO_RENDER_RECEIPT = (rec, host) => {
    host = host || document.body;
    if (!document.getElementById('demoRcCss')) { const st = document.createElement('style'); st.id = 'demoRcCss'; st.textContent = css; document.head.appendChild(st); }
    const old = document.getElementById('demoRcOv'); if (old) old.remove();
    const ov = document.createElement('div'); ov.id = 'demoRcOv'; ov.className = 'demoRcOv';
    const icon = n => (window.DEMO_PRODUCTS || []).find(p => p.name === n);
    const base = window.DEMO_ICON_BASE || '../assets/icons/';
    ov.innerHTML = rec ? `<div class="demoRc" id="demoReceipt" role="dialog" aria-label="Demo receipt"><button class="x" id="demoRcClose" title="Close">×</button>
      <h3>DEMO STORE</h3><div class="c">123 Example Street · Sampletown</div><div class="c">${esc(new Date(rec.at).toLocaleString('en-US'))}</div><div class="c">Receipt ${esc(rec.number)}</div>
      <div class="stamp">DEMO RECEIPT - NOT A REAL SALE</div>
      ${rec.lines.map(l => { const p = l.icon ? { icon: l.icon } : icon(l.name); return `<div class="it">${p ? `<img alt="" src="${base}demo-${p.icon}.svg">` : '<span></span>'}<span>${esc(l.name)}<small>${l.quantity} × ${m(l.price)}${l.discountAmount ? ' · −' + m(l.discountAmount) : ''}</small></span><b>${m(l.total)}</b></div>`; }).join('')}
      <hr><div class="r"><span>Subtotal</span><span>${m(rec.subtotal)}</span></div>${rec.discount ? `<div class="r"><span>Discount</span><span>−${m(rec.discount)}</span></div>` : ''}
      <div class="r"><span>${rec.taxExempt ? 'Tax (off)' : 'Tax (8% demo)'}</span><span>${m(rec.tax)}</span></div><div class="r tot"><span>TOTAL</span><span id="rcTotal">${m(rec.total)}</span></div><hr>
      ${rec.tenders.map(t => `<div class="r"><span>${esc(t.name)}</span><span>${m(t.receiveAmount > t.amount ? t.receiveAmount : t.amount)}</span></div>`).join('')}
      <div class="r tot"><span>Change</span><span id="rcChange">${m(rec.change)}</span></div><hr><div class="c">Thank you for trying the demo!</div><div class="bar"></div><div class="c">Pretend store · fake items · no money moved</div></div>`
      : `<div class="demoRc" id="demoReceipt"><button class="x" id="demoRcClose">×</button><h3>DEMO STORE</h3><p class="c">No sale yet. Ring up a sale and pay to see its receipt.</p></div>`;
    host.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    ov.querySelector('#demoRcClose').onclick = close;
    return ov;
  };
})();
