const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function app(){const c={console,Date,Map,Set,JSON,document:{addEventListener(){}},ymd:()=>new Date().toISOString().slice(0,10),S:{settings:{syncHealth:false},healthArchive:{updated:'2026-01-01T00:00:00Z',days:[{date:'2026-01-01',hrv:50}]},sessions:[{id:'w',entries:[],healthContext:{reading:{hrv:50}}}],active:{id:'a',entries:[],healthContext:{reading:{hrv:51}}}}};vm.createContext(c);vm.runInContext(fs.readFileSync(require.resolve('../training-insights.js'),'utf8'),c);return c}
const plain=x=>JSON.parse(JSON.stringify(x));
test('cloud excludes imported Health and workout snapshots by default without changing local state',()=>{
 const c=app(),before=plain(c.S),remote=plain(c.sanitizedCloudState());
 assert.equal(remote.healthArchive,undefined);assert.equal(remote.sessions[0].healthContext,undefined);assert.equal(remote.active.healthContext,undefined);assert.equal(remote.settings.syncHealth,undefined);assert.deepEqual(plain(c.S),before);
 const restored=plain(c.preserveLocalHealth(remote));assert.deepEqual(restored.healthArchive,before.healthArchive);assert.deepEqual(restored.sessions[0].healthContext,before.sessions[0].healthContext);assert.deepEqual(restored.active.healthContext,before.active.healthContext);assert.equal(restored.settings.syncHealth,false);
});
test('explicit opt-in includes health but remote settings cannot opt another device in',()=>{
 const c=app();c.S.settings.syncHealth=true;const remote=plain(c.sanitizedCloudState());assert.ok(remote.healthArchive);assert.ok(remote.sessions[0].healthContext);c.S.settings.syncHealth=false;
 assert.equal(c.preserveLocalHealth(remote).settings.syncHealth,false);
});
test('older and future Health feeds cannot overwrite archived measurements',()=>{
 const c=app(),old={updated:new Date(Date.now()-10000).toISOString(),days:[{date:c.ymd(),hrv:60}]};
 const stale={updated:new Date(Date.now()-60000).toISOString(),days:[{date:c.ymd(),hrv:30}]};
 assert.equal(c.mergeHealthArchive(old,stale).days[0].hrv,60);
 assert.deepEqual(plain(c.mergeHealthArchive(old,{...stale,updated:new Date(Date.now()+3600000).toISOString()})),old);
 assert.deepEqual(plain(c.mergeHealthArchive(old,{updated:null,days:[]})),old);
});
test('archive bounds growth and filters invalid dates, future dates and unsupported fields',()=>{
 const c=app(),days=Array.from({length:400},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return{date:d.toISOString().slice(0,10),hrv:50}});
 days.push({date:'2025-02-30',hrv:100},{date:'2099-01-01',hrv:100});days[0].extra={unsafe:'object'};
 const result=c.mergeHealthArchive({updated:null,days:[]},{updated:new Date().toISOString(),days});
 assert.equal(result.days.length,365);assert.equal(result.days.at(-1).date,c.ymd());assert.equal(result.days.at(-1).extra,undefined);
});
