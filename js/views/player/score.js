/**
 * player/score.js — PIQ Breakdown + Mindset Panel
 * Renders full 6-component breakdown + Mental Toughness + Today's PST skill
 */
import { state }  from '../../state/state.js';
import { router } from '../../core/router.js';
import { ROUTES } from '../../app.js';
import { Engines } from '../../services/engines.js';

export function renderPlayerScore(container) {
  const s         = state.getAll();
  const piqScore  = Engines.piq(s);
  const breakdown = Engines.piqDetail(s);
  const mindset   = Engines.mindset(s);
  const total     = piqScore ?? 0;

  const scoreColor = total >= 80 ? '#24C054' : total >= 60 ? '#F59E0B' : total >= 40 ? '#EF4444' : '#9CA3AF';

  container.innerHTML = `
    <div class="piq-view">
      <div class="view-page-header">
        <div class="view-page-title">MY <span class="hl">SCORE</span></div>
        <div class="view-page-subtitle">6-component PIQ breakdown — updated after each check-in</div>
      </div>

      <div class="two-col">

        <!-- LEFT: Score Breakdown -->
        <div>
          <!-- Total PIQ -->
          <div class="panel" style="margin-bottom:16px;">
            <div style="padding:28px;text-align:center;">
              <div style="font-family:'Oswald',sans-serif;font-size:72px;font-weight:700;
                   color:${scoreColor};line-height:1;text-shadow:0 0 40px ${scoreColor}33;">
                ${piqScore ?? '—'}
              </div>
              <div style="font-family:'Oswald',sans-serif;font-size:14px;
                   color:var(--text-muted,#9CA3AF);letter-spacing:0.12em;margin-top:6px;">
                PIQ SCORE
              </div>
              ${piqScore !== null ? `
              <div style="font-size:12px;color:var(--text-secondary,#6B7280);margin-top:8px;">
                ${piqScore >= 80 ? '🟢 Elite training readiness' : piqScore >= 60 ? '🟡 Good — maintain consistency' : piqScore >= 40 ? '🟠 Building baseline' : '🔴 Early stage — log more data'}
              </div>` : `
              <div style="font-size:12px;color:var(--text-muted,#9CA3AF);margin-top:8px;">
                Log wellness + sessions to unlock your full PIQ score
              </div>`}
            </div>
          </div>

          <!-- Component breakdown -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">SCORE BREAKDOWN</div></div>
            <div style="padding:16px 20px;display:grid;gap:18px;">
              ${breakdown.map(comp => {
                const pct = Math.round((comp.score/comp.max)*100);
                const fillColor = pct >= 80 ? 'var(--accent-green,#24C054)'
                  : pct >= 55 ? 'var(--accent-blue,#3B82F6)' : pct >= 30 ? '#F59E0B' : '#EF4444';
                return `
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-primary,#1A1F36);">
                      ${comp.icon} ${comp.label}
                    </span>
                    <span style="font-family:'Oswald',sans-serif;font-size:13px;">
                      <span style="color:${fillColor};font-weight:700;">${Math.round(comp.score)}/${comp.max}</span>
                      <span style="color:var(--text-muted,#9CA3AF);font-size:11px;margin-left:4px;">${comp.weight}</span>
                    </span>
                  </div>
                  <div style="height:5px;background:#EEF0F8;border-radius:3px;overflow:hidden;margin-bottom:5px;">
                    <div style="height:100%;width:${pct}%;background:${fillColor};border-radius:3px;transition:width .7s ease;"></div>
                  </div>
                  <div style="font-size:11.5px;color:var(--text-muted,#9CA3AF);line-height:1.4;">${comp.reason}</div>
                  ${comp.acwr ? `<div style="font-size:10.5px;color:var(--text-secondary,#6B7280);margin-top:2px;">
                    ACWR Zone: <strong style="color:${comp.zone==='sweet-spot'?'var(--accent-green)':comp.zone==='spike'?'#F59E0B':'#EF4444'}">${comp.zone}</strong>
                  </div>` : ''}
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- RIGHT: Mindset Panel -->
        <div style="display:grid;gap:16px;">

          <!-- Mental State -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">MENTAL STATE</div></div>
            <div class="rpanel-section">
              <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
                <div style="font-size:36px;line-height:1;">${mindset.todaySkill.emoji}</div>
                <div>
                  <div style="font-family:'Oswald',sans-serif;font-size:16px;font-weight:700;
                       color:${mindset.color};letter-spacing:0.06em;">${mindset.stateLabel}</div>
                  <div style="font-size:11.5px;color:var(--text-muted,#9CA3AF);margin-top:2px;">
                    HRV Proxy: ${mindset.hrv}/10 · ${mindset.hrvLabel}
                  </div>
                </div>
              </div>
              <div style="font-size:12px;color:var(--text-secondary,#6B7280);line-height:1.5;margin-bottom:12px;">
                ${mindset.interpretation}
              </div>
            </div>

            <!-- Today's PST Skill -->
            <div class="rpanel-section">
              <div class="rpanel-title">TODAY'S MENTAL SKILL — ${mindset.todaySkill.pillar.toUpperCase()}</div>
              <div style="font-size:12.5px;font-weight:600;color:var(--text-primary,#1A1F36);margin-bottom:6px;">
                ${mindset.todaySkill.emoji} ${mindset.todaySkill.label}
              </div>
              <div style="font-size:12px;color:var(--text-secondary,#6B7280);line-height:1.5;margin-bottom:8px;">
                ${mindset.todaySkill.daily_prompt}
              </div>
              <div style="background:var(--accent-green-dim,rgba(36,192,84,0.08));border:1px solid var(--accent-green-border,rgba(36,192,84,0.2));
                   border-radius:8px;padding:10px 12px;font-size:11.5px;color:var(--text-secondary,#6B7280);line-height:1.5;">
                <strong>Reframe:</strong> ${mindset.todaySkill.reframe}
              </div>
            </div>

            <!-- Science -->
            <div class="rpanel-section">
              <div style="font-size:10.5px;color:var(--text-muted,#9CA3AF);line-height:1.5;">
                📚 ${mindset.todaySkill.science}
              </div>
            </div>
          </div>

          <!-- Mental Toughness -->
          ${mindset.mentalToughness ? `
          <div class="panel">
            <div class="panel-head"><div class="panel-title">MENTAL TOUGHNESS (4C)</div></div>
            <div class="rpanel-section">
              ${['Control','Commitment','Challenge','Confidence'].map(c => {
                const val = mindset.mentalToughness[c.toLowerCase()];
                const col = val >= 70 ? 'var(--accent-green)' : val >= 50 ? 'var(--accent-blue,#3B82F6)' : '#F59E0B';
                return `<div class="progress-row">
                  <div class="prog-lbl-row"><span class="prog-lbl">${c}</span><span class="prog-meta">${val}%</span></div>
                  <div class="prog-track"><div class="prog-fill" style="width:${val}%;background:${col};"></div></div>
                </div>`;
              }).join('')}
              <div style="font-size:11px;color:var(--text-muted,#9CA3AF);margin-top:6px;">
                Based on 7-day wellness trend. Trend: ${mindset.mentalToughness.trend.replace('-',' ')}.
              </div>
            </div>
          </div>` : `
          <div class="panel">
            <div class="rpanel-section">
              <div style="font-size:12px;color:var(--text-muted,#9CA3AF);">
                Log 3+ days of wellness to unlock the 4C Mental Toughness assessment.
              </div>
            </div>
          </div>`}

        </div><!-- /right -->
      </div><!-- /two-col -->
    </div>`;

  container.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', () => router.navigate(el.dataset.route)));
}
