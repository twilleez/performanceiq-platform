/* ================================================================
   PerformanceIQ — core.js  v5.0  Production
   ================================================================ */

'use strict';

/* ─── STATE ─── */
const STATE = {
  role: 'coach',
  sport: 'basketball',
  injuries: [],
  teamName: 'Westview Varsity Basketball',
  season: 'Pre-Season',
  currentView: 'dashboard',
  selectedAthlete: null,
  onboarded: false,
};

/* ─── DEMO DATA ─── */
const ATHLETES = [
  {
    id: 1, name: 'Marcus Johnson', initials: 'MJ', pos: 'PG', jersey: 3,
    score: 92, severity: 'green', acr: 1.04, recovery: 94,
    trend: +7, flags: 'None', riskLevel: 'none',
    sleep: 8.2, soreness: 2, energy: 9,
    weekHistory: [74, 78, 82, 86, 88, 92],
    color: 'rgba(46,204,113,0.15)', colorText: 'var(--green)',
    prs: [
      { exercise:'Back Squat', current:'295 lbs', prev:'280 lbs', date:'Feb 20' },
      { exercise:'Bench Press', current:'225 lbs', prev:'215 lbs', date:'Feb 14' },
      { exercise:'40yd Dash', current:'4.52s', prev:'4.61s', date:'Feb 18' },
    ],
    insight: 'Sleep averaging <strong>8.2 hours</strong> — your top pillar. Maintain this heading into game week.',
  },
  {
    id: 2, name: 'Keisha Davis', initials: 'KD', pos: 'SF', jersey: 21,
    score: 85, severity: 'green', acr: 1.09, recovery: 88,
    trend: +4, flags: 'None', riskLevel: 'none',
    sleep: 7.8, soreness: 3, energy: 8,
    weekHistory: [70, 74, 78, 80, 82, 85],
    color: 'rgba(0,212,170,0.15)', colorText: 'var(--accent)',
    prs: [
      { exercise:'Power Clean', current:'165 lbs', prev:'155 lbs', date:'Feb 22' },
      { exercise:'Vertical Jump', current:'28"', prev:'26"', date:'Feb 10' },
    ],
    insight: 'Variety pillar at 90 — the most diverse training profile on the team. Consider one more strength block.',
  },
  {
    id: 3, name: 'Darius Jones', initials: 'DJ', pos: 'PF', jersey: 5,
    score: 78, severity: 'green', acr: 0.92, recovery: 82,
    trend: +2, flags: 'None', riskLevel: 'none',
    sleep: 7.5, soreness: 4, energy: 7,
    weekHistory: [68, 70, 72, 74, 76, 78],
    color: 'rgba(74,158,255,0.15)', colorText: 'var(--blue)',
    prs: [
      { exercise:'Romanian DL', current:'315 lbs', prev:'295 lbs', date:'Feb 19' },
    ],
    insight: 'ACWR at 0.92 — slightly undertrained relative to chronic load. One additional session this week would be ideal.',
  },
  {
    id: 4, name: 'Tyler Williams', initials: 'TW', pos: 'SG', jersey: 12,
    score: 58, severity: 'yellow', acr: 1.38, recovery: 67,
    trend: -8, flags: 'Load Spike', riskLevel: 'watch',
    sleep: 6.2, soreness: 6, energy: 6,
    weekHistory: [72, 74, 70, 66, 62, 58],
    color: 'rgba(240,192,64,0.15)', colorText: 'var(--yellow)',
    prs: [],
    insight: '<strong>ACWR 1.38</strong> — approaching danger zone. Reduce today\'s session intensity. Prioritize sleep and hydration before Friday.',
  },
  {
    id: 5, name: 'Marcus Lewis', initials: 'ML', pos: 'C', jersey: 44,
    score: 41, severity: 'red', acr: 1.67, recovery: 52,
    trend: -18, flags: 'Spike + Sleep', riskLevel: 'rest',
    sleep: 5.1, soreness: 8, energy: 4,
    weekHistory: [68, 65, 60, 55, 48, 41],
    color: 'rgba(255,69,96,0.15)', colorText: 'var(--red)',
    prs: [],
    insight: '<strong>REST RECOMMENDED.</strong> ACWR 1.67 with poor sleep and high soreness — 3rd consecutive high-load day. High injury risk before Friday\'s game.',
  },
  {
    id: 6, name: 'Ryan Kim', initials: 'RK', pos: 'SG', jersey: 7,
    score: 0, severity: 'none', acr: null, recovery: null,
    trend: 0, flags: 'Not Logged', riskLevel: 'none',
    sleep: null, soreness: null, energy: null,
    weekHistory: [],
    color: 'rgba(255,255,255,0.06)', colorText: 'var(--text-dim)',
    prs: [],
    insight: 'No data logged today. Send a wellness check-in prompt.',
  },
];

const EVENTS = [
  { name: 'vs. Riverside Academy', detail: 'Fri Mar 3 · 7:00 PM · Home', days: 3, icon: '🏀', type: 'game' },
  { name: 'State Qualifier', detail: 'Tue Mar 7 · 2:00 PM · Away', days: 7, icon: '🏆', type: 'game' },
  { name: 'Film Session + Walk-thru', detail: 'Mon Mar 2 · 3:00 PM · Gym', days: 2, icon: '📹', type: 'practice' },
  { name: 'Team Recovery Day', detail: 'Sun Mar 1 · 10:00 AM · Facility', days: 1, icon: '🌿', type: 'recovery' },
];

