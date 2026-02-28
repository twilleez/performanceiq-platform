/* ============================================================
   styles.css — PerformanceIQ v4.0.0
   Full redesign: command-center dark aesthetic with:
   - Bebas Neue display font for stats + headings
   - Sport-accent color system (preserved from v3.8)
   - PIQ Score hero ring with pillar breakdown
   - Team readiness sidebar panel
   - Activity feed
   - Onboarding progress stepper
   - Wellness check-in cards
   - Stat cards with mini sparkbar charts
   - Game countdown chips
   - Full WCAG tap targets + reduced-motion support
   ============================================================ */

@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

:root {
  /* Brand tokens */
  --brand-accent: #2EC4B6;
  --brand-accent-soft: rgba(46,196,182,.14);

  --accent: var(--brand-accent);
  --accent-2: var(--brand-accent-soft);
  --accent-3: rgba(46,196,182,.28);

  --ok: #22C55E;    --ok-soft: rgba(34,197,94,.13);
  --warn: #F59E0B;  --warn-soft: rgba(245,158,11,.13);
  --danger: #EF4444; --danger-soft: rgba(239,68,68,.12);
  --info: #3B82F6;  --info-soft: rgba(59,130,246,.12);

  --font-body: "DM Sans", system-ui, sans-serif;
  --font-head: "Bebas Neue", "Barlow Condensed", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --base-font: 16px;
  --base-line: 1.55;
  --text-max: 72ch;

  --sp-xs: 6px; --sp-sm: 10px; --sp-md: 14px; --sp-lg: 20px;

  --focus-ring: 0 0 0 3px color-mix(in oklab, var(--accent) 38%, transparent);
  --ease-out: cubic-bezier(.16, 1, .3, 1);
  --ease-in:  cubic-bezier(.7, 0, .84, 0);

  --e0: 0 0 0 rgba(0,0,0,0);
  --e1: 0 10px 26px rgba(0,0,0,.2);
  --e2: 0 18px 44px rgba(0,0,0,.26);
  --e3: 0 26px 70px rgba(0,0,0,.32);

  --select-arrow-dark: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23c4cede' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
  --select-arrow-light: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%234a5876' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
  --select-arrow: var(--select-arrow-dark);
}

/* ─── DARK THEME ─── */
html[data-theme="dark"] {
  --bg: #080c10;
  --top: #0e1419;
  --card: #111c26;
  --card2: #141e2a;
  --muted: #8a9bb5;
  --line: rgba(255,255,255,.08);
  --text: #eef3ff;
  --input: #0f1827;
  --shadow: var(--e2);
  --optionbg: #0f1827; --optionfg: #eef3ff;
  --pillBorder: rgba(255,255,255,.14);
  --activeViewRing: 0 0 0 2px var(--accent-3), 0 22px 80px rgba(0,0,0,.45);
  --select-arrow: var(--select-arrow-dark);
}

/* ─── LIGHT THEME ─── */
html[data-theme="light"] {
  --bg: #f0f4f8;
  --top: #ffffff;
  --card: #ffffff;
  --card2: #f8fafc;
  --muted: #4a5876;
  --line: rgba(15,23,42,.12);
  --text: #0b1220;
  --input: #eef2ff;
  --shadow: 0 10px 36px rgba(8,18,40,.1);
  --optionbg: #fff; --optionfg: #0b1220;
  --pillBorder: rgba(15,23,42,.15);
  --activeViewRing: 0 0 0 2px var(--accent-3), 0 18px 50px rgba(8,18,40,.12);
  --select-arrow: var(--select-arrow-light);
}

/* ─── RESET ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: var(--base-font);
  line-height: var(--base-line);
  font-variant-numeric: tabular-nums;
  -webkit-text-size-adjust: 100%;
  overflow-x: hidden;
}

/* Noise texture */
body::after {
  content: '';
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9998;
  opacity: 0.5;
}

:focus-visible { outline: none; box-shadow: var(--focus-ring); }
:focus:not(:focus-visible) { outline: none; }

/* ─── PARALLAX ─── */
.piq-parallax {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  opacity: .9; filter: saturate(1.1);
}
.piq-parallax .pl {
  position: absolute; border-radius: 999px;
  filter: blur(52px); opacity: .35;
  transform: translate3d(0,0,0); will-change: transform;
}
.piq-parallax .pl.a {
  width: 540px; height: 540px; left: -200px; top: -140px;
  background: radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--accent) 28%, transparent) 0%, transparent 62%);
  transform: translate3d(var(--p1x,0px), var(--p1y,0px), 0);
}
.piq-parallax .pl.b {
  width: 680px; height: 680px; right: -300px; top: 100px;
  background: radial-gradient(circle at 40% 40%, color-mix(in oklab, var(--accent) 20%, transparent) 0%, transparent 66%);
  transform: translate3d(var(--p2x,0px), var(--p2y,0px), 0);
}
.piq-parallax .pl.c {
  width: 800px; height: 800px; left: 18%; bottom: -500px;
  background: radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--accent) 15%, transparent) 0%, transparent 70%);
  transform: translate3d(var(--p3x,0px), var(--p3y,0px), 0);
}

