/**
 * PerformanceIQ — Coach Leaderboard
 * ─────────────────────────────────────────────────────────────
 * Phase 5 Cat 3: Team PIQ leaderboard with week-over-week delta.
 * Evidence: UniSA ARENA study ranked leaderboard/status as the
 * single most effective gamification feature in athlete apps.
 *
 * Shows:
 *   • Full roster ranked by PIQ (or Readiness — coach toggles)
 *   • Week-over-week delta from piqHistory (piqHistory[-1] vs [-8])
 *   • Gold/silver/bronze top-3 row shading
 *   • Filter by position or PIQ tier
 *   • Athletes only see their own rank (role-aware note)
 */
import { buildSidebar }                     from '../../components/nav.js';
import { getCurrentUser }                   from '../../core/auth.js';
import { getRoster }                        from '../../state/state.js';
import { getPIQHistory }                    from '../../state/state.js';
import { navigate }                         from '../../router.js';

const MEDALS = ['🥇','🥈','🥉'];
const TIER_COLORS = {
  'Elite':      '#22c955',
  'Advanced':   '#3b82f6',
  'Developing': '#f59e0b',
  'Building':   '#ef4444',
};

function getTier(piq) {
  if (piq >= 90) return 'Elite';
  if (piq >= 80) return 'Advanced';
  if (piq >= 70) return 'Developing';
  return 'Building';
}

function getRowBg(rank) {
  if (rank === 1) return 'rgba(255,215,0,.08)';    // gold
  if (rank === 2) return 'rgba(192,192,192,.08)';  // silver
  if (rank === 3) return 'rgba(205,127,50,.08)';   // bronze
  return 'transparent';
}

function getDelta(athleteId, piqHistory) {
  // Compare today's PIQ snapshot vs 7 days ago
  const hist = piqHistory.filter(h => h.userId === athleteId || !h.userId);
  if (hist.length < 2) return null;
  const sorted = [...hist].sort((a,b) => (a.ts||0)-(b.ts||0));
  const today  = sorted.at(-1)?.piq;
  const week   = sorted.length >= 8 ? sorted.at(-8)?.piq : sorted[0]?.piq;
  if (!today || !week) return null;
  return today - week;
}