const FEED_ITEMS = [
  { icon: '🏃', cls: 'ok',     text: '<strong>Marcus J.</strong> logged Morning Sprint — 6.2 mi · sRPE 7', time: '32 min ago' },
  { icon: '⚠️', cls: 'danger', text: '<strong>System</strong> flagged Tyler W. for elevated ACWR (1.38)', time: '1 hr ago' },
  { icon: '💪', cls: 'accent', text: '<strong>Keisha D.</strong> hit a new PR — Power Clean 165 lbs (+10 lbs)', time: '2 hrs ago' },
  { icon: '🏀', cls: 'orange', text: '<strong>Team Practice</strong> logged by Coach Davis — 14/18 attended', time: 'Yesterday · 5:00 PM' },
  { icon: '🥗', cls: 'ok',     text: '<strong>Darius J.</strong> logged nutrition — 3,100 kcal, 175g protein', time: 'Yesterday · 7:45 PM' },
  { icon: '⛔', cls: 'danger', text: '<strong>Marcus L.</strong> flagged — ACWR 1.67, rest recommended today', time: 'Yesterday · 6:00 PM' },
];

const SESSION_LIBRARY = [
  { type: '🔥 Strength', name: 'TRAP BAR POWER', meta: '50 min · High', color: 'orange' },
  { type: '💨 Speed', name: 'ACCELERATION COMPLEX', meta: '35 min · High', color: 'blue' },
  { type: '🌿 Recovery', name: 'ACTIVE RECOVERY DAY', meta: '25 min · Low', color: 'green' },
  { type: '🏀 Practice', name: 'SKILL MICROBLOCKS', meta: '60 min · Moderate', color: '' },
  { type: '⚡ Power', name: 'PLYOMETRIC CIRCUIT', meta: '40 min · High', color: 'orange' },
  { type: '🧘 Mobility', name: 'PRE-GAME ACTIVATION', meta: '30 min · Low', color: 'green' },
];

const WEEK_LOAD = [
  { day: 'S', load: 45, color: 'var(--surface3)' },
  { day: 'M', load: 65, color: 'var(--accent)', alpha: 0.5 },
  { day: 'T', load: 80, color: 'var(--accent)', alpha: 0.6 },
  { day: 'W', load: 55, color: 'var(--accent)', alpha: 0.5 },
  { day: 'T', load: 90, color: 'var(--yellow)', alpha: 0.7 },
  { day: 'F', load: 100, color: 'var(--red)',    alpha: 0.75 },
  { day: 'S', load: 70, color: 'var(--accent)', alpha: 1 },
];

/* ─── UTILITIES ─── */
function el(id) { return document.getElementById(id); }

function toast(msg, duration = 2800) {
  const c = el('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(6px)';
    t.style.transition = 'all 0.25s ease';
    setTimeout(() => t.remove(), 280);
  }, duration);
}

function getSeverityClass(sev) {
  return { green: 'green', yellow: 'yellow', red: 'red', none: '' }[sev] || '';
}

function getAcrClass(acr) {
  if (acr === null) return '';
  if (acr < 1.3)  return 'safe';
  if (acr <= 1.5) return 'watch';
  return 'danger';
}

function getAcrFlag(acr) {
  if (acr === null) return '—';
  if (acr < 1.3)  return '✅';
  if (acr <= 1.5) return '⚠️';
  return '⛔';
}

function getRingClass(score) {
  if (score >= 75) return '';
  if (score >= 50) return 'warn';
  return 'danger';
}

function getTierLabel(score) {
  if (score >= 85) return { cls: 'great',  label: '⚡ Elite — Peak Form' };
  if (score >= 70) return { cls: 'good',   label: '✓ Strong — Trending Up' };
  if (score >= 50) return { cls: 'warn',   label: '⚠ Moderate — Monitor Load' };
  if (score > 0)   return { cls: 'danger', label: '⛔ High Risk — Rest Recommended' };
  return { cls: '', label: '— Not Logged' };
}

function getScoreNote(a) {
  if (a.score === 0) return 'No sessions logged today. Encourage athlete to check in.';
  if (a.riskLevel === 'rest')  return `<strong>Rest today.</strong> ACWR ${a.acr} — 3+ consecutive high-load days. High injury risk. Prioritize recovery before the game.`;
  if (a.riskLevel === 'watch') return `ACWR ${a.acr} approaching danger zone. Reduce today's intensity and monitor soreness levels closely.`;
  if (a.score >= 85) return `Outstanding form — all four pillars are strong. Sleep at ${a.sleep}h and soreness at ${a.soreness}/10. Maintain momentum into game week.`;
  return `Good baseline with room to improve recovery. Sleep at ${a.sleep}h — pushing to 8h+ could add 5–10 PIQ points before Friday.`;
}

/* ─── RING ANIMATION ─── */
function animateRing(fillEl, score, circumference = 444) {
  const offset = circumference - (score / 100) * circumference;
  // Defer so transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { fillEl.style.strokeDashoffset = offset; });
  });
}

/* ─── PILLAR HELPERS ─── */
function getPillars(a) {
  if (a.score === 0) return [
    { icon:'💪', name:'Load',     value: 0, color:'var(--text-dim)' },
    { icon:'⚡', name:'Streak',   value: 0, color:'var(--text-dim)' },
    { icon:'🎯', name:'Variety',  value: 0, color:'var(--text-dim)' },
    { icon:'🌙', name:'Recovery', value: 0, color:'var(--text-dim)' },
  ];

  // Derive pillar values from available data
  const loadPillar     = Math.min(100, Math.round(a.score * 1.08 + 4));
  const streakPillar   = Math.min(100, Math.round(a.score * 0.95 + 5));
  const varietyPillar  = Math.min(100, Math.round(a.score * 0.88 + 8));
  const recoveryPillar = a.recovery !== null ? a.recovery : Math.round(a.score * 0.72);

  const colorFor = v => v >= 75 ? 'var(--green)' : v >= 50 ? 'var(--yellow)' : 'var(--red)';

  return [
    { icon:'💪', name:'Load',     value: loadPillar,     color: colorFor(loadPillar) },
    { icon:'⚡', name:'Streak',   value: streakPillar,   color: colorFor(streakPillar) },
    { icon:'🎯', name:'Variety',  value: varietyPillar,  color: colorFor(varietyPillar) },
    { icon:'🌙', name:'Recovery', value: recoveryPillar, color: colorFor(recoveryPillar) },
  ];
}

