import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localDateKey,dateKeyToLocalNoon,isPushableSession,entryToWorkoutRow,workoutRowToEntry,
  hasWellness,checkinToReadinessRow,readinessRowToCheckin,mergeCloudIntoLog,buildRosterEntry,isUuid
} from '../js/services/cloudMap.js';

const UID='11111111-1111-4111-8111-111111111111';
const NOW=new Date(2026,9,5,12).getTime();
const session=(extra={})=>({id:'22222222-2222-4222-8222-222222222222',name:'Lift',avgRPE:6,duration:60,completed:true,ts:NOW,...extra});

test('date keys are local and round-trip',()=>{const k=localDateKey(NOW);assert.equal(k,'2026-10-05');assert.equal(localDateKey(dateKeyToLocalNoon(k)),k);});
test('uuid validator accepts real uuid shape',()=>{assert.equal(isUuid(UID),true);assert.equal(isUuid('bad'),false);});
test('only completed unsynced sessions are pushable',()=>{assert.equal(isPushableSession(session()),true);assert.equal(isPushableSession(session({completed:false})),false);assert.equal(isPushableSession(session({remoteId:'x'})),false);assert.equal(isPushableSession({type:'checkin',ts:NOW}),false);});
test('session row preserves load inputs',()=>{const r=entryToWorkoutRow(session(),{userId:UID,fallbackSport:'basketball'});assert.equal(r.duration_min,60);assert.equal(r.rpe_actual,6);assert.equal(r.athlete_id,UID);});
test('session row never invents missing load inputs',()=>{const r=entryToWorkoutRow(session({avgRPE:undefined,duration:undefined}),{userId:UID});assert.equal(r.duration_min,null);assert.equal(r.rpe_actual,null);});
test('workout row becomes completed local entry',()=>{const e=workoutRowToEntry({id:'a',title:'Lift',sport:'basketball',day_type:'strength',scheduled_date:'2026-10-05',status:'completed',completed_at:new Date(NOW).toISOString(),duration_min:45,rpe_actual:7});assert.equal(e.completed,true);assert.equal(e.duration,45);assert.equal(e.avgRPE,7);});
test('planned workout row is not a completed session',()=>{assert.equal(workoutRowToEntry({id:'a',status:'planned',scheduled_date:'2026-10-05'}),null);});
test('checkin without sleep rating is not uploadable',()=>{assert.equal(hasWellness({sleepQuality:0}),false);assert.equal(checkinToReadinessRow({sleepQuality:0},{userId:UID}),null);});
test('checkin maps to readiness row',()=>{const r=checkinToReadinessRow({sleepQuality:4,energyLevel:3,stressLevel:2,mood:5,soreness:3,sleepHours:8,ts:NOW},{userId:UID,score:82});assert.equal(r.score,82);assert.equal(r.sleep_quality,4);assert.equal(r.soreness,'Medium');});
test('readiness row maps to local checkin',()=>{const e=readinessRowToCheckin({id:'r',log_date:'2026-10-05',score:81,sleep_quality:4,energy:3,stress:2,mood:5,soreness:'Low',sleep_hrs:8});assert.equal(e.type,'checkin');assert.equal(e.cloudScore,81);assert.equal(e.soreness,2);});
test('merge preserves local unsynced and adds cloud once',()=>{const local=[session({id:'local'})];const rows=[{id:'remote',title:'Cloud',scheduled_date:'2026-10-05',status:'completed',completed_at:new Date(NOW-86400000).toISOString(),duration_min:30,rpe_actual:5}];const out=mergeCloudIntoLog(local,{workoutRows:rows});assert.equal(out.filter(x=>x.remoteId==='remote').length,1);assert.ok(out.some(x=>x.id==='local'));});
test('merge does not duplicate local checkin for same day',()=>{const local=[{type:'checkin',sleepQuality:4,ts:NOW,date:new Date(NOW).toDateString()}];const rows=[{id:'r',log_date:'2026-10-05',score:80,sleep_quality:4,energy:4,stress:2,mood:4,soreness:'Low',sleep_hrs:8}];const out=mergeCloudIntoLog(local,{readinessRows:rows});assert.equal(out.filter(x=>x.type==='checkin').length,1);});
test('roster metrics are derived from athlete rows or null',()=>{const p={id:UID,name:'Athlete',sport:'basketball',days_per_week:4,piq_score:0};const r=buildRosterEntry(p,{workoutRows:[],readinessRows:[],now:NOW});assert.equal(r.name,'Athlete');assert.equal(r.readiness,null);assert.equal(r.piq,null);assert.equal(r.sessions7,0);});
