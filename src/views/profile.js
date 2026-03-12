export function profileView(state) {
  const { profile } = state;
  if (!profile) return `<div class="screen"><div class="muted">Loading profile…</div></div>`;

  return `
    <div class="screen">
      <div class="topbar">
        <div><div class="muted">Profile</div><div class="title-xl">${profile.name}</div></div>
        <span class="role-badge">${profile.role}</span>
      </div>

      <div class="grid two section">
        <div class="card">
          <div class="title-md">Athlete Identity</div>
          <div class="list section">
            <div class="item"><strong>Sport</strong><div class="muted">${profile.sport}</div></div>
            <div class="item"><strong>Position</strong><div class="muted">${profile.position || "—"}</div></div>
            <div class="item"><strong>Goal</strong><div class="muted">${profile.goal || "—"}</div></div>
            <div class="item"><strong>Equipment</strong><div class="muted">${(profile.equipment || []).join(", ") || "—"}</div></div>
          </div>
        </div>
        <div class="card">
          <div class="title-md">Account</div>
          <div class="list section">
            <div class="item"><strong>Email</strong><div class="muted">${profile.email}</div></div>
            <div class="item"><strong>Role</strong><div class="muted" style="text-transform:capitalize">${profile.role}</div></div>
            <div class="item"><strong>Units</strong><div class="muted">Imperial</div></div>
          </div>
          <button class="secondary sm" style="margin-top:14px;width:100%" data-action="sign-out">Sign Out</button>
        </div>
      </div>

      <div class="card section">
        <div class="title-md">Recovery Notes</div>
        <div class="muted section">${profile.notes || "No notes yet."}</div>
      </div>
    </div>`;
}
