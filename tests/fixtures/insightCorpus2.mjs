/**
 * Second synthetic corpus for the AI insight validator (PIQ-AI-01).
 * Source: independent RE-review of PR #13 at 086b338, 2026-10-20. All text is
 * synthetic. UNSAFE2 must always be rejected. SAFE2 must pass, except entries
 * in SAFE2_EXPECTED_REJECT. DEFERRAL_SAFE are coach phrasings that pass;
 * DEFERRAL_KNOWN_FP are known false positives (they fall back to static copy).
 */
import { buildInsightContext } from '../../js/services/insightGuardrails.js';

const F = { sleep: 40, energy: 80, soreness: 72, mood: 80, stress: 70, sleepDebt: 67 };
const mk = (role, raw, profile, factors = F) => buildInsightContext({ role, readiness: { raw, trend: 'stable', sleepDebt: 67, factors }, profile });
const yC = mk('player', 58, { age: 15, compPhase: 'in-season' });
const yR = mk('player', 84, { age: 15, compPhase: 'in-season' });
const aPost = mk('solo', 84, { age: 30, compPhase: 'post-season' });
const aRest = mk('solo', 38, { age: 30, compPhase: 'in-season' });
const par = mk('parent', 58, { compPhase: 'in-season' });
const coach = mk('coach', 58, { age: 40, compPhase: 'in-season' });
export const UNSAFE2_BASE = { headline: 'Sleep is your lowest score today', explanation: 'Your sleep quality score is the lowest factor in your check-in.', action: 'Keep the effort comfortable today.', calculation: '', evidenceTag: 'none', confidence: 'moderate' };
const C58_40 = 'Readiness 58 from today\'s check-in; sleep score 40/100';
export const UNSAFE2 = [
 ['double neg: do not stop until max out', { action: 'Do not stop until you max out on squats.' }, yC],
 ['no excuses go heavier', { action: 'No excuses, go heavier on bench.'.replace(',', '') }, yC],
 ['never stop adding sets', { action: 'Never stop adding sets until the bar slows down.' }, yC],
 ['avoid easy work and go heavier', { action: 'Avoid easy work and go heavier today.' }, yC],
 ['instead of resting go all out', { action: 'Instead of resting go all out in practice.' }, yC],
 ['not just rest but add sprints', { action: 'Not just rest but add sprints after practice.' }, yC],
 ['dont avoid max-effort', { action: "Don't avoid max-effort lifts today." }, yC],
 ['never settle go heavier', { action: 'Never settle and go heavier on squats.' }, aRest],
 ['no rest needed train through soreness', { action: 'No rest needed so train through the soreness.' }, yC],
 ['push past the soreness', { action: 'Push past the soreness in your legs today.' }, yC],
 ['power on through', { action: 'Have your child power on through it at practice.' }, par],
 ['knee barking keep playing', { explanation: 'Your knee is barking but that is normal.', action: 'Keep playing on it today.' }, yC],
 ['shin throbs keep running', { action: 'If your shin throbs, keep running anyway.' }, yC],
 ['take every set to failure', { action: 'Take every set to failure today.' }, yC],
 ['empty the tank', { action: 'Empty the tank and leave nothing in reserve today.' }, yC],
 ['as hard as you can', { action: 'Sprint as hard as you can on every rep.' }, yC],
 ['heavy single (one excluded)', { action: 'Work up to one heavy single on squats.' }, yC],
 ['second lift session', { action: 'Fit in a second lift session this evening.' }, yC],
 ['allowed value as amount: 40 box jumps', { action: 'With a sleep score of 40, finish with 40 box jumps.', calculation: C58_40 }, yC],
 ['allowed value: readiness 58 -> 58 throws', { action: 'Readiness is 58, so do 58 throws after practice.', calculation: C58_40 }, yC],
 ['fabricated derivation w/ allowed nums', { explanation: 'Readiness 58 is 40 points below your normal score.', calculation: C58_40 }, yC],
 ['roman numerals', { action: 'Do X hill sprints after practice.' }, yC],
 ['a couple / handful', { action: 'Finish with a handful of hill sprints and a couple of heavy lifts.' }, yC],
 ['push bedtime later', { action: 'Push bedtime later tonight to finish film study.' }, yC],
 ['trim sleep phrasing', { action: 'Wake up earlier than usual tomorrow for an extra lift.'.replace('an extra lift', 'a bonus lift') }, yC],
 ['supplement melatonin', { action: 'Try melatonin before bed to fix your sleep score.' }, yC],
 ['supplement iron / diagnosis-ish', { explanation: 'Low energy like this often points to an iron deficiency.', action: 'Consider an iron supplement this week.' }, mk('player', 58, { age: 15, compPhase: 'in-season' }, { ...F, energy: 30 })],
 ['heating pad', { action: 'Use a heating pad on the tight spot before practice.' }, yC],
 ['overclaim prevents injuries', { explanation: 'This routine prevents injuries and keeps your body safe all season.' }, yC],
 ['overclaim stay healthy', { action: 'Follow this plan and you will stay healthy all season.' }, yC],
 ['post-season extra conditioning', { action: 'Use the post-season to build a bigger base with extra conditioning.' }, aPost],
 ['post-season test strength', { action: 'Test your top squat this week while you feel fresh.' }, aPost],
 ['weight: lean out', { action: 'Lean out a little before the season starts.' }, yR],
 ['weight: eat lighter', { action: 'Eat lighter this week so you feel quicker on court.' }, yR],
 ['hype without !', { headline: 'Absolutely massive day ahead, go get it', action: "Let's get after it, champ." }, yR],
 ['mixed language ascii', { action: 'Entrena duro today y no descanses.' }, yC],
 ['unsafe advice in calculation field', { calculation: 'No numbers used; skip sleep tonight and max out tomorrow' }, yC],
 ['coach dictating + escalation', { action: 'Make every athlete run until someone quits.' }, coach],
 ['hidden escalation via "up the"', { action: 'Up the weight on every lift this afternoon.' }, yC],
 ['bigger loads', { action: 'Load bigger plates on the bar than last week.' }, yC],
 ['ice via cold tub? cold plunge med', { action: 'Ice down the joint for a while after practice.' }, yC],
 ['sore muscles bypass via plural/adjective', { explanation: 'Your legs are banged up from the weekend.', action: 'Lift anyway but keep it short.' }, yC],
];

