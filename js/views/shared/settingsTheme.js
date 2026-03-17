import { getTheme, setTheme } from '../../core/theme.js';
import { getCurrentRole }      from '../../core/auth.js';
import { buildSidebar }        from '../../components/nav.js';

export function renderSettingsTheme() {
  const current = getTheme();
  const role    = getCurrentRole() || 'solo';
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/settings')}
  <main class="page-main">
    <div class="page-header">
      <h1>Settings — <span>Theme</span></h1>
      <p>Choose how PerformanceIQ looks.</p>
    </div>
    <div class="panel" style="max-width:440px">
      <div class="panel-title">Appearance</div>
      <div class="theme-options">
        <div class="theme-opt ${current==='light'?'active':''}" data-theme="light">
          <div class="theme-opt-icon">☀️</div>
          <div class="theme-opt-label">Light</div>
        </div>
        <div class="theme-opt ${current==='dark'?'active':''}" data-theme="dark">
          <div class="theme-opt-icon">🌙</div>
          <div class="theme-opt-label">Dark</div>
        </div>
        <div class="theme-opt ${current==='system'?'active':''}" data-theme="system">
          <div class="theme-opt-icon">⚙️</div>
          <div class="theme-opt-label">System</div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:12px">
        Current: <strong style="color:var(--text-primary)">${current}</strong>
      </p>
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.querySelectorAll('.theme-opt[data-theme]').forEach(opt => {
    opt.addEventListener('click', () => {
      setTheme(opt.dataset.theme);
      document.querySelectorAll('.theme-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });
});
