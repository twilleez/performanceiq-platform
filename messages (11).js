/**
 * PerformanceIQ — Parent Child Overview
 * ─────────────────────────────────────────────────────────────
 * Detailed athlete profile view for the parent role.
 *
 * FIX APPLIED (friction audit)
 *  Fix 5 — The linked athlete is now resolved from
 *           state.linkedAthlete rather than hardcoded to roster[0].
 *           Resolution order:
 *             1. roster.find(a => a.id === linkedAthlete)  ← correct
 *             2. roster[0]                                 ← demo fallback
 *             3. bare default object                       ← last resort
 *
 *           This means the parent demo account (parent@demo.com)
 *           will consistently see the same athlete across all parent
 *           views once linkedAthlete is set in state.
 */

import { buildSidebar }              from '../../components/nav.js';
import { getRoster, getState }       from '../../state/state.js';
import { getScoreBreakdown }         from '../../state/selectors.js';

export function renderParentChild() {
  // ── Resolve linked athlete ────────────────────────────────
  const roster        = getRoster();
  const { linkedAthlete } = getState();

  const athlete =
    (linkedAthlete && roster.find(a => a.id === linkedAthlete)) ||
    roster[0] ||
    { name: 'Jake Williams', readiness: 82, piq: 79, streak: 5,
      sport: 'basketball', position: 'SG', age: 16,
      height: "6'1\"", weight: 175, level: 'intermediate' };

  const breakdown      = getScoreBreakdown();
  const readinessColor = athlete.readiness >= 80 ? '#22c955'
                       : athlete.readiness <  60 ? '#ef4444'
                       : '#f59e0b';

  // ── PIQ component rows ────────────────────────────────────
  const componentRows = [
    { label: 'Training Consistency', key: 'consistency', icon: '🔥',
      desc: 'How regularly your athlete trains' },
    { label: 'Readiness Index',      key: 'readiness',   icon: '💚',
      desc: 'Physical readiness based on wellness check-ins' },
    { label: 'Workout Compliance',   key: 'compliance',  icon: '✅',
      desc: 'Percentage of planned sessions completed' },
    { label: 'Load Management',      key: 'load',        icon: '⚖️',
      desc: 'Balance of training intensity over time' },
  ].map(c => {
    const comp = breakdown[c.key] || { raw: 0 };
    const bar  = Math.min(100, Math.max(0, comp.raw));
    const barColor = bar >= 75 ? '#22c955' : bar >= 50 ? '#f59e0b' : '#ef4444';
    return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px">
        <span style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${c.icon} ${c.label}</span>
        <span style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${comp.raw}</span>
      </div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:5px">${c.desc}</div>
      <div style="height:7px;background:var(--surface-2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${bar}%;background:${barColor};border-radius:4px;
                    transition:width .4s ease"></div>
      </div>
    </div>`;
  }).join('');

  // ── Status badge ──────────────────────────────────────────
  const statusText = athlete.readiness >= 80 ? '✅ Ready to train'
                   : athlete.readiness <  60 ? '⚠️ Rest recommended'
                   : '→ Moderate effort';

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent', 'parent/child')}
  <main class="page-main">

    <div class="page-header">
      <h1>${athlete.name}</h1>
      <p>${athlete.position || '—'} · ${athlete.sport ? athlete.sport.charAt(0).toUpperCase() + athlete.sport.slice(1) : '—'} · Athlete Profile</p>
    </div>

    <!-- KPI row -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-lbl">Readiness</div>
        <div class="kpi-val" style="color:${readinessColor}">${athlete.readiness}%</div>
        <div class="kpi-chg">Today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">PIQ Score</div>
        <div class="kpi-val g">${athlete.piq}</div>
        <div class="kpi-chg">${breakdown.tier || 'Developing'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Streak</div>
        <div class="kpi-val">🔥 ${athlete.streak}d</div>
        <div class="kpi-chg">Active days</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Status</div>
        <div class="kpi-val" style="font-size:14px">${statusText}</div>
        <div class="kpi-chg">Today</div>
      </div>
    </div>

    <div class="panels-2">

      <!-- PIQ Score Breakdown -->
      <div class="panel">
        <div class="panel-title">PIQ Score Breakdown</div>
        <div style="margin-top:12px">${componentRows}</div>
        <div style="margin-top:12px;padding:12px;background:var(--surface-2);border-radius:10px;
                    font-size:12px;color:var(--text-muted);line-height:1.6">
          The PIQ Score is a composite of training consistency, readiness,
          compliance, and load management. A higher score means the athlete
          is training well and recovering effectively.
        </div>
      </div>

      <!-- Athlete Info -->
      <div class="panel">
        <div class="panel-title">Athlete Details</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
          ${_detailRow('Sport',    athlete.sport ? athlete.sport.charAt(0).toUpperCase() + athlete.sport.slice(1) : '—')}
          ${_detailRow('Position', athlete.position || '—')}
          ${_detailRow('Level',    athlete.level    ? athlete.level.charAt(0).toUpperCase() + athlete.level.slice(1) : '—')}
          ${_detailRow('Age',      athlete.age      ? athlete.age + ' years old' : '—')}
          ${_detailRow('Height',   athlete.height   || '—')}
          ${_detailRow('Weight',   athlete.weight   ? athlete.weight + ' lbs' : '—')}
          ${_detailRow('Phase',    athlete.compPhase ? _formatPhase(athlete.compPhase) : '—')}
        </div>

        <!-- Safety note for parents -->
        <div style="margin-top:20px;padding:12px 14px;border-radius:10px;
                    background:#22c95510;border:1px solid #22c95530">
          <div style="font-size:12.5px;font-weight:700;color:var(--piq-green);margin-bottom:4px">
            ✅ What this means for your athlete
          </div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.6">
            ${_parentReadinessNote(athlete.readiness)}
          </div>
        </div>
      </div>

    </div>
  </main>
</div>`;
}


// ── HELPERS ───────────────────────────────────────────────────

function _detailRow(label, value) {
  return `
  <div style="display:flex;justify-content:space-between;padding:8px 0;
              border-bottom:1px solid var(--border)">
    <span style="font-size:12.5px;color:var(--text-muted)">${label}</span>
    <span style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${value}</span>
  </div>`;
}

function _formatPhase(phase) {
  return {
    'pre-season':  'Pre-Season',
    'in-season':   'In-Season',
    'post-season': 'Post-Season',
    'off-season':  'Off-Season',
  }[phase] || phase;
}

function _parentReadinessNote(readiness) {
  if (readiness >= 80) {
    return 'Your athlete is well-rested and physically ready. Full training is appropriate today.';
  }
  if (readiness >= 60) {
    return 'Your athlete is in moderate shape. Normal training at reduced intensity is fine.';
  }
  return 'Readiness is low today. Encourage rest, hydration, and a good night\'s sleep. Light activity only.';
}
