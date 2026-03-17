/**
 * Parent Wellness View — athlete wellness and health overview
 */
import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';

export function renderParentWellness() {
  const roster  = getRoster();
  const athlete = roster[0] || { name: 'Jake Williams', readiness: 82, piq: 79, streak: 5, sport: 'basketball' };
  const readinessColor = athlete.readiness>=80?'#22c955':athlete.readiness<60?'#ef4444':'#f59e0b';

  const wellnessItems = [
    { label: 'Sleep Quality',   value: 'Good',    icon: '💤', color: '#22c955', note: '7–9 hours recommended for adolescent athletes' },
    { label: 'Hydration',       value: 'Adequate', icon: '💧', color: '#3b82f6', note: '16–24 oz before training; replace losses during session' },
    { label: 'Nutrition',       value: 'On Track', icon: '🥗', color: '#22c955', note: 'Pre-training meal 2–3 hours before; post-training protein within 30 min' },
    { label: 'Injury Status',   value: 'No Issues', icon: '🏥', color: '#22c955', note: 'Report any pain, tightness, or discomfort to the coach immediately' },
    { label: 'Stress / Mood',   value: 'Positive', icon: '🧠', color: '#22c955', note: 'Mental wellness is as important as physical. Check in regularly.' },
  ];

  const wellnessRows = wellnessItems.map(w => `
  <div style="padding:14px;border:1px solid var(--border);border-radius:12px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <span style="font-size:22px">${w.icon}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${w.label}</div>
      </div>
      <span style="font-size:12px;padding:3px 10px;border-radius:10px;background:${w.color}22;color:${w.color};font-weight:600">${w.value}</span>
    </div>
    <div style="font-size:12px;color:var(--text-muted);padding-left:34px">${w.note}</div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/wellness')}
  <main class="page-main">
    <div class="page-header">
      <h1>Wellness Overview</h1>
      <p>${athlete.name} · Health and wellbeing</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Readiness Today</div><div class="kpi-val" style="color:${readinessColor}">${athlete.readiness}%</div><div class="kpi-chg">${athlete.readiness>=80?'High':athlete.readiness<60?'Low':'Moderate'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${athlete.streak}d</div><div class="kpi-chg">Active days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Wellness Score</div><div class="kpi-val g">Good</div><div class="kpi-chg">Overall status</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Injury Flags</div><div class="kpi-val" style="color:#22c955">None</div><div class="kpi-chg">No active alerts</div></div>
    </div>
    <div class="panels-2">
      <div>
        ${wellnessRows}
      </div>
      <div class="panel">
        <div class="panel-title">Parent Guidance</div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-primary);line-height:1.7">
          <p style="margin:0 0 12px"><strong>You play a critical role</strong> in your athlete's development. Here are the most impactful things you can do:</p>
          ${[
            ['Ensure 8–10 hours of sleep nightly', 'Sleep is when adaptation and growth occur. It is the single most important recovery tool.'],
            ['Support proper nutrition', 'Whole foods, adequate protein (0.7–1g/lb bodyweight), and consistent meal timing support performance.'],
            ['Watch for overtraining signs', 'Persistent fatigue, mood changes, declining performance, or frequent illness may indicate overtraining. Consult the coach.'],
            ['Encourage open communication', 'Athletes should feel safe reporting pain, stress, or concerns without fear of being benched.'],
          ].map(([title, desc]) => `
          <div style="margin-bottom:12px;padding:12px;background:var(--surface-2);border-radius:10px">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px">${title}</div>
            <div style="font-size:12px;color:var(--text-muted)">${desc}</div>
          </div>`).join('')}
          <div style="padding:12px;background:#ef444411;border-radius:10px;font-size:12px;color:var(--text-muted)">
            <strong style="color:var(--text-primary)">Medical disclaimer:</strong> PerformanceIQ is not a medical platform. For any health concerns, pain, or injury, consult a qualified healthcare professional.
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
