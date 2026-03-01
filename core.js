/* ================================================================
   PerformanceIQ — core.js  v5.2  Elite UI Pass
   Added:
   - Smart sport palettes + auto accent/contrast
   - Animated tab transitions + indicator glide
   - Ripple + spring micro-interactions
   - Animated score number tween
   - Interactive Today workflow tour (no audio; caption illusion)
   ================================================================ */
'use strict';

/* ─── STORAGE KEYS ─── */
const STORAGE_KEY_ONBOARDED = 'piq_onboarded_v2';
const STORAGE_KEY_STATE     = 'piq_state_v2';
const STORAGE_KEY_ATHLETES  = 'piq_athletes_v2';
const STORAGE_KEY_TOUR      = 'piq_tour_today_v1';

/* ─── STATE ─── */
const STATE = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY_STATE) || 'null');
    return Object.assign({ role:'coach', sport:'basketball', injuries:[],
      teamName:'Westview Varsity Basketball', season:'Pre-Season',
      currentView:'dashboard', selectedAthleteId: null }, s || {});
  } catch {
    return { role:'coach', sport:'basketball', injuries:[],
      teamName:'Westview Varsity Basketball', season:'Pre-Season',
      currentView:'dashboard', selectedAthleteId: null };
  }
})();

function saveState() {
  try {
    const { selectedAthleteId: _x, ...toSave } = STATE;
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(toSave));
  } catch {}
}

/* ─── DEFAULT ATHLETES ─── */
const DEFAULT_ATHLETES = [
  { id:1, name:'Marcus Johnson', initials:'MJ', pos:'PG', jersey:3,
    score:92, severity:'green', acr:1.04, recovery:94, trend:+7, riskLevel:'none',
    sleep:8.2, soreness:2, energy:9,
    weekHistory:[65,71,78,82,86,88,92],
    color:'rgba(46,204,113,0.15)', colorText:'var(--green)',
    prs:[{exercise:'Back Squat',current:'295 lbs',prev:'280 lbs',date:'Feb 20'},
         {exercise:'Bench Press',current:'225 lbs',prev:'215 lbs',date:'Feb 14'},
         {exercise:'40yd Dash',current:'4.52s',prev:'4.61s',date:'Feb 18'}],
    insight:'Sleep averaging <strong>8.2 hours</strong> — your top recovery pillar. Maintain this heading into game week.' },
  { id:2, name:'Keisha Davis', initials:'KD', pos:'SF', jersey:21,
    score:85, severity:'green', acr:1.09, recovery:88, trend:+4, riskLevel:'none',
    sleep:7.8, soreness:3, energy:8,
    weekHistory:[62,68,72,76,80,82,85],
    color:'rgba(0,212,170,0.15)', colorText:'var(--accent)',
    prs:[{exercise:'Power Clean',current:'165 lbs',prev:'155 lbs',date:'Feb 22'},
         {exercise:'Vertical Jump',current:'28"',prev:'26"',date:'Feb 10'}],
    insight:'Variety pillar at 90 — most diverse training profile on the team. One more strength block this week would round out the score.' },
  { id:3, name:'Darius Jones', initials:'DJ', pos:'PF', jersey:5,
    score:78, severity:'green', acr:0.92, recovery:82, trend:+2, riskLevel:'none',
    sleep:7.5, soreness:4, energy:7,
    weekHistory:[60,64,68,70,73,76,78],
    color:'rgba(74,158,255,0.15)', colorText:'var(--blue)',
    prs:[{exercise:'Romanian DL',current:'315 lbs',prev:'295 lbs',date:'Feb 19'}],
    insight:'ACWR at 0.92 — slightly undertrained vs chronic baseline. One additional volume session this week would be optimal.' },
  { id:4, name:'Tyler Williams', initials:'TW', pos:'SG', jersey:12,
    score:58, severity:'yellow', acr:1.38, recovery:67, trend:-8, riskLevel:'watch',
    sleep:6.2, soreness:6, energy:6,
    weekHistory:[74,72,70,68,65,62,58],
    color:'rgba(240,192,64,0.15)', colorText:'var(--yellow)',
    prs:[],
    insight:'<strong>ACWR 1.38</strong> — approaching danger zone. Reduce today\'s intensity and monitor soreness. Prioritize sleep before Friday\'s game.' },
  { id:5, name:'Marcus Lewis', initials:'ML', pos:'C', jersey:44,
    score:41, severity:'red', acr:1.67, recovery:52, trend:-18, riskLevel:'rest',
    sleep:5.1, soreness:8, energy:4,
    weekHistory:[70,66,62,57,51,46,41],
    color:'rgba(255,69,96,0.15)', colorText:'var(--red)',
    prs:[],
    insight:'<strong>REST RECOMMENDED.</strong> ACWR 1.67 with poor sleep (5.1h) and high soreness — 3rd consecutive high-load day. High injury risk ahead of Friday.' },
  { id:6, name:'Ryan Kim', initials:'RK', pos:'SG', jersey:7,
    score:0, severity:'none', acr:null, recovery:null, trend:0, riskLevel:'none',
    sleep:null, soreness:null, energy:null,
    weekHistory:[],
    color:'rgba(255,255,255,0.06)', colorText:'var(--text-dim)',
    prs:[],
    insight:'No wellness data logged today. Send athlete a check-in prompt to unlock their score.' },
];

let ATHLETES = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY_ATHLETES) || 'null');
    return Array.isArray(s) && s.length ? s : DEFAULT_ATHLETES.map(a => ({...a}));
  } catch { return DEFAULT_ATHLETES.map(a => ({...a})); }
})();

function saveAthletes() { try { localStorage.setItem(STORAGE_KEY_ATHLETES, JSON.stringify(ATHLETES)); } catch {} }

/* ─── DEMO DATA ─── */
const EVENTS = [
  { name:'vs. Riverside Academy',    detail:'Fri Mar 3 · 7:00 PM · Home',     days:3, icon:'🏀' },
  { name:'State Qualifier',          detail:'Tue Mar 7 · 2:00 PM · Away',      days:7, icon:'🏆' },
  { name:'Film Session + Walk-thru', detail:'Mon Mar 2 · 3:00 PM · Gym',       days:2, icon:'📹' },
  { name:'Team Recovery Day',        detail:'Sun Mar 1 · 10:00 AM · Facility', days:1, icon:'🌿' },
];

const FEED_ITEMS = [
  { icon:'🏃', cls:'ok',     text:'<strong>Marcus J.</strong> logged Morning Sprint — 6.2 mi · sRPE 7',        time:'32 min ago'          },
  { icon:'⚠️', cls:'danger', text:'<strong>System</strong> flagged Tyler W. for elevated ACWR (1.38)',          time:'1 hr ago'            },
  { icon:'💪', cls:'accent', text:'<strong>Keisha D.</strong> hit a new PR — Power Clean 165 lbs (+10 lbs)',    time:'2 hrs ago'           },
  { icon:'🏀', cls:'orange', text:'<strong>Team Practice</strong> logged by Coach Davis — 14/18 attended',       time:'Yesterday · 5:00 PM' },
  { icon:'🥗', cls:'ok',     text:'<strong>Darius J.</strong> logged nutrition — 3,100 kcal · 175g protein',   time:'Yesterday · 7:45 PM' },
  { icon:'⛔', cls:'danger', text:'<strong>Marcus L.</strong> flagged — ACWR 1.67, rest recommended today',     time:'Yesterday · 6:00 PM' },
];

