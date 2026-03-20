/**
 * Parent Messages View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderParentMessages() {
  const user = getCurrentUser();

  const threads = [
    { name: 'Coach Alex Morgan', role: 'Coach', avatar: '🎽', time: '9:30 AM', preview: 'Jake had a great session today. His first-step explosion is improving.', unread: true },
    { name: 'Jake Williams', role: 'Athlete', avatar: '🏀', time: 'Yesterday', preview: 'Mom, practice is at 3:30 today not 4:00.', unread: false },
    { name: 'Team Parents Group', role: 'Group', avatar: '👨‍👩‍👦', time: 'Mon', preview: 'Reminder: Game Saturday at 10 AM. Please arrive by 9:30.', unread: true },
  ].map(t => `
  <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:${t.unread?'var(--surface-2)':'transparent'}">
    <div style="width:40px;height:40px;border-radius:50%;background:var(--g200);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${t.avatar}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span style="font-weight:${t.unread?'700':'600'};font-size:13.5px;color:var(--text-primary)">${t.name}</span>
        <span style="font-size:11.5px;color:var(--text-muted)">${t.time}</span>
      </div>
      <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.preview}</div>
    </div>
    ${t.unread?`<div style="width:8px;height:8px;border-radius:50%;background:var(--piq-green);flex-shrink:0"></div>`:''}
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/messages')}
  <main class="page-main">
    <div class="page-header">
      <h1>Messages</h1>
      <p>Stay connected with coaches and your athlete</p>
    </div>
    <div class="panel" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
        <span style="font-weight:600;font-size:13.5px">Conversations</span>
      </div>
      ${threads}
    </div>
  </main>
</div>`;
}
