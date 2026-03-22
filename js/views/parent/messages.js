import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
export function renderParentMessages() {
  const user = getCurrentUser();
  const threads = [
    {name:'Coach Alex Morgan',avatar:'🎽',time:'2h ago',preview:'Quick note on this week's schedule — practice moved to Thursday.',unread:true},
    {name:'Team Parent Group',avatar:'👥',time:'Yesterday',preview:'Car pool coordination for Friday's away game?',unread:false},
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/messages')}
  <main class="page-main">
    <div class="page-header"><h1>Messages</h1><p>Coach communications and team updates</p></div>
    <div style="display:grid;grid-template-columns:320px 1fr;gap:20px;max-width:900px">
      <div class="panel" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;font-size:13px">Conversations</div>
        ${threads.map(t=>`
        <div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:${t.unread?'var(--surface-2)':'transparent'}">
          <div style="width:38px;height:38px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:16px">${t.avatar}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-weight:${t.unread?700:600};font-size:13px;color:var(--text-primary)">${t.name}</span><span style="font-size:11px;color:var(--text-muted)">${t.time}</span></div>
            <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.preview}</div>
          </div>
        </div>`).join('')}
      </div>
      <div class="panel" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px">
        <div style="font-size:36px;margin-bottom:12px">💬</div>
        <div style="font-weight:600;font-size:15px;color:var(--text-primary)">Select a conversation</div>
      </div>
    </div>
  </main>
</div>`;
}