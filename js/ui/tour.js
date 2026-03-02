// /js/ui/tour.js
import { Storage } from "../services/storage.js";
import { STORAGE_KEY_TOUR } from "../state/keys.js";
import { toast } from "../services/toast.js";

// Minimal "Today Tour": keyboard shortcut (?) and one-time toast.
export function createTodayTour({ navigate } = {}) {
  function seen() {
    try { return !!Storage.get(STORAGE_KEY_TOUR); } catch { return false; }
  }
  function mark() {
    try { Storage.set(STORAGE_KEY_TOUR, "1"); } catch {}
  }
  function maybeShow() {
    if (seen()) return;
    toast("Tip: Use the left nav to switch views. (Press ? for help)");
    mark();
  }
  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "?") {
        toast("Shortcuts: D=Dashboard, A=Athletes, T=Train, N=Analytics");
      }
      const k = e.key.toLowerCase();
      if (k === "d") navigate?.("dashboard");
      if (k === "a") navigate?.("athletes");
      if (k === "t") navigate?.("train");
      if (k === "n") navigate?.("analytics");
    });
  }
  return { maybeShow, bindKeyboardShortcuts };
}
