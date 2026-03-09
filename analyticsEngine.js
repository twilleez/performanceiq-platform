window.PIQAnalytics={
  weeklyLoad(sessions){return (sessions||[]).slice(-7).reduce((s,x)=>s+Number(x.volume_score||0),0);},
  compliance(sessions){if(!(sessions||[]).length) return 0; return Math.round((sessions.filter(x=>x.completed).length/sessions.length)*100);},
  readiness(checkins){if(!(checkins||[]).length) return 75; const c=checkins.at(-1); return Math.round((c.sleep+c.energy+(11-c.soreness)+(11-c.stress))*2.5);},
  piq(state){const strength=Math.min(100,Math.round(((state.analytics.metrics.squat_est||135)+(state.analytics.metrics.bench_est||95))/4));const speed=Math.max(40,Math.round(100-((state.analytics.metrics.sprint_40||5.4)-4.4)*25));const recovery=this.readiness(state.wellness.checkins);const compliance=this.compliance(state.sessions);const conditioning=Math.max(40,Math.round(100-(this.weeklyLoad(state.sessions)-40))); const total=.30*strength+.20*speed+.20*conditioning+.15*compliance+.15*recovery; return{score:Math.round(total),strength,speed,conditioning,compliance,recovery};}
};
