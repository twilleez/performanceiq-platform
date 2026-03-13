// ─── Team views ───────────────────────────────────────────────────────────────
// BUG FIX: All views were crashing because they assumed state.team had rich nested
// objects (.announcements, .coachNotes, .leaderboard, .roster, .events, .activity)
// but state.team is just the raw DB row: { id, name, sport, coach_id }.
// All data that didn't exist in DB is now gracefully handled with empty states.

export function teamHomeView(state) {
  const team = state.team;
  if (!team) return `
    <div class="screen">
      <div class="topbar"><div><div class="muted">Team</div><div class="title-xl">No Team Found</div></div></div>
      <div class="card section" style="text-align:center;padding:32px 16px">
        <div style="font-size:40px;margin-bottom:12px">👥</div>
        <div class="title-md">You're not on a team yet</div>
        <div class="muted" style="font-size:13px;margin-top:8px">Ask your coach to add you, or create a team if you're a coach.</div>
      </div>
    </div>`;

  const teamReadiness = state.teamReadiness ?? [];
  const flagged = teamReadiness.filter(r => r.score < 65);
  const readyCount = teamReadiness.filter(r => r.score >= 80).length;
  const checkedIn = teamReadiness.length;

  const readinessList = teamReadiness.length
    ? teamReadiness.slice(0, 8).map(r => {
        const color = r.score >= 80 ? "#34d399" : r.score >= 65 ? "#fbbf24" : "#f87171";
        const name = r.profiles?.name ?? "Athlete";
        return `
          <div class="item space">
            <div>
              <div style="font-weight:600">${name}</div>
              <div class="muted small">${r.profiles?.position ?? ""} · ${r.soreness ?? "—"} soreness</div>
            </div>
            <div style="font-weight:700;color:${color};font-size:18px">${r.score}</div>
          </div>
        `;
      }).join("")
    : `<div class="item muted" style="text-align:center;padding:16px">No check-ins yet today.</div>`;

  return `
    <div class="screen">
      <div class="topbar">
        <div>
          <div class="muted">Team</div>
          <div class="title-xl">${team.name}</div>
        </div>
        <span class="pill">${team.sport ?? ""}</span>
      </div>

      <!-- Team readiness summary -->
      <div class="grid three section">
        <div class="card" style="text-align:center">
          <div class="metric-sm" style="color:#53b5ff">${checkedIn}</div>
          <div class="muted small">Checked In</div>
        </div>
        <div class="card" style="text-align:center">
          <div class="metric-sm" style="color:#34d399">${readyCount}</div>
          <div class="muted small">Game Ready</div>
        </div>
        <div class="card" style="text-align:center">
          <div class="metric-sm" style="color:#f87171">${flagged.length}</div>
          <div class="muted small">Need Attention</div>
        </div>
      </div>

      ${flagged.length ? `
        <div class="banner section" style="background:rgba(248,113,113,.08);border-color:rgba(248,113,113,.25)">
          <strong>${flagged.length} athlete${flagged.length > 1 ? "s" : ""}</strong> with readiness below 65 today — consider modified sessions.
        </div>
      ` : ""}

      <!-- Today's readiness -->
      <div class="card section">
        <div class="space" style="margin-bottom:12px">
          <div class="title-md">Today's Readiness</div>
          <span class="muted small">${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
        </div>
        <div class="list">${readinessList}</div>
      </div>
    </div>
  `;
}

