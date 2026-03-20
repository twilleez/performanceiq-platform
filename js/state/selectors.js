/**
 * PerformanceIQ Selectors v2
 */
import { getState } from './state.js';
import { getCurrentRole, getCurrentUser } from '../core/auth.js';

export function getCurrentRoleSelector() { return getCurrentRole(); }

export function getDashboardConfig() {
  const role = getCurrentRole();
  const configs = {
    coach:  { label:'Coach',  navItems:coachNav(),  home:'coach/home' },
    player: { label:'Player', navItems:playerNav(), home:'player/home' },
    parent: { label:'Parent', navItems:parentNav(), home:'parent/home' },
    admin:  { label:'Admin',  navItems:adminNav(),  home:'admin/home' },
    solo:   { label:'Solo',   navItems:soloNav(),   home:'solo/home' },
  };
  return configs[role] || configs.solo;
}

export function getWorkoutCount() { return getState().workoutLog.length; }

export function getStreak() {
  const log = getState().workoutLog;
  if (!log.length) return 0;
  let streak=0, current=new Date();
  for (const w of [...log].sort((a,b)=>b.ts-a.ts)) {
    const d=new Date(w.ts);
    if (d.toDateString()===current.toDateString()) { streak++; current.setDate(current.getDate()-1); }
    else break;
  }
  return streak;
}

export function getReadinessScore() {
  const ci=getState().readinessCheckIn, today=new Date().toDateString(), log=getState().workoutLog;
  if (ci.date===today && ci.sleepQuality>0) {
    const s=(ci.sleepQuality/5)*100, e=(ci.energyLevel/5)*100;
    const so=((6-ci.soreness)/5)*100, m=(ci.mood/5)*100, st=((6-ci.stressLevel)/5)*100;
    return Math.max(30,Math.min(99,Math.round(s*.30+e*.25+so*.20+m*.15+st*.10)));
  }
  if (!log.length) return 72;
  const recent=log.slice(-5);
  const avgRPE=recent.reduce((s,w)=>s+(w.avgRPE||5),0)/recent.length;
  const compliance=Math.min(100,(recent.filter(w=>w.completed).length/5)*100);
  return Math.max(30,Math.min(99,Math.round(100-(avgRPE*4)+(compliance*.2))));
}

export function getReadinessColor(score) {
  return score>=80?'#22c955':score>=60?'#f59e0b':'#ef4444';
}

export function getReadinessLabel(score) {
  return score>=85?'Your body is fully primed — push hard today.':score>=70?'Train hard. Minor adjustments may help.':score>=55?'Reduce volume 15–20%. Focus on quality.':'Active recovery only. Rest is training too.';
}

export function getPIQScore() { return getScoreBreakdown().total; }

export function getScoreBreakdown() {
  const log=getState().workoutLog, profile=getState().athleteProfile;
  const streak=getStreak(), readiness=getReadinessScore();
  const consistency=Math.min(100,Math.round((streak*12)+(Math.min(log.length,20)*2)));
  const compliance=log.length?Math.round((log.filter(w=>w.completed).length/log.length)*100):60;
  const load=Math.round((readiness*.4)+(compliance*.3)+30);
  const profileFields=['sport','position','age','weightLbs','sport','primaryGoal'];
  const profilePct=Math.round((profileFields.filter(k=>profile[k]).length/profileFields.length)*100);
  const total=Math.round(consistency*.30+readiness*.30+compliance*.20+load*.10+profilePct*.10);
  const tier=total>=85?'Elite':total>=70?'Strong':total>=55?'Developing':'Needs Work';
  return { total:Math.min(99,total), tier, consistency:{raw:consistency}, readiness:{raw:readiness}, compliance:{raw:compliance}, load:{raw:load}, profile:{raw:profilePct} };
}

export function getMacroTargets() {
  const t=getState().nutrition.targetMacros;
  return (!t||t.cal===0)?{cal:2800,pro:160,cho:350,fat:80}:t;
}
export function getMacroProgress() {
  const c=getState().nutrition.macros, t=getMacroTargets();
  const pct=(v,m)=>Math.min(100,Math.round((v/m)*100));
  return { cal:{current:c.cal,target:t.cal,pct:pct(c.cal,t.cal)}, pro:{current:c.pro,target:t.pro,pct:pct(c.pro,t.pro)}, cho:{current:c.cho,target:t.cho,pct:pct(c.cho,t.cho)}, fat:{current:c.fat,target:t.fat,pct:pct(c.fat,t.fat)} };
}

function coachNav()  { return [{route:'coach/home',label:'Dashboard',icon:'🏠'},{route:'coach/team',label:'Team',icon:'👥'},{route:'coach/roster',label:'Roster',icon:'📋'},{route:'coach/program',label:'Programs',icon:'📐'},{route:'coach/readiness',label:'Readiness',icon:'💚'},{route:'coach/analytics',label:'Analytics',icon:'📈'},{route:'coach/messages',label:'Messages',icon:'💬'},{route:'coach/settings',label:'Settings',icon:'⚙️'}]; }
function playerNav() { return [{route:'player/home',label:'Dashboard',icon:'🏠'},{route:'player/today',label:'Today',icon:'⚡'},{route:'player/log',label:'Log',icon:'✏️'},{route:'player/progress',label:'Progress',icon:'📈'},{route:'player/score',label:'PIQ Score',icon:'🏅'},{route:'player/readiness',label:'Readiness',icon:'💚'},{route:'player/nutrition',label:'Nutrition',icon:'🥗'},{route:'player/settings',label:'Settings',icon:'⚙️'}]; }
function parentNav() { return [{route:'parent/home',label:'Dashboard',icon:'🏠'},{route:'parent/child',label:'My Athlete',icon:'🏃'},{route:'parent/week',label:'Weekly Plan',icon:'📅'},{route:'parent/progress',label:'Progress',icon:'📈'},{route:'parent/messages',label:'Messages',icon:'💬'},{route:'parent/settings',label:'Settings',icon:'⚙️'}]; }
function adminNav()  { return [{route:'admin/home',label:'Overview',icon:'🏠'},{route:'admin/org',label:'Org',icon:'🏫'},{route:'admin/teams',label:'Teams',icon:'👥'},{route:'admin/coaches',label:'Coaches',icon:'🎽'},{route:'admin/athletes',label:'Athletes',icon:'🏃'},{route:'admin/settings',label:'Settings',icon:'⚙️'}]; }
function soloNav()   { return [{route:'solo/home',label:'Dashboard',icon:'🏠'},{route:'solo/today',label:'Today',icon:'⚡'},{route:'solo/builder',label:'Builder',icon:'📐'},{route:'solo/library',label:'Library',icon:'📚'},{route:'solo/progress',label:'Progress',icon:'📈'},{route:'solo/score',label:'PIQ Score',icon:'🏅'},{route:'solo/readiness',label:'Readiness',icon:'💚'},{route:'solo/settings',label:'Settings',icon:'⚙️'}]; }