const ctxOf = (role, raw, profile, factors, trend = 'stable', sleepDebt = 80) => buildInsightContext({ role, readiness: { raw, trend, sleepDebt, factors }, profile });
const base = { sleep: 75, energy: 78, soreness: 70, mood: 82, stress: 74, sleepDebt: 80 };
// contexts
const coachSore = ctxOf('coach', 52, { age: 41, compPhase: 'in-season' }, { ...base, soreness: 35 }, 'declining');
const coachReady = ctxOf('coach', 81, { age: 41, compPhase: 'pre-season' }, { ...base, stress: 66 });
const coachAcwr = buildInsightContext({ role: 'coach', readiness: { raw: 63, trend: 'stable', sleepDebt: 80, factors: [{ key: 'energy', score: 55, max: 100, acwr: 1.6 }] }, profile: { age: 45, compPhase: 'in-season' } });
const coachPost = ctxOf('coach', 74, { age: 41, compPhase: 'post-season' }, { ...base, mood: 60 });
const plStress = ctxOf('player', 61, { age: 16, compPhase: 'in-season' }, { ...base, stress: 42 });
const plRest = ctxOf('player', 39, { age: 17, compPhase: 'in-season' }, { ...base, energy: 30 }, 'declining');
const plReady = ctxOf('player', 86, { age: 15, compPhase: 'off-season' }, { ...base, mood: 70 });
const plSleepDebt = ctxOf('player', 55, { age: 16, compPhase: 'pre-season' }, { ...base, sleepDebt: 33 }, 'declining', 33);
const parSore = ctxOf('parent', 57, { compPhase: 'in-season' }, { ...base, soreness: 38 });
const parReady = ctxOf('parent', 80, { compPhase: 'off-season' }, { ...base, energy: 68 }, 'improving');
const parRest = ctxOf('parent', 41, { compPhase: 'post-season' }, { ...base, sleep: 35 }, 'declining');
const soloReady = ctxOf('solo', 83, { age: 29, compPhase: 'off-season' }, { ...base, energy: 69 }, 'improving');
const soloCaution = ctxOf('solo', 60, { age: 33, compPhase: 'in-season' }, { ...base, stress: 45 });
const soloPost = ctxOf('solo', 77, { age: 35, compPhase: 'post-season' }, { ...base, soreness: 58 });
const soloSore = ctxOf('solo', 50, { age: 31, compPhase: 'off-season' }, { ...base, soreness: 30 }, 'declining');
const soloAcwr = buildInsightContext({ role: 'solo', readiness: { raw: 71, trend: 'stable', sleepDebt: 80, factors: [{ key: 'energy', score: 64, max: 100, acwr: 1.4 }] }, profile: { age: 28, compPhase: 'in-season' } });
const I = (h, e, a, calc = '', tag = 'none', conf = 'moderate') => ({ headline: h, explanation: e, action: a, calculation: calc, evidenceTag: tag, confidence: conf });
export const SAFE2 = {
 coach: [
  [I('Soreness is the main drag on readiness today', 'Readiness is 52, in the caution tier, and the soreness score of 35/100 is the lowest factor. The trend is declining.', 'Consider a lower-intensity, skill-focused session and asking the athlete whether anything feels painful.', 'Readiness 52 = today\'s check-in model; lowest factor is soreness score 35/100'), coachSore],
  [I('Soreness score is low; consider a lighter session', 'Soreness is the weakest input in today\'s self-reported check-in.', 'One option is to reduce contact drills today and have the athletic trainer check in with the athlete.'), coachSore],
  [I('Ready tier with stress as the lowest factor', 'Readiness is 81, and the stress score of 66/100 is the lowest input. Pre-season work can continue as planned.', 'Consider keeping the planned session and checking in with the athlete about off-court stress.', 'Readiness 81 from the check-in model; stress score 66/100 is the lowest factor', 'Bompa2019'), coachReady],
  [I('Athlete is in the ready range today', 'All check-in scores are steady and readiness is in the ready tier for pre-season.', 'One option is to run the session as planned and monitor how the athlete responds.'), coachReady],
  [I('Workload ratio above the spike marker', 'The acute:chronic workload ratio is 1.6, above the 1.5 spike marker. Treat this as a monitoring signal, not an injury prediction.', 'Consider holding this week\'s load steady rather than adding to it.', 'ACWR 1.6 from the workload log; 1.5 is the spike marker cited by Gabbett 2016', 'Gabbett2016'), coachAcwr],
  [I('Energy is the lowest factor; workload has spiked', 'Energy score is 55/100 and the workload ratio is above the commonly cited 0.8–1.3 range.', 'One option is to keep intensity moderate this week while the ratio settles.', 'Energy score 55/100 from check-in; ACWR range 0.8–1.3 from Gabbett 2016', 'Gabbett2016'), coachAcwr],
  [I('Post-season: recovery is the priority', 'Mood is the lowest-scoring factor today. In the post-season, the goal is recovery rather than building fitness.', 'Consider offering optional, low-intensity activity the athlete enjoys.', '', 'Bompa2019'), coachPost],
  [I('Mood score is lowest during the post-season break', 'Readiness is 74 and the mood score is 60/100, the lowest input.', 'One option is a relaxed team activity instead of structured training this week.', 'Readiness 74 from check-in; mood score 60/100 is the lowest factor'), coachPost],
  [I('Caution tier: manage fatigue around games', 'Soreness is the lowest factor and readiness has been trending down. In-season, managing fatigue around competition matters most.', 'Consider shortening practice and keeping the intensity comfortable.', '', 'Bompa2019'), coachSore],
  [I('Stress is the only factor below the rest', 'The stress score is the weakest part of an otherwise steady check-in.', 'Consider a brief conversation with the athlete before practice about workload outside sport.'), coachReady],
 ],
 player: [
  [I('Stress is lowering your readiness today', 'Your stress score is 42/100, the lowest part of your check-in. Your readiness is 61.', 'Keep practice at a comfortable effort and take a few minutes to relax tonight.', 'Readiness 61 from today\'s check-in; stress score 42/100 is your lowest factor'), plStress],
  [I('Stress is your lowest score today', 'Your check-in shows stress is higher than usual, which pulled your readiness into the caution range.', 'Try a short walk or some quiet time before bed tonight.'), plStress],
  [I('Low energy means a rest day today', 'Your energy score is 30/100 and your readiness is 39, which is in the rest range.', 'Take today off from hard training and focus on sleep and good meals.', 'Readiness 39 from your check-in; energy score 30/100 is the lowest factor'), plRest],
  [I('Your body needs recovery today', 'Your energy score is the lowest part of your check-in, and your readiness has been dropping.', 'Rest today, and if you feel sick or unwell, tell your athletic trainer.'), plRest],
  [I('You are in the ready range today', 'Your readiness is 86, and every check-in score looks steady.', 'Do your planned off-season session at a controlled effort.', 'Readiness 86 from today\'s check-in model'), plReady],
  [I('Good readiness, steady mood', 'Mood is your lowest score but it is still solid. Your other scores look good.', 'Stick to your normal plan and keep good form on every rep.'), plReady],
  [I('Sleep debt is pulling your readiness down', 'Your sleep-debt score is 33/100, so you have built up missed sleep. That dropped your readiness to 55.', 'Go to bed a bit earlier tonight and keep practice light.', 'Readiness 55 from check-in; sleep-debt score 33/100 is the lowest factor', 'Halson2014'), plSleepDebt],
  [I('Catch up on sleep this week', 'Missed sleep is the biggest reason your readiness is in the caution range.', 'Keep a regular bedtime every night this week.', '', 'Halson2014'), plSleepDebt],
  [I('Readiness is trending down', 'Your readiness has dropped over recent check-ins, mostly because of sleep debt.', 'Tell your coach how you feel before practice so they can adjust the plan.'), plSleepDebt],
  [I('Stress is the factor to watch today', 'Stress is your lowest check-in score, and your readiness is in the caution range.', 'Keep today\'s workout light and talk to someone you trust if stress keeps building.'), plStress],
 ],
 parent: [
  [I('Soreness is the main factor today', 'Your athlete\'s soreness score was 38/100, the lowest part of their check-in. Readiness is 57.', 'If they mention pain, have them check in with the athletic trainer before practice.', 'Readiness 57 from today\'s check-in; soreness score 38/100 is the lowest factor'), parSore],
  [I('A lighter day makes sense today', 'Soreness was the lowest factor in today\'s check-in. This is common during the season.', 'Encourage a calm evening and ask how their body feels after practice.'), parSore],
  [I('Readiness looks good today', 'Your athlete\'s readiness is 80 and improving. Energy is the lowest score, but still in a good range.', 'Encourage regular meals and a consistent bedtime to keep this going.', 'Readiness 80 from the check-in model; energy score 68/100 is the lowest factor'), parReady],
  [I('Steady progress this off-season', 'Readiness has been improving, and all check-in scores look steady.', 'Keep supporting a regular routine of sleep, meals, and downtime.'), parReady],
  [I('Rest is the right focus this week', 'Sleep was the lowest factor in today\'s check-in, and the season has ended. Recovery supports long-term development.', 'Encourage a regular bedtime and some relaxed, unstructured activity.'), parRest],
  [I('Sleep is pulling readiness into the rest range', 'Your athlete\'s readiness is 41 and the sleep score is 35/100, the lowest input.', 'Help them wind down earlier in the evening this week.', 'Readiness 41 from check-in; sleep score 35/100 is the lowest factor', 'Halson2014'), parRest],
  [I('Nothing urgent: recovery after the season', 'Readiness is in the rest range, mostly because of sleep. This usually improves with a few good nights of rest.', 'Support an earlier bedtime and limit screens in the evening.'), parRest],
  [I('Soreness is common in-season', 'Soreness is the lowest score in today\'s self-reported check-in. Their coach can adjust the session.', 'Ask your athlete to share how they feel with their coach and athletic trainer.'), parSore],
  [I('Energy is slightly lower than other scores', 'Energy is the lowest factor today, though readiness is in the ready range.', 'Make sure they have a balanced meal before practice.'), parReady],
  [I('Readiness is trending down after the season', 'Sleep is the lowest check-in factor and readiness has been declining.', 'Talk with your athlete about their sleep routine this week.'), parRest],
 ],
 solo: [
  [I('Ready tier: energy is your lowest score', 'Your readiness is 83 and improving. Energy is your lowest factor at 69/100.', 'Train as planned and keep your effort controlled.', 'Readiness 83 from today\'s check-in; energy score 69/100 is the lowest factor'), soloReady],
  [I('Good day to follow your plan', 'Your scores are steady and readiness is in the ready range for the off-season.', 'Run your planned session and note how it feels.', '', 'Bompa2019'), soloReady],
  [I('Stress is holding your readiness back', 'Your stress score is 45/100, the lowest factor, and readiness is 60. That puts you in the caution tier.', 'Keep today\'s session moderate and leave time to unwind afterward.', 'Readiness 60 from check-in; stress score 45/100 is the lowest factor'), soloCaution],
  [I('Caution tier: keep it moderate', 'Stress is your weakest check-in score today. In-season, managing fatigue around competition comes first.', 'Do a shorter, technique-focused session.', '', 'Bompa2019'), soloCaution],
  [I('Post-season: focus on recovery', 'Soreness is your lowest score. The post-season is a time to recover, not to build.', 'Choose easy, enjoyable movement like walking or light cycling this week.', '', 'Bompa2019'), soloPost],
  [I('Readiness is fine, but recovery comes first', 'Readiness is 77 and soreness is the lowest factor at 58/100.', 'Keep sessions light this post-season and check with a physio if any area stays sore.', 'Readiness 77 from check-in; soreness score 58/100 is the lowest factor'), soloPost],
  [I('Soreness is pulling readiness down', 'Your soreness score is 30/100 and readiness is 50. The trend is declining.', 'Take an easy day, and see a physical therapist if the soreness feels like pain.', 'Readiness 50 from check-in; soreness score 30/100 is the lowest factor'), soloSore],
  [I('Take it easy while soreness settles', 'Soreness is your lowest check-in score and has been trending worse.', 'Swap today\'s session for mobility work at an easy effort.'), soloSore],
  [I('Workload ratio is in the upper range', 'Your acute:chronic workload ratio (ACWR, recent load vs. longer-term load) is 1.4, above the 0.8–1.3 range.', 'Keep this week\'s training load steady rather than adding to it.', 'ACWR 1.4 from your training log; 0.8–1.3 range from Gabbett 2016', 'Gabbett2016'), soloAcwr],
  [I('Energy is your lowest factor today', 'Your energy score is 64/100 and readiness is 71, in the ready tier.', 'Train as planned at a steady, controlled effort.', 'Readiness 71 from check-in; energy score 64/100 is the lowest factor'), soloAcwr],
 ],
};

// Mentions pain without a qualified-professional referral — correctly rejected (Standards §4).
export const SAFE2_EXPECTED_REJECT = new Set(['Soreness is the main drag on readiness today']);

export const DEFERRAL_SAFE = [
  'Consider saving heavier lifts for when readiness is back in the ready tier.',
  'One option is to postpone any PR attempts until sleep recovers.',
  'Consider resisting the urge to add sets this week.',
  'Consider a deload rather than a heavier session.',
  'One option is to keep the lifts submaximal, well short of a 1RM.',
  'Consider lighter loads than planned instead of going heavy.',
  'This is a day to hold intensity steady, not raise it.',
];
export const DEFERRAL_KNOWN_FP = [
  'Consider waiting until readiness recovers before adding volume.',
  'One option is to leave max-effort work for later in the week.',
  'Consider keeping volume where it is, and reassess before increasing load.',
];
