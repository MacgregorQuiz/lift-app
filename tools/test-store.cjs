const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../store.js'),'utf8')+'\nthis.Store=Store;';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(opt={}){
 const data=new Map(),kv=new Map(),snaps=new Map(),listeners={},timers=new Map(),calls=[];let timer=0;
 if(opt.linked)data.set('lift.sync',JSON.stringify({token:'test-secret',gistId:'backup',last:5}));
 if(opt.mirrorState)kv.set('state',JSON.stringify(opt.mirrorState));
 if(opt.snapshot)snaps.set('2026-01-01',{json:JSON.stringify(opt.snapshot),mt:1,n:0});
 const database={objectStoreNames:{contains:()=>true},transaction(name,mode){
  const tx={objectStore(){const map=name==='kv'?kv:snaps;return{
   get:key=>({result:map.get(key)}),getAllKeys:()=>({result:[...map.keys()].sort()}),getAll:()=>({result:[...map.keys()].sort().map(key=>map.get(key))}),
   put(value,key){if(!opt.failWrites&&!opt.failStores?.includes(name))map.set(key,value);return{result:key}},delete(key){map.delete(key);return{}}};}};
  queueMicrotask(()=>{if(mode==='readwrite'&&(opt.failWrites||opt.failStores?.includes(name)))tx.onerror?.();else tx.oncomplete?.()});return tx;
 }};
 const context={Date,JSON,Promise,Error,Array,String,Math,setTimeout(fn){const id=++timer;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},
 localStorage:{getItem:key=>data.get(key)||null,setItem(key,value){if(opt.failLocal)throw Error('quota');data.set(key,value)}},
 navigator:{onLine:opt.online!==false,storage:{persisted:async()=>true,persist:async()=>true}},
 addEventListener:(key,fn)=>(listeners[key]||=[]).push(fn),document:{visibilityState:'visible',addEventListener:(key,fn)=>(listeners[key]||=[]).push(fn)},
 fetch:async(url,options={})=>{calls.push({url,options});const result=opt.fetch?await opt.fetch(url,options):{public:false,files:{'lift-state.json':{content:JSON.stringify({days:[],sessions:[],mt:0})}}};return{ok:true,json:async()=>result,text:async()=>JSON.stringify(result)}}};
 if(!opt.noIdb)context.indexedDB={open(){const r={result:database};queueMicrotask(()=>r.onsuccess());return r}};
 context.self=context;vm.createContext(context);vm.runInContext(source,context);
 let state=opt.state||{days:[],sessions:[],mt:1};
 const app={get:()=>state,onStatus(){},adopt(value){state=value;context.Store.changed(JSON.stringify(state),{mt:state.mt,n:state.sessions.length,local:!opt.failLocal})},...(opt.cloudGet?{cloudGet:()=>opt.cloudGet(state)}:{})};
 return {store:context.Store,init:()=>context.Store.init(app),state:()=>state,setState:value=>state=value,data,kv,snaps,calls,async flush(){await Promise.all((listeners.pagehide||[]).map(fn=>fn()));await tick()}};
}
test('confirms both local storage and IndexedDB transaction completion',async()=>{
 const f=fixture();await f.init();assert.equal(f.store.status().device,'saved');assert.equal(f.store.status().local,true);assert.equal(f.store.status().mirror,true);assert.equal(f.store.status().snapshots,true);
 assert.equal(JSON.parse(f.kv.get('state')).mt,1);
 f.setState({days:[],sessions:[{id:'new'}],mt:2});f.store.changed(JSON.stringify(f.state()),{mt:2,n:1,local:true});assert.equal(f.store.status().mirror,null);await f.flush();assert.equal(JSON.parse(f.kv.get('state')).sessions[0].id,'new');
});
test('reports local-only, mirror-only, and complete storage failure honestly',async()=>{
 const local=fixture({noIdb:true});await local.init();assert.equal(local.store.status().device,'saved');assert.equal(local.store.status().mirror,false);assert.match(local.store.status().deviceMessage,/mirror unavailable/);
 const mirror=fixture({failLocal:true});await mirror.init();assert.equal(mirror.store.status().device,'saved');assert.equal(mirror.store.status().local,false);assert.equal(mirror.store.status().mirror,true);
 const neither=fixture({failLocal:true,failWrites:true});await neither.init();assert.equal(neither.store.status().device,'error');assert.equal(neither.store.status().mirror,false);assert.equal(neither.store.status().lastDevice,0);
});
test('does not report restore points saved when only the mirror succeeded',async()=>{
 const f=fixture({failStores:['snaps']});await f.init();assert.equal(f.store.status().device,'saved');assert.equal(f.store.status().mirror,true);assert.equal(f.store.status().snapshots,false);assert.match(f.store.status().deviceMessage,/restore point unavailable/);
});
test('restores a newer mirror without replacing it with older local state',async()=>{
 const f=fixture({mirrorState:{days:[],sessions:[{id:'restored'}],mt:3}});await f.init();assert.equal(f.state().sessions[0].id,'restored');assert.equal(JSON.parse(f.kv.get('state')).mt,3);
});
test('refuses destructive restore when the before-restore snapshot fails',async()=>{
 const f=fixture({failStores:['snaps'],snapshot:{days:[],sessions:[{id:'old'}],mt:1}});await f.init();await assert.rejects(f.store.restore('2026-01-01'),/Could not save a restore point/);assert.equal(f.state().sessions.length,0);
});
test('configured cloud credentials do not claim a successful sync while offline',async()=>{
 const f=fixture({linked:true,online:false});await f.init();assert.equal(f.store.status().cloud,'offline');assert.equal(f.store.status().last,5);
});
test('public and malformed Gists are not overwritten, including forced push',async()=>{
 for(const remote of [{public:true,files:{}},{public:false,files:{'lift-state.json':{content:'broken'}}}]){
  const f=fixture({linked:true,fetch:()=>remote});await f.init();await tick();await f.store.sync('push');assert.equal(f.store.status().cloud,'error');assert.equal(f.calls.filter(c=>c.options.method==='PATCH').length,0);
 }
});
test('cloudGet limits sync content and keeps sync tokens outside backup payloads',async()=>{
 const f=fixture({linked:true,state:{days:[],sessions:[],mt:2,healthArchive:{days:[{sleep:8}]}},cloudGet:s=>({days:s.days,sessions:s.sessions,mt:s.mt})});await f.init();await tick();
 const patch=f.calls.find(c=>c.options.method==='PATCH');assert.ok(patch);const payload=JSON.parse(JSON.parse(patch.options.body).files['lift-state.json'].content);assert.equal(payload.healthArchive,undefined);assert.equal(patch.options.body.includes('test-secret'),false);assert.equal(f.store.status().cloud,'ok');
});
test('new Gist creation uses cloudGet and explicitly requests a secret Gist',async()=>{
 const f=fixture({state:{days:[],sessions:[],mt:2,healthArchive:{days:[{sleep:8}]}},cloudGet:s=>({days:s.days,sessions:s.sessions,mt:s.mt}),fetch:(url,options)=>options.method==='POST'?{id:'created',public:false}:[]});await f.init();await f.store.connect('test-secret');
 const post=f.calls.find(c=>c.options.method==='POST'),payload=JSON.parse(post.options.body);assert.equal(payload.public,false);assert.equal(payload.files['lift-state.json'].content.includes('healthArchive'),false);assert.equal(payload.files['lift-state.json'].content.includes('test-secret'),false);assert.equal(f.store.status().cloud,'ok');
});
