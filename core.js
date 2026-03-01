// ===== ROUTER =====
document.querySelectorAll("[data-view]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
    document.querySelectorAll(".sidebar button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("view-"+btn.dataset.view).classList.remove("hidden");
  });
});

// ===== DEMO DATA (replace with Supabase RPC) =====
const demoData = [
  { name:"J. Smith", score:84, acr:1.08, recovery:92, severity:"green", flags:"None", trend:+6 },
  { name:"D. Brown", score:61, acr:1.42, recovery:70, severity:"yellow", flags:"Load Spike", trend:-12 },
  { name:"M. Davis", score:48, acr:1.61, recovery:55, severity:"red", flags:"Spike + Sleep", trend:-20 }
];

// ===== DASHBOARD RENDER =====
function renderDashboard(rows){
  let ready=0, monitor=0, risk=0, total=0;

  const body = document.getElementById("heatmapBody");
  body.innerHTML = rows.map(r=>{
    total+=r.score;
    if(r.severity==="green") ready++;
    if(r.severity==="yellow") monitor++;
    if(r.severity==="red") risk++;

    return `
      <tr>
        <td>${r.name}</td>
        <td><span class="badge ${r.severity}">${r.score}</span></td>
        <td>${r.acr}</td>
        <td>${r.recovery}</td>
        <td>${r.flags}</td>
        <td style="color:${r.trend>=0?'#16a34a':'#dc2626'}">
          ${r.trend>=0?'↑':'↓'} ${Math.abs(r.trend)}
        </td>
      </tr>
    `;
  }).join("");

  document.getElementById("statReady").textContent=ready;
  document.getElementById("statMonitor").textContent=monitor;
  document.getElementById("statRisk").textContent=risk;
  document.getElementById("statAvg").textContent=Math.round(total/rows.length);
}

// ===== INIT =====
renderDashboard(demoData);

// ===== REFRESH BUTTON =====
document.getElementById("btnRefresh").addEventListener("click",()=>{
  renderDashboard(demoData);
});
