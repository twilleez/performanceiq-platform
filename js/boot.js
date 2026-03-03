// /js/boot.js
import { initApp } from "./app.js";

function safeHideLoader() {
  const el = document.getElementById("loadingScreen");
  if (!el) return;
  el.style.display = "none";
  el.style.pointerEvents = "none";
}

try {
  await initApp();
} catch (err) {
  console.error("[PIQ] boot failed", err);
  // Ensure UI is not trapped behind loader even if init fails
  safeHideLoader();
}
