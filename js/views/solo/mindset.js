/**
 * PerformanceIQ — Player Mindset View
 * ─────────────────────────────────────────────────────────────
 * Phase 4: Surfaces Engine 4 (calcMindset) to athletes.
 *
 * Features:
 *   • Mental readiness score (HRV proxy + mood + stress + energy)
 *   • PST skill of the day (rotates daily through 5 pillars)
 *   • 14-day mental toughness trend
 *   • Pre-competition routine (6-step protocol, interactive)
 *   • All 5 PST skill cards with daily prompts
 *
 * Evidence: Vealey 2007 PST model · Buchheit 2013 HRV proxy
 *           Hardy et al. 1996 IZOF · Hedges' g=0.83 (2024 meta)
 */
import { buildSidebar }                     from '../../components/nav.js';
import { getCurrentRole, getCurrentUser }   from '../../core/auth.js';
import { getMindsetResult }                 from '../../state/selectors.js';
import { getReadinessCheckIn }              from '../../state/state.js';

export function renderSoloMindset() {
  const role   = getCurrentRole() || 'solo';
  const user   = getCurrentUser();
  const m      = getMindsetResult();
  const ci     = getReadinessCheckIn();
  const today  = new Date().toDateString();
  const hasCI  = ci.date === today && ci.mood > 0;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/mindset')}
  <main class="page-main">

    <div class="page-header">
      <h1>Mindset <span>Training</span></h1>
      <p>Performance psychology · PST 5-pillar framework · Mental readiness engine</p>
    </div>

    ${!hasCI ? `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;
                padding:13px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <span style="font-size:22px">⚡</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13.5px;color:#f59e0b">Log today's check-in for a live mental readiness score</div>
        <div style="font-size:12px;color:var(--text-muted)">Mood, stress, and energy fields feed this engine directly.</div>
      </div>
      <button class="btn-draft" style="font-size:12px;padding:6px 14px;flex-shrink:0"
        data-route="${role}/readiness">Check in →</button>
    </div>` : ''}

    <!-- Top row: score + today's skill -->
    <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:16px;margin-bottom:20px">

      <!-- Mental readiness score -->
      <div class="panel" style="border-left:4px solid ${m.color}">
        <div class="panel-title">Mental Readiness</div>
        <div style="display:flex;align-items:center;gap:16px;margin:14px 0">
          <div style="width:72px;height:72px;border-radius:50%;border:4px solid ${m.color};
                      display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">
            <span style="font-family:'Oswald',sans-serif;font-size:26px;font-weight:700;
                         color:${m.color};line-height:1">${m.score}</span>
            <span style="font-size:9px;color:var(--text-muted);letter-spacing:.06em">/10</span>
          </div>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${m.stateLabel}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5">
              ${m.interpretation}
            </div>
          </div>
        </div>

        <!-- HRV proxy bar -->
        <div style="padding:10px 12px;background:var(--surface-2);border-radius:9px;margin-top:4px">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:11.5px;color:var(--text-muted)">HRV proxy (mood × sleep × stress)</span>
            <span style="font-size:11.5px;font-weight:700;color:${m.hrv >= 7 ? '#22c955' : m.hrv >= 5 ? '#f59e0b' : '#ef4444'}">
              ${m.hrv}/10 · ${m.hrvLabel}
            </span>
          </div>
          <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${m.hrv * 10}%;background:${m.hrv >= 7 ? '#22c955' : m.hrv >= 5 ? '#f59e0b' : '#ef4444'};border-radius:3px"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:5px">
            Buchheit & Laursen 2013 · r≈0.68 with rMSSD · Higher = better recovered
          </div>
        </div>

        ${m.mentalToughness !== null ? `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                    border:1px solid rgba(163,139,250,.3);border-radius:9px;margin-top:10px;
                    background:rgba(163,139,250,.06)">
          <span style="font-size:22px">💪</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:#a78bfa">14-Day Mental Toughness</div>
            <div style="font-size:11.5px;color:var(--text-muted)">
              ${m.mentalToughness}/10 · Based on mood consistency and stress management
            </div>
          </div>
          <span style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;
                       color:#a78bfa;margin-left:auto">${m.mentalToughness}</span>
        </div>` : ''}
      </div>

      <!-- Today's PST skill -->
      <div class="panel" style="background:linear-gradient(135deg,#0d1b3e 0%,#1a2f5e 100%);
                                  border:1px solid rgba(163,139,250,.3)">
        <div style="font-size:11px;font-weight:700;color:#a78bfa;letter-spacing:.08em;
                    text-transform:uppercase;margin-bottom:8px">
          TODAY'S PST FOCUS
        </div>
        <div style="font-size:28px;margin-bottom:8px">${m.todaySkill.icon}</div>
        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:8px">
          ${m.todaySkill.label}
        </div>
        <div style="font-size:12.5px;color:#a0b4d0;line-height:1.6;margin-bottom:14px">
          ${m.todaySkill.principle}
        </div>
        <div style="padding:12px 14px;background:rgba(163,139,250,.12);border-radius:10px;
                    border-left:3px solid #a78bfa">
          <div style="font-size:10.5px;font-weight:700;color:#a78bfa;letter-spacing:.06em;
                      margin-bottom:5px">TODAY'S PROMPT</div>
          <div style="font-size:13px;color:#c8d8e8;line-height:1.5;font-style:italic">
            "${m.todaySkill.daily_prompt}"
          </div>
        </div>
        <div style="margin-top:12px;font-size:11px;color:rgba(255,255,255,.3)">
          Rotates daily through all 5 PST skills · Vealey 2007 framework
        </div>
      </div>

    </div>

    <!-- Pre-competition routine -->
    <div class="panel" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div class="panel-title" style="margin:0">Pre-Competition Routine</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px">
            6-step protocol · ~12 minutes · Use before every game or high-stakes session
          </div>
        </div>
        <span style="font-size:11px;padding:4px 10px;border-radius:8px;
                     background:#22c95520;color:#22c955;font-weight:600">
          Science-backed
        </span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${m.preCompRoutine.map(step => `
        <div style="padding:14px;border:1px solid var(--border);border-radius:12px;
                    background:var(--surface-2)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="width:22px;height:22px;border-radius:50%;background:var(--piq-green);
                         color:#0d1b3e;font-size:11px;font-weight:800;
                         display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${step.step}
            </span>
            <span style="font-size:18px">${step.emoji}</span>
            <span style="font-size:13px;font-weight:700;color:var(--text-primary)">${step.name}</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-muted);line-height:1.5;margin-bottom:8px">
            ${step.action}
          </div>
          <div style="font-size:11px;color:var(--piq-green);font-weight:600">${step.duration}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- All 5 PST skills -->
    <div class="panel">
      <div class="panel-title">PST 5-Pillar Framework</div>
      <div style="font-size:12px;color:var(--text-muted);margin:6px 0 14px">
        Vealey 2007 · Hedges' g = 0.83 across interventions (2024 meta-analysis) ·
        Click any pillar for your pre-competition cue
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
        ${m.allSkills.map((skill, i) => {
          const isToday = skill.id === m.todaySkill.id;
          return `
          <div class="pst-card" data-skill="${i}"
            style="padding:14px;border:1px solid ${isToday ? 'rgba(163,139,250,.5)' : 'var(--border)'};
                   border-radius:12px;cursor:pointer;transition:all .15s;
                   background:${isToday ? 'rgba(163,139,250,.08)' : 'var(--surface-2)'}">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:22px">${skill.icon}</span>
              <div style="flex:1">
                <div style="font-size:13.5px;font-weight:700;color:var(--text-primary)">${skill.label}</div>
                ${isToday ? '<span style="font-size:10px;padding:1px 6px;border-radius:6px;background:rgba(163,139,250,.2);color:#a78bfa;font-weight:700">TODAY\'S FOCUS</span>' : ''}
              </div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.5;margin-bottom:10px">
              ${skill.principle}
            </div>
            <div id="pst-cue-${i}" style="display:none;padding:8px 10px;
              background:rgba(163,139,250,.1);border-radius:8px;border-left:3px solid #a78bfa">
              <div style="font-size:10.5px;font-weight:700;color:#a78bfa;margin-bottom:4px">PRE-COMP CUE</div>
              <div style="font-size:12px;color:var(--text-primary);line-height:1.5;font-style:italic">
                "${skill.pre_comp_cue}"
              </div>
            </div>
            <div class="pst-toggle-label" data-idx="${i}"
              style="font-size:11.5px;color:#a78bfa;font-weight:600;margin-top:8px;cursor:pointer">
              Show pre-comp cue ↓
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
  if (!route.endsWith('/mindset')) return;

  // Toggle PST cue reveal on each card
  document.querySelectorAll('.pst-toggle-label').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const idx  = btn.dataset.idx;
      const cue  = document.getElementById(`pst-cue-${idx}`);
      const open = cue.style.display !== 'none';
      cue.style.display  = open ? 'none' : 'block';
      btn.textContent    = open ? 'Show pre-comp cue ↓' : 'Hide ↑';
    });
  });

  // Card hover effect
  document.querySelectorAll('.pst-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'rgba(163,139,250,.5)';
      card.style.background  = 'rgba(163,139,250,.06)';
    });
    card.addEventListener('mouseleave', () => {
      const idx   = card.dataset.skill;
      const isToday = card.querySelector('.pst-toggle-label')?.parentElement?.querySelector('[style*="TODAY"]');
      card.style.borderColor = isToday ? 'rgba(163,139,250,.5)' : 'var(--border)';
      card.style.background  = isToday ? 'rgba(163,139,250,.08)' : 'var(--surface-2)';
    });
  });
});
