import { getCurrentRoute } from './router.js';
import { getSession } from './core/auth.js';
import { submitBetaFeedback } from './services/feedbackService.js';

const PANEL_ID = 'piq-beta-feedback';

function ensurePanel() {
  if (!document.getElementById('piq-app')?.classList.contains('mounted')) return;
  if (document.getElementById(PANEL_ID)) return;

  const wrap = document.createElement('div');
  wrap.id = PANEL_ID;
  wrap.innerHTML = `
    <button class="piq-beta-feedback-btn" type="button" data-beta-open aria-label="Send beta feedback">
      <span aria-hidden="true">💬</span><span>Beta Feedback</span>
    </button>
    <dialog class="piq-beta-dialog" aria-labelledby="piq-beta-title">
      <form class="piq-beta-form" method="dialog" novalidate>
        <div class="piq-beta-head">
          <div>
            <div class="piq-beta-kicker">Controlled Beta</div>
            <h2 id="piq-beta-title">Tell us what happened</h2>
          </div>
          <button type="button" class="piq-beta-close" data-beta-close aria-label="Close feedback">×</button>
        </div>
        <p class="piq-beta-copy">Your role, current screen, device size and browser are attached automatically. Do not include passwords or other sensitive information.</p>
        <div class="piq-beta-grid">
          <label>Type
            <select name="category">
              <option value="usability">Hard to use</option>
              <option value="bug">Something is broken</option>
              <option value="confusing">Something is confusing</option>
              <option value="feature">Feature idea</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>Impact
            <select name="severity">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="blocking">Blocks me</option>
            </select>
          </label>
        </div>
        <label class="piq-beta-message">What happened?
          <textarea name="message" rows="5" maxlength="2000" required placeholder="What were you trying to do? What happened instead?"></textarea>
        </label>
        <div class="piq-beta-route">Screen: <strong data-beta-route></strong></div>
        <div class="piq-beta-status" data-beta-status role="status" aria-live="polite"></div>
        <div class="piq-beta-actions">
          <button type="button" class="piq-beta-secondary" data-beta-close>Cancel</button>
          <button type="submit" class="piq-beta-submit">Send feedback</button>
        </div>
      </form>
    </dialog>`;

  document.body.appendChild(wrap);
  bindPanel(wrap);
}

function bindPanel(wrap) {
  const dialog = wrap.querySelector('dialog');
  const form = wrap.querySelector('form');
  const status = wrap.querySelector('[data-beta-status]');
  const submit = wrap.querySelector('.piq-beta-submit');

  wrap.querySelector('[data-beta-open]')?.addEventListener('click', () => {
    wrap.querySelector('[data-beta-route]').textContent = getCurrentRoute() || 'unknown';
    status.textContent = getSession()?.isDemo
      ? 'Demo mode: feedback can be reviewed here, but it will not be written to production.'
      : '';
    dialog.showModal();
    form.querySelector('textarea')?.focus();
  });

  wrap.querySelectorAll('[data-beta-close]').forEach(btn =>
    btn.addEventListener('click', () => dialog.close()));

  dialog.addEventListener('click', e => {
    if (e.target === dialog) dialog.close();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const values = new FormData(form);
    const message = String(values.get('message') || '').trim();
    if (message.length < 3) {
      status.textContent = 'Please describe what happened.';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending…';
    status.textContent = '';

    const result = await submitBetaFeedback({
      category: String(values.get('category') || 'usability'),
      severity: String(values.get('severity') || 'medium'),
      message,
      route: getCurrentRoute(),
    });

    submit.disabled = false;
    submit.textContent = 'Send feedback';

    if (!result.ok) {
      status.textContent = result.error || 'Feedback could not be sent.';
      return;
    }

    status.textContent = 'Feedback sent. Thank you.';
    form.querySelector('textarea').value = '';
    setTimeout(() => dialog.close(), 800);
  });
}

function syncPanel() {
  const mounted = document.getElementById('piq-app')?.classList.contains('mounted');
  if (mounted) ensurePanel();
  else document.getElementById(PANEL_ID)?.remove();
}

document.addEventListener('piq:viewRendered', syncPanel);
document.addEventListener('piq:authRendered', syncPanel);
window.addEventListener('DOMContentLoaded', () => setTimeout(syncPanel, 0));
