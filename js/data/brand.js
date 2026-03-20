export const PIQ_COLORS = { primary:'#22c955', primaryDark:'#1aab45', primaryGlow:'rgba(34,201,85,0.18)', secondary:'#3b82f6', accent:'#f59e0b', navy:'#0d1b3e' };
export const ROLE_COLORS = { coach:'#22c955', player:'#3b82f6', athlete:'#3b82f6', parent:'#f59e0b', solo:'#22c955', admin:'#94a3b8' };
export const ROLE_ICONS = { coach:'🎯', player:'⚡', athlete:'⚡', parent:'👥', solo:'🏃', admin:'🔧' };
export function piqScoreColor(s) { return s>=85?'#22c955':s>=70?'#3b82f6':s>=55?'#f59e0b':'#ef4444'; }
export function piqScoreTier(s)  { return s>=85?'ELITE':s>=70?'STRONG':s>=55?'DEVELOPING':'NEEDS WORK'; }
