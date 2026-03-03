import { STATE, saveState } from "../state/state.js";
import { toast } from "../services/toast.js";

function num(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Simple macro targets (offline-first). Units: grams.
function calcTargets({ weight_lbs, goal, activity }) {
  const w = Math.max(80, num(weight_lbs, 160));
  const g = String(goal || "maintain");
  const a = String(activity || "med");

  // Protein: 0.85–1.0 g/lb (rough default)
  const protein = Math.round(w * (g === "gain" ? 1.0 : 0.85));
  // Fat: ~0.30–0.33 g/lb
  const fat = Math.round(w * (g === "cut" ? 0.30 : 0.33));
  // Calories estimate (rough)
  const baseCals = w * (a === "high" ? 16 : a === "low" ? 13 : 15);
  const calories = Math.round(baseCals + (g === "gain" ? 250 : g === "cut" ? -300 : 0));
  // Carbs: remainder
  const remaining = Math.max(0, calories - protein * 4 - fat * 9);
  const carbs = Math.round(remaining / 4);
  return { calories, protein, carbs, fat };
}

export function renderNutrition() {
  const root = document.getElementById("nutritionRoot");
  if (!root) return;

  if (!STATE.profile) STATE.profile = { role: STATE.role || "coach" };
  if (!STATE.nutrition) STATE.nutrition = { targets: null, logs: [] };

  const prof = STATE.profile;
  const targets = STATE.nutrition.targets || calcTargets({
    weight_lbs: prof.weight_lbs,
    goal: prof.goal,
    activity: prof.activity,
  });

  const day = todayISO();
  const logs = (STATE.nutrition.logs || []).filter(x => x?.date === day);
  const sum = logs.reduce((acc, m) => {
    acc.calories += num(m.calories);
    acc.protein += num(m.protein);
    acc.carbs += num(m.carbs);
    acc.fat += num(m.fat);
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const rem = {
    calories: Math.max(0, targets.calories - sum.calories),
    protein: Math.max(0, targets.protein - sum.protein),
    carbs: Math.max(0, targets.carbs - sum.carbs),
    fat: Math.max(0, targets.fat - sum.fat),
  };

  root.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Elite Nutrition Add-on</div>
        <div class="pill">Elite</div>
      </div>
      <div class="panel-body" style="padding:16px">
        <div class="grid-2" style="gap:14px">
          <div class="panel" style="margin:0">
            <div class="panel-header">
              <div class="panel-title">Targets</div>
              <div class="pill">${day}</div>
            </div>
            <div class="panel-body" style="padding:14px">
              <div class="row" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <label class="label">Weight (lb)
                  <input class="input" id="nutW" value="${num(prof.weight_lbs, 160)}" style="max-width:140px" />
                </label>
                <label class="label">Goal
                  <select class="input" id="nutGoal" style="max-width:160px">
                    <option value="maintain" ${String(prof.goal||'maintain')==='maintain'?'selected':''}>Maintain</option>
                    <option value="gain" ${String(prof.goal||'maintain')==='gain'?'selected':''}>Gain</option>
                    <option value="cut" ${String(prof.goal||'maintain')==='cut'?'selected':''}>Cut</option>
                  </select>
                </label>
                <label class="label">Activity
                  <select class="input" id="nutAct" style="max-width:160px">
                    <option value="low" ${String(prof.activity||'med')==='low'?'selected':''}>Low</option>
                    <option value="med" ${String(prof.activity||'med')==='med'?'selected':''}>Medium</option>
                    <option value="high" ${String(prof.activity||'med')==='high'?'selected':''}>High</option>
                  </select>
                </label>
                <button class="btn" id="nutCalc" type="button">Recalculate</button>
              </div>

              <div class="grid-2" style="gap:10px;margin-top:12px">
                <div class="stat"><div class="stat-label">Calories</div><div class="stat-value">${targets.calories}</div></div>
                <div class="stat"><div class="stat-label">Protein (g)</div><div class="stat-value">${targets.protein}</div></div>
                <div class="stat"><div class="stat-label">Carbs (g)</div><div class="stat-value">${targets.carbs}</div></div>
                <div class="stat"><div class="stat-label">Fat (g)</div><div class="stat-value">${targets.fat}</div></div>
              </div>
            </div>
          </div>

          <div class="panel" style="margin:0">
            <div class="panel-header">
              <div class="panel-title">Today</div>
              <div class="pill">Logged</div>
            </div>
            <div class="panel-body" style="padding:14px">
              <div class="grid-2" style="gap:10px">
                <div class="stat"><div class="stat-label">Calories</div><div class="stat-value">${Math.round(sum.calories)}</div><div class="stat-sub">Remaining ${Math.round(rem.calories)}</div></div>
                <div class="stat"><div class="stat-label">Protein</div><div class="stat-value">${Math.round(sum.protein)}g</div><div class="stat-sub">Remaining ${Math.round(rem.protein)}g</div></div>
                <div class="stat"><div class="stat-label">Carbs</div><div class="stat-value">${Math.round(sum.carbs)}g</div><div class="stat-sub">Remaining ${Math.round(rem.carbs)}g</div></div>
                <div class="stat"><div class="stat-label">Fat</div><div class="stat-value">${Math.round(sum.fat)}g</div><div class="stat-sub">Remaining ${Math.round(rem.fat)}g</div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:14px">
          <div class="panel-header">
            <div class="panel-title">Meal Log</div>
            <div class="pill">Elite</div>
          </div>
          <div class="panel-body" style="padding:14px">
            <div class="row" style="display:flex;gap:10px;flex-wrap:wrap;align-items:end">
              <label class="label">Meal
                <input class="input" id="mealName" placeholder="Breakfast / snack / etc." style="min-width:220px" />
              </label>
              <label class="label">Calories
                <input class="input" id="mealCal" placeholder="0" style="width:120px" />
              </label>
              <label class="label">P (g)
                <input class="input" id="mealPro" placeholder="0" style="width:90px" />
              </label>
              <label class="label">C (g)
                <input class="input" id="mealCarb" placeholder="0" style="width:90px" />
              </label>
              <label class="label">F (g)
                <input class="input" id="mealFat" placeholder="0" style="width:90px" />
              </label>
              <button class="btn" id="mealAdd" type="button">Add</button>
            </div>
            <div id="mealList" style="margin-top:12px"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const mealList = root.querySelector("#mealList");
  const drawMeals = () => {
    const dayLogs = (STATE.nutrition.logs || []).filter(x => x?.date === todayISO());
    if (!mealList) return;
    if (!dayLogs.length) {
      mealList.innerHTML = `<div class="empty">No meals logged today.</div>`;
      return;
    }
    mealList.innerHTML = dayLogs.map((m, idx) => `
      <div class="schedule-row" style="margin:8px 0">
        <div class="schedule-row-main">
          <div class="schedule-row-title">${(m.name||'Meal').replace(/</g,'&lt;')}</div>
          <div class="schedule-row-sub">${Math.round(num(m.calories))} cal • P ${Math.round(num(m.protein))}g • C ${Math.round(num(m.carbs))}g • F ${Math.round(num(m.fat))}g</div>
        </div>
        <button class="btn ghost" data-del="${idx}" type="button">Remove</button>
      </div>
    `).join("");
    mealList.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-del"));
        const all = STATE.nutrition.logs || [];
        const day = todayISO();
        const dayItems = all.filter(x => x?.date === day);
        const target = dayItems[i];
        if (!target) return;
        STATE.nutrition.logs = all.filter(x => x !== target);
        saveState();
        renderNutrition();
      });
    });
  };
  drawMeals();

  root.querySelector("#nutCalc")?.addEventListener("click", () => {
    const weight_lbs = num(root.querySelector("#nutW")?.value, 160);
    const goal = String(root.querySelector("#nutGoal")?.value || "maintain");
    const activity = String(root.querySelector("#nutAct")?.value || "med");

    STATE.profile.weight_lbs = weight_lbs;
    STATE.profile.goal = goal;
    STATE.profile.activity = activity;
    STATE.nutrition.targets = calcTargets({ weight_lbs, goal, activity });
    saveState();
    toast("Targets updated ✓");
    renderNutrition();
  });

  root.querySelector("#mealAdd")?.addEventListener("click", () => {
    const name = String(root.querySelector("#mealName")?.value || "").trim();
    const calories = num(root.querySelector("#mealCal")?.value, 0);
    const protein = num(root.querySelector("#mealPro")?.value, 0);
    const carbs = num(root.querySelector("#mealCarb")?.value, 0);
    const fat = num(root.querySelector("#mealFat")?.value, 0);
    if (!name) return toast("Add a meal name");
    STATE.nutrition.logs = Array.isArray(STATE.nutrition.logs) ? STATE.nutrition.logs : [];
    STATE.nutrition.logs.unshift({ date: todayISO(), name, calories, protein, carbs, fat });
    saveState();
    toast("Meal added ✓");
    renderNutrition();
  });
}

// Backwards-compat: app.js calls this once on boot.
export function bindNutritionEvents() {
  // All event binding is scoped inside renderNutrition().
}
