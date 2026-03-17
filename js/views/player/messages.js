/**
 * Player Messages View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

export function renderPlayerMessages() {
  const user = getCurrentUser();

  const threads = [
    { name: 'Coach Alex Morgan', role: 'Coach', avatar: '🎽', time: '9:05 AM', preview: 'Great effort in yesterday\'s session. Focus on your first-step explosion today.', unread: true },
    { name: 'Team Channel', role: 'Group', avatar: '👥', time: 'Yesterday', preview: 'Practice moved to 4:00 PM tomorrow. Bring your training gear.', unread: true },
    { name: 'Maria Chen (Parent)', role: 'Parent', avatar: '👨‍👩‍👦', time: 'Mon', preview: 'Jake, don\'t forget your recovery shake after practice.', unread: false },
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
  ${buildSidebar('player','player/messages')}
  <main class="page-main">
    <div class="page-header">
      <h1>Messages</h1>
      <p>Stay connected with your coach and team</p>
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
