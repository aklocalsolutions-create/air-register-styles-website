// Demo Store - style list. ONE entry per style. To add a style:
//   1) copy its look files to demo/register/styles/style-NN-slug.css (and optional style-NN-slug.js)
//   2) add one entry below. The gallery, the register page and the customer screen all read this list.
// downloadUrl: the Windows app download for this style. null = shows a disabled "Download - coming soon" button.
//   Put the real link here later; nothing else needs to change.
// stage: 'tested'  = the working demo register runs in this style's real look (its CSS/JS in demo/register/styles/,
//                     copied read-only from the style bot's build after it passed all tests). Gallery badge "Tested".
//          'preview' = the style is still in testing. Its page shows the v2 design mockup (mockup: path below) marked
//                     "Preview - still in testing", and the working register beside it runs in the plain Classic look.
//   To swap in the real look later: copy the style's tested CSS/JS into demo/register/styles/, then change
//   stage: 'preview' to stage: 'tested' on its line. That is the only change.
// All 14 styles below are 'tested'. The 'preview' option is kept for future styles (31-36 are not ready yet): add their
//   entry with stage: 'preview' and mockup: 'mockups/style-NN-slug/index.html' (a copy of the v2 mockup folder, which
//   needs mockups/common/), and swap to 'tested' as above once they pass.
window.DEMO_STYLES = [
  { id: '01', slug: 'clean-light',      name: 'Clean Light',      css: true, js: true, swatch: ['#4f46e5', '#eef0ff', '#ffffff'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '03', slug: 'glass',            name: 'Glass',            css: true, js: true, swatch: ['#2b1d63', '#3ef0b0', '#ff6ec4'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '10', slug: 'retro-pop',        name: 'Retro Pop',        css: true, js: true, swatch: ['#ff3ea5', '#19e3ff', '#ffe14d'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '11', slug: 'liquid-glass',     name: 'Liquid Glass',     css: true, js: true, swatch: ['#ffb38a', '#9ec5ff', '#d6a8ff'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '15', slug: 'neumorphic-dial',  name: 'Neumorphic Dial',  css: true, js: true, swatch: ['#e3e7ee', '#f5a524', '#9aa3b2'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '16', slug: 'terminal-tui',     name: 'Terminal TUI',     css: true, js: true, swatch: ['#050a06', '#3dff7a', '#ffb000'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '17', slug: 'editorial',        name: 'Editorial',        css: true, js: true, swatch: ['#f3ede2', '#16130f', '#c8102e'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '19', slug: 'dual-cashier',     name: 'Dual Cashier',     css: true, js: true, swatch: ['#ffffff', '#1b2030', '#d9dde5'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '22', slug: 'scan-hero',        name: 'Scan Hero',        css: true, js: true, swatch: ['#06110f', '#e8fff8', '#2fd59a'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '23', slug: 'spreadsheet',      name: 'Spreadsheet',      css: true, js: true, swatch: ['#0f7b4f', '#ffffff', '#e6efe9'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '25', slug: 'chat-ticket',      name: 'Chat Ticket',      css: true, js: true, swatch: ['#151a2e', '#ff5c8a', '#ffffff'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '26', slug: 'floating-windows', name: 'Floating Windows', css: true, js: true, swatch: ['#7c3aed', '#ff6a3d', '#f43f5e'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '27', slug: 'receipt-preview',  name: 'Receipt Preview',  css: true, js: true, swatch: ['#f3ecdf', '#16213e', '#b91c1c'], stage: 'tested', mockup: null, downloadUrl: null },
  { id: '30', slug: 'card-deck',        name: 'Card Deck',        css: true, js: true, swatch: ['#fffaf3', '#7a1f3d', '#a3324f'], stage: 'tested', mockup: null, downloadUrl: null },
];
