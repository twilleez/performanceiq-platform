/** Readiness tier copy helpers. */
export const READINESS_COPY = {
  high:     {action:'Full session recommended — push today.',color:'#22c955',emoji:'🟢',label:'HIGH READINESS'},
  moderate: {action:'Reduce volume ~20%. Quality over quantity today.',color:'#f59e0b',emoji:'🟡',label:'MODERATE'},
  low:      {action:'Active recovery only. Rest is training too.',color:'#ef4444',emoji:'🔴',label:'LOW READINESS'},
};
export function getReadinessCopy(level='') {
  const k=level.toLowerCase().trim();
  return READINESS_COPY[k]||{action:'Log your wellness to get today\'s recommendation.',color:'rgba(255,255,255,0.4)',emoji:'⚪',label:level.toUpperCase()||'UNKNOWN'};
}
export function applyReadinessCopy() {}
export function patchReadinessRender(fn) { return fn; }
