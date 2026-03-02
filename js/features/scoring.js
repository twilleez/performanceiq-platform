export const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
export const pct = (t, f) => Math.round(t * f);

export function getSevClass(sev){ return {green:'green',yellow:'yellow',red:'red'}[sev] || ''; }
export function getSevColor(sev){ return {green:'var(--green)',yellow:'var(--yellow)',red:'var(--red)'}[sev] || 'var(--text-dim)'; }

export function getAcrClass(acr){
  if (acr == null) return '';
  return acr < 1.3 ? 'safe' : acr <= 1.5 ? 'watch' : 'danger';
}
export function getAcrColor(acr){
  const c = getAcrClass(acr);
  return c === 'safe' ? 'var(--green)' : c === 'watch' ? 'var(--yellow)' : c === 'danger' ? 'var(--red)' : 'var(--text-dim)';
}
export function getAcrFlag(acr){
  if (acr == null) return '—';
  return acr < 1.3 ? '✅' : acr <= 1.5 ? '⚠️' : '⛔';
}

export function getRingClass(s){ return !s ? 'danger' : s >= 75 ? '' : s >= 50 ? 'warn' : 'danger'; }

export function getTier(score){
  if (score >= 85) return { cls:'great',  label:'⚡ Elite — Peak Form'             };
  if (score >= 70) return { cls:'good',   label:'✓ Strong — Trending Up'           };
  if (score >= 50) return { cls:'warn',   label:'⚠ Moderate — Monitor Load'       };
  if (score > 0)   return { cls:'danger', label:'⛔ High Risk — Rest Recommended' };
  return { cls:'', label:'— Not Logged' };
}

export function getScoreNote(a){
  if (!a.score) return 'No sessions logged today. Encourage athlete to submit a wellness check-in.';
  if (a.riskLevel === 'rest')  return `<strong>Rest today.</strong> ACWR ${a.acr} — 3+ consecutive high-load days. High injury risk before Friday. Full rest only.`;
  if (a.riskLevel === 'watch') return `ACWR ${a.acr} approaching danger zone. Reduce intensity today and monitor soreness closely.`;
  if (a.score >= 85) return `Outstanding form — all four pillars strong. Sleep ${a.sleep}h, soreness ${a.soreness}/10. Maintain momentum into game week.`;
  return `Good baseline. Sleep at ${a.sleep}h — pushing to 8h+ could add 5–10 PIQ points before Friday's game.`;
}

export function getPillars(a){
  if (!a.score) return [
    {icon:'💪',name:'Load',     value:0, color:'var(--text-dim)'},
    {icon:'⚡',name:'Streak',   value:0, color:'var(--text-dim)'},
    {icon:'🎯',name:'Variety',  value:0, color:'var(--text-dim)'},
    {icon:'🌙',name:'Recovery', value:0, color:'var(--text-dim)'},
  ];
  const cf = v => v >= 75 ? 'var(--green)' : v >= 50 ? 'var(--yellow)' : 'var(--red)';
  const load     = Math.min(100, Math.round(a.score * 1.08 + 4));
  const streak   = Math.min(100, Math.round(a.score * 0.95 + 5));
  const variety  = Math.min(100, Math.round(a.score * 0.88 + 8));
  const recovery = a.recovery != null ? a.recovery : Math.round(a.score * 0.72);
  return [
    {icon:'💪', name:'Load',     value:load,     color:cf(load)    },
    {icon:'⚡', name:'Streak',   value:streak,   color:cf(streak)  },
    {icon:'🎯', name:'Variety',  value:variety,  color:cf(variety) },
    {icon:'🌙', name:'Recovery', value:recovery, color:cf(recovery)},
  ];
}
