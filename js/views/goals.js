// js/views/goals.js — PerformanceIQ
import { getProfile, updateProfile } from '../core/supabase.js'

const ALL_GOALS = [
  { val:'strength',          icon:'💪', label:'Strength' },
  { val:'speed',             icon:'⚡', label:'Speed' },
  { val:'endurance',         icon:'🫀', label:'Endurance' },
  { val:'flexibility',       icon:'🤸', label:'Flexibility' },
  { val:'conditioning',      icon:'🔥', label:'Conditioning' },
  { val:'recovery',          icon:'💚', label:'Recovery' },
  { val:'vertical_jump',     icon:'⬆️', label:'Vertical Jump' },
  { val:'injury_prevention', icon:'🛡', label:'Injury Prevention' },
  { val:'nutrition',         icon:'🥗', label:'Nutrition' },
  { val:'recruiting',        icon:'🎓', label:'Recruiting' },
]

export async function render(container) {
  const profile = getProfile()
  let selected  = new Set(profile?.goals ?? [])

  const render_ = () => {
    container.innerHTML = `
      <div class="view-page-header">
        <h1 class="view-page-title">Training <em class="hl">Goals</em></h1>
        <p class="view-page-subtitle">Choose up to 3 — they shape your recommendations and PIQ weighting</p>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Select Your Goals</span>
            <span style="font-size:12px;color:var(--text-muted)">${selected.size}/3 selected</span>
          </div>
          <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${ALL_GOALS.map(g => {
              const active = selected.has(g.val)
              return `
                <button class="goal-btn" data-val="${g.val}" style="
                  display:flex;align-items:center;gap:10px;padding:12px 14px;
                  border:1.5px solid ${active?'var(--accent-green)':'var(--card-border)'};
                  background:${active?'var(--accent-green-dim)':'transparent'};
                  border-radius:10px;cursor:pointer;text-align:left;
                  transition:all 0.15s;box-shadow:${active?'0 0 0 3px rgba(36,192,84,0.12)':'none'}">
                  <span style="font-size:20px">${g.icon}</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${g.label}</span>
                </button>`
            }).join('')}
          </div>
          <div style="padding:0 20px 20px">
            <div id="goals-msg" style="display:none;background:#FEE2E2;border:1px solid #FCA5A5;color:#991B1B;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:12px"></div>
            <button id="save-goals" style="
              width:100%;padding:13px;background:var(--accent-green);color:white;border:none;
              border-radius:8px;font-family:'Oswald',sans-serif;font-size:15px;font-weight:700;
              letter-spacing:0.06em;cursor:pointer">
              SAVE GOALS
            </button>
          </div>
        </div>

        <div>
          <div class="panel" style="margin-bottom:14px">
            <div class="panel-head"><span class="panel-title">Your Current Goals</span></div>
            <div style="padding:16px 20px">
              ${selected.size ? [...selected].map(g => {
                const found = ALL_GOALS.find(x=>x.val===g)
                return found ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;color:var(--text-primary)"><span>${found.icon}</span>${found.label}</div>` : ''
              }).join('') : '<div style="font-size:13px;color:var(--text-muted)">No goals set yet.</div>'}
            </div>
          </div>
          <div class="panel" style="background:var(--nav-bg)">
            <div style="padding:16px 20px">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-green);margin-bottom:8px">How Goals Are Used</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6">
                Your goals directly shape daily workout selection and which PIQ pillars are prioritised. Update them whenever your training focus shifts.
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    container.querySelectorAll('.goal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val
        if (selected.has(val)) { selected.delete(val) }
        else if (selected.size < 3) { selected.add(val) }
        else {
          const msg = container.querySelector('#goals-msg')
          if (msg) { msg.textContent='Max 3 goals. Remove one first.'; msg.style.display='block'; setTimeout(()=>msg.style.display='none',2500) }
          return
        }
        render_()
      })
    })

    container.querySelector('#save-goals')?.addEventListener('click', async (e) => {
      e.target.disabled   = true
      e.target.textContent= 'Saving…'
      try {
        await updateProfile({ goals: [...selected] })
        e.target.textContent = 'Saved ✓'
        setTimeout(() => { e.target.disabled=false; e.target.textContent='SAVE GOALS' }, 2000)
      } catch (err) {
        const msg = container.querySelector('#goals-msg')
        if (msg) { msg.textContent=err.message; msg.style.display='block' }
        e.target.disabled=false; e.target.textContent='SAVE GOALS'
      }
    })
  }

  render_()
}
