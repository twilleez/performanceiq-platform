// /js/app.js

import { cacheDOM, dom } from './ui/dom.js';
import { installInteractions } from './ui/interactions.js';
import { getThemePref, applyTheme, toggleTheme } from './ui/theme.js';
import { applySportTheme } from './ui/sportTheme.js';

import { Storage } from './services/storage.js';
import { toast } from './services/toast.js';

import { STATE, ATHLETES, saveState, setAthletes } from './state/state.js';

import { switchView } from './router.js';

import { renderDashboard } from './views/dashboard.js';
import { renderAthletesView, bindAthletesViewEvents } from './views/athletes.js';
import { renderTrainView, bindTrainViewEvents } from './views/train.js';
import { renderAnalytics } from './views/analytics.js';
import { renderSchedule } from './views/schedule.js';

import { initOnboarding, maybeShowOnboarding, closeOnboardingIfOpen } from './ui/onboarding.js';
import { createTodayTour } from './ui/tour.js';

/* ---------------------------
   Loader control
---------------------------- */
function showLoader() {
  const ls = document.getElementById('loadingScreen');
  if (ls) ls.style.display = 'flex';
}
function hideLoader() {
  const ls = document.getElementById('loadingScreen');
  if (ls) ls.style.display = 'none';
}

function showBootError(msg) {
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;left:12px;right:12px;bottom:12px;z-index:10000;' +
    'background:rgba(10,14,20,.96);border:1px solid rgba(255,255,255,.14);' +
    'color:#eaf0ff;border-radius:12px;padding:10px 12px;font:13px system-ui;';
  box.textContent = 'Startup error: ' + msg;
  document.body.appendChild(box);
}

/* ---------------------------
   View routing
---------------------------- */
function onEnter(viewId) {
  if (viewId === 'dashboard') renderDashboard();

  if (viewId === 'athletes') {
    if (dom.athleteDetail) dom.athleteDetail.style.display = 'none';
    if (dom.athleteCardGrid) dom.athleteCardGrid.style.display = '';
    renderAthletesView(dom.athleteFilterInput?.value || dom.athleteSearch?.value || '');
  }

  if (viewId === 'train') renderTrainView();
  if (viewId === 'analytics') renderAnalytics();
  if (viewId === 'schedule') renderSchedule(dom.fullEventList);
}

function navigate(viewId) {
  switchView(viewId, { onEnter });
}

function handleSearch(value) {
  if (STATE.currentView !== 'athletes') navigate('athletes');
  renderAthletesView(value);
  if (dom.athleteSearch) dom.athleteSearch.value = value;
  if (dom.athleteFilterInput) dom.athleteFilterInput.value = value;
}

/* ---------------------------
   Data mgmt
---------------------------- */
function bindDataManagement() {
  dom.btnExportData?.addEventListener('click', () => {
    try {
      const blob = new Blob(
        [JSON.stringify({ athletes: ATHLETES, state: STATE, exportedAt: new Date().toISOString() }, null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `piq-backup-${Date.now()}.json` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Backup downloaded ✓');
    } catch (e) {
      toast('Export failed: ' + (e?.message || e));
    }
  });

  dom.btnImportData?.addEventListener('click', () => dom.importFileInput?.click());

  dom.importFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const p = JSON.parse(evt.target.result);
        if (p.athletes && Array.isArray(p.athletes)) {
          setAthletes(p.athletes);
          if (p.state && typeof p.state === 'object') Object.assign(STATE, p.state);
          saveState();
          applySportTheme(STATE.sport);
          renderDashboard();
          toast(`Imported ${p.athletes.length} athletes ✓`);
        } else {
          toast('Import failed — no athletes found');
        }
      } catch {
        toast('Import failed — invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  dom.btnResetData?.addEventListener('click', () => {
    if (!confirm('Reset to demo data? Current data will be lost.')) return;
    Storage.remove('piq_athletes_v2');
    location.reload();
  });
}

/* ---------------------------
   Settings
---------------------------- */
function bindSettings() {
  if (dom.settingTeamName) dom.settingTeamName.value = STATE.teamName;

  if (dom.settingSport) {
    Array.from(dom.settingSport.options).forEach(o => {
      o.selected = o.value.toLowerCase() === String(STATE.sport).toLowerCase();
    });
  }

  dom.btnSaveSettings?.addEventListener('click', () => {
    STATE.teamName = (dom.settingTeamName?.value || '').trim() || STATE.teamName;
    STATE.season = dom.settingSeason?.value || STATE.season;
    STATE.sport = (dom.settingSport?.value || STATE.sport).toLowerCase();

    applySportTheme(STATE.sport);

    if (dom.userRole) {
      dom.userRole.textContent = `Head Coach · ${STATE.sport.charAt(0).toUpperCase() + STATE.sport.slice(1)}`;
    }

    saveState();
    renderDashboard();
    toast('Settings saved ✓');
  });
}

function bindNav() {
  document.querySelectorAll('[data-view]').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.view))
  );
}

/* ---------------------------
   Boot
---------------------------- */
function boot() {
  showLoader();

  // Surface runtime errors (so you don’t get “nothing works” silently)
  window.addEventListener('error', (e) => {
    hideLoader();
    showBootError(e?.message || 'Unknown error');
  });
  window.addEventListener('unhandledrejection', (e) => {
    hideLoader();
    showBootError(e?.reason?.message || String(e?.reason || 'Unhandled rejection'));
  });

  try {
    cacheDOM();
    installInteractions();

    applyTheme(getThemePref());
    dom.btnTheme?.addEventListener('click', toggleTheme);
    dom.settingTheme?.addEventListener('change', (e) => applyTheme(e.target.value));

    applySportTheme(STATE.sport);

    bindNav();
    bindSettings();
    bindDataManagement();

    dom.athleteSearch?.addEventListener('input', e => handleSearch(e.target.value));
    dom.athleteFilterInput?.addEventListener('input', e => handleSearch(e.target.value));

    dom.btnRefresh?.addEventListener('click', () => { renderDashboard(); toast('Data refreshed ↺'); });
    dom.btnExport?.addEventListener('click', () => toast('Report export requires cloud sync — coming soon 📤'));
    dom.btnExportAnalytics?.addEventListener('click', () => toast('PDF export coming in next phase 📄'));

    bindTrainViewEvents();
    bindAthletesViewEvents();

    initOnboarding({ onAfterFinish: () => renderDashboard() });

    const TodayTour = createTodayTour({ navigate });
    TodayTour.bindKeyboardShortcuts();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeOnboardingIfOpen();
    });

    if (dom.userRole) {
      dom.userRole.textContent = `Head Coach · ${STATE.sport.charAt(0).toUpperCase() + STATE.sport.slice(1)}`;
    }

    renderDashboard();
    navigate(STATE.currentView || 'dashboard');

    maybeShowOnboarding();

    hideLoader();
  } catch (err) {
    hideLoader();
    showBootError(err?.message || String(err));
    try { toast('Startup error — see banner'); } catch {}
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
