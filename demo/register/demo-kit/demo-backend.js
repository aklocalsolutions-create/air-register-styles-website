// DEMO STORE - in-browser pretend register. NOTHING IS REAL.
// Replaces every /api/* call of the register screens with a fake, local model: made-up products, fake tax,
// pretend cash and a pretend card that always says "Approved - demo". No network call ever leaves this page,
// no account, no login, no payment. State lives in this browser's localStorage only (key below).
'use strict';
(() => {
  const KEY = 'demoStore.register.v1';
  const TAX = 8; // pretend sales tax %
  const STORE = 'Demo Store';
  const ICON = n => '../assets/icons/' + n + '.svg';
  // Made-up demo products (fake names, fake prices). code = what you type in the scan box.
  const PRODUCTS = [
    { number: '1001', upc: '000000100017', name: 'Demo Item A - Toy Robot', label: 'Toy Robot', price: 24.99, icon: 'robot' },
    { number: '1002', upc: '000000100024', name: 'Demo Item B - Building Blocks', label: 'Blocks', price: 18.50, icon: 'blocks' },
    { number: '1003', upc: '000000100031', name: 'Demo Item C - Plush Bear', label: 'Plush Bear', price: 12.00, icon: 'bear' },
    { number: '1004', upc: '000000100048', name: 'Demo Item D - Puzzle 500 pc', label: 'Puzzle', price: 9.75, icon: 'puzzle' },
    { number: '1005', upc: '000000100055', name: 'Demo Item E - Kite', label: 'Kite', price: 15.25, icon: 'kite' },
    { number: '1006', upc: '000000100062', name: 'Demo Item F - Bouncy Ball', label: 'Ball', price: 3.50, icon: 'ball' },
    { number: '2001', upc: '000000200014', name: 'Demo Item G - Coffee Mug', label: 'Mug', price: 7.99, icon: 'mug' },
    { number: '2002', upc: '000000200021', name: 'Demo Item H - Dish Soap', label: 'Dish Soap', price: 3.29, icon: 'soap' },
    { number: '2003', upc: '000000200038', name: 'Demo Item I - Paper Towels 2pk', label: 'Towels', price: 5.49, icon: 'towels' },
    { number: '2004', upc: '000000200045', name: 'Demo Item J - Light Bulbs 4pk', label: 'Bulbs', price: 8.99, icon: 'bulb' },
    { number: '2005', upc: '000000200052', name: 'Demo Item K - Batteries AA 8pk', label: 'Batteries', price: 6.75, icon: 'battery' },
    { number: '2006', upc: '000000200069', name: 'Demo Item L - Scented Candle', label: 'Candle', price: 11.00, icon: 'candle' },
  ];
  window.DEMO_PRODUCTS = PRODUCTS; window.DEMO_ICON = ICON;
  const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const m$ = n => '$' + r2(n).toFixed(2);
  const fresh = () => ({ cart: [], seq: 0, order: { method: 10, pct: 0, amount: 0, taxExempt: false }, pay: null, completed: null, completedAt: 0, lastReceipt: null, orderNo: 1000, lastOrderId: null, note: '', settings: {} });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return fresh(); } };
  let M = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch {} };
  const ok = (message, x = {}) => ({ ok: true, message, ...x });
  const no = (message, x = {}) => ({ ok: false, message, ...x });
  window.DEMO_RESET = () => { M = fresh(); save(); };

  // ---------- math ----------
  function lineCalc(l) { const gross = r2(l.price * l.qty); const disc = r2(gross * (l.discPct || 0) / 100); return { gross, disc, net: r2(gross - disc) }; }
  function totals() {
    if (!M.cart.length) return { itemAmount: 0, orderAmount: 0, tax: 0, discountAmount: 0, discountRate: 0, promotionDiscount: 0, pointDiscount: 0, due: 0, quantity: 0, original: 0, orderPct: 0, lineTax: 0 };
    let item = 0, orig = 0, ldisc = 0, ltax = 0, qty = 0;
    M.cart.forEach(l => { const c = lineCalc(l); item += c.net; orig += c.gross; ldisc += c.disc; qty += l.qty; if (!M.order.taxExempt) ltax += r2(c.net * TAX / 100); });
    item = r2(item);
    const od = M.order.method === 20 ? Math.min(M.order.amount, item) : r2(M.order.pct / 100 * item);
    const pct = item > 0 ? od / item * 100 : 0;
    const orderAmount = item - od, tax = ltax * (1 - pct / 100);
    return { itemAmount: item, orderAmount, tax, discountAmount: r2(ldisc + od), discountRate: orig ? r2((ldisc + od) / orig * 100) : 0, promotionDiscount: 0, pointDiscount: 0,
      due: r2(r2(orderAmount) + r2(tax)), quantity: qty, original: r2(orig), orderPct: pct, orderDisc: r2(od) };
  }
  const paidOf = () => M.pay ? r2(M.pay.tenders.filter(t => t.status === 'done').reduce((a, t) => a + t.amount, 0)) : 0;
  const remaining = () => Math.max(0, r2(totals().due - paidOf()));
  const lines = () => M.cart.map(l => { const c = lineCalc(l); return { number: l.number, upc: l.upc, name: l.name, type: 0, quantity: l.qty, unitName: '', price: l.price, discount: r2(l.discPct || 0), discountAmount: c.disc, custom: !!l.custom, taxRate: M.order.taxExempt ? 0 : TAX, total: c.net, icon: l.icon }; });

  // ---------- pretend card terminal (time based, so it moves on with every poll) ----------
  function tick() {
    const c = M.pay && M.pay.card; if (!c) return;
    const age = Date.now() - c.started; c.seconds = Math.floor(age / 1000);
    if (c.status === 'waiting' && age > 1200) { c.status = 'approved'; c.message = 'Approved - demo'; c.subMessage = 'Pretend card. No money moved.'; }
    if (c.status === 'approved' && age > 2600) {
      const t = M.pay.tenders.find(x => x.status === 'waiting'); if (t) { t.status = 'done'; t.name = 'Card (approved - demo)'; }
      M.pay.card = null;
      if (remaining() <= 0.004) { const res = finish(); M.pay = null; M.completed.result = res; }
    }
    save();
  }
  function finish() {
    const t = totals(), tenders = M.pay.tenders.filter(x => x.status === 'done');
    const change = r2(tenders.reduce((a, x) => a + (x.giveAmount || 0), 0));
    const orderId = 'DEMO-' + (++M.orderNo);
    const rec = { orderId, number: orderId, at: new Date().toISOString(), store: STORE, lines: lines(), subtotal: r2(t.original), discount: t.discountAmount, itemAmount: t.itemAmount, tax: r2(t.tax), taxExempt: M.order.taxExempt, total: t.due,
      tenders: tenders.map(x => ({ name: x.name, amount: x.amount, receiveAmount: x.receiveAmount || x.amount })), change };
    M.lastReceipt = rec; M.lastOrderId = orderId;
    const res = { ok: true, completed: true, message: 'Sale complete. Change ' + m$(change), orderId, due: t.due, change, tenders: rec.tenders, drawer: null, print: null, giftCards: [] };
    M.completed = { orderId, due: t.due, change, tenders: rec.tenders, tendered: r2(tenders.reduce((a, x) => a + (x.receiveAmount || x.amount), 0)), result: null };
    M.completedAt = Date.now();
    M.cart = []; M.order = fresh().order; M.note = '';
    return res;
  }

  // ---------- state shapes (same fields the real register screens read) ----------
  function state() {
    tick();
    const t = totals(), p = M.pay;
    return {
      ok: true, mode: 'sale', loggedIn: true, build: 'demo', version: 'demo', update: {}, blocked: false,
      user: { company: STORE, shop: 'Demo Shop 1', user: 'Demo Cashier', manager: true },
      session: { number: 'DEMO', expectedAmount: 0 }, hw: { via: '', message: 'Demo mode: no printer or drawer', builtin: false }, device: 'demo',
      order: { id: 'demo', resuming: false, number: 'DEMO-' + (M.orderNo + 1), orderDiscount: M.order.method === 20 ? r2(t.orderPct || 0) : M.order.pct, orderDiscountMethod: M.order.method, orderDiscountAmount: M.order.method === 20 ? M.order.amount : r2(t.orderDisc || 0), discountConfigSubId: null, promotionalCode: '', taxExempt: M.order.taxExempt },
      cart: lines(), member: null, discounts: [], extraCharges: [],
      pay: p ? { stockWarning: '', needManager: false, lastError: '', paid: paidOf(), remaining: remaining(), tenders: p.tenders, card: p.card ? { ...p.card } : null, result: null } : null,
      totals: t, completed: M.completed, lastOrderId: M.lastOrderId, lastReturnId: null, ret: null, mix: null,
      settings: { style: window.DEMO_STYLE || '00', bulkItems: PRODUCTS.map(x => ({ code: x.number, label: x.label, name: x.name, askPrice: false })), drawerAutoOpen: false, touchKeyboard: false, exitPinEnabled: false, ...M.settings, style: window.DEMO_STYLE || '00' },
      keyed: { enabled: false, test: false }, note: M.note, asideCount: 0, station: { name: 'Demo Register 1', device: 'demo' }, online: true, notice: null, recoveryPending: false, cardRefunds: [], currency: '$', demo: true,
    };
  }
  function customerState() {
    tick();
    const t = totals(), base = { shop: STORE, currency: '$', style: window.DEMO_STYLE || '00' };
    if (M.completed && Date.now() - M.completedAt < 120000 && !M.cart.length) return { ...base, view: 'done', lines: [], totals: {}, pay: { total: M.completed.due, paid: M.completed.tendered, change: M.completed.change } };
    if (!M.cart.length) return { ...base, view: 'idle', lines: [], totals: {} };
    const ls = lines().slice().reverse().map(l => ({ name: l.name, quantity: l.quantity, price: l.price, discount: l.discountAmount, total: l.total }));
    const paid = paidOf(), cashGive = M.pay ? M.pay.tenders.reduce((a, x) => a + (x.giveAmount || 0), 0) : 0;
    return { ...base, view: M.pay ? 'pay' : 'sale', lines: ls, totals: { subtotal: r2(t.original), discount: t.discountAmount, tax: r2(t.tax), taxOff: M.order.taxExempt, total: t.due },
      pay: M.pay ? { paid, due: remaining(), change: r2(cashGive) } : null };
  }

  // ---------- actions ----------
  const find = code => { code = String(code || '').trim().toLowerCase(); return PRODUCTS.find(p => p.number === code || p.upc === code || p.name.toLowerCase() === code); };
  const lineAt = row => M.cart[Number(row) || 0];
  const guard = () => (M.pay ? no('Finish or go back from the payment first') : null);
  function add(p, qty = 1) {
    const ex = M.cart.find(l => l.number === p.number && !l.custom);
    if (ex) { ex.qty += qty; M.cart.splice(M.cart.indexOf(ex), 1); M.cart.unshift(ex); }
    else M.cart.unshift({ key: ++M.seq, number: p.number, upc: p.upc, name: p.name, price: p.price, qty, discPct: 0, custom: false, icon: p.icon });
    M.completed = null; return ok('Added ' + p.name);
  }
  const H = {
    state: () => state(),
    'customer-state': () => customerState(),
    shortcuts: () => (window.DEMO_SHORTCUTS || { keys: [] }),
    scan: b => { const g = guard(); if (g) return g; const p = find(b.code); return p ? add(p) : no('Not found (demo codes are 1001-1006 and 2001-2006)'); },
    'bulk-add': b => { const g = guard(); if (g) return g; const p = PRODUCTS[Number(b.index)]; return p ? add(p) : no('Empty button'); },
    search: b => { const q = String(b.keyword || '').toLowerCase(); return { ok: true, rows: PRODUCTS.filter(p => !q || (p.name + ' ' + p.number + ' ' + p.upc).toLowerCase().includes(q)).map(p => ({ id: p.number, number: p.number, upc: p.upc, name: p.name, price: p.price, stock: 99 })) }; },
    qty: b => { const g = guard(); if (g) return g; const l = lineAt(b.row); if (!l) return no('No line selected'); const q = Number(b.qty); if (!(q > 0 && q <= 9999)) return no('Quantity must be 1-9999'); l.qty = q; return ok(`${l.name}: quantity ${q}`); },
    'qty-plus': b => { const g = guard(); if (g) return g; const l = lineAt(b.row); if (!l) return no('No line selected'); l.qty += 1; return ok(`${l.name}: ${l.qty}`); },
    'qty-minus': b => { const g = guard(); if (g) return g; const l = lineAt(b.row); if (!l) return no('No line selected'); if (l.qty <= 1) return no('Quantity is already 1. Use Remove Line to take it off.'); l.qty -= 1; return ok(`${l.name}: ${l.qty}`); },
    remove: b => { const g = guard(); if (g) return g; const l = lineAt(b.row); if (!l) return no('No line selected'); M.cart.splice(M.cart.indexOf(l), 1); if (!M.cart.length) M.order = fresh().order; return ok('Removed ' + l.name); },
    'line-discount': b => { const g = guard(); if (g) return g; const l = lineAt(b.row); if (!l) return no('No line selected'); const amt = lineCalc({ ...l, discPct: 0 }).gross, v = Number(b.value) || 0;
      if (b.kind === 'clear') { l.discPct = 0; l.custom = false; return ok(l.name + ': line discount cleared'); }
      if (b.kind === 'amount') { if (v < 0 || v > amt) return no('Discount must be between $0 and ' + m$(amt)); l.discPct = amt ? v / amt * 100 : 0; } else { if (v < 0 || v > 100) return no('Percent must be 0-100'); l.discPct = v; }
      l.custom = true; return ok(`${l.name}: ${m$(lineCalc(l).disc)} off`); },
    'line-tax': () => no('Demo tax is a fixed ' + TAX + '%. Use Tax Off (F5) to remove it.'),
    discount: b => { const g = guard(); if (g) return g; if (!M.cart.length) return no('The order is empty'); const v = Number(b.value) || 0, item = totals().itemAmount;
      if (b.kind === 'amount') { if (v < 0 || v > item) return no(`The discount can't be more than the items (${m$(item)})`); M.order.method = 20; M.order.amount = v; M.order.pct = 0; }
      else if (b.kind === 'percent') { if (v < 0 || v > 100) return no('Percent must be 0-100'); M.order.method = 10; M.order.pct = v; M.order.amount = 0; }
      else { M.order.method = 10; M.order.pct = 0; M.order.amount = 0; }
      return ok(b.kind === 'clear' ? 'Order discount cleared' : 'Order discount set'); },
    'tax-exempt': () => { if (!M.cart.length) return no('Scan items first'); M.order.taxExempt = !M.order.taxExempt; return ok(M.order.taxExempt ? 'Tax Off for this sale' : 'Tax back on'); },
    'new-sale': () => { if (M.pay) return no('Finish or go back from the payment first'); M.cart = []; M.order = fresh().order; M.completed = null; return ok('New sale'); },
    'pay-start': () => { if (!M.cart.length) return no('The order is empty — scan items first'); if (!M.pay) M.pay = { tenders: [], card: null }; return ok('Payment'); },
    'pay-close': () => { if (!M.pay) return ok(''); if (M.pay.card) return no('A card payment is running. Cancel it first.'); if (M.pay.tenders.length) return no('Part of this sale is paid. Finish the payment.'); M.pay = null; return ok('Back to the sale'); },
    'pay-tender': b => {
      if (!M.pay) return no('No payment open'); if (M.pay.card) return no('Wait for the card');
      const rem = remaining(), type = Number(b.type);
      if (type === 10) { const tend = r2(Number(b.tendered) || 0); if (!(tend > 0)) return no('Type the cash amount'); const amount = Math.min(tend, rem);
        M.pay.tenders.push({ name: 'Cash', type: 10, amount: r2(amount), receiveAmount: tend, giveAmount: r2(tend - amount), status: 'done' }); }
      else if (type === 20) { const amount = r2(Number(b.amount) || 0); if (!(amount > 0) || amount > rem + 0.004) return no('Card amount must be up to ' + m$(rem));
        M.pay.tenders.push({ name: 'Card (demo)', type: 20, amount, receiveAmount: amount, giveAmount: 0, status: 'waiting' });
        M.pay.card = { kind: 'terminal', status: 'waiting', amount, message: 'Demo card reader: tap the pretend card…', subMessage: 'Nothing is charged. This always approves.', seconds: 0, slow: false, started: Date.now() };
        save(); return ok('Waiting for the pretend card', { waiting: true }); }
      else if (type === 50) { const amount = r2(Number(b.amount) || 0); if (!(amount > 0) || amount > rem + 0.004) return no('Check amount must be up to ' + m$(rem)); M.pay.tenders.push({ name: 'Check (demo) #' + String(b.checkNumber || '').slice(0, 12), type: 50, amount, receiveAmount: amount, giveAmount: 0, status: 'done' }); }
      else return no('Gift cards are not part of the demo. Use Cash or Credit Card.');
      if (remaining() <= 0.004) { const res = finish(); M.pay = null; return res; }
      return ok('Paid. ' + m$(remaining()) + ' left', { remaining: remaining() });
    },
    'finish-sale': () => { if (!M.pay) return no('No payment open'); if (remaining() > 0.004) return no(m$(remaining()) + ' still due'); const res = finish(); M.pay = null; return res; },
    'card-cancel': () => { if (M.pay && M.pay.card) { M.pay.tenders = M.pay.tenders.filter(t => t.status !== 'waiting'); M.pay.card = null; } return ok('Card cancelled'); },
    'card-retry': () => no('The demo card never declines'),
    dismiss: () => { M.completed = null; M.completedAt = 0; return ok(''); },
    print: () => { setTimeout(() => window.DEMO_SHOW_RECEIPT && window.DEMO_SHOW_RECEIPT(), 0); return ok('Demo receipt shown on screen (nothing printed)'); },
    'drawer-sale': () => ok('Demo: there is no cash drawer'), drawer: () => ok('Demo: there is no cash drawer'),
    hardware: () => ok('Demo mode: no printer or drawer'),
    settings: b => { if (b && b.style) { /* style is picked from the gallery; ignore */ } return ok('Saved for this demo only'); },
    'client-error': () => ok(''),
    held: () => ({ ok: true, rows: [] }), 'order-list': () => ({ ok: true, rows: [] }), printers: () => ({ ok: true, printers: [], details: [], message: 'Demo mode: no printers' }),
    'member-find': () => ({ ok: true, rows: [] }), 'drawer-balance': () => ({ ok: true, balance: 0 }), 'drawer-log': () => ({ ok: true, rows: [] }),
  };
  async function handle(name, body) {
    const f = H[name]; let r;
    try { r = f ? f(body || {}) : no('Not available in the demo'); } catch (e) { r = no('Demo error: ' + e.message); }
    if (name !== 'state' && name !== 'customer-state' && name !== 'shortcuts') save();
    if (r && typeof r === 'object' && !('loggedIn' in r)) r.loggedIn = true;
    return r;
  }
  window.DEMO_RECEIPT = () => M.lastReceipt;
  window.DEMO_MODEL = () => M;
  // Re-read the model when another tab (the customer screen or the register) changes it.
  window.addEventListener('storage', e => { if (e.key === KEY) M = load(); });
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const m = /\/api\/([a-z0-9-]+)/i.exec(url);
    if (!m) { if (/^https?:/i.test(url) && !url.startsWith(location.origin)) throw new TypeError('Demo mode: outside network calls are blocked'); return realFetch(input, init); }
    if (document.hidden || /customer/.test(location.pathname)) M = load();
    let body = {}; try { body = init && init.body ? JSON.parse(init.body) : {}; } catch {}
    const r = await handle(m[1], body);
    return new Response(JSON.stringify(r), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
})();
