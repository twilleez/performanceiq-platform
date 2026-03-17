/**
 * Player Home Dashboard
 */
import { buildSidebar }              from '../../components/nav.js';
import { getCurrentUser }            from '../../core/auth.js';
import { getReadinessScore, getReadinessRingOffset,
         getReadinessColor, getReadinessExplain,
         getPIQScore, getWorkoutCount, getStreak } from '../../state/selectors.js';
import { getNutrition, addMeal, removeMeal } from '../../state/state.js';
import { FOOD_DB }                   from '../../data/exerciseLibrary.js';

export function renderPlayerHome() {
  const user      = getCurrentUser();
  const fname     = user?.name?.split(' ')[0] || 'Athlete';
  const date      = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  const readiness = getReadinessScore();
  const piq       = getPIQScore();
  const sessions  = getWorkoutCount();
  const streak    = getStreak();
  const offset    = getReadinessRingOffset(readiness);
  const color     = getReadinessColor(readiness);
  const explain   = getReadinessExplain(readiness);
  const nutrition = getNutrition();
  const meals     = nutrition.meals.slice(-4).reverse();

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Welcome back, <span>${fname}</span> 👋</h1>
      <p>${date} · ${user?.sport||'Basketball'} · Player Dashboard</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${piq}</div><div class="kpi-chg">↑ +${Math.max(0,piq-68)} this month</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Readiness</div><div class="kpi-val" style="color:${color}">${readiness}%</div><div class="kpi-chg">${readiness>=80?'↑ High':readiness>=60?'→ Moderate':'↓ Low'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions</div><div class="kpi-val b">${sessions}</div><div class="kpi-chg">Total logged</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${streak}</div><div class="kpi-chg">Days active</div></div>
    </div>

    <div class="panels-2">
      <div>
        <!-- Today's workout -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Today's Training Plan</div>
          <div class="w-row"><div class="w-icon">🏀</div><div class="w-info"><div class="w-name">Explosive Footwork Drills</div><div class="w-meta">40 min · High Intensity · ${user?.sport||'Basketball'}</div></div><span class="w-badge">NEXT</span></div>
          <div class="w-row"><div class="w-icon">💪</div><div class="w-info"><div class="w-name">Lower Body Power — Phase 2</div><div class="w-meta">35 min · Moderate · Strength</div></div><span class="w-badge gray">LATER</span></div>
          <div class="w-row"><div class="w-icon">🧘</div><div class="w-info"><div class="w-name">Recovery Mobility Flow</div><div class="w-meta">20 min · Low · Recovery</div></div><span class="w-badge gray">PM</span></div>
          <div style="margin-top:14px;display:flex;gap:10px">
            <button class="btn-primary" style="font-size:12.5px;padding:10px 18px" data-route="player/today">Start Workout</button>
            <button class="btn-draft"   style="font-size:12.5px;padding:10px 18px" data-route="player/log">Log Session</button>
          </div>
        </div>

        <!-- Nutrition logger -->
        <div class="panel">
          <div class="panel-title">Food Log</div>
          <div style="margin-bottom:12px;padding:12px;background:rgba(57,230,107,.05);border-radius:10px;border:1.5px solid rgba(57,230,107,.15)">
            <div class="food-log-row">
              <input type="text" class="food-log-input" id="food-input" placeholder="e.g. chicken breast, banana…" list="food-suggestions" autocomplete="off">
              <datalist id="food-suggestions">
                ${Object.keys(FOOD_DB).map(k=>`<option value="${k}">`).join('')}
              </datalist>
              <button class="food-log-btn" id="log-food-btn">+ Log</button>
            </div>
            <div id="food-log-list">
              ${meals.length ? meals.map((m,i)=>`
              <div class="logged-food-item">
                <span style="text-transform:capitalize">${m.name}</span>
                <span class="macros">${m.cal}kcal · P${m.pro}g C${m.cho}g F${m.fat}g</span>
                <button class="food-remove" data-mi="${nutrition.meals.length-1-i}">×</button>
              </div>`).join('') : '<div style="font-size:12px;color:var(--text-muted);padding:4px 0">No foods logged yet today.</div>'}
            </div>
          </div>
          <div style="display:flex;gap:16px;font-family:\'Barlow Condensed\',sans-serif">
            <span>CAL <strong style="color:var(--text-primary)">${nutrition.macros.cal}</strong></span>
            <span>PRO <strong style="color:var(--text-primary)">${nutrition.macros.pro}g</strong></span>
            <span>CARB <strong style="color:var(--text-primary)">${nutrition.macros.cho}g</strong></span>
            <span>FAT <strong style="color:var(--text-primary)">${nutrition.macros.fat}g</strong></span>
          </div>
        </div>
      </div>

      <!-- Readiness ring -->
      <div class="panel">
        <div class="panel-title">Readiness Engine</div>
        <div class="ring-wrap">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border)" stroke-width="9"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke="${color}" stroke-width="9"
              stroke-dasharray="289" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 55 55)"/>
          </svg>
          <div class="ring-num" style="color:${color}">${readiness}</div>
          <div class="ring-lbl">Readiness Score</div>
        </div>
        <p class="readiness-explain">${explain}</p>
        <div class="rf-row"><span class="rf-lbl">Sleep</span><div class="rf-bar-bg"><div class="rf-bar-fill" style="width:${Math.min(99,readiness+6)}%"></div></div><span class="rf-num">${Math.min(99,readiness+6)}</span></div>
        <div class="rf-row"><span class="rf-lbl">Nutrition</span><div class="rf-bar-bg"><div class="rf-bar-fill" style="width:${Math.min(95,60+getNutrition().meals.length*5)}%"></div></div><span class="rf-num">${Math.min(95,60+getNutrition().meals.length*5)}</span></div>
        <div class="rf-row"><span class="rf-lbl">Load</span><div class="rf-bar-bg"><div class="rf-bar-fill" style="width:${Math.max(40,readiness-4)}%"></div></div><span class="rf-num">${Math.max(40,readiness-4)}</span></div>
        <div class="rf-row"><span class="rf-lbl">Mood</span><div class="rf-bar-bg"><div class="rf-bar-fill" style="width:${Math.min(98,readiness+3)}%"></div></div><span class="rf-num">${Math.min(98,readiness+3)}</span></div>
        <div style="margin-top:14px">
          <button class="btn-primary" style="font-size:12.5px;padding:10px 18px" data-route="player/score">View PIQ Score →</button>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

