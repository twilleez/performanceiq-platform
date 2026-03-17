/**
 * Coach Messages View
 */
import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getState } from '../../state/state.js';

export function renderCoachMessages() {
  const user = getCurrentUser();
  const messages = getState().messages || [];

  const sampleThreads = [
    { name: 'Jake Williams', role: 'Player', avatar: '🏀', time: '9:14 AM', preview: 'Coach, I felt some tightness in my left hamstring during warm-up.', unread: true },
    { name: 'Marcus T.', role: 'Player', avatar: '🏅', time: 'Yesterday', preview: 'Thanks for the feedback on my sprint form. Working on it.', unread: false },
    { name: 'Maria Chen', role: 'Parent', avatar: '👨‍👩‍👦', time: 'Mon', preview: 'Can we schedule a check-in about Devon\'s progress this week?', unread: true },
    { name: 'Devon N.', role: 'Player', avatar: '🏅', time: 'Sun', preview: 'Ready for tomorrow\'s session. Legs feel great.', unread: false },
    { name: 'Aliyah N.', role: 'Player', avatar: '🏅', time: 'Fri', preview: 'Completed all the extra conditioning work you assigned.', unread: false },
  ];

  const threads = sampleThreads.map(t => `
  <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:${t.unread?'var(--surface-2)':'transparent'};transition:background .2s" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='${t.unread?'var(--surface-2)':'transparent'}'">
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
  ${buildSidebar('coach','coach/messages')}
  <main class="page-main">
    <div class="page-header">
      <h1>Messages</h1>
      <p>Team communication hub</p>
    </div>
    <div class="panel" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-weight:600;font-size:13.5px">Conversations</span>
        <button class="btn-primary" style="font-size:12px;padding:7px 14px">+ New Message</button>
      </div>
      ${threads}
    </div>
  </main>
</div>`;
}
