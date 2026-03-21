/** Empty state + offline indicator helpers. */
const STATES = {
  sessions: {icon:'⚡',title:'No sessions logged',body:'Log your first session to see history.',cta:{label:'Log Session',action:'open-training'}},
  roster:   {icon:'🎽',title:'No athletes yet',body:'Add your first athlete.',cta:{label:'+ Add Athlete',action:'add-athlete'}},
  wellness: {icon:'💚',title:'No wellness data',body:'Log your first check-in.',cta:{label:'Log Wellness',action:'open-wellness'}},
};
export const emptyState = {
  show(container,type='sessions') {
    if(!container) return;
    this.clear(container);
    const d=STATES[type]||STATES.sessions;
    const el=document.createElement('div');
    el.className='js-piq-empty';
    el.style.cssText='text-align:center;padding:40px;color:var(--text-muted)';
    el.innerHTML=`<div style="font-size:36px;margin-bottom:12px">${d.icon}</div><div style="font-weight:700;color:var(--text-primary);margin-bottom:6px">${d.title}</div><p>${d.body}</p>`;
    container.appendChild(el);
  },
  clear(container) { container?.querySelector('.js-piq-empty')?.remove(); }
};
export const offlineIndicator = { init() {} };
