/**
 * boot.js — Phase 15C
 *
 * Checks auth state, handles OTP expired errors in URL hash,
 * returns the initial route for the app to navigate to.
 */

export async function boot(state, ROUTES) {
  // ── Handle Supabase auth redirect errors in URL hash ────────
  _checkAuthError();

  // ── Restore persisted state ──────────────────────────────────
  try {
    const raw = localStorage.getItem('PIQ_STATE_v1');
    if (raw) {
      const saved = JSON.parse(raw);
      state.set('role',        saved.role        || null);
      state.set('sport',       saved.sport       || null);
      state.set('seasonPhase', saved.seasonPhase || null);
      state.set('onboarded',   saved.onboarded   || false);
      state.set('logs',        saved.logs        || []);
      state.set('wellness',    saved.wellness    || []);
      state.set('athletes',    saved.athletes    || []);
      state.set('sessions',    saved.sessions    || []);
    }
  } catch (e) {
    console.warn('[PIQ] Could not restore state:', e);
  }

  // ── Determine initial route ──────────────────────────────────
  const role      = state.get('role');
  const onboarded = state.get('onboarded');

  if (!role) {
    return ROUTES.WELCOME;
  }

  if (!onboarded) {
    return ROUTES.ONBOARDING;
  }

  // Route to role home
  switch (role) {
    case 'coach':   return ROUTES.COACH_HOME;
    case 'athlete':
    case 'player':  return ROUTES.PLAYER_HOME;
    case 'parent':  return ROUTES.PARENT_HOME;
    case 'admin':   return ROUTES.ADMIN_HOME;
    case 'solo':    return ROUTES.SOLO_HOME;
    default:        return ROUTES.WELCOME;
  }
}

/**
 * Detect OTP expired / auth error in URL hash and stash a message
 * for the sign-in view to display.
 */
function _checkAuthError() {
  const hash   = window.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.replace('#', ''));
  const error  = params.get('error_code') || params.get('error');

  if (error === 'otp_expired' || error === 'access_denied') {
    history.replaceState(null, '', window.location.pathname);
    sessionStorage.setItem(
      'piq_auth_msg',
      'That confirmation link expired. Enter your email to get a new one.'
    );
  }
}
