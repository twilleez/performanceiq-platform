import { STATE } from './state/state.js';

export function applyViewDom(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active','enter'));
  document.querySelectorAll('.nav-btn,.navbtn,[data-view]').forEach(b => b.classList.remove('active'));

  const vEl = document.getElementById('view-' + viewId);
  const nEl = document.querySelector(`[data-view="${viewId}"]`);

  if (vEl) {
    vEl.classList.add('active','enter');
    setTimeout(()=>vEl.classList.remove('enter'), 380);
  }
  if (nEl) nEl.classList.add('active');
}

export function switchView(viewId, { onEnter } = {}) {
  const prev = STATE.currentView;

  // Leaving athlete detail cleanup
  if (prev === 'athletes' && viewId !== 'athletes') {
    const detail = document.getElementById('athleteDetail');
    const grid   = document.getElementById('athleteCardGrid');
    if (detail) detail.style.display = 'none';
    if (grid)   grid.style.display = '';
    STATE.selectedAthleteId = null;
  }

  STATE.currentView = viewId;
  applyViewDom(viewId);
  if (typeof onEnter === 'function') onEnter(viewId);
}
