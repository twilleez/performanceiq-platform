/* ================================================================
   dataStore.js — PerformanceIQ v7 Data Layer
   Offline-first state management with IndexedDB + localStorage
   ================================================================ */

(function() {
  'use strict';

  // ─── DEFAULT STATE (v7 Extended) ─────────────────────────────────
  const DEFAULT_STATE = {
    
    // ─── PROFILE ───────────────────────────────────────────────────
    profile: {
      // Identity
      name: '',
      email: '',
      
      // Role & Team (Phase 1)
      role: 'athlete',
      team_mode: 'solo',
      team_code: '',
      
      // Sport & Position (Phase 2)
      sport: 'basketball',
      position: null,
      
      // Training Profile (Phase 3 - Progressive)
      equipment: ['bodyweight'],
      experience: null,
      level: 'intermediate',  // Legacy alias for experience
      goal: null,
      frequency: null,
      preferred_session_type: 'practice',
      
      // Physical
      weight_lbs: 160,
      height_in: 70,
      age: null,
      gender: null,
      
      // Injuries
      injuries: [],
      
      // Account (Phase 4)
      account_created: false,
      meal_plan_enabled: false,
      dietary_restrictions: [],
      meal_preferences: [],
      
      // Preferences
      activity: 'med',
    },

    // ─── ONBOARDING STATE ──────────────────────────────────────────
    onboarding: {
      completed: false,
      current_step: 'welcome',
      
      // Progressive disclosure flags
      progressive: {
        equipment_captured: false,
        experience_captured: false,
        goal_captured: false,
        frequency_captured: false,
      },
      
      // Session tracking
      first_session_logged: false,
      streak_count: 0,
      last_session_date: null,
      
      // Prompts shown
      account_prompt_shown: false,
      meal_plan_prompt_shown: false,
    },

    // ─── UI STATE ──────────────────────────────────────────────────
    ui: {
      currentView: 'home',
      todaySession: null,
      activeSession: null,
      sessionStartTime: null,
      theme: 'dark',
      sidebarOpen: false,
    },

    // ─── TEAM STATE ────────────────────────────────────────────────
    team: {
      active_team_id: null,
      teams: [],
      invites: [],
      announcements: [],
    },

    // ─── SESSIONS & TRAINING ───────────────────────────────────────
    sessions: [],
    
    // ─── PERSONAL RECORDS ──────────────────────────────────────────
    prs: [],
    
    // ─── ACHIEVEMENTS ──────────────────────────────────────────────
    badges: [],
    
    // ─── WELLNESS DATA ─────────────────────────────────────────────
    wellness: {
      checkins: [],
      sleep: [],
      hrv: [],
    },
    
    // ─── NUTRITION ─────────────────────────────────────────────────
    nutrition: {
      meals: [],
      water: [],
    },
    
    // ─── PERIODIZATION ─────────────────────────────────────────────
    periodization: {
      current_phase: 'general',
      week_of_phase: 1,
      plan: null,
    },
    
    // ─── INSIGHTS/ANALYTICS ────────────────────────────────────────
    insights: {
      weekly_volume: [],
      acwr_history: [],
    },
    
    // ─── MESSAGING ─────────────────────────────────────────────────
    messaging: {
      threads: [],
      unread_count: 0,
    },
    
    // ─── WEARABLE SYNC ─────────────────────────────────────────────
    wearable: {
      connected: false,
      provider: null,
      last_sync: null,
    },
    
    // ─── META ──────────────────────────────────────────────────────
    _version: '7.0.0',
    _created: null,
    _updated: null,
  };

  // ─── STATE ───────────────────────────────────────────────────────
  let state = null;
  let db = null;
  const DB_NAME = 'PerformanceIQ';
  const DB_VERSION = 2;
  const STORE_NAME = 'appState';
  const LS_KEY = 'piq_state';

  // ─── INDEXEDDB SETUP ─────────────────────────────────────────────
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('[dataStore] IndexedDB not available, using localStorage');
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('[dataStore] IndexedDB error:', request.error);
        resolve(null);
      };

      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  // ─── LOAD STATE ──────────────────────────────────────────────────
  async function loadState() {
    try {
      // Try IndexedDB first
      if (db) {
        const stored = await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const request = store.get('main');
          request.onsuccess = () => resolve(request.result?.data);
          request.onerror = () => reject(request.error);
        });
        
        if (stored) {
          state = mergeWithDefaults(stored);
          console.log('[dataStore] Loaded from IndexedDB');
          return state;
        }
      }

      // Fallback to localStorage
      const lsData = localStorage.getItem(LS_KEY);
      if (lsData) {
        state = mergeWithDefaults(JSON.parse(lsData));
        console.log('[dataStore] Loaded from localStorage');
        return state;
      }

      // Initialize with defaults
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      state._created = new Date().toISOString();
      state._updated = state._created;
      console.log('[dataStore] Initialized with defaults');
      return state;

    } catch (err) {
      console.error('[dataStore] Load error:', err);
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      state._created = new Date().toISOString();
      return state;
    }
  }

  // ─── SAVE STATE ──────────────────────────────────────────────────
  async function saveState(reason = '') {
    if (!state) return;
    
    state._updated = new Date().toISOString();

    try {
      // Save to IndexedDB
      if (db) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const request = store.put({ id: 'main', data: state });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Always save to localStorage as backup
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      
      if (reason) {
        console.log('[dataStore] Saved:', reason);
      }

    } catch (err) {
      console.error('[dataStore] Save error:', err);
      // Fallback to localStorage only
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } catch (lsErr) {
        console.error('[dataStore] localStorage fallback failed:', lsErr);
      }
    }
  }

  // ─── MERGE WITH DEFAULTS ─────────────────────────────────────────
  function mergeWithDefaults(stored) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_STATE));
    
    // Deep merge stored data
    deepMerge(merged, stored);
    
    return merged;
  }

  function deepMerge(target, source) {
    if (!source) return target;
    
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    
    return target;
  }

  // ─── STATE ACCESSORS ─────────────────────────────────────────────
  function getState() {
    return state;
  }

  function setState(newState) {
    state = newState;
    return state;
  }

  function updateProfile(updates) {
    if (!state) return;
    state.profile = { ...state.profile, ...updates };
    saveState('Profile updated');
    return state.profile;
  }

  function updateOnboarding(updates) {
    if (!state) return;
    state.onboarding = { ...state.onboarding, ...updates };
    saveState('Onboarding updated');
    return state.onboarding;
  }

  function updateUI(updates) {
    if (!state) return;
    state.ui = { ...state.ui, ...updates };
    // Don't persist UI state changes (they're ephemeral)
    return state.ui;
  }

  // ─── SESSION MANAGEMENT ──────────────────────────────────────────
  function addSession(session) {
    if (!state) return;
    state.sessions = state.sessions || [];
    state.sessions.push({
      ...session,
      id: generateId(),
      logged_at: new Date().toISOString(),
    });
    saveState('Session added');
    return state.sessions;
  }

  function getSessions(limit = 50) {
    if (!state) return [];
    return (state.sessions || [])
      .slice(-limit)
      .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
  }

  // ─── PR MANAGEMENT ───────────────────────────────────────────────
  function addPR(pr) {
    if (!state) return;
    state.prs = state.prs || [];
    state.prs.push({
      ...pr,
      id: generateId(),
      set_at: new Date().toISOString(),
    });
    saveState('PR added');
    return state.prs;
  }

  function getPRs(exercise = null) {
    if (!state) return [];
    const prs = state.prs || [];
    if (exercise) {
      return prs.filter(pr => pr.exercise === exercise);
    }
    return prs;
  }

  // ─── BADGE MANAGEMENT ────────────────────────────────────────────
  function hasBadge(badgeId) {
    if (!state) return false;
    return (state.badges || []).some(b => b.id === badgeId);
  }

  function awardBadge(badgeId, label = '') {
    if (!state || hasBadge(badgeId)) return false;
    state.badges = state.badges || [];
    state.badges.push({
      id: badgeId,
      label,
      awarded_at: new Date().toISOString(),
    });
    saveState('Badge awarded');
    return true;
  }

  // ─── WELLNESS MANAGEMENT ─────────────────────────────────────────
  function addWellnessCheckin(checkin) {
    if (!state) return;
    if (!state.wellness) state.wellness = { checkins: [] };
    state.wellness.checkins = state.wellness.checkins || [];
    state.wellness.checkins.push({
      ...checkin,
      id: generateId(),
      recorded_at: new Date().toISOString(),
    });
    saveState('Wellness checkin added');
    return state.wellness.checkins;
  }

  function getLatestWellness() {
    if (!state?.wellness?.checkins?.length) return null;
    return state.wellness.checkins[state.wellness.checkins.length - 1];
  }

  // ─── STREAK TRACKING ─────────────────────────────────────────────
  function updateStreak() {
    if (!state) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const lastDate = state.onboarding?.last_session_date;
    
    if (!state.onboarding) state.onboarding = {};
    
    if (lastDate === today) {
      return state.onboarding.streak_count || 0;
    }
    
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (lastDate === yesterday) {
      state.onboarding.streak_count = (state.onboarding.streak_count || 0) + 1;
    } else {
      state.onboarding.streak_count = 1;
    }
    
    state.onboarding.last_session_date = today;
    saveState('Streak updated');
    
    return state.onboarding.streak_count;
  }

  // ─── EXPORT/IMPORT ───────────────────────────────────────────────
  function exportData() {
    return JSON.stringify(state, null, 2);
  }

  function importData(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      state = mergeWithDefaults(imported);
      saveState('Data imported');
      return true;
    } catch (err) {
      console.error('[dataStore] Import failed:', err);
      return false;
    }
  }

  function resetAll() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    state._created = new Date().toISOString();
    state._updated = state._created;
    saveState('Reset to defaults');
    return state;
  }

  // ─── HELPERS ─────────────────────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ─── INITIALIZATION ──────────────────────────────────────────────
  async function init() {
    console.log('[dataStore] Initializing...');
    await openDB();
    await loadState();
    console.log('[dataStore] Ready');
    return state;
  }

  // ─── EXPOSE API ──────────────────────────────────────────────────
  window.dataStore = {
    // Core
    init,
    loadState,
    saveState,
    getState,
    setState,
    
    // Profile
    updateProfile,
    updateOnboarding,
    updateUI,
    
    // Sessions
    addSession,
    getSessions,
    
    // PRs
    addPR,
    getPRs,
    
    // Badges
    hasBadge,
    awardBadge,
    
    // Wellness
    addWellnessCheckin,
    getLatestWellness,
    
    // Streaks
    updateStreak,
    
    // Import/Export
    exportData,
    importData,
    resetAll,
    
    // Direct state access (use sparingly)
    get state() { return state; },
    set state(s) { state = s; },
    
    // Constants
    DEFAULT_STATE,
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
