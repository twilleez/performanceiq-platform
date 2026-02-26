// auth.js — v1.0.0 (optional cloud auth)
// Offline-first safe: if no supabase client => acts as "local only".

(function () {
  "use strict";
  if (window.authPIQ) return;

  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function getSb() {
    return window.supabaseClient?.getClient?.() || null;
  }

  async function getSession() {
    const sb = getSb();
    if (!sb) return null;
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data?.session || null;
  }

  async function getUser() {
    const sess = await getSession();
    return sess?.user || null;
  }

  function ensureModal() {
    let back = $("authBackdrop");
    if (back) return back;

    back = document.createElement("div");
    back.id = "authBackdrop";
    back.className = "modal-backdrop";
    back.style.display = "none";

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "authModal";
    back.appendChild(modal);

    document.body.appendChild(back);
    return back;
  }

  function openModal(mode = "signin") {
    const back = ensureModal();
    const modal = $("authModal");
    back.style.display = "";

    const cloudReady = !!getSb();

    modal.innerHTML = `
      <div class="modal-head">
        <div class="modal-title">${mode === "signup" ? "Create account" : "Sign in"}</div>
        <button class="btn ghost small" id="authClose">Close</button>
      </div>

      <div class="modal-body">
        ${cloudReady ? `
          <div class="row gap wrap">
            <button class="btn ${mode==="signin" ? "" : "ghost"}" id="authTabIn">Sign in</button>
            <button class="btn ${mode==="signup" ? "" : "ghost"}" id="authTabUp">Sign up</button>
          </div>

          <div style="height:12px"></div>

          <div class="field">
            <label>Email</label>
            <input id="authEmail" type="text" placeholder="you@email.com" />
          </div>
          <div style="height:10px"></div>
          <div class="field">
            <label>Password</label>
            <input id="authPass" type="password" placeholder="••••••••" />
          </div>

          <div style="height:14px"></div>
          <button class="btn" id="authGo">${mode === "signup" ? "Create account" : "Sign in"}</button>

          <div class="small muted" id="authMsg" style="margin-top:10px"></div>
        ` : `
          <div class="callout">
            <b>Cloud is not configured.</b>
            <div class="small muted" style="margin-top:6px">
              Add supabase-js script + set credentials in <span class="mono">supabaseClient.js</span>.
              The app will continue running locally until then.
            </div>
          </div>
        `}
      </div>

      <div class="modal-foot">
        ${cloudReady ? `<button class="btn ghost" id="authForgot">Forgot password</button>` : ``}
        <div class="muted small mono">Offline-first safe</div>
      </div>
    `;

    $("authClose").onclick = closeModal;
    $("authTabIn") && ($("authTabIn").onclick = () => openModal("signin"));
    $("authTabUp") && ($("authTabUp").onclick = () => openModal("signup"));

    const authMsg = $("authMsg");
    const setMsg = (t) => { if (authMsg) authMsg.textContent = t || ""; };

    $("authGo") && ($("authGo").onclick = async () => {
      const sb = getSb();
      if (!sb) return;

      const email = $("authEmail").value.trim();
      const password = $("authPass").value;
      if (!email || !password) { setMsg("Enter email + password."); return; }

      setMsg("Working…");

      try {
        if (mode === "signup") {
          const { error } = await sb.auth.signUp({ email, password });
          if (error) throw error;
          setMsg("Account created. Check your email if confirmation is required, then sign in.");
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          setMsg("Signed in.");
          // let app re-render after auth change
          window.dispatchEvent(new Event("piq-auth-changed"));
          setTimeout(closeModal, 350);
        }
      } catch (e) {
        setMsg(e?.message || "Auth failed.");
      }
    });

    $("authForgot") && ($("authForgot").onclick = async () => {
      const sb = getSb();
      if (!sb) return;
      const email = $("authEmail").value.trim();
      if (!email) { setMsg("Enter your email first."); return; }
      setMsg("Sending reset…");
      const { error } = await sb.auth.resetPasswordForEmail(email);
      setMsg(error ? (error.message || "Failed.") : "Password reset email sent.");
    });
  }

  function closeModal() {
    const back = $("authBackdrop");
    if (back) back.style.display = "none";
  }

  async function signOut() {
    const sb = getSb();
    if (!sb) return;
    await sb.auth.signOut();
    window.dispatchEvent(new Event("piq-auth-changed"));
  }

  window.authPIQ = {
    open: openModal,
    close: closeModal,
    getSession,
    getUser,
    signOut,
    cloudReady: () => !!getSb()
  };
})();
