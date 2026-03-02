// /js/ui/interactions.js
// Small UX helpers, ARIA labels, colorblind-friendly risk labels.

export function installInteractions() {
  // Ensure icon-only buttons have aria-label (some already do)
  document.querySelectorAll("button.icon-btn").forEach((b) => {
    if (!b.getAttribute("aria-label")) {
      const title = b.getAttribute("title") || "Button";
      b.setAttribute("aria-label", title);
    }
  });

  // Add textual label to risk badge if present
  const riskBadge = document.getElementById("riskBadge");
  if (riskBadge && !riskBadge.getAttribute("aria-label")) {
    riskBadge.setAttribute("aria-label", "Risk alerts");
  }
}
