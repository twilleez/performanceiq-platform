import { buildSidebar } from '../../components/nav.js';
import { EXERCISES, SPORTS, SPORT_EMOJI } from '../../data/exerciseLibrary.js';

export function renderSoloLibrary() {
  const cats = [...new Set(EXERCISES.map(e=>e.category))];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/library')}
  <main class="page-main">
    <div class="page-header"><h1>Exercise <span>Library</span></h1><p>${EXERCISES.length} exercises across 6 sports</p></div>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="tpl-sport-btn active" data-libfilter="all">All (${EXERCISES.length})</button>
      ${cats.map(c=>`<button class="tpl-sport-btn" data-libfilter="${c}">${c.charAt(0).toUpperCase()+c.slice(1)} (${EXERCISES.filter(e=>e.category===c).length})</button>`).join('')}
    </div>

    <div class="panel" id="lib-list">
      ${EXERCISES.map(ex=>`
      <div class="w-row lib-item" data-cat="${ex.category}">
        <div class="w-icon" style="font-size:14px;background:linear-gradient(135deg,var(--piq-navy),var(--piq-blue))">
          ${{strength:'💪',power:'⚡',speed:'🏃',agility:'🔀',core:'🎯',mobility:'🧘',recovery:'💚'}[ex.category]||'🏋️'}
        </div>
        <div class="w-info">
          <div class="w-name">${ex.name}</div>
          <div class="w-meta">${ex.tags.join(' · ')}</div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">
          ${ex.sports.slice(0,3).map(s=>`<span style="font-size:14px">${SPORT_EMOJI[s]||''}</span>`).join('')}
        </div>
        <span class="tag ${
          ex.category==='strength'?'tag-navy':ex.category==='power'?'tag-coral':ex.category==='speed'?'tag-blue':'tag-green'
        }">${ex.category}</span>
      </div>`).join('')}
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  document.querySelectorAll('[data-libfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-libfilter]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.libfilter;
      document.querySelectorAll('.lib-item').forEach(row => {
        row.style.display = f==='all'||row.dataset.cat===f ? 'flex' : 'none';
      });
    });
  });
});
