/**
 * Player Progress View — upgraded v2
 * Real trend data: ACWR load chart, readiness history, compliance stats.
 *
 * References:
 *   ACWR sweet-spot 0.8–1.3 — Gabbett 2016 (BJSM)
 *   sRPE load monitoring — Foster et al. 2001
 *   Sleep as primary recovery indicator — Halson 2014
 */
import { buildSidebar }              from '../../components/nav.js';
import { getCurrentUser }            from '../../core/auth.js';
import { getWorkoutLog }             from '../../state/state.js';
import { getPIQScore, getStreak, getWorkoutCount,
         getScoreBreakdown, getACWRSeries,
         getLoadSeries, getCheckInHistory } from '../../state/selectors.js';

export function renderPlayerProgress() {
  const user      = getCurrentUser();
  const log       = getWorkoutLog();
  const piq       = getPIQScore();
  const streak    = getStreak();
  const sessions  = getWorkoutCount();
  const sb        = getScoreBreakdown();
  const acwrData  = getACWRSeries();
  const loadData  = getLoadSeries();
  const checkins  = getCheckInHistory(14);

  // ── Compliance rate (last 14 days) ──────────────────────────
  const now14     = Date.now() - 14 * 86_400_000;
  const recent14  = log.filter(w => w.ts >= now14);
  const compliance = recent14.length
    ? Math.round((recent14.filter(w => w.completed !== false).length / recent14.length) * 100)
    : sb.compliance?.raw || 0;

  // ── RPE bar chart (last 10 sessions) ────────────────────────
  const recent10 = [...log].sort((a, b) => b.ts - a.ts).slice(0, 10).reverse();
  const rpeMax   = 10;
  const rpeBars  = recent10.length > 0
    ? recent10.map(w => {
        const h = Math.max(4, Math.round((w.avgRPE || 5) / rpeMax * 68));
        const c = (w.avgRPE || 5) >= 8 ? '#ef4444' : (w.avgRPE || 5) >= 6 ? '#f59e0b' : '#22c955';
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1">
          <div style="font-size:9px;color:var(--text-muted)">${w.avgRPE || '?'}</div>
          <div style="width:100%;max-width:26px;height:${h}px;background:${c};border-radius:3px 3px 0 0;min-height:4px"></div>
          <div style="font-size:9px;color:var(--text-muted)">${new Date(w.ts).toLocaleDateString('en-US',{month:'numeric',day:'numeric'})}</div>
        </div>`;
      }).join('')
    : `<div style="color:var(--text-muted);font-size:12.5px;padding:20px 0;text-align:center;width:100%">No sessions logged yet — start your first workout to see trends.</div>`;

  // ── ACWR chart ────────────────────────────────────────────────
  const acwrBars = acwrData.length > 0
    ? (() => {
        const last14 = acwrData.slice(-14);
        return last14.map(d => {
          const pct = Math.min(100, Math.round((d.acwr / 2.0) * 100));
          const c =
            d.zone === 'sweet-spot'    ? '#22c955' :
            d.zone === 'spike'         ? '#f59e0b' :
            d.zone === 'danger'        ? '#ef4444' :
            d.zone === 'undertraining' ? '#3b82f6' : '#888';
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1" title="${d.date}: ACWR ${d.acwr} (${d.zone})">
            <div style="font-size:9px;color:var(--text-muted)">${d.acwr}</div>
            <div style="width:100%;max-width:22px;height:${Math.max(4,Math.round(d.acwr/2*68))}px;background:${c};border-radius:3px 3px 0 0"></div>
            <div style="font-size:9px;color:var(--text-muted);writing-mode:initial">${d.date.split(' ')[0]}</div>
          </div>`;
        }).join('');
      })()
    : `<div style="color:var(--text-muted);font-size:12px;padding:20px 0;text-align:center;width:100%">Log 3+ sessions to unlock ACWR monitoring.</div>`;

  // ── Current ACWR and zone ─────────────────────────────────────
  const latestACWR = acwrData.length > 0 ? acwrData[acwrData.length - 1] : null;
  const acwrZoneColor =
    !latestACWR                          ? '#888' :
    latestACWR.zone === 'sweet-spot'     ? '#22c955' :
    latestACWR.zone === 'spike'          ? '#f59e0b' :
    latestACWR.zone === 'danger'         ? '#ef4444' :
    latestACWR.zone === 'undertraining'  ? '#3b82f6' : '#888';

  const acwrZoneLabel =
    !latestACWR                          ? 'No data yet' :
    latestACWR.zone === 'sweet-spot'     ? 'Sweet Spot — ideal training zone' :
    latestACWR.zone === 'spike'          ? 'Load Spike — reduce volume today' :
    latestACWR.zone === 'danger'         ? 'Danger Zone — rest required' :
    latestACWR.zone === 'undertraining'  ? 'Undertraining — build load gradually' : 'No data';

  // ── Readiness history sparkline ───────────────────────────────
  const readinessDots = checkins.length > 0
    ? checkins.slice(0, 7).reverse().map(c => {
        const col = c.readiness >= 75 ? '#22c955' : c.readiness >= 55 ? '#f59e0b' : '#ef4444';
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1">
          <div style="font-size:9px;font-weight:700;color:${col}">${c.readiness}</div>
          <div style="width:28px;height:28px;border-radius:50%;background:${col}22;border:2px solid ${col};display:flex;align-items:center;justify-content:center">
            <div style="width:8px;height:8px;border-radius:50%;background:${col}"></div>
          </div>
          <div style="font-size:9px;color:var(--text-muted)">${c.dayLabel}</div>
        </div>`;
      }).join('')
    : `<div style="color:var(--text-muted);font-size:12px;padding:10px 0;text-align:center;width:100%">Complete daily check-ins to see readiness trend.</div>`;

  // ── Pillar breakdown bars ─────────────────────────────────────
  const pillars = [
    { label: 'Training Consistency', key: 'consistency', icon: '🔥', desc: `Streak + session count` },
    { label: 'Readiness Index',      key: 'readiness',   icon: '💚', desc: `Sleep, energy, soreness composite` },
    { label: 'Workout Compliance',   key: 'compliance',  icon: '✅', desc: `${compliance}% of sessions completed` },
    { label: 'Load Management',      key: 'load',        icon: '⚖️', desc: `RPE balance — ideal avg 6–7` },
    { label: 'Profile Completeness', key: 'profile',     icon: '📋', desc: `Data completeness drives accuracy` },
  ].map(p => {
    const comp = sb[p.key] || { raw: 0, weight: 0 };
    const w    = Math.round((comp.weight || 0) * 100);
    return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <span style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${p.icon} ${p.label}</span>
        <span style="font-size:12px;font-weight:700;color:var(--text-primary)">${comp.raw}<span style="font-size:10px;color:var(--text-muted);font-weight:400"> / 100</span></span>
      </div>
      <div style="height:7px;background:var(--surface-2);border-radius:4px;overflow:hidden;margin-bottom:3px">
        <div style="height:100%;width:${comp.raw}%;background:var(--piq-green);border-radius:4px;transition:width .5s"></div>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:10.5px;color:var(--text-muted)">${p.desc}</span>
        <span style="font-size:10.5px;color:var(--text-muted)">${w}% weight</span>
      </div>
    </div>`;
  }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player', 'player/progress')}
  <main class="page-main">

    <div class="page-header">
      <h1>My <span>Progress</span></h1>
      <p>${user?.name || 'Athlete'} · Performance trends and training history</p>
    </div>

    <!-- KPI Row -->
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${piq}</div><div class="kpi-chg">${sb.tier}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions</div><div class="kpi-val b">${sessions}</div><div class="kpi-chg">Total logged</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${streak}d</div><div class="kpi-chg">${streak >= 7 ? 'On fire!' : streak >= 3 ? 'Building' : 'Keep going'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Compliance</div><div class="kpi-val">${compliance}%</div><div class="kpi-chg">Last 14 days</div></div>
    </div>

    <div class="panels-2">

      <!-- Left column -->
      <div>
        <!-- RPE Chart -->
        <div class="panel" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div class="panel-title" style="margin:0">Training Load — Last 10 Sessions</div>
            <div style="font-size:11px;color:var(--text-muted)">sRPE per session</div>
          </div>
          <div style="display:flex;align-items:flex-end;gap:4px;height:84px">${rpeBars}</div>
          <div style="display:flex;gap:12px;margin-top:10px;font-size:11px">
            <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#22c955;display:inline-block"></span>RPE ≤5 (easy)</span>
            <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#f59e0b;display:inline-block"></span>RPE 6–7 (target zone)</span>
            <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#ef4444;display:inline-block"></span>RPE ≥8 (high)</span>
          </div>
        </div>

        <!-- ACWR Chart -->
        <div class="panel" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div class="panel-title" style="margin:0">Acute:Chronic Workload (ACWR)</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:3px">Sweet spot: 0.8–1.3 · Gabbett 2016</div>
            </div>
            ${latestACWR ? `
            <div style="text-align:right">
              <div style="font-size:18px;font-weight:700;color:${acwrZoneColor}">${latestACWR.acwr}</div>
              <div style="font-size:10px;color:${acwrZoneColor};font-weight:600">${latestACWR.zone.replace(/-/g,' ')}</div>
            </div>` : ''}
          </div>
          <div style="display:flex;align-items:flex-end;gap:3px;height:84px;margin-top:8px">${acwrBars}</div>
          ${latestACWR ? `
          <div style="margin-top:10px;padding:9px 12px;border-radius:8px;background:${acwrZoneColor}11;border:1px solid ${acwrZoneColor}33;font-size:12px;color:var(--text-primary)">
            ${acwrZoneLabel}
          </div>` : ''}
        </div>

        <!-- Readiness Sparkline -->
        <div class="panel">
          <div class="panel-title">Readiness — Last 7 Check-Ins</div>
          <div style="display:flex;align-items:flex-end;gap:6px;margin-top:14px;padding-bottom:4px">${readinessDots}</div>
          ${checkins.length === 0 ? `
          <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">
            Complete your daily check-in each morning to build a readiness trend. Your coach uses this to plan session intensity.
          </div>` : ''}
          <div style="margin-top:10px">
            <button class="btn-draft" style="font-size:12px;padding:8px 14px" data-route="player/readiness">Log Today's Check-In</button>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div>
        <!-- PIQ Score Breakdown -->
        <div class="panel" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div class="panel-title" style="margin:0">PIQ Score Breakdown</div>
            <div style="text-align:right">
              <div style="font-size:24px;font-weight:700;color:var(--piq-green)">${piq}</div>
              <div style="font-size:11px;color:var(--text-muted)">${sb.tier}</div>
            </div>
          </div>
          ${pillars}
        </div>

        <!-- Score Tier Guide -->
        <div class="panel">
          <div class="panel-title">Score Tiers</div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
            ${[
              ['Elite',          '90–99', '#22c955'],
              ['Advanced',       '80–89', '#3b82f6'],
              ['Developing',     '70–79', '#a78bfa'],
              ['Building',       '60–69', '#f59e0b'],
              ['Getting Started','0–59',  '#888'],
            ].map(([tier, range, col]) => `
            <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;background:${sb.tier===tier?col+'15':'transparent'};border:1px solid ${sb.tier===tier?col+'40':'transparent'}">
              <div style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0"></div>
              <span style="font-size:12.5px;font-weight:${sb.tier===tier?'700':'400'};color:${sb.tier===tier?'var(--text-primary)':'var(--text-muted)'};flex:1">${tier}</span>
              <span style="font-size:11.5px;color:var(--text-muted)">${range}</span>
            </div>`).join('')}
          </div>
          <div style="margin-top:14px;font-size:12px;color:var(--text-muted);line-height:1.6">
            Log sessions daily, complete check-ins each morning, and keep your RPE in the 6–7 range to improve your score.
          </div>
        </div>
      </div>

    </div>
  </main>
</div>`;
}
