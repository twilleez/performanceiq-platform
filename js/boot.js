// /js/boot.js
const LOADER_ID = 'loadingScreen';

function loaderEl() {
  return document.getElementById(LOADER_ID);
}

function setLoaderVisible(on) {
  const ls = loaderEl();
  if (!ls) return;
  ls.style.display = on ? 'flex' : 'none';
  ls.style.pointerEvents = on ? 'auto' : 'none';
}

function badge(text) {
  const b = document.createElement('div');
  b.style.cssText = [
    'position:fixed',
    'top:10px',
    'left:10px',
    'z-index:100000',
    'background:rgba(10,14,20,.92)',
    'border:1px solid rgba(255,255,255,.14)',
    'color:#eaf0ff',
    'border-radius:12px',
    'padding:8px 10px',
    'font:12px system-ui',
    'white-space:pre-wrap'
  ].join(';');
  b.textContent = text;
  document.body.appendChild(b);
  return b;
}

function showBootError(title, detail) {
  setLoaderVisible(false);

  const box = document.createElement('div');
  box.style.cssText = [
    'position:fixed',
    'left:12px',
    'right:12px',
    'bottom:12px',
    'z-index:100000',
    'background:rgba(10,14,20,.96)',
    'border:1px solid rgba(255,255,255,.14)',
    'color:#eaf0ff',
    'border-radius:12px',
    'padding:12px',
    'font:13px system-ui',
    'white-space:pre-wrap',
    'line-height:1.35'
  ].join(';');
  box.textContent = `${title}\n\n${detail}`;
  document.body.appendChild(box);
}

window.addEventListener('error', (e) => {
  showBootError('Runtime error (window.error)', e?.message || 'Unknown runtime error');
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason?.message || String(e?.reason || 'Unhandled rejection');
  showBootError('Unhandled Promise rejection', msg);
});

setLoaderVisible(true);

const b = badge('BOOT OK\nImporting app.js…');

import('./app.js')
  .then(() => {
    b.textContent = 'BOOT OK\nAPP OK';
    // give the UI a moment to paint, then hide badge
    setTimeout(() => b.remove(), 2000);
    // ensure loader goes away
    setTimeout(() => setLoaderVisible(false), 250);
  })
  .catch((err) => {
    const detail =
      `Import failed: ./app.js\n` +
      `Message: ${err?.message || String(err)}\n` +
      (err?.stack ? `\nStack:\n${err.stack}` : '');
    showBootError('Module import failed', detail);
  });

// absolute failsafe
setTimeout(() => setLoaderVisible(false), 8000);
