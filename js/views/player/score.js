import { state }  from '../../state/state.js';
import { router } from '../../core/router.js';
export function renderPlayerScore(container) {
  const sessions = state.get('sessions') || [];
  const logs     = state.get('logs') || [];
  container.innerHTML = `
    <div class="view-screen">
      <div class="view-nav-bar">
        <button class="back-btn" id="back">←</button>
        <div class="view-nav-title">MY SCORE</div>
        <div></div>
      </div>
      <div style="padding:24px 20px;">
        <div class="card" style="margin-bottom:12px;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;color:#6B6B80;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">PIQ BREAKDOWN</div>
          ${_scoreRow('Training Consistency', '35%', Math.min((logs.filter(l=>Date.now()-new Date(l.date)<7*86400000).length/4),1)*35, 35)}
          ${_scoreRow('Readiness Index',      '30%', 22, 30)}
          ${_scoreRow('Workout Compliance',   '25%', Math.min(sessions.filter(s=>s.completed).length/Math.max(sessions.length,1),1)*25, 25)}
          ${_scoreRow('Load Management',      '10%', 8,  10)}
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.3);text-align:center;line-height:1.5;">
          Full trend history and ACWR chart coming in Phase 15D.
        </div>
      </div>
    </div>`;
  container.querySelector('#back')?.addEventListener('click', () => history.back());
}
function _scoreRow(label, weight, val, max) {
  const pct = Math.round((val/max)*100);
  return `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:13px;color:#E8E8F0;">${label}</span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:13px;color:#FF6B35;">${Math.round(val).toFixed(0)}/${max} <span style="color:#6B6B80;font-size:11px;">${weight}</span></span>
      </div>
      <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:#FF6B35;border-radius:3px;transition:width 0.6s ease;"></div>
      </div>
    </div>`;
}
