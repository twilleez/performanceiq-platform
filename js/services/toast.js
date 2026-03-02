// /js/services/toast.js
export function toast(message, { timeout = 2600 } = {}) {
  const host = document.getElementById("toastContainer");
  if (!host) return;

  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.textContent = message;

  host.appendChild(el);

  // allow CSS animations if present
  requestAnimationFrame(() => el.classList.add("show"));

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, timeout);
}