/* ─── RENDER: DASHBOARD ─── */
function renderDashboard() {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  el('dashSub').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()} · ${STATE.teamName}`;

  // Compute stats
  const logged = ATHLETES.filter(a => a.score > 0);
  const ready  = ATHLETES.filter(a => a.severity === 'green').length;
  const monitor= ATHLETES.filter(a => a.severity === 'yellow').length;
  const risk   = ATHLETES.filter(a => a.severity === 'red').length;
  const avg    = logged.length ? Math.round(logged.reduce((s,a) => s+a.score, 0) / logged.length) : 0;

  el('statAvg').textContent     = avg || '—';
  el('statReady').textContent   = ready;
  el('statMonitor').textContent = monitor;
  el('statRisk').textContent    = risk;
  el('statAvgSub').textContent  = avg >= 70 ? `↑ ${avg - 65} pts vs last week` : `↓ Below target`;
  el('statAvgSub').className    = 'stat-sub ' + (avg >= 70 ? 'up' : 'down');
  el('statReadySub').textContent  = `${ready} of ${ATHLETES.length} athletes`;
  el('statMonitorSub').textContent = monitor > 0 ? `↑ Watch load today` : 'All clear';

  // Risk badge in nav
  if (risk + monitor > 0) {
    el('riskBadge').textContent = risk + monitor;
    el('riskBadge').style.display = 'flex';
  }

  // Header chips
  el('chipOnlineText').textContent = `${ATHLETES.length - 1} online`;
  if (risk > 0) {
    el('chipFlags').style.display = 'inline-flex';
    el('chipFlagsText').textContent = `${risk} flag${risk > 1 ? 's' : ''}`;
  }
  el('chipGame').style.display = 'inline-flex';
  el('chipGameText2').textContent = `Game in ${EVENTS[0].days} days`;

  // Sparkline
  const sparkEl = el('sparkAvg');
  sparkEl.innerHTML = '';
  const sparkData = [55, 58, 63, 66, 68, 70, avg];
  sparkData.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'spark-bar' + (i === sparkData.length - 1 ? ' hi' : '');
    bar.style.cssText = `height:${Math.round((v/100)*100)}%;background:var(--accent)`;
    sparkEl.appendChild(bar);
  });

  // Topbar pills
  el('pillOnlineText').textContent = `Team · ${ATHLETES.length - 1} online`;
  el('pillSeason').textContent = STATE.season;
  el('pillGame').style.display = 'inline-flex';
  el('pillGameText').textContent = `Game in ${EVENTS[0].days} days`;

  // Heatmap
  renderHeatmap();

  // Load bars
  renderLoadBars();

  // Alerts
  renderAlerts();

  // Roster mini
  renderRosterMini();

  // Activity feed
  renderFeed();

  // Events
  renderEvents('eventList');

  // Insight
  el('insightText').innerHTML = `When athletes sleep <strong>8+ hours</strong>, team PIQ averages <strong>+11 points higher</strong>. With Friday's game, sleep is this week's #1 performance lever.`;
}

/* ─── RENDER: HEATMAP ─── */
function renderHeatmap() {
  const tbody = el('heatmapBody');
  tbody.innerHTML = ATHLETES.map(a => {
    const avrClass  = getSeverityClass(a.severity);
    const acrClass  = getAcrClass(a.acr);
    const trendSign = a.trend > 0 ? '↑' : a.trend < 0 ? '↓' : '—';
    const trendCls  = a.trend > 0 ? 'up' : a.trend < 0 ? 'down' : '';
    const readPct   = a.recovery || 0;

    const riskHtml = a.riskLevel === 'watch'
      ? `<span class="risk-badge watch">⚠ Watch</span>`
      : a.riskLevel === 'rest'
      ? `<span class="risk-badge rest">⛔ Rest</span>`
      : a.score === 0
      ? `<span class="risk-badge" style="color:var(--text-dim)">Not Logged</span>`
      : `<span class="risk-badge none">—</span>`;

    const scoreHtml = a.score > 0
      ? `<span class="score-badge ${avrClass}">${a.score}</span>`
      : `<span style="color:var(--text-dim);font-family:var(--font-mono)">—</span>`;

    return `
      <tr data-id="${a.id}">
        <td>
          <div class="athlete-cell">
            <div class="athlete-av" style="background:${a.color};color:${a.colorText}">${a.initials}</div>
            <div>
              <div class="athlete-name-text">${a.name}</div>
              <div class="athlete-pos-text">${a.pos} · #${a.jersey}</div>
            </div>
          </div>
        </td>
        <td>${scoreHtml}</td>
        <td>
          <div class="readiness-wrap">
            <div class="readiness-track">
              <div class="readiness-fill" style="width:${readPct}%;background:var(--${a.severity === 'none' ? 'text-dim' : a.severity === 'green' ? 'green' : a.severity === 'yellow' ? 'yellow' : 'red'})"></div>
            </div>
            <div class="readiness-num" style="color:${a.colorText}">${a.recovery ?? '—'}</div>
          </div>
        </td>
        <td><span class="acr-val ${acrClass}">${a.acr ?? '—'}</span></td>
        <td>${riskHtml}</td>
        <td>
          <span class="trend-val ${trendCls}">${trendSign}${Math.abs(a.trend)}</span>
        </td>
      </tr>`;
  }).join('');

  // Row click → athlete detail
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => {
      const a = ATHLETES.find(x => x.id === +row.dataset.id);
      if (a) openAthleteDetail(a);
    });
  });
}

/* ─── RENDER: LOAD BARS ─── */
function renderLoadBars() {
  const wrap = el('loadBarList');
  const athletes = ATHLETES.filter(a => a.acr !== null);
  wrap.innerHTML = athletes.map(a => {
    const pct   = Math.min(100, Math.round((a.acr / 2.0) * 100));
    const cls   = getAcrClass(a.acr);
    const color = cls === 'safe' ? 'var(--green)' : cls === 'watch' ? 'var(--yellow)' : 'var(--red)';
    return `
      <div class="load-bar-item">
        <div class="load-bar-name">${a.name.split(' ')[0]} ${a.name.split(' ')[1]?.[0]}.</div>
        <div class="load-bar-track"><div class="load-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="load-bar-val" style="color:${color}">${a.acr}</div>
        <div class="load-bar-flag">${getAcrFlag(a.acr)}</div>
      </div>`;
  }).join('');
}

