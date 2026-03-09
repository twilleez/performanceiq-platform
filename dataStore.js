window.dataStore=(function(){
  const KEY=(window.PIQConfig&&window.PIQConfig.storageKey)||'piq_platform_state_v2';
  const clone=(v)=>JSON.parse(JSON.stringify(v));
  function base(){
    const today=new Date().toISOString();
    return {
      meta:{version:'2.0.0',updated_at:today},
      profile:{name:'Jordan Davis',sport:'basketball',position:'pg',role:'athlete',team_mode:'solo',team_code:'',goal:'strength_speed',experience:'intermediate',training_days:4,weight_lbs:160,equipment:['bodyweight','dumbbells'],meal_plan_enabled:false,onboarded:false},
      ui:{currentView:'dashboard'},
      sessions:[],
      currentSession:null,
      wellness:{checkins:[]},
      nutrition:{meals:[]},
      analytics:{metrics:{vertical_jump:24,sprint_40:5.1,squat_est:185,bench_est:145}},
      team:{announcements:[{id:'a1',title:'Landing quality',message:'Stick every landing and own position before adding speed.'}],athletes:[
        {id:'ath1',name:'Jordan Davis',position:'PG',piq:78,readiness:82,compliance:88,risk:'Low'},
        {id:'ath2',name:'Marcus Cole',position:'SG',piq:73,readiness:67,compliance:81,risk:'Medium'},
        {id:'ath3',name:'Andre Smith',position:'SF',piq:69,readiness:58,compliance:74,risk:'High'}
      ]}
    };
  }
  let state;
  function read(){ if(state) return state; try{ state=JSON.parse(localStorage.getItem(KEY))||base(); }catch(e){ state=base(); } return state; }
  function save(reason='save'){ const s=read(); s.meta.updated_at=new Date().toISOString(); s.meta.reason=reason; localStorage.setItem(KEY,JSON.stringify(s)); return s; }
  return {
    getState:()=>read(),
    saveState:save,
    reset:()=>{ state=base(); save('reset'); return state; },
    replace:(next)=>{ state=clone(next); save('replace'); return state; }
  };
})();
