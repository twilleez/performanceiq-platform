/**
 * Parent Home Dashboard v2
 * Role-specific view: parent perspective.
 * Focus: child's progress, wellness, safety, and development.
 * Parents see simplified, non-technical information with safety emphasis.
 */
import { buildSidebar }          from '../../components/nav.js';
import { getCurrentUser, getCurrentRole } from '../../core/auth.js';
import { getRoster, getWorkoutLog } from '../../state/state.js';

export function renderParentHome() {
  const user   = getCurrentUser() || {};
  const role   = getCurrentRole() || 'parent';
  const fname  = user.name?.split(' ')[0] || 'Parent';
  const hour   = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Use first roster athlete as linked child (demo)
  const roster = getRoster();
  const child  = roster[2] || roster[0]; // Jamal R. as demo linked athlete
  const rColor = child.readiness >= 80 ? '#22c955' : child.readiness >= 60 ? '#f59e0b' : '#ef4444';
  const rLabel = child.readiness >= 80 ? 'High — Great day to train' : child.readiness >= 60 ? 'Moderate — Normal training' : 'Low — Rest recommended';

  // Weekly activity (demo data)
  const weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weekActivity = [true, true, false, true, true, false, false]; // demo

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/home')}
  <main class="page-main">

    <div class="page-header">
      <h1>${greeting}, <span>${fname}</span></h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · Monitoring ${child.name}</p>
    </div>

    <!-- Child Overview Banner -->
    <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border:1px solid #22c95530;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="width:60px;height:60px;border-radius:50%;background:var(--piq-green);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#0d1b3e;flex-shrink:0">
          ${child.name.charAt(0)}
        </div>
        <div style="flex:1">
          <div style="font-size:18px;font-weight:800;color:#fff">${child.name}</div>
          <div style="font-size:13px;color:#a0b4d0;margin-top:2px">${child.position} · ${child.sport?.charAt(0).toUpperCase()+child.sport?.slice(1)} · ${child.level?.charAt(0).toUpperCase()+child.level?.slice(1)}</div>
          <div style="font-size:12px;color:#a0b4d0;margin-top:2px">Age ${child.age} · ${child.height} · ${child.weight} lbs</div>
        </div>
        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:28px;font-weight:900;color:var(--piq-green)">${child.piq}</div>
          <div style="font-size:11px;color:#a0b4d0;font-weight:600">PIQ SCORE</div>
        </div>
      </div>
    </div>

    <!-- Parent KPI Row -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      ${_parentKPI('PIQ Score', child.piq, child.piq>=80?'Excellent':child.piq>=70?'Good':'Developing', '#22c955', '🏅')}
      ${_parentKPI('Readiness', child.readiness, rLabel.split(' — ')[0], rColor, '💚')}
      ${_parentKPI('Streak', child.streak + ' days', child.streak>=5?'Excellent habit!':child.streak>=3?'Good consistency':'Keep going', '#f59e0b', '🔥')}
      ${_parentKPI('This Week', weekActivity.filter(Boolean).length + '/7', 'Sessions completed', '#60a5fa', '📅')}
    </div>

    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">
      <div>
        <!-- Weekly Activity -->
        <div class="panel" style="margin-bottom:20px">
          <div class="panel-title">This Week's Activity</div>
          <div style="display:flex;gap:8px;margin-top:14px">
            ${weekDays.map((d, i) => `
            <div style="flex:1;text-align:center">
              <div style="width:36px;height:36px;border-radius:50%;background:${weekActivity[i]?'var(--piq-green)':'var(--surface-2)'};border:2px solid ${weekActivity[i]?'var(--piq-green)':'var(--border)'};display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-size:14px">
                ${weekActivity[i] ? '✓' : ''}
              </div>
              <div style="font-size:10px;color:var(--text-muted);font-weight:600">${d}</div>
            </div>`).join('')}
          </div>
          <div style="margin-top:14px;padding:10px 12px;background:var(--surface-2);border-radius:8px">
            <div style="font-size:12px;color:var(--text-muted);line-height:1.6">
              <strong>Parent Note:</strong> ${child.streak >= 3 ? `${child.name} has been consistent this week — ${child.streak} day streak. Consistency is the most important factor in long-term athletic development.` : `Encourage ${child.name} to maintain a consistent training schedule. 3–5 sessions per week is ideal for high school athletes.`}
            </div>
          </div>
        </div>

        <!-- Development Progress -->
        <div class="panel" style="margin-bottom:20px">
          <div class="panel-title">Development Progress</div>
          <div style="font-size:12px;color:var(--text-muted);margin:6px 0 14px">How your athlete is developing across key performance pillars:</div>
          ${[
            { label: 'Training Consistency', val: Math.min(100, child.streak * 12 + 40), color: '#22c955', note: 'Based on session streak and frequency' },
            { label: 'Physical Readiness', val: child.readiness, color: rColor, note: 'Daily readiness score (sleep, energy, recovery)' },
            { label: 'Performance IQ', val: child.piq, color: '#60a5fa', note: 'Overall PIQ Score — composite of all factors' },
          ].map(p => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-size:12px;font-weight:600;color:var(--text-primary)">${p.label}</span>
              <span style="font-size:12px;font-weight:700;color:${p.color}">${p.val}/100</span>
            </div>
            <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${p.val}%;background:${p.color};border-radius:4px;transition:width 600ms ease"></div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${p.note}</div>
          </div>`).join('')}
        </div>

        <!-- Safety & Wellness -->
        <div class="panel" style="border:1px solid #22c95530;background:#22c95508">
          <div class="panel-title" style="color:var(--piq-green)">Safety & Wellness</div>
          <div style="font-size:12px;color:var(--text-muted);margin:6px 0 12px">Performance IQ prioritizes athlete safety above all else.</div>
          ${[
            { icon: '💚', label: 'Readiness Monitoring', desc: 'Daily check-ins prevent overtraining and injury.' },
            { icon: '🌊', label: 'Pliability Protocols', desc: 'Every workout includes TB12 warm-up and cool-down.' },
            { icon: '⚖️', label: 'Load Management', desc: 'Training intensity adapts to readiness score daily.' },
            { icon: '🧠', label: 'Mindset Development', desc: 'Mental performance coaching integrated into every session.' },
          ].map(s => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #22c95520">
            <span style="font-size:16px;flex-shrink:0">${s.icon}</span>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">${s.label}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.desc}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <div>
        <!-- Today's Status -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Today's Status</div>
          <div style="text-align:center;padding:16px 0">
            <div style="font-size:36px;font-weight:900;color:${rColor}">${child.readiness}</div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin:4px 0">${rLabel.split(' — ')[0]}</div>
            <div style="font-size:12px;color:var(--text-muted)">${rLabel.split(' — ')[1] || ''}</div>
          </div>
          <div style="padding:10px 12px;background:${rColor}12;border-radius:8px;border:1px solid ${rColor}30">
            <div style="font-size:12px;color:var(--text-muted);line-height:1.5">
              ${child.readiness >= 80 ? `${child.name} is well-rested and ready to train hard today. Full-intensity session is appropriate.` :
                child.readiness >= 60 ? `${child.name} is in good shape for training. Normal session with attention to technique.` :
                `${child.name}'s readiness is low today. A lighter session or rest day is recommended. Encourage good sleep tonight.`}
            </div>
          </div>
        </div>

        <!-- Parent Quick Actions -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Parent Actions</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            ${[
              ['🏃', 'My Athlete\'s Profile', 'parent/child'],
              ['📅', 'Weekly Training Plan', 'parent/week'],
              ['📈', 'Progress Report', 'parent/progress'],
              ['💚', 'Wellness Check', 'parent/wellness'],
              ['💬', 'Message Coach', 'parent/messages'],
              ['💳', 'Billing & Subscription', 'parent/billing'],
            ].map(([icon, label, route]) => `
            <button class="btn-draft" style="display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;font-size:13px" data-route="${route}">
              <span style="font-size:16px">${icon}</span> ${label}
            </button>`).join('')}
          </div>
        </div>

        <!-- Parent Education -->
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border:1px solid #22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:8px">PARENT INSIGHT</div>
          <div style="font-size:12px;color:#c8d8e8;line-height:1.6">"The most important thing parents can do is ensure their athlete gets 8-10 hours of sleep. Sleep is when adaptation happens — it is the most powerful performance tool available." — NSCA Youth Athlete Development Guidelines</div>
        </div>
      </div>
    </div>

  </main>
</div>`;
}

function _parentKPI(label, value, sub, color, icon) {
  return `
<div class="panel" style="border-bottom:3px solid ${color}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between">
    <div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase">${label}</div>
      <div style="font-size:24px;font-weight:900;color:${color};margin:4px 0 2px">${value}</div>
      <div style="font-size:11px;color:var(--text-muted)">${sub}</div>
    </div>
    <span style="font-size:22px">${icon}</span>
  </div>
</div>`;
}
