// Air Register Styles — style catalog. OWNER: lead only (style assistants: do not edit; ask the lead).
// One entry per style. id = two-digit number used in data-style, file names, and installers.
// swatch = colours shown in Settings > Style (taken from the chosen mockup in /workspace/ui-mockup/v2).
'use strict';
(function (root) {
  const AIR_STYLES = [
    { id: '00', slug: 'classic', name: 'Classic (today\'s look)', swatch: ['#34495e', '#b6d4e7', '#eef2f5'] },
    { id: '01', slug: 'clean-light', name: 'Clean Light', swatch: ['#4f46e5', '#eef0ff', '#ffffff'] },
    { id: '03', slug: 'glass', name: 'Glass', swatch: ['#2b1d63', '#3ef0b0', '#ff6ec4'] },
    { id: '10', slug: 'retro-pop', name: 'Retro Pop', swatch: ['#ff3ea5', '#19e3ff', '#ffe14d'] },
    { id: '11', slug: 'liquid-glass', name: 'Liquid Glass', swatch: ['#ffb38a', '#9ec5ff', '#d6a8ff'] },
    { id: '15', slug: 'neumorphic-dial', name: 'Neumorphic Dial', swatch: ['#e3e7ee', '#f5a524', '#9aa3b2'] },
    { id: '16', slug: 'terminal-tui', name: 'Terminal TUI', swatch: ['#050a06', '#3dff7a', '#ffb000'] },
    { id: '17', slug: 'editorial', name: 'Editorial', swatch: ['#f3ede2', '#16130f', '#c8102e'] },
    { id: '19', slug: 'dual-cashier', name: 'Dual Cashier', swatch: ['#ffffff', '#1b2030', '#d9dde5'] },
    { id: '22', slug: 'scan-hero', name: 'Scan Hero', swatch: ['#06110f', '#e8fff8', '#2fd59a'] },
    { id: '23', slug: 'spreadsheet', name: 'Spreadsheet', swatch: ['#0f7b4f', '#ffffff', '#e6efe9'] },
    { id: '25', slug: 'chat-ticket', name: 'Chat Ticket', swatch: ['#151a2e', '#ff5c8a', '#ffffff'] },
    { id: '26', slug: 'floating-windows', name: 'Floating Windows', swatch: ['#7c3aed', '#ff6a3d', '#f43f5e'] },
    { id: '27', slug: 'receipt-preview', name: 'Receipt Preview', swatch: ['#f3ecdf', '#16213e', '#b91c1c'] },
    { id: '30', slug: 'card-deck', name: 'Card Deck', swatch: ['#fffaf3', '#7a1f3d', '#a3324f'] },
    { id: '32', slug: 'order-desk', name: 'Order Desk', swatch: ['#86d4ee', '#e01fd6', '#1ee01e'] },
    { id: '33', slug: 'counter-grid', name: 'Counter Grid', swatch: ['#eef1fb', '#1f2a55', '#d63a3a'] },
    { id: '35', slug: 'tabbed-pantry', name: 'Tabbed Pantry', swatch: ['#d4d4d4', '#c8c4f4', '#111111'] },
    { id: '36', slug: 'rail-cards', name: 'Rail Cards', swatch: ['#cfe3f3', '#2e3d4f', '#1a7fd8'] },
    { id: '37', slug: 'maroon-console', name: 'Maroon Console', swatch: ['#2e1410', '#4d7f79', '#1e2ea6'] },
  ];
  root.AIR_STYLES = AIR_STYLES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { AIR_STYLES };
})(typeof window !== 'undefined' ? window : globalThis);