/* Keep content above parallax */
.topbar, .layout, .bottomnav, .toast, .drawer, .sheet, .splash, .piq-sidebar { position: relative; z-index: 1; }

/* ─── TOPBAR ─── */
.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px;
  background: color-mix(in oklab, var(--top) 85%, transparent);
  border-bottom: 1px solid var(--line);
  position: sticky; top: 0; z-index: 10;
  backdrop-filter: blur(18px);
  gap: 12px;
}
.topbar-left { display: flex; align-items: center; flex-wrap: wrap; gap: var(--sp-sm); }
.topbar-right { display: flex; gap: var(--sp-sm); align-items: center; }

.appmark { display: flex; align-items: center; gap: 8px; }
.appmark-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); flex-shrink: 0;
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 24%, transparent);
}
.appmark-title {
  font-family: var(--font-head);
  font-size: 22px; letter-spacing: 2px;
  color: var(--text);
  text-shadow: 0 0 18px color-mix(in oklab, var(--accent) 30%, transparent);
}

/* ─── PILLS / CHIPS ─── */
.pill, .piq-chip-status {
  position: relative; overflow: hidden;
  padding: 5px 12px; border-radius: 999px; font-size: 13px;
  background: transparent; border: 1px solid var(--pillBorder);
  display: inline-flex; align-items: center; gap: 8px;
  color: color-mix(in oklab, var(--text) 85%, transparent);
  white-space: nowrap; font-weight: 500;
}
.piq-chip-status.ok { background: var(--ok-soft); border-color: color-mix(in oklab, var(--ok) 30%, transparent); color: var(--ok); }
.piq-chip-status.warn { background: var(--warn-soft); border-color: color-mix(in oklab, var(--warn) 30%, transparent); color: var(--warn); }
.piq-chip-status.danger { background: var(--danger-soft); border-color: color-mix(in oklab, var(--danger) 30%, transparent); color: var(--danger); }
.piq-chip-status.accent { background: var(--accent-2); border-color: var(--accent-3); color: var(--accent); }

.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); flex-shrink: 0; animation: dotPulse 2.2s infinite; }
.dot.warn { background: var(--warn); }
.dot.danger { background: var(--danger); }
@keyframes dotPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ─── LAYOUT ─── */
.layout {
  display: grid;
  grid-template-columns: 180px 1fr 280px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 16px;
  gap: 20px;
  align-items: start;
}
.layout.no-sidebar { grid-template-columns: 180px 1fr; }

.nav { width: 180px; flex-shrink: 0; position: relative; padding-bottom: 6px; display: grid; gap: 6px; }
.content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 18px; }

/* ─── DESKTOP NAV ─── */
.navbtn {
  position: relative; overflow: hidden;
  display: block; width: 100%; padding: 12px 14px; border-radius: 14px;
  border: 1px solid transparent; background: none;
  color: color-mix(in oklab, var(--text) 60%, transparent);
  text-align: left; font-weight: 700; font-family: var(--font-body);
  font-size: 14px; letter-spacing: .01em;
  cursor: pointer; min-height: 44px;
  transition: color .18s var(--ease-out), transform .18s var(--ease-out);
  z-index: 1;
}
.navbtn.active { color: var(--text); }
.navbtn:not(.active):hover { color: var(--text); transform: translateY(-1px); }

.nav-indicator {
  position: absolute; left: 0; top: 0; height: 44px; width: 0;
  border-radius: 14px;
  background: color-mix(in oklab, var(--card) 82%, var(--accent-2));
  border: 1px solid color-mix(in oklab, var(--accent) 26%, var(--pillBorder));
  box-shadow: 0 12px 32px color-mix(in oklab, var(--accent) 10%, transparent);
  transition: transform .28s var(--ease-out), width .28s var(--ease-out);
  z-index: 0; opacity: 0;
}

/* ─── RIGHT SIDEBAR PANEL ─── */
.piq-sidebar {
  display: flex; flex-direction: column; gap: 16px;
}

/* ─── VIEWS ─── */
.view { scroll-margin-top: 84px; }
.view.is-active { box-shadow: var(--activeViewRing); border-radius: 18px; }
.view-enter { opacity: 0; transform: translateY(12px) scale(.99); filter: blur(10px); }
.view-enter-active {
  opacity: 1; transform: translateY(0) scale(1); filter: blur(0);
  transition: opacity .26s var(--ease-out), transform .26s var(--ease-out), filter .26s var(--ease-out);
}
.view-spring { animation: viewSpring .24s var(--ease-out); }
@keyframes viewSpring {
  0% { transform: translateY(0) scale(1); }
  60% { transform: translateY(-2px) scale(1.006); }
  100% { transform: translateY(0) scale(1); }
}

