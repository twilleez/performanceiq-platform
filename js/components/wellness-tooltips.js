/**
 * wellness-tooltips.js — Fix 04
 *
 * Adds (?) info icons with tooltips to each wellness input.
 * Explains why each field matters in plain English.
 *
 * Import and call after wellness form renders:
 *   import { wellnessTooltips } from './wellness-tooltips.js';
 *   wellnessTooltips.init();
 *
 * The module looks for elements with data-wellness-field attribute.
 * Add data-wellness-field="sleep" (etc.) to each input wrapper.
 */

// Tooltip content keyed by the data-wellness-field value.
// Keys match the field names used across the codebase.
const WELLNESS_COPY = {
  sleep: {
    label: 'Sleep Quality',
    tip: 'Poor sleep reduces your safe training load today. Even one bad night measurably impacts power output and reaction time.'
  },
  soreness: {
    label: 'Muscle Soreness',
    tip: 'High soreness signals your muscles are still recovering. Training hard on sore muscles increases injury risk and slows adaptation.'
  },
  stress: {
    label: 'Stress Level',
    tip: 'Mental stress has real physical effects — it raises cortisol and slows recovery. We account for both types of load.'
  },
  fatigue: {
    label: 'Fatigue',
    tip: 'Fatigue accumulates over days, not just overnight. Logging this honestly gives us a fuller picture of your recovery state.'
  },
  mood: {
    label: 'Mood',
    tip: 'Mood strongly correlates with motivation and effort quality. Low mood often signals the body needs recovery, not more load.'
  },
  hrv: {
    label: 'HRV / Resting HR',
    tip: 'Heart rate variability is one of the most reliable biological signals for readiness. Higher HRV = better recovered.'
  },
  nutrition: {
    label: 'Nutrition',
    tip: 'Underfueling — even slightly — degrades performance and recovery. We use this to adjust your energy output recommendations.'
  },
  hydration: {
    label: 'Hydration',
    tip: 'Even mild dehydration (1–2%) meaningfully reduces strength and endurance. Log accurately for better recommendations.'
  }
};

export const wellnessTooltips = {
  _activeTooltip: null,

  /**
   * Initialize wellness tooltips.
   * Scans for [data-wellness-field] elements and attaches (?) icons.
   * Safe to call multiple times — idempotent.
   */
  init() {
    // Find all wellness field wrappers
    const fields = document.querySelectorAll('[data-wellness-field]');
    if (!fields.length) return;

    fields.forEach(field => {
      const key = field.dataset.wellnessField;
      const data = WELLNESS_COPY[key];
      if (!data) return;

      // Find the label element inside the field wrapper
      const label = field.querySelector('label, .wellness-label, .field-label');
      if (!label) return;

      // Don't double-inject
      if (label.querySelector('.wellness-info-btn')) return;

      // Wrap label contents if not already wrapped
      if (!label.classList.contains('wellness-label-wrap')) {
        label.classList.add('wellness-label-wrap');
      }

      // Create (?) button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wellness-info-btn';
      btn.setAttribute('aria-label', `More about ${data.label}`);
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '?';

      // Create tooltip
      const tip = document.createElement('div');
      tip.className = 'wellness-tooltip';
      tip.role = 'tooltip';
      tip.textContent = data.tip;

      label.appendChild(btn);
      label.appendChild(tip);

      // Show/hide on click (touch-friendly) and hover
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = tip.classList.contains('visible');
        this._hideAll();
        if (!isVisible) {
          this._show(tip, btn);
        }
      });

      btn.addEventListener('mouseenter', () => this._show(tip, btn));
      btn.addEventListener('mouseleave', () => {
        // Delay hide so user can move cursor onto tooltip
        setTimeout(() => {
          if (!tip.matches(':hover')) this._hide(tip, btn);
        }, 120);
      });

      tip.addEventListener('mouseleave', () => this._hide(tip, btn));
    });

    // Dismiss on outside click
    document.addEventListener('click', () => this._hideAll());
  },

  _show(tip, btn) {
    this._hideAll();
    tip.classList.add('visible');
    btn.setAttribute('aria-expanded', 'true');
    this._activeTooltip = { tip, btn };
  },

  _hide(tip, btn) {
    tip.classList.remove('visible');
    btn?.setAttribute('aria-expanded', 'false');
    if (this._activeTooltip?.tip === tip) {
      this._activeTooltip = null;
    }
  },

  _hideAll() {
    document.querySelectorAll('.wellness-tooltip.visible').forEach(t => {
      t.classList.remove('visible');
    });
    document.querySelectorAll('.wellness-info-btn[aria-expanded="true"]').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
    });
    this._activeTooltip = null;
  }
};
