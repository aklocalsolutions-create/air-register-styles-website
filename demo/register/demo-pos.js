// Air Register 1.1 POS hardening (UI side): Retry offers, crash reports, recovery notice, Register Mode (exit to Windows,
// restart / shut down the PC), Touch keyboard + full screen settings, Remote Help panel, Export log.
// Loaded after demo-app.js and demo-extras.js; uses their helpers (S, A, api, act, modal, toast, msgIn, refresh, focusScan…).
'use strict';

// ---------- errors in the page are reported to the local log (no data from the cart or forms) ----------
const reportErr = (message, where) => { try { fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: String(message).slice(0, 400), where: String(where || '').slice(0, 200) }) }); } catch {} };
window.addEventListener('error', e => reportErr(e.message, (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', e => reportErr('promise: ' + ((e.reason && e.reason.message) || e.reason)));

// ---------- Retry (shown next to the message after a "retryable" failure: connection drops, timeouts) ----------
window.retryOffer = fn => {
  const t = $('toast'); if (!t) return;
  const b = document.createElement('button'); b.className = 'pbtn s retrybtn'; b.textContent = 'Retry';
  b.onclick = e => { e.stopPropagation(); b.remove(); fn(); }; t.appendChild(b);
};

// ---------- recovery notice (an unfinished sale or refund restored after a restart / crash / power cut) ----------
function noticeBanner() {
  let n = $('noticeBar');
  const x = S.loggedIn && S.notice;
  if (!x) { if (n) n.remove(); return; }
  if (!n) { n = document.createElement('div'); n.id = 'noticeBar'; const anchor = $('toast'); anchor.parentNode.insertBefore(n, anchor); }
  const key = (x.message || '') + (S.recoveryPending ? 1 : 0); if (n.dataset.key === key) return; n.dataset.key = key;
  n.className = 'notice ' + (x.kind || 'info');
  n.innerHTML = `<span>${esc(x.message)}</span>${S.recoveryPending ? '<button class="pbtn s" id="nbRetry">Check again</button>' : ''}<button class="pbtn s" id="nbOk">OK</button>`;
  $('nbOk').onclick = async e => { e.stopPropagation(); await api('notice-dismiss'); n.remove(); await refresh(); focusScan(); };
  if ($('nbRetry')) $('nbRetry').onclick = async e => { e.stopPropagation(); const r = await api('recover-check'); toast(r.message, r.ok); await refresh(); };
}
// waiting card refund (receipt return to card that AIR POS has not marked Completed): stays until AIR POS says Completed
function cardRefundBar() {
  let n = $('cardRefundBar');
  const list = (S.loggedIn && S.cardRefunds) || [];
  if (!list.length) { if (n) n.remove(); return; }
  if (!n) { n = document.createElement('div'); n.id = 'cardRefundBar'; const anchor = $('toast'); anchor.parentNode.insertBefore(n, anchor); }
  const x = list[0], msg = x.message + (x.orderNumber ? ` (${x.orderNumber})` : '') + (list.length > 1 ? ` +${list.length - 1} more` : '');
  if (n.dataset.key === msg) return; n.dataset.key = msg;
  n.className = 'notice'; n.style.cssText = 'background:#fde2e2;border-color:#c0392b';
  n.innerHTML = `<span>${esc(msg)}</span><button class="pbtn r" id="crRetry">Retry card refund</button>`;
  $('crRetry').onclick = async e => {
    e.stopPropagation(); const b = $('crRetry'); if (b.disabled) return; b.disabled = true; toast('Checking the card refund with AIR POS…');
    const r = await api('card-refund-retry', { retId: x.retId }); if (!r.busy) toast(r.message, r.ok); n.dataset.key = ''; await refresh();
  };
}
const prevAfter = window.afterRefresh;
window.afterRefresh = () => { if (prevAfter) prevAfter(); noticeBanner(); cardRefundBar(); applyTouchMode(); };

// ---------- manager login (Register Mode exit, PC power, Remote Help) ----------
// The user name + password are checked by the AIR POS server (Identities/verify), the same check as manager approvals.
function managerLogin(title, text, go, { allowPin } = {}) {
  const pin = allowPin && S.settings && S.settings.exitPinEnabled;
  modal(`<h2>${esc(title)}</h2><p class="note">${esc(text)}</p>
    <label class="f">Manager user name</label><input class="f" id="mlU" autocomplete="off" data-kb="text" autofocus>
    <label class="f">Password</label><input class="f" id="mlP" type="password" autocomplete="off" data-kb="text">
    ${pin ? '<p class="note">or the exit PIN:</p><input class="f" id="mlPin" type="password" inputmode="numeric" data-kb="numeric" maxlength="8" autocomplete="off">' : ''}
    <div id="mlMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel (Esc)</button><button class="pbtn g" id="mlOk">OK</button></div>`, () => {
    const ok = async () => {
      const b = { user: $('mlU').value.trim(), password: $('mlP').value }; if (pin && $('mlPin').value) b.pin = $('mlPin').value;
      $('mlP').value = ''; if ($('mlPin')) $('mlPin').value = '';
      $('mlOk').disabled = true; msgIn($('mlMsg'), { ok: true, message: 'Checking…' });
      try { const r = await go(b); if (r) msgIn($('mlMsg'), r); } finally { if ($('mlOk')) $('mlOk').disabled = false; }
    };
    $('mlOk').onclick = ok; $('modalRoot').querySelectorAll('input').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') ok(); });
  });
}

// ---------- Exit to Windows (Register Mode): Ctrl+Shift+Q, or tap the top-left corner 5 times ----------
function exitDialog() {
  managerLogin('Exit to Windows', 'A manager logs in to close Air Register and go back to Windows.', async b => {
    const r = await api('exit-windows', b);
    if (r.ok) { modal(`<h2>Closing…</h2><p>${esc(r.message)}</p>`); setTimeout(() => { try { window.close(); } catch {} }, 1500); }
    return r;
  }, { allowPin: true });
}
window.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && (e.key === 'Q' || e.key === 'q')) { e.preventDefault(); e.stopImmediatePropagation(); exitDialog(); } }, true);
(() => {
  const c = document.createElement('div'); c.id = 'exitCorner'; c.title = ''; document.body.appendChild(c);
  let taps = [];
  c.addEventListener('pointerdown', e => { e.preventDefault(); const t = Date.now(); taps = taps.filter(x => t - x < 3000).concat(t); if (taps.length >= 5) { taps = []; exitDialog(); } });
})();

