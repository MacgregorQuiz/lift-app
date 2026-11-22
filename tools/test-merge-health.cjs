const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,readFileSync,writeFileSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const {spawnSync}=require('node:child_process');
const script=resolve(__dirname,'merge-health.mjs');
const original={updated:'2020-01-02T12:00:00.000Z',days:[{date:'2020-01-01',steps:1000,sleepHours:7},{date:'2020-01-02',steps:1200,restingHR:55}]};
function run(payload,check){const dir=mkdtempSync(join(tmpdir(),'lift-merge-health-'));try{const file=join(dir,'health.json'),before=JSON.stringify(original,null,2)+'\n';writeFileSync(file,before);const process=spawnSync(global.process.execPath,[script,file],{env:{...global.process.env,PAYLOAD:JSON.stringify(payload)},encoding:'utf8'});check({process,before,text:readFileSync(file,'utf8'),data:JSON.parse(readFileSync(file,'utf8'))})}finally{rmSync(dir,{recursive:true,force:true})}}

test('partial updates retain history and fields and accept numeric text',()=>{
 run({updated:'2020-01-03T12:34:56.123Z',days:[{date:'2020-01-02',steps:'1500',sleepHours:'7.567',restingHR:null}]},({process,data})=>{
  assert.equal(process.status,0);assert.equal(data.updated,'2020-01-03T12:34:56.123Z');assert.deepEqual(data.days[0],original.days[0]);assert.deepEqual(data.days[1],{date:'2020-01-02',steps:1500,restingHR:55,sleepHours:7.57});
 });
});
test('empty, date-only, null and invalid payload fields do not advance freshness',()=>{
 for(const payload of [{},{days:[]},{days:[{date:'2020-01-02'}]},{days:[{date:'2020-01-02',steps:null,sleepHours:'',restingHR:'not a number'}]},{days:[{date:'2020-02-31',steps:20}]},{days:[{date:'2020-01-02',bedtime:'2020-14-01T19:00:00Z'}]}]){
  run(payload,({process,before,text})=>{assert.equal(process.status,0);assert.equal(text,before)});
 }
});
test('future, invalid and timezone-free extraction timestamps cannot make data appear refreshed',()=>{
 for(const updated of [new Date(Date.now()+86400000).toISOString(),'not a date','2020-01-03T12:30:00','2020-99-01T12:00:00Z','2020-02-31T12:00:00Z',null]){
  run({updated,days:[{date:'2020-01-02',steps:2000}]},({process,before,text})=>{assert.notEqual(process.status,0);assert.equal(text,before)});
 }
});
test('a valid older extraction timestamp stays old rather than being replaced with receipt time',()=>{
 run({updated:'2020-01-03T08:00:00.000-04:00',days:[{date:'2020-01-02',steps:1200}]},({process,data})=>{
  assert.equal(process.status,0);assert.equal(data.updated,'2020-01-03T12:00:00.000Z');
 });
});
test('a valid measurement without an extraction timestamp records receipt time',()=>{
 const before=Date.now();run({days:[{date:'2020-01-02',steps:1200}]},({process,data})=>{assert.equal(process.status,0);assert.ok(Date.parse(data.updated)>=before);assert.ok(Date.parse(data.updated)<=Date.now())});
});
