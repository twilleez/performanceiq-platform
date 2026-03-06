/* ================================================================
   eliteTrainingEngine.js — PerformanceIQ Elite Training Engine
   Exercise cards, swap modal, rest timer, progress + scoring helpers
   ================================================================ */
(function(){
  'use strict';

  const $ = id => document.getElementById(id);

  function parseRepEstimate(reps){
    return window.PIQExerciseLibrary?.repEstimate?.(reps) || 8;
  }

  function ensureSessionState(state, session){
    state.ui = state.ui || {};
    if (!state.ui.activeSession || state.ui.activeSession.session_id !== session.id) {
      state.ui.activeSession = {
        session_id: session.id,
        started_at: new Date().toISOString(),
        completed_sets: {},
        rest_end_at: null,
        rest_exercise_id: null,
        notes: '',
      };
    }
    return state.ui.activeSession;
  }

  function getExerciseMeta(item, sport){
    if (item.exercise_id) return window.PIQExerciseLibrary?.getExerciseById?.(item.exercise_id, sport) || null;
    return window.PIQExerciseLibrary?.getExerciseById?.(item.id, sport) || null;
  }

  function totalPlannedSets(session){
    return (session.blocks || []).reduce((sum, b) => sum + (b.items || []).reduce((a, item) => a + Number(item.sets || 0), 0), 0);
  }

  function totalCompletedSets(activeSession){
    const map = activeSession?.completed_sets || {};
    return Object.values(map).reduce((s, v) => s + Number(v || 0), 0);
  }

  function computeCompletionPct(session, activeSession){
    const total = totalPlannedSets(session);
    if (!total) return 0;
    return Math.round((totalCompletedSets(activeSession) / total) * 100);
  }

  function computeSessionVolume(session, activeSession){
    let volume = 0;
    for (const block of (session.blocks || [])) {
      for (const item of (block.items || [])) {
        const completed = Number(activeSession?.completed_sets?.[item.id] || 0);
        const reps = parseRepEstimate(item.reps);
        volume += completed * reps;
      }
    }
    return volume;
  }

  function computeScore(state){
    const sessions = Array.isArray(state.sessions) ? state.sessions : [];
    const last14 = sessions.filter(s => {
      const t = new Date(s.logged_at || s.generated_at || Date.now()).getTime();
      return (Date.now() - t) <= 14 * 86400000;
    });

    const completionAvg = last14.length
      ? last14.reduce((a, s) => a + Number(s.completion_pct || 0), 0) / last14.length
      : 0;

    const weeklyVolume = sessions.filter(s => {
      const t = new Date(s.logged_at || Date.now()).getTime();
      return (Date.now() - t) <= 7 * 86400000;
    }).reduce((a, s) => a + Number(s.volume_score || 0), 0);

    const streak = Number(state.onboarding?.streak_count || 0);
    const consistency = Math.min(100, Math.round(completionAvg));
    const volume = Math.min(100, Math.round((weeklyVolume / 180) * 100));
    const attendance = Math.min(100, Math.round((last14.length / 6) * 100));
    const streakScore = Math.min(100, streak * 10);

    const score = Math.round((consistency * 0.35) + (volume * 0.25) + (attendance * 0.20) + (streakScore * 0.20));
    return { score, consistency, volume, attendance, streak: streakScore };
  }

  function startRestTimer(state, seconds, exerciseId){
    state.ui = state.ui || {};
    state.ui.activeSession = state.ui.activeSession || {};
    state.ui.activeSession.rest_end_at = Date.now() + (Number(seconds || 0) * 1000);
    state.ui.activeSession.rest_exercise_id = exerciseId || null;
  }

  function restRemaining(state){
    const end = state?.ui?.activeSession?.rest_end_at;
    if (!end) return 0;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }

  function openExerciseModal(item, session){
    const modal = $('exerciseDetailModal');
    const backdrop = $('exerciseDetailBackdrop');
    if (!modal || !backdrop) return;
    const meta = getExerciseMeta(item, session.sport) || {};

    $('exerciseDetailTitle').textContent = item.name || meta.title || 'Exercise';
    $('exerciseDetailSub').textContent = `${item.sets || meta.defaultSets || 3} sets • ${item.reps || meta.defaultReps || '8-10'} • Rest ${item.rest_sec || meta.defaultRest || 60}s`;
    $('exerciseDetailCues').innerHTML = (meta.cues || [item.cue || 'Stay controlled and athletic']).map(x => `<li>${x}</li>`).join('');
    $('exerciseDetailMistakes').innerHTML = (meta.mistakes || ['Loss of technique under fatigue']).map(x => `<li>${x}</li>`).join('');
    $('exerciseDetailProg').innerHTML = (meta.progressions || ['Increase load or complexity']).map(x => `<li>${x}</li>`).join('');
    $('exerciseDetailReg').innerHTML = (meta.regressions || ['Reduce range, tempo, or load']).map(x => `<li>${x}</li>`).join('');
    $('exerciseDetailEquip').textContent = (meta.equipment || item.equipment || ['bodyweight']).join(', ');

    backdrop.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeExerciseModal(){
    $('exerciseDetailBackdrop') && ($('exerciseDetailBackdrop').hidden = true);
    $('exerciseDetailModal') && $('exerciseDetailModal').setAttribute('aria-hidden', 'true');
  }

  function openSwapModal(state, session, item, onSwap){
    const modal = $('swapModal');
    const backdrop = $('swapBackdrop');
    if (!modal || !backdrop) return;
    const profile = state.profile || {};
    const alternatives = window.PIQExerciseLibrary?.getAlternatives?.(item.exercise_id || item.id, {
      sport: session.sport,
      equipment: profile.equipment || ['bodyweight']
    }) || [];

    $('swapTitle').textContent = `Swap: ${item.name}`;
    $('swapList').innerHTML = alternatives.length
      ? alternatives.map(alt => `
          <button class="swap-option" data-id="${alt.id}">
            <strong>${alt.title}</strong>
            <span>${alt.defaultSets} sets • ${alt.defaultReps} • ${alt.equipment.join(', ')}</span>
          </button>
        `).join('')
      : '<div class="muted">No compatible alternatives found for current equipment.</div>';

    $('swapList').querySelectorAll('.swap-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const alt = window.PIQExerciseLibrary?.getExerciseById?.(btn.dataset.id, session.sport);
        if (!alt) return;
        onSwap({
          ...item,
          exercise_id: alt.id,
          name: alt.title,
          reps: item.reps || alt.defaultReps,
          sets: item.sets || alt.defaultSets,
          rest_sec: item.rest_sec || alt.defaultRest,
          cue: (alt.cues || [item.cue]).join(' • '),
          equipment: alt.equipment,
          type: alt.type,
        });
        closeSwapModal();
      }, { once: true });
    });

    backdrop.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeSwapModal(){
    $('swapBackdrop') && ($('swapBackdrop').hidden = true);
    $('swapModal') && $('swapModal').setAttribute('aria-hidden', 'true');
  }

  window.PIQEliteTraining = {
    parseRepEstimate,
    ensureSessionState,
    totalPlannedSets,
    totalCompletedSets,
    computeCompletionPct,
    computeSessionVolume,
    computeScore,
    startRestTimer,
    restRemaining,
    openExerciseModal,
    closeExerciseModal,
    openSwapModal,
    closeSwapModal,
  };
})();
