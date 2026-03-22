import { buildSidebar } from '../../components/nav.js';
import { getMacroTargets } from '../../state/selectors.js';
import { getAthleteProfile } from '../../state/state.js';
export function renderSoloNutrition() {
  const macros = getMacroTargets();
  const profile = getAthleteProfile();
  const mBar = (label,val,unit,color,max) => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12.5px;color:var(--text-primary)">${label}</span>
        <span style="font-size:12.5px;font-weight:700;color:${color}">${val}${unit} target</span>
      </div>
      <div style="height:7px;background:var(--surface-2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${Math.round(val/max*100)}%;background:${color};border-radius:4px"></div>
      </div>
    </div>`;
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/nutrition')}
  <main class="page-main">
    <div class="page-header"><h1>Nutrition</h1><p>Performance nutrition · ${profile.sport||'Solo'} athlete · ${profile.weightLbs||165} lbs</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Calories</div><div class="kpi-val" style="color:#f59e0b">${macros.cal}</div><div class="kpi-chg">kcal daily</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Protein</div><div class="kpi-val g">${macros.pro}g</div><div class="kpi-chg">Daily target</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Carbs</div><div class="kpi-val b">${macros.cho}g</div><div class="kpi-chg">Daily target</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Fat</div><div class="kpi-val" style="color:#a78bfa">${macros.fat}g</div><div class="kpi-chg">Daily target</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="panel">
        <div class="panel-title">Daily Macro Targets</div>
        <div style="margin-top:14px">
          ${mBar('Protein',macros.pro,'g','#22c955',220)}
          ${mBar('Carbohydrates',macros.cho,'g','#3b82f6',350)}
          ${mBar('Fat',macros.fat,'g','#a78bfa',100)}
          ${mBar('Calories',macros.cal,' kcal','#f59e0b',4000)}
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:10px;line-height:1.5">Based on ${profile.weightLbs||165} lbs bodyweight. ISSN Position Stand 2017. Update your weight in Profile Settings.</div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Meal Timing Guide</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
            ${[['Pre-Workout (2h before)','Oats + banana · 20g protein · 12 oz water','#3b82f6'],['Post-Workout (30 min)','Protein shake · Fast carbs · 3:1 carb:protein ratio','#22c955'],['Before Bed','Casein protein or cottage cheese · promotes overnight recovery','#a78bfa']].map(([l,c,color])=>`
            <div style="padding:10px;border-left:4px solid ${color};border-radius:0 8px 8px 0;background:${color}0a">
              <div style="font-weight:700;font-size:12.5px;color:var(--text-primary);margin-bottom:4px">${l}</div>
              <div style="font-size:12px;color:var(--text-muted)">${c}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Hydration</div>
          <div style="font-size:28px;font-weight:700;color:#3b82f6;margin:10px 0">${Math.round((profile.weightLbs||165)*0.6)} oz/day</div>
          <div style="font-size:12px;color:var(--text-muted)">0.6 oz × bodyweight baseline · +12 oz per 30 min exercise (NATA 2017)</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}