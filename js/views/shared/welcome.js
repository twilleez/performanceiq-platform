/**
 * PerformanceIQ — Welcome / Landing View
 * Overrides #piq-splash centering so we control full-page layout.
 * All buttons wired to router.js navigate() and auth.js signIn().
 */
import { navigate, ROLE_HOME, ROUTES } from '../../router.js';
import { signIn }                       from '../../core/auth.js';

export function renderWelcome() {
  return `
<div class="wlc-root">

  <div class="wlc-bg" aria-hidden="true">
    <div class="wlc-grid"></div>
    <div class="wlc-orb wlc-orb1"></div>
    <div class="wlc-orb wlc-orb2"></div>
  </div>

  <nav class="wlc-nav">
    <div class="wlc-logo">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-label="PerformanceIQ logo">
        <defs>
          <linearGradient id="wlc-wg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#103050"/>
            <stop offset="100%" stop-color="#204060"/>
          </linearGradient>
        </defs>
        <path d="M5 32 L9 10 L28 6 L36 20 L21 26 L13 34 Z" fill="url(#wlc-wg)" stroke="rgba(111,217,79,0.25)" stroke-width="1"/>
        <path d="M9 28 L12 14 L25 11 L31 21 L20 25 Z" fill="rgba(255,255,255,0.04)"/>
        <path d="M28 6 L36 20 L29 17 Z" fill="#6FD94F"/>
        <line x1="13" y1="20" x2="22" y2="18" stroke="rgba(111,217,79,0.35)" stroke-width="1" stroke-linecap="round"/>
        <line x1="12" y1="24" x2="19" y2="22" stroke="rgba(111,217,79,0.2)" stroke-width="0.8" stroke-linecap="round"/>
        <circle cx="15" cy="24" r="1.5" fill="rgba(111,217,79,0.5)"/>
      </svg>
      <div class="wlc-logo-text">
        <span class="wlc-logo-name">P<em>IQ</em></span>
        <span class="wlc-logo-sub">Elite Training. Smart Results.</span>
      </div>
    </div>
    <div class="wlc-nav-right">
      <button class="wlc-nav-link" id="wlc-nav-signin">Sign in</button>
      <button class="wlc-nav-cta" id="wlc-nav-signup">Get started</button>
    </div>
  </nav>

  <section class="wlc-hero">
    <div class="wlc-eyebrow"><span class="wlc-eyebrow-line"></span>Sport Science · Made Simple</div>
    <h1 class="wlc-h1">
      Know if your athlete is ready<br>
      <span class="wlc-accent">before practice starts.</span>
    </h1>
    <p class="wlc-sub">
      PerformanceIQ turns daily wellness data into a readiness score,
      personalised workout, and injury-risk flag — in under 60 seconds.
    </p>
    <div class="wlc-actions">
      <button class="btn-primary wlc-btn-main" id="wlc-get-started">
        Get started — it's free
        <svg class="wlc-arr" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="wlc-ghost" id="wlc-signin">Sign in to your account</button>
    </div>
    <div class="wlc-trust">
      <div class="wlc-trust-item"><span class="wlc-dot"></span>Built on NSCA &amp; IOC research</div>
      <div class="wlc-trust-item"><span class="wlc-dot"></span>Free forever for athletes</div>
      <div class="wlc-trust-item"><span class="wlc-dot"></span>No credit card required</div>
    </div>
  </section>

  <div class="wlc-stats">
    <div class="wlc-stat"><div class="wlc-stat-n">ACWR</div><div class="wlc-stat-l">Load management</div></div>
    <div class="wlc-stat"><div class="wlc-stat-n">EWMA</div><div class="wlc-stat-l">Readiness scoring</div></div>
    <div class="wlc-stat"><div class="wlc-stat-n">&lt;60s</div><div class="wlc-stat-l">Daily check-in</div></div>
    <div class="wlc-stat"><div class="wlc-stat-n">5</div><div class="wlc-stat-l">Wellness pillars</div></div>
  </div>

  <section class="wlc-roles-section">
    <div class="wlc-section-label">What you'll get — try a demo</div>
    <div class="wlc-roles">

      <button class="wlc-role-card" data-demo="coach@demo.com" aria-label="Try coach demo">
        <div class="wlc-role-icon">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="5" y="3" width="12" height="16" rx="2" stroke="#6FD94F" stroke-width="1.4"/>
            <rect x="8" y="1.5" width="6" height="3" rx="1" fill="#0A1E28" stroke="#6FD94F" stroke-width="1.2"/>
            <line x1="8" y1="9" x2="14" y2="9" stroke="#6FD94F" stroke-width="1.3" stroke-linecap="round"/>
            <line x1="8" y1="12" x2="14" y2="12" stroke="#6FD94F" stroke-width="1.3" stroke-linecap="round" opacity="0.55"/>
            <line x1="8" y1="15" x2="11" y2="15" stroke="#6FD94F" stroke-width="1.3" stroke-linecap="round" opacity="0.3"/>
          </svg>
        </div>
        <div class="wlc-role-name">Coach</div>
        <div class="wlc-role-desc">Team overview with actionable risk flags.</div>
        <ul class="wlc-role-list">
          <li>Team readiness dashboard</li>
          <li>At-risk athlete flags</li>
          <li>ACWR load management</li>
          <li>Session builder &amp; library</li>
        </ul>
        <div class="wlc-role-cta">Try coach demo →</div>
      </button>

      <button class="wlc-role-card" data-demo="player@demo.com" aria-label="Try athlete demo">
        <div class="wlc-role-icon">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M13 3L6 12h5.5L9 19l7-9h-5.5L13 3Z" stroke="#6FD94F" stroke-width="1.4" stroke-linejoin="round" fill="rgba(111,217,79,0.12)"/>
          </svg>
        </div>
        <div class="wlc-role-name">Athlete</div>
        <div class="wlc-role-desc">Personalised training from your readiness score.</div>
        <ul class="wlc-role-list">
          <li>Daily personalised workout</li>
          <li>PIQ readiness score</li>
          <li>Nutrition &amp; macro targets</li>
          <li>Progress &amp; streak tracking</li>
        </ul>
        <div class="wlc-role-cta">Try athlete demo →</div>
      </button>

      <button class="wlc-role-card" data-demo="parent@demo.com" aria-label="Try parent demo">
        <div class="wlc-role-icon">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M2 11s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" stroke="#6FD94F" stroke-width="1.4"/>
            <circle cx="11" cy="11" r="2.5" stroke="#6FD94F" stroke-width="1.4" fill="rgba(111,217,79,0.12)"/>
          </svg>
        </div>
        <div class="wlc-role-name">Parent</div>
        <div class="wlc-role-desc">Stay informed on load, wellness, and risk.</div>
        <ul class="wlc-role-list">
          <li>Wellness trend summaries</li>
          <li>Coach communication hub</li>
          <li>Injury risk visibility</li>
          <li>PDF progress reports</li>
        </ul>
        <div class="wlc-role-cta">Try parent demo →</div>
      </button>

      <button class="wlc-role-card" data-demo="solo@demo.com" aria-label="Try solo demo">
        <div class="wlc-role-icon">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#6FD94F" stroke-width="1.4"/>
            <circle cx="11" cy="11" r="4.5" stroke="#6FD94F" stroke-width="1.2" opacity="0.55"/>
            <circle cx="11" cy="11" r="1.5" fill="#6FD94F"/>
          </svg>
        </div>
        <div class="wlc-role-name">Solo Athlete</div>
        <div class="wlc-role-desc">Self-directed training. Free, always.</div>
        <ul class="wlc-role-list">
          <li>Self-directed program builder</li>
          <li>Individual PIQ score</li>
          <li>Goal &amp; progress tracking</li>
          <li>Free tier — always</li>
        </ul>
        <div class="wlc-role-cta">Try solo demo →</div>
      </button>

    </div>
  </section>

  <footer class="wlc-footer">
    <div class="wlc-footer-left">© 2026 PerformanceIQ · Built for elite sport</div>
    <div class="wlc-footer-right">
      <span class="wlc-footer-link">Privacy</span>
      <span class="wlc-footer-link">Terms</span>
      <span class="wlc-footer-link">Contact</span>
    </div>
  </footer>

</div>

<style>
/* ── Override #piq-splash so welcome can be full-page ── */
#piq-splash {
  display: block !important;
  align-items: unset !important;
  justify-content: unset !important;
  padding: 0 !important;
  background: transparent !important;
  min-height: 100vh;
}
/* Hide the splash logo above auth-view-slot when welcome is active */
#piq-splash .splash-logo { display: none !important; }

/* ── Root ── */
.wlc-root {
  position: relative; width: 100%; min-height: 100vh;
  background: var(--piq-bg);
  font-family: var(--font-body);
  color: var(--piq-text);
  overflow-x: hidden;
  display: flex; flex-direction: column;
}
.wlc-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.wlc-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(111,217,79,0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(111,217,79,0.028) 1px, transparent 1px);
  background-size: 48px 48px;
}
.wlc-orb { position: absolute; border-radius: 50%; filter: blur(88px); pointer-events: none; }
.wlc-orb1 { width: 500px; height: 500px; background: rgba(111,217,79,0.07); top: -130px; left: -130px; }
.wlc-orb2 { width: 400px; height: 400px; background: rgba(80,144,160,0.06); bottom: 80px; right: -80px; }

/* ── Nav ── */
.wlc-nav {
  position: relative; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 60px;
  border-bottom: 1px solid var(--piq-border);
  background: rgba(1,13,20,0.88);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}
.wlc-logo { display: flex; align-items: center; gap: 10px; }
.wlc-logo-text { display: flex; flex-direction: column; gap: 1px; }
.wlc-logo-name {
  font-family: var(--font-display);
  font-size: 20px; font-weight: 700; letter-spacing: 3px; line-height: 1; color: #fff;
}
.wlc-logo-name em { color: var(--piq-green); font-style: normal; }
.wlc-logo-sub {
  font-family: var(--font-num);
  font-size: 9px; font-weight: 500; letter-spacing: 2.5px; text-transform: uppercase;
  color: var(--piq-muted); line-height: 1;
}
.wlc-nav-right { display: flex; align-items: center; gap: 10px; }
.wlc-nav-link {
  background: none; border: none; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; font-weight: 400;
  color: var(--piq-muted); padding: 6px 10px; border-radius: 6px;
  transition: color 0.2s;
}
.wlc-nav-link:hover { color: var(--piq-green); }
.wlc-nav-cta {
  background: var(--piq-green-glow); border: 1px solid var(--piq-green-border);
  color: var(--piq-green); cursor: pointer;
  font-family: var(--font-body); font-size: 13px; font-weight: 500;
  padding: 7px 18px; border-radius: 6px;
  transition: background 0.2s, border-color 0.2s;
}
.wlc-nav-cta:hover { background: rgba(111,217,79,0.22); border-color: rgba(111,217,79,0.5); }

/* ── Hero ── */
.wlc-hero {
  position: relative; z-index: 1;
  padding: 60px 24px 48px; max-width: 820px;
}
.wlc-eyebrow {
  display: inline-flex; align-items: center; gap: 12px;
  font-family: var(--font-num); font-size: 11px; font-weight: 500;
  letter-spacing: 4px; text-transform: uppercase;
  color: var(--piq-green); margin-bottom: 20px;
  animation: wlc-up 0.5s ease both;
}
.wlc-eyebrow-line { display: block; width: 22px; height: 1px; background: var(--piq-green); }
.wlc-h1 {
  font-family: var(--font-display);
  font-size: clamp(32px, 6vw, 60px);
  font-weight: 700; line-height: 1.0; letter-spacing: -0.5px;
  color: #fff; margin-bottom: 18px;
  animation: wlc-up 0.5s 0.08s ease both;
}
.wlc-accent { color: var(--piq-green); }
.wlc-sub {
  font-size: 15px; font-weight: 300;
  color: rgba(208,238,244,0.6); line-height: 1.75;
  max-width: 500px; margin-bottom: 32px;
  animation: wlc-up 0.5s 0.15s ease both;
}
.wlc-actions {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  margin-bottom: 40px;
  animation: wlc-up 0.5s 0.22s ease both;
}
.wlc-btn-main {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 14px; padding: 13px 28px;
  color: var(--piq-navy);
}
.wlc-arr { color: var(--piq-navy); transition: transform 0.2s; }
.wlc-btn-main:hover .wlc-arr { transform: translateX(4px); }
.wlc-ghost {
  background: none; border: none; cursor: pointer;
  font-family: var(--font-body); font-size: 13px; font-weight: 400;
  color: rgba(208,238,244,0.45);
  text-decoration: underline; text-underline-offset: 3px;
  transition: color 0.2s; padding: 0;
}
.wlc-ghost:hover { color: var(--piq-green); }

/* ── Trust strip ── */
.wlc-trust {
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  padding-top: 32px; border-top: 1px solid var(--piq-border);
  animation: wlc-up 0.5s 0.28s ease both;
}
.wlc-trust-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--piq-muted); }
.wlc-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--piq-green); opacity: 0.6; flex-shrink: 0; }

/* ── Stats bar ── */
.wlc-stats {
  position: relative; z-index: 1;
  display: flex;
  border-top: 1px solid var(--piq-border);
  border-bottom: 1px solid var(--piq-border);
  background: rgba(255,255,255,0.015); flex-shrink: 0;
}
.wlc-stat {
  flex: 1; padding: 20px 12px; text-align: center;
  border-right: 1px solid var(--piq-border); transition: background 0.2s;
}
.wlc-stat:last-child { border-right: none; }
.wlc-stat:hover { background: rgba(111,217,79,0.04); }
.wlc-stat-n {
  font-family: var(--font-display); font-size: 24px; font-weight: 700;
  color: var(--piq-green); letter-spacing: -0.5px; line-height: 1; margin-bottom: 4px;
}
.wlc-stat-l {
  font-family: var(--font-num); font-size: 9px; font-weight: 500;
  color: var(--piq-muted); letter-spacing: 1.8px; text-transform: uppercase;
}

/* ── Roles ── */
.wlc-roles-section { position: relative; z-index: 1; padding: 36px 24px 56px; flex: 1; }
.wlc-section-label {
  font-family: var(--font-num); font-size: 10px; font-weight: 500;
  letter-spacing: 3.5px; text-transform: uppercase;
  color: rgba(74,120,136,0.6); text-align: center; margin-bottom: 20px;
}
.wlc-roles {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 1px; background: var(--piq-border);
  border: 1px solid var(--piq-border); border-radius: 8px; overflow: hidden;
  max-width: 900px; margin: 0 auto;
}
.wlc-role-card {
  background: var(--piq-s1); padding: 24px 18px 20px;
  position: relative; cursor: pointer; text-align: left;
  border: none; color: inherit; font-family: var(--font-body);
  transition: background 0.25s; display: flex; flex-direction: column;
}
.wlc-role-card:hover { background: var(--piq-s2); }
.wlc-role-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--piq-green), rgba(111,217,79,0.12));
  transform: scaleX(0); transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
}
.wlc-role-card:hover::before { transform: scaleX(1); }
.wlc-role-card:disabled { opacity: 0.55; cursor: not-allowed; pointer-events: none; }
.wlc-role-icon {
  width: 40px; height: 40px; border-radius: 9px;
  background: var(--piq-green-glow); border: 1px solid var(--piq-green-border);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px; flex-shrink: 0;
  transition: background 0.25s, border-color 0.25s;
}
.wlc-role-card:hover .wlc-role-icon { background: rgba(111,217,79,0.18); border-color: rgba(111,217,79,0.4); }
.wlc-role-name {
  font-family: var(--font-display); font-size: 16px; font-weight: 600;
  color: #fff; letter-spacing: 0.4px; margin-bottom: 4px;
}
.wlc-role-desc { font-size: 11px; font-weight: 300; color: var(--piq-muted); line-height: 1.6; margin-bottom: 12px; }
.wlc-role-list { list-style: none; display: flex; flex-direction: column; gap: 6px; flex: 1; margin: 0; padding: 0; }
.wlc-role-list li {
  font-size: 11px; font-weight: 400; color: rgba(208,238,244,0.42);
  display: flex; align-items: flex-start; gap: 7px; line-height: 1.5;
}
.wlc-role-list li::before {
  content: ''; width: 4px; height: 4px; border-radius: 50%;
  background: var(--piq-green); opacity: 0.5; margin-top: 5px; flex-shrink: 0;
}
.wlc-role-cta {
  font-family: var(--font-num); font-size: 10px; font-weight: 500;
  letter-spacing: 1.5px; text-transform: uppercase;
  color: var(--piq-green); margin-top: 18px; opacity: 0.6; transition: opacity 0.2s;
}
.wlc-role-card:hover .wlc-role-cta { opacity: 1; }

/* ── Footer ── */
.wlc-footer {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-top: 1px solid var(--piq-border);
  flex-wrap: wrap; gap: 10px; flex-shrink: 0;
}
.wlc-footer-left { font-size: 11px; color: rgba(74,120,136,0.5); }
.wlc-footer-right { display: flex; gap: 18px; }
.wlc-footer-link { font-size: 11px; color: rgba(74,120,136,0.5); cursor: default; }

/* ── Animation ── */
@keyframes wlc-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ── */
@media (max-width: 800px) {
  .wlc-roles { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 520px) {
  .wlc-nav { padding: 0 16px; }
  .wlc-logo-sub { display: none; }
  .wlc-hero { padding: 44px 16px 36px; }
  .wlc-roles-section { padding: 28px 16px 44px; }
  .wlc-roles { grid-template-columns: 1fr; }
  .wlc-stats { flex-wrap: wrap; }
  .wlc-stat { min-width: 50%; border-bottom: 1px solid var(--piq-border); }
  .wlc-footer { padding: 14px 16px; }
  .wlc-trust { gap: 12px; }
  .wlc-actions { flex-direction: column; align-items: flex-start; gap: 10px; }
}
</style>`;
}

