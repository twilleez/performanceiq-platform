// js/views/library.js — PerformanceIQ
import { getExercisesByCategory, getProgramTemplates } from '../services/workoutService.js'
import { getProfile } from '../core/supabase.js'
import { navigate } from '../core/router.js'

export async function render(container) {
  container.innerHTML = _skeleton()
  const profile = getProfile()
  const sport   = profile?.sport ?? 'basketball'

  const [byCategory, templates] = await Promise.all([
    getExercisesByCategory(),
    getProgramTemplates({ sport })
  ])

  const cats    = Object.keys(byCategory).sort()
  const totalEx = Object.values(byCategory).reduce((s, arr) => s + arr.length, 0)

  let activeCategory = cats[0] ?? 'strength'
  const _render = () => {
    const exercises = byCategory[activeCategory] ?? []

    container.innerHTML = `
      <div class="view-page-header">
        <h1 class="view-page-title">Exercise <em class="hl">Library</em></h1>
        <p class="view-page-subtitle">${totalEx} exercises · ${templates.length} program templates</p>
      </div>

      <!-- Category pills -->
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px">
        ${cats.map(cat => `
          <button class="cat-pill" data-cat="${cat}" style="
            padding:8px 16px;border-radius:20px;font-size:12px;font-weight:700;
            letter-spacing:0.04em;cursor:pointer;transition:all 0.15s;
            border:1.5px solid ${cat===activeCategory?'var(--accent-green)':'var(--card-border)'};
            background:${cat===activeCategory?'var(--accent-green-dim)':'transparent'};
            color:${cat===activeCategory?'var(--accent-green)':'var(--text-secondary)'}">
            ${_cap(cat)} (${(byCategory[cat]??[]).length})
          </button>`).join('')}
      </div>

      <div class="two-col">
        <!-- Exercise grid -->
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px">
            ${_cap(activeCategory)} Exercises
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${exercises.map(ex => `
              <div class="panel" style="cursor:pointer" onclick="window._piqViewEx('${ex.id}')">
                <div style="padding:16px">
                  <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">${ex.name}</div>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
                    ${(ex.tags??[]).slice(0,3).map(t=>`<span style="padding:2px 8px;background:var(--accent-green-dim);border-radius:10px;font-size:10px;color:var(--accent-green);font-weight:600">${t}</span>`).join('')}
                  </div>
                  ${ex.description ? `<div style="font-size:11px;color:var(--text-muted);line-height:1.4">${ex.description}</div>` : ''}
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Program templates -->
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px">
            Program Templates
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${templates.slice(0,6).map(t => `
              <div class="panel">
                <div style="padding:16px">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
                    <div style="font-size:13px;font-weight:700;color:var(--text-primary);flex:1;padding-right:8px">${t.name}</div>
                    ${t.sport ? `<span style="padding:3px 8px;background:var(--accent-blue-dim);border-radius:6px;font-size:10px;color:var(--accent-blue);font-weight:700;white-space:nowrap">${t.sport}</span>` : ''}
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">
                    ${t.duration_wk}wk · ${t.freq_per_wk}x/week · ${t.difficulty}
                  </div>
                  <div style="font-size:11px;color:var(--text-secondary);margin-bottom:12px;line-height:1.4">${t.description ?? ''}</div>
                  <button onclick="navigate('/builder')" style="
                    width:100%;padding:9px;border:1.5px solid var(--accent-green);border-radius:8px;
                    background:transparent;color:var(--accent-green);font-family:'Oswald',sans-serif;
                    font-size:12px;font-weight:700;letter-spacing:0.06em;cursor:pointer">
                    USE TEMPLATE
                  </button>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    `

    // Category pill clicks
    container.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => { activeCategory = btn.dataset.cat; _render() })
    })

    // Navigate buttons
    container.querySelectorAll('[onclick]').forEach(el => {
      const path = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
      if (path) { el.addEventListener('click', () => navigate(path)); el.removeAttribute('onclick') }
    })

    // Exercise detail (inline expand)
    window._piqViewEx = (id) => {
      const ex = Object.values(byCategory).flat().find(e => e.id === id)
      if (!ex) return
      alert(`${ex.name}\n\n${ex.description ?? 'No description.'}\n\nMuscles: ${(ex.muscles??[]).join(', ')}`)
    }
  }

  _render()
}

const _cap = s => s.charAt(0).toUpperCase() + s.slice(1)

function _skeleton() {
  return `<div><div class="piq-skeleton" style="height:32px;width:220px;border-radius:8px;margin-bottom:8px"></div><div class="piq-skeleton" style="height:14px;width:160px;border-radius:6px;margin-bottom:24px"></div><div style="display:flex;gap:8px;margin-bottom:22px">${Array(6).fill('<div class="piq-skeleton" style="height:36px;width:80px;border-radius:20px"></div>').join('')}</div></div>`
}
