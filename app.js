/**
 * PerformanceIQ — Player PIQ Score View v2
 * ─────────────────────────────────────────────────────────────
 * PHASE 3: Compliance pillar now shows real assigned/completed data.
 * Score breakdown reads from calcPIQ (engines.js) which uses
 * sport-specific weights from SPORT_WEIGHTS.
 */
import { buildSidebar }                      from '../../components/nav.js';
import { getCurrentRole, getCurrentUser }    from '../../core/auth.js';
import { getScoreBreakdown, getReadinessColor,
         getACWRSeries }                     from '../../state/selectors.js';
import { getAssignedWorkouts, getWorkoutLog } from '../../state/state.js';

export function renderSoloScore() {
  const role       = getCurrentRole() || 'solo';
  const user       = getCurrentUser();
  const sb         = getScoreBreakdown();
  const color      = getReadinessColor(sb.total);
  const assigned   = getAssignedWorkouts();
  const log        = getWorkoutLog();
  const acwrSeries = getACWRSeries(7);
  const latestACWR = acwrSeries.filter(d => d.acwr !== null).at(-1);

  // Real compliance data: prefer assigned/completed ratio when assignments exist
  const assignedDone   = assigned.filter(w => w.completed).length;
  const selfLogged     = log.filter(w => w.completed).length;
  const totalSessions  = log.length;
  const selfCompliance = totalSessions ? Math.round((selfLogged / totalSessions) * 100) : 0;
  const hasAssigned    = assigned.length > 0;

  const pillars = [
    {
      key:   'consistency',
      label: 'Training Consistency',
      weight: sb.weights?.consistency ? Math.round(sb.weights.consistency * 100) + '%' : '28%',
      icon:  '📅',
      tip:   `${log.length} sessions logged · Streak and weekly frequency both count`,
      detail: null,
    },
    {
      key:   'readiness',
      label: 'Readiness Index',
      weight: sb.weights?.readiness ? Math.round(sb.weights.readiness * 100) + '%' : '27%',
      icon:  '💚',
      tip:   'Sleep 30% · Energy 15% · Soreness 20% · Fatigue 15% · Stress 10% · Mood 10% (Halson 2014)',
      detail: null,
    },
    {
      key:   'compliance',
      label: 'Workout Compliance',
      weight: sb.weights?.compliance ? Math.round(sb.weights.compliance * 100) + '%' : '20%',
      icon:  '✅',
      tip:   hasAssigned
        ? `${assignedDone} of ${assigned.length} assigned sessions completed`
        : `${selfLogged} of ${totalSessions} self-logged sessions completed`,
      detail: hasAssigned
        ? `${assignedDone}/${assigned.length} assigned`
        : `${selfCompliance}% self-logged`,
    },
    {
      key:   'load',
      label: 'Load Management',
      weight: sb.weights?.load ? Math.round(sb.weights.load * 100) + '%' : '15%',
      icon:  '⚖️',
      tip:   latestACWR
        ? `ACWR ${latestACWR.acwr} — ${latestACWR.zone.replace('-',' ')} (Gabbett BJSM 2016)`
        : 'Log 3+ sessions to unlock ACWR · Sweet spot 0.8–1.3 (Gabbett BJSM 2016)',
      detail: latestACWR ? `ACWR ${latestACWR.acwr}` : null,
    },
    {
      key:   'profile',
      label: 'Profile Completeness',
      weight: sb.weights?.profile ? Math.round(sb.weights.profile * 100) + '%' : '10%',
      icon:  '👤',
      tip:   'Sport, position, age, weight, team, and training goal all count',
      detail: null,
    },
  ];

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/score')}
  <main class="page-main">

    <div class="page-header">
      <h1>PIQ <span>Score</span></h1>
      <p>${user?.name || 'Athlete'} · Performance Intelligence Quotient · ${sb.sport ? sb.sport.charAt(0).toUpperCase() + sb.sport.slice(1) : 'Sport'} weights</p>
    </div>

    <!-- Score hero -->
    <div style="text-align:center;padding:32px 20px;
                background:linear-gradient(135deg,#0d1b3e,#1a2f5e);
                border-radius:16px;margin-bottom:24px;border:1px solid #22c95530">
      <div style="font-family:'Oswald',sans-serif;font-size:72px;font-weight:700;
                  color:${color};line-height:1">${sb.total}</div>
      <div style="font-size:14px;color:rgba(255,255,255,.6);margin-top:6px">
        Performance IQ Score
      </div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;
                  color:${color};letter-spacing:4px;margin-top:8px">
        ${(sb.tier || 'DEVELOPING').toUpperCase()}
      </div>
      ${sb.sport ? `
      <div style="margin-top:12px;font-size:11.5px;color:rgba(255,255,255,.4)">
        Sport-specific weights active · ${sb.sport.charAt(0).toUpperCase()+sb.sport.slice(1)}
      </div>` : ''}
    </div>

    <div class="panels-2">

      <!-- Pillar breakdown -->
      <div class="panel">
        <div class="panel-title">Score Breakdown</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:16px">
          ${pillars.map(p => {
            const val   = sb[p.key]?.raw || 0;
            const bColor = getReadinessColor(val);
            return `
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:15px">${p.icon}</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${p.label}</span>
                  <span style="font-size:11px;color:var(--text-muted)">${p.weight}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  ${p.detail ? `<span style="font-size:10.5px;padding:2px 7px;border-radius:7px;background:${bColor}18;color:${bColor};font-weight:600">${p.detail}</span>` : ''}
                  <span style="font-size:14px;font-weight:700;color:${bColor}">${val}</span>
                </div>
              </div>
              <div style="height:7px;background:var(--surface-2);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${val}%;background:${bColor};border-radius:4px;transition:width .6s ease"></div>
              </div>
              <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;line-height:1.4">${p.tip}</div>
            </div>`;
          }).join('')}
          <div style="padding-top:10px;border-top:2px solid var(--border);
                      display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:14px;font-weight:600;color:var(--text-primary)">Total PIQ Score</span>
            <span style="font-family:'Oswald',sans-serif;font-size:30px;font-weight:700;color:${color}">${sb.total}</span>
          </div>
        </div>
      </div>

      <div>
        <!-- How to improve -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">How to Improve</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
            ${[
              ['📅', 'Log every session', 'Consistency = ' + (sb.weights?.consistency ? Math.round(sb.weights.consistency*100) : 28) + '% of your score'],
              ['💚', 'Daily check-in', 'Readiness pillar needs fresh data every day'],
              ['✅', hasAssigned ? 'Complete assigned sessions' : 'Complete workouts', hasAssigned ? `${assigned.length - assignedDone} pending from coach` : 'Compliance drives ' + (sb.weights?.compliance ? Math.round(sb.weights.compliance*100) : 20) + '% of your score'],
              ['⚖️', 'Stay in ACWR 0.8–1.3', latestACWR ? `Current: ${latestACWR.acwr} (${latestACWR.zone.replace('-',' ')})` : 'Log sessions to enable ACWR monitoring'],
              ['👤', 'Complete your profile', 'Unlocks sport-specific pillar weights'],
            ].map(([icon, title, desc]) => `
            <div style="display:flex;gap:10px;padding:10px;background:var(--surface-2);border-radius:10px">
              <span style="font-size:18px;flex-shrink:0">${icon}</span>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${title}</div>
                <div style="font-size:11.5px;color:var(--text-muted);margin-top:1px">${desc}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Science panel -->
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border-color:#22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);
                      letter-spacing:.06em;margin-bottom:8px">EVIDENCE BASE</div>
          <div style="font-size:12.5px;color:#c8d8e8;line-height:1.7">
            5-pillar composite with sport-specific weights (Bompa & Haff 2009).
            Load pillar uses EWMA ACWR (Gabbett BJSM 2016, sweet spot 0.8–1.3).
            Readiness uses Halson 2014 factor weights + HRV proxy (Buchheit 2013).
          </div>
        </div>
      </div>

    </div>
  </main>
</div>`;
}
