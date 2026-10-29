// Demo Store - style list. ONE entry per style. The gallery, the style page and the customer screen all read this list.
// downloadUrl: the Windows app download for this style. null = shows a disabled "Download - coming soon" button.
//   Put the real link here later; nothing else needs to change.
// stage: 'tested'  = the working demo register runs in this style's real look (its CSS/JS in demo/register/styles/,
//                     copied read-only from the style bot's build after it passed all tests). Gallery badge "Tested".
//          'preview' = the style is not in Air Register yet. Its page shows design pictures (preview.shots) and a
//                     clickable design mockup (preview.dir + 'index.html') from demo/previews/, marked
//                     "Preview - coming soon to Air Register". No working register is shown for it.
//   To swap a preview for the real look later: copy the style's tested CSS/JS into demo/register/styles/, set
//   stage: 'tested' and css/js: true on its line, and drop its preview: field.
window.DEMO_STYLES = [
  { id: '01', slug: 'clean-light',      name: 'Clean Light',      css: true, js: true, swatch: ['#4f46e5', '#eef0ff', '#ffffff'], stage: 'tested', downloadUrl: null },
  { id: '03', slug: 'glass',            name: 'Glass',            css: true, js: true, swatch: ['#2b1d63', '#3ef0b0', '#ff6ec4'], stage: 'tested', downloadUrl: null },
  { id: '10', slug: 'retro-pop',        name: 'Retro Pop',        css: true, js: true, swatch: ['#ff3ea5', '#19e3ff', '#ffe14d'], stage: 'tested', downloadUrl: null },
  { id: '11', slug: 'liquid-glass',     name: 'Liquid Glass',     css: true, js: true, swatch: ['#ffb38a', '#9ec5ff', '#d6a8ff'], stage: 'tested', downloadUrl: null },
  { id: '15', slug: 'neumorphic-dial',  name: 'Neumorphic Dial',  css: true, js: true, swatch: ['#e3e7ee', '#f5a524', '#9aa3b2'], stage: 'tested', downloadUrl: null },
  { id: '16', slug: 'terminal-tui',     name: 'Terminal TUI',     css: true, js: true, swatch: ['#050a06', '#3dff7a', '#ffb000'], stage: 'tested', downloadUrl: null },
  { id: '17', slug: 'editorial',        name: 'Editorial',        css: true, js: true, swatch: ['#f3ede2', '#16130f', '#c8102e'], stage: 'tested', downloadUrl: null },
  { id: '19', slug: 'dual-cashier',     name: 'Dual Cashier',     css: true, js: true, swatch: ['#ffffff', '#1b2030', '#d9dde5'], stage: 'tested', downloadUrl: null },
  { id: '22', slug: 'scan-hero',        name: 'Scan Hero',        css: true, js: true, swatch: ['#06110f', '#e8fff8', '#2fd59a'], stage: 'tested', downloadUrl: null },
  { id: '23', slug: 'spreadsheet',      name: 'Spreadsheet',      css: true, js: true, swatch: ['#0f7b4f', '#ffffff', '#e6efe9'], stage: 'tested', downloadUrl: null },
  { id: '25', slug: 'chat-ticket',      name: 'Chat Ticket',      css: true, js: true, swatch: ['#151a2e', '#ff5c8a', '#ffffff'], stage: 'tested', downloadUrl: null },
  { id: '26', slug: 'floating-windows', name: 'Floating Windows', css: true, js: true, swatch: ['#7c3aed', '#ff6a3d', '#f43f5e'], stage: 'tested', downloadUrl: null },
  { id: '27', slug: 'receipt-preview',  name: 'Receipt Preview',  css: true, js: true, swatch: ['#f3ecdf', '#16213e', '#b91c1c'], stage: 'tested', downloadUrl: null },
  { id: '30', slug: 'card-deck',        name: 'Card Deck',        css: true, js: true, swatch: ['#fffaf3', '#7a1f3d', '#a3324f'], stage: 'tested', downloadUrl: null },
  { id: '32', slug: 'order-desk',       name: 'Order Desk',       css: false, js: false, swatch: ['#7fd1ee', '#e01fd6', '#0b0b0b'], stage: 'preview', downloadUrl: null,
    desc: 'Sky-blue desk with a bold pink item table, big digital totals and a full-screen register menu.',
    preview: { dir: 'previews/demo-style-32-order-desk/', shots: ['sale', 'payment', 'customer', 'menu'] } },
  { id: '33', slug: 'counter-grid',     name: 'Counter Grid',     css: false, js: false, swatch: ['#eef2fc', '#2c3561', '#e2364b'], stage: 'preview', downloadUrl: null,
    desc: 'Soft blue counter screen: the item list on the left, a big number pad and key grid on the right.',
    preview: { dir: 'previews/demo-style-33-counter-grid/', shots: ['sale', 'payment', 'customer'] } },
  { id: '35', slug: 'tabbed-pantry',    name: 'Tabbed Pantry',    css: false, js: false, swatch: ['#ffffff', '#2f7de1', '#f2b705'], stage: 'preview', downloadUrl: null,
    desc: 'A clear white item list beside a glossy, colourful grid of department and item keys.',
    preview: { dir: 'previews/demo-style-35-tabbed-pantry/', shots: ['sale', 'payment', 'customer'] } },
  { id: '36', slug: 'rail-cards',       name: 'Rail & Cards',     css: false, js: false, swatch: ['#2a5f95', '#b9d8f0', '#1a7fd8'], stage: 'preview', downloadUrl: null,
    desc: 'A blue action rail down the left, big cards for customer, items, discount and pay, and a full item table.',
    preview: { dir: 'previews/demo-style-36-rail-cards/', shots: ['sale', 'payment', 'customer'] } },
  { id: '37', slug: 'maroon-console',   name: 'Maroon Console',   css: false, js: false, swatch: ['#2b120d', '#4c807a', '#1418a6'], stage: 'preview', downloadUrl: null,
    preview: { dir: 'previews/demo-style-37-maroon-console/', shots: ['sale', 'payment', 'customer', 'menu'] } },
];
