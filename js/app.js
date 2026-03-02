// /js/app.js

function hideLoader() {
  const ls = document.getElementById('loadingScreen');
  if (ls) ls.style.display = 'none';
}

async function start() {
  try {
    // Dynamically import everything AFTER DOM exists
    const [
      { cacheDOM },
      { installInteractions },
      { initRouter },
      { renderDashboard }
    ] = await Promise.all([
      import('./ui/dom.js'),
      import('./ui/interactions.js'),
      import('./router.js'),
      import('./views/dashboardView.js')
    ]);

    cacheDOM();
    installInteractions();
    initRouter();

    renderDashboard();

  } catch (err) {
    console.error('Boot failure:', err);
  } finally {
    hideLoader();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
