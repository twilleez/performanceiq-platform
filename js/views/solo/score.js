import { router } from '../../core/router.js';
import { mark }   from '../../components/logo.js';

export function renderSoloScore(container) {
  container.innerHTML = `
    <div class="view-screen">
      <div class="view-nav-bar">
        <button class="back-btn" onclick="history.back()">←</button>
        <div class="view-nav-title">PERFORMANCE SCORE</div>
        <div style="width:36px;"></div>
      </div>
      <div class="coming-soon-wrap">
        <div class="coming-soon-logo">${mark(56)}</div>
        <div class="coming-soon-icon">🎯</div>
        <div class="coming-soon-title">Performance Score</div>
        <p class="coming-soon-body">Your full PIQ breakdown — training consistency, readiness index, compliance, and load management.</p>
        <button class="coming-soon-notify" id="notify-btn">
          🔔 Notify me when it's ready
        </button>
      </div>
    </div>`;

  const notifyBtn = container.querySelector('#notify-btn');
  const flagKey = 'piq_notify_solo_score';
  
  if (localStorage.getItem(flagKey)) {
    notifyBtn.textContent = '✓ You're on the list';
    notifyBtn.classList.add('notified');
    notifyBtn.disabled = true;
  }

  notifyBtn?.addEventListener('click', () => {
    localStorage.setItem(flagKey, '1');
    notifyBtn.textContent = '✓ You're on the list';
    notifyBtn.classList.add('notified');
    notifyBtn.disabled = true;
  });
}
