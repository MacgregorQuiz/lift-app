const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../workout-plan.js');
const settings = {restCompound:120, restIso:90};
const routine = {id:'ua',name:'Upper A',exercises:['Chest','Back','Back','Shoulders','Shoulders','Biceps','Triceps','Shoulders'].map((muscle,i)=>({id:String(i),name:`Lift ${i}`,muscle,compound:i<4,sets:i<2?4:3,min:6,max:10}))};
const state = () => P.migrate({days:[structuredClone(routine)],plan:{tpl:'ul4',days:[1,1,0,1,1,0,0]},goals:{lifts:4},sessions:[{id:'old',entries:[{name:'Lift 0',sets:[{w:50,r:10,done:true}]}]}],active:{id:'active',entries:[]}});
test('old saves keep their complete routine, history and active session',()=>{
 const s=state();assert.equal(s.plan.length,'full');assert.deepEqual(P.preview(s.days[0],s.plan.length,settings),routine);assert.equal(s.sessions[0].id,'old');assert.equal(s.active.id,'active');
});
test('short sessions reduce volume, cover distinct muscles, and never mutate the full routine',()=>{
 const original=structuredClone(routine);
 for(const mode of ['30','45','60']){
  const result=P.preview(routine,mode,settings),stats=P.stats(result,settings);
  assert.ok(stats.exercises<=P.lengths[mode].exercises);assert.ok(stats.minutes<=Number(mode));assert.ok(stats.sets<P.stats(routine,settings).sets);
  assert.ok(result.exercises.every(e=>e.sets<=routine.exercises.find(x=>x.id===e.id).sets));
 }
 assert.deepEqual(P.preview(routine,'45',settings).exercises.map(e=>e.muscle),['Chest','Back','Shoulders','Biceps','Triceps']);
 assert.deepEqual(routine,original);assert.deepEqual(P.preview(routine,'full',settings),original);
});
test('switch away and back restores edits, IDs, schedule and length across JSON reload',()=>{
 let s=state();s.days[0].name='My upper';s.days[0].exercises[0].sets=2;s.plan.length='30';s.plan.days=[0,1,0,1,0,1,0];
 const original=structuredClone({days:s.days,plan:s.plan,sessions:s.sessions,active:s.active});
 const tpl={sched:[1,0,1,0,1,0,0],days:()=>[{id:'fb',name:'Full body',exercises:[]}]};
 assert.equal(P.switchTo(s,'fb3',tpl),true);s.days[0].name='My full body';
 s=P.migrate(JSON.parse(JSON.stringify(s)));
 P.switchTo(s,'ul4',{days:()=>{throw Error('must restore saved program')}});
 assert.deepEqual(s.days,original.days);assert.deepEqual(s.plan,original.plan);assert.deepEqual(s.sessions,original.sessions);assert.deepEqual(s.active,original.active);assert.equal(s.goals.lifts,3);
 P.switchTo(s,'fb3',tpl);assert.equal(s.days[0].name,'My full body');assert.equal(P.switchTo(s,'fb3',tpl),false);
});
test('empty, one-set and long-rest routines stay usable and estimates remain honest',()=>{
 assert.equal(P.preview(null,'30',settings),null);
 assert.equal(P.stats({exercises:[]},settings).minutes,0);
 const day={exercises:[{name:'Squat',muscle:'Quads',compound:1,sets:1}]};
 assert.equal(P.preview(day,'30',settings).exercises[0].sets,1);
 const long=P.preview(routine,'30',{restCompound:600,restIso:600});
 assert.ok(P.stats(long,{restCompound:600,restIso:600}).minutes>30);
 assert.deepEqual(P.preview(routine,'invalid',settings),routine);
});
