// Fake demo data shared by all 10 mockups (no real store, user or customer)
window.D = {
  store: 'Demo Store', cashier: 'cashier1', session: '0042', ticket: '1042', ver: 'v1.2.0',
  items: [
    { e: '🚂', n: 'Wooden Train Set', d: '24 pc', p: 34.99, c: 1, cat: 'Trains' },
    { e: '🧸', n: 'Plush Teddy Bear', d: 'Large', p: 19.99, c: 6, cat: 'Plush' },
    { e: '🧱', n: 'Building Blocks Bucket', d: '120 pc', p: 24.50, c: 2, cat: 'Building' },
    { e: '🫧', n: 'Bubble Wand 3-Pack', d: 'Assorted', p: 4.99, c: 7, cat: 'Outdoor' },
    { e: '🧩', n: 'Puzzle Animals', d: '100 pc', p: 12.99, c: 4, cat: 'Puzzles' },
    { e: '🚗', n: 'Race Car Pull-Back', d: 'Metal', p: 7.99, c: 5, cat: 'Cars' },
    { e: '🪁', n: 'Rainbow Kite', d: 'Easy fly', p: 15.00, c: 2, cat: 'Outdoor' },
    { e: '🎨', n: 'Crayon Box', d: '64 colors', p: 6.49, c: 5, cat: 'Arts' },
    { e: '🦖', n: 'Dino Figure Set', d: '6 pc', p: 18.99, c: 3, cat: 'Figures' },
    { e: '🎲', n: 'Family Board Game', d: 'Ages 6+', p: 22.99, c: 8, cat: 'Games' },
    { e: '🪀', n: 'Classic Yo-Yo', d: 'Wood', p: 3.99, c: 6, cat: 'Classic' },
    { e: '🎁', n: 'Gift Bag', d: 'Medium', p: 1.50, c: 1, cat: 'Wrap' },
    { e: '🏀', n: 'Mini Basketball', d: 'Soft', p: 9.99, c: 1, cat: 'Outdoor' },
    { e: '🤖', n: 'Wind-Up Robot', d: 'Tin', p: 11.50, c: 8, cat: 'Classic' },
    { e: '🧃', n: 'Juice Box', d: 'Apple', p: 1.25, c: 3, cat: 'Snacks' },
  ],
  cart: [ // index into items, qty
    { i: 0, q: 1 }, { i: 1, q: 1 }, { i: 2, q: 1 }, { i: 3, q: 1 }, { i: 4, q: 2 },
  ],
  sub: 110.45, disc: 0, tax: 9.80, total: 120.25, qty: 6,
  cats: ['All', 'Trains', 'Plush', 'Building', 'Puzzles', 'Outdoor', 'Arts', 'Games'],
  main: [ ['New', 'Ctrl+Shift+N', 'plus'], ['History', 'Ctrl+L', 'clock'], ['Hold', 'Ctrl+H', 'pause'], ['Load Hold', 'Ctrl+Shift+H', 'inbox'],
          ['Return', 'Ctrl+R', 'undo'], ['Customer', 'F3', 'user'], ['Open Drawer', 'Ctrl+D', 'drawer'], ['End of Day', 'Ctrl+E', 'chart'],
          ['Settings', 'Ctrl+,', 'gear'], ['Log Out', 'Ctrl+Shift+U', 'out'] ],
  more: [ ['Open Item', 'F7'], ['Sale Discount', 'F6'], ['Tax Off', 'F5'], ['Promo Code', 'F9'], ['Extra Charge', 'F8'], ['Gift Card', 'Ctrl+G'],
          ['Price Check', 'Ctrl+I'], ['Reprint', 'Ctrl+P'], ['Put Aside', 'Ctrl+Shift+A'], ['Clock Out', 'Ctrl+Shift+X'] ],
  methods: [ ['Card', 'card', 'Tap, insert or swipe'], ['Cash', 'cash', 'Bills and coins'], ['Gift Card', 'gift', 'Scan or type number'], ['Store Credit', 'star', 'From customer account'], ['Split', 'split', 'Pay with two or more'] ],
  quick: ['$20', '$50', '$100', '$150', 'Exact'],
  paykeys: [ ['Enter', 'next payment type'], ['+', 'put in full balance'], ['Enter', 'finish at $0.00'], ['Esc', 'back to sale'] ],
};
D.m = v => '$' + v.toFixed(2);
D.lines = D.cart.map(x => ({ ...D.items[x.i], q: x.q, t: D.items[x.i].p * x.q }));
// tiny stroke icon set
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
