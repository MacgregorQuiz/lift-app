const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../training-coach.js');
const now=new Date(2026,10,21,12).getTime();
const today='2026-11-21';
const ready={level:'ready',asOf:today};
const entry=()=>({name:'Incline DB Press',sets:3,min:6,max:10,inc:2.5});
const past=(options={})=>({id:'past',date:now-86400000,entries:[{...entry(),plannedSetCount:3,sets:[1,2,3].map(()=>({w:50,r:10,rir:2,done:true})),...options}]});
const rec=(options={})=>C.recommend({entry:entry(),sessions:[past()],health:ready,now,...options});
const health=()=>({updated:new Date(now-3600000).toISOString(),today,now,sleepGoal:8,days:[...Array.from({length:7},(_,i)=>({date:`2026-11-${14+i}`,hrv:60,restingHR:55,sleepHours:8})),{date:today,hrv:62,restingHR:54,sleepHours:8.1}]});

test('manual or assisted movements never receive a resistance-style weight increase',()=>{
 for(const changes of [{name:'Pull-ups',autoLoadProgression:false},{name:'Assisted Pull-ups'},{name:'Pull-ups',variant:'assistance station'}]){
  const e={...entry(),equipment:'machine',basis:'stack',variant:'station',inc:5,...changes};
  const session=past({...e,sets:[1,2,3].map(()=>({w:50,r:10,rir:2,done:true}))});
  const result=rec({entry:e,sessions:[session]});
  assert.equal(result.status,'manual');assert.equal(result.up,false);assert.deepEqual(result.sets.map(s=>s.w),[50,50,50]);
 }
});

