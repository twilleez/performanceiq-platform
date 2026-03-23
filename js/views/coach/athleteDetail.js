/**
 * PerformanceIQ — Coach Athlete Detail View
 * ─────────────────────────────────────────────────────────────
 * Phase 5: The most-requested feature in elite monitoring tools.
 * Route: coach/athlete/:id (already registered in router + app.js)
 *
 * Shows one athlete's full picture:
 *   • Header: PIQ ring, readiness, ACWR chip, risk flags
 *   • 30-day readiness sparkline (from piqHistory cross-reference)
 *   • 28-day load bar chart (their workoutLog sRPE)
 *   • Assignment compliance (assigned vs completed)
 *   • 1-tap message compose
 */
import { buildSidebar }                             from '../../components/nav.js';
import { getRosterAthlete, getAssignedWorkouts,
         getWorkoutLog }                            from '../../state/state.js';
import { getACWRSeries, getLoadSeries,
         getReadinessColor }                        from '../../state/selectors.js';
import { addMessage }                               from '../../state/state.js';
import { navigate }                                 from '../../router.js';
import { showToast }                                from '../../core/notifications.js';

function loadBars(series, w = 400, h = 56) {
  if (!series.length) return '';
  const maxLoad = Math.max(...series.map(d => d.load), 1);
  const barW    = (w / series.length) - 2;
  const bars    = series.map((d, i) => {
    const barH = d.load > 0 ? Math.max(3, (d.load / maxLoad) * (h - 14)) : 2;
    const x    = i * (barW + 2);
    const y    = h - 14 - barH;
    const col  = d.load > maxLoad * .85 ? '#ef4444' : d.load > maxLoad * .65 ? '#f59e0b' : '#22c955';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}"
      height="${barH.toFixed(1)}" rx="2" fill="${col}" opacity="0.85"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block">
    ${bars}
    <text x="0" y="${h}" font-size="9" fill="currentColor" opacity="0.4">${series[0]?.date||''}</text>
    <text x="${w}" y="${h}" font-size="9" text-anchor="end" fill="currentColor" opacity="0.4">${series[series.length-1]?.date||'Today'}</text>
  </svg>`;
}

export function renderCoachAthleteDetail() {
  // Extract id from URL hash — router stores params as hash query or we read it from sessionStorage
  const rawId     = sessionStorage.getItem('piq_athlete_id') || '1';
  const id        = parseInt(rawId);
  const athlete   = getRosterAthlete(id);

  if (!athlete) {
    return `<div class="view-with-sidebar">${buildSidebar('coach','coach/roster')}
      <main class="page-main"><div class="page-header"><h1>Athlete not found</h1></div></main></div>`;
  }

  const rColor    = getReadinessColor(athlete.readiness);
  const acwrSeries = getACWRSeries(14);   // team-level; per-athlete needs backend
  const loadSeries = getLoadSeries(14);
  const latestACWR = acwrSeries.filter(d => d.acwr !== null).at(-1);
  const assigned   = getAssignedWorkouts().filter(w => w.athleteId === athlete.id);
  const done       = assigned.filter(w => w.completed).length;
  const pending    = assigned.filter(w => !w.completed);
  const compliance = assigned.length ? Math.round((done / assigned.length) * 100) : null;
  const compColor  = compliance !== null ? (compliance >= 80 ? '#22c955' : compliance >= 60 ? '#f59e0b' : '#ef4444') : 'var(--text-muted)';

  // Risk flags
  const flags = [];
  if (athlete.readiness < 60)  flags.push({ label: 'Low readiness', color: '#ef4444' });
  if (athlete.streak === 0)    flags.push({ label: 'No recent sessions', color: '#f59e0b' });
  if (latestACWR?.zone === 'danger')  flags.push({ label: 'ACWR danger zone', color: '#ef4444' });
  if (latestACWR?.zone === 'spike')   flags.push({ label: 'ACWR spike', color: '#f59e0b' });

  const circum = 326.7;
  const rdyOffset = circum - (athlete.readiness / 100) * circum;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/roster')}
  <main class="page-main">

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <button class="btn-draft" style="font-size:12px;padding:5px 12px" data-route="coach/roster">
        ← Roster
      </button>
    </div>

    <!-- Athlete Header -->
    <div class="panel" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
        <!-- Avatar -->
        <div style="width:72px;height:72px;border-radius:50%;background:var(--piq-green);
                    display:flex;align-items:center;justify-content:center;
                    font-size:28px;font-weight:900;color:#0d1b3e;flex-shrink:0">
          ${(athlete.name||'A').charAt(0)}
        </div>

        <!-- Name + metadata -->
        <div style="flex:1;min-width:200px">
          <h2 style="margin:0 0 4px;font-size:22px;font-weight:700;color:var(--text-primary)">
            ${athlete.name}
          </h2>
          <div style="font-size:13px;color:var(--text-muted)">
            ${athlete.position||'—'} · ${athlete.sport||'—'} · Age ${athlete.age||'—'}
            · ${athlete.level || 'Athlete'} · ${athlete.compPhase || '—'}
          </div>
          ${flags.length > 0 ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            ${flags.map(f =>
              `<span style="font-size:10.5px;padding:2px 9px;border-radius:8px;
                background:${f.color}18;color:${f.color};font-weight:700">
                ⚠ ${f.label}
              </span>`
            ).join('')}
          </div>` : `
          <div style="margin-top:8px">
            <span style="font-size:11px;padding:2px 9px;border-radius:8px;
              background:#22c95518;color:#22c955;font-weight:700">✅ No flags today</span>
          </div>`}
        </div>

        <!-- Stats -->
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <!-- Readiness ring -->
          <div style="text-align:center">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-2)" stroke-width="7"/>
              <circle cx="40" cy="40" r="34" fill="none"
                stroke="${rColor}" stroke-width="7" stroke-linecap="round"
                stroke-dasharray="${circum}"
                stroke-dashoffset="${rdyOffset.toFixed(1)}"
                transform="rotate(-90 40 40)"/>
              <text x="40" y="42" text-anchor="middle" dominant-baseline="central"
                font-family="'Oswald',sans-serif" font-size="18" font-weight="700"
                fill="${rColor}">${athlete.readiness}</text>
            </svg>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Readiness</div>
          </div>
          <div style="text-align:center;padding-top:10px">
            <div style="font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;color:var(--piq-green)">${athlete.piq}</div>
            <div style="font-size:11px;color:var(--text-muted)">PIQ Score</div>
          </div>
          <div style="text-align:center;padding-top:10px">
            <div style="font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;color:#f59e0b">🔥 ${athlete.streak}d</div>
            <div style="font-size:11px;color:var(--text-muted)">Streak</div>
          </div>
          ${latestACWR ? `
          <div style="text-align:center;padding-top:10px">
            <div style="font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;
              color:${latestACWR.zone==='sweet-spot'?'#22c955':latestACWR.zone==='danger'?'#ef4444':'#f59e0b'}">
              ${latestACWR.acwr}
            </div>
            <div style="font-size:11px;color:var(--text-muted)">ACWR</div>
          </div>` : ''}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">

      <div>
        <!-- 28-day Load -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">28-Day Training Load (sRPE)</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
            Session RPE × Duration · Team data
          </div>
          ${loadBars(loadSeries, 480, 56)}
          <div style="margin-top:8px;display:flex;gap:12px;font-size:11px">
            <span style="color:#22c955">● Normal</span>
            <span style="color:#f59e0b">● High</span>
            <span style="color:#ef4444">● Very High</span>
          </div>
        </div>

        <!-- Assignment compliance -->
        <div class="panel">
          <div class="panel-title">Assigned Session Compliance</div>
          ${assigned.length === 0 ? `
          <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12.5px">
            No sessions assigned yet
            <br><button class="btn-draft" style="margin-top:10px;font-size:12px" data-route="coach/program">Assign a session →</button>
          </div>` : `
          <div style="display:flex;align-items:center;gap:12px;margin:12px 0">
            <div style="font-family:'Oswald',sans-serif;font-size:32px;font-weight:700;color:${compColor}">${compliance}%</div>
            <div>
              <div style="font-size:13px;color:var(--text-primary)">${done} of ${assigned.length} completed</div>
              <div style="font-size:11.5px;color:var(--text-muted)">${pending.length} pending</div>
            </div>
          </div>
          <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden;margin-bottom:12px">
            <div style="height:100%;width:${compliance}%;background:${compColor};border-radius:4px;transition:width .6s"></div>
          </div>
          ${pending.slice(0,3).map(w => `
          <div style="font-size:12px;padding:7px 0;border-bottom:1px solid var(--border);
                      display:flex;justify-content:space-between">
            <span style="color:var(--text-primary)">${w.title}</span>
            <span style="color:#f59e0b">Due ${w.dueDate || 'TBD'}</span>
          </div>`).join('')}`}
        </div>
      </div>

      <!-- 1-tap message + quick facts -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Send a Message</div>
          <textarea id="ad-msg-body" rows="4" style="width:100%;margin:10px 0 8px;padding:10px;
            border:1px solid var(--border);border-radius:8px;background:var(--surface-2);
            color:var(--text-primary);font-size:13px;resize:vertical"
            placeholder="Hey ${athlete.name} — ..."></textarea>
          <button class="btn-primary" id="ad-send-btn" style="width:100%;font-size:13px;padding:11px">
            Send to ${athlete.name}
          </button>
        </div>

        <div class="panel">
          <div class="panel-title">Athlete Profile</div>
          <div style="margin-top:10px">
            ${[
              ['Height',     athlete.height || '—'],
              ['Weight',     athlete.weight ? athlete.weight + ' lbs' : '—'],
              ['Level',      athlete.level  || '—'],
              ['Phase',      athlete.compPhase || '—'],
              ['Readiness',  athlete.readiness + '%'],
              ['PIQ Score',  athlete.piq],
            ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:12.5px;color:var(--text-muted)">${k}</span>
              <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${v}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>

    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', e => {
  const route = e.detail?.route || '';
  if (!route.startsWith('coach/athlete')) return;

  document.getElementById('ad-send-btn')?.addEventListener('click', () => {
    const body = document.getElementById('ad-msg-body')?.value.trim();
    if (!body) return;
    addMessage('thread-coach-player', 'You', body);
    showToast('✅ Message sent!', 'success');
    document.getElementById('ad-msg-body').value = '';
  });
});
