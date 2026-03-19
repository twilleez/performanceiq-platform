/**
 * player/home.js — Phase 15C v2
 * Desktop: KPI strip + sessions list + right panel (reference layout)
 * Mobile:  PIQ ring + readiness banner + quick actions + session list
 */
import { state }            from '../../state/state.js';
import { router }           from '../../core/router.js';
import { renderEmptyState } from '../../app.js';
import { ROUTES }           from '../../app.js';
import { Engines }          from '../../services/engines.js';

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
}

function demoSessions(sport='Basketball') {
  return [
    { name:'Agility & Speed',     day:'Mon',   duration:45, intensity:'High',     completed:true,  icon:'✓', iconClass:'si-done'  },
    { name:'Upper Body Strength', day:'Tue',   duration:40, intensity:'Moderate', completed:true,  icon:'✓', iconClass:'si-done'  },
    { name:'Skill Work + Court',  day:'Wed',   duration:60, intensity:'High',     completed:true,  icon:'✓', iconClass:'si-done'  },
    { name:'Explosive Footwork',  day:'Today', duration:40, intensity:'High',     completed:false, icon:'🏀', iconClass:'si-today', isToday:true },
    { name:'Active Recovery',     day:'Sat',   duration:25, intensity:'Low',      completed:false, icon:'📅', iconClass:'si-future' },
  ];
}

