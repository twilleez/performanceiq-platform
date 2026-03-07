// js/views/athletes.js — Athlete roster with PADM stage info

import { state, getReadinessLevel } from '../state/state.js';

export function renderAthletes() {
  const athletes = state.team.athletes;

  return `
    <div class="page-header">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <h1 class="page-title">Athletes</h1>
          <p class="page-subtitle">${athletes.length} athletes · ${state.team.name}</p>
        </div>
        <button class="btn btn-primary btn-sm">+ Add Athlete</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
      ${athletes.map(a => renderAthleteCard(a)).join('')}
    </div>
  `;
}

function renderAthleteCard(athlete) {
  const rl = getReadinessLevel(athlete.readiness);
  const stage = assignStage(athlete);
  const scoreColor = { green: 'var(--green)', yellow: 'var(--yellow)', orange: 'var(--orange)', red: 'var(--red)' }[rl.level];

  return `
    <div class="card" style="cursor:pointer;transition:border-color 0.15s ease;" onmouseenter="this.style.borderColor='var(--border-strong)'" onmouseleave="this.style.borderColor='var(--border-subtle)'">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <div style="width:44px;height:44px;border-radius:50%;background:${athlete.color};display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:15px;color:#000;flex-shrink:0;">${athlete.initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:600;">${athlete.name}</div>
          <div style="font-size:12px;color:var(--text-muted);">${athlete.position}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="traffic-dot ${rl.level}"></div>
          <span style="font-family:var(--font-display);font-weight:900;font-size:22px;color:${scoreColor};">${athlete.readiness}</span>
        </div>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
        <span class="dev-stage">${stage}</span>
        <span class="phase-badge inseason">In-Season</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Sleep</div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:16px;">${athlete.wellness.sleep}<span style="font-size:11px;font-weight:400;color:var(--text-muted)">h</span></div>
        </div>
        <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Soreness</div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:16px;color:${athlete.wellness.soreness > 6 ? 'var(--red)' : athlete.wellness.soreness > 4 ? 'var(--orange)' : 'var(--text-primary)'};">${athlete.wellness.soreness}<span style="font-size:11px;font-weight:400;color:var(--text-muted)">/10</span></div>
        </div>
        <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Stress</div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:16px;color:${athlete.wellness.stress > 6 ? 'var(--red)' : 'var(--text-primary)'};">${athlete.wellness.stress}<span style="font-size:11px;font-weight:400;color:var(--text-muted)">/10</span></div>
        </div>
        <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">Energy</div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:16px;color:${athlete.wellness.energy >= 7 ? 'var(--green)' : 'var(--text-primary)'};">${athlete.wellness.energy}<span style="font-size:11px;font-weight:400;color:var(--text-muted)">/10</span></div>
        </div>
      </div>
    </div>
  `;
}

function assignStage(athlete) {
  // Simple heuristic — in production this would come from athlete_profiles.development_stage
  if (athlete.wellness.energy >= 8 && athlete.readiness >= 85) return 'Elite';
  if (athlete.readiness >= 75) return 'Performance';
  return 'Development';
}

export function afterRenderAthletes() {}
