// /js/boot.js
import { initApp } from "./app.js";

function domReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

if (!window.__PIQ_BOOTED__) {
  window.__PIQ_BOOTED__ = true;

  domReady(async () => {
    try {
      await initApp();
      console.log("[BOOT] App initialized successfully");
    } catch (err) {
      console.error("[BOOT] Initialization failed:", err);
      // Optional: user-facing toast if you have a super-safe fallback
      // alert("PerformanceIQ failed to start. Check console for details.");
    }
  });
}
