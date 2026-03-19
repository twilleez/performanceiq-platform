import { state }  from '../../state/state.js';
export function renderPlayerNutrition(container) {
  container.innerHTML = `
    <div class="view-screen">
      <div class="view-nav-bar">
        <button class="back-btn" onclick="history.back()">←</button>
        <div class="view-nav-title">NUTRITION</div>
        <div></div>
      </div>
      <div style="padding:32px 20px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px;">
        <div style="font-size:32px;margin-bottom:16px;">🥗</div>
        Full food logger with 50-item fuzzy-match database coming in Phase 15D.
      </div>
    </div>`;
}
