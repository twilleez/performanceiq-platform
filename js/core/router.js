/**
 * PerformanceIQ — core/router.js
 *
 * SHIM ONLY.  The real router lives at js/router.js.
 *
 * This file exists solely so legacy view modules that import from
 * '../../core/router.js' (e.g. auth/signin.js, auth/signup.js,
 * auth/pickRole.js, auth/onboarding.js) continue to work without
 * any changes to those files.
 *
 * All navigation calls are forwarded to the canonical router.
 * DO NOT add logic here — put it in js/router.js.
 */
import { navigate, ROUTES } from '../router.js';

export const router = {
  navigate(route, params = {}) {
    navigate(route, params);
  },
};
