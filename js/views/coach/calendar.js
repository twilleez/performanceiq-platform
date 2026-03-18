import { buildSidebar } from '../../components/nav.js';

export function renderCoachCalendar() {
  const today = new Date();
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const month = today.toLocaleDateString('en-US',{month:'long',year:'numeric'});

  // Build mini calendar for current month
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  let calCells = Array(firstDay).fill('').concat([...Array(daysInMonth)].map((_,i)=>i+1));
  while (calCells.length % 7 !== 0) calCells.push('');

  const scheduleItems = [
    { time:'9:00 AM', title:'Morning Weights', desc:'Full team · Strength & Conditioning', color:'var(--piq-green)' },
    { time:'11:30 AM', title:'Film Session', desc:'Game prep · Opponent scouting', color:'var(--piq-blue)' },
    { time:'2:00 PM', title:'Practice', desc:'Skill work + 5v5 scrimmage · 90 min', color:'var(--piq-green)' },
    { time:'5:00 PM', title:'Recovery', desc:'Ice bath, stretching, optional', color:'var(--g400)' },
  ];

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/calendar')}
  <main class="page-main">
    <div class="page-header"><h1>Team <span>Calendar</span></h1><p>${month}</p></div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Today's Schedule</div>
        ${scheduleItems.map(s=>`
        <div class="sched-row">
          <span class="sched-time">${s.time}</span>
          <div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0;margin-top:4px"></div>
          <div><div class="sched-title">${s.title}</div><div class="sched-desc">${s.desc}</div></div>
        </div>`).join('')}
      </div>
      <div class="panel">
        <div class="panel-title">${month}</div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center">
          ${days.map(d=>`<div style="font-size:11px;font-weight:700;color:var(--text-muted);padding:4px">${d}</div>`).join('')}
          ${calCells.map(d => d === '' ? '<div></div>' : `
          <div style="padding:6px 4px;border-radius:6px;font-size:12.5px;font-weight:${d===today.getDate()?'700':'400'};
            background:${d===today.getDate()?'var(--piq-green)':'transparent'};
            color:${d===today.getDate()?'var(--piq-navy)':'var(--text-primary)'};cursor:pointer">${d}</div>`).join('')}
        </div>
        <div style="margin-top:16px;font-size:12.5px;color:var(--text-muted)">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--piq-green);margin-right:5px"></span>Today
        </div>
      </div>
    </div>
  </main>
</div>`;
}
