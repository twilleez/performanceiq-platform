// views/dashboardView.js
export function renderDashboardView({ teamName = "Varsity Basketball", dateLabel = "Today", rows = [] } = {}) {
  const summary = summarize(rows);

  return `
    <section class="piq-hero">
      <h2>Team Status – ${escapeHtml(dateLabel)}</h2>
      <div class="piq-hero-stats">
        <div class="stat green">🟢 ${summary.ready} Ready</div>
        <div class="stat yellow">🟡 ${summary.monitor} Monitor</div>
        <div class="stat red">🔴 ${summary.highRisk} High Risk</div>
        <div class="stat">Avg PIQ: ${summary.avgPIQ}</div>
        <div class="stat">Compliance: ${summary.compliancePct}%</div>
      </div>
    </section>

    <section class="piq-card">
      <h3>Athlete Readiness Board</h3>
      <div class="piq-table-wrap">
        <table class="piq-table">
          <thead>
            <tr>
              <th>Athlete</th><th>PIQ</th><th>ACR</th><th>Sleep</th><th>Soreness</th><th>Risk Flags</th><th>Trend</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr data-athlete-id="${escapeAttr(r.athlete_id)}" class="piq-row">
                <td>${escapeHtml(r.athlete_name)}</td>
                <td><span class="badge ${badgeClass(r.severity)}">${num(r.piq_total)}</span></td>
                <td>${fmt(r.acr)}</td>
                <td>${fmt(r.sleep_hours)}h</td>
                <td>${fmt(r.soreness)}</td>
                <td>${escapeHtml(r.risk_text || "")}</td>
                <td>${fmt(r.delta_vs_prev7)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="piq-card">
      <h3>Team Load Trend – Last 4 Weeks</h3>
      <div class="chart-placeholder">Line Chart Placeholder (Acute vs Chronic Load)</div>
    </section>

    <section class="piq-card">
      <h3>Weekly Compliance</h3>
      <div class="chart-placeholder">Bar Chart Placeholder (Logging % Per Athlete)</div>
    </section>
  `;
}

// ---------- helpers ----------
function summarize(rows) {
  const ready = rows.filter(r => r.severity === "green").length;
  const monitor = rows.filter(r => r.severity === "yellow").length;
  const highRisk = rows.filter(r => r.severity === "red").length;
  const avgPIQ = rows.length ? Math.round(rows.reduce((a,r)=>a+(Number(r.piq_total)||0),0)/rows.length) : 0;
  const compliancePct = rows.length ? 100 : 0; // replace with real compliance calc later
  return { ready, monitor, highRisk, avgPIQ, compliancePct };
}
function badgeClass(sev){ return sev === "red" ? "red" : sev === "yellow" ? "yellow" : "green"; }
function fmt(x){ return (x === null || x === undefined) ? "—" : String(x); }
function num(x){ return (x === null || x === undefined) ? "—" : Number(x).toFixed(0); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,"&quot;"); }
