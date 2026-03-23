/**
 * PerformanceIQ — Player Recruiting v2
 * ─────────────────────────────────────────────────────────────
 * Phase 5: State-backed recruiting tracker.
 * Schools persisted in state.schools[] via addSchool/removeSchool.
 * Interest levels: High / Medium / Low / Applied / Offer Received
 */
import { buildSidebar }                      from '../../components/nav.js';
import { getCurrentRole, getCurrentUser }    from '../../core/auth.js';
import { getAthleteProfile, getSchools,
         addSchool, removeSchool,
         updateSchool }                      from '../../state/state.js';
import { getPIQScore, getStreak }            from '../../state/selectors.js';
import { navigate }                          from '../../router.js';
import { showToast }                         from '../../core/notifications.js';

const INTEREST_CONFIG = {
  'High':    { color:'#22c955', label:'High Interest' },
  'Medium':  { color:'#3b82f6', label:'Medium Interest' },
  'Low':     { color:'#94a3b8', label:'Low Interest' },
  'Applied': { color:'#f59e0b', label:'Applied' },
  'Offer':   { color:'#a78bfa', label:'Offer Received' },
};

const DIVISIONS = ['Division I','Division II','Division III','NAIA','JUCO','Junior College'];

export function renderPlayerRecruiting() {
  const role    = getCurrentRole() || 'player';
  const user    = getCurrentUser();
  const profile = getAthleteProfile();
  const piq     = getPIQScore();
  const streak  = getStreak();
  const schools = getSchools();

  const sportName = (profile.sport || 'Sport').charAt(0).toUpperCase() +
                    (profile.sport || 'sport').slice(1);

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/recruiting')}
  <main class="page-main">

    <div class="page-header">
      <h1>Recruiting</h1>
      <p>${user?.name || 'Athlete'} · ${sportName} · Track your recruiting journey</p>
    </div>

    <div class="panels-2">

      <!-- LEFT: Profile + Add school form -->
      <div>

        <!-- Recruiting profile card -->
        <div class="panel" style="margin-bottom:16px;
             background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border-color:#22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);
                      letter-spacing:.06em;margin-bottom:10px">YOUR RECRUITING PROFILE</div>
          ${[
            ['PIQ Score', piq,                       '#22c955',  'Training intelligence metric'],
            ['Sport',     sportName,                  '#3b82f6',  'Primary sport'],
            ['Position',  profile.position || '—',   '#f59e0b',  'Playing position'],
            ['Class',     profile.gradYear || new Date().getFullYear() + 1, '#a78bfa', 'Graduation year'],
            ['Streak',    streak + ' days',           '#22c955',  'Training consistency'],
          ].map(([k, v, color, desc]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;
                      padding:9px 0;border-bottom:1px solid rgba(255,255,255,.08)">
            <div>
              <div style="font-size:12.5px;font-weight:600;color:#fff">${k}</div>
              <div style="font-size:11px;color:rgba(255,255,255,.4)">${desc}</div>
            </div>
            <span style="font-size:15px;font-weight:700;color:${color}">${v}</span>
          </div>`).join('')}
          <div style="margin-top:12px;font-size:11.5px;color:rgba(255,255,255,.4);line-height:1.5">
            Complete your profile in Settings to improve your recruiting score.
            Coaches can view your PIQ score as a training intelligence metric.
          </div>
        </div>

        <!-- Add school form -->
        <div class="panel">
          <div class="panel-title">Add a School</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px" id="school-form">
            <div class="b-field">
              <label>School Name</label>
              <input id="sch-name" type="text" placeholder="e.g. State University">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Division</label>
                <select id="sch-div">
                  ${DIVISIONS.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
              </div>
              <div class="b-field">
                <label>Interest Level</label>
                <select id="sch-interest">
                  ${Object.keys(INTEREST_CONFIG).map(k =>
                    `<option value="${k}">${INTEREST_CONFIG[k].label}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
            <div class="b-field">
              <label>Recruiting Coordinator (optional)</label>
              <input id="sch-contact" type="text" placeholder="Name or email">
            </div>
            <div class="b-field">
              <label>Notes (optional)</label>
              <input id="sch-notes" type="text" placeholder="e.g. Visited campus, coach reached out">
            </div>
            <p id="sch-error" style="color:#ef4444;font-size:12px;margin:0;display:none"></p>
            <button class="btn-primary" id="sch-add-btn" style="width:100%;font-size:13px;padding:11px">
              Add School
            </button>
          </div>
        </div>

      </div>

      <!-- RIGHT: School list -->
      <div class="panel">
        <div class="panel-title">Schools Tracking
          <span style="float:right;font-size:12px;color:var(--text-muted);font-weight:400">
            ${schools.length} school${schools.length !== 1 ? 's' : ''}
          </span>
        </div>

        ${schools.length === 0 ? `
        <div style="text-align:center;padding:32px;color:var(--text-muted)">
          <div style="font-size:36px;margin-bottom:12px">🎓</div>
          <div style="font-weight:600;font-size:14px;color:var(--text-primary);margin-bottom:6px">
            No schools tracked yet
          </div>
          <div style="font-size:12.5px;line-height:1.6">
            Add schools you're interested in to track your recruiting journey.
            Your PIQ score shows coaches your training intelligence.
          </div>
        </div>` :
        [...schools].sort((a,b) => {
          // Sort: Offer first, then Applied, then High, then others
          const order = {Offer:0, Applied:1, High:2, Medium:3, Low:4};
          return (order[a.interest]??5) - (order[b.interest]??5);
        }).map(s => {
          const cfg = INTEREST_CONFIG[s.interest] || { color:'#94a3b8', label:s.interest };
          return `
          <div style="padding:12px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:14px;color:var(--text-primary);
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${s.name}
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
                  ${s.division || '—'}
                  ${s.contactName ? ' · ' + s.contactName : ''}
                </div>
                ${s.notes ? `<div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;
                              font-style:italic">${s.notes}</div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
                <span style="font-size:11px;padding:3px 9px;border-radius:9px;font-weight:700;
                             background:${cfg.color}18;color:${cfg.color}">
                  ${cfg.label}
                </span>
                <div style="display:flex;gap:6px">
                  <select class="interest-change" data-id="${s.id}"
                    style="font-size:11px;padding:2px 6px;border-radius:7px;
                           border:1px solid var(--border);background:var(--surface-2);
                           color:var(--text-muted);cursor:pointer">
                    ${Object.keys(INTEREST_CONFIG).map(k =>
                      `<option value="${k}" ${k===s.interest?'selected':''}>${k}</option>`
                    ).join('')}
                  </select>
                  <button class="school-delete btn-draft" data-id="${s.id}"
                    style="font-size:11px;padding:2px 8px;border-radius:7px;
                           border-color:rgba(239,68,68,.3);color:#ef4444">✕</button>
                </div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>

    </div>
  </main>
</div>`;
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  const route = e.detail?.route || '';
  if (!route.endsWith('/recruiting')) return;

  const form  = document.getElementById('school-form');
  const errEl = document.getElementById('sch-error');
  if (!form || form.dataset.wired) return;
  form.dataset.wired = '1';

  // Add school
  document.getElementById('sch-add-btn')?.addEventListener('click', () => {
    if (errEl) errEl.style.display = 'none';
    const name     = document.getElementById('sch-name')?.value.trim();
    const division = document.getElementById('sch-div')?.value;
    const interest = document.getElementById('sch-interest')?.value;
    const contact  = document.getElementById('sch-contact')?.value.trim();
    const notes    = document.getElementById('sch-notes')?.value.trim();

    if (!name) {
      if (errEl) { errEl.textContent = 'Enter a school name.'; errEl.style.display = 'block'; }
      return;
    }

    addSchool({ name, division, interest, contactName: contact, notes,
                sport: document.querySelector('[data-sport]')?.dataset.sport || 'basketball' });
    showToast(`✅ ${name} added!`, 'success');
    navigate(route);
  });

  // Update interest level via inline select
  document.querySelectorAll('.interest-change').forEach(sel => {
    sel.addEventListener('change', () => {
      updateSchool(parseInt(sel.dataset.id), { interest: sel.value });
      showToast('✅ Interest updated', 'success');
      navigate(route);
    });
  });

  // Delete school
  document.querySelectorAll('.school-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      removeSchool(parseInt(btn.dataset.id));
      navigate(route);
    });
  });
});
