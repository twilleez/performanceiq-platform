import { router } from '../../core/router.js';
import { mark }   from '../../components/logo.js';

export function renderAdminHome(container) {
  container.innerHTML = `
    <div class="view-screen">
      <div class="view-nav-bar">
        <button class="back-btn" onclick="history.back()">←</button>
        <div class="view-nav-title">ADMIN PANEL</div>
        <div style="width:36px;"></div>
      </div>
      <div class="coming-soon-wrap">
        <div class="coming-soon-logo">${mark(56)}</div>
        <div class="coming-soon-icon">🏛️</div>
        <div class="coming-soon-title">Admin Panel</div>
        <p class="coming-soon-body">Platform oversight, user management, and organisation-wide analytics.</p>
        <button class="coming-soon-notify" id="notify-btn">
          🔔 Notify me when it's ready
        </button>
      </div>
    </div>`;

  const notifyBtn = container.querySelector('#notify-btn');
  const flagKey = 'piq_notify_admin_home';
  
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
