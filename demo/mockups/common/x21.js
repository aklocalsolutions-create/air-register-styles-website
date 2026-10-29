// Shared helpers for styles 21-30 (fake demo data only). Uses D from data.js.
window.X = {
  // every POS function with its real Air Register key
  acts: [ ['New','Ctrl+Shift+N','plus'], ['History','Ctrl+L','clock'], ['Hold','Ctrl+H','pause'], ['Return','Ctrl+R','undo'],
          ['Customers','F3','user'], ['Items','Esc','grid'], ['Payment','F12','card'], ['Tax Off','F5','percent'],
          ['Sale Discount','F6','tag'], ['Open Item','F7','bolt'], ['End of Day','Ctrl+E','chart'], ['Settings','Ctrl+,','gear'], ['Log out','Ctrl+Shift+U','out'] ],
  quick: ['$20','$50','$100','Exact'],
  paykeys: [ ['Enter','next payment type'], ['+','put in full balance'], ['Enter','finish sale'], ['Esc','back to sale'] ],
  a: n => X.acts.find(x => x[0] === n),
};
