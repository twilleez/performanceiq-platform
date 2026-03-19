/**
 * readiness-copy.js — Fix 05
 *
 * Appends actionable plain-English guidance to each readiness output.
 * Works by patching the readiness engine's render function OR by
 * post-processing the readiness banner element after it renders.
 *
 * OPTION A (preferred): Import and call patchReadinessEngine() in your
 * readiness engine module, passing your render function.
 *
 * OPTION B (fallback): Call applyReadinessCopy() after the dashboard renders.
 * It scans the DOM for the readiness banner and injects copy.
 *
 * Import:
 *   import { applyReadinessCopy, READINESS_COPY } from './readiness-copy.js';
 */

/**
 * Readiness tier definitions.
 * Keys match the readiness level strings used by your readinessEngine.
 * Adjust key names to match your actual state values if different.
 */
export const READINESS_COPY = {
  // High readiness
  high: {
    action: 'Full session recommended — push today.',
    color: '#00E599',
    emoji: '🟢',
    label: 'HIGH READINESS'
  },
  optimal: {
    action: 'Full session recommended — push today.',
    color: '#00E599',
    emoji: '🟢',
    label: 'OPTIMAL'
  },
  ready: {
    action: 'Full session recommended — push today.',
    color: '#00E599',
    emoji: '🟢',
    label: 'READY'
  },

  // Moderate readiness
  moderate: {
    action: 'Reduce volume ~20%. Quality over quantity today.',
    color: '#FFD166',
    emoji: '🟡',
    label: 'MODERATE'
  },
  caution: {
    action: 'Reduce volume ~20%. Quality over quantity today.',
    color: '#FFD166',
    emoji: '🟡',
    label: 'CAUTION'
  },
  reduced: {
    action: 'Reduce volume ~20%. Quality over quantity today.',
    color: '#FFD166',
    emoji: '🟡',
    label: 'REDUCED LOAD'
  },

  // Low readiness
  low: {
    action: 'Active recovery only. Rest is training too.',
    color: '#FF4757',
    emoji: '🔴',
    label: 'LOW READINESS'
  },
  rest: {
    action: 'Rest day recommended. Let your body catch up.',
    color: '#FF4757',
    emoji: '🔴',
    label: 'REST DAY'
  },
  danger: {
    action: 'Do not train today — risk of injury or illness elevated.',
    color: '#FF4757',
    emoji: '🔴',
    label: 'HIGH RISK'
  }
};

/**
 * Get the action copy and color for a given readiness level string.
 * Falls back gracefully if the level isn't in the map.
 *
 * @param {string} level - Readiness level from the engine (e.g. 'high', 'moderate', 'low')
 * @returns {{ action: string, color: string, emoji: string, label: string }}
 */
export function getReadinessCopy(level = '') {
  const key = level.toLowerCase().trim();
  return READINESS_COPY[key] || {
    action: 'Log your wellness to get today\'s recommendation.',
    color: 'rgba(255,255,255,0.4)',
    emoji: '⚪',
    label: level.toUpperCase() || 'UNKNOWN'
  };
}

/**
 * OPTION B — DOM post-processor.
 *
 * Scans the rendered dashboard for the readiness banner element
 * and injects action copy below the existing readiness level display.
 *
 * Call after the dashboard/athlete view renders:
 *   applyReadinessCopy();
 *
 * Looks for elements with these selectors (adjust to match your markup):
 *   - [data-readiness-level]          ← preferred: attribute with level value
 *   - .readiness-banner               ← fallback: reads data-level or text content
 *   - #readiness-output               ← fallback: reads data-level
 */
export function applyReadinessCopy() {
  // Try preferred selector first
  const banners = document.querySelectorAll(
    '[data-readiness-level], .readiness-banner, #readiness-output, .readiness-result'
  );

  if (!banners.length) return;

  banners.forEach(banner => {
    // Don't double-inject
    if (banner.querySelector('.readiness-action-copy')) return;

    // Get the level from the element
    const level =
      banner.dataset.readinessLevel ||
      banner.dataset.level ||
      banner.getAttribute('data-readiness') ||
      _inferLevelFromText(banner.textContent);

    if (!level) return;

    const copy = getReadinessCopy(level);

    // Build and inject the action line
    const actionEl = document.createElement('div');
    actionEl.className = 'readiness-action-copy';
    actionEl.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      color: ${copy.color};
      font-weight: 500;
      line-height: 1.4;
      opacity: 0;
      animation: piq-fade-in 0.4s ease 0.2s forwards;
    `;
    actionEl.innerHTML = `
      <span style="font-size:14px;">${copy.emoji}</span>
      <span>${copy.action}</span>
    `;

    banner.appendChild(actionEl);
  });

  // Ensure the fade-in keyframe exists
  _ensureFadeInKeyframe();
}

/**
 * Try to infer readiness level from banner text content.
 * Fallback when data attributes aren't present.
 */
function _inferLevelFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('high') || t.includes('optimal')) return 'high';
  if (t.includes('moderate') || t.includes('caution')) return 'moderate';
  if (t.includes('low') || t.includes('rest')) return 'low';
  return null;
}

function _ensureFadeInKeyframe() {
  if (document.getElementById('piq-readiness-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'piq-readiness-keyframes';
  style.textContent = `
    @keyframes piq-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * OPTION A — Engine patcher.
 *
 * If your readiness engine calls a render function like:
 *   renderReadiness(level, score, reason)
 * you can wrap it:
 *
 *   import { patchReadinessRender } from './readiness-copy.js';
 *   patchReadinessRender(renderReadiness);
 *
 * This returns a new render function that appends action copy
 * to whatever the original renders.
 *
 * @param {Function} originalRenderFn
 * @returns {Function} patched render function
 */
export function patchReadinessRender(originalRenderFn) {
  return function patchedRender(...args) {
    // Call original render
    originalRenderFn(...args);
    // Post-process the DOM
    requestAnimationFrame(() => applyReadinessCopy());
  };
}
