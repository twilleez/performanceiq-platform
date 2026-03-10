const state = {
  bootMode: (window.__PIQ_SUPABASE_URL__ && window.__PIQ_SUPABASE_ANON_KEY__) ? "supabase-configured" : "local-fallback",
  session: { loggedIn: false, user: "", role: "coach" },
  team: { name: "No Team Loaded", joinCode: "-", athletes: [] },
  summary: { piq: 0, readiness: 0, weeklyLoad: 0, atRisk: 0 },
  analytics: { teamTrend:[72,74,75,77,79,81,80], loadTrend:[300,340,360,390,420,410,430], readinessTrend:[82,80,79,83,81,78,80] },
  builder: { title:"", dayType:"strength", notes:"" }
};

const app = document.getElementById("app");
const boot = document.getElementById("bootStatus");
boot.textContent = `Boot mode: ${state.bootMode}`;

function navButton(label, view){
  return `<button class="${state.view===view?"":"secondary"}" data-nav="${view}">${label}</button>`;
}

function lineSVG(values, stroke){
  const max=Math.max(...values,1), min=Math.min(...values,0), range=(max-min)||1;
  const pts=values.map((v,i)=>`${(i/(values.length-1||1))*100},${100-((v-min)/range)*100}`).join(" ");
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline fill="none" stroke="${stroke}" stroke-width="2" points="${pts}" /></svg>`;
}

function shell(content){
  return `
    <div class="app">
      <aside class="sidebar">
        <div style="font-size:24px;font-weight:900">PerformanceIQ</div>
        <div class="muted">Phase 7 Upgrade</div>
        <div class="nav">
          ${navButton("Dashboard","dashboard")}
          ${navButton("Analytics","analytics")}
          ${navButton("Builder","builder")}
          ${navButton("Athlete Mobile","athlete")}
          ${navButton("Setup","setup")}
          <button class="secondary" data-action="logout">Logout</button>
        </div>
      </aside>
      <main class="main">${content}</main>
    </div>
  `;
}

function renderAuth(){
  app.innerHTML = `
    <div class="auth">
      <div class="card">
        <h2>PerformanceIQ Login</h2>
        <p class="muted">Phase 7 upgrade package with analytics, risk engine, athlete mobile view, and workout builder.</p>
        <label>Email<input id="auth-email" placeholder="coach@team.com"></label><br>
        <label>Role
          <select id="auth-role">
            <option value="coach">Coach</option>
            <option value="athlete">Athlete</option>
          </select>
        </label><br>
        <button id="login-btn">Login</button>
      </div>
    </div>
  `;
  document.getElementById("login-btn").onclick = () => {
    const email = document.getElementById("auth-email").value.trim();
    const role = document.getElementById("auth-role").value;
    if(!email) return alert("Enter email.");
    state.session.loggedIn = true;
  };
}

function dashboardView(){
  return `
    <div class="grid cards">
      <div class="card"><h3>Team PIQ</h3><div class="timer">${state.summary.piq}</div></div>
      <div class="card"><h3>Avg Readiness</h3><div class="timer">${state.summary.readiness}</div></div>
      <div class="card"><h3>Weekly Load</h3><div class="timer">${state.summary.weeklyLoad}</div></div>
      <div class="card"><h3>Athletes at Risk</h3><div class="timer">${state.summary.atRisk}</div></div>
    </div>
    <div class="grid two">
      <div class="card">
        <h2>Phase 7 Status</h2>
        <p>Boot mode: <strong>${state.bootMode}</strong></p>
        <p>User: <strong>${state.session.user || "-"}</strong> (${state.session.role})</p>
        <p>Team: <strong>${state.team.name}</strong></p>
        <p>Join Code: <strong>${state.team.joinCode}</strong></p>
      </div>
      <div class="card">
        <h2>Included</h2>
        <div class="list">
          <div class="item">Analytics view</div>
          <div class="item">Risk engine rules</div>
          <div class="item">Workout builder UI</div>
          <div class="item">Athlete mobile prototype</div>
        </div>
      </div>
    </div>
  `;
}

function analyticsView(){
  return `
    <div class="grid cards">
      <div class="card"><h3>Avg Team PIQ</h3><div class="timer">${state.summary.piq}</div></div>
      <div class="card"><h3>Avg Team Readiness</h3><div class="timer">${state.summary.readiness}</div></div>
      <div class="card"><h3>Total Weekly Load</h3><div class="timer">${state.summary.weeklyLoad}</div></div>
      <div class="card"><h3>Risk Flags</h3><div class="timer">${state.summary.atRisk}</div></div>
    </div>
    <div class="grid two">
      <div class="card"><h2>PIQ Trend</h2>${lineSVG(state.analytics.teamTrend,"#4cc9f0")}</div>
      <div class="card"><h2>Load Trend</h2>${lineSVG(state.analytics.loadTrend,"#ffb703")}</div>
    </div>
    <div class="grid two">
      <div class="card"><h2>Readiness Trend</h2>${lineSVG(state.analytics.readinessTrend,"#3ddc97")}</div>
      <div class="card"><h2>Risk Engine Rules</h2>
        <div class="list">
          <div class="item">High risk if readiness &lt; 60</div>
          <div class="item">Medium risk if readiness &lt; 75</div>
          <div class="item">High risk if ACR &gt; 1.5</div>
          <div class="item">Medium risk if ACR &gt; 1.3</div>
        </div>
      </div>
    </div>
  `;
}

function builderView(){
  return `
    <div class="grid two">
      <div class="card">
        <h2>Workout Builder</h2>
        <label>Workout title<input id="wb-title" value="${state.builder.title}" placeholder="Lower Body Strength"></label><br>
        <label>Day type
          <select id="wb-day-type">
            <option value="strength">Strength</option>
            <option value="power">Power</option>
            <option value="speed">Speed</option>
            <option value="recovery">Recovery</option>
          </select>
        </label><br>
        <label>Notes<textarea id="wb-notes" rows="6" placeholder="Warm-up, primary lift, accessories...">${state.builder.notes}</textarea></label><br>
        <div class="row">
          <button data-action="build-save">Save Workout</button>
          <button class="secondary" data-action="build-seed">Seed Example</button>
        </div>
      </div>
      <div class="card">
        <h2>Builder Status</h2>
        <div class="list">
          <div class="item">Uses workouts and workout_assignments when Supabase is connected</div>
          <div class="item">Falls back to local demo mode now</div>
        </div>
      </div>
    </div>
  `;
}

function athleteView(){
  return `
    <div class="card">
      <div class="row"><h2>Athlete Mobile View</h2><span class="pill">Prototype</span></div>
      <div class="card"><h3>Today</h3><div class="item">No assigned workout loaded in local demo.</div></div>
      <div class="card"><h3>Quick Wellness</h3><div class="row"><span class="pill">Sleep</span><span class="pill">Stress</span><span class="pill">Soreness</span><span class="pill">Energy</span></div></div>
    </div>
  `;
}

function setupView(){
  return `
    <div class="card">
      <h2>Phase 7 Setup</h2>
      <p>${state.bootMode==="supabase-configured" ? "Supabase keys detected." : "Supabase keys not detected. Running local fallback shell."}</p>
      <div class="list">
        <div class="item">Dashboard remains schema-aligned from Phase 6</div>
        <div class="item">Analytics adds trend visuals</div>
        <div class="item">Workout Builder is ready for workouts + workout_assignments</div>
      </div>
    </div>
  `;
}

function bind(){
  app.querySelectorAll("[data-nav]").forEach(btn => {
    btn.onclick = () => {
      state.view = btn.dataset.nav;
      render();
    };
  });
  const seed = app.querySelector("[data-action='build-seed']");
  if(seed) seed.onclick = () => {
    document.getElementById("wb-title").value = "Explosive Lower";
    document.getElementById("wb-day-type").value = "power";
    document.getElementById("wb-notes").value = "Box jumps, goblet squat, split squat, plank.";
  };
  const save = app.querySelector("[data-action='build-save']");
  if(save) save.onclick = () => {
    state.builder.title = document.getElementById("wb-title").value.trim();
    state.builder.dayType = document.getElementById("wb-day-type").value;
    state.builder.notes = document.getElementById("wb-notes").value.trim();
    alert(state.bootMode === "supabase-configured" ? "Connect write handlers to save into workouts + workout_assignments." : "Saved into local demo state.");
  };
}

function render(){
  if(!state.session.loggedIn){
    app.innerHTML = `
      <div class="auth">
        <div class="card">
          <h2>PerformanceIQ Login</h2>
          <p class="muted">Phase 7 upgrade package with analytics, risk engine, athlete mobile view, and workout builder.</p>
          <label>Email<input id="auth-email" placeholder="coach@team.com"></label><br>
          <label>Role
            <select id="auth-role">
              <option value="coach">Coach</option>
              <option value="athlete">Athlete</option>
            </select>
          </label><br>
          <button id="login-btn">Login</button>
        </div>
      </div>
    `;
    document.getElementById("login-btn").onclick = () => {
      const email = document.getElementById("auth-email").value.trim();
      if(!email) return alert("Enter email.");
      state.session.loggedIn = true;
      state.session.user = email;
      state.session.role = document.getElementById("auth-role").value;
      state.view = state.session.role === "athlete" ? "athlete" : "dashboard";
      render();
    };
    return;
  }
  const view = state.view || "dashboard";
  let content = dashboardView();
  if(view === "analytics") content = analyticsView();
  else if(view === "builder") content = builderView();
  else if(view === "athlete") content = athleteView();
  else if(view === "setup") content = setupView();
  app.innerHTML = shell(content);
  bind();
}

render();
