const test=require('node:test');
const assert=require('node:assert/strict');
const F=require('../field-guide-plan.js');
const W=require('../workout-plan.js');
let sequence=0;
const uid=()=>`guide-${++sequence}`;
const E=(name,sets,min,max,muscle,compound,inc)=>({id:uid(),name,sets,min,max,muscle,compound,inc});
const plans=()=>F.templates(E,uid);
const tuple=e=>[e.name,e.sets,e.min,e.max];
const expectedA=[
 ['Incline dumbbell press',3,6,10],['Neutral-grip lat pulldown',3,8,12],['Leg press',2,8,12],['Chest-supported row',2,8,12],['Cable lateral raise',2,12,20],['Romanian deadlift',2,8,10]
];
const expectedB=[
 ['Machine chest press',3,8,12],['Lat pulldown',3,6,10],['Goblet squat',2,8,12],['Seated cable row',2,8,12],['Dumbbell lateral raise',2,12,20],['Seated leg curl',2,10,15]
];
const expectedC=[
 ['Incline machine chest press',2,8,12],['Single-arm lat pulldown',2,10,15],['Cable lateral raise',2,12,20],['Reverse pec deck',2,12,20],['Preacher curl',2,10,15],['Triceps pushdown',2,10,15]
];
const multiset=days=>days.flatMap(d=>d.exercises).map(e=>JSON.stringify([...tuple(e),e.equipment,e.basis])).sort();

test('A and B preserve the page-17 source order and exact set and rep prescriptions',()=>{
 const p=plans(),ab=p.field2.days();
 assert.deepEqual(ab.map(d=>d.exercises.map(tuple)),[expectedA,expectedB]);
 assert.deepEqual(ab.map(d=>d.exercises.reduce((n,e)=>n+e.sets,0)),[14,14]);
 assert.deepEqual(p.field2.sched,[0,1,0,0,0,1,0]);assert.equal(p.field2.length,'full');
 assert.deepEqual(p.field3.days().slice(0,2).map(d=>d.name),ab.map(d=>d.name));
 assert.ok(ab.every(d=>d.sourcePage===17&&!d.optional));
});
test('optional C preserves the page-18 lower starting dosage without adding a scheduled obligation',()=>{
 const p=plans(),days=p.field3.days(),c=days[2];
 assert.deepEqual(c.exercises.map(tuple),expectedC);assert.equal(c.optional,true);assert.equal(c.sourcePage,18);
 assert.equal(c.exercises.reduce((n,e)=>n+e.sets,0),12);
 assert.deepEqual(c.exercises.map(e=>!!e.optionalAccessory),[false,false,false,false,true,true]);
 assert.deepEqual(p.field3.sched,p.field2.sched);assert.equal(p.field3.length,'full');
});
test('four days redistribute exactly A+B+C without adding, removing, or changing weekly work',()=>{
 const p=plans(),days=p.field4.days();
 assert.deepEqual(multiset(days),multiset(p.field3.days()));
 assert.deepEqual(days.map(d=>d.exercises.length),[5,4,4,5]);
 assert.deepEqual(days.map(d=>d.exercises.reduce((n,e)=>n+e.sets,0)),[12,8,10,10]);
 assert.equal(days.flatMap(d=>d.exercises).reduce((n,e)=>n+e.sets,0),40);
 assert.deepEqual(days.map(d=>d.exercises.map(e=>e.name)),[
  ['Incline dumbbell press','Neutral-grip lat pulldown','Chest-supported row','Cable lateral raise','Reverse pec deck'],
  ['Leg press','Romanian deadlift','Incline machine chest press','Preacher curl'],
  ['Machine chest press','Lat pulldown','Seated cable row','Dumbbell lateral raise'],
  ['Goblet squat','Seated leg curl','Single-arm lat pulldown','Cable lateral raise','Triceps pushdown']
 ]);
 assert.deepEqual(p.field4.sched,[1,1,0,1,0,1,0]);assert.equal(p.field4.length,'full');assert.equal(p.field4.guide.derived,true);
});
test('all C-derived additions in the four-day layout are marked optional accessories',()=>{
 const p=plans(),days=p.field4.days();
 const optional=days.flatMap(d=>d.exercises).filter(e=>e.optionalAccessory).map(tuple).map(JSON.stringify).sort();
 assert.deepEqual(optional,expectedC.map(JSON.stringify).sort());
 assert.ok(days.every(d=>!d.optional));
});
test('the existing 30-minute preview keeps the first three exercises and lateral raises for A and B',()=>{
 for(const day of plans().field2.days()){
  const before=structuredClone(day),short=W.preview(day,'30',{restCompound:120,restIso:90});
  assert.deepEqual(short.exercises.map(tuple),[day.exercises[0],day.exercises[1],day.exercises[2],day.exercises[4]].map(tuple));
  assert.equal(short.exercises.reduce((n,e)=>n+e.sets,0),10);
  assert.deepEqual(day,before);
 }
});
test('equipment conventions, effort guidance, and program instances remain explicit and independent',()=>{
 const p=plans(),first=p.field4.days(),second=p.field4.days();
 const ids=[first,second].flatMap(ds=>ds.flatMap(d=>[d.id,...d.exercises.map(e=>e.id)]));assert.equal(new Set(ids).size,ids.length);
 first[0].exercises[0].sets=99;assert.equal(second[0].exercises[0].sets,3);
 for(const t of Object.values(p))for(const d of t.days())for(const e of d.exercises){
  assert.equal(e.variant,'');assert.deepEqual([e.rirMin,e.rirMax],[1,3]);assert.equal(e.rir,undefined);assert.equal(e.notes,undefined);
  assert.equal(e.restSeconds,e.compound?120:90);
  if(e.equipment==='machine')assert.equal(e.basis,'unknown');
  if(e.equipment==='dumbbell')assert.equal(e.basis,e.name==='Goblet squat'?'unknown':'per-hand');
 }
 const b=p.field2.days()[1];assert.equal(b.exercises[1].name,'Lat pulldown');assert.match(b.exercises[1].sourceName,/Assisted pull-up/);assert.equal(b.exercises[1].basis,'unknown');
});
