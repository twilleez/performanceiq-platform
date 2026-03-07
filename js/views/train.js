// js/views/train.js — Training session view

import { state, getReadinessLevel } from '../state/state.js';
import { generateSession } from '../engine/trainingGenerator.js';
import { findSwaps } from '../engine/swapEngine.js';

let activeSession = null;
let completedExercises = new Set();

export function renderTrain() {
  if (!state.readiness) {
    return `<div class="alert alert-info">Log your wellness first to get your personalized session.</div>`;
  }

  if (!activeSession) {
    activeSession = generateSession(state.athlete, state.readiness);
    state.session = activeSession;
  }

  const rl = getReadinessLevel(state.readiness.score);
  const totalExercises = countExercises(activeSession);
  const completedCount = completedExercises.size;

  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 class="page-title">${activeSession.title}</h1>
          <p class="page-subtitle">${activeSession.phase_note} · ${activeSession.stage_note}</p>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="text-align:right;">
            <div style="font-family:var(--font-display);font-weight:900;font-size:22px;color:var(--accent);">${completedCount}/${totalExercises}</div>
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;">Completed</div>
          </div>
          <button class="btn btn-secondary btn-sm" id="regen-session">↺ Regenerate</button>
        </div>
      </div>
    </div>

    <!-- Readiness context bar -->
    <div class="readiness-banner ${rl.level}" style="margin-bottom:24px;">
      <div class="banner-icon">${rl.emoji}</div>
      <div>
        <div class="banner-title">Readiness ${state.readiness.score} — ${rl.label}</div>
        <div class="banner-why">${state.readiness.why}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Intensity: ${describeIntensityMod(activeSession.intensity_mod)}</div>
      </div>
    </div>

    <!-- Progress bar -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span class="section-label">Session Progress</span>
        <span style="font-size:12px;color:var(--text-muted);">${Math.round((completedCount / totalExercises) * 100)}%</span>
      </div>
      <div class="progress-bar-wrap" style="height:8px;">
        <div class="progress-bar-fill accent" style="width:${(completedCount / totalExercises) * 100}%"></div>
      </div>
    </div>

    <!-- Warmup -->
    ${renderSection('Warmup', '🔥', activeSession.sections.warmup, 'warmup')}

    <!-- Main Work -->
    ${renderSection('Main Work', '💪', activeSession.sections.main, 'main')}

    <!-- Accessory -->
    ${renderSection('Accessory', '🎯', activeSession.sections.accessory, 'accessory')}

    <!-- Conditioning -->
    ${activeSession.sections.conditioning.length > 0 ? renderSection('Conditioning', '⚡', activeSession.sections.conditioning, 'conditioning') : ''}

    <!-- Cooldown -->
    ${renderSection('Cooldown', '❄️', activeSession.sections.cooldown, 'cooldown')}

    <!-- Swap Modal Placeholder -->
    <div id="swap-modal" style="display:none;" class="swap-modal-overlay">
      <div class="swap-modal-content card-xl">
        <div id="swap-modal-body"></div>
      </div>
    </div>
  `;
}

function renderSection(title, icon, exercises, sectionKey) {
  if (!exercises || exercises.length === 0) return '';
  return `
    <div style="margin-bottom:28px;">
      <p class="section-label" style="margin-bottom:12px;">${icon} ${title}</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${exercises.map((ex, i) => renderExerciseCard(ex, i + 1, sectionKey)).join('')}
      </div>
    </div>
  `;
}

function renderExerciseCard(ex, index, sectionKey) {
  const exId = `${sectionKey}-${index}`;
  const isDone = completedExercises.has(exId);
  const tag = ex.tags?.[0] || ex.category || 'strength';

  return `
    <div class="exercise-card ${isDone ? 'completed' : ''}" data-ex-id="${exId}">
      <div class="ex-index">${String(index).padStart(2, '0')}</div>
      <div class="ex-content">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span class="ex-name">${ex.name}</span>
          <span class="ex-tag ${tag}">${tag}</span>
        </div>
        <div class="ex-meta">${ex.primary_muscle} · ${ex.equipment} · ${ex.difficulty}</div>
        <div class="ex-sets">
          <span class="ex-set-badge">${ex.session_sets} sets</span>
          <span class="ex-set-badge">${ex.reps} reps</span>
          ${ex.load ? `<span class="ex-set-badge" style="color:var(--accent)">${ex.load}</span>` : ''}
          ${ex.rpe ? `<span class="ex-set-badge">RPE ${ex.rpe}</span>` : ''}
        </div>
        ${ex.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px;font-style:italic;">${ex.notes}</div>` : ''}
      </div>
      <div class="ex-actions">
        <button class="btn-complete ${isDone ? 'done' : ''}" data-action="complete" data-ex-id="${exId}">
          ${isDone ? '✓ Done' : 'Mark Done'}
        </button>
        <button class="btn-swap" data-action="swap" data-ex-id="${exId}" data-ex-lib-id="${ex.id}">
          ↔ Swap
        </button>
      </div>
    </div>
  `;
}

export function afterRenderTrain() {
  // Complete buttons
  document.querySelectorAll('[data-action="complete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.exId;
      if (completedExercises.has(id)) {
        completedExercises.delete(id);
      } else {
        completedExercises.add(id);
      }
      // Re-render
      document.getElementById('view-container').innerHTML = renderTrain();
      afterRenderTrain();
    });
  });

  // Swap buttons
  document.querySelectorAll('[data-action="swap"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const libId = btn.dataset.exLibId;
      openSwapModal(libId);
    });
  });

  // Regen
  document.getElementById('regen-session')?.addEventListener('click', () => {
    activeSession = null;
    completedExercises.clear();
    document.getElementById('view-container').innerHTML = renderTrain();
    afterRenderTrain();
  });

  // Swap modal close
  document.getElementById('swap-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'swap-modal') closeSwapModal();
  });
}

function openSwapModal(exerciseId) {
  const swaps = findSwaps(exerciseId, { sport: state.athlete.sport });
  const modal = document.getElementById('swap-modal');
  const body  = document.getElementById('swap-modal-body');
  if (!modal || !body) return;

  if (swaps.length === 0) {
    body.innerHTML = `<p style="color:var(--text-secondary)">No compatible swaps found for your current equipment setup.</p>`;
  } else {
    body.innerHTML = `
      <div class="card-header" style="margin-bottom:16px;">
        <span class="card-title">Swap Exercise</span>
        <button onclick="document.getElementById('swap-modal').style.display='none'" style="color:var(--text-muted);font-size:20px;line-height:1;">×</button>
      </div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Same movement pattern — drop-in replacements</p>
      ${swaps.map(s => `
        <div class="exercise-card" style="margin-bottom:10px;cursor:pointer;" onclick="document.getElementById('swap-modal').style.display='none'">
          <div class="ex-content">
            <div class="ex-name">${s.name}</div>
            <div class="ex-meta">${s.primary_muscle} · ${s.equipment} · ${s.difficulty}</div>
            <div style="font-size:11px;color:var(--accent);margin-top:4px;">${s.reason}</div>
          </div>
          <div>
            <button class="btn btn-ghost btn-sm">Use This</button>
          </div>
        </div>
      `).join('')}
    `;
  }
  modal.style.display = 'flex';
}

function closeSwapModal() {
  const modal = document.getElementById('swap-modal');
  if (modal) modal.style.display = 'none';
}

function countExercises(session) {
  return Object.values(session.sections).reduce((sum, arr) => sum + (arr?.length || 0), 0);
}

function describeIntensityMod(mod) {
  if (mod >= 0.9) return 'Full intensity';
  if (mod >= 0.75) return 'Reduced ~15-20%';
  if (mod >= 0.6) return 'Significantly reduced';
  return 'Active recovery only';
}
