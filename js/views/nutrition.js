// /js/views/nutrition.js
import { toast } from "../services/toast.js";

function $(id) { return document.getElementById(id); }

export function renderNutrition() {
  const host = $("nutritionMount");
  const sub = $("nutritionSub");
  if (sub) sub.textContent = "Elite Nutrition add-on (local demo).";
  if (!host) return;

  host.innerHTML = `
    <div class="form-card">
      <div class="form-row">
        <label class="label">Notes</label>
        <textarea class="textarea" id="nutNotes" placeholder="Meal notes, hydration, supplements..."></textarea>
      </div>
      <div class="small-muted">This module is a UI placeholder; connect macros and plans in the next phase.</div>
    </div>
  `;
}

export function bindNutritionEvents() {
  $("btnSaveNutrition")?.addEventListener("click", () => {
    toast("Nutrition saved ✓ (demo)");
  });
}