/* ─── CARDS ─── */
.card {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 18px; padding: var(--sp-md);
  box-shadow: var(--shadow);
  transform: translate3d(0,0,0);
  transition: transform .18s var(--ease-out), box-shadow .18s var(--ease-out), border-color .18s var(--ease-out);
}
.card:hover { transform: translateY(-2px); box-shadow: var(--e3); border-color: color-mix(in oklab, var(--accent) 20%, var(--line)); }
.card.subtle { background: color-mix(in oklab, var(--card) 96%, transparent); box-shadow: none; }

.card-title { font-family: var(--font-head); font-weight: 400; letter-spacing: .06em; font-size: 20px; }
.card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--muted); font-weight: 600; margin-bottom: 10px; }

.elevate {
  transform: translate3d(0,0,0);
  transition: transform .18s var(--ease-out), box-shadow .18s var(--ease-out);
}
.elevate:hover { transform: translateY(-2px); box-shadow: var(--e3); }

/* ─── MINI / SECTION BLOCKS ─── */
.mini { background: transparent; border-radius: 10px; padding: 8px; }
.minihead {
  font-weight: 700; letter-spacing: .01em; margin-bottom: 8px;
  color: color-mix(in oklab, var(--text) 95%, transparent);
}
.minibody { color: var(--muted); }
.piq-section-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 2px;
  color: var(--muted); font-weight: 600; margin-bottom: 10px;
  display: flex; justify-content: space-between; align-items: center;
}
.piq-section-label a, .piq-see-all {
  font-size: 12px; color: var(--accent); cursor: pointer;
  opacity: .75; text-decoration: none; font-weight: 500;
}
.piq-see-all:hover { opacity: 1; }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

.piq-rowline {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 10px 0; border-top: 1px solid var(--line);
}
.piq-li { margin: 6px 0; }
.hr { height: 1px; background: var(--line); margin: 12px 0; border-radius: 2px; }

/* ─── STAT CARDS ─── */
.stat-big {
  font-family: var(--font-head);
  font-size: 52px; letter-spacing: 1px; line-height: 1;
  color: var(--accent);
}
.stat-unit { font-family: var(--font-body); font-size: 18px; color: var(--muted); margin-left: 4px; }
.stat-trend { font-size: 12px; margin-top: 6px; display: flex; align-items: center; gap: 4px; font-weight: 500; }
.stat-trend.up { color: var(--ok); }
.stat-trend.down { color: var(--danger); }
.stat-trend.neutral { color: var(--muted); }

/* Mini sparkbar chart */
.piq-spark {
  display: flex; align-items: flex-end; gap: 3px;
  height: 36px; margin-top: 14px;
}
.piq-spark-bar {
  flex: 1; border-radius: 3px 3px 0 0;
  min-width: 4px;
  transition: height .3s var(--ease-out);
  background: color-mix(in oklab, var(--accent) 35%, transparent);
}
.piq-spark-bar.active { background: var(--accent); }
.piq-spark-bar.ok { background: color-mix(in oklab, var(--ok) 40%, transparent); }
.piq-spark-bar.ok.active { background: var(--ok); }

/* ─── PIQ SCORE HERO ─── */
.piq-score-hero {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 24px; align-items: center;
  padding: 22px;
  background: color-mix(in oklab, var(--card) 88%, var(--accent-2));
  border: 1px solid color-mix(in oklab, var(--accent) 18%, var(--line));
  border-radius: 20px; box-shadow: var(--e2);
  position: relative; overflow: hidden;
}
.piq-score-hero::before {
  content: '';
  position: absolute; top: -80px; right: -80px;
  width: 260px; height: 260px;
  background: radial-gradient(circle, color-mix(in oklab, var(--accent) 12%, transparent) 0%, transparent 70%);
  pointer-events: none;
}

