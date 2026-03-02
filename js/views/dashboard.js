import { dom } from '../ui/dom.js';
import { STATE, ATHLETES } from '../state/state.js';
import { EVENTS, FEED_ITEMS } from '../data/demo.js';
import { getSevClass, getSevColor, getAcrClass, getAcrColor, getAcrFlag } from '../features/scoring.js';

function buildSparkline(node, values, color){
  if (!node) return;
  const max = Math.max(...values, 1);
  node.innerHTML = values.map((v,i)=>
    `<div class="spark-bar${i===values.length-1?' hi':''}" style="height:${Math.round(v/max*100)}%;background:${color}"></div>`
  ).join('');
}

function renderHeatmap(){
  const body = dom.heatmapBody;
  if (!body) return;

  body.innerHTML = ATHLETES.map(a => {
    const sevCls = getSevClass(a.severity);
    const sevColor = getSevColor(a.severity);
    const acrCls = getAcrClass(a.acr);
    const readPct = a.recovery || 0;

    const riskHtml = a.riskLevel === 'watch'
      ? `<span class="risk-badge watch">⚠ Watch</span>`
      : a.riskLevel === 'rest'
      ? `<span class="risk-badge rest">⛔ Rest</span>`
      : a.score === 0
      ? `<span class="risk-badge" style="color:var(--text-dim)">Not Logged</span>`
      : `<span class="risk-badge none">—</span>`;

    const scoreHtml = a.score
      ? `<span class="score-badge ${sevCls}">${a.score}</span>`
      : `<span style="color:var(--text-dim);font-family:var(--font-mono)">—</span>`;

    return `<tr data-id="${a.id}" title="View ${a.name}">
      <td>
        <div class="athlete-cell">
          <div class="athlete-av" style="background:${a.color};color:${a.colorText};width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${a.initials}</div>
          <div>
            <div class="athlete-name-text">${a.name}</div>
            <div class="athlete-pos-text">${a.pos} · #${a.jersey}</div>
          </div>
        </div>
      </td>
      <td>${scoreHtml}</td>
      <td>
        <div class="readiness-wrap">
          <div class="readiness-track"><div class="readiness-fill" style="width:${readPct}%;background:${sevColor}"></div></div>
          <div class="readiness-num" style="color:${a.colorText}">${a.recovery ?? '—'}</div>
        </div>
      </td>
      <td><span class="acr-val ${acrCls}">${a.acr ?? '—'}</span></td>
      <td>${riskHtml}</td>
      <td><span class="trend-val ${a.trend>0?'up':a.trend<0?'down':''}">${a.trend>0?'↑':a.trend<0?'↓':'—'}${Math.abs(a.trend)}</span></td>
    </tr>`;
  }).join('');
}

function renderLoadBars(){
  const wrap = dom.loadBarList;
  if (!wrap) return;

  wrap.innerHTML = ATHLETES.filter(a => a.acr != null).map(a => {
    const pct_ = Math.min(100, Math.round(a.acr / 2.0 * 100));
    const color = getAcrColor(a.acr);
    const parts = a.name.split(' ');
    const label = parts[0] + ' ' + (parts[1] ? parts[1][0] + '.' : '');
    return `<div class="load-bar-item">
      <div class="load-bar-name">${label}</div>
      <div class="load-bar-track"><div class="load-bar-fill" style="width:${pct_}%;background:${color}"></div></div>
      <div class="load-bar-val" style="color:${color}">${a.acr}</div>
      <div class="load-bar-flag">${getAcrFlag(a.acr)}</div>
    </div>`;
  }).join('');
}

function renderAlerts(){
  const wrap = dom.alertsList;
  if (!wrap) return;

  const alerts = [
    ...ATHLETES.filter(a => a.riskLevel === 'rest').map(a => ({
      cls:'danger', icon:'⛔',
      title:`${a.name} — Rest Today`,
      body:`ACWR ${a.acr} — 3rd consecutive high-load day. High injury risk. Full rest today.`
    })),
    ...ATHLETES.filter(a => a.riskLevel === 'watch').map(a => ({
      cls:'warn', icon:'⚠',
      title:`${a.name} — Monitor Load`,
      body:`ACWR ${a.acr} approaching danger zone. Reduce intensity today.`
    })),
    ...ATHLETES.filter(a => a.score === 0).map(a => ({
      cls:'info', icon:'📊',
      title:`${a.name} — Not Logged`,
      body:`No wellness data submitted today. Send a check-in prompt.`
    })),
  ];

  wrap.innerHTML = alerts.length
    ? alerts.map(al => `<div class="alert ${al.cls}">
        <div class="alert-icon">${al.icon}</div>
        <div><div class="alert-title">${al.title}</div><div>${al.body}</div></div>
      </div>`).join('')
    : `<div class="alert ok">
        <div class="alert-icon">✅</div>
        <div><div class="alert-title">All Clear</div><div>No risk flags today. Team load is well managed.</div></div>
      </div>`;
}

