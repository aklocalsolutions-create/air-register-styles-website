// Demo Store: marks a design preview of a style that is not in Air Register yet. Made-up data, nothing is real.
(() => { const d = document.createElement('div'); d.id = 'demoRibbon'; d.textContent = 'DEMO · Preview - coming soon to Air Register · made-up data, nothing is real';
  d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:10px;z-index:2147483000;pointer-events:none;background:repeating-linear-gradient(45deg,#ffd43b 0 10px,#ffbf00 10px 20px);color:#1a1a1a;font:800 12px/1 system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.05em;padding:7px 12px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.35);white-space:nowrap';
  const put = () => document.body.appendChild(d); if (document.body) put(); else addEventListener('DOMContentLoaded', put); })();
