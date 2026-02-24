// heatmapRenderer.js — v1.0.0

(function () {
  "use strict";
  if (window.heatmapRenderer) return;

  function getColor(score) {
    if (score >= 80) return "#2ecc71";
    if (score >= 60) return "#f1c40f";
    return "#e74c3c";
  }

  function renderHeatmap(containerId, athletes) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = "";

    athletes.forEach(a => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.marginBottom = "6px";

      row.innerHTML = `
        <div style="width:150px">${a.name}</div>
        <div style="width:100px;background:${getColor(a.readiness)}">${a.readiness}</div>
        <div style="width:100px;background:${getColor(a.performanceIQ)}">${a.performanceIQ}</div>
        <div style="width:100px">${a.risk}</div>
      `;

      el.appendChild(row);
    });
  }

  window.heatmapRenderer = { renderHeatmap };
})();
