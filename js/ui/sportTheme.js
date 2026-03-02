// /js/ui/sportTheme.js
// Sets CSS variables per sport. Keep minimal + safe.

const THEMES = {
  basketball: { accent: "#00d4aa" },
  football: { accent: "#f59e0b" },
  soccer: { accent: "#3b82f6" },
  baseball: { accent: "#ef4444" },
  track: { accent: "#a855f7" },
};

export function applySportTheme(sport) {
  const key = String(sport || "basketball").toLowerCase();
  const t = THEMES[key] || THEMES.basketball;
  document.documentElement.style.setProperty("--accent", t.accent);
}