export function teamScheduleView(state) {
  const team = state.team;
  if (!team) return `<div class="screen"><div class="muted" style="padding:40px">No team loaded.</div></div>`;

  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const todayIdx = new Date().getDay();
  // JS: 0=Sun, map to Mon-first
  const todayMon = todayIdx === 0 ? 6 : todayIdx - 1;

  return `
    <div class="screen">
      <div class="topbar">
        <div><div class="muted">Schedule</div><div class="title-xl">Weekly Plan</div></div>
        <span class="pill">${team.name}</span>
      </div>
      <div class="card section">
        <div class="grid" style="grid-template-columns:repeat(7,1fr);gap:6px">
          ${days.map((d, i) => `
            <div style="min-height:80px;border-radius:14px;padding:8px;background:${i === todayMon ? "rgba(83,181,255,.1)" : "var(--surface2)"};border:1px solid ${i === todayMon ? "rgba(83,181,255,.35)" : "var(--line)"}">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${i === todayMon ? "var(--accent)" : "var(--muted)"}">${d}</div>
              <div class="muted small" style="margin-top:6px;font-size:11px">${i === todayMon ? "Today" : "—"}</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="card section" style="opacity:.6;text-align:center;padding:24px">
        <div style="font-size:32px;margin-bottom:8px">📅</div>
        <div class="title-md">Schedule Builder</div>
        <div class="muted" style="font-size:13px;margin-top:6px">Drag-and-drop team schedule coming soon.</div>
      </div>
    </div>
  `;
}

export function rosterView(state) {
  const team = state.team;
  if (!team) return `<div class="screen"><div class="muted" style="padding:40px">No team loaded.</div></div>`;

  const teamReadiness = state.teamReadiness ?? [];

  const rosterItems = teamReadiness.length
    ? teamReadiness.map(r => {
        const name = r.profiles?.name ?? "Athlete";
        const pos  = r.profiles?.position ?? "—";
        const color = r.score >= 80 ? "#34d399" : r.score >= 65 ? "#fbbf24" : "#f87171";
        return `
          <div class="card">
            <div class="space">
              <div>
                <div style="font-weight:700;font-size:16px">${name}</div>
                <div class="muted small">${pos} · ${r.profiles?.sport ?? team.sport ?? ""}</div>
              </div>
              <div style="font-weight:700;color:${color};font-size:20px">${r.score}</div>
            </div>
            <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">
              <span class="stat-chip" style="font-size:11px">Sleep ${r.sleep_hrs ?? "—"}h</span>
              <span class="stat-chip" style="font-size:11px">Soreness ${r.soreness ?? "—"}</span>
              <span class="stat-chip" style="font-size:11px">HRV ${r.hrv ?? "—"}</span>
            </div>
          </div>
        `;
      }).join("")
    : `
      <div class="card section" style="text-align:center;padding:32px 16px;opacity:.6">
        <div style="font-size:40px;margin-bottom:12px">👤</div>
        <div class="title-md">No athletes checked in</div>
        <div class="muted" style="font-size:13px;margin-top:8px">Roster will populate as athletes log their readiness.</div>
      </div>
    `;

  return `
    <div class="screen">
      <div class="topbar">
        <div><div class="muted">Roster</div><div class="title-xl">${team.name}</div></div>
        <span class="pill">${teamReadiness.length} checked in</span>
      </div>
      <div class="list section">${rosterItems}</div>
    </div>
  `;
}

export function teamActivityView(state) {
  const team = state.team;
  if (!team) return `<div class="screen"><div class="muted" style="padding:40px">No team loaded.</div></div>`;

  const teamReadiness = state.teamReadiness ?? [];
  const low = teamReadiness.filter(r => r.score < 65);
  const high = teamReadiness.filter(r => r.score >= 80);

  const signals = [];
  if (high.length)
    signals.push(`<div class="card" style="background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.2)">
      <div style="font-weight:600;color:#34d399;margin-bottom:4px">🟢 ${high.length} athletes at full capacity</div>
      <div class="muted small">${high.map(r => r.profiles?.name ?? "Athlete").join(", ")}</div>
    </div>`);
  if (low.length)
    signals.push(`<div class="card" style="background:rgba(248,113,113,.07);border-color:rgba(248,113,113,.2)">
      <div style="font-weight:600;color:#f87171;margin-bottom:4px">🔴 ${low.length} athletes need modified sessions</div>
      <div class="muted small">${low.map(r => r.profiles?.name ?? "Athlete").join(", ")}</div>
    </div>`);

  if (!signals.length)
    signals.push(`<div class="card" style="text-align:center;padding:32px 16px;opacity:.6">
      <div style="font-size:36px;margin-bottom:10px">📊</div>
      <div class="title-md">No signals yet today</div>
      <div class="muted" style="font-size:13px;margin-top:6px">Activity feed populates once athletes check in.</div>
    </div>`);

  return `
    <div class="screen">
      <div class="topbar">
        <div><div class="muted">Activity</div><div class="title-xl">Signal, Not Noise</div></div>
      </div>
      <div class="list section">${signals.join("")}</div>
    </div>
  `;
}
