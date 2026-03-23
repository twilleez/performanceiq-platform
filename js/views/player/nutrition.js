/**
 * PerformanceIQ — Player Nutrition v2
 * ─────────────────────────────────────────────────────────────
 * PHASE 5 UPGRADES:
 *   • getMacroProgress() → live progress bars (current vs target)
 *   • Meal logging form → calls addMeal(), updates bars live
 *   • Meal history list with removeMeal()
 *   • getNutritionResult() → periodisation detail panel
 *   • Quick-add preset table (12 common athlete foods)
 */
import { buildSidebar }                               from '../../components/nav.js';
import { getCurrentRole, getCurrentUser }             from '../../core/auth.js';
import { getMacroTargets, getMacroProgress,
         getNutritionResult }                         from '../../state/selectors.js';
import { getAthleteProfile, getNutrition,
         addMeal, removeMeal }                        from '../../state/state.js';
import { navigate }                                   from '../../router.js';
import { showToast }                                  from '../../core/notifications.js';

// 12 common athlete quick-add presets
const PRESETS = [
  { name:'Chicken breast (6oz)', cal:187, pro:35, cho:0,  fat:4  },
  { name:'White rice (1 cup)',   cal:206, pro:4,  cho:45, fat:0  },
  { name:'Protein shake',        cal:150, pro:25, cho:8,  fat:3  },
  { name:'Banana',               cal:105, pro:1,  cho:27, fat:0  },
  { name:'Greek yogurt (1 cup)', cal:130, pro:17, cho:9,  fat:4  },
  { name:'Oatmeal (1 cup)',      cal:158, pro:5,  cho:28, fat:3  },
  { name:'Whole eggs (2)',       cal:143, pro:13, cho:1,  fat:10 },
  { name:'Sweet potato (med)',   cal:130, pro:3,  cho:30, fat:0  },
  { name:'Almond butter (2Tbsp)',cal:196, pro:7,  cho:6,  fat:18 },
  { name:'Chocolate milk (12oz)',cal:270, pro:10, cho:42, fat:7  },
  { name:'Tuna can (5oz)',       cal:150, pro:33, cho:0,  fat:1  },
  { name:'Pasta (2 cups cooked)',cal:352, pro:12, cho:70, fat:2  },
];

const MEAL_TYPES = ['Breakfast','Lunch','Dinner','Snack','Pre-workout','Post-workout'];

function progressBar(label, current, target, unit, color) {
  const pct  = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const over = pct >= 100;
  const barColor = over ? '#ef4444' : pct >= 80 ? '#22c955' : pct >= 50 ? '#f59e0b' : '#3b82f6';
  return `
  <div style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;margin-bottom:5px">
      <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${label}</span>
      <span style="font-size:12.5px;color:${over?'#ef4444':color};font-weight:700">
        ${current}${unit} <span style="font-weight:400;color:var(--text-muted)">/ ${target}${unit}</span>
        <span style="font-size:11px;margin-left:4px;color:${barColor}">(${pct}%)</span>
      </span>
    </div>
    <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width .6s ease"></div>
    </div>
  </div>`;
}