// ── Event wiring — after HTML is injected into DOM ────────────────────────
document.addEventListener('piq:authRendered', () => {

  // "Get started" CTA (hero) → signup
  document.getElementById('wlc-get-started')
    ?.addEventListener('click', () => navigate(ROUTES.SIGN_UP));

  // "Sign in to your account" ghost link (hero)
  document.getElementById('wlc-signin')
    ?.addEventListener('click', () => navigate(ROUTES.SIGN_IN));

  // Nav: Sign in
  document.getElementById('wlc-nav-signin')
    ?.addEventListener('click', () => navigate(ROUTES.SIGN_IN));

  // Nav: Get started
  document.getElementById('wlc-nav-signup')
    ?.addEventListener('click', () => navigate(ROUTES.SIGN_UP));

  // Demo role cards
  document.querySelectorAll('.wlc-role-card[data-demo]').forEach(card => {
    card.addEventListener('click', async () => {
      if (card.disabled) return;

      const email   = card.dataset.demo;
      const ctaEl   = card.querySelector('.wlc-role-cta');
      const origTxt = ctaEl?.textContent;

      card.disabled = true;
      if (ctaEl) ctaEl.textContent = 'Loading…';

      try {
        const res = await signIn(email, 'demo');
        if (res.ok) {
          navigate(ROLE_HOME[res.session.role] || ROUTES.PICK_ROLE);
        } else {
          if (ctaEl) ctaEl.textContent = '⚠ Error — try again';
          card.disabled = false;
        }
      } catch (err) {
        console.error('[PIQ] Demo sign-in error:', err);
        if (ctaEl) ctaEl.textContent = origTxt || '⚠ Error';
        card.disabled = false;
      }
    });
  });
});
