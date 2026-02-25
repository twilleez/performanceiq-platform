(function(){

const store = JSON.parse(localStorage.getItem("piqData") || "{}");

store.athletes = store.athletes || [];
store.logs = store.logs || [];
store.nutrition = store.nutrition || [];
store.plan = store.plan || [];
store.role = store.role || "coach";

function save() {
  localStorage.setItem("piqData", JSON.stringify(store));
}

function hideSplash(){
  setTimeout(()=> {
    const s=document.getElementById("splash");
    if(s) s.style.display="none";
  },600);
}

function switchView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  const el=document.getElementById("view-"+view);
  if(el) el.classList.remove("hidden");
}

function refreshAthleteDropdowns(){
  const selects=["logAthlete","nutAthlete","workoutAthlete"];
  selects.forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.innerHTML="";
    store.athletes.forEach(a=>{
      const o=document.createElement("option");
      o.value=a;
      o.textContent=a;
      el.appendChild(o);
    });
  });
}

function addAthlete(){
  const name=document.getElementById("athleteName").value.trim();
  if(!name) return;
  store.athletes.push(name);
  save();
  refreshAthleteDropdowns();
  renderRoster();
}

function renderRoster(){
  const div=document.getElementById("roster");
  div.innerHTML=store.athletes.map(a=>"<div>"+a+"</div>").join("");
}

function saveLog(){
  const athlete=document.getElementById("logAthlete").value;
  const min=Number(document.getElementById("logMinutes").value);
  const rpe=Number(document.getElementById("logRpe").value);
  const load=min*rpe;
  store.logs.push({athlete,min,rpe,load,date:new Date().toISOString()});
  save();
  renderLogs();
}

function renderLogs(){
  const div=document.getElementById("logList");
  div.innerHTML=store.logs.map(l=>`<div>${l.athlete} | Load: ${l.load}</div>`).join("");
}

function saveNutrition(){
  const athlete=document.getElementById("nutAthlete").value;
  const p=Number(document.getElementById("protein").value);
  const c=Number(document.getElementById("carbs").value);
  const f=Number(document.getElementById("fat").value);
  store.nutrition.push({athlete,p,c,f});
  save();
  renderNutrition();
}

function renderNutrition(){
  const div=document.getElementById("nutList");
  div.innerHTML=store.nutrition.map(n=>`<div>${n.athlete} | P:${n.p} C:${n.c} F:${n.f}</div>`).join("");
}

function buildWorkout(){
  const athlete=document.getElementById("workoutAthlete").value;
  const mode=document.getElementById("mode").value;
  let rpe=mode==="advanced"?8:6;
  let min=mode==="advanced"?75:60;
  const load=min*rpe;
  document.getElementById("workoutOutput").innerHTML=
    `<div>${athlete} | ${mode} | ${min}min @ RPE${rpe} | Load:${load}</div>`;
}

function generatePlan(){
  store.plan=[];
  for(let i=1;i<=8;i++){
    store.plan.push({week:i,load:100*i});
  }
  save();
  document.getElementById("planOutput").innerHTML=
    store.plan.map(p=>`<div>Week ${p.week} Load ${p.load}</div>`).join("");
}

function saveRole(){
  store.role=document.getElementById("roleSelect").value;
  document.getElementById("rolePill").textContent="Role: "+store.role;
  save();
}

function wipe(){
  localStorage.removeItem("piqData");
  location.reload();
}

document.addEventListener("DOMContentLoaded",()=>{

  hideSplash();

  document.querySelectorAll("[data-view]").forEach(btn=>{
    btn.onclick=()=>switchView(btn.dataset.view);
  });

  document.getElementById("addAthlete").onclick=addAthlete;
  document.getElementById("saveLog").onclick=saveLog;
  document.getElementById("saveNutrition").onclick=saveNutrition;
  document.getElementById("buildWorkout").onclick=buildWorkout;
  document.getElementById("generatePlan").onclick=generatePlan;
  document.getElementById("saveRole").onclick=saveRole;
  document.getElementById("wipeData").onclick=wipe;

  refreshAthleteDropdowns();
  renderRoster();
  renderLogs();
  renderNutrition();
  document.getElementById("rolePill").textContent="Role: "+store.role;

});

})();
