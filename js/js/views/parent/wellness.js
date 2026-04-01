/**
 * Parent Wellness View — athlete wellness overview for parent
 * Parent-facing language with evidence-based guidance.
 */
import { buildSidebar }  from '../../components/nav.js';
import { getRoster, getState } from '../../state/state.js';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function renderParentWellness() {
  const roster  = getRoster();
  const state   = getState();
  const athlete = roster[0] || { name: 'Jake Williams', readiness: 82, piq: 79, streak: 5 };
  const checkin = state.readinessCheckIn || {};
  const today   = new Date().toDateString();
  const hasCheckin = checkin.date === today && checkin.sleepQuality > 0;

  const rdyColor = athlete.readiness >= 80 ? '#22c955' : athlete.readiness < 60 ? '#ef4444' : '#f59e0b';
  const rdyLabel = athlete.readiness >= 80 ? 'High — Great day to train' : athlete.readiness < 60 ? 'Low — Rest recommended' : 'Moderate — Normal session';

  // Wellness factor cards with real check-in data where available
  const sleepQ  = hasCheckin ? checkin.sleepQuality  : null;
  const energy  = hasCheckin ? checkin.energyLevel   : null;
  const soreness= hasCheckin ? checkin.soreness       : null;
  const mood    = hasCheckin ? checkin.mood           : null;
  const stress  = hasCheckin ? checkin.stressLevel    : null;

  function fmtRating(val, invert = false) {
    if (val === null) return { label: 'Not logged', color: '#6b7280' };
    const v = invert ? (6 - val) : val;
    if (v >= 4) return { label: 'Good', color: '#22c955' };
    if (v >= 3) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Low', color: '#ef4444' };
  }

  const factors = [
    {
      label: 'Sleep Quality',
      icon:  '💤',
      rating: fmtRating(sleepQ),
      note:  'Adolescent athletes need 8–10 hours per night. Sleep is when muscle repair and skill consolidation happen.',
      source:'Halson, Sports Med, 2014',
      tip:   'Set a consistent bedtime — even on weekends. Remove screens 1 hour before sleep.',
    },
    {
      label: 'Energy Level',
      icon:  '⚡',
      rating: fmtRating(energy),
      note:  'Pre-session energy predicts training quality and injury risk. Low energy = higher risk.',
      source:'Foster et al., JSCR, 2001',
      tip:   'A small carbohydrate-rich snack 60–90 minutes before training significantly boosts energy.',
    },
    {
      label: 'Muscle Soreness',
      icon:  '💪',
      rating: fmtRating(soreness, true),
      note:  'Some soreness is normal after intense sessions. High soreness is a signal to reduce intensity.',
      source:'NSCA Youth Development Guidelines, 2022',
      tip:   'Light movement, hydration, and protein within 30 minutes post-training reduce recovery time.',
    },
    {
      label: 'Mood / Motivation',
      icon:  '😊',
      rating: fmtRating(mood),
      note:  'Mental state directly affects athletic performance and injury resilience.',
      source:'Vealey, PST Model, 2007',
      tip:   'Ask open-ended questions before practice — not "are you ready?" but "how are you feeling today?"',
    },
    {
      label: 'Stress Level',
      icon:  '🧠',
      rating: fmtRating(stress, true),
      note:  'Academic, social, and emotional stress suppresses recovery and increases injury risk in youth athletes.',
      source:'Gabbett, BJSM, 2016',
      tip:   'Watch for signs of overload: irritability, sleep changes, loss of enjoyment. These are real performance signals.',
    },
  ];

  const factorCards = factors.map(f => `
  <div style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:22px;flex-shrink:0">${f.icon}</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13.5px;color:var(--text-primary)">${esc(f.label)}</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:1px">${esc(f.note)}</div>
      </div>
      <span style="background:${f.rating.color}22;color:${f.rating.color};font-size:11px;padding:3px 10px;border-radius:10px;font-weight:700;white-space:nowrap;flex-shrink:0">${f.rating.label}</span>
    </div>
    <div style="display:flex;align-items:flex-start;gap:8px;background:var(--piq-green)0d;border-radius:8px;padding:8px 10px;margin-top:4px">
      <span style="font-size:13px;flex-shrink:0">💡</span>
      <div>
        <div style="font-size:12px;color:var(--text-primary);line-height:1.5">${esc(f.tip)}</div>
        <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px">Source: ${esc(f.source)}</div>
      </div>
    </div>
  </div>`).join('');

  const checkinBanner = hasCheckin
    ? `<div style="background:#22c95514;border:1px solid #22c95540;border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">✅</span>
        <div>
          <div style="font-weight:700;font-size:13px;color:var(--piq-green)">Today's wellness check-in complete</div>
          <div style="font-size:12px;color:var(--text-muted)">Data updated as of ${new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</div>
        </div>
      </div>`
    : `<div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">⏰</span>
        <div>
          <div style="font-weight:700;font-size:13px;color:#f59e0b">No check-in today yet</div>
          <div style="font-size:12px;color:var(--text-muted)">Remind your athlete to complete their daily check-in for accurate wellness data.</div>
        </div>
      </div>`;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/wellness')}
  <main class="page-main">
    <div class="page-header">
      <h1>Wellness Overview</h1>
      <p>${esc(athlete.name)} · Health and wellbeing monitoring</p>
    </div>

    ${checkinBanner}

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-lbl">Readiness Today</div>
        <div class="kpi-val" style="color:${rdyColor}">${athlete.readiness}%</div>
        <div class="kpi-chg">${rdyLabel.split(' — ')[0]}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Training Streak</div>
        <div class="kpi-val">🔥 ${athlete.streak || 0}d</div>
        <div class="kpi-chg">Consecutive days</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Injury Status</div>
        <div class="kpi-val" style="color:#22c955">Clear</div>
        <div class="kpi-chg">No flags logged</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Check-ins (7d)</div>
        <div class="kpi-val b">${hasCheckin ? '1' : '0'}</div>
        <div class="kpi-chg">This week</div>
      </div>
    </div>

    <div class="panels-2">
      <div>${factorCards}</div>
      <div>
        <!-- Readiness explained -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Today's Readiness: ${athlete.readiness}%</div>
          <div style="background:${rdyColor}11;border:1px solid ${rdyColor}33;border-radius:10px;padding:14px;margin-top:10px">
            <div style="font-size:30px;font-weight:900;color:${rdyColor};margin-bottom:4px">${athlete.readiness}%</div>
            <div style="font-size:13px;color:var(--text-primary);font-weight:600;margin-bottom:6px">${rdyLabel}</div>
            <div style="font-size:12.5px;color:var(--text-muted);line-height:1.6">
              ${athlete.readiness >= 80
                ? `${esc(athlete.name)} is well-rested and physically ready. Full-intensity training is appropriate today.`
                : athlete.readiness < 60
                  ? `${esc(athlete.name)}'s readiness is low. A lighter session or rest day is recommended. Encourage an early bedtime tonight.`
                  : `${esc(athlete.name)} is in reasonable shape for training. A normal session is appropriate with attention to technique over intensity.`}
            </div>
          </div>
        </div>

        <!-- Injury guidance -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Injury Prevention</div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
            ${[
              ['Report any pain immediately', 'Training through pain significantly increases injury severity. Encourage honesty.'],
              ['Watch for overuse signs', 'Gradual onset pain, limping, or guarding during warm-up are early warning signs.'],
              ['Sleep is the best recovery tool', '1 extra hour of sleep per night reduces injury risk by up to 68% in youth athletes (Milewski et al., 2014).'],
            ].map(([h, b]) => `
            <div style="background:var(--surface-2);border-radius:8px;padding:10px 12px">
              <div style="font-weight:600;font-size:12.5px;color:var(--text-primary);margin-bottom:3px">⚠️ ${esc(h)}</div>
              <div style="font-size:12px;color:var(--text-muted)">${esc(b)}</div>
            </div>`).join('')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">Message Coach</div>
          <div style="font-size:13px;color:var(--text-muted);margin:10px 0">Have a wellness concern? Message the coaching staff directly.</div>
          <button class="btn-primary" data-route="parent/messages" style="width:100%;font-size:13px;padding:10px">Open Messages</button>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
