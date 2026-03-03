// /js/boot.js

import { initApp } from "./app.js";

if (!window.__PIQ_BOOTED__) {
  window.__PIQ_BOOTED__ = true;

  document.addEventListener("DOMContentLoaded", () => {
    try {
      initApp();
      console.log("[BOOT] App initialized successfully");
    } catch (err) {
      console.error("[BOOT] Initialization failed:", err);
    }
  });
}
