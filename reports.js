import { buildSidebar } from '../../components/nav.js';
import { getCurrentRole } from '../../core/auth.js';
export function renderPlayerCalendar() {
  const role = getCurrentRole() || 'player';
  const today = new Date();
  const events = [
    {day:today.getDate(),label:'Team Practice',time:'4:00 PM',color:'#22c955',type:'Practice'},
    {day:today.getDate()+1,label:'Strength Training',time:'3:30 PM',color:'#3b82f6',type:'Training'},
    {day:today.getDate()+2,label:'Recovery Day',time:'All Day',color:'#f59e0b',type:'Recovery'},
    {day:today.getDate()+4,label:'Film Review',time:'5:00 PM',color:'#a78bfa',type:'Meeting'},
    {day:today.getDate()+5,label:'Game Day',time:'7:00 PM',color:'#ef4444',type:'Game'},
  ].filter(e=>e.day>0&&e.day<=31);
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role,role+'/calendar')}
  <main class="page-main">
    <div class="page-header"><h1>Calendar</h1><p>${today.toLocaleDateString('en-US',{month:'long',year:'numeric'})} · Practice and game schedule</p></div>
    <div class="kpi-row">
      ${[['🏃','Practices','4 this week'],['🏆','Games','1 this week'],['💚','Recovery','2 days'],['📅','Events','${events.length} upcoming']].map(([icon,label,sub])=>`
      <div class="kpi-card"><div class="kpi-lbl">${label}</div><div style="font-size:28px;margin:6px 0">${icon}</div><div class="kpi-chg">${sub}</div></div>`).join('')}
    </div>
    <div class="panel">
      <div class="panel-title">Upcoming Events</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
        ${events.map(e=>`
        <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--surface-2);border-radius:10px;border-left:4px solid ${e.color}">
          <div style="text-align:center;min-width:40px">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">${new Date(today.getFullYear(),today.getMonth(),e.day).toLocaleDateString('en-US',{weekday:'short'})}</div>
            <div style="font-size:22px;font-weight:700;color:var(--text-primary)">${e.day}</div>
          </div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${e.label}</div>
            <div style="font-size:12px;color:var(--text-muted)">${e.time}</div>
          </div>
          <span style="font-size:11px;padding:3px 8px;border-radius:8px;background:${e.color}20;color:${e.color};font-weight:600">${e.type}</span>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}