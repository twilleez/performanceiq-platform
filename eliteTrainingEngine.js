window.PIQEliteTraining=(function(){
  function difficultyOkay(ex, level){const map={beginner:1,intermediate:2,advanced:3};return (map[ex.difficulty]||1) <= (map[level]||2);}
  function choose(movement, intent, profile){return window.PIQExerciseLibrary.all().filter(ex=>ex.movement===movement && (!intent||ex.intent===intent) && difficultyOkay(ex,profile.experience) && window.PIQExerciseLibrary.compatible(ex, profile.equipment));}
  function firstOf(arr){return arr[0]||null;}
  function buildBlock(title, items){return {title,items:items.filter(Boolean).map(ex=>({exercise_id:ex.id,name:ex.title,sets:ex.defaultSets,reps:ex.defaultReps,rest_sec:ex.defaultRest,cues:ex.cues.join(' • '),fatigue:ex.fatigue}))};}
  function split(days){if(days>=5) return ['lower_strength','upper_strength','power_speed','lower_hypertrophy','conditioning']; return ['lower_strength','upper_strength','power_speed','conditioning'];}
  function session(dayType, profile, week){const phase=window.PIQPeriodization.getPhase(week||1); const blocks=[];
    blocks.push(buildBlock('Prep + Activation',[firstOf(choose('anti_extension','stability',profile)), firstOf(choose('anti_rotation','stability',profile))]));
    if(dayType==='lower_strength'){blocks.push(buildBlock('Power',[firstOf(choose('plyometric','power',profile))]));blocks.push(buildBlock('Primary Strength',[firstOf(choose('squat','strength',profile))]));blocks.push(buildBlock('Secondary Strength',[firstOf(choose('hinge','strength',profile))]));blocks.push(buildBlock('Accessory',[firstOf(choose('lunge','strength',profile))]));}
    if(dayType==='upper_strength'){blocks.push(buildBlock('Primary Push',[firstOf(choose('horizontal_push','strength',profile)),firstOf(choose('vertical_push','strength',profile))]));blocks.push(buildBlock('Primary Pull',[firstOf(choose('horizontal_pull','strength',profile)),firstOf(choose('vertical_pull','strength',profile))]));}
    if(dayType==='power_speed'){blocks.push(buildBlock('Speed',[firstOf(choose('sprint','speed',profile))]));blocks.push(buildBlock('Plyometrics',[firstOf(choose('plyometric','power',profile))]));blocks.push(buildBlock('Finish',[firstOf(choose('conditioning','conditioning',profile))]));}
    if(dayType==='lower_hypertrophy'){blocks.push(buildBlock('Strength Volume',[firstOf(choose('squat','strength',profile)),firstOf(choose('hinge','strength',profile)),firstOf(choose('lunge','strength',profile))]));}
    if(dayType==='conditioning'){blocks.push(buildBlock('Conditioning',[firstOf(choose('conditioning','conditioning',profile)), firstOf(choose('cod','conditioning',profile))]));}
    const volume=blocks.flatMap(b=>b.items).reduce((s,x)=>s+Number(x.fatigue||0),0);
    return {id:'sess_'+Date.now()+'_'+dayType,dayType,phase:phase.name,week,blocks,volume_score:volume,duration_min:Math.max(38,blocks.length*11+12),completed:false};
  }
  function swapOptions(item, profile){const source=window.PIQExerciseLibrary.getById(item.exercise_id); if(!source) return []; return window.PIQExerciseLibrary.all().filter(ex=>ex.id!==source.id && ex.movement===source.movement && ex.intent===source.intent && difficultyOkay(ex,profile.experience) && window.PIQExerciseLibrary.compatible(ex, profile.equipment));}
  return {split,generateWeek(profile,week){return split(Number(profile.training_days||4)).map(day=>session(day,profile,week));},generateSession:session,swapOptions};
})();
