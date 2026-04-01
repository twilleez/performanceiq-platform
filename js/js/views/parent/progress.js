/**
 * Parent Progress View — athlete progress overview for parent
 * Reads from real state. Language is parent-facing (non-technical).
 */
import { buildSidebar }   from '../../components/nav.js';
import { getRoster, getState } from '../../state/state.js';
import { getScoreBreakdown, getWorkoutCount, getStreak } from '../../state/selectors.js';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function renderParentProgress() {
  const roster    = getRoster();
  const state     = getState();
  const athlete   = roster[0] || { name: 'Jake Williams', readiness: 82, piq: 79, streak: 5, sport: 'basketball' };
  const breakdown = getScoreBreakdown();
  const sessions  = getWorkoutCount();
  const streak    = getStreak();
  const logs      = state.workoutLog || [];
  const now       = Date.now();
  const day7      = now - 7  * 86_400_000;
  const day30     = now - 30 * 86_400_000;
  const logs7d    = logs.filter(l => l.ts >= day7).length;
  const logs30d   = logs.filter(l => l.ts >= day30).length;

  const piqColor  = breakdown.total >= 80 ? '#22c955' : breakdown.total >= 65 ? '#f59e0b' : '#ef4444';
  const piqLabel  = breakdown.total >= 80 ? 'Excellent' : breakdown.total >= 65 ? 'Good' : 'Developing';
  const rdyColor  = athlete.readiness >= 80 ? '#22c955' : athlete.readiness < 60 ? '#ef4444' : '#f59e0b';

  // Parent-friendly component labels
  const components = [
    {
      label: 'Training Consistency',
      key:   'consistency',
      icon:  '🔥',
      desc:  'How regularly your athlete shows up and trains. Consistency is the #1 predictor of long-term development.',
      parentTip: 'Encourage a consistent schedule — same days, same time. Routine builds habit.',
    },
    {
      label: 'Physical Readiness',
      key:   'readiness',
      icon:  '💚',
      desc:  'Based on sleep quality, soreness, energy, and mood. High readiness = good day to push hard.',
      parentTip: 'Sleep is the biggest lever you control. Prioritize 8–10 hours, especially before game days.',
    },
    {
      label: 'Workout Completion',
      key:   'compliance',
      icon:  '✅',
      desc:  'Percentage of planned sessions completed. Higher is better — gaps in training slow progress.',
      parentTip: 'Help remove scheduling barriers: rides, gear, nutrition timing. Small logistics make a big difference.',
    },
    {
      label: 'Training Load Balance',
      key:   'load',
      icon:  '⚖️',
      desc:  'Whether your athlete is overtraining, undertraining, or in the optimal zone.',
      parentTip: 'If this score is low, your athlete may need rest or lighter sessions — not more intensity.',
    },
    {
      label: 'Mental Readiness',
      key:   'mindset',
      icon:  '🧠',
      desc:  'Mindset, focus, and mental preparation quality.',
      parentTip: 'Ask open-ended questions before training: "How are you feeling today?" builds self-awareness.',
    },
  ];

  const componentRows = components.map(c => {
    const comp = breakdown[c.key] || { raw: 0, max: 20 };
    const pct  = Math.min(100, Math.round((comp.raw / comp.max) * 100));
    const col  = pct >= 75 ? '#22c955' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return `
    <div style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-weight:700;font-size:13.5px;color:var(--text-primary)">${c.icon} ${esc(c.label)}</span>
        <span style="font-weight:700;font-size:14px;color:${col}">${comp.raw} / ${comp.max}</span>
      </div>
      <div style="background:var(--surface-2);border-radius:4px;height:8px;margin-bottom:8px">
        <div style="height:8px;width:${pct}%;background:${col};border-radius:4px;transition:width .4s"></div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">${esc(c.desc)}</div>
      <div style="font-size:12px;color:var(--piq-green);background:var(--piq-green)11;padding:7px 10px;border-radius:8px">
        💡 <strong>Parent tip:</strong> ${esc(c.parentTip)}
      </div>
    </div>`;
  }).join('');

  // Weekly activity strip
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const activityDots = dayLabels.map((d, i) => {
    const active = logs.some(l => {
      const ld = new Date(l.ts);
      return ld.getDay() === ((i + 1) % 7);
    });
    return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px">
      <div style="width:14px;height:14px;border-radius:50%;background:${active?'var(--piq-green)':'var(--surface-2)'}"></div>
      <span style="font-size:10px;color:var(--text-muted)">${d}</span>
    </div>`;
  }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/progress')}
  <main class="page-main">
    <div class="page-header">
      <h1>Progress Overview</h1>
      <p>${esc(athlete.name)} · Performance trends and development</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-lbl">PIQ Score</div>
        <div class="kpi-val" style="color:${piqColor}">${breakdown.total}</div>
        <div class="kpi-chg">${piqLabel}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Sessions (30d)</div>
        <div class="kpi-val b">${logs30d || sessions}</div>
        <div class="kpi-chg">Logged workouts</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Current Streak</div>
        <div class="kpi-val">🔥 ${streak}d</div>
        <div class="kpi-chg">${streak >= 7 ? 'Outstanding' : streak >= 3 ? 'Building momentum' : 'Keep going'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Readiness Today</div>
        <div class="kpi-val" style="color:${rdyColor}">${athlete.readiness}%</div>
        <div class="kpi-chg">${athlete.readiness >= 80 ? 'Ready to train' : athlete.readiness < 60 ? 'Rest recommended' : 'Moderate'}</div>
      </div>
    </div>

    <!-- Weekly activity -->
    <div class="panel" style="margin-bottom:20px">
      <div class="panel-title">This Week's Activity</div>
      <div style="display:flex;justify-content:space-around;padding:12px 0">${activityDots}</div>
      <div style="font-size:12px;color:var(--text-muted);text-align:center;padding-bottom:4px">
        ${logs7d} session${logs7d !== 1 ? 's' : ''} logged this week · Target: 4 sessions/week
      </div>
    </div>

    <div class="panels-2">
      <div>${componentRows}</div>
      <div>
        <!-- PIQ explained for parents -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">What is the PIQ Score?</div>
          <div style="font-size:13px;color:var(--text-muted);line-height:1.7;margin-top:10px">
            The PIQ Score is a composite performance indicator calculated from five areas: training consistency, physical readiness, workout completion, load management, and mental readiness.
          </div>
          <div style="margin-top:12px">
            ${[['90–100','Elite','#a78bfa'],['75–89','Strong','#22c955'],['60–74','Developing','#f59e0b'],['Below 60','Needs focus','#ef4444']].map(([range, label, col]) => `
            <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
              <span style="background:${col}22;color:${col};font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700;min-width:65px;text-align:center">${range}</span>
              <span style="font-size:13px;color:var(--text-primary)">${label}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- Key insight -->
        <div class="panel" style="background:var(--piq-green)11;border:1px solid var(--piq-green)33">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:8px">SCIENCE INSIGHT FOR PARENTS</div>
          <div style="font-size:12.5px;color:var(--text-primary);line-height:1.7">
            Research consistently shows that adolescent athletes who achieve 8–10 hours of sleep improve reaction time, sprint speed, and mood — and reduce injury risk by up to 1.7× compared to athletes sleeping under 8 hours.
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Source: Milewski et al., Journal of Pediatric Orthopaedics, 2014</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
