/**
 * PerformanceIQ — consistency helper tests
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isSession, completedSessions, trainingEntries, trainingDaysAgo,
  trainingDaysInWindow, allowedRestDays, currentStreak, planAdherence,
} from '../js/services/consistency.js';

const NOW = new Date(2026, 9, 5, 12, 0, 0).getTime();
const at  = (ago, hour = 12) => new Date(2026, 9, 5 - ago, hour, 0, 0).getTime();
const session = (ago, extra = {}) => ({ name:'Session', avgRPE:6, duration:60, completed:true, ts:at(ago), ...extra });
const checkin = ago => ({ type:'checkin', sleepQuality:4, ts:at(ago,8) });

test('check-ins and incomplete entries are not sessions', () => {
  assert.equal(isSession(session(0)), true);
  assert.equal(isSession(checkin(0)), false);
  assert.equal(isSession(session(0,{completed:false})), false);
  assert.equal(isSession({completed:true}), false);
  const log=[session(0),checkin(0),session(1,{completed:false})];
  assert.equal(completedSessions(log).length,1);
  assert.equal(trainingEntries(log).length,2);
  assert.deepEqual(completedSessions(null),[]);
});
test('check-in on workout day does not cap streak',()=> {
  const log=[0,1,2,3,4].flatMap(d=>[session(d),checkin(d)]);
  assert.equal(currentStreak(log,{now:NOW,daysPerWeek:7}),5);
});
test('two sessions on one day count as one training day',()=> {
  const log=[session(0),session(0,{ts:at(0,18)}),session(1)];
  assert.deepEqual(trainingDaysAgo(log,{now:NOW}),[0,1]);
  assert.equal(currentStreak(log,{now:NOW,daysPerWeek:7}),2);
});
test('planned rest day does not reset streak',()=> {
  assert.equal(currentStreak([1,2,3,4,5].map(d=>session(d)),{now:NOW,daysPerWeek:5}),5);
  assert.equal(currentStreak([0,1,3,4,5].map(d=>session(d)),{now:NOW,daysPerWeek:5}),5);
});
test('today never breaks streak before it is over',()=> {
  assert.equal(currentStreak([1,2,3].map(d=>session(d)),{now:at(0,6),daysPerWeek:7}),3);
});
test('rest allowance follows plan',()=> {
  assert.equal(allowedRestDays(4),3);
  assert.equal(allowedRestDays(7),0);
  assert.equal(allowedRestDays(undefined),3);
  assert.equal(allowedRestDays('5'),2);
  assert.equal(currentStreak([session(4),session(5)],{now:NOW,daysPerWeek:4}),2);
  assert.equal(currentStreak([session(5),session(6)],{now:NOW,daysPerWeek:4}),0);
  assert.equal(currentStreak([session(0),session(1),session(9),session(10)],{now:NOW,daysPerWeek:4}),2);
});
test('empty check-in-only future logs give streak zero',()=> {
  assert.equal(currentStreak([],{now:NOW}),0);
  assert.equal(currentStreak(undefined,{now:NOW}),0);
  assert.equal(currentStreak([checkin(0),checkin(1)],{now:NOW}),0);
  assert.equal(currentStreak([session(-2)],{now:NOW}),0);
});
test('days are local calendar days',()=> {
  const late=new Date(2026,9,4,23,50).getTime();
  const now=new Date(2026,9,5,0,10).getTime();
  assert.deepEqual(trainingDaysAgo([{completed:true,ts:late}],{now}),[1]);
});
test('training days and plan adherence',()=> {
  const log=[0,2,4,7,9,11,14,16,30,40].map(d=>session(d));
  assert.equal(trainingDaysInWindow(log,{now:NOW,days:28}),8);
  assert.equal(trainingDaysInWindow(log,{now:NOW,days:7}),3);
  assert.equal(planAdherence(log,{now:NOW,daysPerWeek:4}),50);
  assert.equal(planAdherence(log,{now:NOW,daysPerWeek:2}),100);
  assert.equal(planAdherence([],{now:NOW}),0);
  assert.equal(planAdherence(Array.from({length:20},(_,i)=>checkin(i)),{now:NOW}),0);
});
test('input log is not mutated',()=> {
  const log=[session(0),checkin(0),session(2)], copy=structuredClone(log);
  currentStreak(log,{now:NOW});planAdherence(log,{now:NOW});trainingDaysAgo(log,{now:NOW});
  assert.deepEqual(log,copy);
});
