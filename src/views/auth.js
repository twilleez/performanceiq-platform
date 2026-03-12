export function authView(state) {
  const err = state.ui.error
    ? `<div class="banner" style="background:rgba(255,80,80,.12);border-color:rgba(255,80,80,.3);margin-top:12px">${state.ui.error}</div>`
    : "";

  return `
    <div class="login-wrap">
      <div class="card login-card">
        <div class="title-lg" style="margin-bottom:4px">PerformanceIQ</div>
        <div class="muted" style="margin-bottom:20px">Athlete-first training, coach-powered teams.</div>

        <div id="auth-email-form">
          <input id="auth-email"    type="email"    placeholder="Email"    autocomplete="email" />
          <input id="auth-password" type="password" placeholder="Password" autocomplete="current-password" style="margin-top:10px" />

          <div class="row" style="margin-top:14px">
            <button id="btn-signin" style="flex:1">Sign In</button>
            <button id="btn-signup" class="secondary" style="flex:1">Create Account</button>
          </div>

          <div style="text-align:center;margin-top:16px">
            <button id="btn-magic" class="secondary sm" style="width:100%">
              ✉ Send Magic Link instead
            </button>
          </div>

          <div id="magic-sent" hidden style="margin-top:12px;text-align:center">
            <div class="banner">Check your email — magic link sent!</div>
          </div>

          ${err}
        </div>

        <div id="signup-role-step" hidden style="margin-top:16px">
          <div class="title-md" style="margin-bottom:12px">I am a…</div>
          <div class="row">
            <button id="btn-role-athlete" style="flex:1">Athlete</button>
            <button id="btn-role-coach" class="secondary" style="flex:1">Coach</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
