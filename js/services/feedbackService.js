import { supabase } from '../core/supabase.js';
import { getSession, getCurrentRole, getCurrentUser } from '../core/auth.js';

const VALID_CATEGORIES = new Set(['usability','bug','confusing','feature','other']);
const VALID_SEVERITIES = new Set(['low','medium','high','blocking']);

export async function submitBetaFeedback({ category, severity, message, route }) {
  const session = getSession();
  const user = getCurrentUser();
  const role = getCurrentRole();
  const cleanMessage = String(message || '').trim();

  if (!session || !user?.id || !role) {
    return { ok: false, error: 'You must be signed in to send beta feedback.' };
  }

  if (session.isDemo) {
    return {
      ok: false,
      demo: true,
      error: 'Demo feedback is not submitted to production. Sign in with a beta account to send feedback.',
    };
  }

  if (cleanMessage.length < 3) {
    return { ok: false, error: 'Please describe what happened.' };
  }

  const { data: authData, error: authError } = await supabase.auth.getSession();
  const sbUser = authData?.session?.user;
  if (authError || !sbUser || sbUser.id !== user.id) {
    return { ok: false, error: 'Your session could not be verified. Please sign in again.' };
  }

  const payload = {
    user_id: user.id,
    role,
    route: String(route || '').slice(0, 160) || null,
    category: VALID_CATEGORIES.has(category) ? category : 'usability',
    severity: VALID_SEVERITIES.has(severity) ? severity : 'medium',
    message: cleanMessage.slice(0, 2000),
    metadata: {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      path: window.location.pathname,
      hash: window.location.hash,
      userAgent: navigator.userAgent.slice(0, 500),
      app: 'performanceiq-platform',
    },
  };

  const { data, error } = await supabase
    .from('beta_feedback')
    .insert(payload)
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[PIQ] beta feedback failed:', error);
    return { ok: false, error: 'Feedback could not be sent. Please try again.' };
  }

  return { ok: true, id: data.id, createdAt: data.created_at };
}