export function renderPlayerHome(container) {
  const s        = state.getAll();
  const piqScore = Engines.piq(s);
  const readiness = Engines.readiness(s);
  const sport     = s.sport || 'Basketball';
  const phase     = s.seasonPhase || 'In-Season';
  const sessions  = s.sessions || [];
  const hasData   = piqScore !== null;

  const displaySessions = sessions.length
    ? sessions.slice(-8).reverse().map((ses, i) => ({
        name:      ses.exercises?.[0] || 'Training Session',
        day:       fmtDate(ses.date),
        duration:  ses.durationMins || 40,
        intensity: ses.rpe >= 8 ? 'High' : ses.rpe >= 5 ? 'Moderate' : 'Low',
        completed: ses.completed,
        isToday:   i === 0 && !ses.completed,
        icon:      ses.completed ? '✓' : i === 0 ? '🏀' : '📅',
        iconClass: ses.completed ? 'si-done' : i === 0 ? 'si-today' : 'si-future',
      }))
    : demoSessions(sport);

  const completedN = displaySessions.filter(x => x.completed).length;
  const totalN     = displaySessions.length;
  const volumeH    = (displaySessions.reduce((a,x) => a+x.duration, 0) / 60).toFixed(1);
  const intensityPct = Math.round((displaySessions.filter(x=>x.intensity==='High').length / totalN) * 100);

  const R = 58, circ = +(2*Math.PI*R).toFixed(1);
  const offset = hasData ? +((1-piqScore/100)*circ).toFixed(1) : circ;

  // Render — responsive via CSS (same HTML, layout switches at 901px)
  container.innerHTML = `
    <div class="piq-view">

      <!-- ── Page header (desktop prominent, mobile compact) -->
      <div class="view-page-header">
        <div class="view-page-title">TRAINING <span class="hl">PLAN</span></div>
        <div class="view-page-subtitle">${sport} · ${phase} · Week 8 — Accumulation Block</div>
      </div>

      <!-- ── KPI strip (4 columns desktop, 2×2 mobile) -->
      <div class="kpi-strip">
        <div class="kpi-card">
          <div class="kpi-lbl">THIS WEEK</div>
          <div class="kpi-val kv-green">${totalN}</div>
          <div class="kpi-sub ks-muted">Sessions planned</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">COMPLETED</div>
          <div class="kpi-val kv-blue">${completedN}</div>
          <div class="kpi-sub ks-blue">↑ On track</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">VOLUME</div>
          <div class="kpi-val kv-navy">${volumeH}h</div>
          <div class="kpi-sub ks-muted">Total this week</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">INTENSITY</div>
          <div class="kpi-val kv-navy">${intensityPct}%</div>
          <div class="kpi-sub ks-muted">Avg. effort</div>
        </div>
      </div>

      <!-- ── Two-column: sessions left, right panel right -->
      <div class="two-col">

        <!-- SESSIONS LIST -->
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">THIS WEEK'S SESSIONS</div>
          </div>
          ${displaySessions.map(ses => {
            let badgeClass, badgeText;
            if (ses.completed)     { badgeClass='sb-done'; badgeText='DONE'; }
            else if (ses.isToday)  { badgeClass='sb-next'; badgeText='NEXT'; }
            else if (ses.day==='Sat') { badgeClass='sb-sat'; badgeText='SAT'; }
            else                   { badgeClass='sb-sat'; badgeText=ses.day.toUpperCase().slice(0,3); }
            return `
            <div class="session-row" tabindex="0" role="button" data-route="${ROUTES.PLAYER_LOG}"
                 aria-label="${ses.day} — ${ses.name}">
              <div class="session-icon ${ses.iconClass}">${ses.icon}</div>
              <div style="flex:1">
                <div class="session-name">${ses.day} — ${ses.name}</div>
                <div class="session-meta">
                  ${ses.completed?'Completed · ':''}${ses.duration} min · ${ses.intensity}
                  ${sport&&!ses.completed?' · '+sport:''}
                </div>
              </div>
              <span class="session-badge ${badgeClass}">${badgeText}</span>
            </div>`;
          }).join('')}
          ${!sessions.length ? `
          <div style="padding:14px 20px;border-top:1px solid var(--card-border,#E8E9F0);">
            <button class="btn-outline" data-route="${ROUTES.PLAYER_LOG}" style="max-width:220px;">
              ⚡ Log Your First Session
            </button>
          </div>` : ''}
        </div>

        <!-- RIGHT PANEL -->
        <div>
          <div class="panel">

            <!-- Periodization -->
            <div class="rpanel-section">
              <div class="rpanel-title">PERIODIZATION BLOCK</div>
              <div class="progress-row">
                <div class="prog-lbl-row"><span class="prog-lbl">Phase 2 — Accumulation</span><span class="prog-meta">8 / 12 wks</span></div>
                <div class="prog-track"><div class="prog-fill pf-green" style="width:67%"></div></div>
              </div>
              <div class="progress-row">
                <div class="prog-lbl-row"><span class="prog-lbl">Volume Load</span><span class="prog-meta">${intensityPct}%</span></div>
                <div class="prog-track"><div class="prog-fill pf-blue" style="width:${intensityPct}%"></div></div>
              </div>
              <div class="progress-row">
                <div class="prog-lbl-row"><span class="prog-lbl">Intensity</span><span class="prog-meta">${readiness.acwr && readiness.acwr !== 1 ? (readiness.acwr*100/1.5).toFixed(0) : '68'}%</span></div>
                <div class="prog-track"><div class="prog-fill pf-green" style="width:68%"></div></div>
              </div>
            </div>

            <!-- Readiness / PIQ mini -->
            <div class="rpanel-section">
              <div class="rpanel-title">TODAY'S READINESS</div>
              <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
                <!-- Mini PIQ ring -->
                <div style="position:relative;width:72px;height:72px;flex-shrink:0;" id="piq-ring">
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="28" fill="none"
                      stroke="rgba(36,192,84,0.12)" stroke-width="7"
                      ${!hasData?'stroke-dasharray="4 4"':''}/>
                    ${hasData?`<circle cx="36" cy="36" r="28" fill="none"
                      stroke="#24C054" stroke-width="7"
                      stroke-dasharray="${(2*Math.PI*28).toFixed(1)}"
                      stroke-dashoffset="${((2*Math.PI*28)*(1-piqScore/100)).toFixed(1)}"
                      stroke-linecap="round" transform="rotate(-90 36 36)"/>`:''}
                  </svg>
                  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
                    <div style="font-family:'Oswald',sans-serif;font-size:${hasData?'20':'16'}px;font-weight:700;
                         color:${hasData?'var(--accent-green,#24C054)':'#9CA3AF'};line-height:1;">
                      ${hasData?piqScore:'—'}
                    </div>
                    <div style="font-size:9px;color:#9CA3AF;letter-spacing:0.1em;text-transform:uppercase;">PIQ</div>
                  </div>
                </div>
                <div>
                  <div style="font-size:12.5px;font-weight:700;color:${readiness.color};margin-bottom:3px;">
                    ${readiness.emoji} ${readiness.label}
                  </div>
                  <div style="font-size:11.5px;color:var(--text-muted,#9CA3AF);line-height:1.4;">
                    ${readiness.action.split('.')[0]}.
                  </div>
                </div>
              </div>
              <button class="btn-outline" data-route="${ROUTES.PLAYER_LOG}">
                ${hasData?'📊 Log Today\'s Session':'+ Log Wellness Check-in'}
              </button>
            </div>

            <!-- ACWR Insight -->
            <div class="rpanel-section">
              <div class="rpanel-title">LOAD INSIGHT</div>
              <div style="font-size:11.5px;color:var(--text-secondary,#6B7280);line-height:1.5;margin-bottom:10px;">
                ${readiness.insight}
              </div>
              <div style="font-size:11.5px;color:var(--text-muted,#9CA3AF);line-height:1.4;">
                ACWR: ${readiness.acwr && readiness.acwr !== 1 ? readiness.acwr : '—'} · Zone: ${readiness.acwrZone === 'no-data' ? 'Log sessions' : readiness.acwrZone.replace('-',' ')}
              </div>
            </div>

            <!-- Next phase -->
            <div class="rpanel-section">
              <div class="rpanel-title">NEXT PHASE PREVIEW</div>
              <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;">
                <div style="width:36px;height:36px;background:var(--nav-bg,#0D1B40);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">⚡</div>
                <div>
                  <div style="font-size:13px;font-weight:600;color:var(--text-primary,#1A1F36);">Phase 3 — Intensification</div>
                  <div style="font-size:11.5px;color:var(--text-muted,#9CA3AF);margin-top:2px;">Starts Week 10 · High intensity, lower volume</div>
                </div>
              </div>
              <button class="btn-outline" data-route="${ROUTES.PLAYER_LOG}">⚙️ OPEN WORKOUT BUILDER</button>
            </div>

          </div><!-- /panel -->
        </div><!-- /right -->

      </div><!-- /two-col -->
    </div><!-- /piq-view -->`;

  // Route all buttons
  container.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click',  () => router.navigate(el.dataset.route));
    el.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') router.navigate(el.dataset.route); });
  });
}
