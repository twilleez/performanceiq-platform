/**
 * Coach Calendar View — training schedule
 */
import { buildSidebar } from '../../components/nav.js';

export function renderCoachCalendar() {
  const today = new Date();
  const month = today.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const weekDays = days.map((d,i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const isToday = date.toDateString() === today.toDateString();
    return `
    <div style="flex:1;text-align:center;padding:10px 4px;border-radius:10px;background:${isToday?'var(--piq-green)':'transparent'}">
      <div style="font-size:11px;color:${isToday?'#0d1b3e':'var(--text-muted)'};margin-bottom:4px">${d}</div>
      <div style="font-size:16px;font-weight:700;color:${isToday?'#0d1b3e':'var(--text-primary)'}">${date.getDate()}</div>
    </div>`;
  }).join('');

  const events = [
    { day: 'Monday', time: '7:00 AM', title: 'Morning Conditioning', type: 'practice', color: '#3b82f6' },
    { day: 'Monday', time: '3:30 PM', title: 'Skill Development Session', type: 'practice', color: '#3b82f6' },
    { day: 'Tuesday', time: '7:00 AM', title: 'Strength & Power Block', type: 'strength', color: '#22c955' },
    { day: 'Wednesday', time: '3:30 PM', title: 'Scrimmage — Full Team', type: 'game', color: '#f59e0b' },
    { day: 'Thursday', time: '7:00 AM', title: 'Recovery & Mobility', type: 'recovery', color: '#a78bfa' },
    { day: 'Friday', time: '3:30 PM', title: 'Pre-Game Walkthrough', type: 'practice', color: '#3b82f6' },
    { day: 'Saturday', time: '10:00 AM', title: 'Game Day', type: 'game', color: '#f59e0b' },
  ];

  const eventList = events.map(e => `
  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
    <div style="width:4px;height:40px;border-radius:2px;background:${e.color};flex-shrink:0"></div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${e.title}</div>
      <div style="font-size:12px;color:var(--text-muted)">${e.day} · ${e.time}</div>
    </div>
    <span style="font-size:11px;padding:3px 8px;border-radius:20px;background:${e.color}22;color:${e.color};font-weight:600;text-transform:uppercase">${e.type}</span>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/calendar')}
  <main class="page-main">
    <div class="page-header">
      <h1>Team Calendar</h1>
      <p>${month}</p>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <div class="panel-title">This Week</div>
      <div style="display:flex;gap:4px;margin-top:8px">${weekDays}</div>
    </div>
    <div class="panel">
      <div class="panel-title">Upcoming Events</div>
      ${eventList}
    </div>
  </main>
</div>`;
}
