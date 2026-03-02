// /js/boot.js
import { toast } from "./services/toast.js";

function showBootBadge(okText) {
  // optional badge for debugging; remove later
  const b = document.createElement("div");
  b.style.cssText = "position:fixed;top:10px;left:10px;z-index:9999;font:12px/1.2 system-ui;background:rgba(0,0,0,.55);color:#fff;padding:8px 10px;border-radius:10px;backdrop-filter:blur(8px)";
  b.textContent = okText;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1600);
}

function fatal(msg) {
  console.error("[BOOT]", msg);
  try { toast(String(msg), { timeout: 6000 }); } catch {}
  const ls = document.getElementById("loadingScreen");
  if (ls) ls.style.display = "none";
}

window.addEventListener("error", (e) => {
  // Module import errors sometimes surface here on mobile.
  if (String(e?.message || "").includes("Failed to fetch dynamically imported module")) {
    fatal("Module import failed (wrong path / caching). Hard refresh and try again.");
  }
});
window.addEventListener("unhandledrejection", (e) => {
  fatal(e?.reason?.message || e?.reason || "Unhandled error");
});

(async function boot() {
  try {
    showBootBadge("BOOT OK");
    const { initApp } = await import("./app.js");
    await initApp();
    document.documentElement.classList.add("piq-booted");
    showBootBadge("APP OK");
  } catch (err) {
    fatal(err?.message || err);
  }
})();
