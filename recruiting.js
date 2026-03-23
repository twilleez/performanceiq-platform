import { buildSidebar } from '../../components/nav.js';
import { getCurrentRole, getCurrentUser } from '../../core/auth.js';
import { getMacroTargets } from '../../state/selectors.js';
import { getAthleteProfile } from '../../state/state.js';
export function renderPlayerNutrition() {
  const role = getCurrentRole() || 'player';
  const macros = getMacroTargets();
  const profile = getAthleteProfile();
  const meals = [
    {label:'Pre-Workout (2h before)',items:['Oatmeal with banana and honey','Greek yogurt · 20g protein','8–12 oz water'],color:'#3b82f6'},
    {label:'Intra-Workout',items:['Water or electrolyte drink','For sessions >60 min: 30–60g carbs/hr'],color:'#22c955'},
    {label:'Post-Workout (within 30 min)',items:['Protein shake or chocolate milk','Fast carbs: fruit, white rice','Target 3:1 carb:protein ratio'],color:'#f59e0b'},
  ];
  const mBar = (label, val, unit, color, pct) => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12.5px;color:var(--text-primary)">${label}</span>
        <span style="font-size:12.5px;font-weight:700;color:${color}">${val}${unit} <span style="font-size:11px;color:var(--text-muted)">target</span></span>
      </div>
      <div style="height:7px;background:var(--surface-2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct||60}%;background:${color};border-radius:4px"></div>
      </div>
    </div>`;
  return `
<div class="view-with-sidebar">
  ${buildSidebar(role,role+'/nutrition')}
  <main class="page-main">
    <div class="page-header"><h1>Nutrition</h1><p>Performance nutrition targets · ${profile.sport||'Sport'} athlete</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Daily Calories</div><div class="kpi-val" style="color:#f59e0b">${macros.cal}</div><div class="kpi-chg">kcal target</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Protein</div><div class="kpi-val g">${macros.pro}g</div><div class="kpi-chg">Daily target</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Carbohydrates</div><div class="kpi-val b">${macros.cho}g</div><div class="kpi-chg">Daily target</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Fat</div><div class="kpi-val" style="color:#a78bfa">${macros.fat}g</div><div class="kpi-chg">Daily target</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="panel">
        <div class="panel-title">Macro Targets</div>
        <div style="margin-top:14px">
          ${mBar('Protein', macros.pro, 'g', '#22c955', Math.round(macros.pro/220*100))}
          ${mBar('Carbohydrates', macros.cho, 'g', '#3b82f6', Math.round(macros.cho/350*100))}
          ${mBar('Fat', macros.fat, 'g', '#a78bfa', Math.round(macros.fat/80*100))}
          ${mBar('Calories', macros.cal, ' kcal', '#f59e0b', Math.round(macros.cal/3000*100))}
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:10px;line-height:1.5">Based on your profile (${profile.weightLbs||165} lbs, ${profile.sport||'sport'}) · ISSN Position Stand 2017 · Update weight in settings for precise targets.</div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Meal Timing</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
            ${meals.map(m=>`
            <div style="padding:12px;border-left:4px solid ${m.color};background:${m.color}0a;border-radius:0 10px 10px 0">
              <div style="font-weight:700;font-size:12.5px;color:var(--text-primary);margin-bottom:6px">${m.label}</div>
              ${m.items.map(item=>`<div style="font-size:12px;color:var(--text-muted);margin-bottom:3px">· ${item}</div>`).join('')}
            </div>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Hydration Target</div>
          <div style="font-size:28px;font-weight:700;color:#3b82f6;margin:8px 0">${Math.round((profile.weightLbs||165)*0.6)} oz/day</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.5">0.6 oz per lb bodyweight baseline (NATA 2017). Add 12 oz per 30 min of intense exercise.</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}