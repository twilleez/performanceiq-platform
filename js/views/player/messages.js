import { showToast } from '../../core/notifications.js';
import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';

const DEMO_MESSAGES = [
  { id:1, from:'Coach Alex', avatar:'CA', role:'Coach', time:'Today 9:14 AM', preview:'Great effort in this morning\'s session! Your RPE is trending in the right...', unread:true },
  { id:2, from:'Team PIQ',   avatar:'📣', role:'System', time:'Yesterday',    preview:'Your PIQ Score increased by 4 points this week. Keep up the consistency!', unread:false },
  { id:3, from:'Coach Alex', avatar:'CA', role:'Coach', time:'Mon',           preview:'I\'ve assigned you the Guard Speed program. Start this Thursday.', unread:false },
];

export function renderPlayerMessages() {
  const user = getCurrentUser();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/messages')}
  <main class="page-main">
    <div class="page-header">
      <h1>Messages <span>${DEMO_MESSAGES.filter(m=>m.unread).length > 0 ? `<span style="font-size:14px;font-weight:600;background:var(--piq-green);color:var(--piq-navy);padding:2px 8px;border-radius:10px;margin-left:6px">${DEMO_MESSAGES.filter(m=>m.unread).length} new</span>` : ''}</span></h1>
      <p>Messages from coaches and team notifications</p>
    </div>
    <div class="panels-2">
      <div class="panel">
        ${DEMO_MESSAGES.map(m => `
        <div class="athlete-row" style="cursor:pointer;${m.unread ? 'background:rgba(57,230,107,.04);border-radius:10px;padding:2px 6px;margin:-2px -6px;' : ''}">
          <div class="athlete-avatar" style="background:${m.role==='Coach'?'linear-gradient(135deg,var(--piq-blue),var(--piq-navy-light))':'linear-gradient(135deg,var(--piq-green),var(--piq-green-dark))'}">${m.avatar}</div>
          <div class="athlete-info">
            <div class="athlete-name" style="display:flex;align-items:center;gap:6px">
              ${m.from}
              ${m.unread ? '<span style="width:7px;height:7px;background:var(--piq-green);border-radius:50%;display:inline-block"></span>' : ''}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${m.preview}</div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);flex-shrink:0">${m.time}</div>
        </div>`).join('')}
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <div style="display:flex;gap:10px">
            <input type="text" placeholder="Type a message..." style="flex:1;padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg-input);color:var(--text-primary);font-size:13px;outline:none">
            <button class="btn-assign" style="padding:10px 18px;font-size:13px" onclick="showToast('Messages require Supabase to be connected.')">Send</button>
          </div>
          <p style="font-size:11.5px;color:var(--text-muted);margin-top:8px">💬 Real-time messaging activates when Supabase is connected.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Team Announcements</div>
        <div class="sched-row"><div class="sched-dot"></div><div><div class="sched-title">New Program Assigned</div><div class="sched-desc">Coach Alex · Guard Speed 4-Week · Starts Thu</div></div></div>
        <div class="sched-row"><div class="sched-dot blue"></div><div><div class="sched-title">Readiness Check-In</div><div class="sched-desc">Daily check-in is now active. Log how you feel each morning.</div></div></div>
        <div class="sched-row"><div class="sched-dot gray"></div><div><div class="sched-title">Team Goal: 80% Readiness</div><div class="sched-desc">Team average is currently 76%. 4 more points to hit the goal!</div></div></div>
      </div>
    </div>
  </main>
</div>`;
}
