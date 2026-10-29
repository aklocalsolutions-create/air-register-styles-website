window.D = {
  store: 'Demo Store', cashier: 'cashier1', session: '0042', ticket: '1042', ver: 'v1.2.0', taxRate: 'Tax 8.875%',
  cust: { name: 'Rivka Feldman', tag: 'Demo customer', phone: '(718) 555-0142', acct: 36.20, pts: 412, limit: 500 },
  lines: [
    { e: '🍞', n: 'Challah, Large Plain', d: 'Bakery · each', q: 1, p: 6.99, t: 6.99, dep: 'Bakery' },
    { e: '🥛', n: 'Milk 2% Half Gallon', d: 'Dairy · Chalav Yisrael', q: 2, p: 4.29, t: 8.58, dep: 'Dairy' },
    { e: '🍅', n: 'Tomatoes on the Vine', d: '1.36 lb @ $2.99/lb', q: 1, w: '1.36 lb', p: 2.99, t: 4.07, dep: 'Produce' },
    { e: '🐟', n: 'Gefilte Fish Loaf', d: 'Frozen · 22 oz', q: 1, p: 7.49, t: 7.49, dep: 'Frozen' },
    { e: '🍇', n: 'Concord Grape Juice', d: 'Grocery · 64 oz', q: 1, p: 5.99, t: 5.99, dep: 'Grocery' },
    { e: '🥐', n: 'Chocolate Rugelach', d: 'Bakery · 12 oz', q: 1, p: 6.49, t: 6.49, dep: 'Bakery' },
    { e: '🥒', n: 'Kirby Cucumbers', d: '2.10 lb @ $1.79/lb', q: 1, w: '2.10 lb', p: 1.79, t: 3.76, dep: 'Produce' },
    { e: '🥚', n: 'Large Eggs, Dozen', d: 'Dairy · grade A', q: 1, p: 3.99, t: 3.99, dep: 'Dairy' },
    { e: '🧻', n: 'Paper Towels 6 Roll', d: 'Household · taxable', q: 1, p: 4.99, t: 4.99, dep: 'Household', tx: 1 },
  ],
  sub: 52.35, disc: 0, tax: 0.44, total: 52.79, count: 10, tendered: 60.00, change: 7.21,
  last: { e: '🧻', n: 'Paper Towels 6 Roll', d: 'Household · taxable', p: 4.99, code: '0 71234 56789 3' },
  scale: '0.00 lb',
  depts: ['Produce', 'Bakery', 'Dairy', 'Deli', 'Meat', 'Fish', 'Frozen', 'Grocery', 'Snacks', 'Household'],
  quick: [
    ['🍅','Tomatoes','2.99/lb'], ['🥒','Kirby Cukes','1.79/lb'], ['🧅','Yellow Onions','1.29/lb'], ['🥔','Potatoes 5 lb','3.99'],
    ['🥕','Carrots 2 lb','1.99'], ['🍋','Lemons','0.69 ea'], ['🍌','Bananas','0.69/lb'], ['🍎','Gala Apples','1.99/lb'],
    ['🍞','Challah Plain','6.99'], ['🥯','Bagels 6 pk','5.49'], ['🥐','Rugelach','6.49'], ['🍰','Honey Cake','8.99'],
    ['🥬','Romaine Hearts','3.49'], ['🧄','Garlic 3 pk','1.99'], ['🌿','Parsley','1.29'], ['🫑','Red Peppers','3.49/lb'],
  ],
  promo: 'Fresh challah every Thursday and Friday',
  acts: [ ['New','Ctrl+Shift+N','plus'], ['History','Ctrl+L','clock'], ['Hold','Ctrl+H','pause'], ['Load Hold','Ctrl+Shift+H','inbox'],
          ['Return','Ctrl+R','undo'], ['Customers','F3','user'], ['Items','Esc','grid'], ['Payment','F12','card'],
          ['Tax Off','F5','percent'], ['Sale Discount','F6','tag'], ['Open Item','F7','bolt'], ['Extra Charge','F8','plus'],
          ['Promo Code','F9','star'], ['Gift Card','Ctrl+G','gift'], ['Price Check','Ctrl+I','search'], ['Reprint','Ctrl+P','list'],
          ['Put Aside','Ctrl+Shift+A','inbox'], ['Open Drawer','Ctrl+D','drawer'], ['End of Day','Ctrl+E','chart'], ['Settings','Ctrl+,','gear'],
          ['Log out','Ctrl+Shift+U','out'], ['Clock Out','Ctrl+Shift+X','clock'] ],
  methods: [ ['Card','card','Tap, insert or swipe'], ['Cash','cash','Bills and coins'], ['Gift Card','gift','Scan or type number'], ['Store Credit','star','From customer account'], ['Split','split','Two or more ways'] ],
  qcash: ['$20','$50','$100','Exact'],
  paykeys: [ ['Enter','next payment type'], ['+','put in full balance'], ['Enter','finish sale'], ['Esc','back to sale'] ],
};
D.a = n => D.acts.find(x => x[0] === n);
D.m = v => '$' + v.toFixed(2);
D.ic = (k, cls = 'i') => { const P = {
  plus: 'M12 5v14M5 12h14', clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', pause: 'M9 6v12M15 6v12', inbox: 'M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6z',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', drawer: 'M3 7h18v10H3zM3 12h18M10 15h4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5', scan: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M14 8v8M17 8v8',
  card: 'M2 6h20v12H2zM2 10h20M6 15h4', cash: 'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 12h.01M18 12h.01', gift: 'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zm0 0s2-5 4.5-3.5S15 8 12 8z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', split: 'M16 3h5v5M8 3H3v5M21 3l-7 7M3 3l7 7M12 14v7', more: 'M5 12h.01M12 12h.01M19 12h.01', back: 'M15 18l-6-6 6-6',
  cart: 'M4 7h16l-1.5 9h-13zM9 20h.01M16 20h.01M8 7l1-3h6l1 3', bag: 'M6 7h12l1 14H5zM9 7a3 3 0 0 1 6 0', tag: 'M20 12l-8 8-9-9V3h8zM7 7h.01', check: 'M5 12l5 5L20 7', x: 'M6 6l12 12M18 6L6 18', minus: 'M5 12h14',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', home: 'M3 11l9-8 9 8v10H3z', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', percent: 'M19 5L5 19M7 7h.01M17 17h.01', bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4' }[k] || '';
  return `<svg class="${cls}" viewBox="0 0 24 24"><path d="${P}"/></svg>`; };
D.k = s => `<kbd>${s}</kbd>`;
D.screen = () => (location.hash || '#sale').slice(1);
D.show = () => { document.body.dataset.screen = D.screen(); };
window.addEventListener('hashchange', D.show);
D.KEYS = [
  ['a-new','Actions','New','Ctrl + Shift + N','plus'], ['a-history','Actions','History','Ctrl + L','clock'], ['a-hold','Actions','Hold','Ctrl + H','pause'],
  ['a-loadhold','Actions','Load Hold','Ctrl + Shift + H','inbox'], ['a-putaside','Actions','Put Aside','Ctrl + Shift + A','inbox'], ['a-loadaside','Actions','Load Aside','Ctrl + Shift + L','inbox'],
  ['a-drawer','Actions','Open Drawer','Ctrl + D','drawer'], ['a-return','Actions','Return','Ctrl + R','undo',1], ['a-customer','Actions','Customer','F3','user'],
  ['a-eod','Actions','End of Day','Ctrl + E','chart'], ['a-clockout','Actions','Clock Out','Ctrl + Shift + X','clock'], ['a-logout','Actions','Log Out','Ctrl + Shift + U','out',1],
  ['t-customers','Tiles','Customers','F3','user'], ['t-items','Tiles','Items','','cart'], ['t-payment','Tiles','Payment','F12','card'],
  ['x-return','Transaction Actions','Return','Ctrl + R','undo',1], ['x-takereturn','Transaction Actions','Take Return','receipt · Ctrl + L','list'], ['x-reprint','Transaction Actions','Reprint Receipt','Ctrl + P','list'],
  ['x-finder','Transaction Actions','Open Finder','Ctrl + F','search'], ['x-discount','Transaction Actions','Sale Discount','F6','tag'], ['x-taxoff','Transaction Actions','Tax Off','F5','percent'],
  ['x-promo','Transaction Actions','Promo Code','F9','star'], ['x-extra','Transaction Actions','Extra Charge','F8','plus'], ['x-clearcust','Transaction Actions','Clear Customer','Shift + F3','x'],
  ['g-gift','Gift Cards','Gift Card','Ctrl + G','gift'], ['g-multi','Gift Cards','Multiple Gift Cards','Ctrl + Shift + G','gift'], ['g-balance','Gift Cards','Gift Card Balance','Ctrl + Shift + B','gift'],
  ['l-price','Lookups','Price Check','Ctrl + I','search'], ['l-find','Lookups','Find in Sale','Ctrl + Shift + F','search'], ['l-note','Lookups','Sale Note','Ctrl + N / Alt + N','list'],
  ['l-calc','Lookups','Calculator','Ctrl + Shift + C','grid'], ['l-zoom','Lookups','Zoom','Ctrl + 0 · Ctrl + = / −','search'],
  ['i-plus','Items','Qty +','+','plus'], ['i-minus','Items','Qty −','−','minus'], ['i-setqty','Items','Set Qty','* then number','grid'],
  ['i-remove','Items','Remove Line','Del','x',1], ['i-unlisted','Items','Unlisted Item','F7','bolt'], ['i-itemdisc','Items','Item Discount','F4','tag'],
  ['r-cash','Register','Cash In / Out','Ctrl + K','cash'], ['r-settings','Register','Printer & Drawer','Ctrl + ,','gear'], ['r-keys','Register','Keys','F1','list'], ['r-hw','Register','Hardware check','Ctrl + Shift + D','gear'],
].map(([id, g, l, k, ic, red]) => ({ id, g, l, k, ic, red: !!red }));
D.K = id => D.KEYS.find(x => x.id === id) || (() => { throw new Error('no key ' + id); })();
D.kc = s => s.replace(/ \+ /g, '+').replace(/ \/ /g, ' / ');
D.b = (id, cls = 'kb', tpl) => { const k = D.K(id); return `<button class="${cls}${k.red ? ' red' : ''}" data-key="${id}">${tpl ? tpl(k) : `<span class="l">${k.l}</span>${k.k ? `<span class="k">${D.kc(k.k)}</span>` : ''}`}</button>`; };
D.bs = (ids, cls, tpl) => ids.map(i => D.b(i, cls, tpl)).join('');
D.group = g => D.KEYS.filter(k => k.g === g).map(k => k.id);
D.qs = { title: 'Quick search', k: 'Ctrl+Shift+S', alt: 'F2', ph: 'Name, number or UPC' };
D.legend = [['F2','Quick search'],['Ctrl+C','Payment (no text selected)'],['Esc / Ctrl+Shift+O','Close / back to sale'],['Ctrl+Alt+= / Ctrl+Alt+−  ·  Ctrl++ / Ctrl+_','Zoom'],['Ctrl+Shift+Q','Exit']];
D.legendHTML = (sep = ' · ') => `<span data-legend="1">${D.legend.map(([k, l]) => `<b>${k}</b> ${l}`).join(sep)}</span>`;
D.PAY = {
  nums: [['Due', 52.79], ['Paid', 60.00], ['Balance', 0], ['Change', 7.21]],
  lines: [['Credit Card', ''], ['Cash', '60.00'], ['Gift Card', ''], ['Check', ''], ['Store credit', '']],
  quick: ['Exact', '$5', '$10', '$20', '$50', '$100'],
  back: 'Back (Esc)', ok: 'Pay — finish sale',
  keys: [['Enter','next payment line / finish when fully paid'],['+','put the full balance on this line'],['Esc','back to sale']],
};
