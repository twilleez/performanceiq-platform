import { state }  from '../../state/state.js';
import { router } from '../../core/router.js';
import { inline } from '../../components/logo.js';

export function renderPlayerScore(container) {
  const sessions = state.get('sessions') || [];
  const logs     = state.get('logs')     || [];

  // Compute each component
  const recent7    = logs.filter(l => Date.now()-new Date(l.date)<7*86400000);
  const consistency = +(Math.min(recent7.length/4,1)*35).toFixed(1);
  const last14      = logs.filter(l => Date.now()-new Date(l.date)<14*86400000);
  const compliance  = last14.length
    ? +(Math.min(last14.filter(l=>l.completed).length/last14.length,1)*25).toFixed(1)
    : 12.5;
  const acute   = recent7.reduce((a,l)=>a+(l.load||5),0)/7;
  const chronic = logs.slice(-28).reduce((a,l)=>a+(l.load||5),0)/28||1;
  const acwr    = acute/chronic;
  const loadMgmt = (acwr>=0.8&&acwr<=1.3)?10:5;
  const readiness = 22; // placeholder until wellness in scope

  const rows = [
    { label:'Training Consistency', weight:'35%', val:consistency, max:35,  desc:'Based on sessions in the last 7 days vs. a 4-session target.' },
    { label:'Readiness Index',      weight:'30%', val:readiness,   max:30,  desc:'Derived from your daily wellness check-in inputs.' },
    { label:'Workout Compliance',   weight:'25%', val:compliance,  max:25,  desc:'Completed sessions as a % of all logged sessions (14 days).' },
    { label:'Load Management',      weight:'10%', val:loadMgmt,    max:10,  desc:`ACWR: ${acwr.toFixed(2)} — optimal range is 0.8–1.3.` },
  ];
  const total = Math.round(rows.reduce((a,r)=>a+r.val,0));

  container.innerHTML = `
    <div class="view-screen">
      <div class="view-nav-bar">
        <button class="back-btn" id="back">←</button>
        ${inline(28)}
        <div class="view-nav-title">MY SCORE</div>
      </div>
      <div style="padding:20px;">

        <!-- Total -->
        <div class="card" style="text-align:center;margin-bottom:14px;padding:22px;">
          <div style="font-family:var(--font-num);font-size:64px;font-weight:700;
               color:var(--piq-coral);line-height:1;">${total}</div>
          <div style="font-family:var(--font-num);font-size:13px;color:var(--piq-muted);
               letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">PIQ SCORE</div>
        </div>

        <!-- Component breakdown -->
        <div class="section-label" style="padding:0;margin-bottom:12px;">SCORE BREAKDOWN</div>
        <div class="card" style="display:grid;gap:16px;">
          ${rows.map(r => {
            const pct = Math.round((r.val/r.max)*100);
            return `
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span style="font-size:13px;color:var(--piq-text);font-weight:500;">${r.label}</span>
                <span style="font-family:var(--font-num);font-size:13px;">
                  <span style="color:var(--piq-coral);">${r.val}/${r.max}</span>
                  <span style="color:var(--piq-muted);font-size:11px;margin-left:4px;">${r.weight}</span>
                </span>
              </div>
              <div style="height:5px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden;margin-bottom:4px;">
                <div style="height:100%;width:${pct}%;background:var(--piq-coral);border-radius:3px;
                     transition:width .6s ease;"></div>
              </div>
              <div style="font-size:11px;color:var(--piq-muted);line-height:1.4;">${r.desc}</div>
            </div>`;
          }).join('')}
        </div>

        <p style="font-size:11px;color:var(--piq-muted);text-align:center;margin-top:16px;line-height:1.5;">
          Full trend history and ACWR chart coming in Phase 15D
        </p>
      </div>
    </div>`;

  container.querySelector('#back')?.addEventListener('click', () => history.back());
}
