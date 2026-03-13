export function profileView(state) {
  const { profile } = state;
  if (!profile) return `<div class="screen"><div class="muted" style="padding:40px 16px;text-align:center">Loading profile…</div></div>`;

  const isSolo = !state.session;
  const SPORTS = ["basketball","football","soccer","baseball","volleyball","track"];
  const GOALS  = ["Get Faster","Build Strength","Improve Endurance","Peak for Season","Recover Smart","General Fitness"];

  // ── Stats summary ────────────────────────────────────────────────────────
  const recentWorkouts = state.recentWorkouts ?? [];
  const completedCount = recentWorkouts.filter(w => w.completed_at).length;
  const avgReadiness = state.readinessTrend?.length
    ? Math.round(state.readinessTrend.reduce((s, r) => s + r.score, 0) / state.readinessTrend.length)
    : null;

  const sportOptions = SPORTS.map(s => `
    <option value="${s}"${profile.sport === s ? " selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>
  `).join("");
  const goalOptions = GOALS.map(g => `
    <option value="${g}"${profile.goal === g ? " selected" : ""}>${g}</option>
  `).join("");

  return `
    <div class="screen">
      <div class="topbar">
        <div>
          <div class="muted">Profile</div>
          <div class="title-xl">${profile.name || "Athlete"}</div>
        </div>
        <span class="role-badge" style="font-size:12px;padding:6px 10px">
          ${isSolo ? "Solo Mode" : profile.role}
        </span>
      </div>

      <!-- Summary stats -->
      <div class="grid three section">
        <div class="card" style="text-align:center">
          <div class="metric-sm" style="color:#ff6b35">${completedCount}</div>
          <div class="muted small">Sessions</div>
        </div>
        <div class="card" style="text-align:center">
          <div class="metric-sm" style="color:${avgReadiness === null ? "var(--muted)" : avgReadiness >= 80 ? "#34d399" : avgReadiness >= 65 ? "#fbbf24" : "#f87171"}">
            ${avgReadiness !== null ? avgReadiness : "—"}
          </div>
          <div class="muted small">Avg Readiness</div>
        </div>
        <div class="card" style="text-align:center">
          <div class="metric-sm" style="color:#53b5ff">${state.prs?.length ?? 0}</div>
          <div class="muted small">PRs</div>
        </div>
      </div>

      <!-- Editable profile -->
      <div class="card section">
        <div class="title-md" style="margin-bottom:14px">Athlete Identity</div>
        <div class="list" style="gap:10px">
          <label class="input-row">
            <span style="font-weight:500;min-width:100px">Name</span>
            <input id="p-name" type="text" value="${profile.name || ""}" style="text-align:right;border:none;background:transparent;padding:4px 0" />
          </label>
          <label class="input-row">
            <span style="font-weight:500;min-width:100px">Sport</span>
            <select id="p-sport" class="select-input">${sportOptions}</select>
          </label>
          <label class="input-row">
            <span style="font-weight:500;min-width:100px">Position</span>
            <input id="p-position" type="text" value="${profile.position || ""}" style="width:140px" placeholder="e.g. Point Guard" />
          </label>
          <label class="input-row">
            <span style="font-weight:500;min-width:100px">Goal</span>
            <select id="p-goal" class="select-input">${goalOptions}</select>
          </label>
        </div>
        <button style="margin-top:14px;width:100%" data-action="save-profile">Save Changes</button>
      </div>

      <!-- Account / Mode -->
      <div class="card section">
        <div class="title-md" style="margin-bottom:12px">Account</div>
        ${isSolo ? `
          <div class="banner" style="margin-bottom:14px;font-size:13px">
            <strong>Solo Mode</strong> — your data is stored on this device only.
            Create an account to sync across devices and access team features.
          </div>
          <button class="secondary" style="width:100%;margin-bottom:8px" data-action="sign-in-prompt">
            Create Account / Sign In
          </button>
        ` : `
          <div class="list" style="gap:8px">
            <div class="item space">
              <span style="font-weight:500">Email</span>
              <span class="muted">${profile.email || state.session?.user?.email || "—"}</span>
            </div>
            <div class="item space">
              <span style="font-weight:500">Role</span>
              <span class="muted" style="text-transform:capitalize">${profile.role}</span>
            </div>
          </div>
          <button class="secondary sm" style="margin-top:14px;width:100%" data-action="sign-out">Sign Out</button>
        `}
      </div>

      <!-- Danger zone -->
      ${isSolo ? `
        <div class="card section" style="border-color:rgba(248,113,113,.2)">
          <div class="title-md" style="margin-bottom:8px;color:#f87171">Reset Data</div>
          <div class="muted" style="font-size:13px;margin-bottom:12px">
            Clears all workouts, readiness logs, and PRs stored on this device.
          </div>
          <button class="secondary sm" style="border-color:rgba(248,113,113,.3);color:#f87171" data-action="reset-solo">
            Clear All Local Data
          </button>
        </div>
      ` : ""}
    </div>
  `;
}
