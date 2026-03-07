// js/views/team.js — Coach OS: Team Command Center

import { state, getReadinessLevel } from '../state/state.js';

export function renderTeam() {
  const athletes = state.team.athletes;
  const sorted = [...athletes].sort((a, b) => a.readiness - b.readiness);

  // Readiness distribution
  const green  = athletes.filter(a => a.readiness >= 80).length;
  const yellow = athletes.filter(a => a.readiness >= 65 && a.readiness < 80).length;
  const orange = athletes.filter(a => a.readiness >= 50 && a.readiness < 65).length;
  const red    = athletes.filter(a => a.readiness < 50).length;
  const total  = athletes.length;

  const avgReadiness = Math.round(athletes.reduce((s, a) => s + a.readiness, 0) / total);
  const alerts = buildAlerts(athletes);

  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 class="page-title">Team Command Center</h1>
          <p class="page-subtitle">${state.team.name} · ${total} Athletes · Friday, March 6</p>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="phase-badge inseason">In-Season</span>
        </div>
      </div>
    </div>

    <!-- Team readiness summary -->
    <div class="grid-4" style="margin-bottom:24px;">
      <div class="card card-sm" style="border-color:rgba(0,229,160,0.2);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:12px;height:12px;border-radius:50%;background:var(--green);box-shadow:0 0 8px rgba(0,229,160,0.6);flex-shrink:0;"></div>
          <div>
            <div style="font-family:var(--font-display);font-weight:900;font-size:32px;line-height:1;color:var(--green);">${green}</div>
            <div class="stat-label">Ready to Go</div>
          </div>
        </div>
      </div>
      <div class="card card-sm" style="border-color:rgba(245,197,24,0.2);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:12px;height:12px;border-radius:50%;background:var(--yellow);box-shadow:0 0 8px rgba(245,197,24,0.6);flex-shrink:0;"></div>
          <div>
            <div style="font-family:var(--font-display);font-weight:900;font-size:32px;line-height:1;color:var(--yellow);">${yellow}</div>
            <div class="stat-label">Moderate</div>
          </div>
        </div>
      </div>
      <div class="card card-sm" style="border-color:rgba(255,122,53,0.2);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:12px;height:12px;border-radius:50%;background:var(--orange);box-shadow:0 0 8px rgba(255,122,53,0.6);flex-shrink:0;"></div>
          <div>
            <div style="font-family:var(--font-display);font-weight:900;font-size:32px;line-height:1;color:var(--orange);">${orange}</div>
            <div class="stat-label">Caution</div>
          </div>
        </div>
      </div>
      <div class="card card-sm" style="border-color:rgba(255,59,59,0.2);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:12px;height:12px;border-radius:50%;background:var(--red);box-shadow:0 0 8px rgba(255,59,59,0.6);flex-shrink:0;"></div>
          <div>
            <div style="font-family:var(--font-display);font-weight:900;font-size:32px;line-height:1;color:var(--red);">${red}</div>
            <div class="stat-label">Recover</div>
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start;">
      <!-- Readiness board -->
      <div>
        <!-- Visual distribution bar -->
        <div style="margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span class="section-label">Team Readiness Board</span>
            <span style="font-family:var(--font-display);font-weight:900;font-size:20px;color:${avgReadiness >= 75 ? 'var(--green)' : avgReadiness >= 60 ? 'var(--yellow)' : 'var(--orange)'};">Avg ${avgReadiness}</span>
          </div>
          <div class="readiness-summary-bar">
            ${green > 0  ? `<div class="rs-block green"  style="flex:${green};"  title="${green} athletes ready"></div>` : ''}
            ${yellow > 0 ? `<div class="rs-block yellow" style="flex:${yellow};" title="${yellow} athletes moderate"></div>` : ''}
            ${orange > 0 ? `<div class="rs-block orange" style="flex:${orange};" title="${orange} athletes caution"></div>` : ''}
            ${red > 0    ? `<div class="rs-block red"    style="flex:${red};"    title="${red} athletes need recovery"></div>` : ''}
          </div>
        </div>

        <!-- Athlete list sorted by readiness (lowest first = biggest concerns first) -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Athlete Readiness</span>
            <span style="font-size:12px;color:var(--text-muted);">Sorted by concern level</span>
          </div>
          ${sorted.map(a => renderAthleteRow(a)).join('')}
        </div>
      </div>

      <!-- Right sidebar: alerts + quick stats -->
      <div>
        ${alerts.length > 0 ? `
          <div class="card" style="margin-bottom:16px;border-color:rgba(255,122,53,0.2);">
            <p class="section-label" style="margin-bottom:12px;color:var(--orange);">⚠ Coach Alerts</p>
            ${alerts.map(a => `
              <div class="team-alert" style="margin-bottom:8px;">
                <div class="team-alert-msg">${a}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="alert alert-success" style="margin-bottom:16px;">
            ✅ No critical alerts today. Team is in good shape.
          </div>
        `}

        <div class="card" style="margin-bottom:16px;">
          <p class="section-label" style="margin-bottom:12px;">Today's Recommendation</p>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">
            ${getTeamRecommendation(avgReadiness, red, orange)}
          </div>
        </div>

        <div class="card">
          <p class="section-label" style="margin-bottom:12px;">Wellness Factors</p>
          ${renderTeamWellnessAvg(athletes)}
        </div>
      </div>
    </div>
  `;
}

function renderAthleteRow(athlete) {
  const rl = getReadinessLevel(athlete.readiness);
  const scoreColor = {
    green: 'var(--green)', yellow: 'var(--yellow)',
    orange: 'var(--orange)', red: 'var(--red)'
  }[rl.level];

  const whyParts = [];
  if (athlete.wellness.sleep < 6.5) whyParts.push('poor sleep');
  if (athlete.wellness.soreness >= 7) whyParts.push('high soreness');
  if (athlete.wellness.stress >= 7) whyParts.push('high stress');
  if (athlete.wellness.energy <= 3) whyParts.push('low energy');
  const why = whyParts.length > 0 ? whyParts.join(', ') : 'all markers in range';

  return `
    <div class="athlete-row">
      <div class="av" style="background:${athlete.color};">${athlete.initials}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${athlete.name}</div>
        <div style="font-size:11px;color:var(--text-muted);">${athlete.position} · ${why}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="traffic-dot ${rl.level}"></div>
        <div class="ar-score" style="color:${scoreColor};">${athlete.readiness}</div>
      </div>
    </div>
  `;
}

function buildAlerts(athletes) {
  const alerts = [];
  athletes.filter(a => a.readiness < 50).forEach(a => {
    const reasons = [];
    if (a.wellness.sleep < 6) reasons.push('sleep under 6h');
    if (a.wellness.soreness >= 8) reasons.push('soreness 8+');
    if (a.wellness.stress >= 8) reasons.push('high stress');
    alerts.push(`<strong>${a.name}</strong> (${a.position}) — Readiness ${a.readiness}. ${reasons.join(', ')}. Recovery session only.`);
  });

  // ACWR alerts would go here too
  return alerts;
}

function getTeamRecommendation(avgReadiness, redCount, orangeCount) {
  if (avgReadiness >= 80 && redCount === 0) {
    return 'Team is primed. Full-intensity practice is appropriate. Push competitive scenarios.';
  }
  if (avgReadiness >= 70 && redCount <= 1) {
    return `Most athletes are ready. ${redCount > 0 ? 'Pull red-status players to recovery work.' : ''} Normal practice load is safe for the group.`;
  }
  if (avgReadiness >= 60) {
    return `${redCount + orangeCount} athletes are fatigued. Consider reducing contact/collision drills. Skill work and film over conditioning today.`;
  }
  return `Team fatigue is high — ${redCount} athletes at recovery status. Light skill session only. Pushing intensity today risks injury and worsens cumulative load.`;
}

function renderTeamWellnessAvg(athletes) {
  const n = athletes.length;
  const avg = {
    sleep:    athletes.reduce((s, a) => s + a.wellness.sleep, 0) / n,
    soreness: athletes.reduce((s, a) => s + a.wellness.soreness, 0) / n,
    stress:   athletes.reduce((s, a) => s + a.wellness.stress, 0) / n,
    energy:   athletes.reduce((s, a) => s + a.wellness.energy, 0) / n,
  };

  const items = [
    { label: 'Avg Sleep', value: `${avg.sleep.toFixed(1)}h`, bar: (avg.sleep / 10) * 100, color: 'blue' },
    { label: 'Avg Soreness', value: avg.soreness.toFixed(1), bar: (avg.soreness / 10) * 100, color: avg.soreness > 6 ? 'red' : avg.soreness > 4 ? 'orange' : 'accent' },
    { label: 'Avg Stress', value: avg.stress.toFixed(1), bar: (avg.stress / 10) * 100, color: avg.stress > 6 ? 'red' : avg.stress > 4 ? 'orange' : 'accent' },
    { label: 'Avg Energy', value: avg.energy.toFixed(1), bar: (avg.energy / 10) * 100, color: 'yellow' },
  ];

  return items.map(item => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      <span style="font-size:11px;color:var(--text-muted);width:80px;flex-shrink:0;">${item.label}</span>
      <div style="flex:1;"><div class="progress-bar-wrap"><div class="progress-bar-fill ${item.color}" style="width:${item.bar}%"></div></div></div>
      <span style="font-family:var(--font-display);font-weight:700;font-size:14px;min-width:28px;text-align:right;">${item.value}</span>
    </div>
  `).join('');
}

export function afterRenderTeam() {}
