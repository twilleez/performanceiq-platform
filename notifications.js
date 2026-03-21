/**
 * Legacy router shim — delegates to js/router.js
 */
import { navigate as _nav } from '../router.js';
export const router = {
  register() {},
  navigate(route, params = {}) { _nav(route, params); },
  back() { history.back(); }
};
