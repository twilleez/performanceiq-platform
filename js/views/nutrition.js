// js/views/nutrition.js — PerformanceIQ
// YOUR SCHEMA: nutrition_logs has individual rows per food item
// Columns: id, athlete_id, log_date, food_name, calories, protein_g, carbs_g, fat_g, water_ml

import { supabase, getUser } from '../core/supabase.js'

export async function render(container) {
  container.innerHTML = _skeleton()
  const today = new Date().toISOString().split('T')[0]
  const rows  = await _getTodayFoods(today)

  const totals = rows.reduce((acc, r) => ({
    cals:    acc.cals    + (r.calories   ?? 0),
    protein: acc.protein + (r.protein_g  ?? 0),
    carbs:   acc.carbs   + (r.carbs_g    ?? 0),
    fat:     acc.fat     + (r.fat_g      ?? 0),
  }), { cals: 0, protein: 0, carbs: 0, fat: 0 })

  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">Nutrition <em class="hl">Log</em></h1>
      <p class="view-page-subtitle">${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
    </div>

    <!-- Totals -->
    <div class="kpi-strip" style="margin-bottom:22px">
      ${_kpi('Calories',  Math.round(totals.cals),    'kv-green',  'kcal today')}
      ${_kpi('Protein',   Math.round(totals.protein)+'g', 'kv-blue', 'goal: 150g')}
      ${_kpi('Carbs',     Math.round(totals.carbs)+'g',   'kv-navy', 'today')}
      ${_kpi('Fat',       Math.round(totals.fat)+'g',     'kv-green','today')}
    </div>

    <div class="two-col">
      <!-- Add food -->
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><span class="panel-title">Add Food</span></div>
          <form id="food-form" style="padding:16px 20px;display:flex;flex-direction:column;gap:12px" novalidate>
            <div>
              <label class="rpanel-title" style="margin-bottom:6px;display:block">Food Name</label>
              <input id="food-name" type="text" placeholder="e.g. Grilled chicken breast" required
                style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              ${_numInput('food-calories', 'Calories (kcal)', 0)}
              ${_numInput('food-protein',  'Protein (g)',     0)}
              ${_numInput('food-carbs',    'Carbs (g)',       0)}
              ${_numInput('food-fat',      'Fat (g)',         0)}
            </div>
            <div id="food-err" style="display:none;background:#FEE2E2;border:1px solid #FCA5A5;color:#991B1B;padding:10px;border-radius:8px;font-size:12px"></div>
            <button type="submit" id="food-submit" style="
              width:100%;padding:11px;background:var(--accent-green);color:white;border:none;
              border-radius:8px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;
              letter-spacing:0.06em;cursor:pointer">
              + ADD FOOD
            </button>
          </form>
        </div>

        <!-- Quick add common foods -->
        <div class="panel">
          <div class="panel-head"><span class="panel-title">Quick Add</span></div>
          <div style="padding:12px 16px;display:flex;flex-direction:column;gap:6px">
            ${_QUICK_FOODS.map(f => `
              <button class="quick-food" data-food='${JSON.stringify(f)}' style="
                display:flex;justify-content:space-between;align-items:center;
                padding:10px 12px;background:transparent;border:1px solid var(--card-border);
                border-radius:8px;cursor:pointer;font-size:12px;text-align:left;
                transition:background 0.15s;color:var(--text-primary)">
                <span style="font-weight:600">${f.name}</span>
                <span style="color:var(--text-muted)">${f.calories} kcal · ${f.protein_g}g P</span>
              </button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Today's log -->
      <div class="panel">
        <div class="panel-head"><span class="panel-title">Today's Foods</span></div>
        <div id="food-list">
          ${rows.length ? rows.map(r => _foodRow(r)).join('') : `
            <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
              Nothing logged yet today.
            </div>`}
        </div>
      </div>
    </div>
  `

  _bindForm(container, today)
}

const _QUICK_FOODS = [
  { name:'Grilled Chicken Breast (6oz)', calories:280, protein_g:52, carbs_g:0,  fat_g:6  },
  { name:'White Rice (1 cup cooked)',    calories:206, protein_g:4,  carbs_g:45, fat_g:0  },
  { name:'Whole Egg (large)',            calories:72,  protein_g:6,  carbs_g:0,  fat_g:5  },
  { name:'Greek Yogurt (6oz)',           calories:100, protein_g:17, carbs_g:6,  fat_g:0  },
  { name:'Banana (medium)',              calories:105, protein_g:1,  carbs_g:27, fat_g:0  },
  { name:'Almonds (1oz)',                calories:164, protein_g:6,  carbs_g:6,  fat_g:14 },
  { name:'Protein Shake (1 scoop)',      calories:120, protein_g:25, carbs_g:3,  fat_g:2  },
  { name:'Sweet Potato (medium)',        calories:130, protein_g:3,  carbs_g:30, fat_g:0  },
]

function _foodRow(r) {
  return `
    <div class="session-row" data-id="${r.id}">
      <div style="flex:1;min-width:0">
        <div class="session-name">${r.food_name}</div>
        <div class="session-meta">
          ${r.calories ?? 0} kcal · ${r.protein_g ?? 0}g P · ${r.carbs_g ?? 0}g C · ${r.fat_g ?? 0}g F
        </div>
      </div>
      <button class="delete-food" data-id="${r.id}" style="
        background:none;border:none;color:var(--text-muted);cursor:pointer;
        font-size:16px;padding:4px 8px;border-radius:4px" aria-label="Remove">✕</button>
    </div>`
}

function _numInput(id, label, defaultVal) {
  return `
    <div>
      <label style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:6px">${label}</label>
      <input id="${id}" type="number" min="0" value="${defaultVal}"
        style="width:100%;padding:9px 12px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
    </div>`
}

function _kpi(label, value, valClass, sub) {
  return `<div class="kpi-card"><div class="kpi-lbl">${label}</div><div class="kpi-val ${valClass}">${value}</div><div class="kpi-sub ks-muted">${sub}</div></div>`
}

async function _getTodayFoods(date) {
  const user = getUser()
  if (!user) return []
  const { data } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('athlete_id', user.id)
    .eq('log_date', date)
    .order('created_at', { ascending: true })
  return data ?? []
}

async function _addFood(date, food) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('nutrition_logs')
    .insert({ athlete_id: user.id, log_date: date, ...food })
    .select()
    .single()
  if (error) throw error
  return data
}

async function _deleteFood(id) {
  const user = getUser()
  if (!user) return
  await supabase.from('nutrition_logs').delete().eq('id', id).eq('athlete_id', user.id)
}

function _bindForm(container, today) {
  const form    = container.querySelector('#food-form')
  const errEl   = container.querySelector('#food-err')
  const subBtn  = container.querySelector('#food-submit')
  const listEl  = container.querySelector('#food-list')

  const _refreshList = async () => {
    const rows = await _getTodayFoods(today)
    if (listEl) listEl.innerHTML = rows.length
      ? rows.map(_foodRow).join('')
      : '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Nothing logged yet today.</div>'
    _bindDeletes(listEl)
  }

  // Submit form
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    errEl.style.display = 'none'
    const name = container.querySelector('#food-name').value.trim()
    if (!name) { errEl.textContent='Food name required'; errEl.style.display='block'; return }

    subBtn.disabled=true; subBtn.textContent='Adding…'
    try {
      await _addFood(today, {
        food_name:  name,
        calories:   +container.querySelector('#food-calories').value || 0,
        protein_g:  +container.querySelector('#food-protein').value  || 0,
        carbs_g:    +container.querySelector('#food-carbs').value    || 0,
        fat_g:      +container.querySelector('#food-fat').value      || 0,
      })
      form.reset()
      await _refreshList()
      await render(container)  // refresh totals
    } catch (err) {
      errEl.textContent=err.message; errEl.style.display='block'
    }
    subBtn.disabled=false; subBtn.textContent='+ ADD FOOD'
  })

  // Quick add
  container.querySelectorAll('.quick-food').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true
      try {
        const food = JSON.parse(btn.dataset.food)
        await _addFood(today, { food_name: food.name, calories: food.calories, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g })
        await render(container)
      } catch {}
      btn.disabled = false
    })
  })

  _bindDeletes(listEl)
}

function _bindDeletes(listEl) {
  listEl?.querySelectorAll('.delete-food').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true
      await _deleteFood(btn.dataset.id)
      btn.closest('.session-row')?.remove()
    })
  })
}

function _skeleton() {
  return `<div><div class="piq-skeleton" style="height:32px;width:200px;border-radius:8px;margin-bottom:8px"></div><div class="piq-skeleton" style="height:14px;width:160px;border-radius:6px;margin-bottom:24px"></div><div class="kpi-strip">${Array(4).fill('<div class="piq-skeleton" style="height:96px;border-radius:12px"></div>').join('')}</div></div>`
}
