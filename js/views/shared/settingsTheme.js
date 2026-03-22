import { getTheme, setTheme } from '../../core/theme.js';
import { getCurrentRole } from '../../core/auth.js';
import { buildSidebar } from '../../components/nav.js';

export function renderSettingsTheme() {
  const current = getTheme();
  const role = getCurrentRole() || 'solo';
  const opts = [
    { id:'light',  icon:'☀️', label:'Light' },
    { id:'dark',   icon:'🌙', label:'Dark' },
    { id:'system', icon:'⚙️', label:'System' },
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, 'settings/theme')}
  <main class="page-main">
    <div class="page-header"><h1>Theme <span>Settings</span></h1><p>Choose how PerformanceIQ looks.</p></div>
    <div class="panel" style="max-width:440px">
      <div class="panel-title">Appearance</div>
      <div style="display:flex;gap:12px;margin-top:14px">
        ${opts.map(o => `
        <div class="theme-opt ${current===o.id?'active':''}" data-theme="${o.id}"
          style="flex:1;text-align:center;padding:18px 8px;border-radius:12px;border:2px solid ${current===o.id?'var(--piq-green)':'var(--border)'};background:${current===o.id?'var(--piq-green-glow)':'transparent'};cursor:pointer;transition:all .15s">
          <div style="font-size:26px;margin-bottom:8px">${o.icon}</div>
          <div style="font-size:12px;font-weight:600;color:var(--text-primary)">${o.label}</div>
        </div>`).join('')}
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:14px">Current: <strong style="color:var(--text-primary)">${current}</strong></p>
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.querySelectorAll('.theme-opt[data-theme]').forEach(opt => {
    opt.addEventListener('click', () => {
      setTheme(opt.dataset.theme);
      document.querySelectorAll('.theme-opt').forEach(o => {
        const active = o.dataset.theme === opt.dataset.theme;
        o.style.borderColor = active ? 'var(--piq-green)' : 'var(--border)';
        o.style.background = active ? 'var(--piq-green-glow)' : 'transparent';
      });
    });
  });
});
