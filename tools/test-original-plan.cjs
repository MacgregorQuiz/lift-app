const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../original-plan.js');
let sequence = 0;
const uid = () => `original-${++sequence}`;
const E = (name,sets,min,max,muscle,compound,inc) => ({id:uid(),name,sets,min,max,muscle,compound,inc});
const plan = () => P.templates(E,uid).original4;
// Transcribed from the user's pasted routine. Preserve its exceptions, notably
// preacher curls at 8–12 and single-arm pulldowns at 10–15, rather than normalizing.
const source = [
 {weekday:'Monday',name:'Upper A — V-taper',exercises:[
  ['Incline dumbbell press',3,6,10],['Neutral-grip lat pulldown',3,8,12],['Chest-supported row',2,8,12],['Cable lateral raise',3,12,20],['Triceps pushdown',2,10,15]
 ]},
 {weekday:'Tuesday',name:'Lower + shoulders',exercises:[
  ['Leg press',3,8,12],['Romanian deadlift',3,8,10],['Seated leg curl',2,10,15],['Dumbbell lateral raise',3,12,20],['Hanging knee raise',2,10,15]
 ]},
 {weekday:'Thursday',name:'Upper B — Width + arms',exercises:[
  ['Pull-ups or assisted pull-ups',3,6,10],['Incline machine chest press',3,8,12],['Seated cable row',2,8,12],['Reverse pec deck',2,12,20],['Cable lateral raise',2,12,20],['Preacher curl',2,8,12]
 ]},
 {weekday:'Saturday',name:'Full body — Upper emphasis',exercises:[
  ['Bulgarian split squat',3,8,12],['Seated leg curl',2,10,15],['Machine chest press',3,8,12],['Single-arm lat pulldown',2,10,15],['Cable lateral raise',3,12,20],['Hammer curl',2,10,15],['Cable crunch',2,12,20]
 ]}
];

test('the original source is preserved exercise-for-exercise and range-for-range',()=>{
 const days=plan().days();
 assert.deepEqual(days.map(d=>({weekday:d.weekday,name:d.name.replace(/^Original /,''),exercises:d.exercises.map(e=>[e.sourceName||e.name,e.sets,e.min,e.max])})),source);
 assert.deepEqual(days.map(d=>d.exercises.length),[5,5,6,7]);
 assert.deepEqual(days.map(d=>d.exercises.reduce((n,e)=>n+e.sets,0)),[13,13,14,17]);
 assert.equal(days.flatMap(d=>d.exercises).length,23);
});
test('the supplied four-day routine starts full-length with honest per-day time guides',()=>{
 const p=plan();assert.equal(p.name,'Upper-Body Focus · 4 Days');assert.equal(p.sub,'Shoulders, back & upper chest · 5–7 exercises');
 assert.deepEqual(p.sched,[1,1,0,1,0,1,0]);assert.equal(p.length,'full');
 const days=p.days();for(const d of days.slice(0,3))assert.match(d.timeGuide,/40–45/);assert.match(days[3].timeGuide,/50/);
});
test('effort and rest are guidance only, never fabricated completed-set effort or notes',()=>{
 for(const e of plan().days().flatMap(d=>d.exercises)){
  assert.deepEqual([e.rirMin,e.rirMax],[1,3]);assert.equal(e.restSeconds,e.compound?120:90);
  assert.match(e.cue,/Start near 2 reps in reserve/);
  assert.equal(e.rir,undefined);assert.equal(e.notes,undefined);assert.equal(e.note,undefined);assert.equal(e.variant,'');
 }
});
test('ambiguous equipment stays unconfirmed and assisted pull-ups cannot imply normal load progression',()=>{
 const exercises=plan().days().flatMap(d=>d.exercises);
 for(const name of ['Chest-supported row','Romanian deadlift','Preacher curl','Bulgarian split squat','Hammer curl']){
  const e=exercises.find(e=>e.name===name);assert.equal(e.equipment,'unknown');assert.equal(e.basis,'unknown');
 }
 for(const e of exercises.filter(e=>e.equipment==='machine'))assert.equal(e.basis,'unknown');
 for(const e of exercises.filter(e=>e.equipment==='dumbbell'))assert.equal(e.basis,'per-hand');
 const pull=exercises.find(e=>e.sourceName==='Pull-ups or assisted pull-ups');
 assert.equal(pull.name,'Pull-ups');assert.equal(pull.equipment,'bodyweight');assert.equal(pull.basis,'bodyweight');assert.equal(pull.autoLoadProgression,false);assert.match(pull.cue,/more assistance is easier/);
});
test('selecting the routine creates independent IDs and cannot reuse legacy rotation names',()=>{
 const p=plan(),first=p.days(),second=p.days();
 const ids=[first,second].flatMap(ds=>ds.flatMap(d=>[d.id,...d.exercises.map(e=>e.id)]));assert.equal(new Set(ids).size,ids.length);
 assert.ok(first.every(d=>d.name.startsWith('Original ')));
 first[0].exercises[0].sets=99;assert.equal(second[0].exercises[0].sets,3);
});