/* Ring */
.piq-score-ring {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px; border-radius: 18px; border: 1px solid var(--line);
  background: color-mix(in oklab, var(--card) 86%, var(--accent-2));
  box-shadow: var(--e2);
}
.ring-wrap { position: relative; width: 120px; height: 120px; border-radius: 999px; }
.ring { width: 120px; height: 120px; transform: rotate(-90deg); display: block; }
.ring-bg { fill: none; stroke: color-mix(in oklab, var(--text) 10%, transparent); stroke-width: 10; }
.ring-prog {
  fill: none; stroke: var(--accent); stroke-width: 10; stroke-linecap: round;
  stroke-dasharray: 0; stroke-dashoffset: 0;
  filter: drop-shadow(0 0 6px color-mix(in oklab, var(--accent) 60%, transparent));
  transition: stroke-dashoffset .75s var(--ease-out);
}
.ring-prog.ring-anim { transition: stroke-dashoffset .75s var(--ease-out); }
.ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; pointer-events: none; }
.piq-score-num { font-family: var(--font-head); font-size: 42px; line-height: 1; letter-spacing: 2px; color: var(--accent); text-shadow: 0 0 20px color-mix(in oklab, var(--accent) 50%, transparent); }
.piq-score-sub { font-size: 11px; color: var(--muted); font-weight: 600; letter-spacing: 1px; }
.piq-score-side { display: grid; gap: 8px; align-content: start; }
.piq-score-chip {
  display: inline-flex; align-items: center; justify-content: center; width: fit-content;
  font-size: 13px; font-weight: 700; padding: 5px 12px; border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--accent) 30%, var(--line));
  background: color-mix(in oklab, var(--accent) 14%, transparent);
  color: color-mix(in oklab, var(--text) 92%, transparent);
  letter-spacing: .5px;
}
.piq-score-hint { font-size: 12px; }
.score-bump { animation: scoreBump .40s var(--ease-out); }
@keyframes scoreBump { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
.score-land { animation: scoreLand .24s var(--ease-out); }
@keyframes scoreLand { 0% { transform: scale(.985); } 100% { transform: scale(1); } }
.shared-clone { border-radius: 18px; box-shadow: var(--e3); }

/* Pillar breakdown */
.piq-score-details { display: flex; flex-direction: column; gap: 14px; }
.piq-score-title { font-family: var(--font-head); font-size: 26px; letter-spacing: 1px; line-height: 1.1; }
.piq-score-desc { font-size: 13px; color: var(--muted); font-weight: 300; line-height: 1.6; }

.piq-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 4px; }
.piq-pillar {
  background: var(--card2); border: 1px solid var(--line);
  border-radius: 12px; padding: 12px 10px; text-align: center;
  transition: border-color .18s var(--ease-out);
}
.piq-pillar:hover { border-color: color-mix(in oklab, var(--accent) 25%, var(--line)); }
.piq-pillar-icon { font-size: 18px; margin-bottom: 5px; }
.piq-pillar-score { font-family: var(--font-head); font-size: 22px; line-height: 1; margin-bottom: 4px; }
.piq-pillar-bar { height: 3px; background: var(--line); border-radius: 2px; margin: 5px 0; overflow: hidden; }
.piq-pillar-bar-fill { height: 100%; border-radius: 2px; transition: width .8s var(--ease-out); }
.piq-pillar-name { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }

/* ─── WORKOUT BLOCK CARDS ─── */
.blockcard {
  margin: 10px 0; padding: 14px;
  border: 1px solid var(--line); border-radius: 16px;
  background: color-mix(in oklab, var(--card) 90%, var(--accent-2));
  box-shadow: var(--e1); outline: none;
  transition: transform .18s var(--ease-out), box-shadow .18s var(--ease-out), border-color .18s var(--ease-out);
}
.blockcard:hover { transform: translateY(-2px); box-shadow: var(--e2); border-color: color-mix(in oklab, var(--accent) 25%, var(--line)); }
.blockcard:focus-visible { box-shadow: var(--focus-ring), var(--e2); }
.blockcard-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.blockcard-title { font-weight: 700; letter-spacing: .01em; }

/* Today session workout card */
.piq-workout-card {
  background: linear-gradient(135deg, color-mix(in oklab, var(--card) 95%, var(--accent-2)), var(--card));
  border: 1px solid color-mix(in oklab, var(--accent) 20%, var(--line));
  border-radius: 16px; padding: 18px; cursor: pointer;
  transition: all .2s var(--ease-out); position: relative; overflow: hidden;
}
.piq-workout-card::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--accent), transparent);
}
.piq-workout-card:hover { border-color: color-mix(in oklab, var(--accent) 40%, var(--line)); transform: translateY(-2px); box-shadow: var(--e3); }
.piq-workout-type { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: var(--accent); margin-bottom: 7px; font-weight: 700; }
.piq-workout-name { font-family: var(--font-head); font-size: 28px; letter-spacing: 1px; margin-bottom: 8px; line-height: 1.1; }
.piq-workout-meta { display: flex; gap: 16px; font-size: 12px; color: var(--muted); flex-wrap: wrap; }
.piq-workout-meta span { display: flex; align-items: center; gap: 4px; }

