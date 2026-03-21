import { buildSidebar } from '../../components/nav.js';
export function renderSoloLibrary() {
  return `<div class="view-with-sidebar">${buildSidebar('solo','solo/library')}
  <main class="page-main">
    <div class="page-header"><h1>Exercise <span>Library</span></h1><p>Browse all exercises</p></div>
    <div class="panel">
      <div class="panel-title">Exercise Library</div>
      <div style="padding:32px;text-align:center;color:var(--text-muted)">
        <div style="font-size:32px;margin-bottom:12px">📚</div>
        <div style="font-weight:600;color:var(--text-primary);margin-bottom:6px">Exercise database loading…</div>
      </div>
    </div>
  </main></div>`;
}
