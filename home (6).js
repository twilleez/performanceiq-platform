/**
 * PerformanceIQ — Welcome Screen v2
 * Outcome-led headline, role preview cards, proof points, free-tier callout.
 */
import { navigate, ROLE_HOME, ROUTES } from '../../router.js';
import { signIn }                       from '../../core/auth.js';

export function renderWelcome() {
  return `
<div class="wlc-wrap">

  <div class="wlc-hero">
    <div class="wlc-eyebrow">SPORT SCIENCE · MADE SIMPLE</div>
    <h1 class="wlc-headline">
      Know if your athlete is ready<br>
      <span class="wlc-hl-accent">before practice starts.</span>
    </h1>
    <p class="wlc-sub">
      PerformanceIQ turns daily wellness data into a readiness score,
      personalised workout, and injury-risk flag — in under 60 seconds.
    </p>
  </div>

  <div class="wlc-ctas">
    <button class="btn-primary wlc-btn-main" id="welcome-get-started">
      Get started — it's free
    </button>
    <span class="wlc-or">or</span>
    <a class="wlc-signin-link" id="welcome-signin-link">Sign in to your account</a>
  </div>

  <div class="wlc-proof">
    <div class="wlc-proof-item">
      <span class="wlc-proof-icon">🔬</span>
      <span>Built on NSCA &amp; IOC load-management research</span>
    </div>
    <div class="wlc-proof-item">
      <span class="wlc-proof-icon">🆓</span>
      <span>Free forever for athletes — no credit card required</span>
    </div>
    <div class="wlc-proof-item">
      <span class="wlc-proof-icon">👥</span>
      <span>Separate views for coaches, athletes, and parents</span>
    </div>
  </div>

  <div class="wlc-section-label">WHAT YOU'LL GET — TRY A DEMO</div>
  <div class="wlc-roles">

    <div class="wlc-role-card" data-demo="coach@demo.com">
      <div class="wlc-role-icon">🎽</div>
      <div class="wlc-role-name">Coach</div>
      <ul class="wlc-role-list">
        <li>Team readiness at a glance</li>
        <li>At-risk athlete flags</li>
        <li>ACWR load management</li>
        <li>Session builder &amp; library</li>
      </ul>
      <div class="wlc-role-demo">Try coach demo →</div>
    </div>

    <div class="wlc-role-card" data-demo="player@demo.com">
      <div class="wlc-role-icon">🏀</div>
      <div class="wlc-role-name">Athlete</div>
      <ul class="wlc-role-list">
        <li>Daily personalised workout</li>
        <li>PIQ readiness score</li>
        <li>Nutrition &amp; macro targets</li>
        <li>Progress &amp; streak tracking</li>
      </ul>
      <div class="wlc-role-demo">Try athlete demo →</div>
    </div>

    <div class="wlc-role-card" data-demo="parent@demo.com">
      <div class="wlc-role-icon">👨‍👧</div>
      <div class="wlc-role-name">Parent</div>
      <ul class="wlc-role-list">
        <li>Plain-English readiness view</li>
        <li>Weekly training schedule</li>
        <li>PIQ score explained simply</li>
        <li>Direct coach messaging</li>
      </ul>
      <div class="wlc-role-demo">Try parent demo →</div>
    </div>

    <div class="wlc-role-card" data-demo="solo@demo.com">
      <div class="wlc-role-icon">🏃</div>
      <div class="wlc-role-name">Solo athlete</div>
      <ul class="wlc-role-list">
        <li>Self-directed program builder</li>
        <li>Individual PIQ score</li>
        <li>Goal &amp; progress tracking</li>
        <li>Free tier — always</li>
      </ul>
      <div class="wlc-role-demo">Try solo demo →</div>
    </div>

  </div>
</div>

<style>
.wlc-wrap{width:100%;max-width:560px;margin:0 auto;padding:8px 4px 32px;display:flex;flex-direction:column;align-items:center}
.wlc-hero{text-align:center;margin-bottom:22px}
.wlc-eyebrow{font-family:'Barlow Condensed',sans-serif;font-size:10.5px;font-weight:700;letter-spacing:3px;color:#22c955;text-transform:uppercase;margin-bottom:12px}
.wlc-headline{font-family:'Oswald',sans-serif;font-size:clamp(22px,5vw,32px);font-weight:700;color:#fff;line-height:1.15;margin-bottom:13px;letter-spacing:.5px}
.wlc-hl-accent{color:#22c955}
.wlc-sub{font-size:13.5px;color:rgba(255,255,255,.5);line-height:1.65;max-width:420px;margin:0 auto}
.wlc-ctas{display:flex;align-items:center;gap:14px;margin-bottom:20px;flex-wrap:wrap;justify-content:center}
.wlc-btn-main{font-size:14px;padding:13px 28px}
.wlc-or{font-size:12px;color:rgba(255,255,255,.3)}
.wlc-signin-link{font-size:13px;color:rgba(255,255,255,.5);cursor:pointer;text-decoration:underline;text-underline-offset:3px;transition:color .15s}
.wlc-signin-link:hover{color:#22c955}
.wlc-proof{display:flex;flex-direction:column;gap:8px;margin-bottom:26px;width:100%;max-width:380px}
.wlc-proof-item{display:flex;align-items:center;gap:10px;font-size:12.5px;color:rgba(255,255,255,.45);line-height:1.4}
.wlc-proof-icon{font-size:15px;flex-shrink:0}
.wlc-section-label{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;color:rgba(255,255,255,.22);margin-bottom:12px;align-self:flex-start}
.wlc-roles{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.wlc-role-card{border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:16px;background:rgba(255,255,255,.04);cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:5px}
.wlc-role-card:hover{border-color:rgba(34,201,85,.4);background:rgba(34,201,85,.06);transform:translateY(-1px)}
.wlc-role-icon{font-size:20px;margin-bottom:2px}
.wlc-role-name{font-size:13.5px;font-weight:700;color:#fff}
.wlc-role-list{list-style:none;padding:0;margin:4px 0 6px;display:flex;flex-direction:column;gap:3px;flex:1}
.wlc-role-list li{font-size:11.5px;color:rgba(255,255,255,.45);padding-left:12px;position:relative;line-height:1.4}
.wlc-role-list li::before{content:'·';position:absolute;left:0;color:#22c955}
.wlc-role-demo{font-size:11px;font-weight:600;color:#22c955;margin-top:4px}
@media(max-width:400px){.wlc-roles{grid-template-columns:1fr}.wlc-ctas{flex-direction:column;gap:10px}}
</style>`;
}

document.addEventListener('piq:authRendered', () => {
  document.getElementById('welcome-get-started')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_UP));
  document.getElementById('welcome-signin-link')?.addEventListener('click', () =>
    navigate(ROUTES.SIGN_IN));

  document.querySelectorAll('.wlc-role-card[data-demo]').forEach(card => {
    card.addEventListener('click', async () => {
      const email = card.dataset.demo;
      const demoEl = card.querySelector('.wlc-role-demo');
      if (demoEl) demoEl.textContent = 'Loading…';
      card.style.pointerEvents = 'none';
      const res = await signIn(email, 'demo');
      if (res.ok) {
        navigate(ROLE_HOME[res.session.role]);
      } else {
        if (demoEl) demoEl.textContent = '⚠ Error — try again';
        card.style.pointerEvents = 'auto';
      }
    });
  });
});
