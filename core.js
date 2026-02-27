(function(){
"use strict";

const STORAGE="piq_state_v11";
let state=JSON.parse(localStorage.getItem(STORAGE)||"{}")||{
 role:"coach",
 sport:"basketball",
 athletes:[],
};

function save(){
 document.getElementById("syncIndicator").className="sync-dot saving";
 document.getElementById("syncText").textContent="Saving…";
 localStorage.setItem(STORAGE,JSON.stringify(state));
 setTimeout(()=>{
   document.getElementById("syncIndicator").className="sync-dot synced";
   document.getElementById("syncText").textContent="Saved";
 },500);
}

function showView(v){
 document.querySelectorAll(".view").forEach(x=>x.hidden=true);
 document.getElementById("view-"+v).hidden=false;
 document.querySelectorAll(".navbtn").forEach(b=>{
   b.classList.toggle("active",b.dataset.view===v);
 });
}

document.querySelectorAll(".navbtn").forEach(btn=>{
 btn.onclick=()=>showView(btn.dataset.view);
});

/* Auto macro calculator */
function computeMacros(weight,goal){
 let protein=weight*0.9;
 let carbs=goal==="gain"?weight*2.2:weight*1.8;
 let fat=weight*0.35;
 return {protein:Math.round(protein),carbs:Math.round(carbs),fat:Math.round(fat)};
}

/* Onboarding Wizard */
function runOnboarding(){
 const role=prompt("Are you Coach or Athlete?");
 state.role=role.toLowerCase();
 save();
 alert("Welcome to PerformanceIQ "+state.role);
}

/* Tooltip */
document.addEventListener("mouseover",e=>{
 if(e.target.dataset.tip){
   const t=document.getElementById("tooltip");
   t.textContent=e.target.dataset.tip;
   t.style.left=e.pageX+10+"px";
   t.style.top=e.pageY+10+"px";
   t.hidden=false;
 }
});
document.addEventListener("mouseout",()=>{
 document.getElementById("tooltip").hidden=true;
});

/* Confirm Dialog */
function confirmAction(msg,cb){
 const overlay=document.createElement("div");
 overlay.className="confirm-overlay";
 overlay.innerHTML=`
  <div class="confirm-box">
    <p>${msg}</p>
    <button id="yesBtn">Confirm</button>
    <button id="noBtn">Cancel</button>
  </div>`;
 document.body.appendChild(overlay);
 document.getElementById("yesBtn").onclick=()=>{cb();overlay.remove();}
 document.getElementById("noBtn").onclick=()=>overlay.remove();
}

/* Sport Themes */
function applySportTheme(){
 const s=state.sport;
 const root=document.documentElement;
 if(s==="football") root.style.setProperty("--accent","#16a34a");
 if(s==="soccer") root.style.setProperty("--accent","#eab308");
 if(s==="basketball") root.style.setProperty("--accent","#2e7cff");
}

applySportTheme();
runOnboarding();
showView("home");

setTimeout(()=>document.getElementById("splash").remove(),1200);

})();