export function renderPlayerNutrition() {
  const role    = getCurrentRole() || 'player';
  const user    = getCurrentUser();
  const macros  = getMacroTargets();
  const prog    = getMacroProgress();
  const nutr    = getNutritionResult();
  const profile = getAthleteProfile();
  const nutrition = getNutrition();
  const meals   = [...(nutrition.meals || [])].sort((a,b) => (b.id||0) - (a.id||0)).slice(0, 10);
  const hasData = (prog.cal.current + prog.pro.current + prog.cho.current) > 0;

  const meals_timing = [
    {label:'Pre-Workout (2h before)',items:['Oatmeal with banana and honey','Greek yogurt · 20g protein','8–12 oz water'],color:'#3b82f6'},
    {label:'Intra-Workout',items:['Water or electrolyte drink','For sessions >60 min: 30–60g carbs/hr'],color:'#22c955'},
    {label:'Post-Workout (within 30 min)',items:['Protein shake or chocolate milk','Fast carbs: fruit, white rice','Target 3:1 carb:protein ratio'],color:'#f59e0b'},
  ];

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/nutrition')}
  <main class="page-main">

    <div class="page-header">
      <h1>Nutrition</h1>
      <p>${user?.name || 'Athlete'} · Performance nutrition · ${profile.sport || 'Sport'} athlete</p>
    </div>

    <!-- KPI targets row -->
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Daily Calories</div><div class="kpi-val" style="color:#f59e0b">${macros.cal}</div><div class="kpi-chg">${prog.cal.current > 0 ? prog.cal.current + ' kcal today' : 'kcal target'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Protein</div><div class="kpi-val g">${macros.pro}g</div><div class="kpi-chg">${prog.pro.current > 0 ? prog.pro.current + 'g today' : 'Daily target'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Carbohydrates</div><div class="kpi-val b">${macros.cho}g</div><div class="kpi-chg">${prog.cho.current > 0 ? prog.cho.current + 'g today' : 'Daily target'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Fat</div><div class="kpi-val" style="color:#a78bfa">${macros.fat}g</div><div class="kpi-chg">${prog.fat.current > 0 ? prog.fat.current + 'g today' : 'Daily target'}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:20px">

      <!-- LEFT: Progress bars + log form -->
      <div>

        <!-- Progress bars -->
        <div class="panel" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div class="panel-title" style="margin:0">Today's Intake vs Target</div>
            <span style="font-size:11px;color:var(--text-muted)">${new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
          </div>
          ${hasData ? `
          ${progressBar('Calories', prog.cal.current, prog.cal.target, ' kcal', '#f59e0b')}
          ${progressBar('Protein',  prog.pro.current, prog.pro.target, 'g', '#22c955')}
          ${progressBar('Carbs',    prog.cho.current, prog.cho.target, 'g', '#3b82f6')}
          ${progressBar('Fat',      prog.fat.current, prog.fat.target, 'g', '#a78bfa')}
          ` : `
          <div style="text-align:center;padding:20px;color:var(--text-muted)">
            <div style="font-size:24px;margin-bottom:8px">🍽️</div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px">No meals logged today</div>
            <div style="font-size:12px">Log your first meal to start tracking against your targets</div>
          </div>
          ${progressBar('Calories', 0, prog.cal.target, ' kcal', '#f59e0b')}
          ${progressBar('Protein',  0, prog.pro.target, 'g', '#22c955')}
          ${progressBar('Carbs',    0, prog.cho.target, 'g', '#3b82f6')}
          ${progressBar('Fat',      0, prog.fat.target, 'g', '#a78bfa')}
          `}
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.5">
            Based on ${profile.weightLbs || 165} lbs · ${profile.sport || 'sport'} · ${nutr?.sessionType || 'general'} session type ·
            ISSN 2017 · CHO periodised to sRPE
          </div>
        </div>

        <!-- Meal log form -->
        <div class="panel">
          <div class="panel-title">Log a Meal</div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px" id="meal-form">

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Meal Name</label>
                <input id="meal-name" type="text" placeholder="e.g. Post-workout shake">
              </div>
              <div class="b-field">
                <label>Meal Type</label>
                <select id="meal-type">
                  ${MEAL_TYPES.map(t => `<option value="${t.toLowerCase().replace('-','')}">${t}</option>`).join('')}
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
              <div class="b-field">
                <label>Calories</label>
                <input id="meal-cal" type="number" min="0" max="3000" placeholder="350">
              </div>
              <div class="b-field">
                <label>Protein (g)</label>
                <input id="meal-pro" type="number" min="0" max="200" placeholder="30">
              </div>
              <div class="b-field">
                <label>Carbs (g)</label>
                <input id="meal-cho" type="number" min="0" max="400" placeholder="40">
              </div>
              <div class="b-field">
                <label>Fat (g)</label>
                <input id="meal-fat" type="number" min="0" max="150" placeholder="10">
              </div>
            </div>

            <!-- Quick-add presets -->
            <div>
              <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);margin-bottom:7px;letter-spacing:.04em">QUICK ADD</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${PRESETS.map((p, i) => `
                <button type="button" class="preset-btn" data-idx="${i}"
                  style="font-size:11px;padding:4px 9px;border-radius:8px;border:1px solid var(--border);
                         background:var(--surface-2);color:var(--text-muted);cursor:pointer;transition:all .15s">
                  ${p.name}
                </button>`).join('')}
              </div>
            </div>

            <p id="meal-error" style="color:#ef4444;font-size:12px;margin:0;display:none"></p>

            <button class="btn-primary" id="meal-submit" style="width:100%;font-size:13px;padding:11px">
              Add to Today's Log
            </button>
          </div>
        </div>

      </div>

      <!-- RIGHT: Meal history + timing + hydration -->
      <div>

        <!-- Meal history -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Today's Meals</div>
          ${meals.length === 0 ? `
          <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12.5px">
            No meals logged yet today
          </div>` : `
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
            ${meals.map(m => `
            <div style="display:flex;align-items:center;gap:10px;padding:9px;
                        border-radius:9px;background:var(--surface-2)">
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${m.name || 'Meal'}
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                  ${m.cal || 0} kcal ·
                  <span style="color:#22c955">${m.pro || 0}g P</span> ·
                  <span style="color:#3b82f6">${m.cho || 0}g C</span> ·
                  <span style="color:#a78bfa">${m.fat || 0}g F</span>
                </div>
              </div>
              <button class="meal-delete-btn" data-id="${m.id}"
                style="font-size:11px;padding:3px 8px;border-radius:7px;border:1px solid rgba(239,68,68,.3);
                       background:rgba(239,68,68,.06);color:#ef4444;cursor:pointer;flex-shrink:0">
                ✕
              </button>
            </div>`).join('')}
          </div>`}
        </div>

        <!-- Periodisation detail -->
        ${nutr ? `
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Periodisation Detail</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
            ${nutr.sessionType ? `${nutr.sessionType.charAt(0).toUpperCase()+nutr.sessionType.slice(1)} day` : 'General'} ·
            CHO loading strategy (Morton 2025)
          </div>
          ${[
            ['Carbs/kg', `${nutr.breakdown?.choGperKg || '—'} g/kg`, '#3b82f6'],
            ['Protein/kg', `${(macros.pro / ((profile.weightLbs||165) * 0.453)).toFixed(1)} g/kg`, '#22c955'],
            ['Session phase', nutr.breakdown?.phase || '—', '#f59e0b'],
            ['Leucine target', nutr.leucineTarget ? nutr.leucineTarget + 'g/serving' : '—', '#a78bfa'],
          ].map(([k, v, c]) => `
          <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12.5px;color:var(--text-muted)">${k}</span>
            <span style="font-size:13px;font-weight:700;color:${c}">${v}</span>
          </div>`).join('')}
        </div>` : ''}

        <!-- Meal timing -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Meal Timing</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
            ${meals_timing.map(m => `
            <div style="padding:10px;border-left:4px solid ${m.color};background:${m.color}0a;border-radius:0 10px 10px 0">
              <div style="font-weight:700;font-size:12.5px;color:var(--text-primary);margin-bottom:5px">${m.label}</div>
              ${m.items.map(item => `<div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">· ${item}</div>`).join('')}
            </div>`).join('')}
          </div>
        </div>

        <!-- Hydration -->
        <div class="panel">
          <div class="panel-title">Hydration Target</div>
          <div style="font-size:28px;font-weight:700;color:#3b82f6;margin:8px 0">
            ${Math.round((profile.weightLbs || 165) * 0.6)} oz/day
          </div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.5">
            0.6 oz per lb bodyweight (NATA 2017). Add 12 oz per 30 min intense exercise.
          </div>
        </div>

      </div>
    </div>
  </main>
</div>`;
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  const route = e.detail?.route || '';
  if (!route.endsWith('/nutrition')) return;

  const form = document.getElementById('meal-form');
  if (!form || form.dataset.wired) return;
  form.dataset.wired = '1';

  const errEl = document.getElementById('meal-error');

  // Quick-add preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PRESETS[parseInt(btn.dataset.idx)];
      if (!p) return;
      document.getElementById('meal-name').value = p.name;
      document.getElementById('meal-cal').value  = p.cal;
      document.getElementById('meal-pro').value  = p.pro;
      document.getElementById('meal-cho').value  = p.cho;
      document.getElementById('meal-fat').value  = p.fat;
      btn.style.background   = 'rgba(34,201,85,.1)';
      btn.style.borderColor  = 'rgba(34,201,85,.4)';
      btn.style.color        = '#22c955';
    });
  });

  // Submit
  document.getElementById('meal-submit')?.addEventListener('click', () => {
    if (errEl) errEl.style.display = 'none';

    const name = document.getElementById('meal-name')?.value.trim() || '';
    const type = document.getElementById('meal-type')?.value || 'snack';
    const cal  = parseInt(document.getElementById('meal-cal')?.value) || 0;
    const pro  = parseInt(document.getElementById('meal-pro')?.value) || 0;
    const cho  = parseInt(document.getElementById('meal-cho')?.value) || 0;
    const fat  = parseInt(document.getElementById('meal-fat')?.value) || 0;

    if (!name) {
      if (errEl) { errEl.textContent = 'Enter a meal name.'; errEl.style.display = 'block'; }
      return;
    }
    if (cal === 0 && pro === 0 && cho === 0 && fat === 0) {
      if (errEl) { errEl.textContent = 'Enter at least one macro value.'; errEl.style.display = 'block'; }
      return;
    }

    addMeal({ name, type, cal, pro, cho, fat });
    showToast(`✅ ${name} logged!`, 'success');
    navigate(route);
  });

  // Delete meal
  document.querySelectorAll('.meal-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeMeal(parseInt(btn.dataset.id));
      navigate(route);
    });
  });
});
