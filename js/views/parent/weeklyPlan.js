/**
 * Parent Week View — weekly training plan overview
 */
import { buildSidebar } from '../../components/nav.js';

export function renderParentWeek() {
  const today = new Date();
  const days  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekPlan = [
    { day: 'Monday',    type: 'practice',  title: 'Morning Conditioning',    time: '7:00 AM',  duration: '60 min',  intensity: 'High',     color: '#3b82f6' },
    { day: 'Tuesday',   type: 'strength',  title: 'Strength Block',          time: '3:30 PM',  duration: '50 min',  intensity: 'Moderate', color: '#22c955' },
    { day: 'Wednesday', type: 'game',      title: 'Team Scrimmage',          time: '3:30 PM',  duration: '90 min',  intensity: 'High',     color: '#f59e0b' },
    { day: 'Thursday',  type: 'recovery',  title: 'Recovery & Mobility',     time: '7:00 AM',  duration: '30 min',  intensity: 'Low',      color: '#a78bfa' },
    { day: 'Friday',    type: 'practice',  title: 'Speed & Agility',         time: '3:30 PM',  duration: '45 min',  intensity: 'Moderate', color: '#3b82f6' },
    { day: 'Saturday',  type: 'game',      title: 'Game Day',                time: '10:00 AM', duration: '120 min', intensity: 'High',     color: '#f59e0b' },
    { day: 'Sunday',    type: 'rest',      title: 'Rest Day',                time: '—',        duration: '—',       intensity: 'Rest',     color: '#6b7280' },
  ];

  const dayCards = weekPlan.map(d => {
    const date = new Date(startOfWeek);
    const dayIdx = days.indexOf(d.day);
    date.setDate(startOfWeek.getDate() + dayIdx);
    const isToday = date.toDateString() === today.toDateString();
    return `
    <div style="padding:14px;border:1px solid ${isToday?d.color:'var(--border)'};border-radius:12px;background:${isToday?d.color+'11':'transparent'}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:var(--text-muted)">${d.day.toUpperCase()}</span>
        ${isToday?`<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${d.color};color:#fff;font-weight:700">TODAY</span>`:''}
      </div>
      <div style="font-weight:600;font-size:13.5px;color:var(--text-primary);margin-bottom:4px">${d.title}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${d.time} · ${d.duration}</div>
      <span style="font-size:11px;padding:3px 8px;border-radius:10px;background:${d.color}22;color:${d.color};font-weight:600">${d.intensity}</span>
    </div>`;
  }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/week')}
  <main class="page-main">
    <div class="page-header">
      <h1>Weekly Plan</h1>
      <p>${today.toLocaleDateString('en-US',{month:'long',year:'numeric'})} · Training overview</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
      ${dayCards}
    </div>
    <div class="panel">
      <div class="panel-title">Parent Guide — Understanding the Schedule</div>
      <div style="margin-top:12px;font-size:13px;color:var(--text-primary);line-height:1.7">
        <p style="margin:0 0 10px"><strong>High intensity</strong> sessions involve sprinting, plyometrics, or competitive play. Ensure your athlete is well-rested and hydrated beforehand.</p>
        <p style="margin:0 0 10px"><strong>Recovery sessions</strong> are intentionally light. Do not encourage your athlete to skip these — they are essential for long-term development and injury prevention.</p>
        <p style="margin:0"><strong>Rest days</strong> are programmed for a reason. Active recovery (light walking, stretching) is fine, but avoid additional intense training.</p>
      </div>
    </div>
  </main>
</div>`;
}