/* ─── ACTIVITY FEED ─── */
.piq-feed { display: flex; flex-direction: column; }
.piq-feed-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 11px 0; border-bottom: 1px solid var(--line);
}
.piq-feed-item:last-child { border-bottom: none; }
.piq-feed-icon {
  width: 32px; height: 32px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.piq-feed-icon.ok { background: var(--ok-soft); }
.piq-feed-icon.warn { background: var(--warn-soft); }
.piq-feed-icon.accent { background: var(--accent-2); }
.piq-feed-icon.danger { background: var(--danger-soft); }
.piq-feed-text { font-size: 13px; line-height: 1.5; flex: 1; }
.piq-feed-time { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* ─── TEAM READINESS ─── */
.piq-roster-list { display: flex; flex-direction: column; gap: 8px; }
.piq-roster-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 11px; border-radius: 11px;
  background: var(--card2); border: 1px solid var(--line);
  cursor: pointer; transition: background .15s, border-color .15s;
}
.piq-roster-item:hover { background: color-mix(in oklab, var(--card2) 80%, var(--accent-2)); border-color: color-mix(in oklab, var(--accent) 20%, var(--line)); }
.piq-roster-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0; letter-spacing: .5px;
}
.piq-roster-name { font-size: 13px; font-weight: 600; }
.piq-roster-pos { font-size: 11px; color: var(--muted); }
.piq-readiness-bar { width: 52px; height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
.piq-readiness-fill { height: 100%; border-radius: 2px; transition: width .6s var(--ease-out); }
.piq-readiness-score { font-family: var(--font-mono); font-size: 12px; font-weight: 600; min-width: 24px; text-align: right; }

/* ─── WELLNESS CHECK-IN ─── */
.piq-wellness-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.piq-wellness-item {
  background: var(--card2); border: 1px solid var(--line);
  border-radius: 12px; padding: 12px; text-align: center;
  transition: border-color .18s;
}
.piq-wellness-item:hover { border-color: color-mix(in oklab, var(--accent) 22%, var(--line)); }
.piq-wellness-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
.piq-wellness-emoji { font-size: 22px; margin-bottom: 4px; }
.piq-wellness-val { font-family: var(--font-mono); font-size: 18px; font-weight: 600; }

/* ─── ONBOARDING PROGRESS ─── */
.piq-onboarding {
  background: color-mix(in oklab, var(--accent-2) 60%, var(--card));
  border: 1px solid color-mix(in oklab, var(--accent) 28%, var(--line));
  border-radius: 16px; padding: 18px;
}
.piq-onboarding-title { font-family: var(--font-head); font-size: 20px; letter-spacing: 1px; margin-bottom: 14px; }
.piq-ob-step { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 5px 0; }
.piq-ob-dot {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700;
}
.piq-ob-dot.done { background: var(--ok); color: #000; }
.piq-ob-dot.active { background: var(--accent); color: #000; animation: obGlow 2s infinite; }
.piq-ob-dot.pending { background: color-mix(in oklab, var(--text) 14%, transparent); color: var(--muted); }
@keyframes obGlow { 0%,100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--accent) 45%, transparent); } 50% { box-shadow: 0 0 0 6px transparent; } }
.piq-ob-line { width: 2px; height: 14px; background: var(--line); margin: 0 10px; }

/* ─── UPCOMING EVENTS ─── */
.piq-event-item {
  display: flex; gap: 12px; align-items: center;
  padding: 11px 12px; background: var(--card2); border: 1px solid var(--line);
  border-radius: 12px; transition: border-color .18s;
}
.piq-event-item:hover { border-color: color-mix(in oklab, var(--accent) 22%, var(--line)); }
.piq-event-days { text-align: center; min-width: 38px; }
.piq-event-days-num { font-family: var(--font-head); font-size: 22px; color: var(--accent); line-height: 1; }
.piq-event-days-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
.piq-event-name { font-size: 13px; font-weight: 600; }
.piq-event-meta { font-size: 11px; color: var(--muted); margin-top: 1px; }

/* ─── ALERTS ─── */
.piq-alert {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px; border-radius: 12px; font-size: 13px;
}
.piq-alert.warn { background: var(--warn-soft); border: 1px solid color-mix(in oklab, var(--warn) 28%, transparent); color: var(--warn); }
.piq-alert.danger { background: var(--danger-soft); border: 1px solid color-mix(in oklab, var(--danger) 28%, transparent); color: var(--danger); }
.piq-alert.ok { background: var(--ok-soft); border: 1px solid color-mix(in oklab, var(--ok) 28%, transparent); color: var(--ok); }
.piq-alert-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
.piq-alert-title { font-weight: 700; margin-bottom: 2px; }
.piq-alert-body { line-height: 1.5; }

/* ─── TOPBAR GREETING ─── */
.piq-greeting { font-family: var(--font-head); font-size: 32px; letter-spacing: 2px; line-height: 1; }
.piq-greeting-sub { font-size: 13px; color: var(--muted); margin-top: 3px; font-weight: 300; }