const SESSION_LIBRARY = [
  { type:'🔥 Strength', name:'TRAP BAR POWER',       meta:'50 min · High',     color:'orange' },
  { type:'💨 Speed',    name:'ACCELERATION COMPLEX',  meta:'35 min · High',     color:'blue'   },
  { type:'🌿 Recovery', name:'ACTIVE RECOVERY DAY',   meta:'25 min · Low',      color:'green'  },
  { type:'🏀 Practice', name:'SKILL MICROBLOCKS',     meta:'60 min · Moderate', color:''       },
  { type:'⚡ Power',    name:'PLYOMETRIC CIRCUIT',    meta:'40 min · High',     color:'orange' },
  { type:'🧘 Mobility', name:'PRE-GAME ACTIVATION',  meta:'30 min · Low',      color:'green'  },
];

const WEEK_LOAD = [
  { day:'S', au:320 }, { day:'M', au:580 }, { day:'T', au:740 },
  { day:'W', au:460 }, { day:'T', au:890 }, { day:'F', au:980 },
  { day:'S', au:620 },
];

/* ─── DOM UTILS ─── */
const el = id => document.getElementById(id);
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
const pct = (t, f) => Math.round(t * f);

function toast(msg, ms = 2800) {
  const c = el('toastContainer') || el('toastContainer'.toLowerCase()) || el('toastcontainer') || el('toastContainer'.replace('C','c'));
  const host = c || (() => {
    // fallback: create toast container if markup missing
    const div = document.createElement('div');
    div.id = 'toastContainer';
    document.body.appendChild(div);
    return div;
  })();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .25s,transform .25s';
    t.style.opacity = '0'; t.style.transform = 'translateY(6px)';
    setTimeout(() => t.remove(), 280);
  }, ms);
}

/* ─── SPORT THEMES (smart auto-adjust) ─── */
const SPORT_PALETTES = {
  basketball: { accent:'#00d4aa', blue:'#4a9eff', orange:'#ff6b2b' },
  football:   { accent:'#7CFF57', blue:'#3B82F6', orange:'#F59E0B' },
  soccer:     { accent:'#22C55E', blue:'#60A5FA', orange:'#FB7185' },
  baseball:   { accent:'#EF4444', blue:'#3B82F6', orange:'#F97316' },
  volleyball: { accent:'#A855F7', blue:'#4a9eff', orange:'#F59E0B' },
  track:      { accent:'#F59E0B', blue:'#22C55E', orange:'#EF4444' },
};

function _hexToRgb(hex){
  const h = (hex||'').replace('#','').trim();
  if (h.length !== 6) return null;
  const n = parseInt(h,16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function _rgba(hex, a){
  const rgb = _hexToRgb(hex); if(!rgb) return `rgba(0,212,170,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}
function setCSSVar(name, val){
  try { document.documentElement.style.setProperty(name, val); } catch {}
}
function applySportTheme(sport){
  const key = (sport||'basketball').toLowerCase();
  const pal = SPORT_PALETTES[key] || SPORT_PALETTES.basketball;
  setCSSVar('--accent', pal.accent);
  setCSSVar('--accent-2', _rgba(pal.accent, .16));
  setCSSVar('--accent-dim', _rgba(pal.accent, .11));
  setCSSVar('--accent-border', _rgba(pal.accent, .22));
  setCSSVar('--accent-glow', _rgba(pal.accent, .30));

  if (pal.blue)   setCSSVar('--blue', pal.blue),   setCSSVar('--blue-dim', _rgba(pal.blue,.12)),   setCSSVar('--blue-border', _rgba(pal.blue,.25));
  if (pal.orange) setCSSVar('--orange', pal.orange), setCSSVar('--orange-dim', _rgba(pal.orange,.12)), setCSSVar('--orange-border', _rgba(pal.orange,.28));
}

/* ─── MICRO-INTERACTIONS (ripple + spring) ─── */
function addRipple(ev, target){
  const r = document.createElement('span');
  r.className = 'ripple';
  const rect = target.getBoundingClientRect();
  r.style.left = (ev.clientX - rect.left) + 'px';
  r.style.top  = (ev.clientY - rect.top) + 'px';
  target.appendChild(r);
  setTimeout(() => r.remove(), 700);
}
function springPress(target){
  try{
    target.animate(
      [{ transform:'scale(1)' },{ transform:'scale(.985)' },{ transform:'scale(1)' }],
      { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  } catch {}
}
document.addEventListener('pointerdown', (e) => {
  const t = e.target && e.target.closest && e.target.closest('.btn,.iconbtn,.icon-btn,.navbtn,.nav-btn,.tab,.tab-btn,.fab');
  if (!t) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  springPress(t);
  addRipple(e, t);
}, { passive:true });

/* ─── TAB INDICATOR GLIDE ─── */
let _tabIndicator = null;
function ensureTabIndicator(){
  if (_tabIndicator && _tabIndicator.isConnected) return _tabIndicator;
  const navHost = document.querySelector('.nav') || document.querySelector('.sidebar') || document.querySelector('.bottomnav');
  if (!navHost) return null;
  navHost.style.position = navHost.style.position || 'relative';
  const ind = document.createElement('div');
  ind.className = 'tab-indicator';
  navHost.appendChild(ind);
  _tabIndicator = ind;
  return ind;
}
function moveIndicatorTo(btn){
  const ind = ensureTabIndicator();
  if (!ind || !btn) return;
  const host = ind.parentElement;
  const b = btn.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  const left = b.left - h.left + (btn.offsetWidth ? 0 : 0);
  const width = Math.max(26, b.width * 0.55);
  const x = left + (b.width - width) / 2;
  ind.style.width = width + 'px';
  ind.style.transform = `translate3d(${Math.round(x)}px,0,0)`;
  ind.classList.add('on');
}

/* ─── SCORE ANIMATION (number tween) ─── */
function tweenNumber(node, to, ms=700){
  if (!node) return;
  const from = parseInt((node.textContent||'0').replace(/[^\d]/g,''),10) || 0;
  const end = Math.max(0, Math.min(100, to||0));
  const start = performance.now();
  function tick(now){
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const val = Math.round(from + (end - from) * eased);
    node.textContent = String(val);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ─── HELPERS (risk colors) ─── */
function getSevClass(sev){ return {green:'green',yellow:'yellow',red:'red'}[sev] || ''; }
function getSevColor(sev){ return {green:'var(--green)',yellow:'var(--yellow)',red:'var(--red)'}[sev] || 'var(--text-dim)'; }
function getAcrClass(acr){
  if (acr == null) return '';
  return acr < 1.3 ? 'safe' : acr <= 1.5 ? 'watch' : 'danger';
}
function getAcrColor(acr){
  const c = getAcrClass(acr);
  return c === 'safe' ? 'var(--green)' : c === 'watch' ? 'var(--yellow)' : c === 'danger' ? 'var(--red)' : 'var(--text-dim)';
}
function getAcrFlag(acr){
  if (acr == null) return '—';
  return acr < 1.3 ? '✅' : acr <= 1.5 ? '⚠️' : '⛔';
}
function getRingClass(s){ return !s ? 'danger' : s >= 75 ? '' : s >= 50 ? 'warn' : 'danger'; }
function getTier(score){
  if (score >= 85) return { cls:'great',  label:'⚡ Elite — Peak Form'             };
  if (score >= 70) return { cls:'good',   label:'✓ Strong — Trending Up'           };
  if (score >= 50) return { cls:'warn',   label:'⚠ Moderate — Monitor Load'       };
  if (score > 0)   return { cls:'danger', label:'⛔ High Risk — Rest Recommended' };
  return { cls:'', label:'— Not Logged' };
}
function getScoreNote(a){
  if (!a.score) return 'No sessions logged today. Encourage athlete to submit a wellness check-in.';
  if (a.riskLevel === 'rest')  return `<strong>Rest today.</strong> ACWR ${a.acr} — 3+ consecutive high-load days. High injury risk before Friday. Full rest only.`;
  if (a.riskLevel === 'watch') return `ACWR ${a.acr} approaching danger zone. Reduce intensity today and monitor soreness closely.`;
  if (a.score >= 85) return `Outstanding form — all four pillars strong. Sleep ${a.sleep}h, soreness ${a.soreness}/10. Maintain momentum into game week.`;
  return `Good baseline. Sleep at ${a.sleep}h — pushing to 8h+ could add 5–10 PIQ points before Friday's game.`;
}
function animateRing(fillEl, score, circ = 440){
  if (!fillEl) return;
  fillEl.style.strokeDashoffset = circ;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fillEl.style.strokeDashoffset = circ - Math.max(0, Math.min(score, 100)) / 100 * circ;
  }));
}
function buildSparkline(id, values, color){
  const wrap = el(id); if (!wrap) return;
  const max = Math.max(...values, 1);
  wrap.innerHTML = values.map((v,i)=>
    `<div class="spark-bar${i===values.length-1?' hi':''}" style="height:${Math.round(v/max*100)}%;background:${color}"></div>`
  ).join('');
}

