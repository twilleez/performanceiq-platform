// /js/ui/theme.js
import { Storage } from "../services/storage.js";

const KEY = "piq_theme_pref_v1";

export function getThemePref() {
  try {
    return Storage.get(KEY) || "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme) {
  const t = (theme === "light") ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  try { Storage.set(KEY, t); } catch {}
}

export function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
}
