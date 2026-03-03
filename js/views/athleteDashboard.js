// /js/views/athleteDashboard.js
// PURPOSE: Personal dashboard shown when role === 'athlete'.
// Shows the athlete's own PIQ, readiness, recent sessions, and a motivational
// daily focus card — no team-wide data exposed.

import { STATE, ATHLETES } from '../state/state.js';
import { computePIQ }       from '../features/piqScore.js';
import { computeACWR }      from '../features/acwr.js';
import { computeRisk }      from '../features/riskDetection.js';
import { computeAthleteScoreV1 } from '../features/scoring.js';

function todayKey() { return new Date().toISOString().slice(0, 10); }

function latestWellness(a) {
  const w = a?.history?.wellness;
  return Array.isArray(w) && w.length ? w[w.length - 1] : null;
}

function recentSessions(a, n = 5) {
  const s = a?.history?.sessions;
  return Array.isArray(s) ? s.slice(-n).reverse() : [];
}

function piqColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

function readinessClass(score) {
  if (score >= 80) return 'ready';
  if (score >= 55) return 'watch';
  return 'risk';
}

function readinessLabel(score) {
  if (score >= 80) return '🟢 Ready to Perform';
  if (score >= 55) return '🟡 Train with Caution';
  return '🔴 Rest Recommended';
}

function focusMessage(w, acwr) {
  if (!w) return { title: 'Log Your Wellness', body: 'Check in today to unlock your PIQ score and personalized guidance.' };
  const piq = computePIQ(w).score;
  const acwrV = acwr ?? 1;

  if (piq >= 80 && acwrV < 1.3) return { title: '🔥 Peak Day — Push It', body: 'Your body is primed. Focus on quality reps and intensity today.' };
  if (piq >= 80 && acwrV >= 1.3) return { title: '⚡ High Fitness, Watch Load', body: 'You feel great but your cumulative load is elevated. Dial back volume slightly.' };
  if (piq >= 55 && piq < 80)     return { title: '🎯 Solid — Train Smart', body: 'Good baseline. Nail your technique today and keep sleep consistent.' };
  if (w.soreness >= 7)            return { title: '🧊 High Soreness — Active Recovery', body: 'Prioritize mobility work, light movement, and hydration.' };
  if (w.stress >= 7)              return { title: '🧠 Stress High — Short Session', body: 'Mental load affects performance. Keep today\'s session short and deliberate.' };
  return { title: '🛌 Rest & Recover', body: 'Your readiness is low. Quality sleep and nutrition will get you back faster.' };
}