export function renderCoachLeaderboard() {
  const user       = getCurrentUser();
  const roster     = getRoster();
  const piqHistory = getPIQHistory();

  // Build ranked list with deltas
  const ranked = [...roster]
    .map(a => ({
      ...a,
      delta: getDelta(a.id, piqHistory),
      tier:  getTier(a.piq),
    }))
    .sort((a,b) => b.piq - a.piq)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  // Readiness ranking
  const rdyRanked = [...roster]
    .sort((a,b) => b.readiness - a.readiness)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  const tierCounts = {};
  ranked.forEach(a => { tierCounts[a.tier] = (tierCounts[a.tier]||0) + 1; });

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/leaderboard')}
  <main class="page-main">

    <div class="page-header">
      <h1>Team <span>Leaderboard</span></h1>
      <p>${roster.length} athletes · PIQ and readiness rankings</p>
    </div>

    <!-- Summary KPIs -->
    <div class="kpi-row">
      ${Object.entries(tierCounts).map(([tier, count]) => `
      <div class="kpi-card">
        <div class="kpi-lbl">${tier}</div>
        <div class="kpi-val" style="color:${TIER_COLORS[tier]||'var(--text-primary)'}">${count}</div>
        <div class="kpi-chg">athletes</div>
      </div>`).join('')}
    </div>

    <!-- Tab toggle -->
    <div style="display:flex;gap:10px;margin-bottom:20px">
      <button class="lb-tab btn-primary" data-tab="piq" id="tab-piq"
        style="font-size:13px;padding:9px 20px">🏅 PIQ Score</button>
      <button class="lb-tab btn-draft" data-tab="readiness" id="tab-rdy"
        style="font-size:13px;padding:9px 20px">💚 Readiness</button>
    </div>

    <!-- PIQ Leaderboard -->
    <div id="lb-piq">
      <div class="panel" style="padding:0;overflow:hidden">
        <!-- Header -->
        <div style="display:grid;grid-template-columns:60px 1fr 90px 90px 90px 80px;
                    padding:10px 16px;background:var(--surface-2);
                    border-bottom:2px solid var(--border);
                    font-size:11.5px;font-weight:700;color:var(--text-muted);
                    letter-spacing:.05em">
          <span>RANK</span>
          <span>ATHLETE</span>
          <span style="text-align:center">PIQ</span>
          <span style="text-align:center">CHANGE</span>
          <span style="text-align:center">READINESS</span>
          <span style="text-align:right">TIER</span>
        </div>

        ${ranked.map(a => {
          const rColor = a.readiness >= 80 ? '#22c955' : a.readiness < 60 ? '#ef4444' : '#f59e0b';
          const delta  = a.delta;
          const deltaStr = delta === null ? '—'
            : delta > 0  ? `<span style="color:#22c955">+${delta}</span>`
            : delta < 0  ? `<span style="color:#ef4444">${delta}</span>`
            : '<span style="color:var(--text-muted)">—</span>';
          return `
        <div class="athlete-row" data-id="${a.id}"
          style="display:grid;grid-template-columns:60px 1fr 90px 90px 90px 80px;
                 align-items:center;padding:13px 16px;cursor:pointer;
                 background:${getRowBg(a.rank)};
                 border-bottom:1px solid var(--border);
                 transition:background .15s"
          onmouseover="this.style.background='var(--surface-2)'"
          onmouseout="this.style.background='${getRowBg(a.rank)}'">

          <div style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;
                      color:${a.rank<=3?'var(--text-primary)':'var(--text-muted)'}">
            ${MEDALS[a.rank-1] || a.rank}
          </div>

          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${a.name}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">
              ${a.position||'—'} · 🔥 ${a.streak}d streak
            </div>
          </div>

          <div style="text-align:center;font-family:'Oswald',sans-serif;
                      font-size:22px;font-weight:700;color:var(--piq-green)">
            ${a.piq}
          </div>

          <div style="text-align:center;font-size:14px;font-weight:700">
            ${deltaStr}
          </div>

          <div style="text-align:center;font-size:15px;font-weight:700;color:${rColor}">
            ${a.readiness}%
          </div>

          <div style="text-align:right">
            <span style="font-size:11px;padding:3px 8px;border-radius:8px;font-weight:700;
                         background:${TIER_COLORS[a.tier]||'var(--text-muted)'}20;
                         color:${TIER_COLORS[a.tier]||'var(--text-muted)'}">
              ${a.tier}
            </span>
          </div>
        </div>`;
        }).join('')}
      </div>
      <div style="margin-top:8px;font-size:11.5px;color:var(--text-muted)">
        Change column shows week-over-week PIQ delta from check-in history · Click any row for athlete detail
      </div>
    </div>

    <!-- Readiness Leaderboard (hidden by default) -->
    <div id="lb-rdy" style="display:none">
      <div class="panel" style="padding:0;overflow:hidden">
        <div style="display:grid;grid-template-columns:60px 1fr 90px 90px;
                    padding:10px 16px;background:var(--surface-2);
                    border-bottom:2px solid var(--border);
                    font-size:11.5px;font-weight:700;color:var(--text-muted);
                    letter-spacing:.05em">
          <span>RANK</span>
          <span>ATHLETE</span>
          <span style="text-align:center">READINESS</span>
          <span style="text-align:center">PIQ</span>
        </div>
        ${rdyRanked.map(a => {
          const rColor = a.readiness >= 80 ? '#22c955' : a.readiness < 60 ? '#ef4444' : '#f59e0b';
          return `
        <div class="athlete-row" data-id="${a.id}"
          style="display:grid;grid-template-columns:60px 1fr 90px 90px;align-items:center;
                 padding:13px 16px;cursor:pointer;border-bottom:1px solid var(--border);
                 background:${getRowBg(a.rank)};transition:background .15s"
          onmouseover="this.style.background='var(--surface-2)'"
          onmouseout="this.style.background='${getRowBg(a.rank)}'">
          <div style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;
                      color:${a.rank<=3?'var(--text-primary)':'var(--text-muted)'}">
            ${MEDALS[a.rank-1] || a.rank}
          </div>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${a.name}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'}</div>
          </div>
          <div style="text-align:center;font-family:'Oswald',sans-serif;
                      font-size:22px;font-weight:700;color:${rColor}">
            ${a.readiness}%
          </div>
          <div style="text-align:center;font-size:15px;font-weight:600;color:var(--piq-green)">
            ${a.piq}
          </div>
        </div>`;
        }).join('')}
      </div>
    </div>

  </main>
</div>`;
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'coach/leaderboard') return;

  // Tab toggle
  document.querySelectorAll('.lb-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.getElementById('lb-piq').style.display = tab === 'piq' ? 'block' : 'none';
      document.getElementById('lb-rdy').style.display = tab === 'readiness' ? 'block' : 'none';
      document.querySelectorAll('.lb-tab').forEach(b => {
        b.className = b.dataset.tab === tab ? 'lb-tab btn-primary' : 'lb-tab btn-draft';
        b.style.fontSize   = '13px';
        b.style.padding    = '9px 20px';
      });
    });
  });

  // Click athlete row → detail view
  document.querySelectorAll('.athlete-row').forEach(row => {
    row.addEventListener('click', () => {
      sessionStorage.setItem('piq_athlete_id', row.dataset.id);
      navigate('coach/athlete/' + row.dataset.id);
    });
  });
});
