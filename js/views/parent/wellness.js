import { buildSidebar } from '../../components/nav.js';
import { getRoster, getState, getReadinessCheckIn } from '../../state/state.js';
export function renderParentWellness() {
  const roster = getRoster();
  const state = getState();
  const a = roster.find(x=>x.id===state.linkedAthlete) || roster[0] || {};
  const ci = getReadinessCheckIn ? getReadinessCheckIn() : {};
  const hasData = ci.sleepQuality > 0;
  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/wellness')}
  <main class="page-main">
    <div class="page-header"><h1>Wellness</h1><p>${a.name||'Your Athlete'} · Recovery and wellness monitoring</p></div>
    ${!hasData ? `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;gap:12px">
      <span style="font-size:20px">⚡</span>
      <div><div style="font-weight:700;font-size:13.5px;color:#f59e0b">No check-in data yet today</div>
      <div style="font-size:12px;color:var(--text-muted)">Your athlete hasn't logged their daily wellness check-in. Encourage them to do so in the app.</div></div>
    </div>` : ''}
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Today's Wellness Snapshot</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
          ${[
            ['Sleep Quality', hasData?ci.sleepQuality:null, 5, 'Critical for recovery and performance'],
            ['Energy Level',  hasData?ci.energyLevel:null,  5, 'Indicates readiness to train hard'],
            ['Muscle Soreness', hasData?ci.soreness:null,   5, 'Higher = more rest recommended', true],
            ['Mood',          hasData?ci.mood:null,         5, 'Mental readiness correlates with performance'],
            ['Stress Level',  hasData?ci.stressLevel:null,  5, 'School, life stress affects recovery', true],
          ].map(([label, val, max, desc, invert=false]) => {
            const pct = val ? Math.round((invert ? (max+1-val)/max : val/max) * 100) : 0;
            const c = pct>=70?'#22c955':pct>=50?'#f59e0b':'#ef4444';
            return `<div style="padding:10px;background:var(--surface-2);border-radius:10px">
              <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${label}</span>
                <span style="font-size:13px;font-weight:700;color:${val?c:'var(--text-muted)'}">${val?val+'/'+max:'No data'}</span>
              </div>
              <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:5px">
                <div style="height:100%;width:${val?pct:0}%;background:${c};border-radius:3px"></div>
              </div>
              <div style="font-size:11.5px;color:var(--text-muted)">${desc}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Parent Recovery Guide</div>
          <div style="margin-top:12px;font-size:13px;color:var(--text-muted);line-height:1.7">
            <p style="margin:0 0 10px"><strong style="color:var(--text-primary)">Sleep</strong> — 8–9 hours is non-negotiable. Even one night of poor sleep reduces reaction time and power output by up to 20%.</p>
            <p style="margin:0 0 10px"><strong style="color:var(--text-primary)">Nutrition</strong> — Post-practice meal within 30 minutes: protein + carbs. Chocolate milk is a proven recovery drink.</p>
            <p style="margin:0"><strong style="color:var(--text-primary)">Recovery days</strong> — These are programmed intentionally. Pushing hard on recovery days causes more harm than rest.</p>
          </div>
        </div>
        <div class="panel" style="background:#22c95510;border-color:#22c95540">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:6px">SCIENCE NOTE</div>
          <div style="font-size:12.5px;color:var(--text-muted);line-height:1.5">PIQ's readiness scores are based on the same wellness monitoring frameworks used by college and professional programs, adapted for high-school athletes.</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}