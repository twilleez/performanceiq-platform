/**
 * Player Today View — daily workout plan
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getReadinessScore, getReadinessColor, getReadinessExplain } from '../../state/selectors.js';
import { EXERCISES }    from '../../data/exerciseLibrary.js';

export function renderPlayerToday() {
  const user      = getCurrentUser();
  const fname     = user?.name?.split(' ')[0] || 'Athlete';
  const readiness = getReadinessScore();
  const color     = getReadinessColor(readiness);
  const explain   = getReadinessExplain(readiness);
  const sport     = user?.sport || 'basketball';

  const sportExercises = EXERCISES.filter(e => e.sports.includes(sport)).slice(0,4);
  const workoutItems = sportExercises.length > 0 ? sportExercises : EXERCISES.slice(0,4);

  const exerciseRows = workoutItems.map((e, i) => `
  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--text-muted)">${i+1}</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${e.name}</div>
      <div style="font-size:12px;color:var(--text-muted)">${e.category} · ${e.tags.slice(0,2).join(', ')}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:var(--text-muted)">3 × 8</div>
    </div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/today')}
  <main class="page-main">
    <div class="page-header">
      <h1>Today's Training</h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
    </div>
    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Readiness Check</div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:12px">
            <div style="width:64px;height:64px;border-radius:50%;border:4px solid ${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <span style="font-weight:700;font-size:18px;color:${color}">${readiness}</span>
            </div>
            <div>
              <div style="font-weight:600;font-size:14px;color:var(--text-primary);margin-bottom:4px">${readiness>=80?'High Readiness':readiness>=60?'Moderate Readiness':'Low Readiness'}</div>
              <div style="font-size:12.5px;color:var(--text-muted)">${explain}</div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Today's Workout — ${sport.charAt(0).toUpperCase()+sport.slice(1)}</div>
          <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px">4 exercises · ~45 min · ${readiness>=80?'High':'Moderate'} intensity</div>
          ${exerciseRows}
          <button class="btn-primary" style="width:100%;margin-top:16px;font-size:13px;padding:12px" data-route="player/log">Log This Workout</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Coaching Notes</div>
        <div style="padding:14px;background:var(--surface-2);border-radius:10px;margin-top:8px">
          <div style="font-size:13px;color:var(--text-primary);line-height:1.6">
            Focus on explosive first step today. Keep rest periods at 90 seconds between sets. 
            ${readiness<60?'<strong>Note:</strong> Your readiness is low — consider reducing intensity by 20% and skipping the plyometric work today.':'Good energy today — push the sprint work.'}
          </div>
        </div>
        <div class="panel-title" style="margin-top:16px">Recovery Reminders</div>
        <div style="margin-top:8px">
          ${['Hydrate: 16–24 oz water before training','Dynamic warm-up: 8–10 min','Cool-down: 5 min static stretch','Log RPE after each set'].map(r=>`
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--piq-green);font-size:14px">✓</span>
            <span style="font-size:12.5px;color:var(--text-primary)">${r}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}
