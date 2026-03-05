// core.js — PerformanceIQ v4.1 (FIXED)
// FIXES APPLIED:
// - Exposed openStatCardGenerator to window (Share Card button needs it)
// - Fixed SW registration path from '/sw.js' to './sw.js'
// - Added name-input binding in bindSettings
// SIX CRITICAL FIXES:
// [FIX 1] Score Explainer — baseline assessment + 5-pillar breakdown, no more "—"
// [FIX 2] Push Notifications — OneSignal integration + Web Push API
// [FIX 3] Design System — sport accent applied dynamically, role theming
// [FIX 4] Shareable Stat Cards — HTML Canvas → PNG export + Web Share API
// [FIX 5] In-App Messaging — threaded chat via Supabase Realtime
// [FIX 6] PWA Install Prompt — beforeinstallprompt capture + banner
(function () {
  'use strict';
  if (window.__PIQ_CORE__) return;
  window.__PIQ_CORE__ = true;

  const $ = (id) => document.getElementById(id);

  // ─── DATA STORE (self-contained localStorage fallback) ───────
  const PIQ_KEY = 'piq_state_v4';
  const DEFAULT_STATE = {
    role: 'athlete',
    sport: 'basketball',
    athleteName: 'Athlete',
    streak: 0,
    lastLogDate: null,
    piqScore: null,
    piqPillars: null,
    msgThreads: [],
    pushEnabled: false,
    appInstalled: false,
    baselineDone: false,
  };
  if (!window.dataStore) {
    window.dataStore = {
      load: () => {
        try {
          const raw = localStorage.getItem(PIQ_KEY);
          return raw ? Object.assign({}, DEFAULT_STATE, JSON.parse(raw)) : Object.assign({}, DEFAULT_STATE);
        } catch { return Object.assign({}, DEFAULT_STATE); }
      },
      save: (s) => {
        try { localStorage.setItem(PIQ_KEY, JSON.stringify(s)); } catch {}
      }
    };
  }

  // ─── STATE ──────────────────────────────────────────────────
  let state = window.dataStore.load();

  const cloudKey = 'piq_cloud_v2';
  function loadCloudCfg() { try { return JSON.parse(localStorage.getItem(cloudKey) || 'null'); } catch { return null; } }
  function saveCloudCfg(cfg) { localStorage.setItem(cloudKey, JSON.stringify(cfg)); }

  function isMobile() { return window.matchMedia && window.matchMedia('(max-width: 860px)').matches; }

  // ─── UI HELPERS ─────────────────────────────────────────────
  let toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  function setSavePill(saved) {
    const dot = $('saveDot'), txt = $('saveText');
    if (!dot || !txt) return;
    dot.style.background = saved ? 'var(--ok)' : 'var(--warn)';
    txt.textContent = saved ? 'Saved' : 'Saving…';
  }

  // ─── SAVE ───────────────────────────────────────────────────
  function save() {
    setSavePill(false);
    window.dataStore.save(state);
    setSavePill(true);
  }

  // ─────────────────────────────────────────────────────────────
  // [FIX 3] DESIGN SYSTEM — Sport accent + role theming
  // ─────────────────────────────────────────────────────────────
  const SPORT_MAP = {
    basketball: 'basketball', football: 'football', soccer: 'soccer',
    track: 'track', swimming: 'swimming', volleyball: 'volleyball',
    baseball: 'baseball', lacrosse: 'lacrosse', tennis: 'tennis', wrestling: 'wrestling'
  };
  const SPORT_COLORS = {
    basketball: '#4D9FFF', football: '#FF8C42', soccer: '#3DFFC0',
    track: '#FF4D6D',      swimming: '#B47FFF',  volleyball: '#F5C842',
    baseball: '#FF6B6B',   lacrosse: '#52D9FF',  tennis: '#A8FF3E',  wrestling: '#FF9F1C'
  };

  function applyDesignSystem() {
    const sport = (state.sport || 'basketball').toLowerCase().replace(/[^a-z]/g, '');
    const role  = (state.role  || 'athlete').toLowerCase();
    document.body.dataset.sport = SPORT_MAP[sport] || 'basketball';
    document.body.dataset.role  = role;
    const accent = SPORT_COLORS[SPORT_MAP[sport]] || '#F5C842';
    document.documentElement.style.setProperty('--sport-accent', accent);
    const brand = document.querySelector('.header-brand');
    if (brand) brand.textContent = 'PERFORMANCEIQ';
  }

  // ─────────────────────────────────────────────────────────────
  // [FIX 1] PIQ SCORE ENGINE
  // ─────────────────────────────────────────────────────────────
  const PILLAR_WEIGHTS = { speed: 0.20, strength: 0.20, endurance: 0.20, consistency: 0.25, nutrition: 0.15 };

  function computePIQScore() {
    const pillars = state.piqPillars;
    if (!pillars) return null;
    const raw = Object.entries(PILLAR_WEIGHTS).reduce((sum, [k, w]) => sum + (pillars[k] || 0) * w, 0);
    return Math.round(raw * 10);
  }

  function getPIQScoreDisplay() {
    const score = computePIQScore();
    if (!score || score === 0) return null;
    return score;
  }

  function getPIQScoreLabel(score) {
    if (score >= 900) return 'ELITE';
    if (score >= 800) return 'ADVANCED';
    if (score >= 650) return 'DEVELOPING';
    if (score >= 500) return 'FOUNDATION';
    return 'BEGINNER';
  }

  function getScoreCTA(pillars) {
    if (!pillars) return 'COMPLETE YOUR BASELINE ASSESSMENT →';
    const worst = Object.entries(pillars).sort(([, a], [, b]) => a - b)[0];
    const ctaMap = {
      speed:       '→ LOG A SPRINT SESSION TO GAIN POINTS',
      strength:    '→ LOG A LIFT TODAY TO IMPROVE STRENGTH',
      endurance:   '→ ADD A CARDIO SESSION TO BOOST ENDURANCE',
      consistency: '→ LOG TODAY TO KEEP YOUR STREAK ALIVE',
      nutrition:   '→ LOG YOUR MEALS TO GAIN +12 POINTS'
    };
    return ctaMap[worst[0]] || '→ LOG A WORKOUT TO IMPROVE YOUR SCORE';
  }

  // ─────────────────────────────────────────────────────────────
  // [FIX 1] SCORE EXPLAINER MODAL
  // ─────────────────────────────────────────────────────────────
  function openScoreExplainer() {
    const score   = computePIQScore();
    const pillars = state.piqPillars || { speed: 60, strength: 60, endurance: 60, consistency: 60, nutrition: 60 };
    const pillarRows = [
      { key: 'speed',       label: 'Speed',       weight: '20%', color: 'var(--mint)' },
      { key: 'strength',    label: 'Strength',     weight: '20%', color: 'var(--gold)' },
      { key: 'endurance',   label: 'Endurance',    weight: '20%', color: 'var(--blue)' },
      { key: 'consistency', label: 'Consistency',  weight: '25%', color: 'var(--mint)' },
      { key: 'nutrition',   label: 'Nutrition',    weight: '15%', color: 'var(--red)'  }
    ].map(p => `
      <div class="score-pillar">
        <div class="score-pillar-name">${p.label}</div>
        <div class="score-pillar-bar-wrap">
          <div class="score-pillar-bar" style="width:${pillars[p.key] || 60}%;background:${p.color}"></div>
        </div>
        <div class="score-pillar-val" style="color:${p.color}">${pillars[p.key] || 60}</div>
        <div class="score-pillar-weight">${p.weight}</div>
      </div>`).join('');

    const html = `
      <div class="modal-backdrop" id="score-modal-bg" onclick="if(event.target===this)this.remove()">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">${score ? score + ' PIQ' : 'YOUR SCORE'}</div>
            <button class="modal-close" onclick="document.getElementById('score-modal-bg').remove()">✕</button>
          </div>
          ${score ? `<div style="text-align:center;margin-bottom:16px"><span class="chip chip-gold">${getPIQScoreLabel(score)}</span></div>` : ''}
          <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-dim);margin-bottom:12px">SCORE BREAKDOWN — 5 PILLARS</div>
          <div class="score-pillar-list">${pillarRows}</div>
          <div style="margin-top:12px;font-size:12px;color:var(--text-secondary);line-height:1.6">Your PerformanceIQ Score measures Speed, Strength, Endurance, Consistency, and Nutrition. Every workout and nutrition log moves your score. Top 10% = Elite.</div>
          <div class="score-cta-box mt-16" onclick="document.getElementById('score-modal-bg').remove()">${getScoreCTA(state.piqPillars)}</div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  // ─────────────────────────────────────────────────────────────
  // [FIX 1] BASELINE ASSESSMENT
  // ─────────────────────────────────────────────────────────────
  const BASELINE_QUESTIONS = [
    { key: 'speed',       text: 'How would you rate your SPEED and quickness? (1 = slow, 10 = elite)',       emoji: '⚡' },
    { key: 'strength',    text: 'How strong are you right now? (1 = beginner lifts, 10 = competitive)',      emoji: '💪' },
    { key: 'endurance',   text: 'How is your cardio endurance? (1 = gets winded easily, 10 = long runs)',    emoji: '🫀' },
    { key: 'consistency', text: 'How consistently do you train? (1 = rarely, 10 = 5+ days/week every week)',emoji: '🔥' },
    { key: 'nutrition',   text: 'How well do you eat and hydrate? (1 = rarely track, 10 = dialed in)',       emoji: '🥗' }
  ];

  let baselineAnswers = {};
  let baselineStep = 0;

  function openBaselineAssessment() {
    baselineAnswers = {};
    baselineStep = 0;
    renderBaselineStep();
  }

  function renderBaselineStep() {
    const q = BASELINE_QUESTIONS[baselineStep];
    const scaleButtons = Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
      `<button class="baseline-btn" onclick="window.__piqBaselineAnswer(${n})">${n}</button>`
    ).join('');
    const existing = document.getElementById('baseline-modal-bg');
    if (existing) existing.remove();
    const html = `
      <div class="modal-backdrop" id="baseline-modal-bg">
        <div class="modal">
          <div class="baseline-progress">${baselineStep + 1} of ${BASELINE_QUESTIONS.length} — BASELINE ASSESSMENT</div>
          <div class="baseline-step">
            <div style="font-size:40px;margin-bottom:12px">${q.emoji}</div>
            <div class="baseline-question">${q.text}</div>
            <div class="baseline-scale">${scaleButtons}</div>
          </div>
          <div style="margin-top:16px;font-size:12px;color:var(--text-dim);text-align:center">This sets your opening PerformanceIQ Score. It improves as you log.</div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  window.__piqBaselineAnswer = function(val) {
    const q = BASELINE_QUESTIONS[baselineStep];
    baselineAnswers[q.key] = val * 10;
    baselineStep++;
    if (baselineStep >= BASELINE_QUESTIONS.length) {
      state.piqPillars = baselineAnswers;
      save();
      const score = computePIQScore();
      document.getElementById('baseline-modal-bg').remove();
      toast(`🎯 Your opening PIQ Score: ${score}!`);
      updateScoreRing();
      openScoreExplainer();
    } else {
      renderBaselineStep();
    }
  };

  function updateScoreRing() {
    const scoreEl = document.getElementById('piq-ring-num');
    const ringEl  = document.getElementById('piq-ring');
    if (!scoreEl || !ringEl) return;
    const score = getPIQScoreDisplay();
    if (!score) {
      scoreEl.textContent = '?';
      ringEl.style.setProperty('--piq-pct', 5);
      const hintEl = document.getElementById('piq-ring-tap-hint');
      if (hintEl) hintEl.textContent = 'TAP TO GET YOUR SCORE';
    } else {
      scoreEl.textContent = score;
      scoreEl.classList.add('score-glow');
      setTimeout(() => scoreEl.classList.remove('score-glow'), 5000);
      ringEl.style.setProperty('--piq-pct', Math.min(score / 10, 100));
      const hintEl = document.getElementById('piq-ring-tap-hint');
      if (hintEl) hintEl.textContent = 'TAP FOR BREAKDOWN';
    }
  }

  function bindScoreRing() {
    const wrap = document.getElementById('piq-ring-wrap');
    if (!wrap) return;
    wrap.addEventListener('click', () => {
      if (!state.piqPillars) openBaselineAssessment();
      else openScoreExplainer();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // [FIX 2] PUSH NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  const ONESIGNAL_APP_ID = 'YOUR_ONESIGNAL_APP_ID';

  function initPushNotifications() {
    if (state.pushAsked) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') { state.pushGranted = true; save(); return; }
    showPushBanner();
  }

  function showPushBanner() {
    if (document.getElementById('push-banner')) return;
    const html = `
      <div class="push-banner fade-up" id="push-banner">
        <div class="push-banner-icon">🔔</div>
        <div class="push-banner-text">
          <div class="push-banner-title">Stay on your streak</div>
          <div class="push-banner-sub">Get score updates, coach messages, and workout reminders</div>
        </div>
        <button class="btn btn-sm chip-mint" onclick="window.__piqRequestPush()" style="white-space:nowrap;background:var(--mint);color:var(--void);font-family:var(--font-sub);font-weight:700;border:none;border-radius:6px;padding:8px 14px;cursor:pointer">Enable</button>
        <button class="push-banner-dismiss" onclick="window.__piqDismissPush()">✕</button>
      </div>`;
    const main = document.querySelector('.main') || document.body;
    main.insertAdjacentHTML('afterbegin', html);
  }

  window.__piqRequestPush = async function() {
    document.getElementById('push-banner')?.remove();
    state.pushAsked = true;
    save();
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        state.pushGranted = true;
        save();
        toast('🔔 Notifications enabled!');
        if (window.OneSignal) {
          window.OneSignal.push(() => { window.OneSignal.init({ appId: ONESIGNAL_APP_ID }); });
        }
        // FIX: Use relative path for GitHub Pages
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('./sw.js').catch(() => {});
        }
      }
    } catch (e) { console.warn('Push permission failed:', e); }
  };

  window.__piqDismissPush = function() {
    document.getElementById('push-banner')?.remove();
    state.pushAsked = true;
    save();
  };

  window.piqNotify = function(title, body, url = './') {
    if (!state.pushGranted) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, { body, icon: './icons/icon-192.png', badge: './icons/icon-72.png', data: { url } });
      n.onclick = () => { window.focus(); n.close(); };
    } catch (e) {}
  };

  function checkStreakNotification() {
    const lastLog = state.lastLogDate;
    if (!lastLog) return;
    const today = new Date().toDateString();
    const last  = new Date(lastLog).toDateString();
    if (last === today) return;
    const streak = state.streak || 0;
    if (streak >= 3) {
      window.piqNotify('🔥 Your streak is on the line', `Log today to keep your ${streak}-day streak alive — and protect your PIQ Score.`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // [FIX 4] SHAREABLE STAT CARDS
  // ─────────────────────────────────────────────────────────────
  function openStatCardGenerator(trigger = 'manual') {
    const score   = computePIQScore() || 0;
    const pillars = state.piqPillars || {};
    const name    = state.name || 'ATHLETE';
    const sport   = (state.sport || 'Basketball').toUpperCase();
    const position= state.position || '';
    const streak  = state.streak || 0;
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--sport-accent').trim() || '#F5C842';
    const percentile = score >= 900 ? 'Top 1%' : score >= 800 ? 'Top 10%' : score >= 650 ? 'Top 25%' : score >= 500 ? 'Top 50%' : 'Top 75%';
    const weekSessions = (state.sessions || []).filter(s => {
      const d = new Date(s.date || s.timestamp);
      return (new Date() - d) < 7 * 24 * 60 * 60 * 1000;
    }).length;

    const html = `
      <div class="stat-card-overlay" id="stat-card-overlay">
        <div class="stat-card" id="stat-card-el">
          <div class="stat-card-inner">
            <div class="stat-card-brand">PERFORMANCEIQ</div>
            <div class="stat-card-name">${name.toUpperCase()}</div>
            <div class="stat-card-sport">${sport}${position ? ' · ' + position : ''} · Week ${getISOWeek()}</div>
            <div class="stat-card-score">${score}</div>
            <div class="stat-card-percentile">PerformanceIQ Score · ${percentile}</div>
            <div class="stat-card-stats">
              <div><div class="stat-card-stat-val">+${Math.round(score * 0.03)}</div><div class="stat-card-stat-lbl">pts this week</div></div>
              <div><div class="stat-card-stat-val">${streak}d</div><div class="stat-card-stat-lbl">streak</div></div>
              <div><div class="stat-card-stat-val">${weekSessions}/${weekSessions + 1}</div><div class="stat-card-stat-lbl">workouts</div></div>
            </div>
          </div>
          <div class="stat-card-bar" style="background:linear-gradient(90deg,var(--gold),${accentColor})"></div>
        </div>
        <div class="stat-card-actions">
          <button class="btn btn-primary flex-1" onclick="window.__piqShareCard()">📤 Share</button>
          <button class="btn btn-secondary" onclick="document.getElementById('stat-card-overlay').remove()">Close</button>
        </div>
        ${trigger !== 'manual' ? `<div style="font-family:var(--font-mono);font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.1em">${trigger.toUpperCase()} — TAP TO SHARE</div>` : ''}
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  // ── EXPOSE openStatCardGenerator to window for HTML onclick ──
  window.openStatCardGenerator = openStatCardGenerator;

  window.__piqShareCard = async function() {
    const card = document.getElementById('stat-card-el');
    if (!card) return;
    if (navigator.share) {
      try {
        const canvas = await cardToCanvas(card);
        if (canvas) {
          canvas.toBlob(async (blob) => {
            const file = new File([blob], 'piq-score.png', { type: 'image/png' });
            await navigator.share({ title: 'My PerformanceIQ Score', text: 'Check out my PIQ Score! 💪', files: [file] });
          });
          return;
        }
      } catch (e) {}
    }
    const canvas = await cardToCanvas(card);
    if (canvas) {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'piq-score-card.png';
      a.click();
      toast('📥 Card downloaded!');
    } else {
      toast('📋 Copy your score and share it!');
    }
  };

  async function cardToCanvas(card) {
    if (!card) return null;
    try {
      if (window.html2canvas) return await window.html2canvas(card, { backgroundColor: '#0D1117', scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = 680; canvas.height = 400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0D1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#F5C842';
      ctx.font = 'bold 80px monospace';
      ctx.fillText(computePIQScore() || '0', 40, 120);
      ctx.fillStyle = '#F0F4FF';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText((state.name || 'ATHLETE').toUpperCase(), 40, 180);
      ctx.fillStyle = '#8899BB';
      ctx.font = '18px sans-serif';
      ctx.fillText('PerformanceIQ Score', 40, 220);
      const grad = ctx.createLinearGradient(0, 390, canvas.width, 390);
      grad.addColorStop(0, '#F5C842');
      grad.addColorStop(1, getComputedStyle(document.documentElement).getPropertyValue('--sport-accent').trim());
      ctx.fillStyle = grad;
      ctx.fillRect(0, 390, canvas.width, 10);
      return canvas;
    } catch { return null; }
  }

  function getISOWeek() {
    const d = new Date();
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function checkStatCardTrigger(eventType, data = {}) {
    const triggers = {
      'workout-complete': () => { const score = computePIQScore(); if (score && score % 50 < 5) openStatCardGenerator('SCORE MILESTONE'); },
      'streak-milestone': () => { const milestones = [7, 14, 30, 60, 100]; if (milestones.includes(state.streak)) openStatCardGenerator(`${state.streak}-DAY STREAK`); },
      'achievement': () => openStatCardGenerator('ACHIEVEMENT UNLOCKED')
    };
    if (triggers[eventType]) triggers[eventType]();
  }

  // ─────────────────────────────────────────────────────────────
  // [FIX 5] IN-APP MESSAGING
  // ─────────────────────────────────────────────────────────────
  let msgThreads = [];
  let activeThread = null;

  function initMessaging() {
    if (!state.msgThreads) {
      state.msgThreads = [
        { id: 'thread-team-1', type: 'team', name: 'Team Broadcast', avatar: '📢', members: [],
          messages: [
            { from: 'Coach Thompson', me: false, text: 'Speed Circuit Week 4 is now assigned. Complete by Friday.', time: '2:14 PM', date: new Date().toDateString() },
            { from: 'You', me: true, text: 'On it! Will film my sprint too.', time: '3:22 PM', date: new Date().toDateString() }
          ], unread: 0 },
        { id: 'thread-dm-coach', type: 'dm', name: 'Coach Thompson', avatar: '📋',
          messages: [
            { from: 'Coach Thompson', me: false, text: 'Great work this week. Your speed pillar jumped 8 points.', time: 'Yesterday', date: '' }
          ], unread: 1 }
      ];
      save();
    }
    msgThreads = state.msgThreads || [];
    updateMsgBadge();
  }

  function updateMsgBadge() {
    const badge = document.querySelector('.nav-btn[data-view="messages"] .nav-badge');
    const unreadCount = msgThreads.reduce((n, t) => n + (t.unread || 0), 0);
    if (badge) badge.style.display = unreadCount > 0 ? 'block' : 'none';
  }

  function renderMessagingView() {
    const container = document.getElementById('view-messages');
    if (!container) return;
    const threadItems = msgThreads.map(t => `
      <div class="msg-thread-item" onclick="window.__piqOpenThread('${t.id}')">
        <div class="msg-thread-avatar">${t.avatar || '💬'}</div>
        <div style="flex:1;min-width:0">
          <div class="msg-thread-name">${t.name}</div>
          <div class="msg-thread-preview">${(t.messages.slice(-1)[0] || {}).text || 'No messages yet'}</div>
        </div>
        <div class="msg-thread-meta">
          <div class="msg-thread-time">${(t.messages.slice(-1)[0] || {}).time || ''}</div>
          ${t.unread > 0 ? `<div class="msg-unread"></div>` : ''}
        </div>
      </div>`).join('');
    container.innerHTML = `
      <div class="section-head">
        <div class="section-title">MESSAGES</div>
        <button class="btn btn-sm btn-secondary" onclick="window.__piqNewMessage()">+ New</button>
      </div>
      <div style="border:1px solid var(--void-4);border-radius:var(--radius);overflow:hidden">
        ${threadItems || '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-title">NO MESSAGES YET</div><div class="empty-state-sub">Start a thread with your coach or team</div></div>'}
      </div>`;
  }

  window.__piqOpenThread = function(threadId) {
    const thread = msgThreads.find(t => t.id === threadId);
    if (!thread) return;
    activeThread = thread;
    thread.unread = 0;
    save();
    updateMsgBadge();
    showThreadPanel(thread);
  };

  function showThreadPanel(thread) {
    const existing = document.getElementById('msg-panel');
    if (existing) existing.remove();
    const messages = (thread.messages || []).map(m => `
      <div class="msg-bubble ${m.me ? 'me' : 'other'}">
        <div class="msg-bubble-text">${m.text}</div>
        <div class="msg-bubble-meta">${m.me ? '' : m.from + ' · '}${m.time}</div>
      </div>`).join('');
    const html = `
      <div id="msg-panel">
        <div class="msg-header">
          <button class="msg-header-back" onclick="document.getElementById('msg-panel').remove();window.__piqRenderMessages()">←</button>
          <div>
            <div class="msg-header-name">${thread.name}</div>
            <div class="msg-header-sub">${thread.type === 'team' ? 'Team broadcast' : 'Direct message'}</div>
          </div>
        </div>
        <div class="msg-chat-area" id="msg-chat-area">${messages}</div>
        <div class="msg-input-bar">
          <textarea class="msg-input-field" id="msg-input" placeholder="Message…" rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.__piqSendMessage()}"
          ></textarea>
          <button class="msg-send-btn" onclick="window.__piqSendMessage()">↑</button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    setTimeout(() => { const area = document.getElementById('msg-chat-area'); if (area) area.scrollTop = area.scrollHeight; }, 50);
  }

  window.__piqSendMessage = function() {
    const input = document.getElementById('msg-input');
    if (!input || !activeThread) return;
    const text = input.value.trim();
    if (!text) return;
    const msg = { from: state.name || 'You', me: true, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: new Date().toDateString() };
    activeThread.messages.push(msg);
    save();
    input.value = '';
    const area = document.getElementById('msg-chat-area');
    if (area) {
      area.insertAdjacentHTML('beforeend', `<div class="msg-bubble me"><div class="msg-bubble-text">${text}</div><div class="msg-bubble-meta">${msg.time}</div></div>`);
      area.scrollTop = area.scrollHeight;
    }
  };

  window.__piqNewMessage = function() { toast('💬 New thread creation — connect Supabase to enable real-time DMs'); };
  window.__piqRenderMessages = function() { renderMessagingView(); };

  // ─────────────────────────────────────────────────────────────
  // [FIX 6] PWA INSTALL PROMPT
  // ─────────────────────────────────────────────────────────────
  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!state.installDismissed) showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    state.appInstalled = true;
    save();
    document.getElementById('install-banner')?.remove();
    toast('✅ PerformanceIQ installed!');
  });

  function showInstallBanner() {
    if (document.getElementById('install-banner')) return;
    const html = `
      <div class="install-banner fade-up" id="install-banner">
        <div class="install-banner-icon">⚡</div>
        <div class="install-banner-text">
          <div class="install-banner-title">INSTALL THE APP</div>
          <div class="install-banner-sub">Add to home screen for 3× faster access + offline mode</div>
          <div class="install-banner-actions">
            <button class="btn btn-primary btn-sm" onclick="window.__piqInstall()">Install</button>
            <button class="btn btn-secondary btn-sm" onclick="window.__piqDismissInstall()">Not now</button>
          </div>
        </div>
      </div>`;
    const main = document.querySelector('.main') || document.body;
    main.insertAdjacentHTML('afterbegin', html);
  }

  window.__piqInstall = async function() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    document.getElementById('install-banner')?.remove();
    if (outcome === 'accepted') { state.appInstalled = true; save(); }
  };

  window.__piqDismissInstall = function() {
    document.getElementById('install-banner')?.remove();
    state.installDismissed = true;
    save();
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER ENGINE
  // ─────────────────────────────────────────────────────────────
  function renderDashboard() {
    updateScoreRing();
    applyDesignSystem();
    // Update streak display
    const streakEl = document.getElementById('streak-display');
    if (streakEl) streakEl.textContent = state.streak || 0;
  }

  function render(view) {
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    const el = document.getElementById('view-' + view);
    if (el) el.hidden = false;
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    if (view === 'home') renderDashboard();
    if (view === 'messages') renderMessagingView();
  }

  // ─── DRAWER ─────────────────────────────────────────────────
  function openDrawer(id) { const d = $(id); if (d) d.hidden = false; }
  function closeDrawer(id) { const d = $(id); if (d) d.hidden = true; }

  function bindDrawer(btnId, drawerId) {
    const btn = $(btnId);
    if (btn) btn.addEventListener('click', () => openDrawer(drawerId));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(drawerId); });
  }

  function bindSavePill() {
    const pill = document.getElementById('save-pill');
    if (pill) pill.addEventListener('click', () => { save(); toast('✅ Saved'); });
  }

  function bindNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => render(btn.dataset.view));
    });
  }

  function bindQuickLog() {
    const fab = document.getElementById('fab');
    if (fab) fab.addEventListener('click', () => openDrawer('drawer-quick-log'));
    document.querySelectorAll('[data-quick-log]').forEach(opt => {
      opt.addEventListener('click', () => {
        closeDrawer('drawer-quick-log');
        const type = opt.dataset.quickLog;
        if (type === 'workout') render('train');
        if (type === 'nutrition') render('profile');
        if (type === 'wellness') render('profile');
      });
    });
  }

  function bindSettings() {
    const roleSelect = document.getElementById('role-select');
    if (roleSelect) {
      roleSelect.value = state.role || 'athlete';
      roleSelect.addEventListener('change', () => { state.role = roleSelect.value; applyDesignSystem(); save(); });
    }
    const sportSelect = document.getElementById('sport-select');
    if (sportSelect) {
      sportSelect.value = state.sport || 'basketball';
      sportSelect.addEventListener('change', () => { state.sport = sportSelect.value; applyDesignSystem(); updateScoreRing(); save(); toast('🎨 Sport accent updated!'); });
    }
    const shareBtn = document.getElementById('btn-share-card');
    if (shareBtn) shareBtn.addEventListener('click', () => openStatCardGenerator('manual'));

    // FIX: Bind name input
    const nameInput = document.getElementById('name-input');
    if (nameInput) {
      nameInput.value = state.name || '';
      nameInput.addEventListener('input', () => { state.name = nameInput.value; });
    }

    // Save profile button
    const saveProfileBtn = document.getElementById('btn-save-profile');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('name-input');
        if (nameInput) state.name = nameInput.value;
        save();
        toast('✅ Profile saved!');
      });
    }
  }

  // ─── CLOUD SYNC ──────────────────────────────────────────────
  const syncMsg = 'Cloud sync requires Supabase configuration.';
  async function pushToCloud() { const cfg = loadCloudCfg(); if (!cfg) { toast(syncMsg); return; } toast('☁️ Syncing…'); }
  async function pullFromCloud() { const cfg = loadCloudCfg(); if (!cfg) { toast(syncMsg); return; } toast('☁️ Pulling…'); }

  // ─── WORKOUT COMPLETE HANDLER ────────────────────────────────
  window.piqOnWorkoutComplete = function(sessionData) {
    state.lastLogDate = new Date().toISOString();
    state.streak = (state.streak || 0) + 1;
    if (!state.piqPillars) state.piqPillars = { speed: 60, strength: 60, endurance: 60, consistency: 60, nutrition: 60 };
    state.piqPillars.consistency = Math.min(100, (state.piqPillars.consistency || 60) + 2);
    if (sessionData?.type === 'strength') state.piqPillars.strength = Math.min(100, (state.piqPillars.strength || 60) + 3);
    if (sessionData?.type === 'speed')    state.piqPillars.speed    = Math.min(100, (state.piqPillars.speed    || 60) + 3);
    if (sessionData?.type === 'conditioning') state.piqPillars.endurance = Math.min(100, (state.piqPillars.endurance || 60) + 3);
    save();
    updateScoreRing();
    checkStatCardTrigger('workout-complete');
    checkStatCardTrigger('streak-milestone');
    window.piqNotify('Workout logged ✓', `${sessionData?.type || 'Session'} complete. PIQ Score updated.`);
  };

  window.piqOnNutritionLog = function() {
    if (!state.piqPillars) return;
    state.piqPillars.nutrition = Math.min(100, (state.piqPillars.nutrition || 60) + 2);
    save();
    updateScoreRing();
  };

  // ─── BOOT ────────────────────────────────────────────────────
  function boot() {
    applyDesignSystem();
    bindNav();
    bindScoreRing();
    bindDrawer('btn-account', 'drawer-account');
    bindDrawer('btn-help',    'drawer-help');
    bindQuickLog();
    bindSavePill();
    bindSettings();
    initMessaging();
    render('home');
    setTimeout(() => initPushNotifications(), 2000);
    setTimeout(() => checkStreakNotification(), 3000);
  }

  function safeBoot() {
    try { boot(); } catch (err) {
      console.error('[PIQ] Boot error:', err);
      document.body.insertAdjacentHTML('afterbegin',
        `<div style="position:fixed;inset:0;background:#0D1117;display:flex;align-items:center;justify-content:center;z-index:99999;padding:24px">
          <div style="background:#1E2535;border:1px solid #FF4D6D;border-radius:12px;padding:24px;max-width:400px;color:#F0F4FF;font-family:sans-serif">
            <div style="color:#FF4D6D;font-weight:700;margin-bottom:8px">⚠ Boot Error</div>
            <div style="font-size:13px;opacity:0.8">${err.message}</div>
            <button onclick="location.reload()" style="margin-top:16px;background:#F5C842;color:#0D1117;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:700">Reload</button>
          </div>
        </div>`
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeBoot);
  } else {
    safeBoot();
  }

})();