export function renderAthleteDashboard(host) {
  if (!host) return;
  host.innerHTML = '';

  const a = STATE.athleteId ? ATHLETES.find(x => x.id === STATE.athleteId) : null;

  // ── No profile selected ───────────────────────────────────────────────
  if (!a) {
    host.innerHTML = `
      <div class="athlete-hero" style="flex-direction:column;align-items:flex-start;gap:10px">
        <div style="font-size:28px">👋</div>
        <div class="athlete-hero-name">Welcome, Athlete!</div>
        <div class="athlete-hero-sub">Go to <strong>Settings → Your Athlete Profile</strong> to link your name and unlock your personal dashboard.</div>
        <button class="btn btn-sm" onclick="document.querySelector('[data-view=settings]')?.click()">Go to Settings →</button>
      </div>`;
    return;
  }

  const wellness = latestWellness(a);
  const piq      = wellness ? computePIQ(wellness) : { score: 0 };
  const acwr     = computeACWR(a);
  const perf     = computeAthleteScoreV1(a, { state: STATE });
  const risk     = computeRisk(a);
  const sessions = recentSessions(a);
  const focus    = focusMessage(wellness, acwr);
  const todayCheckedIn = (a?.history?.wellness || []).some(w => w.date === todayKey());

  const pct = piq.score;
  const readClass = readinessClass(piq.score);
  const color = piqColor(piq.score);

  // ── Hero card ─────────────────────────────────────────────────────────
  const hero = document.createElement('div');
  hero.className = 'athlete-hero';
  hero.innerHTML = `
    <div class="athlete-hero-ring" style="--pct:${pct}%">
      <div class="athlete-hero-score" style="color:${color}">${pct}</div>
    </div>
    <div class="athlete-hero-meta">
      <div class="athlete-hero-name">${a.name}</div>
      <div class="athlete-hero-sub">${STATE.sport ? STATE.sport.charAt(0).toUpperCase() + STATE.sport.slice(1) : 'Athlete'} · ${STATE.season || 'Season'}</div>
      <div class="athlete-stat-row">
        <div class="athlete-stat-pill">
          <strong style="color:${color}">${piq.score}</strong>
          PIQ Score
        </div>
        <div class="athlete-stat-pill">
          <strong>${perf.total ?? '—'}</strong>
          PerformanceIQ
        </div>
        <div class="athlete-stat-pill">
          <strong style="color:${acwr == null ? 'inherit' : acwr > 1.3 ? '#ef4444' : acwr < 0.8 ? '#f59e0b' : '#10b981'}">${acwr != null ? acwr.toFixed(2) : '—'}</strong>
          ACWR
        </div>
        <div class="athlete-stat-pill">
          <strong>${sessions.length}</strong>
          Sessions
        </div>
      </div>
    </div>`;
  host.appendChild(hero);

  // ── Readiness banner ──────────────────────────────────────────────────
  const banner = document.createElement('div');
  banner.className = `athlete-readiness-banner ${readClass}`;
  banner.innerHTML = `
    <div class="athlete-readiness-score" style="color:${color}">${piq.score}</div>
    <div>
      <div style="font-weight:700;font-size:15px;margin-bottom:2px">${readinessLabel(piq.score)}</div>
      <div style="font-size:13px;color:var(--muted)">${wellness ? `Last check-in: ${wellness.date || 'today'}` : 'No wellness logged yet — check in below'}</div>
    </div>
    ${!todayCheckedIn ? `<button class="btn btn-sm" style="margin-left:auto" onclick="document.querySelector('[data-view=wellness]')?.click()">Log Today →</button>` : ''}`;
  host.appendChild(banner);

  // ── Daily focus card ──────────────────────────────────────────────────
  const focusCard = document.createElement('div');
  focusCard.className = 'panel';
  focusCard.style.marginBottom = '16px';
  focusCard.innerHTML = `
    <div class="panel-header">
      <div class="panel-title">Today's Focus</div>
      <div style="font-size:11px;color:var(--muted)">${new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })}</div>
    </div>
    <div style="padding:16px 20px">
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">${focus.title}</div>
      <div style="font-size:14px;color:var(--muted);line-height:1.5">${focus.body}</div>
    </div>`;
  host.appendChild(focusCard);

  // ── Two-col grid: wellness snapshot + recent sessions ─────────────────
  const grid = document.createElement('div');
  grid.className = 'grid-2';

  // Wellness snapshot
  const wellPanel = document.createElement('div');
  wellPanel.className = 'panel';
  if (wellness) {
    wellPanel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">Wellness Snapshot</div>
        <span style="font-size:11px;color:var(--muted)">${wellness.date || ''}</span>
      </div>
      <div style="padding:14px 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[
          ['😴 Sleep', wellness.sleep],
          ['💪 Soreness', wellness.soreness],
          ['🧠 Stress', wellness.stress],
          ['😊 Mood', wellness.mood],
          ['⚡ Readiness', wellness.readiness],
        ].map(([label, val]) => `
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:2px">${label}</div>
            <div style="font-family:var(--font-display);font-size:22px;font-weight:900;line-height:1">${val ?? '—'}<span style="font-size:12px;font-weight:400;color:var(--muted)">/10</span></div>
          </div>`).join('')}
      </div>`;
  } else {
    wellPanel.innerHTML = `
      <div class="panel-header"><div class="panel-title">Wellness Snapshot</div></div>
      <div style="padding:24px;text-align:center;color:var(--muted)">
        <div style="font-size:28px;margin-bottom:8px">📋</div>
        <div style="font-size:13px">No wellness logged yet.</div>
        <button class="btn btn-sm" style="margin-top:12px" onclick="document.querySelector('[data-view=wellness]')?.click()">Log Wellness →</button>
      </div>`;
  }
  grid.appendChild(wellPanel);

  // Recent sessions
  const sessPanel = document.createElement('div');
  sessPanel.className = 'panel';
  sessPanel.innerHTML = `<div class="panel-header"><div class="panel-title">Recent Sessions</div></div>`;
  const sessBody = document.createElement('div');
  sessBody.style.padding = '8px 12px';

  if (!sessions.length) {
    sessBody.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted);font-size:13px">No sessions logged yet.</div>`;
  } else {
    sessions.forEach(s => {
      const intensity = Number(s.intensity || 0);
      const dotClass = intensity >= 8 ? 'high' : intensity >= 5 ? 'med' : 'low';
      const card = document.createElement('div');
      card.className = 'athlete-train-card';
      card.innerHTML = `
        <div class="athlete-train-dot ${dotClass}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;text-transform:capitalize">${s.type || 'Session'}</div>
          <div style="font-size:11px;color:var(--muted)">${s.date || ''} · ${s.duration ?? '—'} min · RPE ${s.intensity ?? '—'}</div>
        </div>
        <div style="font-family:var(--font-display);font-size:18px;font-weight:900;color:var(--muted)">${s.load ?? '—'}</div>`;
      sessBody.appendChild(card);
    });
  }

  sessPanel.appendChild(sessBody);
  grid.appendChild(sessPanel);
  host.appendChild(grid);

  // ── Risk/Insight callout ──────────────────────────────────────────────
  if (risk && risk.colorClass !== 'ok') {
    const alert = document.createElement('div');
    alert.className = `piq-alert ${risk.colorClass === 'risk' ? 'danger' : 'warn'}`;
    alert.style.marginTop = '4px';
    alert.innerHTML = `
      <span class="piq-alert-icon">${risk.colorClass === 'risk' ? '🚨' : '⚠️'}</span>
      <div>
        <div class="piq-alert-title">${risk.label}</div>
        <div class="piq-alert-body">${risk.detail || 'Talk to your coach if this persists.'}</div>
      </div>`;
    host.appendChild(alert);
  }
}