/* ─── RENDER: ALERTS ─── */
function renderAlerts() {
  const wrap = el('alertsList');
  const alerts = [];

  ATHLETES.filter(a => a.riskLevel === 'rest').forEach(a => {
    alerts.push({ cls: 'danger', icon: '⛔', title: `${a.name} — Rest Today`, body: `ACWR ${a.acr} — 3rd consecutive high-load day. High injury risk before Friday.` });
  });
  ATHLETES.filter(a => a.riskLevel === 'watch').forEach(a => {
    alerts.push({ cls: 'warn', icon: '⚠', title: `${a.name} — Monitor Load`, body: `ACWR ${a.acr} — approaching danger zone. Reduce intensity today.` });
  });
  ATHLETES.filter(a => a.score === 0).forEach(a => {
    alerts.push({ cls: 'info', icon: '📊', title: `${a.name} — Not Logged`, body: 'No data submitted today. Send a wellness check-in prompt.' });
  });

  if (alerts.length === 0) {
    wrap.innerHTML = `<div class="alert ok"><div class="alert-icon">✅</div><div><div class="alert-title">All Clear</div><div>No risk flags today. Team load is well managed.</div></div></div>`;
    return;
  }

  wrap.innerHTML = alerts.map(al => `
    <div class="alert ${al.cls}">
      <div class="alert-icon">${al.icon}</div>
      <div><div class="alert-title">${al.title}</div><div>${al.body}</div></div>
    </div>`).join('');
}

/* ─── RENDER: ROSTER MINI ─── */
function renderRosterMini() {
  const wrap = el('rosterMini');
  wrap.innerHTML = ATHLETES.slice(0,5).map(a => {
    const readPct = a.recovery || 0;
    const color   = a.severity === 'green' ? 'var(--green)' : a.severity === 'yellow' ? 'var(--yellow)' : a.severity === 'red' ? 'var(--red)' : 'var(--text-dim)';
    return `
      <div class="roster-row" data-id="${a.id}">
        <div class="athlete-av" style="background:${a.color};color:${a.colorText};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${a.initials}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${a.name}</div>
          <div style="font-size:11px;color:var(--text-dim)">${a.pos} · #${a.jersey}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          <div class="readiness-track" style="width:56px"><div class="readiness-fill" style="width:${readPct}%;background:${color}"></div></div>
          <div class="readiness-num" style="color:${color};font-size:11px">${a.score || '—'}</div>
        </div>
      </div>`;
  }).join('');

  wrap.querySelectorAll('.roster-row').forEach(r => {
    r.addEventListener('click', () => {
      const a = ATHLETES.find(x => x.id === +r.dataset.id);
      if (a) openAthleteDetail(a);
    });
  });
}

/* ─── RENDER: FEED ─── */
function renderFeed() {
  el('activityFeed').innerHTML = FEED_ITEMS.map(f => `
    <div class="feed-item">
      <div class="feed-icon ${f.cls}">${f.icon}</div>
      <div>
        <div class="feed-text">${f.text}</div>
        <div class="feed-time">${f.time}</div>
      </div>
    </div>`).join('');
}

/* ─── RENDER: EVENTS ─── */
function renderEvents(containerId) {
  const wrap = el(containerId);
  if (!wrap) return;
  wrap.innerHTML = EVENTS.map(ev => `
    <div class="event-item">
      <div style="text-align:center;min-width:36px">
        <div class="event-days-num ${ev.days <= 3 ? 'soon' : ''}">${ev.days}</div>
        <div class="event-days-label">days</div>
      </div>
      <div>
        <div class="event-name">${ev.name}</div>
        <div class="event-detail">${ev.detail}</div>
      </div>
      <div style="font-size:17px;margin-left:auto">${ev.icon}</div>
    </div>`).join('');
}