/* ─── UTILITIES ─── */
.row { display: flex; align-items: center; }
.between { justify-content: space-between; }
.gap { gap: var(--sp-sm); }
.wrap { flex-wrap: wrap; }
.small { font-size: 13px; }
.muted { color: var(--muted); }
.mono { font-family: var(--font-mono); }
.accent-text { color: var(--accent); }
.ok-text { color: var(--ok); }
.warn-text { color: var(--warn); }
.danger-text { color: var(--danger); }
.font-head { font-family: var(--font-head); }

/* ─── BUTTONS ─── */
.btn {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 16px; border-radius: 14px;
  border: 1px solid var(--pillBorder);
  background: var(--accent-2); color: var(--text);
  font-weight: 700; font-family: inherit; font-size: 15px; line-height: 1;
  cursor: pointer; user-select: none; -webkit-user-select: none;
  min-height: 44px;
  transform: translate3d(0,0,0);
  transition: transform .18s var(--ease-out), filter .18s var(--ease-out), background .18s, box-shadow .18s var(--ease-out);
}
.btn:hover { transform: translateY(-1px); filter: brightness(1.06); box-shadow: var(--e1); }
.btn:active { transform: translateY(0); filter: brightness(.96); box-shadow: var(--e0); }
.btn.ghost { background: transparent; }
.btn.danger { background: rgba(239,68,68,.12); border-color: rgba(239,68,68,.35); }
.btn.primary { background: var(--accent); color: #000; border-color: transparent; font-weight: 800; }
.btn.primary:hover { box-shadow: 0 0 22px color-mix(in oklab, var(--accent) 35%, transparent); }
.btn:disabled, .btn[aria-disabled="true"] { opacity: .45; cursor: not-allowed; pointer-events: none; }

html[data-theme="light"] .btn:not(.ghost):not(.danger):not(.primary) {
  background: var(--accent); border-color: transparent; color: #fff;
  box-shadow: 0 14px 34px color-mix(in oklab, var(--accent) 22%, transparent);
}
html[data-theme="light"] .btn.ghost { border-color: var(--line); }

/* ─── ICON BUTTONS ─── */
.iconbtn {
  position: relative; overflow: hidden;
  width: 44px; height: 44px; border-radius: 14px;
  border: 1px solid var(--pillBorder); background: transparent;
  color: color-mix(in oklab, var(--text) 88%, transparent);
  font-weight: 700; font-family: inherit;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: background .18s var(--ease-out), transform .18s var(--ease-out), box-shadow .18s var(--ease-out);
}
.iconbtn:hover { background: color-mix(in oklab, var(--card) 84%, var(--accent-2)); transform: translateY(-1px); box-shadow: var(--e1); }

/* Tap targets */
.tap44 { min-height: 44px; }
.tab.tap44 { padding: 14px 10px; }

/* ─── FORMS ─── */
.field label {
  display: block; font-size: 13px;
  color: color-mix(in oklab, var(--text) 78%, transparent);
  margin-bottom: 8px; font-weight: 700;
}
.field input[type="text"], .field input[type="email"], .field input[type="number"],
.field input[type="password"], .field input[type="search"], .field input[type="date"],
.field select, .field textarea {
  width: 100%; padding: 11px 14px; border-radius: 14px;
  border: 1px solid var(--pillBorder); background: var(--input);
  color: var(--text); font-family: inherit; font-size: 16px;
  outline: none; appearance: none; -webkit-appearance: none; min-height: 44px;
  transition: border-color .18s var(--ease-out), box-shadow .18s var(--ease-out);
}
.field input::placeholder { color: color-mix(in oklab, var(--text) 55%, transparent); }
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--accent); box-shadow: var(--focus-ring); }
.field select { background-image: var(--select-arrow); background-repeat: no-repeat; background-position: right 12px center; padding-right: 34px; }
.field select option { background: var(--optionbg); color: var(--optionfg); }
.field textarea { min-height: 96px; resize: vertical; }

/* ─── DRAWER ─── */
.drawer {
  position: fixed; right: 0; top: 0; height: 100%; width: 390px;
  background: var(--top); border-left: 1px solid var(--line); padding: 12px;
  transform: translateX(100%);
  transition: transform .28s var(--ease-out);
  z-index: 120; overflow-y: auto; -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain; backdrop-filter: blur(18px);
}
.drawer.open { transform: translateX(0); }
.drawer-backdrop {
  position: fixed; inset: 0; background: rgba(2,6,12,.6); z-index: 110;
  backdrop-filter: blur(10px);
}
.drawer-head {
  display: flex; justify-content: space-between; align-items: center;
  gap: var(--sp-sm); padding: 6px 4px var(--sp-sm); border-bottom: 1px solid var(--line);
}
.drawer-title { font-family: var(--font-head); font-weight: 400; letter-spacing: .06em; font-size: 24px; }
.drawer-body { padding: var(--sp-sm) 4px; }
.drawer-help { width: 420px; }
.piq-helpitem { padding: 12px 10px; border-bottom: 1px solid var(--line); }

