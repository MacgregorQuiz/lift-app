const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../minimalist-plan.js');
let sequence = 0;
const uid = () => `exercise-${++sequence}`;
const E = (name,sets,min,max,muscle,compound,inc) => ({id:uid(),name,sets,min,max,muscle,compound,inc});
const templates = () => P.templates(E,uid);

test('schedules provide four-day ULUL and five-day push/pull/legs/upper/lower rotations', () => {
 const plans = templates();
 assert.deepEqual(Object.keys(plans), ['minimalist4','minimalist5']);
 assert.deepEqual(plans.minimalist4.sched, [1,1,0,1,0,1,0]);
 assert.deepEqual(plans.minimalist5.sched, [1,1,1,0,1,1,0]);
 assert.deepEqual(plans.minimalist4.days().map(d=>d.name), ['Minimalist Upper A','Minimalist Lower A','Minimalist Upper B','Minimalist Lower B']);
 assert.deepEqual(plans.minimalist5.days().map(d=>d.name), ['Minimalist Push','Minimalist Pull','Minimalist Legs','Minimalist Upper','Minimalist Lower']);
});
test('every day has four exercises, 2–3 working sets, the requested rep ranges and effort/rest guidance', () => {
 for (const plan of Object.values(templates())) {
  const days = plan.days();
  assert.equal(days.length,plan.sched.filter(Boolean).length);
  for (const day of days) {
   assert.equal(day.exercises.length,4);
   assert.ok(day.exercises.reduce((sum,e)=>sum+e.sets,0)<=12);
   for (const e of day.exercises) {
    assert.ok(e.sets===2||e.sets===3);
    assert.deepEqual([e.min,e.max],e.compound?[6,12]:[10,20]);
    assert.deepEqual([e.rirMin,e.rirMax],[1,2]);
    assert.equal(e.restSeconds,e.compound?120:90);
    assert.ok(e.inc>0);
   }
  }
 }
});
test('both plans train quads and hamstrings on two days while keeping an upper-body emphasis', () => {
 for (const plan of Object.values(templates())) {
  const days=plan.days();
  for (const muscle of ['Quads','Hamstrings']) assert.equal(days.filter(d=>d.exercises.some(e=>e.muscle===muscle)).length,2);
  for (const muscle of ['Chest','Back','Shoulders']) assert.ok(days.filter(d=>d.exercises.some(e=>e.muscle===muscle)).length>=2);
  const exercises=days.flatMap(d=>d.exercises);
  const upper=exercises.filter(e=>['Chest','Back','Shoulders','Biceps','Triceps'].includes(e.muscle)).reduce((sum,e)=>sum+e.sets,0);
  const lower=exercises.filter(e=>['Quads','Hamstrings','Glutes','Calves'].includes(e.muscle)).reduce((sum,e)=>sum+e.sets,0);
  assert.ok(upper>lower);
  assert.ok(exercises.some(e=>e.muscle==='Biceps'));
  assert.ok(exercises.some(e=>e.muscle==='Triceps'));
 }
});
test('equipment and weight conventions are explicit without inventing a confirmed machine setup', () => {
 for (const plan of Object.values(templates())) for (const day of plan.days()) for (const e of day.exercises) {
  assert.ok(['dumbbell','machine','cable'].includes(e.equipment));
  assert.equal(e.basis,e.equipment==='dumbbell'?'per-hand':e.equipment==='cable'?'stack':'unknown');
  assert.equal(e.variant,'');
  assert.equal(typeof e.cue,'string');
  assert.equal(e.notes,undefined);
  assert.equal(e.note,undefined);
  assert.doesNotMatch(e.name,/neck/i);
 }
});
test('each selection creates fresh day and exercise IDs without sharing mutable routines', () => {
 const plans=templates(),calls=Object.values(plans).flatMap(plan=>[plan.days(),plan.days()]);
 const ids=calls.flatMap(days=>days.flatMap(d=>[d.id,...d.exercises.map(e=>e.id)]));
 assert.equal(new Set(ids).size,ids.length);
 const first=plans.minimalist4.days();
 first[0].exercises[0].sets=99;first[0].exercises[0].variant='My setup';
 const second=plans.minimalist4.days();
 assert.equal(second[0].exercises[0].sets,3);assert.equal(second[0].exercises[0].variant,'');
 plans.minimalist4.sched[0]=0;assert.equal(plans.minimalist5.sched[0],1);
});

test('the four-day plan gives lateral raises three sets on both upper days', () => {
 const raises=templates().minimalist4.days().flatMap(d=>d.exercises).filter(e=>e.name==='Cable Lateral Raise');
 assert.deepEqual(raises.map(e=>e.sets),[3,3]);
});
