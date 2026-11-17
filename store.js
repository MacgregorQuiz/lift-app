'use strict';
// Lift memory: three layers so nothing gets lost.
//  1. localStorage  — instant, read synchronously at startup (owned by app.js)
//  2. IndexedDB     — mirror of the latest state + one restore point per day (last 30 days)
//  3. Private GitHub Gist (optional) — off-device copy, synced automatically, also works across devices
// The sync token lives in its own localStorage key and is never part of the exported/synced state.
const Store=(()=>{
 const FILE='lift-state.json',CFG='lift.sync',API='https://api.github.com',KEEP=30;
 let db=null,app=null,latest=null,idbT=null,pushT=null,busy=false,dirty=false,persisted=null;
 const st={cloud:'off',msg:'',last:0};
 const cfg=()=>{try{return JSON.parse(localStorage.getItem(CFG))||{}}catch(e){return{}}};
 const setCfg=o=>{try{localStorage.setItem(CFG,JSON.stringify(o))}catch(e){}};
 const linked=()=>{const c=cfg();return!!(c.token&&c.gistId)};
 const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 function set(cloud,msg){st.cloud=cloud;st.msg=msg||'';if(cloud==='ok'){st.last=Date.now();const c=cfg();c.last=st.last;setCfg(c)}if(app&&app.onStatus)app.onStatus()}

 // ---------- IndexedDB ----------
 function open(){return new Promise(res=>{if(!('indexedDB'in self))return res(null);let r;try{r=indexedDB.open('lift',1)}catch(e){return res(null)}
  r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('snaps'))d.createObjectStore('snaps')};
  r.onsuccess=()=>res(r.result);r.onerror=r.onblocked=()=>res(null)})}
 function req(store,mode,fn){return new Promise(res=>{if(!db)return res(undefined);try{const t=db.transaction(store,mode);const r=fn(t.objectStore(store));t.oncomplete=()=>res(r?r.result:undefined);t.onerror=t.onabort=()=>res(undefined)}catch(e){res(undefined)}})}
 async function writeIdb(){clearTimeout(idbT);if(!latest||!db)return;const{json,meta}=latest;
  await req('kv','readwrite',s=>s.put(json,'state'));
  await req('snaps','readwrite',s=>s.put({json,mt:meta.mt,n:meta.n},dayKey()));
  const keys=((await req('snaps','readonly',s=>s.getAllKeys()))||[]).filter(k=>/^\d{4}-\d\d-\d\d$/.test(k)).sort();
  for(const k of keys.slice(0,Math.max(0,keys.length-KEEP)))await req('snaps','readwrite',s=>s.delete(k))}
 // keep a copy of what's about to be replaced, so a restore/sync can always be undone
 async function stash(){const s=app.get();await req('snaps','readwrite',o=>o.put({json:JSON.stringify(s),mt:s.mt||0,n:(s.sessions||[]).length},'before-restore'))}
 async function snaps(){const keys=(await req('snaps','readonly',s=>s.getAllKeys()))||[];const vals=(await req('snaps','readonly',s=>s.getAll()))||[];
  return keys.map((k,i)=>({key:k,mt:vals[i].mt,n:vals[i].n,size:vals[i].json.length})).sort((a,b)=>a.key<b.key?1:-1)}
 async function restore(key){const v=await req('snaps','readonly',s=>s.get(key));if(!v)throw new Error('Restore point not found');const o=JSON.parse(v.json);await stash();o.mt=Date.now();app.adopt(o,'snapshot')}

 // ---------- cloud (private gist) ----------
 async function gh(path,opt={}){const r=await fetch(API+path,{...opt,cache:'no-store',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+cfg().token,...(opt.body?{'Content-Type':'application/json'}:{})}});
  if(!r.ok){const e=new Error(r.status===401?'GitHub rejected the token':r.status===403?'Token has no Gist permission (or rate limited)':r.status===404?'Backup gist not found':'GitHub error '+r.status);e.status=r.status;throw e}return r.json()}
 async function readRemote(){const g=await gh('/gists/'+cfg().gistId);const f=g.files&&g.files[FILE];if(!f)return null;let txt=f.content;
  if(f.truncated){const r=await fetch(f.raw_url,{cache:'no-store'});if(!r.ok)throw new Error('Could not download backup');txt=await r.text()}
  try{const o=JSON.parse(txt);return o&&o.days&&o.sessions?o:null}catch(e){return null}}
 const pushNow=()=>gh('/gists/'+cfg().gistId,{method:'PATCH',body:JSON.stringify({files:{[FILE]:{content:JSON.stringify(app.get())}}})});
 // Newest copy wins (by last-modified time). The losing copy is stashed as a restore point first.
 async function sync(force){clearTimeout(pushT);if(!linked())return;if(busy){dirty=true;return}if(navigator.onLine===false)return set('offline');
  busy=true;set('syncing');
  try{if(force==='push')await pushNow();
   else{const remote=await readRemote();const lm=app.get().mt||0,rm=remote?(remote.mt||0):-1;
    if(remote&&(rm>lm||force==='pull')){await stash();app.adopt(remote,'cloud')}else if(lm>rm)await pushNow()}
   busy=false;set('ok')}
  catch(e){busy=false;set(navigator.onLine===false?'offline':'error',e.message)}
  if(dirty){dirty=false;queue()}}
 function queue(){if(!linked())return;clearTimeout(pushT);pushT=setTimeout(sync,4000)}
 // Returns {created:true} for a fresh backup, or {remote} when a backup already exists (caller asks which copy to keep).
 async function connect(token){token=String(token||'').trim();if(!token)throw new Error('Paste a token first');setCfg({token});
  try{let found=null;for(let p=1;p<=10&&!found;p++){const l=await gh('/gists?per_page=100&page='+p);found=l.find(g=>g.files&&g.files[FILE]);if(l.length<100)break}
   if(found){setCfg({token,gistId:found.id});const remote=await readRemote();set('ok');return{remote}}
   const g=await gh('/gists',{method:'POST',body:JSON.stringify({description:'Lift app data (private backup)',public:false,files:{[FILE]:{content:JSON.stringify(app.get())}}})});
   setCfg({token,gistId:g.id});set('ok');return{created:true}}
  catch(e){setCfg({});set('off');throw e}}
 function disconnect(){clearTimeout(pushT);setCfg({});st.last=0;set('off')}

 // ---------- lifecycle ----------
 function changed(json,meta){latest={json,meta};clearTimeout(idbT);idbT=setTimeout(writeIdb,400);if(busy)dirty=true;else queue()}
 async function init(a){app=a;st.last=cfg().last||0;if(linked())st.cloud='ok';db=await open();
  try{if(navigator.storage&&navigator.storage.persist)persisted=(await navigator.storage.persisted())||(await navigator.storage.persist())}catch(e){}
  const raw=await req('kv','readonly',s=>s.get('state'));let stored=null;try{stored=raw?JSON.parse(raw):null}catch(e){}
  const local=app.get();
  // localStorage got wiped (or failed to write) but the mirror survived → bring everything back
  if(stored&&(stored.mt||0)>(local.mt||0))app.adopt(stored,'device');
  else{latest={json:JSON.stringify(local),meta:{mt:local.mt||0,n:local.sessions.length}};writeIdb()}
  app.onStatus();sync();
  addEventListener('online',()=>sync());addEventListener('pagehide',writeIdb);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')writeIdb();sync()})}
 const status=()=>({...st,linked:linked(),gistId:cfg().gistId||null,persisted,idb:!!db});
 return{init,changed,sync,connect,disconnect,snaps,restore,status}
})();
