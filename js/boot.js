// /js/boot.js
(function () {
  const LOADER_ID = 'loadingScreen';

  function hideLoader() {
    const ls = document.getElementById(LOADER_ID);
    if (ls) ls.style.display = 'none';
  }

  function showBootError(title, detail) {
    // Make sure the overlay never traps the UI
    hideLoader();

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

  // Capture runtime errors too
  window.addEventListener('error', (e) => {
    const msg = e?.message || 'Unknown runtime error';
    showBootError('Runtime error (window.error)', msg);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e?.reason?.message || String(e?.reason || 'Unhandled rejection');
    showBootError('Unhandled Promise rejection', msg);
  });

  // ✅ Dynamically import your real app entry
  // If ANY import path inside your module tree is wrong, this will fail here
  import('./app.js')
    .then(() => {
      // app.js should hide loader at end; but keep a safety timeout
      setTimeout(hideLoader, 6000);
    })
    .catch((err) => {
      // This is the key: show the exact missing module URL/message
      const detail =
        `Import failed: ./app.js\n` +
        `Message: ${err?.message || String(err)}\n` +
        (err?.stack ? `\nStack:\n${err.stack}` : '');

      showBootError('Module import failed (most common: missing file / wrong path / caching)', detail);
    });

  // Absolute fallback so loader never traps the UI
  setTimeout(hideLoader, 8000);
})();