/* ══════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════ */
function renderDashboard(){
  const now = new Date();
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  el('dashSub') && (el('dashSub').textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()} · ${STATE.teamName}`);

  const logged  = ATHLETES.filter(a => a.score > 0);
  const ready   = ATHLETES.filter(a => a.severity === 'green').length;
  const monitor = ATHLETES.filter(a => a.severity === 'yellow').length;
  const risk    = ATHLETES.filter(a => a.severity === 'red').length;
  const avg     = logged.length ? Math.round(logged.reduce((s,a) => s+a.score, 0) / logged.length) : 0;
  const BASE    = 65;

  if (el('statAvg')) { el('statAvg').textContent = avg || '—'; if (avg) tweenNumber(el('statAvg'), avg, 520); }
  el('statReady') && (el('statReady').textContent = ready);
  el('statMonitor') && (el('statMonitor').textContent = monitor);
  el('statRisk') && (el('statRisk').textContent = risk);

  if (el('statAvgSub')) {
    el('statAvgSub').className = 'stat-sub ' + (avg >= BASE ? 'up' : 'down');
    el('statAvgSub').textContent = avg ? (avg >= BASE ? `↑ ${avg-BASE} pts vs last week` : `↓ ${BASE-avg} pts vs last week`) : '—';
  }
  el('statReadySub') && (el('statReadySub').textContent = `${ready} of ${ATHLETES.length} athletes`);
  el('statMonitorSub') && (el('statMonitorSub').textContent = monitor > 0 ? `↑ Check load today` : 'All clear');

  const badge = el('riskBadge');
  const flags = risk + monitor;
  if (badge) { badge.textContent = flags; badge.style.display = flags > 0 ? 'flex' : 'none'; }

  el('chipOnlineText') && (el('chipOnlineText').textContent = `${ATHLETES.length - 1} online`);
  if (el('chipFlags')) el('chipFlags').style.display = risk > 0 ? 'inline-flex' : 'none';
  el('chipFlagsText') && (el('chipFlagsText').textContent = `${risk} flag${risk !== 1 ? 's' : ''}`);
  if (el('chipGame')) el('chipGame').style.display = 'inline-flex';
  el('chipGameText2') && (el('chipGameText2').textContent = `Game in ${EVENTS[0].days}d`);

  el('pillOnlineText') && (el('pillOnlineText').textContent = `Team · ${ATHLETES.length - 1} online`);
  el('pillSeason') && (el('pillSeason').textContent = STATE.season);
  if (el('pillGame')) el('pillGame').style.display = 'inline-flex';
  el('pillGameText') && (el('pillGameText').textContent = `Game in ${EVENTS[0].days} days`);

  buildSparkline('sparkAvg', [55,58,63,66,68,70,avg], 'var(--accent)');

  renderHeatmap();
  renderLoadBars();
  renderAlerts();
  renderRosterMini();
  renderFeed();
  renderEvents('eventList');

  if (el('insightText')) {
    el('insightText').innerHTML = `When athletes sleep <strong>8+ hours</strong>, team PIQ averages <strong>+11 points higher</strong>. With Friday's game, sleep is this week's #1 performance lever. <div class="caption-illusion">Tip: tap an athlete row to open the detail view instantly.</div>`;
  }
}

