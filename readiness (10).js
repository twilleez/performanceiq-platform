import { buildSidebar } from '../../components/nav.js';
import { getRoster, getState } from '../../state/state.js';
export function renderParentWeek() {
  const roster = getRoster();
  const state = getState();
  const a = roster.find(x=>x.id===state.linkedAthlete)||roster[0]||{};
  const today = new Date();
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const plan = [
    {day:'Monday',    title:'Team Practice',    time:'4:00 PM', type:'Practice',  intensity:'High',    color:'#22c955'},
    {day:'Tuesday',   title:'Strength Training',time:'3:30 PM', type:'Gym',       intensity:'Moderate',color:'#3b82f6'},
    {day:'Wednesday', title:'Recovery Day',     time:'All Day', type:'Recovery',  intensity:'Light',   color:'#f59e0b'},
    {day:'Thursday',  title:'Team Practice',    time:'4:00 PM', type:'Practice',  intensity:'High',    color:'#22c955'},
    {day:'Friday',    title:'Speed Work',       time:'3:30 PM', type:'Training',  intensity:'Moderate',color:'#3b82f6'},
    {day:'Saturday',  title:'Rest Day',         time:'All Day', type:'Rest',      intensity:'None',    color:'#94a3b8'},
    {day:'Sunday',    title:'Active Recovery',  time:'Morning', type:'Recovery',  intensity:'Light',   color:'#f59e0b'},
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/week')}
  <main class="page-main">
    <div class="page-header"><h1>Weekly <span>Plan</span></h1><p>${a.name||'Your Athlete'} · ${today.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px">
      ${plan.map((d,i)=>`
      <div style="padding:14px;border:1px solid ${d.intensity==='None'?'var(--border)':d.color+'40'};border-radius:12px;background:${d.intensity==='None'?'transparent':d.color+'0a'}">
        <div style="font-size:10px;font-weight:700;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">${d.day}</div>
        <div style="font-weight:700;font-size:13.5px;color:var(--text-primary);margin-bottom:4px">${d.title}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${d.time}</div>
        <span style="font-size:11px;padding:3px 8px;border-radius:8px;background:${d.color}20;color:${d.color};font-weight:700">${d.intensity}</span>
      </div>`).join('')}
    </div>
    <div class="panel">
      <div class="panel-title">Parent Guide — Understanding the Schedule</div>
      <div style="margin-top:12px;font-size:13px;color:var(--text-muted);line-height:1.7">
        <p style="margin:0 0 10px"><strong style="color:var(--text-primary)">High intensity</strong> days involve sprinting, heavy lifting, or competitive play. Ensure your athlete is well-rested and fueled beforehand.</p>
        <p style="margin:0 0 10px"><strong style="color:var(--text-primary)">Recovery sessions</strong> are intentionally light — don't encourage your athlete to skip them. Recovery is when adaptation actually happens.</p>
        <p style="margin:0"><strong style="color:var(--text-primary)">Rest days</strong> are programmed deliberately. Light walking or stretching is fine; additional intense training is not recommended.</p>
      </div>
    </div>
  </main>
</div>`;
}