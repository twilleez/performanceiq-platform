// /js/ui/onboarding.js
import { Storage } from '../services/storage.js';
import { toast } from '../services/toast.js';
import { STORAGE_KEY_ONBOARDED } from '../state/keys.js';
import { STATE, saveState } from '../state/state.js';
import { applySportTheme } from './sportTheme.js';
import { cap } from '../features/scoring.js';
import { generateSession, buildWorkoutCardHTML } from '../features/sessionGenerator.js';

function el(id) { return document.getElementById(id); }

let obStep = 1;
let obRole = 'coach';
let obSport = 'basketball';

function goObStep(n) {
  obStep = n;

  // core.js uses class toggles on .modal-step and updates obProgress width 5
  document.querySelectorAll('.modal-step').forEach(s => {
    s.classList.remove('active');
    // Your HTML also uses inline style display:none for inactive steps.
    // Keep both mechanisms to ensure parity across versions.
    if (s.id !== `obStep${n}`) s.style.display = 'none';
  });

  const stepEl = el('obStep' + n);
  if (stepEl) {
    stepEl.classList.add('active');
    stepEl.style.display = '';
  }

  const prog = el('obProgress');
  if (prog) prog.style.width = Math.round(n / 3 * 100) + '%';
}

function closeModal() {
  const m = el('onboardingModal');
  if (m) m.style.display = 'none';
  Storage.setRaw(STORAGE_KEY_ONBOARDED, '1'); // core.js uses localStorage setItem 6
}

function bindRoleGrid() {
  document.querySelectorAll('#roleGrid .role-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#roleGrid .role-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      obRole = card.dataset.role || 'coach';
    });
  });
}

function bindSportGrid() {
  document.querySelectorAll('#sportGrid .sport-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#sportGrid .sport-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      obSport = chip.dataset.sport || 'basketball';
    });
  });
}

function bindInjuryChips() {
  document.querySelectorAll('#obInjuryChips .inj-chip').forEach(chip =>
    chip.addEventListener('click', () => chip.classList.toggle('active'))
  );
}

function renderFirstSessionPreview() {
  const host = el('obFirstSession');
  if (!host) return;

  // Matches: buildWorkoutCardHTML(generateSession(obSport,'practice',60,'moderate',[]), false) 7
  const sess = generateSession(obSport, 'practice', 60, 'moderate', []);
  host.innerHTML = buildWorkoutCardHTML(sess, false);
}

function applyFinish() {
  // Matches core.js finish handler 8
  STATE.role = obRole;
  STATE.sport = obSport;
  applySportTheme(STATE.sport);

  const LABELS = {
    coach:  'Head Coach',
    athlete:'Athlete',
    admin:  'Admin / AD',
    parent: 'Parent',
    owner:  'Owner',
    viewer: 'Viewer'
  };

  const userName = el('userName');
  const userRole = el('userRole');

  if (userName) userName.textContent = LABELS[obRole] || 'Coach Davis';
  if (userRole) userRole.textContent = `${LABELS[obRole] || 'Head Coach'} · ${cap(obSport)}`;

  saveState();
  closeModal();
}

export function initOnboarding({ onAfterFinish } = {}) {
  // Bind selectable UI
  bindRoleGrid();
  bindSportGrid();
  bindInjuryChips();

  // Buttons — matches core.js wiring 9
  el('obNext1')?.addEventListener('click', () => goObStep(2));

  el('obNext2')?.addEventListener('click', () => {
    renderFirstSessionPreview();
    goObStep(3);
  });

  el('obBack2')?.addEventListener('click', () => goObStep(1));
  el('obBack3')?.addEventListener('click', () => goObStep(2));

  el('obClose')?.addEventListener('click', closeModal);

  el('obSkip')?.addEventListener('click', () => {
    closeModal();
    toast('Welcome to PerformanceIQ ⚡');
  });

  el('obFinish')?.addEventListener('click', () => {
    applyFinish();
    if (typeof onAfterFinish === 'function') onAfterFinish();
    toast('Welcome to PerformanceIQ ⚡'); // matches core.js 10
  });

  // Ensure step 1 is visible on init
  goObStep(1);
}

export function maybeShowOnboarding() {
  // Your HTML notes it should show once unless key set 11
  const seen = Storage.getRaw(STORAGE_KEY_ONBOARDED);
  const m = el('onboardingModal');
  if (!seen && m) {
    m.style.display = 'flex';
    goObStep(1);
  }
}

export function closeOnboardingIfOpen() {
  const m = el('onboardingModal');
  if (m && m.style.display !== 'none') closeModal();
}
