import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getRoster, getState } from '../../state/state.js';
import { getReadinessColor } from '../../state/selectors.js';
export function renderParentHome() {
  const user = getCurrentUser();
  const roster = getRoster();
  const state = getState();
  const linked = roster.find(a=>a.id===state.linkedAthlete) || roster[0] || {};
  const rColor = getReadinessColor(linked.readiness||72);
  const fname = user?.name?.split(' ')[0] || 'Parent';
  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Family <span>Dashboard</span></h1>
      <p>Welcome, ${fname} · ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
    </div>
    <div style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border:1px solid #22c95530;border-radius:16px;padding:20px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.08em;margin-bottom:6px">YOUR ATHLETE</div>
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:52px;height:52px;border-radius:50%;background:#22c95520;border:2px solid #22c95550;display:flex;align-items:center;justify-content:center;font-size:22px">🏀</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:700;color:#fff">${linked.name||'Your Athlete'}</div>
          <div style="font-size:12.5px;color:rgba(255,255,255,.6)">${linked.position||'—'} · ${linked.sport||'—'} · ${linked.level||'—'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:900;color:${rColor}">${linked.readiness||72}%</div>
          <div style="font-size:11px;color:rgba(255,255,255,.5)">Readiness</div>
        </div>
      </div>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Readiness</div><div class="kpi-val" style="color:${rColor}">${linked.readiness||72}%</div><div class="kpi-chg">${(linked.readiness||72)>=80?'Training full today':(linked.readiness||72)>=60?'Reduced intensity':'Recovery day'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${linked.piq||72}</div><div class="kpi-chg">Performance index</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${linked.streak||0}d</div><div class="kpi-chg">Consecutive sessions</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">What These Numbers Mean</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
          <div style="padding:12px;background:var(--surface-2);border-radius:10px;border-left:4px solid ${rColor}">
            <div style="font-weight:700;font-size:13.5px;color:var(--text-primary);margin-bottom:4px">Today's Readiness: ${linked.readiness||72}%</div>
            <div style="font-size:12.5px;color:var(--text-muted);line-height:1.5">${(linked.readiness||72)>=80?'Your athlete is fully primed for a high-intensity session today. Good sleep and energy levels reported.':(linked.readiness||72)>=60?'Your athlete can train at moderate intensity. Their body may need some extra recovery support today.':'Your athlete should do light activity only today. Make sure they get quality sleep and proper nutrition.'}</div>
          </div>
          <div style="padding:12px;background:var(--surface-2);border-radius:10px;border-left:4px solid var(--piq-green)">
            <div style="font-weight:700;font-size:13.5px;color:var(--text-primary);margin-bottom:4px">PIQ Score: ${linked.piq||72}</div>
            <div style="font-size:12.5px;color:var(--text-muted);line-height:1.5">A composite score combining training consistency, workout completion, and daily readiness. Scores above 80 indicate strong habits. Growth happens between 55–80.</div>
          </div>
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Quick Links</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            ${[['🏃','View My Athlete','parent/child'],['📅','Weekly Schedule','parent/week'],['📈','Progress Trends','parent/progress'],['💬','Message Coach','parent/messages']].map(([icon,label,route])=>`
            <button class="btn-draft" style="display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;font-size:13px" data-route="${route}">
              <span style="font-size:16px">${icon}</span>${label}
            </button>`).join('')}
          </div>
        </div>
        <div class="panel" style="background:#22c95510;border-color:#22c95540">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:6px">PARENT TIP</div>
          <div style="font-size:12.5px;color:var(--text-muted);line-height:1.5">The best thing you can do: ensure 8–9 hours of sleep before training days. Sleep quality is the #1 predictor of athlete readiness (Walker 2017).</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}