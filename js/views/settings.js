// js/views/settings.js — PerformanceIQ
import { getProfile, updateProfile, signOut } from '../core/supabase.js'
import { navigate } from '../core/router.js'
import { getNotifications, markAllRead, requestPushPermission, getPushStatus } from '../services/notificationService.js'
import { getTheme, setTheme } from '../core/theme.js'

export async function render(container) {
  const profile = getProfile()
  const [notifs, pushStatus] = await Promise.all([
    getNotifications({ limit: 10 }),
    getPushStatus()
  ])

  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">Account <em class="hl">Settings</em></h1>
    </div>

    <div class="two-col">
      <div>
        <!-- Theme -->
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><span class="panel-title">Appearance</span></div>
          <div style="padding:16px 20px">
            <label style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:10px">Theme</label>
            <div style="display:flex;gap:8px">
              ${['light','dark','system'].map(t => `
                <button class="theme-btn" data-val="${t}" style="
                  flex:1;padding:10px 8px;border-radius:8px;cursor:pointer;
                  border:1.5px solid ${getTheme()===t ? 'var(--accent-green)' : 'var(--card-border)'};
                  background:${getTheme()===t ? 'var(--accent-green-dim)' : 'transparent'};
                  font-size:12px;font-weight:600;color:var(--text-primary);
                  transition:all 0.15s;display:flex;flex-direction:column;align-items:center;gap:4px">
                  <span style="font-size:18px">${t==='light'?'☀️':t==='dark'?'🌙':'💻'}</span>
                  <span style="text-transform:capitalize">${t}</span>
                </button>`).join('')}
            </div>
          </div>
        </div>

        <!-- Profile card -->
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><span class="panel-title">Profile</span></div>
          <div style="padding:16px 20px;display:flex;flex-direction:column;gap:14px">
            <div>
              <label style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:6px">Display Name</label>
              <input id="pref-name" type="text" value="${profile?.display_name ?? ''}"
                style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text-primary);background:var(--card-bg)">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:6px">Sport</label>
              <select id="pref-sport" style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
                ${['basketball','football','soccer','baseball','volleyball','track','other'].map(s =>
                  `<option value="${s}" ${profile?.sport===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
                ).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);display:block;margin-bottom:6px">Training Level</label>
              <select id="pref-level" style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
                ${['beginner','intermediate','advanced'].map(l =>
                  `<option value="${l}" ${profile?.training_level===l?'selected':''}>${l.charAt(0).toUpperCase()+l.slice(1)}</option>`
                ).join('')}
              </select>
            </div>
            <div id="profile-msg" style="display:none;font-size:12px;color:var(--accent-green)">✓ Saved</div>
            <button id="save-profile" style="padding:11px;background:var(--accent-green);color:white;border:none;border-radius:8px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;cursor:pointer">
              SAVE PROFILE
            </button>
          </div>
        </div>

        <!-- Push notifications -->
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><span class="panel-title">Notifications</span></div>
          <div style="padding:16px 20px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-primary)">Push Notifications</div>
                <div style="font-size:12px;color:var(--text-muted)">Status: ${pushStatus}</div>
              </div>
              ${pushStatus !== 'granted' ? `
                <button id="enable-push" style="padding:8px 16px;background:var(--accent-green);color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">
                  Enable
                </button>` : '<span style="color:var(--accent-green);font-size:12px;font-weight:600">✓ Enabled</span>'}
            </div>
          </div>
        </div>

        <!-- Sign out -->
        <div class="panel">
          <div style="padding:16px 20px">
            <div style="margin-bottom:4px;font-size:13px;font-weight:600;color:var(--text-primary)">Signed in as</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${profile?.email ?? 'unknown'} · ${profile?.role ?? 'athlete'}</div>
            <button id="signout-btn" style="width:100%;padding:11px;background:transparent;border:1.5px solid var(--accent-red);border-radius:8px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;cursor:pointer;color:var(--accent-red)">
              SIGN OUT
            </button>
          </div>
        </div>
      </div>

      <!-- Notifications panel -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Recent Notifications</span>
          ${notifs.some(n=>!n.read) ? `<button id="mark-all-read" style="font-size:12px;color:var(--accent-green);background:none;border:none;cursor:pointer">Mark all read</button>` : ''}
        </div>
        ${notifs.length ? notifs.map(n => `
          <div class="session-row" style="${n.read?'opacity:0.5':''}">
            <div style="width:8px;height:8px;border-radius:50%;background:${n.read?'var(--card-border)':'var(--accent-green)'};flex-shrink:0;margin-top:5px"></div>
            <div style="flex:1;min-width:0">
              <div class="session-name">${n.title}</div>
              ${n.body ? `<div class="session-meta">${n.body}</div>` : ''}
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${new Date(n.created_at).toLocaleDateString()}</div>
            </div>
          </div>`).join('')
        : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">No notifications yet.</div>`}
      </div>
    </div>
  `

  // Theme buttons
  container.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.val)
      // Re-render to update active state
      render(container)
    })
  })

  // Save profile
  container.querySelector('#save-profile')?.addEventListener('click', async (e) => {
    e.target.disabled=true; e.target.textContent='Saving…'
    try {
      await updateProfile({
        display_name:   container.querySelector('#pref-name').value.trim(),
        sport:          container.querySelector('#pref-sport').value,
        training_level: container.querySelector('#pref-level').value,
      })
      const msg = container.querySelector('#profile-msg')
      if (msg) { msg.style.display='block'; setTimeout(()=>msg.style.display='none',2000) }
    } catch {}
    e.target.disabled=false; e.target.textContent='SAVE PROFILE'
  })

  // Enable push
  container.querySelector('#enable-push')?.addEventListener('click', async (e) => {
    e.target.textContent='Enabling…'
    const ok = await requestPushPermission()
    e.target.textContent = ok ? '✓ Enabled' : 'Denied'
    e.target.disabled    = true
  })

  // Mark all read
  container.querySelector('#mark-all-read')?.addEventListener('click', async () => {
    await markAllRead()
    await render(container)
  })

  // Sign out
  container.querySelector('#signout-btn')?.addEventListener('click', async () => {
    await signOut()
    navigate('/login')
  })
}