function renderRosterMini(){
  const wrap = dom.rosterMini;
  if (!wrap) return;

  wrap.innerHTML = ATHLETES.slice(0, 5).map(a => {
    const color = getSevColor(a.severity);
    return `<div class="roster-row" data-id="${a.id}">
      <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${a.color};color:${a.colorText};font-size:11px;font-weight:700">${a.initials}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</div>
        <div style="font-size:11px;color:var(--text-dim)">${a.pos} · #${a.jersey}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
        <div class="readiness-track" style="width:56px"><div class="readiness-fill" style="width:${a.recovery||0}%;background:${color}"></div></div>
        <div style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:${color}">${a.score||'—'}</div>
      </div>
    </div>`;
  }).join('');
}

function renderFeed(){
  const wrap = dom.activityFeed;
  if (!wrap) return;
  wrap.innerHTML = FEED_ITEMS.map(f => `
    <div class="feed-item">
      <div class="feed-icon ${f.cls}">${f.icon}</div>
      <div><div class="feed-text">${f.text}</div><div class="feed-time">${f.time}</div></div>
    </div>`).join('');
}

function renderEvents(node){
  if (!node) return;
  node.innerHTML = EVENTS.map(ev => `
    <div class="event-item">
      <div style="text-align:center;min-width:36px">
        <div class="event-days-num ${ev.days<=3?'soon':''}">${ev.days}</div>
        <div class="event-days-label">days</div>
      </div>
      <div><div class="event-name">${ev.name}</div><div class="event-detail">${ev.detail}</div></div>
      <div style="font-size:17px;margin-left:auto">${ev.icon}</div>
    </div>`).join('');
}

export function renderDashboard(){
  const now = new Date();
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (dom.dashSub) {
    dom.dashSub.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()} · ${STATE.teamName}`;
  }

  const logged  = ATHLETES.filter(a => a.score > 0);
  const ready   = ATHLETES.filter(a => a.severity === 'green').length;
  const monitor = ATHLETES.filter(a => a.severity === 'yellow').length;
  const risk    = ATHLETES.filter(a => a.severity === 'red').length;
  const avg     = logged.length ? Math.round(logged.reduce((s,a) => s+a.score, 0) / logged.length) : 0;
  const BASE    = 65;

  if (dom.statAvg) dom.statAvg.textContent = avg || '—';
  if (dom.statReady) dom.statReady.textContent = ready;
  if (dom.statMonitor) dom.statMonitor.textContent = monitor;
  if (dom.statRisk) dom.statRisk.textContent = risk;

  if (dom.statAvgSub) {
    dom.statAvgSub.className = 'stat-sub ' + (avg >= BASE ? 'up' : 'down');
    dom.statAvgSub.textContent = avg
      ? (avg >= BASE ? `↑ ${avg-BASE} pts vs last week` : `↓ ${BASE-avg} pts vs last week`)
      : '—';
  }
  if (dom.statReadySub) dom.statReadySub.textContent = `${ready} of ${ATHLETES.length} athletes`;
  if (dom.statMonitorSub) dom.statMonitorSub.textContent = monitor > 0 ? `↑ Check load today` : 'All clear';

  const flags = risk + monitor;
  if (dom.riskBadge) { dom.riskBadge.textContent = flags; dom.riskBadge.style.display = flags > 0 ? 'flex' : 'none'; }

  if (dom.chipOnlineText) dom.chipOnlineText.textContent = `${Math.max(0, ATHLETES.length - 1)} online`;
  if (dom.chipFlags) dom.chipFlags.style.display = risk > 0 ? 'inline-flex' : 'none';
  if (dom.chipFlagsText) dom.chipFlagsText.textContent = `${risk} flag${risk !== 1 ? 's' : ''}`;
  if (dom.chipGame) dom.chipGame.style.display = 'inline-flex';
  if (dom.chipGameText2) dom.chipGameText2.textContent = `Game in ${EVENTS[0]?.days ?? '—'}d`;

  if (dom.pillOnlineText) dom.pillOnlineText.textContent = `Team · ${Math.max(0, ATHLETES.length - 1)} online`;
  if (dom.pillSeason) dom.pillSeason.textContent = STATE.season;
  if (dom.pillGame) dom.pillGame.style.display = 'inline-flex';
  if (dom.pillGameText) dom.pillGameText.textContent = `Game in ${EVENTS[0]?.days ?? '—'} days`;

  buildSparkline(dom.sparkAvg, [55,58,63,66,68,70,avg], 'var(--accent)');

  renderHeatmap();
  renderLoadBars();
  renderAlerts();
  renderRosterMini();
  renderFeed();
  renderEvents(dom.eventList);

  if (dom.insightText) {
    dom.insightText.innerHTML =
      `When athletes sleep <strong>8+ hours</strong>, team PIQ averages <strong>+11 points higher</strong>.
       With Friday's game, sleep is this week's #1 performance lever.
       <div class="caption-illusion">Tip: tap an athlete row to open the detail view instantly.</div>`;
  }
}
