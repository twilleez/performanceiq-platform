import { buildSidebar } from '../../components/nav.js';
import { getCurrentRole, getCurrentUser } from '../../core/auth.js';
export function renderPlayerMessages() {
  const role = getCurrentRole() || 'player';
  const user = getCurrentUser();
  const threads = [
    {name:'Coach Alex Morgan',role:'Coach',avatar:'🎽',time:'9:05 AM',preview:'Great effort yesterday. Focus on first-step explosion today.',unread:true},
    {name:'Team Channel',role:'Group',avatar:'👥',time:'Yesterday',preview:'Practice moved to 4:00 PM tomorrow. Bring your training gear.',unread:true},
    {name:'Maria Chen (Parent)',role:'Parent',avatar:'👨‍👩‍👦',time:'Mon',preview:'Don't forget your recovery shake after practice.',unread:false},
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role,role+'/messages')}
  <main class="page-main">
    <div class="page-header"><h1>Messages</h1><p>Stay connected with your coach and team</p></div>
    <div style="display:grid;grid-template-columns:320px 1fr;gap:20px;max-width:900px">
      <div class="panel" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center">Conversations<span style="background:var(--piq-green);color:#0d1b3e;border-radius:10px;font-size:10px;font-weight:700;padding:1px 7px">${threads.filter(t=>t.unread).length}</span></div>
        ${threads.map(t=>`
        <div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;background:${t.unread?'var(--surface-2)':'transparent'}">
          <div style="width:38px;height:38px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${t.avatar}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-weight:${t.unread?700:600};font-size:13px;color:var(--text-primary)">${t.name}</span><span style="font-size:11px;color:var(--text-muted)">${t.time}</span></div>
            <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.preview}</div>
          </div>
          ${t.unread?'<div style="width:8px;height:8px;border-radius:50%;background:var(--piq-green);flex-shrink:0;margin-top:5px"></div>':''}
        </div>`).join('')}
      </div>
      <div class="panel" style="display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:280px">
        <div style="font-size:36px;margin-bottom:12px">💬</div>
        <div style="font-weight:600;font-size:15px;color:var(--text-primary);margin-bottom:6px">Select a conversation</div>
        <div style="font-size:13px;color:var(--text-muted)">Choose a thread from the list</div>
      </div>
    </div>
  </main>
</div>`;
}