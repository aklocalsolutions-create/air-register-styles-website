// Air Register Styles — Style 03 Glass: optional LOOK hooks.
// OWNER: the style-03 assistant ONLY (this file + demo-style-03-glass.css). Shared files belong to the lead.
// Use only for decoration CSS cannot do (e.g. a read-only mirror of the cart, labels from /api/shortcuts).
// Rules: no clicks/keys/API writes, never move or remove app elements (the app redraws them); add only elements with
// class "st-deco" and remove them all in off(). Test: node tests/e2e-styles.js --style 03
// STATUS: declares the mockup's on-screen buttons (all others are hidden by the CSS, their keys still work); no DOM hooks.
'use strict';
AirStyle.declare('03', {
  // only the buttons drawn in /workspace/ui-mockup/v2/style-3-glass/ (sale screen)
  buttons: [
    'new-sale', 'history', 'hold', 'return', 'discount', // action row: New · History · Hold · Return · Discount F6
    'local:help',                                         // 6th slot of the row (mockup "More"; here = Keys F1, the full key list)
    'customer',                                           // "Add customer F3" chip (tile)
    'close',                                              // "Current sale · n items" title (Items tile, Esc)
    'checkout',                                           // white "Charge" bar (Payment tile, F12)
    'logout',                                             // header logout chip (Ctrl+Shift+U)
    '#setTop',                                            // header gear chip (Ctrl+,)
    '#bulkBtns',                                          // "Categories" tiles (bulk items, Alt+1..)
  ],
  placeholder: 'Search or scan any item…',
});
AirStyle.register('03', {
  on(ctx) { /* ctx.page = 'register' | 'customer', ctx.html = <html> */ },
  off(ctx) { },
});