function powerDialog() {
  const go = async (action, b = {}) => {
    if (!confirm(action === 'restart' ? 'Restart this PC now?' : 'Shut down this PC now?')) return null;
    const r = await api('power', { action, ...b });
    if (!r.ok && r.needManager) { managerLogin(action === 'restart' ? 'Restart PC' : 'Shut down PC', 'A manager must approve this.', async m => api('power', { action, ...m })); return null; }
    return r;
  };
  modal(`<h2>Restart or shut down the PC</h2><p class="note">Finish or hold the sale first. A cashier needs a manager login.</p><div id="pwMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" data-close>Cancel (Esc)</button><button class="pbtn" id="pwR">Restart PC</button><button class="pbtn r" id="pwS">Shut down PC</button></div>`, () => {
    $('pwR').onclick = async () => { const r = await go('restart'); if (r) msgIn($('pwMsg'), r); };
    $('pwS').onclick = async () => { const r = await go('shutdown'); if (r) msgIn($('pwMsg'), r); };
  });
}
A['power'] = powerDialog; A['exit-windows'] = exitDialog;

// ---------- Settings: Touch screen & Register Mode ----------
function touchSettingsDialog() {
  const st = S.settings || {}, mgr = !!(S.user && S.user.manager);
  modal(`<h2>Screens &amp; Register Mode</h2>
    <label class="f">On-screen keyboard (touch screens)</label>
    <select class="f" id="tkK"><option value="keypad">Air Register keypad</option><option value="windows">Windows touch keyboard</option><option value="off">Off (no on-screen keyboard)</option></select>
    <p class="note">The scan box never opens a keyboard. A physical keyboard and the barcode scanner always work.</p>
    <label class="f chk"><input type="checkbox" id="tkF"> Full screen</label>
    <label class="f chk"><input type="checkbox" id="tkCD"> Customer display (second monitor)${window.screen && window.screen.isExtended === false ? ' (no second monitor found)' : ''}</label>
    <h3>Register Mode ${mgr ? '' : '<small>(manager only)</small>'}</h3>
    <label class="f chk"><input type="checkbox" id="tkR" ${mgr ? '' : 'disabled'}> Register Mode (locked register)</label>
    <p class="note">Exit to Windows: Ctrl+Shift+Q or tap the top-left corner 5 times, then a manager's AIR POS login. Remote help (RustDesk) keeps working in Register Mode.</p>
    <label class="f chk"><input type="checkbox" id="tkPE" ${mgr ? '' : 'disabled'}> Backup exit PIN</label>
    <div id="tkPinRow"><input class="f" id="tkPin" type="password" inputmode="numeric" data-kb="numeric" maxlength="8" placeholder="${st.exitPinSet ? 'PIN is set — type a new one to change it' : 'New PIN, 4 to 8 digits'}" autocomplete="off" ${mgr ? '' : 'disabled'}></div>
    <div id="tkMsg" class="msg"></div>
    <div class="row2"><button class="pbtn s" id="tkPw">Restart / Shut down PC…</button><button class="pbtn s" data-close>Close (Esc)</button><button class="pbtn g" id="tkOk">Save</button></div>`, () => {
    $('tkK').value = st.touchKeyboard || 'keypad'; $('tkF').checked = !!st.fullScreen; $('tkCD').checked = st.customerDisplay !== false; $('tkR').checked = !!st.registerMode; $('tkPE').checked = !!st.exitPinEnabled;
    const sh = () => { $('tkPinRow').style.display = $('tkPE').checked ? '' : 'none'; }; $('tkPE').onchange = sh; sh();
    $('tkPw').onclick = powerDialog;
    $('tkOk').onclick = async () => {
      const b = { touchKeyboard: $('tkK').value, fullScreen: $('tkF').checked, customerDisplay: $('tkCD').checked };
      if (mgr) { b.registerMode = $('tkR').checked; b.exitPinEnabled = $('tkPE').checked; if ($('tkPin').value) b.exitPin = $('tkPin').value; }
      $('tkPin').value = '';
      const r = await api('settings', b); await refresh();
      msgIn($('tkMsg'), r.ok ? { ok: true, message: 'Saved.' + (b.registerMode !== st.registerMode || b.fullScreen !== st.fullScreen ? ' Restart Air Register for the window change.' : '') } : r);
    };
  });
}

