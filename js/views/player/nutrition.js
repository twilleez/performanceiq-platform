/**
 * player/nutrition.js — Full Nutrition Dashboard
 * Powered by Engine 4 (v4 — periodized, timing-aware, leucine-threshold)
 */
import { state }   from '../../state/state.js';
import { router }  from '../../core/router.js';
import { ROUTES }  from '../../app.js';
import { Engines } from '../../services/engines.js';

export function renderPlayerNutrition(container) {
  const s  = state.getAll();
  let n;
  try { n = Engines.nutrition(s); }
  catch { n = null; }

  if (!n) {
    container.innerHTML = `
      <div class="piq-view">
        <div class="view-page-header">
          <div class="view-page-title">NUTRITION <span class="hl">PLAN</span></div>
        </div>
        <div class="panel" style="padding:32px;text-align:center;">
          <div style="font-size:32px;margin-bottom:12px;">🥗</div>
          <div style="font-size:14px;color:var(--text-muted,#9CA3AF);">Log a session to see your periodized nutrition targets.</div>
          <button class="btn-outline" data-route="${ROUTES.PLAYER_LOG}" style="width:auto;padding:9px 20px;margin:16px auto 0;display:flex;">
            ⚡ Log Session First
          </button>
        </div>
      </div>`;
    container.querySelectorAll('[data-route]').forEach(el =>
      el.addEventListener('click', () => router.navigate(el.dataset.route)));
    return;
  }

  const macroBarWidth = (val, max) => Math.min(100, Math.round(val/max*100));
  const choMax  = Math.round(n.bodyMass * 12);
  const protMax = Math.round(n.bodyMass * 2.5);
  const fatMax  = 150;

  container.innerHTML = `
    <div class="piq-view">
      <div class="view-page-header">
        <div class="view-page-title">NUTRITION <span class="hl">PLAN</span></div>
        <div class="view-page-subtitle">${n.typeLabel} · ${n.sport} · ${n.phase}</div>
      </div>

      <div class="kpi-strip">
        <div class="kpi-card">
          <div class="kpi-lbl">CARBS</div>
          <div class="kpi-val kv-green">${n.macros.carbs.g}g</div>
          <div class="kpi-sub ks-muted">${n.macros.carbs.gPerKg}g/kg</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">PROTEIN</div>
          <div class="kpi-val kv-blue">${n.macros.protein.g}g</div>
          <div class="kpi-sub ks-muted">${n.macros.protein.gPerKg}g/kg</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">FAT</div>
          <div class="kpi-val kv-navy">${n.macros.fat.g}g</div>
          <div class="kpi-sub ks-muted">${n.macros.fat.pct}% of cals</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-lbl">TOTAL CALORIES</div>
          <div class="kpi-val kv-navy">${n.macros.total.kcal}</div>
          <div class="kpi-sub ks-muted">${n.hydration.liters}L water</div>
        </div>
      </div>

      <div class="two-col">
        <!-- LEFT: Timing plan -->
        <div>
          <div class="panel">
            <div class="panel-head"><div class="panel-title">NUTRIENT TIMING PLAN</div></div>
            <div style="padding:0;">
              ${n.timing.map(meal => `
                <div style="padding:14px 20px;border-bottom:1px solid var(--card-border,#E8E9F0);
                     ${meal.priority?'background:rgba(36,192,84,0.03);border-left:3px solid var(--accent-green,#24C054);':''}"
                     class="session-row" style="cursor:default;padding:14px 20px;">
                  <div style="width:38px;height:38px;border-radius:10px;background:var(--nav-bg,#0D1B40);
                       display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
                    ${meal.priority?'⚡':'🍽️'}
                  </div>
                  <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
                      <span class="session-name">${meal.label}</span>
                      <span style="font-size:10.5px;color:var(--text-muted,#9CA3AF);">${meal.time}</span>
                    </div>
                    <div style="font-size:12px;color:var(--accent-green,#24C054);font-weight:600;margin-bottom:3px;">
                      CHO: ${meal.cho}g · Protein: ${meal.prot}g${meal.fat?` · Fat: ${meal.fat}g`:''}
                    </div>
                    <div class="session-meta">${meal.note}</div>
                  </div>
                  ${meal.priority?`<span class="session-badge sb-next">KEY</span>`:''}
                </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- RIGHT: Macro breakdown + science -->
        <div style="display:grid;gap:16px;">

          <!-- Macro bars -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">MACRO DISTRIBUTION</div></div>
            <div class="rpanel-section">
              <div class="progress-row">
                <div class="prog-lbl-row"><span class="prog-lbl">Carbohydrates</span><span class="prog-meta">${n.macros.carbs.kcal} kcal</span></div>
                <div class="prog-track"><div class="prog-fill pf-green" style="width:${macroBarWidth(n.macros.carbs.g,choMax)}%"></div></div>
              </div>
              <div class="progress-row">
                <div class="prog-lbl-row"><span class="prog-lbl">Protein</span><span class="prog-meta">${n.macros.protein.kcal} kcal</span></div>
                <div class="prog-track"><div class="prog-fill pf-blue" style="width:${macroBarWidth(n.macros.protein.g,protMax)}%"></div></div>
              </div>
              <div class="progress-row">
                <div class="prog-lbl-row"><span class="prog-lbl">Fat</span><span class="prog-meta">${n.macros.fat.kcal} kcal</span></div>
                <div class="prog-track"><div class="prog-fill pf-amber" style="width:${macroBarWidth(n.macros.fat.g,fatMax)}%"></div></div>
              </div>
            </div>
          </div>

          <!-- Post-exercise window -->
          <div class="panel" style="border:1.5px solid var(--accent-green-border,rgba(36,192,84,0.3));">
            <div class="panel-head" style="background:rgba(36,192,84,0.04);">
              <div class="panel-title" style="color:var(--accent-green,#24C054);">⚡ POST-EXERCISE WINDOW</div>
            </div>
            <div class="rpanel-section">
              <div style="font-size:12.5px;font-weight:600;color:var(--text-primary,#1A1F36);margin-bottom:4px;">
                ${n.postWindow.cho}
              </div>
              <div style="font-size:12.5px;font-weight:600;color:var(--text-primary,#1A1F36);margin-bottom:8px;">
                ${n.postWindow.prot}
              </div>
              <div style="font-size:11.5px;color:var(--text-secondary,#6B7280);line-height:1.5;">
                ${n.postWindow.note}
              </div>
            </div>
          </div>

          <!-- Hydration -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">HYDRATION</div></div>
            <div class="rpanel-section">
              <div style="font-size:28px;font-family:'Oswald',sans-serif;font-weight:700;
                   color:var(--accent-blue,#3B82F6);margin-bottom:4px;">
                ${n.hydration.liters}L
              </div>
              <div style="font-size:12px;color:var(--text-muted,#9CA3AF);line-height:1.5;">
                ${n.hydration.needsSodium ? '⚠️ Sodium loading recommended (500–700mg/L) for this session type. ' : ''}
                NATA 2017 model: ${n.bodyMass}kg × 33mL + session boost.
              </div>
              <div style="font-size:11px;color:var(--text-muted,#9CA3AF);margin-top:6px;">
                Leucine threshold: ${n.leucine.mealTarget}g protein per meal minimum for MPS.
              </div>
            </div>
          </div>

          <!-- Science rationale -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">SCIENCE BASIS</div></div>
            <div class="rpanel-section">
              <div style="font-size:11.5px;color:var(--text-secondary,#6B7280);line-height:1.6;">
                ${n.rationale}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>`;

  container.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', () => router.navigate(el.dataset.route)));
}