/* ─── TOAST ─── */
.toast {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 28px;
  background: color-mix(in oklab, var(--top) 90%, transparent);
  padding: 11px 16px; border-radius: 16px; border: 1px solid var(--line);
  box-shadow: var(--e2); z-index: 200; font-size: 14px; font-weight: 500;
  white-space: nowrap; max-width: calc(100vw - 32px);
  overflow: hidden; text-overflow: ellipsis; backdrop-filter: blur(18px);
}

/* ─── FAB + SHEET ─── */
.fab {
  position: fixed; right: 18px; bottom: 84px; z-index: 140;
  width: 58px; height: 58px; border-radius: 22px;
  border: 1px solid var(--pillBorder); background: var(--accent-2);
  color: var(--text); font-size: 28px; font-weight: 700;
  box-shadow: var(--e2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: transform .18s var(--ease-out), filter .18s var(--ease-out), box-shadow .18s var(--ease-out);
}
.fab:hover { transform: translateY(-3px); filter: brightness(1.07); box-shadow: var(--e3); }
html[data-theme="light"] .fab { background: var(--accent); color: #fff; border-color: transparent; box-shadow: 0 14px 36px color-mix(in oklab, var(--accent) 25%, transparent); }

.sheet-backdrop { position: fixed; inset: 0; background: rgba(2,6,12,.6); z-index: 130; backdrop-filter: blur(10px); }
.sheet {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 18px; z-index: 140;
  width: min(520px, 94vw); border: 1px solid var(--line);
  background: var(--top); border-radius: 18px; box-shadow: var(--e3); overflow: hidden; backdrop-filter: blur(18px);
}
.sheet-head { display: flex; justify-content: space-between; align-items: center; padding: 12px var(--sp-md); border-bottom: 1px solid var(--line); }
.sheet-title { font-family: var(--font-head); font-weight: 400; letter-spacing: .06em; font-size: 22px; }
.sheet-body { padding: 12px var(--sp-md); display: grid; gap: var(--sp-sm); }

/* ─── BOTTOM NAV ─── */
.bottomnav {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: color-mix(in oklab, var(--top) 90%, transparent);
  border-top: 1px solid var(--line);
  display: flex; justify-content: space-around;
  z-index: 100; padding-bottom: env(safe-area-inset-bottom, 0px);
  backdrop-filter: blur(18px);
}
.tab {
  position: relative; overflow: hidden; border: none; background: none;
  color: color-mix(in oklab, var(--text) 65%, transparent);
  font-weight: 700; font-family: inherit; cursor: pointer; flex: 1;
  transition: color .18s var(--ease-out), transform .18s var(--ease-out);
}
.tab.active { color: var(--text); }
.tab:active { transform: translateY(1px); }
.bottom-indicator {
  position: absolute; left: 0; bottom: 6px;
  height: 3px; width: 0; border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 14px color-mix(in oklab, var(--accent) 25%, transparent);
  transition: transform .28s var(--ease-out), width .28s var(--ease-out);
  opacity: 0; pointer-events: none;
}

/* ─── RIPPLE ─── */
.ripple-host { position: relative; overflow: hidden; }
.ripple {
  position: absolute; border-radius: 999px; pointer-events: none;
  transform: scale(0); opacity: .2;
  background: radial-gradient(circle, color-mix(in oklab, var(--accent) 38%, transparent) 0%, transparent 70%);
  animation: ripple .52s var(--ease-out) forwards;
}
@keyframes ripple { 0% { transform: scale(.12); opacity: .2; } 100% { transform: scale(1); opacity: 0; } }

/* ─── SPRING PRESS ─── */
.spring-press { animation: pressSpring .26s var(--ease-out); }
@keyframes pressSpring { 0% { transform: translateY(0) scale(1); } 40% { transform: translateY(1px) scale(.985); } 100% { transform: translateY(0) scale(1); } }

/* ─── CAPTION ILLUSION ─── */
.piq-caption {
  position: fixed; z-index: 9999; padding: 7px 12px; border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--accent) 28%, var(--line));
  background: color-mix(in oklab, var(--top) 86%, transparent);
  color: color-mix(in oklab, var(--text) 92%, transparent);
  font-weight: 700; font-size: 13px; letter-spacing: .01em;
  box-shadow: 0 14px 44px rgba(0,0,0,.32);
  backdrop-filter: blur(18px);
  opacity: 0; transform: translate(-50%, -110%) scale(.98);
  transition: opacity .18s var(--ease-out), transform .18s var(--ease-out), filter .18s var(--ease-out);
  pointer-events: none; filter: blur(2px);
}
.piq-caption.show { opacity: 1; transform: translate(-50%, -130%) scale(1); filter: blur(0); }

