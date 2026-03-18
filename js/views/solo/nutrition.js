/**
 * Player / Solo — Nutrition View v2
 * Elite meal plans powered by TB12 Anti-Inflammatory + Kelsey Poulter Fueling.
 * Macro tracker, food log, hydration calculator, and meal plan display.
 */
import { buildSidebar }          from '../../components/nav.js';
import { getCurrentRole }        from '../../core/auth.js';
import { getAthleteProfile, getNutrition, addMeal, removeMeal } from '../../state/state.js';
import { getMacroTargets, getMacroProgress }  from '../../state/selectors.js';
import { ELITE_MEAL_PLANS, FOOD_DATABASE, TB12_PRINCIPLES, POULTER_PRINCIPLES, calculateHydrationTarget, getMealPlanForProfile } from '../../data/nutritionEngine.js';

export function renderPlayerNutrition() { return _renderNutrition('player'); }
export function renderSoloNutrition()   { return _renderNutrition('solo'); }

function _renderNutrition(role) {
  const profile  = getAthleteProfile();
  const macros   = getMacroProgress();
  const targets  = getMacroTargets();
  const nutrition = getNutrition();
  const mealPlan = getMealPlanForProfile(profile.compPhase || 'in-season', profile.primaryGoal || 'sport-performance');
  const hydration = calculateHydrationTarget(parseFloat(profile.weightLbs) || 160, true);
  const todayDay = mealPlan.days[0]; // Training day plan

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/nutrition')}
  <main class="page-main">

    <div class="page-header">
      <h1>Nutrition <span>Hub</span></h1>
      <p>TB12 Anti-Inflammatory + Kelsey Poulter Performance Fueling</p>
    </div>

    <!-- Macro Progress Row -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      ${_macroCard('Calories', macros.cal, '#f59e0b', 'kcal')}
      ${_macroCard('Protein', macros.pro, '#22c955', 'g')}
      ${_macroCard('Carbs', macros.cho, '#60a5fa', 'g')}
      ${_macroCard('Fat', macros.fat, '#a78bfa', 'g')}
    </div>

    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">
      <div>

        <!-- Today's Meal Plan -->
        <div class="panel" style="margin-bottom:20px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
            <div>
              <div class="panel-title" style="margin:0">${mealPlan.title}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${mealPlan.subtitle}</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span style="padding:4px 10px;border-radius:12px;background:#22c95520;color:#22c955;font-size:10px;font-weight:700;border:1px solid #22c95540">TB12 METHOD</span>
              <span style="padding:4px 10px;border-radius:12px;background:#3b82f620;color:#60a5fa;font-size:10px;font-weight:700;border:1px solid #3b82f640">POULTER FUELING</span>
            </div>
          </div>

          <!-- Day Selector -->
          <div style="display:flex;gap:8px;margin-bottom:16px">
            ${mealPlan.days.map((d, i) => `
            <button class="meal-day-btn ${i===0?'sel':''}" data-day="${i}" style="padding:6px 14px;border-radius:20px;border:1px solid ${i===0?'var(--piq-green)':'var(--border)'};background:${i===0?'var(--piq-green)':'var(--surface-2)'};color:${i===0?'#0d1b3e':'var(--text-muted)'};font-size:11px;font-weight:700;cursor:pointer">
              ${d.day.split(' ')[0]} ${d.day.split(' ')[1] || ''}
            </button>`).join('')}
          </div>

          <!-- Meals List -->
          <div id="meals-list">
            ${_renderMealsList(todayDay.meals)}
          </div>

          <!-- Day Totals -->
          <div style="margin-top:14px;padding:12px 14px;background:var(--surface-2);border-radius:10px">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">DAY TOTALS (Target)</div>
            <div style="display:flex;gap:16px;flex-wrap:wrap">
              ${[
                ['Cal', todayDay.totalMacros.cal, targets.cal, '#f59e0b'],
                ['Pro', todayDay.totalMacros.pro + 'g', targets.pro + 'g', '#22c955'],
                ['Carbs', todayDay.totalMacros.cho + 'g', targets.cho + 'g', '#60a5fa'],
                ['Fat', todayDay.totalMacros.fat + 'g', targets.fat + 'g', '#a78bfa'],
              ].map(([label, plan, target, color]) => `
              <div style="text-align:center">
                <div style="font-size:14px;font-weight:700;color:${color}">${plan}</div>
                <div style="font-size:10px;color:var(--text-muted)">${label} (target: ${target})</div>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Food Log (Quick Add) -->
        <div class="panel" style="margin-bottom:20px">
          <div class="panel-title">Food Log — Quick Add</div>
          <div style="font-size:12px;color:var(--text-muted);margin:4px 0 14px">Track what you eat today. Kelsey Poulter: "You can't manage what you don't measure."</div>

          <!-- Search & Add -->
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <input type="text" id="food-search" placeholder="Search foods (e.g. chicken, oats, salmon...)" style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-primary);font-size:13px">
            <button class="btn-draft" style="padding:10px 14px;font-size:12px;flex-shrink:0" id="food-search-btn">Search</button>
          </div>

          <!-- Search Results -->
          <div id="food-results" style="display:none;margin-bottom:12px;max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
          </div>

          <!-- Today's Logged Foods -->
          <div id="food-log-list">
            ${nutrition.meals.length === 0 ? `
            <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">
              No foods logged today. Start adding meals above.
            </div>` : nutrition.meals.map((m, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${m.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${m.cal} cal · ${m.pro}g P · ${m.cho}g C · ${m.fat}g F</div>
              </div>
              <button onclick="window.__piqRemoveMeal(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px">×</button>
            </div>`).join('')}
          </div>
        </div>

      </div>

      <div>
        <!-- Hydration Target -->
        <div class="panel" style="margin-bottom:16px;border:1px solid #60a5fa40">
          <div class="panel-title" style="color:#60a5fa">Hydration Target</div>
          <div style="text-align:center;padding:12px 0">
            <div style="font-size:32px;font-weight:900;color:#60a5fa">${hydration.total} oz</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${hydration.cups} cups · ${hydration.liters}L</div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);padding:8px 10px;background:#60a5fa10;border-radius:8px;line-height:1.5">
            <strong>TB12 Rule:</strong> 0.6 oz per pound of body weight daily. Add ${hydration.trainingExtra} oz on training days. Start with 16–20 oz upon waking.
          </div>
          <div style="margin-top:12px">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-bottom:8px">HYDRATION SCHEDULE</div>
            ${[
              ['Wake Up', '16–20 oz + electrolytes'],
              ['Pre-Workout', '16 oz (60 min before)'],
              ['During Training', '6–8 oz every 15 min'],
              ['Post-Workout', '24 oz + electrolytes'],
              ['With Each Meal', '8–12 oz'],
              ['Before Bed', '8 oz'],
            ].map(([time, amount]) => `
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:11px;color:var(--text-muted)">${time}</span>
              <span style="font-size:11px;font-weight:600;color:#60a5fa">${amount}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- TB12 Priority Foods -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">TB12 Priority Foods</div>
          <div style="font-size:11px;color:var(--text-muted);margin:4px 0 12px">Anti-inflammatory foods Brady eats daily:</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${TB12_PRINCIPLES.priorityFoods.slice(0, 8).map(f => `
            <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
              <span style="width:8px;height:8px;border-radius:50%;background:var(--piq-green);flex-shrink:0;margin-top:4px"></span>
              <div>
                <span style="font-size:12px;font-weight:600;color:var(--text-primary)">${f.name}</span>
                <span style="font-size:10px;color:var(--text-muted);margin-left:6px">${f.category}</span>
                <div style="font-size:11px;color:var(--text-muted);margin-top:1px">${f.benefit}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Kelsey Poulter Timing -->
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border:1px solid #22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:10px">KELSEY POULTER — FUELING PROTOCOL</div>
          ${Object.entries(POULTER_PRINCIPLES.timingProtocol).slice(0, 5).map(([key, val]) => `
          <div style="margin-bottom:8px">
            <div style="font-size:11px;font-weight:700;color:#a0b4d0;text-transform:capitalize">${key.replace(/([A-Z])/g,' $1').trim()}</div>
            <div style="font-size:12px;color:#c8d8e8;margin-top:2px;line-height:1.4">${val}</div>
          </div>`).join('')}
        </div>

      </div>
    </div>

  </main>
</div>`;
}

function _macroCard(label, macro, color, unit) {
  const pct = macro.pct || 0;
  return `
<div class="panel" style="border-bottom:3px solid ${color}">
  <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">${label}</div>
  <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:6px">
    <span style="font-size:22px;font-weight:900;color:${color}">${macro.current}</span>
    <span style="font-size:11px;color:var(--text-muted)">/ ${macro.target} ${unit}</span>
  </div>
  <div style="height:5px;background:var(--surface-2);border-radius:3px;overflow:hidden">
    <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 600ms ease"></div>
  </div>
  <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${pct}% of target</div>
</div>`;
}

function _renderMealsList(meals) {
  return meals.map((meal, i) => `
  <div style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px;cursor:pointer" onclick="this.querySelector('.meal-detail').style.display=this.querySelector('.meal-detail').style.display==='none'?'block':'none'">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
      <div style="flex:1">
        <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em">${meal.timing}</div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin:3px 0">${meal.label}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <span style="font-size:11px;color:#f59e0b">${meal.macros.cal} cal</span>
          <span style="font-size:11px;color:#22c955">${meal.macros.pro}g P</span>
          <span style="font-size:11px;color:#60a5fa">${meal.macros.cho}g C</span>
          <span style="font-size:11px;color:#a78bfa">${meal.macros.fat}g F</span>
        </div>
      </div>
      <span style="font-size:14px;color:var(--text-muted)">▼</span>
    </div>
    <div class="meal-detail" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
        ${meal.items.map(item => `
        <div style="display:flex;align-items:flex-start;gap:6px">
          <span style="color:var(--piq-green);font-size:11px;margin-top:2px;flex-shrink:0">●</span>
          <span style="font-size:12px;color:var(--text-primary)">${item}</span>
        </div>`).join('')}
      </div>
      ${meal.note ? `<div style="font-size:11px;color:#60a5fa;font-style:italic;padding:6px 8px;background:#3b82f610;border-radius:6px;border-left:2px solid #60a5fa">${meal.note}</div>` : ''}
    </div>
  </div>`).join('');
}

document.addEventListener('piq:viewRendered', () => {
  // Food search
  const searchInput = document.getElementById('food-search');
  const searchBtn   = document.getElementById('food-search-btn');
  const resultsDiv  = document.getElementById('food-results');

  function doSearch() {
    const q = searchInput?.value.toLowerCase().trim();
    if (!q) return;
    const results = FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(q));
    if (!resultsDiv) return;
    if (results.length === 0) {
      resultsDiv.style.display = 'block';
      resultsDiv.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text-muted)">No foods found. Try a different search.</div>';
      return;
    }
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = results.slice(0, 8).map(f => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer" data-food='${JSON.stringify(f)}' class="food-result-item">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${f.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${f.cal} cal · ${f.pro}g P · ${f.cho}g C · ${f.fat}g F · ${f.category}</div>
      </div>
      <button class="btn-draft" style="padding:5px 12px;font-size:11px;flex-shrink:0">+ Add</button>
    </div>`).join('');

    resultsDiv.querySelectorAll('.food-result-item').forEach(item => {
      item.querySelector('button')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const food = JSON.parse(item.dataset.food);
        addMeal(food);
        resultsDiv.style.display = 'none';
        if (searchInput) searchInput.value = '';
        // Refresh log display
        const logList = document.getElementById('food-log-list');
        if (logList) {
          const meals = getNutrition().meals;
          logList.innerHTML = meals.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No foods logged today.</div>' :
            meals.map((m, i) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${m.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${m.cal} cal · ${m.pro}g P · ${m.cho}g C · ${m.fat}g F</div>
              </div>
              <button onclick="window.__piqRemoveMeal(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px">×</button>
            </div>`).join('');
        }
      });
    });
  }

  searchBtn?.addEventListener('click', doSearch);
  searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  // Remove meal
  window.__piqRemoveMeal = (idx) => {
    removeMeal(idx);
    const logList = document.getElementById('food-log-list');
    if (logList) {
      const meals = getNutrition().meals;
      logList.innerHTML = meals.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">No foods logged today.</div>' :
        meals.map((m, i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${m.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${m.cal} cal · ${m.pro}g P · ${m.cho}g C · ${m.fat}g F</div>
          </div>
          <button onclick="window.__piqRemoveMeal(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px">×</button>
        </div>`).join('');
    }
  };

  // Day selector
  document.querySelectorAll('.meal-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.meal-day-btn').forEach(b => {
        b.style.background = 'var(--surface-2)';
        b.style.color = 'var(--text-muted)';
        b.style.borderColor = 'var(--border)';
      });
      btn.style.background = 'var(--piq-green)';
      btn.style.color = '#0d1b3e';
      btn.style.borderColor = 'var(--piq-green)';
    });
  });
});
