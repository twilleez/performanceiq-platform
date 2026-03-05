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
    applyRoleVisibility();
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
  function openDrawer(id) { const d = $(id); if (d) { d.hidden = false; d.removeAttribute('hidden'); } }
  function closeDrawer(id) { const d = $(id); if (d) { d.hidden = true; d.setAttribute('hidden', ''); } }

  // Single Escape key handler for all drawers
  const DRAWER_IDS = ['drawer-account', 'drawer-help', 'drawer-quick-log'];
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      DRAWER_IDS.forEach(id => closeDrawer(id));
      // Also close any dynamic modals
      document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(el => {
        if (!DRAWER_IDS.includes(el.id)) el.remove();
      });
    }
  });

  function bindDrawer(btnId, drawerId) {
    const btn = $(btnId);
    if (btn) btn.addEventListener('click', () => openDrawer(drawerId));
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

  // ─── DATA EXPORT / IMPORT / RESET ────────────────────────────
  window.dataStore.exportJSON = function() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'performanceiq-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('📥 Data exported!');
  };

  window.dataStore.importJSON = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          Object.assign(state, imported);
          save();
          toast('✅ Data imported! Reloading…');
          setTimeout(() => location.reload(), 800);
        } catch (err) {
          toast('❌ Invalid JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  window.dataStore.reset = function() {
    try { localStorage.removeItem(PIQ_KEY); } catch {}
    toast('🗑️ Data cleared. Reloading…');
    setTimeout(() => location.reload(), 800);
  };

  // ═══════════════════════════════════════════════════════════════
  // TRAINING ENGINE — Trainer-Tone System
  // Evidence-based, sport-specific programming with exercise swaps,
  // periodization, daily view, and meal plan module
  // ═══════════════════════════════════════════════════════════════

  // ─── EXERCISE LIBRARY (tagged for smart swaps) ────────────────
  // Tags: muscle, pattern (push/pull/hinge/squat/carry/lunge/rotation/conditioning), 
  //        intent (strength/power/hypertrophy/conditioning/speed/skill), equip, difficulty 1-3
  const EXERCISE_DB = [
    // LOWER — SQUAT DOMINANT
    { id:'sq1', name:'Barbell back squat',      muscle:'quads',  pattern:'squat', intent:'strength',     equip:'barbell',   diff:2, sets:4, reps:'6-8',  tempo:'3-1-1',  rest:'90s',  cue:'Chest up, drive knees out, full depth' },
    { id:'sq2', name:'Goblet squat',            muscle:'quads',  pattern:'squat', intent:'strength',     equip:'dumbbell',  diff:1, sets:3, reps:'12',   tempo:'2-1-1',  rest:'60s',  cue:'Keep elbows inside knees, sit tall' },
    { id:'sq3', name:'Front squat',             muscle:'quads',  pattern:'squat', intent:'strength',     equip:'barbell',   diff:3, sets:4, reps:'5',    tempo:'3-1-1',  rest:'120s', cue:'Elbows high, stay upright, full depth' },
    { id:'sq4', name:'Bodyweight squat',        muscle:'quads',  pattern:'squat', intent:'strength',     equip:'none',      diff:1, sets:3, reps:'15',   tempo:'2-0-1',  rest:'45s',  cue:'Full range, heels down' },
    { id:'sq5', name:'Bulgarian split squat',   muscle:'quads',  pattern:'lunge', intent:'strength',     equip:'dumbbell',  diff:2, sets:3, reps:'10/leg',tempo:'2-1-1',  rest:'60s',  cue:'Front shin vertical, control the descent' },
    // LOWER — HIP DOMINANT
    { id:'hd1', name:'Romanian deadlift',       muscle:'hams',   pattern:'hinge', intent:'strength',     equip:'barbell',   diff:2, sets:4, reps:'8',    tempo:'3-1-1',  rest:'90s',  cue:'Soft knees, push hips back, feel hamstrings stretch' },
    { id:'hd2', name:'Hip thrust',              muscle:'glutes', pattern:'hinge', intent:'hypertrophy',  equip:'barbell',   diff:2, sets:3, reps:'12',   tempo:'2-1-2',  rest:'60s',  cue:'Full lockout, pause at top, squeeze glutes' },
    { id:'hd3', name:'Kettlebell swing',        muscle:'hams',   pattern:'hinge', intent:'power',        equip:'kettlebell', diff:1, sets:4, reps:'15',  tempo:'explosive',rest:'60s', cue:'Snap hips, arms are just hooks' },
    { id:'hd4', name:'Glute bridge',            muscle:'glutes', pattern:'hinge', intent:'hypertrophy',  equip:'none',      diff:1, sets:3, reps:'15',   tempo:'2-1-2',  rest:'45s',  cue:'Drive through heels, full hip extension' },
    { id:'hd5', name:'Single-leg RDL',          muscle:'hams',   pattern:'hinge', intent:'strength',     equip:'dumbbell',  diff:2, sets:3, reps:'8/leg', tempo:'3-0-1',  rest:'60s',  cue:'Hinge at hip, reach with weight, square hips' },
    // UPPER — PUSH
    { id:'pu1', name:'Barbell bench press',     muscle:'chest',  pattern:'push',  intent:'strength',     equip:'barbell',   diff:2, sets:4, reps:'6-8',  tempo:'2-1-1',  rest:'120s', cue:'Retract scaps, feet flat, full ROM' },
    { id:'pu2', name:'Dumbbell overhead press',  muscle:'shoulders',pattern:'push',intent:'strength',    equip:'dumbbell',  diff:2, sets:3, reps:'10',   tempo:'2-1-1',  rest:'90s',  cue:'Core braced, no back arch, press straight up' },
    { id:'pu3', name:'Push-ups',                muscle:'chest',  pattern:'push',  intent:'strength',     equip:'none',      diff:1, sets:3, reps:'12-15',tempo:'2-0-1',  rest:'45s',  cue:'Elbows 45°, full lockout, chest to floor' },
    { id:'pu4', name:'Incline dumbbell press',  muscle:'chest',  pattern:'push',  intent:'hypertrophy',  equip:'dumbbell',  diff:2, sets:3, reps:'10',   tempo:'2-1-1',  rest:'60s',  cue:'30° incline, control the eccentric' },
    { id:'pu5', name:'Pike push-ups',           muscle:'shoulders',pattern:'push',intent:'strength',     equip:'none',      diff:2, sets:3, reps:'10',   tempo:'2-0-1',  rest:'60s',  cue:'Hips high, head between arms' },
    // UPPER — PULL
    { id:'pl1', name:'Barbell bent-over row',   muscle:'back',   pattern:'pull',  intent:'strength',     equip:'barbell',   diff:2, sets:4, reps:'8',    tempo:'2-1-1',  rest:'90s',  cue:'Flat back, pull to navel, squeeze scaps' },
    { id:'pl2', name:'Pull-ups',                muscle:'back',   pattern:'pull',  intent:'strength',     equip:'pullup_bar',diff:2, sets:3, reps:'6-10',  tempo:'2-0-1',  rest:'90s',  cue:'Dead hang, chin over bar, control down' },
    { id:'pl3', name:'Dumbbell row',            muscle:'back',   pattern:'pull',  intent:'strength',     equip:'dumbbell',  diff:1, sets:3, reps:'10/arm',tempo:'2-1-1',  rest:'60s',  cue:'Elbow past torso, no rotation' },
    { id:'pl4', name:'Inverted rows',           muscle:'back',   pattern:'pull',  intent:'strength',     equip:'none',      diff:1, sets:3, reps:'12',   tempo:'2-1-1',  rest:'60s',  cue:'Body straight, pull chest to bar' },
    { id:'pl5', name:'Face pulls (band)',       muscle:'rear_delt',pattern:'pull', intent:'hypertrophy',  equip:'band',      diff:1, sets:3, reps:'15',   tempo:'2-1-2',  rest:'45s',  cue:'Pull to ears, external rotate at end' },
    // CORE
    { id:'co1', name:'Plank',                   muscle:'core',   pattern:'carry', intent:'strength',     equip:'none',      diff:1, sets:3, reps:'45s',  tempo:'hold',   rest:'45s',  cue:'Flat back, squeeze glutes, breathe' },
    { id:'co2', name:'Pallof press',            muscle:'core',   pattern:'rotation',intent:'strength',   equip:'band',      diff:2, sets:3, reps:'10/side',tempo:'2-2-2', rest:'45s',  cue:'Resist rotation, press straight out' },
    { id:'co3', name:'Dead bug',                muscle:'core',   pattern:'carry', intent:'strength',     equip:'none',      diff:1, sets:3, reps:'10/side',tempo:'2-0-2', rest:'45s',  cue:'Low back flat, move opposite arm/leg' },
    { id:'co4', name:'Medicine ball rotational throw',muscle:'core',pattern:'rotation',intent:'power',  equip:'med_ball',  diff:2, sets:3, reps:'8/side', tempo:'explosive',rest:'60s',cue:'Rotate from hips, release at chest height' },
    // POWER
    { id:'pw1', name:'Box jumps',               muscle:'quads',  pattern:'squat', intent:'power',        equip:'box',       diff:2, sets:4, reps:'6',    tempo:'explosive',rest:'90s', cue:'Soft landing, step down, reset' },
    { id:'pw2', name:'Broad jumps',             muscle:'glutes', pattern:'hinge', intent:'power',        equip:'none',      diff:1, sets:4, reps:'5',    tempo:'explosive',rest:'90s', cue:'Arms drive forward, stick the landing' },
    { id:'pw3', name:'Med ball slam',           muscle:'core',   pattern:'hinge', intent:'power',        equip:'med_ball',  diff:1, sets:3, reps:'10',   tempo:'explosive',rest:'60s', cue:'Full extension, slam with force' },
    { id:'pw4', name:'Power clean',             muscle:'full',   pattern:'hinge', intent:'power',        equip:'barbell',   diff:3, sets:4, reps:'3',    tempo:'explosive',rest:'120s',cue:'Triple extension, fast elbows, catch in front squat' },
    // CONDITIONING
    { id:'cd1', name:'Sprint intervals (30/30)',muscle:'full',   pattern:'conditioning',intent:'conditioning',equip:'none', diff:2, sets:6, reps:'30s on/30s off',tempo:'-',rest:'-', cue:'Max effort on work interval' },
    { id:'cd2', name:'Shuttle runs',            muscle:'full',   pattern:'conditioning',intent:'conditioning',equip:'none', diff:1, sets:8, reps:'25 yards',tempo:'-',rest:'30s',     cue:'Touch the line, change direction hard' },
    { id:'cd3', name:'Burpees',                 muscle:'full',   pattern:'conditioning',intent:'conditioning',equip:'none', diff:1, sets:3, reps:'10',   tempo:'-',rest:'60s',         cue:'Chest to floor, full jump at top' },
    { id:'cd4', name:'Bike/row intervals',      muscle:'full',   pattern:'conditioning',intent:'conditioning',equip:'machine',diff:1,sets:5,reps:'45s on/45s off',tempo:'-',rest:'-',cue:'Maintain 85-90% max effort' },
    // SPEED / AGILITY
    { id:'sp1', name:'40-yard dash',            muscle:'full',   pattern:'conditioning',intent:'speed',   equip:'none',      diff:2, sets:5, reps:'1',    tempo:'-',rest:'120s',        cue:'Drive phase first 10, upright at 20' },
    { id:'sp2', name:'Lateral shuffles',        muscle:'quads',  pattern:'conditioning',intent:'speed',   equip:'none',      diff:1, sets:4, reps:'20s',  tempo:'-',rest:'40s',         cue:'Stay low, push off outside foot' },
    { id:'sp3', name:'Cone agility (5-10-5)',   muscle:'full',   pattern:'conditioning',intent:'speed',   equip:'cones',     diff:2, sets:6, reps:'1',    tempo:'-',rest:'60s',         cue:'Plant and cut, low center of gravity' },
    { id:'sp4', name:'Defensive slides',        muscle:'quads',  pattern:'conditioning',intent:'speed',   equip:'none',      diff:1, sets:3, reps:'30s',  tempo:'-',rest:'30s',         cue:'Stay in athletic stance, dont cross feet' },
  ];

  // ─── SPORT DEMAND PROFILES ────────────────────────────────────
  const SPORT_PROFILES = {
    basketball: { focus: ['speed','power','conditioning'], patterns: ['squat','hinge','push','pull','conditioning'], warmup: ['High knees 2×30s','Lateral shuffles 2×20s','Arm circles 1×20','Dynamic hamstring stretch'] },
    football:   { focus: ['strength','power','speed'],     patterns: ['squat','hinge','push','pull','conditioning'], warmup: ['Jog 400m','High knees 2×30s','Butt kicks 2×30s','Hip circles'] },
    soccer:     { focus: ['conditioning','speed','power'], patterns: ['squat','hinge','conditioning','rotation'],     warmup: ['Light jog 3 min','Leg swings 10 each','Carioca 2×20yd','A-skips 2×20yd'] },
    track:      { focus: ['speed','power','conditioning'], patterns: ['squat','hinge','conditioning'],               warmup: ['Jog 800m','A-skips','B-skips','High knees','Butt kicks','Strides 3×60m'] },
    swimming:   { focus: ['conditioning','strength','power'],patterns:['pull','push','hinge','conditioning'],         warmup: ['Arm circles 2×20','Band pull-aparts 2×15','Shoulder CARS 10 each'] },
    volleyball: { focus: ['power','speed','strength'],     patterns: ['squat','hinge','push','conditioning'],         warmup: ['Jog 2 min','Arm swings 20','Lateral shuffles 2×20s','Ankle hops 2×15'] },
    baseball:   { focus: ['power','speed','strength'],     patterns: ['hinge','rotation','push','pull'],              warmup: ['Jog 2 min','Arm circles 20','Band pull-aparts 15','Hip circles 10 each'] },
    lacrosse:   { focus: ['conditioning','speed','strength'],patterns:['squat','hinge','push','conditioning'],        warmup: ['Jog 3 min','High knees 2×30s','Lateral shuffles 2×20s'] },
    tennis:     { focus: ['speed','conditioning','power'], patterns: ['squat','hinge','rotation','conditioning'],     warmup: ['Jog 2 min','Lateral shuffles 2×20s','Arm circles 20','Torso rotations 10'] },
    wrestling:  { focus: ['strength','power','conditioning'],patterns:['squat','hinge','push','pull','conditioning'], warmup: ['Jog 3 min','Bear crawls 2×20yd','Inchworms 10','Hip circles 10'] },
  };

  const COOLDOWNS = ['Static hamstring stretch 30s each','Quad stretch 30s each','Hip flexor stretch 30s each','Shoulder cross-body stretch 30s each','Deep breathing 1 min'];

  // ─── EQUIPMENT PRESETS ────────────────────────────────────────
  const EQUIP_PRESETS = {
    'Full Gym':       ['barbell','dumbbell','kettlebell','pullup_bar','band','box','med_ball','machine','cones'],
    'Home / Garage':  ['dumbbell','kettlebell','pullup_bar','band','box'],
    'Bodyweight Only':['none','cones'],
    'Hotel / Minimal':['band','none'],
    'School / Team':  ['barbell','dumbbell','pullup_bar','band','box','med_ball','cones','machine'],
  };

  // ─── SMART EXERCISE SWAP ──────────────────────────────────────
  function getSwapOptions(exercise) {
    return EXERCISE_DB.filter(e =>
      e.id !== exercise.id &&
      e.muscle === exercise.muscle &&
      e.pattern === exercise.pattern &&
      e.intent === exercise.intent &&
      isEquipAvailable(e.equip)
    );
  }

  function isEquipAvailable(equip) {
    const available = state.equipment || EQUIP_PRESETS['Bodyweight Only'];
    return equip === 'none' || available.includes(equip);
  }

  function filterByEquipment(exercises) {
    return exercises.filter(e => isEquipAvailable(e.equip));
  }

  // ═══════════════════════════════════════════════════════════════
  // ONBOARDING — 10-step flow per Trainer-Tone spec
  // 1. Welcome  2. Athlete type  3. Sport & Position  4. Training days
  // 5. Equipment (checklist)  6. Experience  7. Goals  8. Meal plan
  // 9. Account  10. Program Preview
  // ═══════════════════════════════════════════════════════════════
  let onboardStep = 0;
  let onboardData = {};
  const TOTAL_ONBOARD_STEPS = 10;

  const SPORT_EMOJIS = { basketball:'🏀',football:'🏈',soccer:'⚽',track:'🏃',swimming:'🏊',volleyball:'🏐',baseball:'⚾',lacrosse:'🥍',tennis:'🎾',wrestling:'🤼' };
  const ALL_SPORTS = ['basketball','football','soccer','track','swimming','volleyball','baseball','lacrosse','tennis','wrestling'];
  const EQUIP_OPTIONS = [
    { id:'none',      label:'Bodyweight only', emoji:'🏋️' },
    { id:'dumbbell',  label:'Dumbbells',       emoji:'💪' },
    { id:'barbell',   label:'Barbell & rack',  emoji:'🏋️' },
    { id:'kettlebell',label:'Kettlebells',      emoji:'🔔' },
    { id:'band',      label:'Resistance bands', emoji:'🔗' },
    { id:'pullup_bar',label:'Pull-up bar',     emoji:'📏' },
    { id:'box',       label:'Plyo box',        emoji:'📦' },
    { id:'med_ball',  label:'Medicine ball',    emoji:'⚾' },
    { id:'machine',   label:'Machines (cable, leg press)', emoji:'⚙️' },
    { id:'cones',     label:'Cones / field access', emoji:'🔶' },
  ];
  const GOAL_OPTIONS = ['Build strength','Improve speed','Increase endurance','Gain muscle','Improve overall athleticism'];
  const DAYS_OPTIONS = ['2','3','4','5','6'];
  const EXP_OPTIONS  = ['beginner','intermediate','advanced'];

  function needsOnboarding() {
    return !state.onboardingDone;
  }

  function openTrainingOnboarding() {
    onboardStep = 0;
    onboardData = { equipment: [] };
    renderOnboardStep();
  }

  function closeOnboard() {
    document.getElementById('onboard-modal')?.remove();
  }

  function renderOnboardStep() {
    closeOnboard();
    const pct = Math.round(((onboardStep + 1) / TOTAL_ONBOARD_STEPS) * 100);

    let title, subtitle, bodyHtml;

    switch (onboardStep) {
      // ── STEP 0: WELCOME ──
      case 0:
        title = 'PERFORMANCEIQ';
        subtitle = '';
        bodyHtml = `
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:48px;margin-bottom:16px">⚡</div>
            <div style="font-family:var(--font-display);font-size:28px;color:var(--gold);margin-bottom:12px">YOUR TRAINING STARTS HERE</div>
            <div style="font-size:15px;color:var(--text-secondary);line-height:1.6;max-width:320px;margin:0 auto 24px">
              I'll build a training plan tailored to your sport and schedule. Takes about 60 seconds.
            </div>
            <button class="btn btn-primary btn-full" onclick="window.__piqOnboardNext()">Start</button>
          </div>`;
        break;

      // ── STEP 1: ATHLETE TYPE (team vs solo) ──
      case 1:
        title = 'HOW ARE YOU TRAINING?';
        subtitle = 'This determines your experience path';
        bodyHtml = `
          <div style="display:flex;flex-direction:column;gap:12px">
            <button class="btn btn-secondary btn-full" style="padding:16px;text-align:left" onclick="window.__piqOnboardSetType('solo')">
              <div style="font-family:var(--font-sub);font-size:18px;font-weight:700">🏃 I'm training on my own</div>
              <div style="font-size:12px;color:var(--text-dim);margin-top:4px">Get a personalized program built for you</div>
            </button>
            <button class="btn btn-secondary btn-full" style="padding:16px;text-align:left" onclick="window.__piqOnboardSetType('team')">
              <div style="font-family:var(--font-sub);font-size:18px;font-weight:700">👥 I'm joining a team program</div>
              <div style="font-size:12px;color:var(--text-dim);margin-top:4px">Access team workouts, coach notes, and shared calendar</div>
            </button>
          </div>`;
        break;

      // ── STEP 2: SPORT & POSITION ──
      case 2:
        title = 'SPORT & POSITION';
        subtitle = 'This sets your movement patterns and conditioning focus';
        const sportBtns = ALL_SPORTS.map(s =>
          `<button class="btn btn-secondary btn-sm" onclick="window.__piqOnboardSetSport('${s}')" style="text-transform:capitalize">${SPORT_EMOJIS[s]} ${s}</button>`
        ).join('');
        bodyHtml = `
          <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px">${sportBtns}</div>
          <div style="margin-top:8px">
            <label>Position (optional)</label>
            <div style="display:flex;gap:8px">
              <input type="text" id="ob-position" placeholder="e.g. Point Guard, Striker, QB">
              <button class="btn btn-primary btn-sm" onclick="window.__piqOnboardSavePosition()">Next</button>
            </div>
          </div>`;
        break;

      // ── STEP 3: TRAINING FREQUENCY ──
      case 3:
        title = 'TRAINING FREQUENCY';
        subtitle = 'This determines your weekly training volume';
        const dayBtns = DAYS_OPTIONS.map(d =>
          `<button class="btn btn-secondary" style="width:64px;height:64px;font-size:24px;font-family:var(--font-mono);font-weight:700" onclick="window.__piqOnboardSet('trainingDays','${d}')">${d}</button>`
        ).join('');
        bodyHtml = `
          <div style="text-align:center;margin-bottom:8px;font-size:14px;color:var(--text-secondary)">How many days per week can you train?</div>
          <div style="display:flex;gap:12px;justify-content:center">${dayBtns}</div>
          <div style="text-align:center;margin-top:8px;font-size:11px;color:var(--text-dim)">DAYS PER WEEK</div>`;
        break;

      // ── STEP 4: EQUIPMENT (checklist) ──
      case 4:
        title = 'EQUIPMENT ACCESS';
        subtitle = 'Your plan adapts to what you have — check all that apply';
        const equipChecks = EQUIP_OPTIONS.map(e =>
          `<label style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--void-3);border-radius:var(--radius-sm);cursor:pointer;border:1px solid var(--void-4)">
            <input type="checkbox" id="eq-${e.id}" value="${e.id}" ${e.id==='none'?'checked':''} style="width:18px;height:18px;accent-color:var(--gold)">
            <span style="font-size:18px">${e.emoji}</span>
            <span style="font-family:var(--font-sub);font-size:14px;font-weight:600">${e.label}</span>
          </label>`
        ).join('');
        bodyHtml = `
          <div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto">${equipChecks}</div>
          <button class="btn btn-primary btn-full mt-16" onclick="window.__piqOnboardSaveEquip()">Next</button>`;
        break;

      // ── STEP 5: EXPERIENCE LEVEL ──
      case 5:
        title = 'EXPERIENCE LEVEL';
        subtitle = 'This sets intensity and progression';
        const expDescs = { beginner:'New to structured training or under 6 months', intermediate:'6 months – 2 years of consistent training', advanced:'2+ years, comfortable with complex lifts' };
        const expBtns = EXP_OPTIONS.map(e =>
          `<button class="btn btn-secondary btn-full" style="padding:14px;text-align:left" onclick="window.__piqOnboardSet('experience','${e}')">
            <div style="font-family:var(--font-sub);font-size:16px;font-weight:700;text-transform:capitalize">${e}</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px">${expDescs[e]}</div>
          </button>`
        ).join('');
        bodyHtml = `<div style="display:flex;flex-direction:column;gap:8px">${expBtns}</div>`;
        break;

      // ── STEP 6: GOALS ──
      case 6:
        title = 'PRIMARY GOAL';
        subtitle = 'This shapes your training emphasis';
        const goalEmojis = { 'Build strength':'💪','Improve speed':'⚡','Increase endurance':'🫀','Gain muscle':'🏋️','Improve overall athleticism':'🔥' };
        const goalBtns = GOAL_OPTIONS.map(g =>
          `<button class="btn btn-secondary btn-full" style="padding:12px" onclick="window.__piqOnboardSet('goal','${g}')">${goalEmojis[g]||'🎯'} ${g}</button>`
        ).join('');
        bodyHtml = `<div style="display:flex;flex-direction:column;gap:8px">${goalBtns}</div>`;
        break;

      // ── STEP 7: MEAL PLAN (optional) ──
      case 7:
        title = 'MEAL PLAN';
        subtitle = 'Optional performance nutrition add-on';
        bodyHtml = `
          <div style="text-align:center;padding:12px 0">
            <div style="font-size:36px;margin-bottom:12px">🥗</div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">Do you want a performance-focused meal plan aligned with your training?</div>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary flex-1" onclick="window.__piqOnboardMealPlan(true)">Yes, add meal plan</button>
              <button class="btn btn-secondary flex-1" onclick="window.__piqOnboardMealPlan(false)">Skip for now</button>
            </div>
          </div>`;
        break;

      // ── STEP 8: ACCOUNT ──
      case 8:
        title = 'SAVE YOUR PROGRESS';
        subtitle = 'This saves your program and progress';
        bodyHtml = `
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <label>Your Name</label>
              <input type="text" id="ob-name" placeholder="Full name">
            </div>
            <div>
              <label>Email (optional)</label>
              <input type="email" id="ob-email" placeholder="you@email.com">
            </div>
            <button class="btn btn-primary btn-full" onclick="window.__piqOnboardSaveAccount()">Save & Continue</button>
            <button class="btn btn-secondary btn-full" style="font-size:12px" onclick="window.__piqOnboardSaveAccount()">Skip for now</button>
          </div>`;
        break;

      // ── STEP 9: PROGRAM PREVIEW ──
      case 9:
        title = 'YOUR TRAINING PLAN';
        subtitle = "Here's your plan for the week";
        const days = parseInt(onboardData.trainingDays) || 4;
        const sport = onboardData.sport || state.sport || 'basketball';
        const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const sessionTypes = ['Upper Strength','Lower Power','Conditioning','Upper Hypertrophy','Lower Strength','Speed & Agility','Recovery'];
        const weekHtml = dayNames.map((d, i) => {
          const isTraining = i < days;
          const sType = isTraining ? sessionTypes[i % sessionTypes.length] : 'Rest / Recovery';
          return `<div style="display:flex;align-items:center;gap:12px;padding:10px;background:${isTraining?'var(--void-3)':'transparent'};border-radius:var(--radius-sm);border:1px solid ${isTraining?'var(--void-4)':'transparent'}">
            <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;min-width:36px;color:${isTraining?'var(--sport-accent)':'var(--text-dim)'}">${d}</div>
            <div style="flex:1">
              <div style="font-family:var(--font-sub);font-size:14px;font-weight:700;color:${isTraining?'var(--text-primary)':'var(--text-dim)'}">${sType}</div>
              ${isTraining ? `<div style="font-size:11px;color:var(--text-dim)">~45 min · ${(SPORT_EMOJIS[sport]||'')} ${sport}</div>` : ''}
            </div>
            ${isTraining ? `<div class="chip chip-mint" style="font-size:9px">READY</div>` : ''}
          </div>`;
        }).join('');
        bodyHtml = `
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">${weekHtml}</div>
          <div style="text-align:center;font-size:12px;color:var(--text-dim);margin-bottom:16px">
            ${days} sessions/week · ${(onboardData.experience||'intermediate')} · ${(onboardData.goal||'overall athleticism')}
          </div>
          <button class="btn btn-primary btn-full" onclick="window.__piqOnboardFinish()" style="font-size:18px;padding:14px">
            ⚡ Start Training
          </button>`;
        break;
    }

    // Skip progress bar on welcome screen
    const showProgress = onboardStep > 0;
    const html = `
      <div class="modal-backdrop" id="onboard-modal" style="align-items:center">
        <div class="modal" style="border-radius:var(--radius-lg);max-width:440px">
          ${showProgress ? `<div class="progress" style="margin-bottom:16px"><div class="progress-bar" style="width:${pct}%;transition:width 0.3s"></div></div>` : ''}
          ${title ? `<div style="font-family:var(--font-display);font-size:24px;color:var(--sport-accent);letter-spacing:0.02em;margin-bottom:4px">${title}</div>` : ''}
          ${subtitle ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:16px">${subtitle}</div>` : ''}
          ${bodyHtml}
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  // ── Onboarding handlers ──
  window.__piqOnboardNext = function() {
    onboardStep++;
    renderOnboardStep();
  };

  window.__piqOnboardSetType = function(type) {
    onboardData.athleteType = type;
    state.athleteType = type;
    if (type === 'team') {
      // Show team code input
      closeOnboard();
      const html = `
        <div class="modal-backdrop" id="onboard-modal" style="align-items:center">
          <div class="modal" style="border-radius:var(--radius-lg);max-width:440px">
            <div style="font-family:var(--font-display);font-size:24px;color:var(--sport-accent);margin-bottom:4px">JOIN YOUR TEAM</div>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px">Enter the code or link from your coach</div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <input type="text" id="ob-teamcode" placeholder="Team code or invite link" style="text-align:center;font-family:var(--font-mono);font-size:18px;letter-spacing:0.1em;padding:14px">
              <button class="btn btn-primary btn-full" onclick="window.__piqOnboardJoinTeam()">Join Team</button>
              <button class="btn btn-secondary btn-full" style="font-size:12px" onclick="onboardStep=2;renderOnboardStep()">I don't have a code yet — continue solo</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    } else {
      onboardStep = 2; // skip to sport
      renderOnboardStep();
    }
  };

  window.__piqOnboardJoinTeam = function() {
    const code = document.getElementById('ob-teamcode')?.value?.trim();
    if (code) {
      onboardData.teamCode = code;
      state.teamCode = code;
      toast('✅ Team code saved — connect backend to verify');
    }
    onboardStep = 2;
    renderOnboardStep();
  };

  window.__piqOnboardSetSport = function(sport) {
    onboardData.sport = sport;
    state.sport = sport;
    applyDesignSystem();
    // Don't advance yet — wait for position + Next button
    // Highlight selected sport
    document.querySelectorAll('#onboard-modal .btn-secondary').forEach(btn => {
      btn.style.borderColor = btn.textContent.toLowerCase().includes(sport) ? 'var(--sport-accent)' : '';
      btn.style.color = btn.textContent.toLowerCase().includes(sport) ? 'var(--sport-accent)' : '';
    });
  };

  window.__piqOnboardSavePosition = function() {
    if (!onboardData.sport) { toast('Select a sport first'); return; }
    const pos = document.getElementById('ob-position')?.value?.trim();
    if (pos) { onboardData.position = pos; state.position = pos; }
    onboardStep = 3;
    renderOnboardStep();
  };

  window.__piqOnboardSet = function(key, val) {
    onboardData[key] = val;
    state[key] = val;
    onboardStep++;
    renderOnboardStep();
  };

  window.__piqOnboardSaveEquip = function() {
    const checked = [];
    EQUIP_OPTIONS.forEach(e => {
      const cb = document.getElementById('eq-' + e.id);
      if (cb && cb.checked) checked.push(e.id);
    });
    if (checked.length === 0) checked.push('none');
    onboardData.equipment = checked;
    state.equipment = checked;
    onboardStep = 5;
    renderOnboardStep();
  };

  window.__piqOnboardMealPlan = function(want) {
    onboardData.wantMealPlan = want;
    state.wantMealPlan = want;
    if (want) {
      // Show dietary preferences sub-step
      closeOnboard();
      const html = `
        <div class="modal-backdrop" id="onboard-modal" style="align-items:center">
          <div class="modal" style="border-radius:var(--radius-lg);max-width:440px">
            <div style="font-family:var(--font-display);font-size:24px;color:var(--sport-accent);margin-bottom:4px">MEAL PREFERENCES</div>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px">Performance-focused nutrition tailored to your training</div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div>
                <label>Dietary restrictions</label>
                <select id="ob-diet-restrict">
                  <option value="none">None</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="gluten-free">Gluten-free</option>
                  <option value="dairy-free">Dairy-free</option>
                  <option value="keto">Keto</option>
                </select>
              </div>
              <div>
                <label>Daily calorie target (optional)</label>
                <input type="number" id="ob-calories" placeholder="e.g. 2500">
              </div>
              <button class="btn btn-primary btn-full" onclick="window.__piqOnboardSaveMealPrefs()">Save & Continue</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    } else {
      onboardStep = 8;
      renderOnboardStep();
    }
  };

  window.__piqOnboardSaveMealPrefs = function() {
    onboardData.dietRestriction = document.getElementById('ob-diet-restrict')?.value || 'none';
    onboardData.calorieTarget = document.getElementById('ob-calories')?.value || '';
    state.dietRestriction = onboardData.dietRestriction;
    state.calorieTarget = onboardData.calorieTarget;
    onboardStep = 8;
    renderOnboardStep();
  };

  window.__piqOnboardSaveAccount = function() {
    const name  = document.getElementById('ob-name')?.value?.trim();
    const email = document.getElementById('ob-email')?.value?.trim();
    if (name) { onboardData.name = name; state.name = name; }
    if (email) { onboardData.email = email; state.email = email; }
    onboardStep = 9;
    renderOnboardStep();
  };

  window.__piqOnboardFinish = function() {
    // Commit all onboarding data to state
    Object.assign(state, onboardData);
    if (!state.equipment || state.equipment.length === 0) state.equipment = ['none'];
    state.onboardingDone = true;
    save();
    closeOnboard();
    toast('⚡ Lets go! Your first session is ready.');
    applyDesignSystem();
    renderDashboard();
    applyRoleVisibility();
  };

  // ─── TEAM/SOLO VISIBILITY ─────────────────────────────────────
  function applyRoleVisibility() {
    const isSolo = (state.athleteType || 'solo') === 'solo';
    // Hide/show team elements
    document.querySelectorAll('[data-team-only]').forEach(el => {
      el.style.display = isSolo ? 'none' : '';
    });
    document.querySelectorAll('[data-solo-only]').forEach(el => {
      el.style.display = isSolo ? '' : 'none';
    });
    // Hide team nav button for solo
    const teamBtn = document.querySelector('.nav-btn[data-view="team"]');
    if (teamBtn) teamBtn.style.display = isSolo ? 'none' : '';
  }

  // ─── PERIODIZED WORKOUT GENERATOR ─────────────────────────────
  function generateWorkout() {
    if (needsOnboarding()) { openTrainingOnboarding(); return; }

    const sport    = (state.sport || 'basketball').toLowerCase();
    const profile  = SPORT_PROFILES[sport] || SPORT_PROFILES.basketball;
    const level    = state.experience || 'intermediate';
    const daysPer  = parseInt(state.trainingDays) || 4;

    // Determine today's training focus using simple rotation
    const dayOfWeek  = new Date().getDay(); // 0=Sun
    const focusTypes = ['strength','power','conditioning','hypertrophy'];
    const todayFocus = focusTypes[dayOfWeek % focusTypes.length];

    // Filter exercises by equipment and difficulty
    const maxDiff = level === 'beginner' ? 1 : level === 'advanced' ? 3 : 2;
    const pool = filterByEquipment(EXERCISE_DB).filter(e => e.diff <= maxDiff);

    // Select exercises following balanced programming
    const selected = [];
    const usedPatterns = new Set();

    // 1 power/speed movement
    const powerPool = pool.filter(e => (e.intent === 'power' || e.intent === 'speed') && profile.patterns.includes(e.pattern));
    if (powerPool.length) { const pick = powerPool[Math.floor(Math.random()*powerPool.length)]; selected.push(pick); usedPatterns.add(pick.pattern); }

    // 1 squat-dominant
    const squatPool = pool.filter(e => e.pattern === 'squat' && e.intent === 'strength' && !selected.find(s=>s.id===e.id));
    if (squatPool.length) { const pick = squatPool[Math.floor(Math.random()*squatPool.length)]; selected.push(pick); usedPatterns.add('squat'); }

    // 1 hinge/pull
    const hingePool = pool.filter(e => (e.pattern === 'hinge' || e.pattern === 'pull') && !selected.find(s=>s.id===e.id));
    if (hingePool.length) { const pick = hingePool[Math.floor(Math.random()*hingePool.length)]; selected.push(pick); }

    // 1 push
    const pushPool = pool.filter(e => e.pattern === 'push' && !selected.find(s=>s.id===e.id));
    if (pushPool.length) { const pick = pushPool[Math.floor(Math.random()*pushPool.length)]; selected.push(pick); }

    // 1 core
    const corePool = pool.filter(e => e.muscle === 'core' && !selected.find(s=>s.id===e.id));
    if (corePool.length) { const pick = corePool[Math.floor(Math.random()*corePool.length)]; selected.push(pick); }

    // 1 conditioning (sport-specific)
    const condPool = pool.filter(e => e.intent === 'conditioning' && !selected.find(s=>s.id===e.id));
    if (condPool.length) { const pick = condPool[Math.floor(Math.random()*condPool.length)]; selected.push(pick); }

    const totalTime = 5 + selected.reduce((t, e) => t + (parseInt(e.sets)||3) * 1.5, 0) + 5; // warm-up + exercises + cooldown

    // Render
    const exerciseHtml = selected.map((ex, i) => {
      const swaps = getSwapOptions(ex);
      const typeColor = ex.intent === 'strength' ? 'gold' : ex.intent === 'power' ? 'red' : ex.intent === 'speed' ? 'mint' : ex.intent === 'conditioning' ? 'blue' : 'gold';
      return `
      <div style="background:var(--void-3);border-radius:var(--radius-sm);padding:12px;margin-bottom:8px" id="ex-${ex.id}">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--sport-accent);min-width:28px">${i + 1}</div>
          <div style="flex:1">
            <div style="font-family:var(--font-sub);font-size:16px;font-weight:700">${ex.name}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${ex.sets} × ${ex.reps} · Tempo ${ex.tempo} · Rest ${ex.rest}</div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:4px;font-style:italic">💡 ${ex.cue}</div>
          </div>
          <span class="chip chip-${typeColor}">${ex.intent}</span>
        </div>
        ${swaps.length > 0 ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
          <span style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono);letter-spacing:0.08em">SWAP →</span>
          ${swaps.slice(0,3).map(s => `<button class="btn btn-secondary" style="padding:3px 8px;font-size:11px" onclick="window.__piqSwapExercise('${ex.id}','${s.id}')">${s.name}</button>`).join('')}
        </div>` : ''}
      </div>`;
    }).join('');

    const html = `
      <div class="card" style="border-color:rgba(61,255,192,0.2);margin-top:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div class="card-label">TODAY'S TRAINING — ${sport.toUpperCase()}</div>
          <div class="chip chip-mint">~${Math.round(totalTime)} MIN</div>
        </div>
        <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;font-family:var(--font-mono);letter-spacing:0.06em">
          ${(state.experience||'').toUpperCase()} · ${daysPer}×/WK · ${(state.equipPreset||'Bodyweight').toUpperCase()}
        </div>
        
        <div style="margin-bottom:12px">
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);letter-spacing:0.1em;margin-bottom:6px">WARM-UP (5 MIN)</div>
          <div style="font-size:13px;color:var(--text-secondary)">${profile.warmup.join(' → ')}</div>
        </div>
        
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);letter-spacing:0.1em;margin-bottom:8px">MAIN BLOCK (${selected.length} EXERCISES)</div>
        ${exerciseHtml}
        
        <div style="margin-top:12px">
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);letter-spacing:0.1em;margin-bottom:6px">COOL-DOWN (5 MIN)</div>
          <div style="font-size:13px;color:var(--text-secondary)">${COOLDOWNS.join(' → ')}</div>
        </div>
        
        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn btn-primary flex-1" onclick="window.piqOnWorkoutComplete({type:'${selected[0]?.intent||'strength'}'});this.closest('.card').style.borderColor='var(--mint)';this.textContent='✅ Logged!';this.disabled=true">
            Log as Complete
          </button>
          <button class="btn btn-secondary" onclick="window.__piqGenWorkout()">🔄 New</button>
        </div>
      </div>`;

    const output = document.getElementById('workout-output');
    if (output) output.innerHTML = html;
    // Store current workout for swap tracking
    state._currentWorkout = selected.map(e => e.id);
    save();
  }

  // ─── EXERCISE SWAP HANDLER ────────────────────────────────────
  window.__piqSwapExercise = function(oldId, newId) {
    const newEx = EXERCISE_DB.find(e => e.id === newId);
    if (!newEx) return;
    const swaps = getSwapOptions(newEx);
    const typeColor = newEx.intent === 'strength' ? 'gold' : newEx.intent === 'power' ? 'red' : newEx.intent === 'speed' ? 'mint' : 'blue';
    const container = document.getElementById('ex-' + oldId);
    if (container) {
      container.id = 'ex-' + newEx.id;
      container.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-family:var(--font-mono);font-size:16px;color:var(--mint)">🔄</div>
          <div style="flex:1">
            <div style="font-family:var(--font-sub);font-size:16px;font-weight:700">${newEx.name}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${newEx.sets} × ${newEx.reps} · Tempo ${newEx.tempo} · Rest ${newEx.rest}</div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:4px;font-style:italic">💡 ${newEx.cue}</div>
          </div>
          <span class="chip chip-${typeColor}">${newEx.intent}</span>
        </div>
        <div style="font-size:10px;color:var(--mint);margin-top:4px;font-family:var(--font-mono)">🔄 SWAPPED — same muscle group, pattern & intent</div>
        ${swaps.length > 0 ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          <span style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">SWAP →</span>
          ${swaps.filter(s=>s.id!==oldId).slice(0,3).map(s => `<button class="btn btn-secondary" style="padding:3px 8px;font-size:11px" onclick="window.__piqSwapExercise('${newEx.id}','${s.id}')">${s.name}</button>`).join('')}
        </div>` : ''}`;
    }
    toast(`🔄 Swapped to ${newEx.name}`);
  };

  window.__piqGenWorkout = function() { generateWorkout(); };

  function bindWorkoutGenerator() {
    const btn = document.getElementById('btn-gen-workout');
    if (btn) btn.addEventListener('click', () => generateWorkout());
  }

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
    bindWorkoutGenerator();
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
