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
test('exercise rests drive estimates and prescription copying without filling actual effort',()=>{
 const day={exercises:[{name:'Press',sets:3,compound:true,restSeconds:120,rirMin:1,rirMax:2,cue:'Leave two good reps.'}]};
 assert.equal(P.stats(day,{restCompound:600}).minutes,12);
 assert.equal(P.restSeconds(day.exercises[0],{restCompound:600}),120);
 assert.equal(P.restSeconds({compound:true,restSeconds:''},settings),120);
 assert.equal(P.restSeconds({compound:false,restSeconds:0},settings),0);
 assert.equal(P.restSeconds({compound:true,restSeconds:'invalid'},settings),120);
 assert.deepEqual(P.prescription(day.exercises[0]),{restSeconds:120,rirMin:1,rirMax:2,cue:'Leave two good reps.'});
 assert.deepEqual(P.prescription({name:'Legacy',sets:3}),{});
 assert.deepEqual(P.preview(day,'45',settings),day);
});
test('the supplied routine defaults to Full, restores later choices, and keeps manual progression metadata',()=>{
 const s=state(),original={length:'full',sched:[1,1,0,1,0,1,0],days:()=>[{id:'original',name:'Original',exercises:[]}]};
 P.switchTo(s,'original4',original);assert.equal(s.plan.length,'full');
 s.plan.length='45';P.switchTo(s,'ul4',{days:()=>[]});P.switchTo(s,'original4',original);
 assert.equal(s.plan.length,'45');
 assert.deepEqual(P.prescription({autoLoadProgression:false}),{autoLoadProgression:false});
});
test('optional accessory metadata is copied without inventing optional status or actual effort',()=>{
 assert.deepEqual(P.prescription({optionalAccessory:true}),{optionalAccessory:true});
 assert.deepEqual(P.prescription({optionalAccessory:false}),{});
 assert.deepEqual(P.prescription({optionalAccessory:'true'}),{});
});
test('the core rotation continues A to B across optional C and wraps after B',()=>{
 const days=[{id:'a',name:'Field Guide A'},{id:'b',name:'Field Guide B'},{id:'c',name:'Field Guide C',optional:true}];
 const a={id:'session-a',dayId:'a',dayName:days[0].name,date:10},c={id:'session-c',dayId:'c',dayName:days[2].name,date:20,optional:true},b={id:'session-b',dayId:'b',dayName:days[1].name,date:30};
 const shuffled=[b,a,c],before=structuredClone(shuffled);
 assert.equal(P.nextDay(days,[]),days[0]);
 assert.equal(P.nextDay(days,[a]),days[1]);
 assert.equal(P.nextDay(days,[a,c]),days[1]);
 assert.equal(P.nextDay(days,shuffled),days[0]);
 assert.deepEqual(shuffled,before);
 // Legacy optional sessions may have the day metadata but no per-session flag.
 const oldC={...c};delete oldC.optional;assert.equal(P.nextDay(days,[a,oldC]),days[1]);
 assert.equal(P.nextDay([],shuffled),null);
 assert.equal(P.nextDay([days[2]],shuffled),null);
});
test('stable A/B names preserve rotation across fresh field2 and field3 IDs',()=>{
 const F=require('../field-guide-plan.js');let next=0;const uid=()=>`rotation-${++next}`;
 const E=(name,sets,min,max,muscle,compound,inc)=>({id:uid(),name,sets,min,max,muscle,compound,inc});
 const templates=F.templates(E,uid),two=templates.field2.days(),three=templates.field3.days();
 const a={id:'prior-a',dayId:two[0].id,dayName:two[0].name,date:10};
 const c={id:'optional-c',dayId:three[2].id,dayName:three[2].name,date:20,optional:true};
 assert.equal(P.nextDay(three,[a,c]),three[1]);
 const b={id:'prior-b',dayId:three[1].id,dayName:three[1].name,date:30};
 assert.equal(P.nextDay(two,[a,c,b]),two[0]);
});
test('core weekly counts exclude optional workouts while preserving all other historical logs',()=>{
 const days=[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C',optional:true}];
 const a={id:'a-session',dayId:'a',dayName:'A',date:10};
 const c={id:'c-session',dayId:'c',dayName:'C',date:20};
 assert.equal(P.requiredSessions([a,c],days).length,1);
 const nameOnly={id:'old-c',dayId:'old-c-id',dayName:'C',date:30};
 const marked={id:'marked',dayName:'Other optional',optional:true,date:40};
 const unrelated={id:'legacy',dayName:'Old program day',date:50};
 const logs=[a,c,nameOnly,marked,unrelated],before=structuredClone(logs);
 assert.deepEqual(P.requiredSessions(logs,days),[a,unrelated]);
 assert.deepEqual(logs,before);
 assert.deepEqual(P.requiredSessions(logs,[]),[a,c,nameOnly,unrelated]);
 // A known core ID wins over a coincidentally reused optional day name.
 assert.equal(P.requiredSessions([{...a,dayName:'C'}],days).length,1);
 // An explicit optional session never advances the rotation even if its ID matches A.
 assert.equal(P.nextDay(days,[{...a,optional:true}]),days[0]);
});