/* ─── SKELETON ─── */
.sk-wrap { padding: 4px; }
.sk-card {
  border-radius: 18px; border: 1px solid var(--line);
  background: color-mix(in oklab, var(--card) 92%, transparent);
  box-shadow: var(--e1); padding: 14px; overflow: hidden; position: relative;
}
.sk-head { height: 16px; width: 62%; border-radius: 999px; background: color-mix(in oklab, var(--text) 10%, transparent); margin-bottom: 12px; }
.sk-line { height: 12px; width: 100%; border-radius: 999px; background: color-mix(in oklab, var(--text) 9%, transparent); margin-top: 10px; }
.sk-line:nth-child(3) { width: 86%; } .sk-line:nth-child(4) { width: 72%; }
.sk-line:nth-child(5) { width: 92%; } .sk-line:nth-child(6) { width: 64%; }
.sk-variant-blocklist .sk-row { height: 12px; width: 90%; border-radius: 999px; background: color-mix(in oklab, var(--text) 10%, transparent); margin-top: 10px; }
.sk-variant-blocklist .sk-row.short { width: 62%; }
.sk-variant-blocklist .sk-block { height: 54px; width: 100%; border-radius: 16px; background: color-mix(in oklab, var(--text) 9%, transparent); margin-top: 12px; }
.sk-variant-blocklist .sk-block.short { width: 80%; }
.sk-card::after {
  content: ""; position: absolute; inset: -40% -60%;
  background: linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--accent) 10%, transparent) 45%, color-mix(in oklab, var(--text) 14%, transparent) 55%, transparent 100%);
  transform: translateX(-40%); animation: skShimmer 1.25s linear infinite; opacity: .7;
}
@keyframes skShimmer { 0% { transform: translateX(-40%) rotate(10deg); } 100% { transform: translateX(70%) rotate(10deg); } }

/* ─── PIQ SCORE CHIP (injury style) ─── */
.piq-chiprow { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.piq-chip {
  padding: 6px 12px; border-radius: 999px; border: 1px solid var(--pillBorder);
  background: transparent; color: var(--text); font-family: inherit;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s, border-color .15s;
}
.piq-chip.on { background: var(--accent-2); border-color: var(--accent-3); color: var(--accent); }

/* ─── MODALS (onboarding) ─── */
.piq-modal-backdrop {
  position: fixed; inset: 0; background: rgba(2,6,12,.65);
  z-index: 300; display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(12px);
}
.piq-modal {
  background: var(--top); border: 1px solid var(--line);
  border-radius: 22px; padding: 24px;
  width: min(520px, 94vw); box-shadow: var(--e3);
  max-height: 90vh; overflow-y: auto;
}
.piq-modal-head { margin-bottom: 18px; }
.piq-modal-title { font-family: var(--font-head); font-size: 30px; letter-spacing: 1px; }
.piq-modal-sub { font-size: 14px; color: var(--muted); margin-top: 6px; }
.piq-modal-body { display: grid; gap: 10px; }

/* ─── REDUCED MOTION ─── */
@media (prefers-reduced-motion: reduce) {
  .btn, .navbtn, .tab, .drawer, .fab, .iconbtn, .splash, .view-enter-active, .card, .score-bump,
  .spring-press, .ripple, .view-spring, .sk-card::after, .nav-indicator, .bottom-indicator,
  .score-land, .piq-caption, .piq-ob-dot, .piq-pillar-bar-fill, .piq-readiness-fill,
  .ring-prog, .piq-workout-card {
    transition: none !important; animation: none !important;
  }
  .piq-parallax { display: none !important; }
}

/* ─── RESPONSIVE ─── */
@media (max-width: 1100px) {
  .layout { grid-template-columns: 180px 1fr; }
  .piq-sidebar { display: none; }
}

@media (max-width: 860px) {
  .layout {
    display: flex; flex-direction: column;
    margin: 10px auto; padding: 12px;
    padding-bottom: calc(78px + env(safe-area-inset-bottom, 0px));
    gap: 14px;
  }
  .nav { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; width: auto; padding-bottom: 0; }
  .nav::-webkit-scrollbar { display: none; }
  .navbtn { white-space: nowrap; flex-shrink: 0; }
  .nav-indicator { display: none; }
  .grid2, .grid3 { grid-template-columns: 1fr; }
  .piq-pillars { grid-template-columns: repeat(2, 1fr); }
  .piq-score-hero { grid-template-columns: 1fr; }
  .drawer, .drawer-help { width: min(92vw, 420px); }
  .piq-sidebar { display: flex; }
}

@media (max-width: 420px) {
  :root { --base-font: 16px; }
  .topbar { padding: 10px 12px; }
  .appmark-title { font-size: 18px; }
  .pill { font-size: 12px; }
  .piq-score-num { font-size: 38px; }
  .stat-big { font-size: 44px; }
  .piq-greeting { font-size: 26px; }
}
