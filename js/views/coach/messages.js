import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
import { getCurrentUser } from '../../core/auth.js';
export function renderCoachMessages() {
  const user = getCurrentUser();
  const roster = getRoster();
  const threads = [
    { name:'Team Channel', sub:'All Athletes', time:'2m ago', preview:'Practice tomorrow at 4:00 PM. Full intensity.', unread:2, icon:'👥' },
    { name:roster[0]?.name||'Marcus T.', sub:'Player', time:'18m ago', preview:'Coach, my hamstring is feeling tight today.', unread:1, icon:'🏃' },
    { name:roster[1]?.name||'Devon W.', sub:'Player', time:'1h ago', preview:'Completed today's session. Felt great!', unread:0, icon:'🏃' },
    { name:'Parent: Lee Family', sub:'Parent', time:'Yesterday', preview:'Quick question about weekend practice schedule.', unread:0, icon:'👨‍👧' },
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/messages')}
  <main class="page-main">
    <div class="page-header"><h1>Messages</h1><p>Coach communications · ${threads.filter(t=>t.unread).length} unread</p></div>
    <div style="display:grid;grid-template-columns:320px 1fr;gap:20px;max-width:900px">
      <div class="panel" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;font-size:13px">Conversations</div>
        ${threads.map(t=>`
        <div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:${t.unread?'var(--surface-2)':'transparent'}">
          <div style="width:38px;height:38px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${t.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px">
              <span style="font-weight:${t.unread?700:600};font-size:13px;color:var(--text-primary)">${t.name}</span>
              <span style="font-size:11px;color:var(--text-muted)">${t.time}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.preview}</div>
          </div>
          ${t.unread?`<div style="width:18px;height:18px;border-radius:50%;background:var(--piq-green);color:#0d1b3e;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${t.unread}</div>`:''}
        </div>`).join('')}
      </div>
      <div class="panel" style="display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:300px">
        <div style="font-size:36px;margin-bottom:12px">💬</div>
        <div style="font-weight:600;font-size:15px;color:var(--text-primary);margin-bottom:6px">Select a conversation</div>
        <div style="font-size:13px;color:var(--text-muted)">Choose a thread from the list to start messaging</div>
      </div>
    </div>
  </main>
</div>`;
}