// Wire food logger
document.addEventListener('piq:viewRendered', () => {
  document.getElementById('log-food-btn')?.addEventListener('click', doLogFood);
  document.getElementById('food-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogFood();
  });
  document.querySelectorAll('.food-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeMeal(+btn.dataset.mi);
      // Refresh panel without full re-render
      
    });
  });
});

function doLogFood() {
  const input = document.getElementById('food-input');
  if (!input) return;
  const query = input.value.toLowerCase().trim();
  if (!query) return;

  let match = FOOD_DB[query];
  if (!match) {
    const key = Object.keys(FOOD_DB).find(k => k.includes(query) || query.includes(k));
    if (key) match = FOOD_DB[key];
  }
  const item = match || { cal:150, pro:5, cho:20, fat:5 };
  addMeal({ name:query, ...item });
  input.value = '';

  // Refresh food list in DOM
  const list = document.getElementById('food-log-list');
  if (list) {
    const meals = getNutrition().meals.slice(-4).reverse();
    list.innerHTML = meals.map((m,i)=>`
    <div class="logged-food-item">
      <span style="text-transform:capitalize">${m.name}</span>
      <span class="macros">${m.cal}kcal · P${m.pro}g C${m.cho}g F${m.fat}g</span>
      <button class="food-remove" data-mi="${getNutrition().meals.length-1-i}">×</button>
    </div>`).join('');
    // Re-wire remove buttons
    list.querySelectorAll('.food-remove').forEach(btn => {
      btn.addEventListener('click', () => { removeMeal(+btn.dataset.mi); doLogFood(); });
    });
  }
}
