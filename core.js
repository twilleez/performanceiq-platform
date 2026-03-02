import { cacheDOM, dom } from './ui/dom.js';
import { installInteractions } from './ui/interactions.js';
import { getThemePref, applyTheme, toggleTheme } from './ui/theme.js';
import { applySportTheme } from './ui/sportTheme.js';

import { Storage } from './services/storage.js';
import { toast } from './services/toast.js';

import { STATE, ATHLETES, saveState, saveAthletes, setAthletes } from './state/state.js';
import { STORAGE_KEY_ONBOARDED, STORAGE_KEY_TOUR } from './state/keys.js';

import { switchView } from './router.js';

import { renderDashboard } from './views/dashboard.js';
import { renderAthletesView, openAthleteDetail, bindAthletesViewEvents } from './views/athletes.js';
import { renderTrainView, bindTrainViewEvents } from './views/train.js';
import { renderAnalytics } from './views/analytics.js';
import { renderSchedule } from './views/schedule.js';

/* ---------------------------
   Simple helpers
---------------------------- */
function handleSearch(value){
  if (STATE.currentView !== 'athletes') {
    switchView('athletes', { onEnter });
  }
  renderAthletesView(value);
  if (dom.athleteSearch) dom.athleteSearch.value = value;
  if (dom.athleteFilterInput) dom.athleteFilterInput.value = value;
}

function hideLoader() {
  if (dom.loadingScreen) dom.loadingScreen.style.display = 'none';
}

function onEnter(viewId){
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'athletes') {
    if (dom.athleteDetail) dom.athleteDetail.style.display = 'none';
    if (dom.athleteCardGrid) dom.athleteCardGrid.style.display = '';
    renderAthletesView(dom.athleteFilterInput?.value || dom.athleteSearch?.value || '');
  }
  if (viewId === 'train') {
    renderTrainView();
  }
  if (viewId === 'analytics') {
    renderAnalytics();
  }
  if (viewId === 'schedule') {
    renderSchedule(dom.fullEventList);
  }
}

/* ---------------------------
   Data mgmt (export/import/reset) — modularized
---------------------------- */
function bindDataManagement(){
  dom.btnExportData?.addEventListener('click', () => {
    try {
      const blob = new Blob([JSON.stringify({athletes:ATHLETES,state:STATE,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'),{href:url,download:`piq-backup-${Date.now()}.json`});
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Backup downloaded ✓');
    } catch(e) { toast('Export failed: ' + e.message); }
  });

  dom.btnImportData?.addEventListener('click', () => dom.importFileInput?.click());
  dom.importFileInput?.addEventListener('change', e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const p = JSON.parse(evt.target.result);
        if (p.athletes && Array.isArray(p.athletes) && p.athletes.length) {
          setAthletes(p.athletes);
          if (p.state && typeof p.state === 'object') Object.assign(STATE, p.state);
          saveState();
          applySportTheme(STATE.sport);
          renderDashboard();
          toast(`Imported ${p.athletes.length} athletes ✓`);
        } else toast('Import failed — no athletes found');
      } catch {
        toast('Import failed — invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  dom.btnResetData?.addEventListener('click', () => {
    // NOTE: You asked to replace confirm() later with modal;
    // keeping confirm here as starter behavior parity.
    if (!confirm('Reset to demo data? Current data will be lost.')) return;
    // Reloading via state module: easiest parity is to clear key and reload.
    Storage.remove('piq_athletes_v2');
    // reload page for a clean reset (guaranteed)
    location.reload();
  });
}

/* ---------------------------
   Settings (team/sport/theme)
---------------------------- */
function bindSettings(){
  if (dom.settingTeamName) dom.settingTeamName.value = STATE.teamName;

  if (dom.settingSport) {
    Array.from(dom.settingSport.options).forEach(o => {
      o.selected = o.value.toLowerCase() === String(STATE.sport).toLowerCase();
    });
  }

  dom.btnSaveSettings?.addEventListener('click', () => {
    STATE.teamName = (dom.settingTeamName?.value || '').trim() || STATE.teamName;
    STATE.season   = dom.settingSeason?.value || STATE.season;
    STATE.sport    = (dom.settingSport?.value || STATE.sport).toLowerCase();

    applySportTheme(STATE.sport);

    if (dom.userRole) dom.userRole.textContent = `Head Coach · ${STATE.sport.charAt(0).toUpperCase() + STATE.sport.slice(1)}`;
    saveState();
    renderDashboard();
    toast('Settings saved ✓');
  });
}

/* ---------------------------
   Navigation binding
---------------------------- */
function bindNav(){
  document.querySelectorAll('[data-view]').forEach(btn =>
    btn.addEventListener('click', () => switchView(btn.dataset.view, { onEnter }))
  );
}

/* ---------------------------
   Onboarding (starter: show/hide only)
   - Your full wizard logic can be moved into /ui/onboarding.js next
---------------------------- */
function maybeShowOnboarding(){
  const seen = Storage.getRaw(STORAGE_KEY_ONBOARDED);
  if (!seen && dom.onboardingModal) dom.onboardingModal.style.display = 'flex';
}

/* ---------------------------
   Main init
---------------------------- */
function init(){
  cacheDOM();
  installInteractions();

  applyTheme(getThemePref());
  dom.btnTheme?.addEventListener('click', toggleTheme);
  dom.settingTheme?.addEventListener('change', (e) => applyTheme(e.target.value));

  applySportTheme(STATE.sport);

  bindNav();
  bindSettings();
  bindDataManagement();

  // Search sync
  dom.athleteSearch?.addEventListener('input', e => handleSearch(e.target.value));
  dom.athleteFilterInput?.addEventListener('input', e => handleSearch(e.target.value));

  // Top actions
  dom.btnRefresh?.addEventListener('click', () => { renderDashboard(); toast('Data refreshed ↺'); });
  dom.btnExport?.addEventListener('click', () => toast('Report export requires cloud sync — coming soon 📤'));
  dom.btnExportAnalytics?.addEventListener('click', () => toast('PDF export coming in next phase 📄'));

  // View-specific binds
  bindTrainViewEvents();
  bindAthletesViewEvents();

  // Initial user label
  if (dom.userRole) dom.userRole.textContent = `Head Coach · ${STATE.sport.charAt(0).toUpperCase() + STATE.sport.slice(1)}`;

  // First render
  renderDashboard();
  switchView(STATE.currentView || 'dashboard', { onEnter });

  maybeShowOnboarding();
  hideLoader();

  // Optional: “tour” stub — kept as compatibility flag
  const seenTour = Storage.getRaw(STORAGE_KEY_TOUR);
  if (!seenTour) {
    // Your full tour module can be re-added next as /ui/tour.js
    // Storage.setRaw(STORAGE_KEY_TOUR, '1');
  }
}

init();
