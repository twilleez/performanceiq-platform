/**
 * Public welcome / commercial landing screen.
 * Keeps every claim tied to functionality that exists in the product today.
 */
import { navigate, ROLE_HOME, ROUTES } from '../../router.js';
import { signIn } from '../../core/auth.js';

export function renderWelcome() {
  return `
<div class="marketing-page" aria-labelledby="marketing-title">
  <nav class="marketing-nav" aria-label="Public navigation">
    <div class="marketing-brand">Performance<span>IQ</span></div>
    <div class="marketing-nav-actions">
      <button type="button" class="marketing-link" id="welcome-signin-btn">Sign In</button>
      <button type="button" class="marketing-cta marketing-cta-small" id="welcome-nav-start">Start Free</button>
    </div>
  </nav>

  <section class="marketing-hero">
    <div class="marketing-eyebrow">TRAIN WITH CONTEXT, NOT GUESSWORK</div>
    <h1 id="marketing-title">Know how ready you are.<br><span>Know what to do next.</span></h1>
    <p class="marketing-lead">PerformanceIQ brings readiness, training, workout logging, progress and coaching workflows into one focused performance platform.</p>
    <div class="marketing-actions">
      <button type="button" class="marketing-cta" id="welcome-get-started">Create Free Account</button>
      <button type="button" class="marketing-secondary" id="welcome-demo-athlete">Explore Athlete Demo</button>
    </div>
    <p class="marketing-proofline">No card required to create an account · Demo uses sample data</p>
  </section>

  <section class="marketing-section" aria-labelledby="why-piq">
    <div class="marketing-section-head">
      <div class="marketing-eyebrow">ONE PERFORMANCE LOOP</div>
      <h2 id="why-piq">Readiness → Today → Log → Progress</h2>
      <p>Keep the daily decision simple while preserving the information athletes and coaches need to see progress over time.</p>
    </div>
    <div class="marketing-feature-grid">
      <article class="marketing-feature"><span>01</span><h3>Check readiness</h3><p>Capture daily wellness inputs and turn them into a clear readiness view.</p></article>
      <article class="marketing-feature"><span>02</span><h3>Train with purpose</h3><p>See today's work, complete assigned sessions and keep training organized.</p></article>
      <article class="marketing-feature"><span>03</span><h3>Log what happened</h3><p>Record training and personal records instead of losing progress in scattered notes.</p></article>
      <article class="marketing-feature"><span>04</span><h3>See the trend</h3><p>Bring progress, PIQ Score and performance information into a single athlete experience.</p></article>
    </div>
  </section>

  <section class="marketing-section marketing-audiences" aria-labelledby="built-for">
    <div class="marketing-section-head">
      <div class="marketing-eyebrow">BUILT AROUND THE PEOPLE DOING THE WORK</div>
      <h2 id="built-for">One platform. Role-specific experiences.</h2>
    </div>
    <div class="marketing-audience-grid">
      <article><div class="marketing-audience-icon">⚡</div><h3>Athletes</h3><p>Today's training, readiness, workout logging, progress, PIQ Score and nutrition in one place.</p><button class="marketing-text-btn" data-demo="player@demo.com">View Athlete Demo →</button></article>
      <article><div class="marketing-audience-icon">🎽</div><h3>Coaches</h3><p>Roster, programs, readiness, analytics, calendar and communication workflows built around the team.</p><button class="marketing-text-btn" data-demo="coach@demo.com">View Coach Demo →</button></article>
      <article><div class="marketing-audience-icon">🏃</div><h3>Solo Training</h3><p>Build and complete workouts, monitor readiness, set goals and track progress without joining a team.</p><button class="marketing-text-btn" data-demo="solo@demo.com">View Solo Demo →</button></article>
      <article><div class="marketing-audience-icon">👨‍👧</div><h3>Parents</h3><p>A dedicated view for an athlete's weekly plan, progress and wellness when family access is connected.</p><button class="marketing-text-btn" data-demo="parent@demo.com">View Parent Demo →</button></article>
    </div>
  </section>

  <section class="marketing-section marketing-score" aria-labelledby="score-title">
    <div>
      <div class="marketing-eyebrow">THE PIQ SCORE</div>
      <h2 id="score-title">A clearer performance signal.</h2>
      <p>PerformanceIQ combines the athlete's available training and wellness signals into a PIQ Score so the dashboard can communicate more than a pile of disconnected numbers.</p>
      <p class="marketing-disclaimer">PIQ Score and readiness information are training-support tools. They are not medical diagnoses and should not replace professional medical advice.</p>
    </div>
    <div class="marketing-score-card" aria-label="Example PIQ Score using sample data">
      <div class="marketing-score-label">SAMPLE PIQ SCORE</div>
      <div class="marketing-score-number">84</div>
      <div class="marketing-score-status">Strong day</div>
      <div class="marketing-score-note">Illustrative sample data</div>
    </div>
  </section>

  <section class="marketing-section marketing-demo" aria-labelledby="demo-title">
    <div class="marketing-section-head">
      <div class="marketing-eyebrow">SEE IT BEFORE YOU SIGN UP</div>
      <h2 id="demo-title">Choose a role and explore.</h2>
      <p>Demo accounts use sample data and do not require registration.</p>
    </div>
    <div class="marketing-demo-grid">
      <button class="demo-btn" data-demo="coach@demo.com">🎽 Coach View</button>
      <button class="demo-btn" data-demo="player@demo.com">🏀 Athlete View</button>
      <button class="demo-btn" data-demo="parent@demo.com">👨‍👧 Parent View</button>
      <button class="demo-btn" data-demo="solo@demo.com">🏃 Solo View</button>
    </div>
  </section>

  <section class="marketing-final-cta" aria-labelledby="final-cta-title">
    <div class="marketing-eyebrow">START WITH THE ATHLETE</div>
    <h2 id="final-cta-title">Make the next training decision clearer.</h2>
    <p>Create an account and build your PerformanceIQ profile.</p>
    <button type="button" class="marketing-cta" id="welcome-final-start">Start Free</button>
  </section>

  <footer class="marketing-footer">
    <div class="marketing-brand">Performance<span>IQ</span></div>
    <p>Performance training and readiness software.</p>
  </footer>
</div>`;
}

async function runDemo(button, email) {
  if (!button || !email) return;
  const original = button.textContent;
  button.textContent = 'Loading…';
  button.disabled = true;
  const res = await signIn(email, 'demo');
  if (res.ok) {
    navigate(ROLE_HOME[res.session.role]);
    return;
  }
  button.textContent = 'Unable to load demo';
  setTimeout(() => { button.textContent = original; button.disabled = false; }, 1800);
}

document.addEventListener('piq:authRendered', () => {
  ['welcome-get-started', 'welcome-nav-start', 'welcome-final-start'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', () => navigate(ROUTES.SIGN_UP)));

  document.getElementById('welcome-signin-btn')?.addEventListener('click', () => navigate(ROUTES.SIGN_IN));

  document.getElementById('welcome-demo-athlete')?.addEventListener('click', event =>
    runDemo(event.currentTarget, 'player@demo.com'));

  document.querySelectorAll('[data-demo]').forEach(btn => {
    btn.addEventListener('click', () => runDemo(btn, btn.dataset.demo));
  });
});