function renderHeatmap(){
  if (!el('heatmapBody')) return;
  el('heatmapBody').innerHTML = ATHLETES.map(a => {
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
      <td><div class="athlete-cell">
        <div class="athlete-av" style="background:${a.color};color:${a.colorText};width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${a.initials}</div>
        <div><div class="athlete-name-text">${a.name}</div><div class="athlete-pos-text">${a.pos} · #${a.jersey}</div></div>
      </div></td>
      <td>${scoreHtml}</td>
      <td><div class="readiness-wrap">
        <div class="readiness-track"><div class="readiness-fill" style="width:${readPct}%;background:${sevColor}"></div></div>
        <div class="readiness-num" style="color:${a.colorText}">${a.recovery ?? '—'}</div>
      </div></td>
      <td><span class="acr-val ${acrCls}">${a.acr ?? '—'}</span></td>
      <td>${riskHtml}</td>
      <td><span class="trend-val ${a.trend>0?'up':a.trend<0?'down':''}">${a.trend>0?'↑':a.trend<0?'↓':'—'}${Math.abs(a.trend)}</span></td>
    </tr>`;
  }).join('');
  el('heatmapBody').querySelectorAll('tr[data-id]').forEach(row =>
    row.addEventListener('click', () => {
      const a = ATHLETES.find(x => x.id === +row.dataset.id);
      if (a) openAthleteDetail(a);
    })
  );
}

function renderLoadBars(){
  if (!el('loadBarList')) return;
  el('loadBarList').innerHTML = ATHLETES.filter(a => a.acr != null).map(a => {
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
  if (!el('alertsList')) return;
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
  el('alertsList').innerHTML = alerts.length
    ? alerts.map(al => `<div class="alert ${al.cls}">
        <div class="alert-icon">${al.icon}</div>
        <div><div class="alert-title">${al.title}</div><div>${al.body}</div></div>
      </div>`).join('')
    : `<div class="alert ok"><div class="alert-icon">✅</div>
        <div><div class="alert-title">All Clear</div><div>No risk flags today. Team load is well managed.</div></div>
      </div>`;
}

function renderRosterMini(){
  const wrap = el('rosterMini'); if (!wrap) return;
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
  wrap.querySelectorAll('.roster-row').forEach(r =>
    r.addEventListener('click', () => {
      const a = ATHLETES.find(x => x.id === +r.dataset.id);
      if (a) openAthleteDetail(a);
    })
  );
}

function renderFeed(){
  if (!el('activityFeed')) return;
  el('activityFeed').innerHTML = FEED_ITEMS.map(f => `
    <div class="feed-item">
      <div class="feed-icon ${f.cls}">${f.icon}</div>
      <div><div class="feed-text">${f.text}</div><div class="feed-time">${f.time}</div></div>
    </div>`).join('');
}

function renderEvents(id){
  const wrap = el(id); if (!wrap) return;
  wrap.innerHTML = EVENTS.map(ev => `
    <div class="event-item">
      <div style="text-align:center;min-width:36px">
        <div class="event-days-num ${ev.days<=3?'soon':''}">${ev.days}</div>
        <div class="event-days-label">days</div>
      </div>
      <div><div class="event-name">${ev.name}</div><div class="event-detail">${ev.detail}</div></div>
      <div style="font-size:17px;margin-left:auto">${ev.icon}</div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════
   ATHLETES VIEW
══════════════════════════════════════════════ */
function renderAthletesView(filter = ''){
  const filtered = filter
    ? ATHLETES.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()) || a.pos.toLowerCase().includes(filter.toLowerCase()))
    : ATHLETES;
  el('athleteCountSub') && (el('athleteCountSub').textContent = `${ATHLETES.length} athletes on roster`);
  const grid = el('athleteCardGrid');
  if (!grid) return;
  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text-dim)">No athletes match "<em>${filter}</em>"</div>`;
    return;
  }
  grid.innerHTML = filtered.map(a => {
    const t = getTier(a.score);
    const color = getSevColor(a.severity);
    return `<div class="card" data-id="${a.id}" style="cursor:pointer" tabindex="0" role="button" aria-label="View ${a.name}">
      <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${a.color};color:${a.colorText};font-family:var(--font-display);font-size:14px;font-weight:700">${a.initials}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</div>
            <div style="font-size:12px;color:var(--text-dim)">${a.pos} · #${a.jersey}</div>
          </div>
          <div style="font-family:var(--font-display);font-size:28px;font-weight:800;color:${color};flex-shrink:0">${a.score||'—'}</div>
        </div>
        <div>
          <div class="readiness-track" style="width:100%;height:6px;margin-bottom:8px"><div class="readiness-fill" style="width:${a.recovery||0}%;background:${color}"></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
            <div class="score-tier ${t.cls}" style="font-size:11px">${t.label}</div>
            <div style="color:var(--text-dim)">ACWR: <span style="color:${color};font-weight:600">${a.acr??'—'}</span></div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-id]').forEach(card => {
    const open = () => { const a = ATHLETES.find(x => x.id === +card.dataset.id); if (a) openAthleteDetail(a); };
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

function getPillars(a){
  if (!a.score) return [
    {icon:'💪',name:'Load',     value:0, color:'var(--text-dim)'},
    {icon:'⚡',name:'Streak',   value:0, color:'var(--text-dim)'},
    {icon:'🎯',name:'Variety',  value:0, color:'var(--text-dim)'},
    {icon:'🌙',name:'Recovery', value:0, color:'var(--text-dim)'},
  ];
  const cf = v => v >= 75 ? 'var(--green)' : v >= 50 ? 'var(--yellow)' : 'var(--red)';
  const load     = Math.min(100, Math.round(a.score * 1.08 + 4));
  const streak   = Math.min(100, Math.round(a.score * 0.95 + 5));
  const variety  = Math.min(100, Math.round(a.score * 0.88 + 8));
  const recovery = a.recovery != null ? a.recovery : Math.round(a.score * 0.72);
  return [
    {icon:'💪', name:'Load',     value:load,     color:cf(load)    },
    {icon:'⚡', name:'Streak',   value:streak,   color:cf(streak)  },
    {icon:'🎯', name:'Variety',  value:variety,  color:cf(variety) },
    {icon:'🌙', name:'Recovery', value:recovery, color:cf(recovery)},
  ];
}

function openAthleteDetail(a){
  if (STATE.currentView !== 'athletes') {
    _applyViewDom('athletes');
    STATE.currentView = 'athletes';
  }
  STATE.selectedAthleteId = a.id;
  el('athleteCardGrid') && (el('athleteCardGrid').style.display = 'none');
  el('athleteDetail') && (el('athleteDetail').style.display  = 'flex');

  const t = getTier(a.score);
  const color = getSevColor(a.severity);

  if (el('detailHero')) el('detailHero').innerHTML = `
    <div style="width:64px;height:64px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${a.color};color:${a.colorText};font-family:var(--font-display);font-size:22px;font-weight:800;border:2px solid var(--accent-border)">${a.initials}</div>
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--font-display);font-size:26px;font-weight:800">${a.name}</div>
      <div style="font-size:13px;color:var(--text-dim);margin-top:3px">${a.pos} · Jersey #${a.jersey} · ${STATE.teamName}</div>
      <div class="athlete-chips" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        <div class="athlete-chip sport">🏀 ${cap(STATE.sport)}</div>
        <div class="athlete-chip" ${a.riskLevel==='rest'?'style="background:var(--red-dim);border-color:var(--red-border);color:var(--red)"':a.riskLevel==='watch'?'style="background:var(--yellow-dim);border-color:var(--yellow-border);color:var(--yellow)"':''}>
          ${a.riskLevel==='rest'?'⛔ Rest Day':a.riskLevel==='watch'?'⚠ Monitor':a.score?'✓ Active':'⚪ Not Logged'}
        </div>
        ${(a.riskLevel==='none'&&a.score)?`<div class="athlete-chip" style="background:var(--accent-dim);border-color:var(--accent-border);color:var(--accent)">🔥 ${3+a.id}-day streak</div>`:''}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">
      <div id="detailHeroScore" style="font-family:var(--font-display);font-size:44px;font-weight:800;line-height:1;color:${color}">${a.score||'—'}</div>
      <div class="score-tier ${t.cls}" style="font-size:11px">${t.label}</div>
    </div>`;

  // Ring
  const rf = el('detailRingFill');
  const rc = getRingClass(a.score);
  if (rf) rf.className = 'ring-fill' + (rc ? ' '+rc : '');
  if (el('detailRingNum')) {
    el('detailRingNum').textContent = a.score || '—';
    el('detailRingNum').className   = 'ring-number' + (rc ? ' '+rc : '');
    if (a.score) tweenNumber(el('detailRingNum'), a.score, 900);
  }
  const de = el('detailRingDelta');
  if (de) {
    if (a.trend) {
      de.className = 'ring-delta ' + (a.trend > 0 ? 'up' : 'down');
      de.textContent = (a.trend > 0 ? '↑' : '↓') + ' ' + Math.abs(a.trend) + ' pts';
    } else de.textContent = '';
  }
  animateRing(rf, a.score, 440);

  // Tier + note
  if (el('detailTier')) { el('detailTier').className = 'score-tier ' + t.cls; el('detailTier').textContent = t.label; }
  el('detailScoreNote') && (el('detailScoreNote').innerHTML = getScoreNote(a));

  // Pillars
  if (el('detailPillars')) el('detailPillars').innerHTML = getPillars(a).map(p => `
    <div class="pillar">
      <div class="pillar-icon">${p.icon}</div>
      <div class="pillar-value" style="color:${p.color}">${p.value}</div>
      <div class="pillar-bar"><div class="pillar-fill" style="width:${p.value}%;background:${p.color}"></div></div>
      <div class="pillar-name">${p.name}</div>
    </div>`).join('');

  // Wellness
  const wItems = [
    { emoji:'😴', label:'Sleep',    v:a.sleep,
      display: a.sleep    != null ? `${a.sleep}h`        : '—',
      color:   a.sleep    == null ? 'var(--text-dim)' : a.sleep    >= 7.5 ? 'var(--green)' : a.sleep    >= 6 ? 'var(--yellow)' : 'var(--red)' },
    { emoji:'💢', label:'Soreness', v:a.soreness,
      display: a.soreness != null ? `${a.soreness}/10`   : '—',
      color:   a.soreness == null ? 'var(--text-dim)' : a.soreness <=  3 ? 'var(--green)' : a.soreness <= 6 ? 'var(--yellow)' : 'var(--red)' },
    { emoji:'⚡', label:'Energy',   v:a.energy,
      display: a.energy   != null ? `${a.energy}/10`     : '—',
      color:   a.energy   == null ? 'var(--text-dim)' : a.energy   >=  7 ? 'var(--green)' : a.energy   >= 4 ? 'var(--yellow)' : 'var(--red)' },
  ];
  if (el('detailWellness')) el('detailWellness').innerHTML = wItems.map(w => `
    <div class="wellness-item">
      <div class="wellness-emoji">${w.emoji}</div>
      <div class="wellness-label">${w.label}</div>
      <div class="wellness-value" style="color:${w.color}">${w.display}</div>
    </div>`).join('');

  // Load bar
  if (el('detailLoad')) el('detailLoad').innerHTML = a.acr != null
    ? `<div class="load-bar-item">
        <div class="load-bar-name">ACWR</div>
        <div class="load-bar-track"><div class="load-bar-fill" style="width:${Math.min(100,Math.round(a.acr/2*100))}%;background:${getAcrColor(a.acr)}"></div></div>
        <div class="load-bar-val" style="color:${getAcrColor(a.acr)}">${a.acr}</div>
        <div class="load-bar-flag">${getAcrFlag(a.acr)}</div>
      </div>`
    : `<div style="font-size:13px;color:var(--text-dim)">No load data available.</div>`;

  el('detailInsight') && (el('detailInsight').innerHTML = a.insight);
  renderDetailWorkout(a);

  // PRs
  const prTable = el('detailPRs');
  const prTbody = prTable ? prTable.querySelector('tbody') : null;
  if (prTbody) {
    prTbody.innerHTML = a.prs.length
      ? a.prs.map(pr => `<tr>
          <td>${pr.exercise}</td><td class="pr-new">${pr.current}</td>
          <td style="color:var(--text-dim)">${pr.prev}</td>
          <td style="color:var(--text-dim)">${pr.date}</td>
        </tr>`).join('')
      : `<tr><td colspan="4" style="color:var(--text-dim);text-align:center;padding:20px">No PRs logged yet</td></tr>`;
  }

  // Hero score tween
  if (el('detailHeroScore') && a.score) tweenNumber(el('detailHeroScore'), a.score, 750);
}

function renderDetailWorkout(a){
  const wrap = el('detailWorkout'); if (!wrap) return;
  if (a.riskLevel === 'rest') {
    wrap.innerHTML = `<div class="alert danger">
      <div class="alert-icon">⛔</div>
      <div><div class="alert-title">Rest Day — No Session Assigned</div>
      <div>ACWR too high. Full rest prescription: light walking, foam rolling, and 9+ hours of sleep.</div></div>
    </div>`;
    return;
  }
  const session = generateSession(STATE.sport, a.riskLevel==='watch'?'recovery':'practice', 60, 'moderate', []);
  wrap.innerHTML = buildWorkoutCardHTML(session, false);
}

/* ══════════════════════════════════════════════
   TRAIN VIEW
══════════════════════════════════════════════ */
function renderTrainView(){
  if (!el('sessionLibrary')) return;
  el('sessionLibrary').innerHTML = SESSION_LIBRARY.map(s => {
    const ac = s.color==='orange'?'var(--orange)':s.color==='blue'?'var(--blue)':s.color==='green'?'var(--green)':'var(--accent)';
    return `<div class="workout-card ${s.color}" style="cursor:pointer">
      <div class="workout-type-tag" style="color:${ac}">${s.type}</div>
      <div class="workout-name">${s.name}</div>
      <div class="workout-meta"><span>${s.meta}</span></div>
    </div>`;
  }).join('');
}

function generateSession(sport, type, duration, intensity, injuries){
  const SE = {basketball:'🏀',football:'🏈',soccer:'⚽',baseball:'⚾',volleyball:'🏐',track:'🏃'};
  const TL = {practice:'Practice',strength:'Strength',speed:'Speed',conditioning:'Conditioning',recovery:'Recovery',competition:'Competition Prep'};
  const IL = {low:'Low',moderate:'Moderate',high:'High'};
  const inj = injuries.length ? ' · ' + injuries.map(i=>cap(i)+'-friendly').join(', ') : '';
  const BLOCKS = {
    practice:[
      {dot:'var(--blue)',   name:'Dynamic Warm-up',                                                              time:pct(duration,.16)},
      {dot:'var(--accent)', name:'Skill Microblocks — Sport-specific',                                           time:pct(duration,.25)},
      {dot:'var(--orange)', name:'Strength Block'+(injuries.includes('knee')?' (knee-friendly)':''),             time:pct(duration,.28)},
      {dot:'var(--yellow)', name:'Power & Conditioning',                                                          time:pct(duration,.18)},
      {dot:'var(--green)',  name:'Cool-down + Mobility',                                                          time:pct(duration,.13)},
    ],
    strength:[
      {dot:'var(--blue)',   name:'Warm-up + Movement Prep',       time:pct(duration,.14)},
      {dot:'var(--orange)', name:'Main Lift — Primary Pattern',   time:pct(duration,.32)},
      {dot:'var(--accent)', name:'Accessory Work — Volume Build', time:pct(duration,.28)},
      {dot:'var(--yellow)', name:'Core & Stability',              time:pct(duration,.16)},
      {dot:'var(--green)',  name:'Stretch + Recovery Protocol',   time:pct(duration,.10)},
    ],
    speed:[
      {dot:'var(--blue)',   name:'Neural Warm-up',                   time:pct(duration,.18)},
      {dot:'var(--accent)', name:'Acceleration Mechanics × 6 sets',  time:pct(duration,.30)},
      {dot:'var(--orange)', name:'Max Velocity Runs',                 time:pct(duration,.25)},
      {dot:'var(--yellow)', name:'Change of Direction Drills',        time:pct(duration,.17)},
      {dot:'var(--green)',  name:'Cool-down + PNF Stretch',           time:pct(duration,.10)},
    ],
    recovery:[
      {dot:'var(--blue)',   name:'Light Cardio — Zone 1',             time:pct(duration,.30)},
      {dot:'var(--green)',  name:'Mobility Flow',                     time:pct(duration,.30)},
      {dot:'var(--accent)', name:'Foam Rolling + Soft Tissue',        time:pct(duration,.25)},
      {dot:'var(--yellow)', name:'Breathing + Parasympathetic Reset', time:pct(duration,.15)},
    ],
    conditioning:[
      {dot:'var(--blue)',   name:'Dynamic Warm-up',               time:pct(duration,.15)},
      {dot:'var(--orange)', name:'Aerobic Base — Steady State',   time:pct(duration,.30)},
      {dot:'var(--accent)', name:'Interval Circuits × 4 rounds', time:pct(duration,.30)},
      {dot:'var(--yellow)', name:'Lactate Tolerance Drills',      time:pct(duration,.15)},
      {dot:'var(--green)',  name:'Cool-down',                     time:pct(duration,.10)},
    ],
    competition:[
      {dot:'var(--blue)',   name:'Pre-Game Activation',             time:pct(duration,.22)},
      {dot:'var(--accent)', name:'Plyometric Priming × 3 sets',    time:pct(duration,.25)},
      {dot:'var(--orange)', name:'Sport-Specific Movement Prep',   time:pct(duration,.28)},
      {dot:'var(--green)',  name:'Mental Cue + Team Walk-through', time:pct(duration,.25)},
    ],
  };
  return {
    sport, type, duration, intensity,
    typeTag:`${SE[sport]||'🏀'} ${TL[type]||'Practice'} · ${IL[intensity]||'Moderate'}${inj}`,
    name: type==='recovery'?'ACTIVE RECOVERY SESSION':type==='strength'?'STRENGTH & POWER BLOCK':
          type==='speed'?'SPEED & ACCELERATION':type==='competition'?'COMPETITION PREP':
          type==='conditioning'?'CONDITIONING CIRCUIT':'FULL PRACTICE SESSION',
    meta:[`⏱ ${duration} min`,`🔥 ${IL[intensity]}`,`${SE[sport]||'🏀'} ${cap(sport)}`].join(' · '),
    blocks: BLOCKS[type] || BLOCKS.practice,
  };
}

function buildWorkoutCardHTML(session, showActions = true){
  const blocks = session.blocks.map(b =>
    `<div class="block-item">
      <div class="block-dot" style="background:${b.dot}"></div>
      <div class="block-name">${b.name}</div>
      <div class="block-time">${b.time} min</div>
    </div>`).join('');
  const actions = showActions ? `<div style="display:flex;gap:9px;margin-top:14px">
    <button class="btn btn-primary btn-full js-start" style="font-size:13px">▷ Start Session</button>
    <button class="btn btn-ghost js-save" style="font-size:13px">Save</button>
  </div>` : '';
  return `<div class="workout-card">
    <div class="workout-type-tag">${session.typeTag}</div>
    <div class="workout-name">${session.name}</div>
    <div class="workout-meta">${session.meta}</div>
    <div class="block-list">${blocks}</div>
    ${actions}
  </div>`;
}

function renderGeneratedSession(){
  const sport = el('buildSport')?.value;
  const type = el('buildType')?.value;
  const duration = +el('buildDuration')?.value;
  const intensity = el('buildIntensity')?.value;
  const injuries = [...document.querySelectorAll('#injuryChips .inj-chip.active')].map(c => c.dataset.injury);
  const session = generateSession(sport, type, duration, intensity, injuries);
  const wrap = el('generatedSessionWrap'); if (!wrap) return;
  wrap.innerHTML = buildWorkoutCardHTML(session, true);
  el('sessionSaved') && (el('sessionSaved').style.display = 'none');
  wrap.querySelector('.js-save')?.addEventListener('click', () => {
    el('sessionSaved') && (el('sessionSaved').style.display = 'inline-flex');
    toast('Session saved to library ✓');
  });
  wrap.querySelector('.js-start')?.addEventListener('click', () => toast('Session started ▷'));
  toast('Session generated ⚡');
}

/* ══════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════ */
function renderAnalytics(){
  el('analyticsSub') && (el('analyticsSub').textContent = `${STATE.teamName} · ${STATE.season}`);
  const logged = ATHLETES.filter(a => a.score > 0);
  const avg = logged.length ? Math.round(logged.reduce((s,a) => s+a.score,0)/logged.length) : 0;
  const logRate = Math.round(logged.length / ATHLETES.length * 100);
  const BASE = 65;

  const grid = el('analyticsStatGrid');
  if (grid) grid.innerHTML = `
    <div class="stat-card accent">
      <div class="stat-label">Team Avg PIQ</div><div class="stat-value">${avg}</div>
      <div class="stat-sub up">↑ ${Math.max(0,avg-BASE)} pts this week</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Logging Rate</div><div class="stat-value">${logRate}%</div>
      <div class="stat-sub up">${logged.length} / ${ATHLETES.length} athletes</div>
    </div>
    <div class="stat-card yellow">
      <div class="stat-label">Avg Readiness</div><div class="stat-value">72%</div>
      <div class="stat-sub down">↓ 5% vs last week</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Risk Flags</div>
      <div class="stat-value">${ATHLETES.filter(a=>a.riskLevel==='rest'||a.riskLevel==='watch').length}</div>
      <div class="stat-sub">This week</div>
    </div>`;

  const maxAU = Math.max(...WEEK_LOAD.map(d => d.au));
  if (el('loadChart')) el('loadChart').innerHTML = WEEK_LOAD.map(d => {
    const h = Math.max(4, Math.round(d.au/maxAU*100));
    const color = d.au >= 900 ? 'var(--red)' : d.au >= 700 ? 'var(--yellow)' : 'var(--accent)';
    const alpha = (0.55 + 0.45*(d.au/maxAU)).toFixed(2);
    return `<div class="chart-bar-wrap" title="${d.au} AU">
      <div class="chart-bar" style="height:${h}%;background:${color};opacity:${alpha}"></div>
      <div class="chart-bar-lbl">${d.day}</div>
    </div>`;
  }).join('');

  const ranges = [
    {label:'80–100', count:ATHLETES.filter(a=>a.score>=80).length,              color:'var(--green)'  },
    {label:'60–79',  count:ATHLETES.filter(a=>a.score>=60&&a.score<80).length,  color:'var(--accent)' },
    {label:'40–59',  count:ATHLETES.filter(a=>a.score>=40&&a.score<60).length,  color:'var(--yellow)' },
    {label:'1–39',   count:ATHLETES.filter(a=>a.score>0&&a.score<40).length,    color:'var(--red)'    },
    {label:'N/A',    count:ATHLETES.filter(a=>a.score===0).length,              color:'var(--surface4)'},
  ];
  const maxC = Math.max(...ranges.map(r=>r.count), 1);
  if (el('scoreDistChart')) el('scoreDistChart').innerHTML = ranges.map(r =>
    `<div class="chart-bar-wrap" title="${r.count} athletes">
      <div class="chart-bar" style="height:${Math.max(6,Math.round(r.count/maxC*100))}%;background:${r.color}"></div>
      <div class="chart-bar-lbl">${r.label}</div>
    </div>`).join('');
  if (el('scoreRanges')) el('scoreRanges').innerHTML = ranges.map(r => `
    <div style="display:flex;align-items:center;gap:9px;font-size:13px">
      <div style="width:10px;height:10px;border-radius:2px;background:${r.color};flex-shrink:0"></div>
      <div style="flex:1">${r.label}</div>
      <div style="font-family:var(--font-mono);font-weight:600">${r.count} athlete${r.count!==1?'s':''}</div>
    </div>`).join('');

  if (el('analyticsBody')) el('analyticsBody').innerHTML = ATHLETES.filter(a => a.score > 0).map(a => {
    const h = a.weekHistory;
    const acrCls = getAcrClass(a.acr);
    return `<tr>
      <td><div class="athlete-cell">
        <div style="width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${a.color};color:${a.colorText};font-size:11px;font-weight:700">${a.initials}</div>
        <div class="athlete-name-text">${a.name}</div>
      </div></td>
      <td style="font-family:var(--font-mono);color:var(--text-dim)">${h[0]??'—'}</td>
      <td style="font-family:var(--font-mono);color:var(--text-dim)">${h[2]??'—'}</td>
      <td style="font-family:var(--font-mono);color:var(--text-dim)">${h[4]??'—'}</td>
      <td><span class="score-badge ${getSevClass(a.severity)}">${a.score}</span></td>
      <td><span class="trend-val ${a.trend>=0?'up':'down'}">${a.trend>=0?'↑':'↓'}${Math.abs(a.trend)}</span></td>
      <td><span class="acr-val ${acrCls}">${a.acr??'—'}</span></td>
    </tr>`;
  }).join('');
}

function renderSchedule(){ renderEvents('fullEventList'); }

/* ══════════════════════════════════════════════
   ROUTER (animated view transitions)
══════════════════════════════════════════════ */
function _applyViewDom(viewId){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active','enter'));
  document.querySelectorAll('.nav-btn,.navbtn,[data-view]').forEach(b => b.classList.remove('active'));
  const vEl = el('view-' + viewId);
  const nEl = document.querySelector(`[data-view="${viewId}"]`);
  if (vEl) { vEl.classList.add('active','enter'); setTimeout(()=>vEl.classList.remove('enter'), 380); }
  if (nEl) nEl.classList.add('active');
  moveIndicatorTo(nEl);
}

function switchView(viewId){
  const prev = STATE.currentView;

  if (prev === 'athletes' && viewId !== 'athletes') {
    el('athleteDetail') && (el('athleteDetail').style.display = 'none');
    el('athleteCardGrid') && (el('athleteCardGrid').style.display = '');
    STATE.selectedAthleteId = null;
  }

  STATE.currentView = viewId;
  _applyViewDom(viewId);

  if (viewId === 'athletes') {
    el('athleteDetail') && (el('athleteDetail').style.display = 'none');
    el('athleteCardGrid') && (el('athleteCardGrid').style.display = '');
    renderAthletesView();
  }
  if (viewId === 'analytics') renderAnalytics();
  if (viewId === 'train')     renderTrainView();
  if (viewId === 'schedule')  renderSchedule();
}

document.querySelectorAll('[data-view]').forEach(btn =>
  btn.addEventListener('click', () => switchView(btn.dataset.view))
);

/* ─── SEARCH (keep both inputs in sync) ─── */
function handleSearch(value){
  if (STATE.currentView !== 'athletes') {
    STATE.currentView = 'athletes';
    _applyViewDom('athletes');
    el('athleteDetail') && (el('athleteDetail').style.display = 'none');
    el('athleteCardGrid') && (el('athleteCardGrid').style.display = '');
  }
  renderAthletesView(value);
  el('athleteSearch') && (el('athleteSearch').value = value);
  el('athleteFilterInput') && (el('athleteFilterInput').value = value);
}
el('athleteSearch')?.addEventListener('input', e => handleSearch(e.target.value));
el('athleteFilterInput')?.addEventListener('input', e => handleSearch(e.target.value));

/* ─── BACK / VIEW ALL ─── */
el('backToList')?.addEventListener('click', () => {
  el('athleteDetail') && (el('athleteDetail').style.display = 'none');
  el('athleteCardGrid') && (el('athleteCardGrid').style.display = '');
  STATE.selectedAthleteId = null;
  renderAthletesView();
});
el('viewAllAthletes')?.addEventListener('click', () => switchView('athletes'));
el('rosterMore')?.addEventListener('click', () => switchView('athletes'));

/* ─── TRAIN ─── */
el('btnGenerate')?.addEventListener('click', renderGeneratedSession);
el('btnGenerateInline')?.addEventListener('click', renderGeneratedSession);
el('btnPushToday')?.addEventListener('click', () => toast('Session pushed to Today ✓'));
document.querySelectorAll('#injuryChips .inj-chip').forEach(chip =>
  chip.addEventListener('click', () => chip.classList.toggle('active'))
);

/* ─── REFRESH / EXPORT ─── */
el('btnRefresh')?.addEventListener('click', () => { renderDashboard(); toast('Data refreshed ↺'); });
el('btnExport')?.addEventListener('click', () => toast('Report export requires cloud sync — coming soon 📤'));
el('btnExportAnalytics')?.addEventListener('click', () => toast('PDF export coming in next phase 📄'));

/* ─── SETTINGS ─── */
if (el('settingTeamName')) el('settingTeamName').value = STATE.teamName;
if (el('settingSport')) Array.from(el('settingSport').options).forEach(o => { o.selected = o.value.toLowerCase() === STATE.sport; });

el('btnSaveSettings')?.addEventListener('click', () => {
  STATE.teamName = (el('settingTeamName')?.value || '').trim() || STATE.teamName;
  STATE.season   = el('settingSeason')?.value || STATE.season;
  STATE.sport    = (el('settingSport')?.value || STATE.sport).toLowerCase();

  applySportTheme(STATE.sport);

  el('userRole') && (el('userRole').textContent = `Head Coach · ${cap(STATE.sport)}`);
  saveState();
  renderDashboard();
  toast('Settings saved ✓');
});

el('btnExportData')?.addEventListener('click', () => {
  try {
    const blob = new Blob([JSON.stringify({athletes:ATHLETES,state:STATE,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),{href:url,download:`piq-backup-${Date.now()}.json`});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Backup downloaded ✓');
  } catch(e) { toast('Export failed: ' + e.message); }
});

el('btnImportData')?.addEventListener('click', () => el('importFileInput')?.click());
el('importFileInput')?.addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const p = JSON.parse(evt.target.result);
      if (p.athletes && Array.isArray(p.athletes) && p.athletes.length) {
        ATHLETES = p.athletes; saveAthletes();
        if (p.state) Object.assign(STATE, p.state); saveState();
        applySportTheme(STATE.sport);
        renderDashboard(); toast(`Imported ${ATHLETES.length} athletes ✓`);
      } else toast('Import failed — no athletes found');
    } catch { toast('Import failed — invalid JSON'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

el('btnResetData')?.addEventListener('click', () => {
  if (!confirm('Reset to demo data? Current data will be lost.')) return;
  ATHLETES = DEFAULT_ATHLETES.map(a => ({...a}));
  saveAthletes(); renderDashboard(); toast('Reset to demo data ↺');
});

/* ══════════════════════════════════════════════
   INTERACTIVE TOUR — Today workflow
══════════════════════════════════════════════ */
const TodayTour = (() => {
  let idx = 0;
  let steps = [];
  let backdrop, card, hl;

  function $q(sel){ return document.querySelector(sel); }
  function ensure(){
    backdrop = backdrop || document.createElement('div');
    backdrop.className = 'piq-tour-backdrop';
    backdrop.style.display = 'none';

    hl = hl || document.createElement('div');
    hl.className = 'piq-tour-hl';

    card = card || document.createElement('div');
    card.className = 'piq-tour-card';
    card.innerHTML = `
      <div class="piq-tour-head">
        <div class="piq-tour-title">Today — quick workflow</div>
        <button class="iconbtn js-tour-close" aria-label="Close tour">✕</button>
      </div>
      <div class="piq-tour-body">
        <div class="piq-tour-h js-tour-h"></div>
        <div class="muted small js-tour-p" style="margin-top:6px;line-height:1.6"></div>
        <div class="caption-illusion js-tour-cap" style="margin-top:10px"></div>
        <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
          <button class="btn btn-ghost js-tour-back">Back</button>
          <button class="btn btn-primary js-tour-next">Next</button>
        </div>
      </div>`;

    if (!backdrop.isConnected) {
      document.body.appendChild(backdrop);
      document.body.appendChild(hl);
      document.body.appendChild(card);
    }

    backdrop.addEventListener('click', close);
    card.querySelector('.js-tour-close')?.addEventListener('click', close);
    card.querySelector('.js-tour-back')?.addEventListener('click', () => go(idx - 1));
    card.querySelector('.js-tour-next')?.addEventListener('click', () => go(idx + 1));
  }

  function rectFor(node){
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { x:r.left, y:r.top, w:r.width, h:r.height };
  }

  function focus(node){
    const r = rectFor(node);
    if (!r) return;
    const pad = 10;
    hl.style.width = (r.w + pad*2) + 'px';
    hl.style.height = (r.h + pad*2) + 'px';
    hl.style.transform = `translate3d(${Math.round(r.x - pad)}px,${Math.round(r.y - pad)}px,0)`;
    try { node.classList.add('tour-focus'); } catch {}
  }

  function clearFocus(){
    document.querySelectorAll('.tour-focus').forEach(n => n.classList.remove('tour-focus'));
  }

  function go(n){
    ensure();
    if (n < 0) n = 0;
    if (n >= steps.length) { close(); return; }
    idx = n;

    clearFocus();
    const s = steps[idx];

    // Navigate view if needed
    if (s.view && STATE.currentView !== s.view) switchView(s.view);

    setTimeout(() => {
      const target = (typeof s.target === 'function') ? s.target() : (s.target ? $q(s.target) : null);
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior:'smooth', block:'center' });
      focus(target);

      card.querySelector('.js-tour-h').textContent = `${idx+1}/${steps.length} · ${s.h}`;
      card.querySelector('.js-tour-p').textContent = s.p;
      card.querySelector('.js-tour-cap').textContent = s.cap || '';
      const nextBtn = card.querySelector('.js-tour-next');
      if (nextBtn) nextBtn.textContent = (idx === steps.length-1) ? 'Done' : 'Next';
      const backBtn = card.querySelector('.js-tour-back');
      if (backBtn) backBtn.style.display = idx === 0 ? 'none' : 'inline-flex';

      backdrop.style.display = 'block';
      hl.style.display = 'block';
      card.style.display = 'block';
    }, 120);
  }

  function start(){
    ensure();
    steps = [
      {
        view:'dashboard',
        target: () => el('statAvg')?.closest('.stat-card') || el('statAvg'),
        h:'Scan the team PIQ average',
        p:'Start here to see whether the team is trending up or down before you assign load.',
        cap:'If parents report eye strain, this headline is now WCAG-friendly and readable without browser zoom.'
      },
      {
        view:'dashboard',
        target: () => el('alertsList')?.closest('.card') || el('alertsList'),
        h:'Handle risk flags first',
        p:'Clear “Rest” and “Watch” athletes before planning practice. Tap any athlete row to open details.',
        cap:'No audio — but the caption motion gives a “guided” feel without distractions.'
      },
      {
        view:'dashboard',
        target: () => el('heatmapBody')?.closest('table') || el('heatmapBody'),
        h:'Use the heatmap for who/why',
        p:'This is your fastest “who needs what” view: score, readiness, ACWR, and trend in one line.',
        cap:'Tip: click a row → detail ring animates + pillars fill in.'
      },
      {
        view:'train',
        target: () => el('generatedSessionWrap') || el('sessionLibrary'),
        h:'Generate today’s session',
        p:'Pick sport, duration, intensity, injuries — then generate a session. Save or start.',
        cap:'Micro-interactions (ripple + spring) reinforce “this is a finished product.”'
      },
      {
        view:'athletes',
        target: () => el('athleteSearch') || el('athleteFilterInput'),
        h:'Quick filter + communicate',
        p:'Search by name/position to check an athlete, then open detail to view readiness + notes.',
        cap:'Parents asked for clarity — larger typography + stronger focus ring fix that.'
      }
    ];
    try { localStorage.setItem(STORAGE_KEY_TOUR, '1'); } catch {}
    go(0);
  }

  function close(){
    if (backdrop) backdrop.style.display = 'none';
    if (card) card.style.display = 'none';
    if (hl) hl.style.display = 'none';
    clearFocus();
  }

  return { start, close };
})();

/* ─── ONBOARDING WIZARD (existing) ─── */
let obStep = 1, obRole = 'coach', obSport = 'basketball';

document.querySelectorAll('#roleGrid .role-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('#roleGrid .role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected'); obRole = card.dataset.role;
  });
});
document.querySelectorAll('#sportGrid .sport-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#sportGrid .sport-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected'); obSport = chip.dataset.sport;
  });
});
document.querySelectorAll('#obInjuryChips .inj-chip').forEach(chip =>
  chip.addEventListener('click', () => chip.classList.toggle('active'))
);

function goObStep(n){
  obStep = n;
  document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
  el('obStep' + n)?.classList.add('active');
  if (el('obProgress')) el('obProgress').style.width = Math.round(n / 3 * 100) + '%';
}
function closeModal(){
  el('onboardingModal') && (el('onboardingModal').style.display = 'none');
  try { localStorage.setItem(STORAGE_KEY_ONBOARDED, '1'); } catch {}
}

el('obNext1')?.addEventListener('click', () => goObStep(2));
el('obNext2')?.addEventListener('click', () => {
  if (el('obFirstSession')) el('obFirstSession').innerHTML = buildWorkoutCardHTML(generateSession(obSport,'practice',60,'moderate',[]), false);
  goObStep(3);
});
el('obBack2')?.addEventListener('click', () => goObStep(1));
el('obBack3')?.addEventListener('click', () => goObStep(2));
el('obClose')?.addEventListener('click', closeModal);
el('obSkip')?.addEventListener('click',  () => { closeModal(); toast('Welcome to PerformanceIQ ⚡'); });
el('obFinish')?.addEventListener('click', () => {
  STATE.role = obRole; STATE.sport = obSport;
  const LABELS = {coach:'Head Coach',athlete:'Athlete',admin:'Admin / AD',parent:'Parent',owner:'Owner',viewer:'Viewer'};
  el('userName') && (el('userName').textContent = LABELS[obRole] || 'Coach Davis');
  el('userRole') && (el('userRole').textContent = `${LABELS[obRole]||'Head Coach'} · ${cap(obSport)}`);
  saveState(); closeModal();
  applySportTheme(STATE.sport);
  renderDashboard();
  toast('Welcome to PerformanceIQ ⚡');
});

/* ─── KEYBOARD NAV ─── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const m = el('onboardingModal');
    if (m && m.style.display !== 'none') closeModal();
    TodayTour.close();
  }
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    TodayTour.start();
  }
});

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
function init(){
  applySportTheme(STATE.sport);
  ensureTabIndicator();

  const seen = (() => { try { return localStorage.getItem(STORAGE_KEY_ONBOARDED); } catch { return null; } })();
  if (!seen && el('onboardingModal')) el('onboardingModal').style.display = 'flex';
  el('userRole') && (el('userRole').textContent = `Head Coach · ${cap(STATE.sport)}`);

  renderDashboard();

  // Show tour once (after onboarding)
  const seenTour = (() => { try { return localStorage.getItem(STORAGE_KEY_TOUR); } catch { return null; } })();
  if (!seenTour && seen) setTimeout(() => TodayTour.start(), 650);
}

init();
