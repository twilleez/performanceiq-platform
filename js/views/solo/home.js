import { router } from '../../core/router.js';
export function renderSoloHome(container) {
  container.innerHTML = `
    <div class="view-screen">
      <div class="view-header"><div class="view-title">SOLO TRAINING</div></div>
      <div style="padding:32px 20px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px;">
        <div style="font-size:32px;margin-bottom:16px;">🏃</div>Solo home — Phase 15D</div>
    </div>`;
}
