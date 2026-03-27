/**
 * Player Calendar View — upgraded v2
 * Connected to workoutLog and assignedWorkouts.
 * Shows completed sessions, upcoming assignments, and weekly schedule.
 */
import { buildSidebar }         from '../../components/nav.js';
import { getCurrentUser }       from '../../core/auth.js';
import { getWorkoutLog,
         getAssignedWorkouts }  from '../../state/state.js';
import { getStreak, getWeeklyProgress } from '../../state/selectors.js';

export function renderPlayerCalendar() {
  const user     = getCurrentUser();
  const log      = getWorkoutLog();
  const assigned = getAssignedWorkouts();
  const streak   = getStreak();
  const weekly   = getWeeklyProgress();

  const today    = new Date();
  const todayStr = today.toDateString();

  // ── Build a set of dates with completed sessions ──────────────
  const completedDates = new Set(
    log
      .filter(w => w.completed !== false)
      .map(w => new Date(w.ts).toDateString())
  );

  // ── Current week strip (Mon–Sun) ──────────────────────────────
  const dayOfWeek  = today.getDay(); // 0=Sun
  const monday     = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
    const date    = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toDateString();
    const isToday = dateStr === todayStr;
    const done    = completedDates.has(dateStr);
    const isPast  = date < today && !isToday;

    return `
    <div style="flex:1;text-align:center;padding:10px 4px;border-radius:10px;
                background:${isToday?'var(--piq-green)':'transparent'};
                border:1px solid ${isToday?'var(--piq-green)':done?'var(--piq-green)30':'transparent'}">
      <div style="font-size:10px;font-weight:600;color:${isToday?'#0d1b3e':'var(--text-muted)'};margin-bottom:4px">${d}</div>
      <div style="font-size:16px;font-weight:700;color:${isToday?'#0d1b3e':'var(--text-primary)'}">${date.getDate()}</div>
      <div style="margin-top:4px;height:6px;width:6px;border-radius:50%;
                  background:${done?'var(--piq-green)':isPast?'var(--surface-2)':'transparent'};
                  margin:4px auto 0"></div>
    </div>`;
  }).join('');

  // ── Month mini-calendar ───────────────────────────────────────
  const year  = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7; // shift to Mon=0

  let calCells = '';
  // Empty cells before month start
  for (let i = 0; i < offset; i++) {
    calCells += `<div></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date    = new Date(year, month, d);
    const dateStr = date.toDateString();
    const isToday = dateStr === todayStr;
    const done    = completedDates.has(dateStr);
    const isFut   = date > today;

    calCells += `
    <div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;
                border-radius:50%;font-size:11.5px;font-weight:${isToday?'700':'400'};
                background:${isToday?'var(--piq-green)':done?'var(--piq-green)20':'transparent'};
                color:${isToday?'#0d1b3e':isFut?'var(--text-muted)':done?'var(--piq-green)':'var(--text-primary)'};
                border:${done&&!isToday?'1px solid var(--piq-green)40':isToday?'2px solid var(--piq-green)':'1px solid transparent'};
                cursor:default">
      ${d}
    </div>`;
  }

  // ── Recent workout log entries ────────────────────────────────
  const recentSessions = [...log]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8)
    .map(w => {
      const d     = new Date(w.ts);
      const done  = w.completed !== false;
      const label = w.name || (w.type === 'checkin' ? 'Daily Check-In' : 'Training Session');
      const tag   = w.type === 'checkin' ? 'check-in' : w.isRecovery ? 'recovery' : 'workout';
      const tagC  = tag === 'check-in' ? '#3b82f6' : tag === 'recovery' ? '#a78bfa' : '#22c955';
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
        <div style="width:4px;height:36px;border-radius:2px;background:${done?tagC:'var(--border)'};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">
            ${d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
            ${w.avgRPE ? ` · RPE ${w.avgRPE}` : ''}
            ${w.duration ? ` · ${w.duration} min` : ''}
          </div>
        </div>
        <span style="font-size:11px;padding:3px 9px;border-radius:20px;
                     background:${done?tagC+'22':'var(--surface-2)'};
                     color:${done?tagC:'var(--text-muted)'};font-weight:600;white-space:nowrap">
          ${done ? tag : 'incomplete'}
        </span>
      </div>`;
    }).join('');

  // ── Assigned workouts ─────────────────────────────────────────
  const assignedCards = assigned.length > 0
    ? assigned.map(a => `
      <div style="padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
        <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${a.title || 'Assigned Workout'}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">From coach · ${a.dueDate ? 'Due: ' + new Date(a.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'No due date'}</div>
        ${a.completed ? `<span style="font-size:11px;color:#22c955;font-weight:600">✓ Complete</span>` :
          `<button class="btn-primary" style="font-size:11px;padding:6px 14px;margin-top:8px" data-route="player/today">Start Workout</button>`}
      </div>`)
      .join('')
    : `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12.5px">
        No assigned workouts. Your coach will push workouts here.
       </div>`;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player', 'player/calendar')}
  <main class="page-main">

    <div class="page-header">
      <h1>Training <span>Calendar</span></h1>
      <p>${today.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</p>
    </div>

    <!-- Weekly KPIs -->
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">This Week</div><div class="kpi-val g">${weekly.completed}/${weekly.target}</div><div class="kpi-chg">${weekly.onTrack?'On track':'Needs sessions'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${streak}d</div><div class="kpi-chg">Consecutive days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Total Sessions</div><div class="kpi-val b">${log.filter(w=>w.type!=='checkin').length}</div><div class="kpi-chg">All time</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Assigned</div><div class="kpi-val">${assigned.length}</div><div class="kpi-chg">From coach</div></div>
    </div>

    <!-- Week strip -->
    <div class="panel" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="panel-title" style="margin:0">This Week</div>
        <div style="font-size:12px;color:var(--text-muted)">${weekly.completed} of ${weekly.target} sessions · ${weekly.daysLeft}d left</div>
      </div>
      <div style="display:flex;gap:4px">${weekDays}</div>
    </div>

    <div class="panels-2">

      <!-- Left: Month calendar + recent sessions -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">${today.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-top:10px">
            ${['M','T','W','T','F','S','S'].map(d => `<div style="text-align:center;font-size:10px;font-weight:600;color:var(--text-muted);padding:4px 0">${d}</div>`).join('')}
            ${calCells}
          </div>
          <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--text-muted)">
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--piq-green);margin-right:4px"></span>Session logged</span>
            <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--piq-green);margin-right:4px;border:2px solid var(--piq-green)"></span>Today</span>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">Recent Activity</div>
          ${log.length === 0
            ? `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12.5px">No sessions yet. Start today's workout to begin tracking.</div>`
            : recentSessions}
          <div style="margin-top:12px;display:flex;gap:8px">
            <button class="btn-primary" style="font-size:12px;padding:9px 16px" data-route="player/today">Start Today's Session</button>
            <button class="btn-draft" style="font-size:12px;padding:9px 14px" data-route="player/log">Log Manually</button>
          </div>
        </div>
      </div>

      <!-- Right: Assigned workouts -->
      <div>
        <div class="panel">
          <div class="panel-title">Assigned by Coach</div>
          <div style="margin-top:10px">${assignedCards}</div>
        </div>
      </div>

    </div>
  </main>
</div>`;
}