test('equipment, weight basis and machine identity segregate history without mutating it',()=>{
 const db=past();const machine=past({equipment:'machine',basis:'stack',variant:'gym a'});machine.id='machine';
 const original=structuredClone([db,machine]);
 assert.equal(C.matchingHistory([db,machine],entry()).length,1);
 assert.equal(C.matchingHistory([db,machine],{...entry(),equipment:'machine',variant:'gym a'}).length,1);
 assert.equal(C.matchingHistory([db,machine],{...entry(),equipment:'machine',variant:'gym b'}).length,0);
 assert.equal(C.matchingHistory([db,machine],{...entry(),basis:'total'}).length,0);
 assert.deepEqual([db,machine],original);
 assert.equal(C.equipment({name:'Smith Barbell Press'}).equipment,'machine');
 assert.equal(C.equipment({name:'Some Press'}).equipment,'unknown');
});
test('notes suggest a positive equipment correction and refuse ambiguous or hypothetical alternatives',()=>{
 assert.equal(C.suggestion('Machine not dumbbell or barbell',entry()).equipment,'machine');
 assert.equal(C.suggestion('used machine instead of dumbbells',entry()).equipment,'machine');
 assert.equal(C.suggestion('machine or dumbbell',entry()),null);
 assert.equal(C.suggestion('Maybe machine next time',entry()),null);
 assert.equal(C.suggestion('Machine last time; dumbbell today',entry()),null);
 assert.equal(C.suggestion('not machine',entry()),null);
 assert.equal(rec({entry:{...entry(),notes:'Machine not dumbbell'}}).status,'equipment-review');
});
test('health requires current fresh data and seven unique prior readings of both vitals',()=>{
 assert.equal(C.readiness(health()).level,'ready');
 assert.equal(C.readiness({...health(),updated:new Date(now-31*3600000).toISOString()}).level,'unknown');
 assert.equal(C.readiness({...health(),updated:new Date(now+1).toISOString()}).level,'unknown');
 assert.equal(C.readiness({...health(),days:health().days.slice(0,-1)}).level,'unknown');
 assert.equal(C.readiness({...health(),days:health().days.slice(-3)}).level,'unknown');
 assert.equal(C.readiness({...health(),days:[...Array(7).fill(health().days[0]),health().days.at(-1)]}).level,'unknown');
 assert.equal(C.readiness({...health(),days:health().days.map(d=>({...d,hrv:null}))}).level,'unknown');
 assert.equal(C.readiness({...health(),days:health().days.map(d=>({...d,restingHR:0}))}).level,'unknown');
});
test('reduced sleep, adverse vitals and lifting already today suppress ready status',()=>{
 for(const changes of [{sleepHours:5},{hrv:40},{restingHR:70}]){
  const h=health();Object.assign(h.days.at(-1),changes);assert.equal(C.readiness(h).level,'easy');
 }
 assert.equal(C.readiness({...health(),sessions:[{...past(),date:now-3600000}]}).level,'easy');
 const h=health();h.days.at(-1).sleepHours=7;assert.equal(C.readiness(h).level,'steady');
});
test('increase requires complete reps, recorded RIR, known prescription, fresh health, and a small increment',()=>{
 const recommendation=rec();assert.equal(recommendation.up,true);assert.deepEqual(recommendation.sets,[{w:52.5,r:6},{w:52.5,r:6},{w:52.5,r:6}]);
 assert.equal(rec({health:{level:'unknown',asOf:today}}).up,false);
 assert.equal(rec({health:{level:'ready',asOf:'2026-11-20'}}).up,false);
 assert.equal(rec({entry:{...entry(),inc:10}}).up,false);
 assert.equal(rec({sessions:[past({plannedSetCount:undefined})]}).up,false);
 for(const rir of ['',null,0,1]){
  const s=past();s.entries[0].sets[1].rir=rir;assert.equal(rec({sessions:[s]}).up,false);
 }
 const s=past();s.entries[0].sets[0].r=9;assert.equal(rec({sessions:[s]}).status,'reps');
 assert.equal(rec({entry:{...entry(),equipment:'unknown'}}).up,false);
});
test('partial workouts and heterogeneous weights cannot become a blanket weight increase',()=>{
 const partial=past();partial.entries[0].sets.pop();assert.equal(rec({sessions:[partial]}).up,false);
 assert.equal(rec({entry:{...entry(),sets:2},sessions:[partial]}).up,false);
 const mixed=past();mixed.entries[0].sets[1].w=45;const r=rec({sessions:[mixed]});assert.equal(r.up,false);assert.deepEqual(r.sets.map(s=>s.w),[50,45,50]);
 const skipped=past();skipped.entries[0].sets[2].done=false;assert.equal(rec({sessions:[skipped]}).up,false);
});
test('past or current pain/failure notes suppress an increase; no pain does not',()=>{
 for(const notes of ['shoulder pain','failed last rep','struggled today','could not finish'])assert.equal(rec({sessions:[past({notes})]}).status,'caution');
 assert.equal(rec({entry:{...entry(),notes:'Pain today'}}).status,'caution');
 assert.equal(rec({sessions:[past({notes:'No pain. Felt good.'})]}).up,true);
});
test('history edits cannot see future sessions, and stale/future logs cannot justify increases',()=>{
 const older={...past(),id:'older',date:now-3*86400000},editing={...past(),id:'editing',date:now-2*86400000};
 assert.deepEqual(C.matchingHistory([past(),editing,older],entry(),'editing').map(x=>x.sid),['older']);
 assert.equal(rec({sessions:[{...past(),date:now+3600000}]}).up,false);
 assert.equal(rec({sessions:[{...past(),date:now-29*86400000}]}).up,false);
});
test('new setups start without inherited weight; unidentified machines cannot increase',()=>{
 const r=rec({entry:{...entry(),equipment:'machine',variant:'Gym B'}});assert.equal(r.status,'new');assert.equal(r.sets[0].w,'');
 const e={...entry(),equipment:'machine',basis:'stack'};
 assert.equal(rec({entry:e,sessions:[past({equipment:'machine',basis:'stack'})]}).up,false);
 assert.equal(rec({entry:{...e,variant:'Gym A'},sessions:[past({equipment:'machine',basis:'stack',variant:'Gym A'})]}).up,true);
});

test('conflicting historical equipment notes cannot supply weights and high effort cannot trigger rep progression',()=>{
 assert.equal(rec({sessions:[past({notes:'Machine, not dumbbells'})]}).status,'new');
 const s=past();s.entries[0].sets[0].r=8;s.entries[0].sets[0].rir=0;
 const r=rec({sessions:[s]});assert.equal(r.status,'hold');assert.equal(r.sets[0].r,8);
});

test('a current equipment conflict blanks target weights even with past history or no history',()=>{
 for(const sessions of [[],[past()]]){
  const result=rec({entry:{...entry(),notes:'machine not dumbbell or barbell'},sessions});
  assert.equal(result.status,'equipment-review');assert.equal(result.up,false);
  assert.deepEqual(result.sets,[{w:'',r:6},{w:'',r:6},{w:'',r:6}]);
  assert.equal(!!result.last,!!sessions.length);
 }
});
test('an unnamed machine or cable setup cannot receive rep progression',()=>{
 for(const equipment of ['machine','cable']){
  const previous=past({equipment,basis:'stack'});previous.entries[0].sets.forEach(s=>s.r=8);
  const result=rec({entry:{...entry(),equipment,basis:'stack'},sessions:[previous]});
  assert.equal(result.status,'equipment-review');assert.deepEqual(result.sets.map(s=>s.r),[8,8,8]);
 }
});