// ---------- Settings: Remote Help (RustDesk). Shows the ID only — never the password. ----------
async function remoteDialog() {
  modal(`<h2>Remote Help</h2><div id="rhBody"><p class="note">Checking…</p></div><div id="rhMsg" class="msg"></div>
    <p class="note keep" style="font-size:11px">Remote help uses RustDesk, free open-source software (AGPL-3.0). License: &lt;install folder&gt;\\remote\\RustDesk-LICENSE-AGPL-3.0.txt</p>
    <div class="row2" id="rhBtns"><button class="pbtn s" data-close>Close (Esc)</button></div>`);
  const r = await api('remote-status'); if (!$('rhBody')) return;
  const status = !r.ok ? (r.message || 'Could not check') : !r.installed ? 'Not set up' : r.serviceRunning ? 'On (connected to the service)' : 'Installed but service stopped';
  $('rhBody').innerHTML = `<label class="f">Status</label><p><b>${esc(status)}</b></p>` + (r.installed ? `<label class="f">ID (give this to AK Local Solutions)</label>
    <div style="display:flex;gap:10px;align-items:center"><span class="rhid">${esc(r.idPretty || 'not available yet')}</span>${r.id ? '<button class="pbtn s" id="rhCopy">Copy</button>' : ''}</div>` : '');
  if ($('rhCopy')) $('rhCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(r.id); toast('ID copied', true); };
  const b = document.createElement('button'); b.className = 'pbtn g'; b.textContent = r.installed ? 'Make a new password' : 'Turn on remote help';
  const mode = r.installed ? 'reset' : 'install';
  b.onclick = () => managerLogin(b.textContent, 'A manager logs in to ' + (mode === 'reset' ? 'make a new remote help password.' : 'turn on remote help.'), async m => {
    const x = await api('remote-setup', { ...m, mode });
    if (x.ok) modal(`<h2>Remote Help</h2><p>${esc(x.message)}</p><p>Windows will ask for permission. The new password will show once. Write it down.</p><div class="row2"><button class="pbtn g" data-close>OK</button></div>`);
    return x;
  });
  if (r.ok) $('rhBtns').appendChild(b);
}
A['touch-settings'] = touchSettingsDialog; A['remote-help'] = remoteDialog;

// ---------- add the new panels + Export log to the Settings window (Ctrl+,) without changing the printer part ----------
const printerSettings = settingsDialog;
settingsDialog = async function () {
  await printerSettings();
  const row = $('modalRoot').querySelector('.row2'); if (!row || $('seMore')) return;
  const more = document.createElement('div'); more.id = 'seMore'; more.className = 'row2'; more.style.justifyContent = 'flex-start';
  more.innerHTML = '<button class="pbtn s" id="seTouch">Screens &amp; Register Mode…</button><button class="pbtn s" id="seRemote">Remote Help…</button><a class="pbtn s" id="seLog" href="/export/log" download="air-register-log.txt">Export log</a>';
  row.parentNode.insertBefore(more, row);
  $('seTouch').onclick = touchSettingsDialog; $('seRemote').onclick = remoteDialog;
};
A['settings'] = settingsDialog;

// ---------- touch keyboard mode (see demo-touch.js) ----------
function applyTouchMode() { if (window.AirTouch) window.AirTouch.setMode((S.settings && S.settings.touchKeyboard) || 'keypad'); }
// Ctrl+P while the "Sale complete" box is open prints that receipt (same as P)
window.addEventListener('keydown', e => { if (e.ctrlKey && !e.shiftKey && (e.key === 'p' || e.key === 'P') && document.getElementById('dPrint')) { e.preventDefault(); e.stopImmediatePropagation(); document.getElementById('dPrint').click(); } }, true);
