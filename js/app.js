function render(){
  if(!state.session.loggedIn){
    app.innerHTML=`<div class="auth"><div class="card"><h2>PerformanceIQ Login</h2><p class="muted">Phase 8 upgrade with preserved prior-phase functionality plus analytics, alerts, heatmap, periodization, builder, and recruiting export.</p><label>Email<input id="auth-email" placeholder="coach@team.com"></label><br><label>Role<select id="auth-role"><option value="coach">Coach</option><option value="athlete">Athlete</option></select></label><br><button id="login-btn">Login</button></div></div>`;

    document.getElementById("login-btn").onclick = async () => {
      const email = document.getElementById("auth-email").value.trim();
      if (!email) return alert("Enter email.");

      state.session.loggedIn = true;
      state.session.user = email;
      state.session.role = document.getElementById("auth-role").value;
      state.view = state.session.role === "athlete" ? "athlete" : "dashboard";

      // Only try to hydrate if Supabase is wired
      if (state.bootMode === "supabase-configured" && typeof hydrateCoachDashboard === "function" && typeof supabase !== "undefined") {
        try {
          await hydrateCoachDashboard(state, supabase);
        } catch (err) {
          console.error("hydrateCoachDashboard failed", err);
          // Optional: fall back message, but keep app usable
        }
      }

      render();
    };

    return;
  }

  let content = dashboardView();
  if(state.view==="team")content=teamView();
  else if(state.view==="workouts")content=workoutsView();
  else if(state.view==="analytics")content=analyticsView();
  else if(state.view==="builder")content=builderView();
  else if(state.view==="athlete")content=athleteView();
  else if(state.view==="periodization")content=periodizationView();
  else if(state.view==="recruiting")content=recruitingView();
  else if(state.view==="setup")content=setupView();
  app.innerHTML=shell(content);
  bind();
}
