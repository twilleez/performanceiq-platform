// /js/ui/tour.js
import { Storage } from '../services/storage.js';
import { STORAGE_KEY_TOUR } from '../state/keys.js';
import { STATE } from '../state/state.js';

function el(id) { return document.getElementById(id); }

export function createTodayTour({ navigate }) {
  // navigate(viewId) must switch views AND trigger render (app.js will provide this).
  // core.js calls switchView(s.view) inside go() 14

  let idx = 0;
  let steps = [];
  let backdrop, card, hl;

  function $q(sel) { return document.querySelector(sel); }

  function ensure() {
    backdrop = backdrop || document.createElement('div');
    backdrop.className = 'piq-tour-backdrop';
    backdrop.style.display = 'none';

    hl = hl || document.createElement('div');
    hl.className = 'piq-tour-hl';

    card = card || document.createElement('div');
    card.className = 'piq-tour-card';
    card.innerHTML = `
      <div class="piq-tour-head">
        <div class="piq-tour-title">Today — quick workflow</div>
        <button class="iconbtn js-tour-close" aria-label="Close tour">✕</button>
      </div>
      <div class="piq-tour-body">
        <div class="piq-tour-h js-tour-h"></div>
        <div class="muted small js-tour-p" style="margin-top:6px;line-height:1.6"></div>
        <div class="caption-illusion js-tour-cap" style="margin-top:10px"></div>
        <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
          <button class="btn btn-ghost js-tour-back">Back</button>
          <button class="btn btn-primary js-tour-next">Next</button>
        </div>
      </div>`;

    if (!backdrop.isConnected) {
      document.body.appendChild(backdrop);
      document.body.appendChild(hl);
      document.body.appendChild(card);
    }

    backdrop.addEventListener('click', close);
    card.querySelector('.js-tour-close')?.addEventListener('click', close);
    card.querySelector('.js-tour-back')?.addEventListener('click', () => go(idx - 1));
    card.querySelector('.js-tour-next')?.addEventListener('click', () => go(idx + 1));
  }

  function rectFor(node) {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  function focus(node) {
    const r = rectFor(node);
    if (!r) return;

    const pad = 10;
    hl.style.width = (r.w + pad * 2) + 'px';
    hl.style.height = (r.h + pad * 2) + 'px';
    hl.style.transform = `translate3d(${Math.round(r.x - pad)}px,${Math.round(r.y - pad)}px,0)`;
    try { node.classList.add('tour-focus'); } catch {}
  }

  function clearFocus() {
    document.querySelectorAll('.tour-focus').forEach(n => n.classList.remove('tour-focus'));
  }

  function go(n) {
    ensure();

    if (n < 0) n = 0;
    if (n >= steps.length) { close(); return; }

    idx = n;
    clearFocus();

    const s = steps[idx];

    if (s.view && STATE.currentView !== s.view && typeof navigate === 'function') {
      navigate(s.view);
    }

    // core.js waits before focusing and populating card 15
    setTimeout(() => {
      const target = (typeof s.target === 'function')
        ? s.target()
        : (s.target ? $q(s.target) : null);

      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      focus(target);

      card.querySelector('.js-tour-h').textContent = `${idx + 1}/${steps.length} · ${s.h}`;
      card.querySelector('.js-tour-p').textContent = s.p;
      card.querySelector('.js-tour-cap').textContent = s.cap || '';

      const nextBtn = card.querySelector('.js-tour-next');
      if (nextBtn) nextBtn.textContent = (idx === steps.length - 1) ? 'Done' : 'Next';

      const backBtn = card.querySelector('.js-tour-back');
      if (backBtn) backBtn.style.display = idx === 0 ? 'none' : 'inline-flex';

      backdrop.style.display = 'block';
      hl.style.display = 'block';
      card.style.display = 'block';
    }, 120);
  }

  function start() {
    ensure();

    // Same step definitions as core.js 16
    steps = [
      {
        view: 'dashboard',
        target: () => el('statAvg')?.closest('.stat-card') || el('statAvg'),
        h: 'Scan the team PIQ average',
        p: 'Start here to see whether the team is trending up or down before you assign load.',
        cap: 'If parents report eye strain, this headline is now WCAG-friendly and readable without browser zoom.'
      },
      {
        view: 'dashboard',
        target: () => el('alertsList')?.closest('.card') || el('alertsList'),
        h: 'Handle risk flags first',
        p: 'Clear “Rest” and “Watch” athletes before planning practice. Tap any athlete row to open details.',
        cap: 'No audio — but the caption motion gives a “guided” feel without distractions.'
      },
      {
        view: 'dashboard',
        target: () => el('heatmapBody')?.closest('table') || el('heatmapBody'),
        h: 'Use the heatmap for who/why',
        p: 'This is your fastest “who needs what” view: score, readiness, ACWR, and trend in one line.',
        cap: 'Tip: click a row → detail ring animates + pillars fill in.'
      },
      {
        view: 'train',
        target: () => el('generatedSessionWrap') || el('sessionLibrary'),
        h: 'Generate today’s session',
        p: 'Pick sport, duration, intensity, injuries — then generate a session. Save or start.',
        cap: 'Micro-interactions (ripple + spring) reinforce “this is a finished product.”'
      },
      {
        view: 'athletes',
        target: () => el('athleteSearch') || el('athleteFilterInput'),
        h: 'Quick filter + communicate',
        p: 'Search by name/position to check an athlete, then open detail to view readiness + notes.',
        cap: 'Parents asked for clarity — larger typography + stronger focus ring fix that.'
      }
    ];

    // core.js sets STORAGE_KEY_TOUR to '1' 17
    Storage.setRaw(STORAGE_KEY_TOUR, '1');
    go(0);
  }

  function close() {
    if (backdrop) backdrop.style.display = 'none';
    if (card) card.style.display = 'none';
    if (hl) hl.style.display = 'none';
    clearFocus();
  }

  function bindKeyboardShortcuts() {
    // Matches core.js keyboard handler: Escape closes onboarding + tour, '?' starts tour 18
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === '?' || (e.shiftKey && e.key === '/')) start();
    });
  }

  return { start, close, bindKeyboardShortcuts };
  }
