import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';

export function renderCoachMessages() {
  const roster = getRoster().slice(0,5);
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/messages')}
  <main class="page-main">
    <div class="page-header"><h1>Coach <span>Messages</span></h1><p>Communicate with your athletes</p></div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Athletes</div>
        ${roster.map(a=>`
        <div class="athlete-row" style="cursor:pointer">
          <div class="athlete-avatar">${a.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
          <div class="athlete-info">
            <div class="athlete-name">${a.name}</div>
            <div class="athlete-meta" style="color:var(--text-muted)">Tap to message</div>
          </div>
          <span style="font-size:11px;color:var(--text-muted)">—</span>
        </div>`).join('')}
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <div style="display:flex;gap:10px">
            <input type="text" placeholder="Message all athletes..." style="flex:1;padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg-input);color:var(--text-primary);font-size:13px;outline:none">
            <button class="btn-assign" style="padding:10px 18px;font-size:13px">Send</button>
          </div>
          <p style="font-size:11.5px;color:var(--text-muted);margin-top:8px">💬 Real-time messaging requires Supabase.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Announcements</div>
        <div class="sched-row"><div class="sched-dot"></div><div><div class="sched-title">New Workout Assigned</div><div class="sched-desc">Pre-Season Power Build · All athletes</div></div></div>
        <div class="sched-row"><div class="sched-dot blue"></div><div><div class="sched-title">Readiness Alert</div><div class="sched-desc">3 athletes below 60% today — check roster</div></div></div>
        <div style="margin-top:14px">
          <button class="btn-primary" style="width:auto;padding:10px 20px;font-size:13px" data-route="coach/roster">View Roster →</button>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
