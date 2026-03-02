import { dom } from '../ui/dom.js';
import { STATE } from '../state/state.js';
import { SESSION_LIBRARY } from '../data/demo.js';
import { toast } from '../services/toast.js';
import { generateSession, buildWorkoutCardHTML } from '../features/sessionGenerator.js';
import { Storage } from '../services/storage.js';
import { STORAGE_KEY_STATE } from '../state/keys.js';

export function renderTrainView(){
  const lib = dom.sessionLibrary;
  if (!lib) return;

  lib.innerHTML = SESSION_LIBRARY.map(s => {
    const ac = s.color==='orange'?'var(--orange)':s.color==='blue'?'var(--blue)':s.color==='green'?'var(--green)':'var(--accent)';
    return `<div class="workout-card ${s.color}" style="cursor:pointer">
      <div class="workout-type-tag" style="color:${ac}">${s.type}</div>
      <div class="workout-name">${s.name}</div>
      <div class="workout-meta"><span>${s.meta}</span></div>
    </div>`;
  }).join('');
}

export function renderGeneratedSession(opts){
  const sport = (opts && opts.sport) || dom.buildSport?.value || STATE.sport || 'basketball';
  const type  = (opts && opts.type)  || dom.buildType?.value  || 'practice';
  const dur   = +((opts && opts.duration) || dom.buildDuration?.value || 60);
  const inten = (opts && opts.intensity) || dom.buildIntensity?.value || 'moderate';

  const injuries = [];
  document.querySelectorAll('#injuryChips .inj-chip.active').forEach(b => injuries.push(b.dataset.injury));

  const session = generateSession(sport, type, dur, inten, injuries);

  if (dom.generatedSessionWrap) dom.generatedSessionWrap.innerHTML = buildWorkoutCardHTML(session, true);

  if (!Array.isArray(STATE.sessionLibrary)) STATE.sessionLibrary = [];
  STATE.sessionLibrary = [session, ...STATE.sessionLibrary.filter(s => s?.id !== session.id)].slice(0, 12);

  // Persist minimal state update (no bundler; keep it simple)
  const { selectedAthleteId: _x, ...toSave } = STATE;
  Storage.setJSON(STORAGE_KEY_STATE, toSave);

  toast(`Generated: ${session.title || 'Session'}`);
}

export function bindTrainViewEvents(){
  dom.btnGenerate?.addEventListener('click', () => renderGeneratedSession());
  dom.btnGenerateInline?.addEventListener('click', () => renderGeneratedSession());
  dom.btnPushToday?.addEventListener('click', () => toast('Session pushed to Today ✓'));

  document.querySelectorAll('#injuryChips .inj-chip').forEach(chip =>
    chip.addEventListener('click', () => chip.classList.toggle('active'))
  );
}
