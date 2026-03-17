/**
 * Solo Today View — daily workout for solo athlete
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getReadinessScore, getReadinessColor, getReadinessExplain } from '../../state/selectors.js';
import { EXERCISES }    from '../../data/exerciseLibrary.js';

export function renderSoloToday() {
  const user      = getCurrentUser();
  const fname     = user?.name?.split(' ')[0] || 'Athlete';
  const readiness = getReadinessScore();
  const color     = getReadinessColor(readiness);
  const explain   = getReadinessExplain(readiness);
  const sport     = user?.sport || 'track';

  const sportExercises = EXERCISES.filter(e => e.sports.includes(sport)).slice(0,5);
  const workoutItems = sportExercises.length >= 3 ? sportExercises : EXERCISES.slice(0,5);

  const exerciseRows = workoutItems.map((e, i) => `
  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
    <div style="width:32px;height:32px;border-radius:8px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--text-muted)">${i+1}</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${e.name}</div>
      <div style="font-size:12px;color:var(--text-muted)">${e.category} · ${e.tags.slice(0,2).join(', ')}</div>
    </div>
    <div style="text-align:right;font-size:12px;color:var(--text-muted)">3 × 8</div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/today')}
  <main class="page-main">
    <div class="page-header">
      <h1>Today's Session</h1>
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
          <div class="panel-title">Your Workout — ${sport.charAt(0).toUpperCase()+sport.slice(1)}</div>
          <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px">${workoutItems.length} exercises · ~50 min · ${readiness>=80?'High':'Moderate'} intensity</div>
          ${exerciseRows}
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn-primary" style="flex:1;font-size:13px;padding:12px" data-route="solo/log">Log Session</button>
            <button class="btn-draft" style="flex:1;font-size:13px;padding:12px" data-route="solo/builder">Modify</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Training Notes</div>
        <div style="padding:14px;background:var(--surface-2);border-radius:10px;margin-top:8px;font-size:13px;color:var(--text-primary);line-height:1.6">
          ${readiness>=80
            ? 'Great readiness today. Push intensity on your main lifts and sprint work. Focus on quality reps over quantity.'
            : readiness>=60
            ? 'Moderate readiness. Train at 80–85% of normal intensity. Prioritise technique and avoid max-effort attempts.'
            : 'Low readiness detected. Consider a recovery-focused session: mobility, light movement, and foam rolling only.'}
        </div>
        <div class="panel-title" style="margin-top:16px">Warm-Up Protocol</div>
        <div style="margin-top:8px">
          ${['5 min light jog or bike','Hip circles × 10 each side','Leg swings × 10 each side','Ankle rotations × 10 each side','Dynamic lunges × 6 each leg','High knees × 20m'].map(w=>`
          <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--piq-green)">→</span>
            <span style="font-size:12.5px;color:var(--text-primary)">${w}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}
