/**
 * router.js — Phase 15C
 * Thin router shim. Actual navigation lives in app.js navigate().
 * Exported so view modules can import and call navigate without
 * creating a circular dependency.
 */

// navigate is set by app.js after init
let _navigate = null;

export const router = {
  /** Called once by app.js to register the navigate function */
  register(fn) {
    _navigate = fn;
  },

  /** Navigate to a route */
  navigate(route, params = {}) {
    if (_navigate) {
      _navigate(route, params);
    } else {
      console.warn('[PIQ] Router not yet initialized for route:', route);
    }
  },

  /** Go back (simple history wrapper) */
  back() {
    history.back();
  }
};
