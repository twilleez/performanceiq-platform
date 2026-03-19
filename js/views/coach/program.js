import { router } from '../../core/router.js';
import { state }  from '../../state/state.js';
export function renderCoachProgram(container) {
  container.innerHTML = `
    <div class="view-screen">
      <div class="view-nav-bar">
        <button class="back-btn" id="back">←</button>
        <div class="view-nav-title">PROGRAM BUILDER</div>
        <div></div>
      </div>
      <div style="padding:32px 20px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px;line-height:1.6;">
        <div style="font-size:32px;margin-bottom:16px;">📋</div>
        <div style="font-family:'Oswald',sans-serif;font-size:16px;color:rgba(255,255,255,0.6);margin-bottom:8px;">PROGRAM BUILDER</div>
        Full program builder with template picker coming in Phase 15D.
      </div>
    </div>`;
  container.querySelector('#back')?.addEventListener('click', () => history.back());
}
