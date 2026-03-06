/* ================================================================
   progressivePrompts.js — PerformanceIQ v7 Progressive Disclosure
   In-context modals triggered at natural moments
   ================================================================ */

(function() {
  'use strict';

  // ─── IMPORTS FROM ONBOARDING ─────────────────────────────────────
  const EQUIPMENT = window.onboarding?.EQUIPMENT || [
    { id: 'bodyweight', icon: '🏃', label: 'Bodyweight', default: true },
    { id: 'dumbbells', icon: '🏋️', label: 'Dumbbells' },
    { id: 'barbell', icon: '🏋️', label: 'Barbell + Plates' },
    { id: 'bands', icon: '🔗', label: 'Resistance Bands' },
    { id: 'machines', icon: '⚙️', label: 'Machines (gym)' },
    { id: 'field', icon: '🏟️', label: 'Field / Court' },
    { id: 'pullup_bar', icon: '📊', label: 'Pull-up Bar' },
    { id: 'kettlebells', icon: '🔔', label: 'Kettlebells' },
  ];

  const EQUIP_PRESETS = window.onboarding?.EQUIP_PRESETS || {
    minimal: { label: 'Minimal', tags: ['bodyweight', 'bands'] },
    home: { label: 'Home Gym', tags: ['bodyweight', 'dumbbells', 'bands', 'pullup_bar'] },
    full: { label: 'Full Gym', tags: ['bodyweight', 'dumbbells', 'barbell', 'bands', 'machines', 'pullup_bar', 'kettlebells'] },
  };

  const EXPERIENCE_LEVELS = window.onboarding?.EXPERIENCE_LEVELS || [
    { id: 'beginner', label: 'Beginner', desc: 'New to structured training or returning after 6+ months' },
    { id: 'intermediate', label: 'Intermediate', desc: '1–3 years of consistent strength & conditioning' },
    { id: 'advanced', label: 'Advanced', desc: '3+ years, familiar with periodization & programming' },
  ];

  const GOALS = window.onboarding?.GOALS || [
    { id: 'strength', icon: '💪', label: 'Strength', desc: 'Lift heavier, get stronger' },
    { id: 'speed', icon: '⚡', label: 'Speed', desc: 'Faster sprints, quicker cuts' },
    { id: 'endurance', icon: '🫀', label: 'Endurance', desc: 'Last longer, recover faster' },
    { id: 'muscle_gain', icon: '📈', label: 'Muscle Gain', desc: 'Build size and definition' },
    { id: 'athleticism', icon: '🏆', label: 'Overall Athleticism', desc: 'Balanced across all areas' },
  ];

  const FREQ_DESC = window.onboarding?.FREQ_DESC || {
    2: 'Maintenance — ideal for in-season athletes',
    3: 'Foundation — builds strength with recovery',
    4: 'Balanced — strength + conditioning + rest',
    5: 'Intensive — serious off-season training',
    6: 'High volume — advanced athletes only',
  };

  // ─── HELPERS ─────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  
  function getState() {
    try {
      return window.dataStore?.state || JSON.parse(localStorage.getItem('piq_state') || '{}');
    } catch {
      return {};
    }
  }

  function persistProfile(updates) {
    const state = getState();
    state.profile = { ...state.profile, ...updates };
    if (window.dataStore?.setState) {
      window.dataStore.setState(state);
    } else {
      localStorage.setItem('piq_state', JSON.stringify(state));
    }
    return state;
  }

  function persistOnboarding(key, value) {
    const state = getState();
    if (!state.onboarding) state.onboarding = {};
    if (!state.onboarding.progressive) state.onboarding.progressive = {};
    state.onboarding.progressive[key] = value;
    if (window.dataStore?.setState) {
      window.dataStore.setState(state);
    } else {
      localStorage.setItem('piq_state', JSON.stringify(state));
    }
    return state;
  }

  function toast(msg) {
    if (window.toast) {
      window.toast(msg);
    } else {
      console.log('[toast]', msg);
    }
  }

  // ─── MODAL SYSTEM ────────────────────────────────────────────────
  let activeModal = null;
  let activeBackdrop = null;

  function createModal(id, title, bodyHTML, footerHTML) {
    // Remove any existing modals
    closeModal();

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'ob-modal-backdrop visible';
    backdrop.id = 'ppBackdrop';
    backdrop.addEventListener('click', closeModal);
    document.body.appendChild(backdrop);
    activeBackdrop = backdrop;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'ob-modal visible';
    modal.id = id;
    modal.innerHTML = `
      <div class="ob-modal-header">
        <h3 class="ob-modal-title">${title}</h3>
        <button type="button" class="ob-modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="ob-modal-body">
        ${bodyHTML}
      </div>
      ${footerHTML ? `<div class="ob-modal-footer">${footerHTML}</div>` : ''}
    `;
    document.body.appendChild(modal);
    activeModal = modal;

    // Bind close button
    modal.querySelector('.ob-modal-close').addEventListener('click', closeModal);

    // Trap focus
    modal.querySelector('button, [tabindex]:not([tabindex="-1"])')?.focus();

    return modal;
  }

  function createSheet(id, title, bodyHTML) {
    // Remove any existing
    closeModal();

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'ob-modal-backdrop visible';
    backdrop.id = 'ppBackdrop';
    backdrop.addEventListener('click', closeModal);
    document.body.appendChild(backdrop);
    activeBackdrop = backdrop;

    // Create sheet
    const sheet = document.createElement('div');
    sheet.className = 'ob-sheet visible';
    sheet.id = id;
    sheet.innerHTML = `
      <div class="ob-sheet-handle"></div>
      <div class="ob-sheet-body">
        <h3 class="ob-modal-title" style="margin-bottom: 20px;">${title}</h3>
        ${bodyHTML}
      </div>
    `;
    document.body.appendChild(sheet);
    activeModal = sheet;

    return sheet;
  }

  function closeModal() {
    if (activeBackdrop) {
      activeBackdrop.classList.remove('visible');
      setTimeout(() => activeBackdrop?.remove(), 300);
      activeBackdrop = null;
    }
    if (activeModal) {
      activeModal.classList.remove('visible');
      setTimeout(() => activeModal?.remove(), 300);
      activeModal = null;
    }
  }

  // ─── EQUIPMENT MODAL ─────────────────────────────────────────────
  function showEquipmentModal(onComplete) {
    const state = getState();
    const currentEquip = new Set(state.profile?.equipment || ['bodyweight']);

    const bodyHTML = `
      <p style="color: var(--ob-text-muted); font-size: 14px; margin-bottom: 20px;">
        This helps us create workouts you can actually do.
      </p>
      
      <div class="ob-checkbox-list" id="equipCheckboxes">
        ${EQUIPMENT.map(eq => `
          <label class="ob-checkbox-item ${currentEquip.has(eq.id) ? 'checked' : ''}" data-equip="${eq.id}">
            <span class="ob-checkbox"></span>
            <span class="ob-checkbox-icon">${eq.icon}</span>
            <span class="ob-checkbox-label">${eq.label}</span>
          </label>
        `).join('')}
      </div>
      
      <div style="font-size: 12px; color: var(--ob-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
        Quick Presets
      </div>
      <div class="ob-preset-row">
        ${Object.entries(EQUIP_PRESETS).map(([key, preset]) => `
          <button type="button" class="ob-preset-btn" data-preset="${key}">${preset.label}</button>
        `).join('')}
      </div>
    `;

    const footerHTML = `
      <button type="button" class="ob-btn ob-btn-primary" id="saveEquipmentBtn">Save & Continue</button>
    `;

    const modal = createModal('equipmentModal', 'What equipment do you have?', bodyHTML, footerHTML);

    // Bind checkboxes
    modal.querySelectorAll('.ob-checkbox-item').forEach(item => {
      item.addEventListener('click', () => {
        const equipId = item.dataset.equip;
        if (currentEquip.has(equipId)) {
          // Don't allow unchecking bodyweight
          if (equipId !== 'bodyweight') {
            currentEquip.delete(equipId);
          }
        } else {
          currentEquip.add(equipId);
        }
        // Update UI
        modal.querySelectorAll('.ob-checkbox-item').forEach(el => {
          el.classList.toggle('checked', currentEquip.has(el.dataset.equip));
        });
      });
    });

    // Bind presets
    modal.querySelectorAll('.ob-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = EQUIP_PRESETS[btn.dataset.preset];
        if (preset) {
          currentEquip.clear();
          preset.tags.forEach(t => currentEquip.add(t));
          modal.querySelectorAll('.ob-checkbox-item').forEach(el => {
            el.classList.toggle('checked', currentEquip.has(el.dataset.equip));
          });
        }
      });
    });

    // Bind save
    $('saveEquipmentBtn').addEventListener('click', () => {
      persistProfile({ equipment: Array.from(currentEquip) });
      persistOnboarding('equipment_captured', true);
      closeModal();
      toast(`Equipment saved — ${currentEquip.size} item${currentEquip.size > 1 ? 's' : ''}`);
      if (onComplete) onComplete();
    });
  }

  // ─── EXPERIENCE SHEET ────────────────────────────────────────────
  function showExperienceSheet(onComplete) {
    const state = getState();
    let selectedLevel = state.profile?.experience || null;

    const bodyHTML = `
      <div class="ob-experience-list" id="experienceLevels">
        ${EXPERIENCE_LEVELS.map(lvl => `
          <div class="ob-experience-card ${selectedLevel === lvl.id ? 'selected' : ''}" data-level="${lvl.id}" tabindex="0" role="button">
            <div class="ob-experience-label">${lvl.label}</div>
            <div class="ob-experience-desc">${lvl.desc}</div>
          </div>
        `).join('')}
      </div>
    `;

    const sheet = createSheet('experienceSheet', "What's your training experience?", bodyHTML);

    // Bind cards
    sheet.querySelectorAll('.ob-experience-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedLevel = card.dataset.level;
        persistProfile({ experience: selectedLevel });
        persistOnboarding('experience_captured', true);
        
        // Visual feedback
        sheet.querySelectorAll('.ob-experience-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        setTimeout(() => {
          closeModal();
          toast(`Experience set to ${selectedLevel}`);
          if (onComplete) onComplete();
        }, 200);
      });
    });
  }

  // ─── GOALS SHEET ─────────────────────────────────────────────────
  function showGoalsSheet(onComplete) {
    const state = getState();
    let selectedGoal = state.profile?.goal || null;

    const bodyHTML = `
      <div class="ob-goal-list" id="goalsList">
        ${GOALS.map(g => `
          <div class="ob-goal-card ${selectedGoal === g.id ? 'selected' : ''}" data-goal="${g.id}" tabindex="0" role="button">
            <span class="ob-goal-icon">${g.icon}</span>
            <div class="ob-goal-content">
              <div class="ob-goal-label">${g.label}</div>
              <div class="ob-goal-desc">${g.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const sheet = createSheet('goalsSheet', "What's your primary goal?", bodyHTML);

    // Bind cards
    sheet.querySelectorAll('.ob-goal-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedGoal = card.dataset.goal;
        persistProfile({ goal: selectedGoal });
        persistOnboarding('goal_captured', true);
        
        sheet.querySelectorAll('.ob-goal-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        setTimeout(() => {
          closeModal();
          toast(`Goal set to ${selectedGoal}`);
          if (onComplete) onComplete();
        }, 200);
      });
    });
  }

  // ─── FREQUENCY SHEET ─────────────────────────────────────────────
  function showFrequencySheet(onComplete) {
    const state = getState();
    let selectedFreq = state.profile?.frequency || 4;

    const bodyHTML = `
      <div class="ob-frequency-row" id="frequencyBtns">
        ${[2, 3, 4, 5, 6].map(n => `
          <button type="button" class="ob-frequency-btn ${selectedFreq === n ? 'selected' : ''}" data-freq="${n}">
            <span class="ob-frequency-num">${n}</span>
            <span class="ob-frequency-label">days</span>
          </button>
        `).join('')}
      </div>
      <div class="ob-frequency-desc" id="freqDescText">
        ${FREQ_DESC[selectedFreq] || ''}
      </div>
      <button type="button" class="ob-btn ob-btn-primary" id="saveFreqBtn" style="margin-top: 20px;">Save</button>
    `;

    const sheet = createSheet('frequencySheet', 'How many days per week?', bodyHTML);

    // Bind frequency buttons
    sheet.querySelectorAll('.ob-frequency-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFreq = parseInt(btn.dataset.freq, 10);
        sheet.querySelectorAll('.ob-frequency-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        $('freqDescText').textContent = FREQ_DESC[selectedFreq] || '';
      });
    });

    // Bind save
    $('saveFreqBtn').addEventListener('click', () => {
      persistProfile({ frequency: selectedFreq });
      persistOnboarding('frequency_captured', true);
      closeModal();
      toast(`Training ${selectedFreq} days/week`);
      if (onComplete) onComplete();
    });
  }

  // ─── TOAST PROMPT ────────────────────────────────────────────────
  function showToastPrompt(message, buttonText, onClick) {
    // Remove existing
    const existing = $('toastPrompt');
    if (existing) existing.remove();

    const toastEl = document.createElement('div');
    toastEl.className = 'ob-toast-prompt';
    toastEl.id = 'toastPrompt';
    toastEl.innerHTML = `
      <span class="ob-toast-text">${message}</span>
      <button type="button" class="ob-toast-btn">${buttonText}</button>
    `;
    document.body.appendChild(toastEl);

    // Show with animation
    requestAnimationFrame(() => {
      toastEl.classList.add('visible');
    });

    // Bind button
    toastEl.querySelector('.ob-toast-btn').addEventListener('click', () => {
      toastEl.classList.remove('visible');
      setTimeout(() => toastEl.remove(), 400);
      if (onClick) onClick();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.classList.remove('visible');
        setTimeout(() => toastEl.remove(), 400);
      }
    }, 10000);
  }

  // ─── TRIGGER CONDITIONS ──────────────────────────────────────────
  function shouldPromptEquipment() {
    const state = getState();
    return state.onboarding?.completed && 
           !state.onboarding?.progressive?.equipment_captured &&
           !state.profile?.equipment?.length;
  }

  function shouldPromptExperience() {
    const state = getState();
    return state.onboarding?.completed && 
           state.onboarding?.progressive?.equipment_captured &&
           !state.onboarding?.progressive?.experience_captured &&
           !state.profile?.experience;
  }

  function shouldPromptGoals() {
    const state = getState();
    return state.onboarding?.completed && 
           state.onboarding?.progressive?.equipment_captured &&
           !state.onboarding?.progressive?.goal_captured &&
           !state.profile?.goal &&
           state.onboarding?.first_session_logged;
  }

  function shouldPromptFrequency() {
    const state = getState();
    return state.onboarding?.completed && 
           !state.onboarding?.progressive?.frequency_captured &&
           !state.profile?.frequency &&
           (state.onboarding?.streak_count || 0) >= 3;
  }

  // ─── HOOK: BEFORE GENERATE ───────────────────────────────────────
  function beforeGenerate(callback) {
    if (shouldPromptEquipment()) {
      showEquipmentModal(() => {
        if (shouldPromptExperience()) {
          showExperienceSheet(callback);
        } else {
          callback();
        }
      });
      return false; // Indicate generation should wait
    }
    return true; // Proceed immediately
  }

  // ─── HOOK: AFTER LOG SESSION ─────────────────────────────────────
  function afterLogSession() {
    const state = getState();
    
    // Mark first session logged
    if (!state.onboarding?.first_session_logged) {
      persistOnboarding('first_session_logged', true);
    }

    // Increment streak
    const streak = (state.onboarding?.streak_count || 0) + 1;
    persistOnboarding('streak_count', streak);

    // Check for goal prompt
    if (shouldPromptGoals()) {
      setTimeout(() => {
        showToastPrompt("Nice work! What's your primary goal?", 'Set Goal', () => {
          showGoalsSheet();
        });
      }, 1500);
    }
    // Check for frequency prompt (3-day streak)
    else if (shouldPromptFrequency()) {
      setTimeout(() => {
        showToastPrompt(`${streak} days strong! 🔥 How many days can you train?`, 'Set Schedule', () => {
          showFrequencySheet();
        });
      }, 1500);
    }
  }

  // ─── EXPOSE API ──────────────────────────────────────────────────
  window.progressivePrompts = {
    showEquipmentModal,
    showExperienceSheet,
    showGoalsSheet,
    showFrequencySheet,
    showToastPrompt,
    beforeGenerate,
    afterLogSession,
    closeModal,
    shouldPromptEquipment,
    shouldPromptExperience,
    shouldPromptGoals,
    shouldPromptFrequency,
  };

})();
