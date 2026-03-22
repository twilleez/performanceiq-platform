import { buildSidebar } from '../../components/nav.js';
export function renderCoachCalendar() {
  const today = new Date();
  const month = today.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const events = [
    {day:today.getDate(),  label:'Team Practice',        time:'4:00 PM', color:'#22c955'},
    {day:today.getDate()+1,label:'Strength & Conditioning',time:'3:30 PM',color:'#3b82f6'},
    {day:today.getDate()+2,label:'Film Review',           time:'5:00 PM', color:'#a78bfa'},
    {day:today.getDate()+3,label:'Recovery Day',          time:'All Day',  color:'#f59e0b'},
    {day:today.getDate()+5,label:'Game vs. Riverside',    time:'7:00 PM', color:'#ef4444'},
    {day:today.getDate()+7,label:'Team Practice',         time:'4:00 PM', color:'#22c955'},
  ].filter(e=>e.day>0&&e.day<=31);
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/calendar')}
  <main class="page-main">
    <div class="page-header"><h1>Team <span>Calendar</span></h1><p>${month} · Practices, games, and events</p></div>
    <div style="display:grid;grid-template-columns:1fr 300px;gap:20px;max-width:900px">
      <div class="panel">
        <div class="panel-title">Upcoming Schedule</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
          ${events.map(e=>`
          <div style="display:flex;align-items:center;gap:14px;padding:12px;background:var(--surface-2);border-radius:10px;border-left:4px solid ${e.color}">
            <div style="text-align:center;min-width:40px">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">${new Date(today.getFullYear(),today.getMonth(),e.day).toLocaleDateString('en-US',{weekday:'short'})}</div>
              <div style="font-size:20px;font-weight:700;color:var(--text-primary)">${e.day}</div>
            </div>
            <div>
              <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${e.label}</div>
              <div style="font-size:12px;color:var(--text-muted)">${e.time}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">This Week Summary</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
            ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>`
            <div style="display:flex;align-items:center;gap:10px;font-size:12.5px">
              <span style="width:28px;color:var(--text-muted);font-weight:600">${d}</span>
              <div style="flex:1;height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${[80,60,0,90,40,0,0][i]}%;background:${['#22c955','#3b82f6','transparent','#22c955','#f59e0b','transparent','transparent'][i]};border-radius:3px"></div>
              </div>
              <span style="font-size:11px;color:var(--text-muted)">${['Practice','S&C','Rest','Practice','Light','Rest','Rest'][i]}</span>
            </div>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Quick Add</div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
            ${['Schedule Practice','Add Game','Plan Recovery Day'].map(label=>`
            <button class="btn-draft" style="font-size:12px;padding:8px 12px;text-align:left">+ ${label}</button>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}