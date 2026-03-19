/**
 * boot-loader.js — Fix 01
 *
 * Import this as the VERY FIRST line of app.js:
 *   import { bootLoader } from './boot-loader.js';
 *
 * Then call bootLoader.hide() as the last line of your init() function
 * (after all modules are loaded and first render is complete).
 *
 * Usage:
 *   import { bootLoader } from './boot-loader.js';
 *   // ... app init ...
 *   bootLoader.hide();
 */

export const bootLoader = {
  /**
   * Hide the boot loader.
   * Adds .piq-loaded to <body> which triggers CSS fade-out transition.
   * After transition completes, removes the element entirely from the DOM.
   */
  hide() {
    const loader = document.getElementById('piq-boot-loader');
    if (!loader) return;

    // Trigger CSS fade-out (transition: opacity 0.35s in boot-loader.css)
    document.body.classList.add('piq-loaded');

    // Remove from DOM after fade completes to free memory
    loader.addEventListener('transitionend', () => {
      loader.remove();
    }, { once: true });

    // Fallback removal in case transitionend doesn't fire (e.g. prefers-reduced-motion)
    setTimeout(() => loader.remove(), 600);
  },

  /**
   * Show an error state inside the boot loader.
   * Called if app.js fails to initialize.
   *
   * @param {string} message - User-facing error text
   */
  showError(message = 'Something went wrong. Please refresh the page.') {
    const loader = document.getElementById('piq-boot-loader');
    if (!loader) return;

    const inner = loader.querySelector('.piq-boot-inner');
    if (!inner) return;

    inner.innerHTML = `
      <div style="
        text-align: center;
        padding: 24px;
        max-width: 280px;
      ">
        <div style="
          font-size: 32px;
          margin-bottom: 16px;
        ">⚠️</div>
        <div style="
          font-family: 'Oswald', sans-serif;
          font-size: 16px;
          color: #FF6B35;
          margin-bottom: 8px;
          letter-spacing: 0.04em;
        ">LOAD ERROR</div>
        <div style="
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          line-height: 1.5;
          margin-bottom: 20px;
        ">${message}</div>
        <button onclick="location.reload()" style="
          background: #FF6B35;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-family: 'Oswald', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.06em;
          cursor: pointer;
        ">RELOAD</button>
      </div>
    `;
  }
};

/**
 * Usage in app.js — example:
 *
 * import { bootLoader } from './boot-loader.js';
 *
 * async function init() {
 *   try {
 *     await loadModules();
 *     renderApp();
 *     bootLoader.hide();           // ← hide after first render
 *   } catch (err) {
 *     bootLoader.showError();      // ← show error if init fails
 *     console.error(err);
 *   }
 * }
 *
 * init();
 */
