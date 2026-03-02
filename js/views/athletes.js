import { dom } from '../ui/dom.js';
import { STATE, ATHLETES } from '../state/state.js';
import { toast } from '../services/toast.js';
import { getTier, getSevColor, getRingClass, getScoreNote, getPillars, cap, getAcrColor, getAcrFlag } from '../features/scoring.js';
import { generateSession, buildWorkoutCardHTML } from '../features/sessionGenerator.js';

function tweenNumber(node, to, ms = 700) {
  if (!node) return;
  const from = parseInt((node.textContent || '0').replace(/[^\d]/g, ''), 10) || 0;
  const end  = Math.max(0, Math.min(100, to || 0));
  const start = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.round(from + (end - from) * eased);
    node.textContent = String(val);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateRing(fillEl, score, circ = 440){
  if (!fillEl) return;
  fillEl.style.strokeDashoffset = circ;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fillEl.style.strokeDashoffset = circ - Math.max(0, Math.min(score, 100)) / 100 * circ;
  }));
}

export function renderAthletesView(filter = ''){
  const filtered = filter
    ? ATHLETES.filter(a =>
        a.name.toLowerCase().includes(filter.toLowerCase()) ||
        a.pos.toLowerCase().includes(filter.toLowerCase())
      )
    : ATHLETES;

  if (dom.athleteCountSub) dom.athleteCountSub.textContent = `${ATHLETES.length} athletes on roster`;

  const grid = dom.athleteCardGrid;
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
    const open = () => {
      const a = ATHLETES.find(x => x.id === +card.dataset.id);
      if (a) openAthleteDetail(a);
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

function renderDetailWorkout(a){
  const wrap = dom.detailWorkout;
  if (!wrap) return;

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

export function openAthleteDetail(a){
  STATE.selectedAthleteId = a.id;

  if (dom.athleteCardGrid) dom.athleteCardGrid.style.display = 'none';
  if (dom.athleteDetail) dom.athleteDetail.style.display = 'flex';

  const t = getTier(a.score);
  const color = getSevColor(a.severity);

  if (dom.detailHero) dom.detailHero.innerHTML = `
    <div style="width:64px;height:64px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${a.color};color:${a.colorText};font-family:var(--font-display);font-size:22px;font-weight:800;border:2px solid var(--accent-border)">${a.initials}</div>
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--font-display);font-size:26px;font-weight:800">${a.name}</div>
      <div style="font-size:13px;color:var(--text-dim);margin-top:3px">${a.pos} · Jersey #${a.jersey} · ${STATE.teamName}</div>
      <div class="athlete-chips" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        <div class="athlete-chip sport">🏀 ${cap(STATE.sport)}</div>
        <div class="athlete-chip" ${a.riskLevel==='rest'?'style="background:var(--red-dim);border-color:var(--red-border);color:var(--red)"':a.riskLevel==='watch'?'style="background:var(--yellow-dim);border-color:var(--yellow-border);color:var(--yellow)"':''}>
          ${a.riskLevel==='rest'?'⛔ Rest Day':a.riskLevel==='watch'?'⚠ Monitor':a.score?'✓ Active':'⚪ Not Logged'}
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">
      <div id="detailHeroScore" style="font-family:var(--font-display);font-size:44px;font-weight:800;line-height:1;color:${color}">${a.score||'—'}</div>
      <div class="score-tier ${t.cls}" style="font-size:11px">${t.label}</div>
    </div>`;

  const rf = dom.detailRingFill;
  const rc = getRingClass(a.score);
  if (rf) rf.className = 'ring-fill' + (rc ? ' ' + rc : '');

  if (dom.detailRingNum) {
    dom.detailRingNum.textContent = a.score || '—';
    dom.detailRingNum.className = 'ring-number' + (rc ? ' ' + rc : '');
    if (a.score) tweenNumber(dom.detailRingNum, a.score, 900);
  }

  if (dom.detailRingDelta) {
    if (a.trend) {
      dom.detailRingDelta.className = 'ring-delta ' + (a.trend > 0 ? 'up' : 'down');
      dom.detailRingDelta.textContent = (a.trend > 0 ? '↑' : '↓') + ' ' + Math.abs(a.trend) + ' pts';
    } else {
      dom.detailRingDelta.textContent = '';
    }
  }

  animateRing(rf, a.score, 440);

  if (dom.detailTier) {
    dom.detailTier.className = 'score-tier ' + t.cls;
    dom.detailTier.textContent = t.label;
  }
  if (dom.detailScoreNote) dom.detailScoreNote.innerHTML = getScoreNote(a);

  if (dom.detailPillars) dom.detailPillars.innerHTML = getPillars(a).map(p => `
    <div class="pillar">
      <div class="pillar-icon">${p.icon}</div>
      <div class="pillar-value" style="color:${p.color}">${p.value}</div>
      <div class="pillar-bar"><div class="pillar-fill" style="width:${p.value}%;background:${p.color}"></div></div>
      <div class="pillar-name">${p.name}</div>
    </div>`).join('');

  const wItems = [
    { emoji:'😴', label:'Sleep',    display: a.sleep    != null ? `${a.sleep}h`      : '—',
      color:   a.sleep    == null ? 'var(--text-dim)' : a.sleep    >= 7.5 ? 'var(--green)' : a.sleep    >= 6 ? 'var(--yellow)' : 'var(--red)' },
    { emoji:'💢', label:'Soreness', display: a.soreness != null ? `${a.soreness}/10` : '—',
      color:   a.soreness == null ? 'var(--text-dim)' : a.soreness <=  3 ? 'var(--green)' : a.soreness <= 6 ? 'var(--yellow)' : 'var(--red)' },
    { emoji:'⚡', label:'Energy',   display: a.energy   != null ? `${a.energy}/10`   : '—',
      color:   a.energy   == null ? 'var(--text-dim)' : a.energy   >=  7 ? 'var(--green)' : a.energy   >= 4 ? 'var(--yellow)' : 'var(--red)' },
  ];
  if (dom.detailWellness) dom.detailWellness.innerHTML = wItems.map(w => `
    <div class="wellness-item">
      <div class="wellness-emoji">${w.emoji}</div>
      <div class="wellness-label">${w.label}</div>
      <div class="wellness-value" style="color:${w.color}">${w.display}</div>
    </div>`).join('');

  if (dom.detailLoad) {
    dom.detailLoad.innerHTML = a.acr != null
      ? `<div class="load-bar-item">
          <div class="load-bar-name">ACWR</div>
          <div class="load-bar-track"><div class="load-bar-fill" style="width:${Math.min(100,Math.round(a.acr/2*100))}%;background:${getAcrColor(a.acr)}"></div></div>
          <div class="load-bar-val" style="color:${getAcrColor(a.acr)}">${a.acr}</div>
          <div class="load-bar-flag">${getAcrFlag(a.acr)}</div>
        </div>`
      : `<div style="font-size:13px;color:var(--text-dim)">No load data available.</div>`;
  }

  if (dom.detailInsight) dom.detailInsight.innerHTML = a.insight;
  renderDetailWorkout(a);

  const prTable = dom.detailPRs;
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

  const heroScore = document.getElementById('detailHeroScore');
  if (heroScore && a.score) tweenNumber(heroScore, a.score, 750);

  toast(`Opened: ${a.name}`);
}

export function bindAthletesViewEvents() {
  if (dom.backToList) {
    dom.backToList.addEventListener('click', () => {
      if (dom.athleteDetail) dom.athleteDetail.style.display = 'none';
      if (dom.athleteCardGrid) dom.athleteCardGrid.style.display = '';
      STATE.selectedAthleteId = null;
      renderAthletesView(dom.athleteFilterInput?.value || dom.athleteSearch?.value || '');
    });
  }
}