/* ─── RENDER: ATHLETES VIEW ─── */
function renderAthletesView(filter = '') {
  const grid = el('athleteCardGrid');
  const filtered = ATHLETES.filter(a =>
    a.name.toLowerCase().includes(filter.toLowerCase()) ||
    a.pos.toLowerCase().includes(filter.toLowerCase())
  );

  el('athleteCountSub').textContent = `${ATHLETES.length} athletes on roster`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim)">No athletes match "${filter}"</div>`;
    return;
  }

  const tier = getTierLabel;
  grid.innerHTML = filtered.map(a => {
    const t = tier(a.score);
    const color = a.severity === 'green' ? 'var(--green)' : a.severity === 'yellow' ? 'var(--yellow)' : a.severity === 'red' ? 'var(--red)' : 'var(--text-dim)';
    return `
      <div class="card" style="cursor:pointer;transition:transform 0.18s,border-color 0.18s" data-id="${a.id}"
        onmouseenter="this.style.transform='translateY(-2px)'"
        onmouseleave="this.style.transform=''"
      >
        <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="athlete-av" style="background:${a.color};color:${a.colorText};width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:14px;font-weight:700;flex-shrink:0">${a.initials}</div>
            <div>
              <div style="font-weight:700;font-size:14px">${a.name}</div>
              <div style="font-size:12px;color:var(--text-dim)">${a.pos} · #${a.jersey} · ${STATE.sport}</div>
            </div>
            <div style="margin-left:auto;font-family:var(--font-display);font-size:28px;font-weight:800;color:${color}">${a.score || '—'}</div>
          </div>
          <div>
            <div class="readiness-track" style="width:100%;height:6px;margin-bottom:8px"><div class="readiness-fill" style="width:${a.recovery||0}%;background:${color}"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:12px">
              <div class="score-tier ${t.cls}" style="font-size:11px">${t.label}</div>
              <div style="color:var(--text-dim)">ACWR: <span style="color:${color}">${a.acr ?? '—'}</span></div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const a = ATHLETES.find(x => x.id === +card.dataset.id);
      if (a) openAthleteDetail(a);
    });
  });
}

/* ─── ATHLETE DETAIL ─── */
function openAthleteDetail(a) {
  // Switch to athletes view if not there
  switchView('athletes');

  STATE.selectedAthlete = a;
  el('athleteCardGrid').style.display = 'none';
  const detail = el('athleteDetail');
  detail.style.display = 'flex';

  // Hero
  const t = getTierLabel(a.score);
  const color = a.severity === 'green' ? 'var(--green)' : a.severity === 'yellow' ? 'var(--yellow)' : a.severity === 'red' ? 'var(--red)' : 'var(--text-dim)';
  el('detailHero').innerHTML = `
    <div class="athlete-hero-av" style="background:${a.color};color:${a.colorText}">${a.initials}</div>
    <div style="flex:1">
      <div class="athlete-hero-name">${a.name}</div>
      <div class="athlete-hero-meta">${a.pos} · Jersey #${a.jersey} · ${STATE.teamName}</div>
      <div class="athlete-chips">
        <div class="athlete-chip sport">🏀 ${STATE.sport.charAt(0).toUpperCase()+STATE.sport.slice(1)}</div>
        <div class="athlete-chip ${a.riskLevel === 'rest' ? 'status" style="background:var(--red-dim);border-color:var(--red-border);color:var(--red)' : 'status'}">
          ${a.riskLevel === 'rest' ? '⛔ Rest Day' : a.riskLevel === 'watch' ? '⚠ Monitor' : a.score > 0 ? '✓ Active' : '⚪ Not Logged'}
        </div>
        ${a.riskLevel === 'none' && a.score > 0 ? '<div class="athlete-chip" style="background:var(--accent-dim);border-color:var(--accent-border);color:var(--accent)">🔥 ' + (3 + a.id) + '-day streak</div>' : ''}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
      <div style="font-family:var(--font-display);font-size:44px;font-weight:800;color:${color}">${a.score || '—'}</div>
      <div class="score-tier ${t.cls}" style="font-size:11px">${t.label}</div>
    </div>`;

  // Ring
  const ringFill = el('detailRingFill');
  const ringCls  = getRingClass(a.score);
  ringFill.className = 'ring-fill' + (ringCls ? ` ${ringCls}` : '');
  el('detailRingNum').textContent = a.score || '—';
  el('detailRingNum').className   = 'ring-number' + (ringCls ? ` ${ringCls}` : '');

  const deltaEl = el('detailRingDelta');
  if (a.trend !== 0) {
    deltaEl.className   = 'ring-delta ' + (a.trend > 0 ? 'up' : 'down');
    deltaEl.textContent = (a.trend > 0 ? '↑' : '↓') + ' ' + Math.abs(a.trend) + ' pts';
  } else { deltaEl.textContent = ''; }

  animateRing(ringFill, a.score, 440);

  // Tier + note
  el('detailTier').className   = 'score-tier ' + t.cls;
  el('detailTier').textContent  = t.label;
  el('detailScoreNote').innerHTML = getScoreNote(a);

  // Pillars
  const pillars = getPillars(a);
  el('detailPillars').innerHTML = pillars.map(p => `
    <div class="pillar">
      <div class="pillar-icon">${p.icon}</div>
      <div class="pillar-value" style="color:${p.color}">${p.value}</div>
      <div class="pillar-bar"><div class="pillar-fill" style="width:${p.value}%;background:${p.color}"></div></div>
      <div class="pillar-name">${p.name}</div>
    </div>`).join('');

  // Wellness
  const wellnessData = [
    { emoji:'😴', label:'Sleep',    value: a.sleep    !== null ? `${a.sleep}h` : '—', color: a.sleep >= 7.5 ? 'var(--green)' : a.sleep >= 6 ? 'var(--yellow)' : 'var(--red)' },
    { emoji:'💢', label:'Soreness', value: a.soreness !== null ? `${a.soreness}/10` : '—', color: a.soreness <= 3 ? 'var(--green)' : a.soreness <= 6 ? 'var(--yellow)' : 'var(--red)' },
    { emoji:'⚡', label:'Energy',   value: a.energy   !== null ? `${a.energy}/10` : '—', color: a.energy >= 7 ? 'var(--green)' : a.energy >= 4 ? 'var(--yellow)' : 'var(--red)' },
  ];
  el('detailWellness').innerHTML = wellnessData.map(w => `
    <div class="wellness-item">
      <div class="wellness-emoji">${w.emoji}</div>
      <div class="wellness-label">${w.label}</div>
      <div class="wellness-value" style="color:${w.color}">${w.value}</div>
    </div>`).join('');

  // Load bar
  if (a.acr !== null) {
    const acrCls = getAcrClass(a.acr);
    const acrColor = acrCls === 'safe' ? 'var(--green)' : acrCls === 'watch' ? 'var(--yellow)' : 'var(--red)';
    const pct = Math.min(100, Math.round((a.acr / 2.0) * 100));
    el('detailLoad').innerHTML = `
      <div class="load-bar-item">
        <div class="load-bar-name">ACWR</div>
        <div class="load-bar-track"><div class="load-bar-fill" style="width:${pct}%;background:${acrColor}"></div></div>
        <div class="load-bar-val" style="color:${acrColor}">${a.acr}</div>
        <div class="load-bar-flag">${getAcrFlag(a.acr)}</div>
      </div>`;
  } else {
    el('detailLoad').innerHTML = `<div style="font-size:13px;color:var(--text-dim)">No load data available.</div>`;
  }

  // Insight
  el('detailInsight').innerHTML = a.insight;

  // Workout
  renderDetailWorkout(a);

  // PRs
  const prTable = el('detailPRs').querySelector('tbody');
  if (a.prs.length) {
    prTable.innerHTML = a.prs.map(pr => `
      <tr>
        <td>${pr.exercise}</td>
        <td class="pr-new">${pr.current}</td>
        <td style="color:var(--text-dim)">${pr.prev}</td>
        <td style="color:var(--text-dim)">${pr.date}</td>
      </tr>`).join('');
  } else {
    prTable.innerHTML = `<tr><td colspan="4" style="color:var(--text-dim);text-align:center;padding:20px">No PRs logged yet</td></tr>`;
  }
}

function renderDetailWorkout(a) {
  const sport = STATE.sport;
  const blocked = a.riskLevel === 'rest';
  const wrap = el('detailWorkout');

  if (blocked) {
    wrap.innerHTML = `
      <div class="alert danger">
        <div class="alert-icon">⛔</div>
        <div>
          <div class="alert-title">Rest Day — No Session Assigned</div>
          <div>ACWR too high. Today's prescription is full rest: light walking, foam rolling, and 9+ hours of sleep.</div>
        </div>
      </div>`;
    return;
  }

  const type    = a.riskLevel === 'watch' ? 'recovery' : 'practice';
  const session = generateSession(sport, type, 60, 'moderate', []);
  wrap.innerHTML = buildWorkoutCardHTML(session);
}

/* ─── RENDER: TRAIN VIEW ─── */
function renderTrainView() {
  // Session library
  const lib = el('sessionLibrary');
  lib.innerHTML = SESSION_LIBRARY.map(s => `
    <div class="workout-card ${s.color}" style="cursor:pointer">
      <div class="workout-type-tag" style="${s.color === 'orange' ? 'color:var(--orange)' : s.color === 'blue' ? 'color:var(--blue)' : s.color === 'green' ? 'color:var(--green)' : ''}">${s.type}</div>
      <div class="workout-name">${s.name}</div>
      <div class="workout-meta"><span>${s.meta}</span></div>
    </div>`).join('');
}

/* ─── SESSION GENERATOR ─── */
function generateSession(sport, type, duration, intensity, injuries) {
  const sportEmoji = { basketball:'🏀', football:'🏈', soccer:'⚽', baseball:'⚾', volleyball:'🏐', track:'🏃' };
  const typeLabel  = { practice:'Practice', strength:'Strength', speed:'Speed', conditioning:'Conditioning', recovery:'Recovery', competition:'Competition Prep' };
  const intLabel   = { low:'Low', moderate:'Moderate', high:'High' };

  const injNote = injuries.length ? ` · ${injuries.map(i => i.charAt(0).toUpperCase()+i.slice(1)+'-friendly').join(', ')}` : '';

  const blockSets = {
    practice: [
      { dot:'var(--blue)',   name:'Dynamic Warm-up',                   time: Math.round(duration * 0.16) },
      { dot:'var(--accent)', name:'Skill Microblocks — Sport-specific', time: Math.round(duration * 0.25) },
      { dot:'var(--orange)', name:'Strength Block' + (injuries.includes('knee') ? ' (knee-friendly)' : ''), time: Math.round(duration * 0.28) },
      { dot:'var(--yellow)', name:'Power & Conditioning',              time: Math.round(duration * 0.18) },
      { dot:'var(--green)',  name:'Cool-down + Mobility',              time: Math.round(duration * 0.13) },
    ],
    strength: [
      { dot:'var(--blue)',   name:'Warm-up + Movement Prep',           time: Math.round(duration * 0.14) },
      { dot:'var(--orange)', name:'Main Lift — Primary Pattern',       time: Math.round(duration * 0.32) },
      { dot:'var(--accent)', name:'Accessory Work — Volume Build',     time: Math.round(duration * 0.28) },
      { dot:'var(--yellow)', name:'Core & Stability',                  time: Math.round(duration * 0.16) },
      { dot:'var(--green)',  name:'Stretch + Recovery Protocol',       time: Math.round(duration * 0.10) },
    ],
    speed: [
      { dot:'var(--blue)',   name:'Neural Warm-up',                    time: Math.round(duration * 0.18) },
      { dot:'var(--accent)', name:'Acceleration Mechanics × 6 sets',  time: Math.round(duration * 0.30) },
      { dot:'var(--orange)', name:'Max Velocity Runs',                 time: Math.round(duration * 0.25) },
      { dot:'var(--yellow)', name:'Change of Direction Drills',        time: Math.round(duration * 0.17) },
      { dot:'var(--green)',  name:'Cool-down + PNF Stretch',           time: Math.round(duration * 0.10) },
    ],
    recovery: [
      { dot:'var(--blue)',   name:'Light Cardio — Zone 1',             time: Math.round(duration * 0.30) },
      { dot:'var(--green)',  name:'Mobility Flow',                     time: Math.round(duration * 0.30) },
      { dot:'var(--accent)', name:'Foam Rolling + Soft Tissue',        time: Math.round(duration * 0.25) },
      { dot:'var(--yellow)', name:'Breathing + Parasympathetic Reset', time: Math.round(duration * 0.15) },
    ],
    conditioning: [
      { dot:'var(--blue)',   name:'Dynamic Warm-up',                   time: Math.round(duration * 0.15) },
      { dot:'var(--orange)', name:'Aerobic Base Work — Steady State',  time: Math.round(duration * 0.30) },
      { dot:'var(--accent)', name:'Interval Circuits × 4 rounds',     time: Math.round(duration * 0.30) },
      { dot:'var(--yellow)', name:'Lactate Tolerance Drills',          time: Math.round(duration * 0.15) },
      { dot:'var(--green)',  name:'Cool-down',                         time: Math.round(duration * 0.10) },
    ],
    competition: [
      { dot:'var(--blue)',   name:'Pre-Game Activation',               time: Math.round(duration * 0.22) },
      { dot:'var(--accent)', name:'Plyometric Priming × 3 sets',      time: Math.round(duration * 0.25) },
      { dot:'var(--orange)', name:'Sport-Specific Movement Prep',      time: Math.round(duration * 0.28) },
      { dot:'var(--green)',  name:'Mental Cue + Team Walk-through',    time: Math.round(duration * 0.25) },
    ],
  };

  const blocks = blockSets[type] || blockSets['practice'];

  return {
    sport, type, duration, intensity,
    typeTag: `${sportEmoji[sport] || '🏀'} ${typeLabel[type] || 'Practice'} · ${intLabel[intensity] || 'Moderate'}${injNote}`,
    name: type === 'recovery' ? 'ACTIVE RECOVERY SESSION'
        : type === 'strength' ? 'STRENGTH & POWER BLOCK'
        : type === 'speed'    ? 'SPEED & ACCELERATION'
        : type === 'competition' ? 'COMPETITION PREP'
        : type === 'conditioning' ? 'CONDITIONING CIRCUIT'
        : 'FULL PRACTICE SESSION',
    meta: [`⏱ ${duration} min`, `🔥 ${intLabel[intensity]}`, `${sportEmoji[sport] || '🏀'} ${sport.charAt(0).toUpperCase()+sport.slice(1)}`].join(' · '),
    blocks,
  };
}

function buildWorkoutCardHTML(session) {
  const blocksHtml = session.blocks.map(b => `
    <div class="block-item">
      <div class="block-dot" style="background:${b.dot}"></div>
      <div class="block-name">${b.name}</div>
      <div class="block-time">${b.time} min</div>
    </div>`).join('');

  return `
    <div class="workout-card">
      <div class="workout-type-tag">${session.typeTag}</div>
      <div class="workout-name">${session.name}</div>
      <div class="workout-meta">${session.meta}</div>
      <div class="block-list">${blocksHtml}</div>
      <div style="display:flex;gap:9px;margin-top:14px">
        <button class="btn btn-primary btn-full" style="font-size:13px">▷ Start Session</button>
        <button class="btn btn-ghost" style="font-size:13px" id="btnSaveSession">Save</button>
      </div>
    </div>`;
}

function renderGeneratedSession() {
  const sport     = el('buildSport').value;
  const type      = el('buildType').value;
  const duration  = +el('buildDuration').value;
  const intensity = el('buildIntensity').value;
  const injuries  = [...document.querySelectorAll('#injuryChips .inj-chip.active')].map(c => c.dataset.injury);

  const session = generateSession(sport, type, duration, intensity, injuries);
  el('generatedSessionWrap').innerHTML = buildWorkoutCardHTML(session);
  el('sessionSaved').style.display = 'none';

  // Save button
  const saveBtn = el('btnSaveSession');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      el('sessionSaved').style.display = 'inline-flex';
      toast('Session saved to library ✓');
    });
  }

  toast('Session generated ⚡');
}

/* ─── RENDER: ANALYTICS ─── */
function renderAnalytics() {
  el('analyticsSub').textContent = `${STATE.teamName} · ${STATE.season}`;

  // Stat grid
  const logged = ATHLETES.filter(a => a.score > 0);
  const avg    = logged.length ? Math.round(logged.reduce((s,a) => s+a.score, 0) / logged.length) : 0;
  const logRate = Math.round((logged.length / ATHLETES.length) * 100);

  el('analyticsStatGrid').innerHTML = `
    <div class="stat-card accent">
      <div class="stat-label">Team Avg PIQ</div>
      <div class="stat-value">${avg}</div>
      <div class="stat-sub up">↑ 4.2 pts this week</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Logging Rate</div>
      <div class="stat-value">${logRate}%</div>
      <div class="stat-sub up">${logged.length} / ${ATHLETES.length} athletes</div>
    </div>
    <div class="stat-card yellow">
      <div class="stat-label">Avg Readiness</div>
      <div class="stat-value">72%</div>
      <div class="stat-sub down">↓ 5% vs last week</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Risk Flags</div>
      <div class="stat-value">${ATHLETES.filter(a => a.riskLevel === 'rest' || a.riskLevel === 'watch').length}</div>
      <div class="stat-sub">This week</div>
    </div>`;

  // Load chart
  const chart = el('loadChart');
  chart.innerHTML = WEEK_LOAD.map(d => {
    const alpha  = d.alpha !== undefined ? d.alpha : 1;
    const style  = `height:${d.load}%;background:${d.color};opacity:${alpha}`;
    return `<div class="chart-bar-wrap"><div class="chart-bar" style="${style}"></div><div class="chart-bar-lbl">${d.day}</div></div>`;
  }).join('');

  // Score distribution
  const dist = el('scoreDistChart');
  const ranges = [
    { label:'80–100', count: ATHLETES.filter(a => a.score >= 80).length, color:'var(--green)' },
    { label:'60–79',  count: ATHLETES.filter(a => a.score >= 60 && a.score < 80).length, color:'var(--accent)' },
    { label:'40–59',  count: ATHLETES.filter(a => a.score >= 40 && a.score < 60).length, color:'var(--yellow)' },
    { label:'1–39',   count: ATHLETES.filter(a => a.score > 0  && a.score < 40).length, color:'var(--red)' },
    { label:'N/A',    count: ATHLETES.filter(a => a.score === 0).length,                 color:'var(--surface4)' },
  ];
  const maxCount = Math.max(...ranges.map(r => r.count), 1);
  dist.innerHTML = ranges.map(r => {
    const h = Math.max(8, Math.round((r.count / maxCount) * 100));
    return `<div class="chart-bar-wrap"><div class="chart-bar" style="height:${h}%;background:${r.color}"></div><div class="chart-bar-lbl">${r.label}</div></div>`;
  }).join('');

  el('scoreRanges').innerHTML = ranges.map(r => `
    <div style="display:flex;align-items:center;gap:9px;font-size:13px">
      <div style="width:10px;height:10px;border-radius:2px;background:${r.color};flex-shrink:0"></div>
      <div style="flex:1">${r.label}</div>
      <div style="font-family:var(--font-mono);font-weight:600">${r.count} athletes</div>
    </div>`).join('');

  // Analytics table
  const tbody = el('analyticsBody');
  tbody.innerHTML = ATHLETES.filter(a => a.score > 0).map(a => {
    const hist  = a.weekHistory;
    const w4    = hist[1] || '—';
    const w3    = hist[2] || '—';
    const w2    = hist[4] || '—';
    const now   = a.score;
    const delta = a.trend;
    const cls   = delta >= 0 ? 'up' : 'down';
    const acrCls = getAcrClass(a.acr);
    return `
      <tr>
        <td>
          <div class="athlete-cell">
            <div class="athlete-av" style="background:${a.color};color:${a.colorText};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${a.initials}</div>
            <div class="athlete-name-text">${a.name}</div>
          </div>
        </td>
        <td style="font-family:var(--font-mono);color:var(--text-dim)">${w4}</td>
        <td style="font-family:var(--font-mono);color:var(--text-dim)">${w3}</td>
        <td style="font-family:var(--font-mono);color:var(--text-dim)">${w2}</td>
        <td><span class="score-badge ${getSeverityClass(a.severity)}">${now}</span></td>
        <td><span class="trend-val ${cls}">${delta >= 0 ? '↑' : '↓'}${Math.abs(delta)}</span></td>
        <td><span class="acr-val ${acrCls}">${a.acr}</span></td>
      </tr>`;
  }).join('');
}

/* ─── RENDER: SCHEDULE ─── */
function renderSchedule() {
  renderEvents('fullEventList');
}

/* ─── ROUTER ─── */
function switchView(viewId) {
  if (STATE.currentView === viewId) return;
  STATE.currentView = viewId;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const viewEl = el('view-' + viewId);
  const navEl  = document.querySelector(`[data-view="${viewId}"]`);
  if (viewEl) viewEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  // Trigger view renders
  if (viewId === 'athletes') {
    renderAthletesView();
    el('athleteCardGrid').style.display = '';
    el('athleteDetail').style.display = 'none';
  }
  if (viewId === 'analytics') renderAnalytics();
  if (viewId === 'train')     renderTrainView();
  if (viewId === 'schedule')  renderSchedule();
}

document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

/* ─── SEARCH ─── */
el('athleteSearch').addEventListener('input', (e) => {
  if (STATE.currentView !== 'athletes') switchView('athletes');
  renderAthletesView(e.target.value);
});
el('athleteFilterInput').addEventListener('input', (e) => {
  renderAthletesView(e.target.value);
});

/* ─── ATHLETE DETAIL BACK ─── */
el('backToList').addEventListener('click', () => {
  el('athleteDetail').style.display = 'none';
  el('athleteCardGrid').style.display = '';
  renderAthletesView();
});
el('viewAllAthletes').addEventListener('click', () => switchView('athletes'));
el('rosterMore').addEventListener('click', () => switchView('athletes'));

/* ─── TRAIN CONTROLS ─── */
el('btnGenerate').addEventListener('click', renderGeneratedSession);
el('btnGenerateInline').addEventListener('click', renderGeneratedSession);
el('btnPushToday').addEventListener('click', () => toast('Session pushed to Today ✓'));

document.querySelectorAll('#injuryChips .inj-chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('active'));
});

/* ─── REFRESH ─── */
el('btnRefresh').addEventListener('click', () => {
  renderDashboard();
  toast('Data refreshed ↺');
});

/* ─── EXPORT ─── */
el('btnExport').addEventListener('click', () => toast('Preparing report export… (Cloud sync required)'));
el('btnExportAnalytics').addEventListener('click', () => toast('PDF export coming in next phase 📄'));

/* ─── SETTINGS ─── */
el('btnSaveSettings').addEventListener('click', () => {
  STATE.teamName = el('settingTeamName').value;
  STATE.season   = el('settingSeason').value;
  STATE.sport    = el('settingSport').value.toLowerCase();
  renderDashboard();
  toast('Settings saved ✓');
});
el('btnExportData').addEventListener('click', () => {
  const data = JSON.stringify({ athletes: ATHLETES, state: STATE }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = 'performanceiq-backup.json'; a.click();
  URL.revokeObjectURL(url);
  toast('Export downloaded ✓');
});
el('btnResetData').addEventListener('click', () => {
  if (confirm('Reset to demo data? This cannot be undone.')) {
    renderDashboard();
    toast('Reset to demo data ↺');
  }
});

/* ─── ONBOARDING ─── */
let obStep = 1;
let obSelectedRole  = 'coach';
let obSelectedSport = 'basketball';

document.querySelectorAll('#roleGrid .role-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#roleGrid .role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    obSelectedRole = card.dataset.role;
  });
});

document.querySelectorAll('#sportGrid .sport-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#sportGrid .sport-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
    obSelectedSport = chip.dataset.sport;
  });
});

document.querySelectorAll('#obInjuryChips .inj-chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('active'));
});

function setObStep(step) {
  obStep = step;
  document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
  el(`obStep${step}`).classList.add('active');
  el('obProgress').style.width = `${Math.round((step / 3) * 100)}%`;
}

el('obNext1').addEventListener('click', () => setObStep(2));
el('obNext2').addEventListener('click', () => {
  // Generate first session preview
  const session = generateSession(obSelectedSport, 'practice', 60, 'moderate', []);
  el('obFirstSession').innerHTML = buildWorkoutCardHTML(session);
  // Remove action buttons inside modal
  const btns = el('obFirstSession').querySelectorAll('button');
  btns.forEach(b => b.style.display = 'none');
  setObStep(3);
});
el('obBack2').addEventListener('click', () => setObStep(1));
el('obBack3').addEventListener('click', () => setObStep(2));

el('obSkip').addEventListener('click', () => {
  el('onboardingModal').style.display = 'none';
  STATE.onboarded = true;
  toast('Welcome to PerformanceIQ ⚡');
});

el('obFinish').addEventListener('click', () => {
  STATE.role    = obSelectedRole;
  STATE.sport   = obSelectedSport;
  STATE.onboarded = true;
  el('onboardingModal').style.display = 'none';
  renderDashboard();
  toast('Welcome to PerformanceIQ ⚡');
});

/* ─── INIT ─── */
function init() {
  // Show onboarding if first visit
  const seen = localStorage.getItem('piq_onboarded');
  if (!seen) {
    el('onboardingModal').style.display = 'flex';
  }

  renderDashboard();
}

init();
