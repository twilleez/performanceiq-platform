export function authView(state) {
  const err = state.ui.error
    ? `<div class="banner" style="background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3);margin-top:12px">${state.ui.error}</div>`
    : "";

  return `
    <div class="login-wrap">
      <div class="card login-card">
        <div class="title-xl" style="letter-spacing:-.04em;margin-bottom:2px">PerformanceIQ</div>
        <div class="muted" style="margin-bottom:22px;font-size:14px">Athlete-first training. Coach-powered teams.</div>

        <div id="auth-email-form">
          <input id="auth-email"    type="email"    placeholder="Email address" autocomplete="email" />
          <input id="auth-password" type="password" placeholder="Password"      autocomplete="current-password" style="margin-top:10px" />

          <div class="row" style="margin-top:14px">
            <button id="btn-signin" style="flex:1">Sign In</button>
            <button id="btn-signup" class="secondary" style="flex:1">Create Account</button>
          </div>

          <div style="text-align:center;margin-top:12px">
            <button id="btn-magic" class="secondary sm" style="width:100%">
              ✉ Send Magic Link instead
            </button>
          </div>

          <div id="magic-sent" hidden style="margin-top:12px">
            <div class="banner">Check your email — magic link sent!</div>
          </div>

          ${err}

          <div style="margin-top:20px;border-top:1px solid var(--line);padding-top:18px;text-align:center">
            <div class="muted" style="font-size:13px;margin-bottom:10px">Or use offline — no account needed</div>
            <button id="btn-solo" class="secondary" style="width:100%">
              🏃 Continue as Solo Athlete
            </button>
          </div>
        </div>

        <div id="signup-role-step" hidden style="margin-top:16px">
          <div class="title-md" style="margin-bottom:12px">I am a…</div>
          <div class="row">
            <button id="btn-role-athlete" style="flex:1">🏅 Athlete</button>
            <button id="btn-role-coach" class="secondary" style="flex:1">📋 Coach</button>
          </div>
          <div class="muted" style="font-size:13px;margin-top:10px;text-align:center">
            This sets your default view and features.
          </div>
        </div>
      </div>
    </div>
  `;
}
