'use strict';
// Lift memory: device storage plus an optional off-device backup.
//  1. localStorage — immediate writes (app.js reports whether each one succeeded)
//  2. IndexedDB — latest-state mirror + daily restore points (last 30 days)
//  3. Secret GitHub Gist — optional; unlisted, but readable by anyone with its link
// The sync token is separate and never included in the exported/synced state.
const Store=(()=>{
 const FILE='lift-state.json',CFG='lift.sync',KEY='lift.v1',API='https://api.github.com',KEEP=30;
 let db=null,app=null,latest=null,idbT=null,pushT=null,busy=false,dirty=false,persisted=null,writing=null;
 const st={cloud:'off',msg:'',last:0,device:'saving',deviceMessage:'Checking device storage',lastDevice:0,local:null,mirror:null,snapshots:null};
 const cfg=()=>{try{return JSON.parse(localStorage.getItem(CFG))||{}}catch(e){return{}}};
 const setCfg=o=>{try{localStorage.setItem(CFG,JSON.stringify(o));return true}catch(e){return false}};
 const linked=()=>{const c=cfg();return!!(c.token&&c.gistId)};
 const notify=()=>{if(app&&app.onStatus)app.onStatus()};
 const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 function set(cloud,msg){st.cloud=cloud;st.msg=msg||'';if(cloud==='ok'){st.last=Date.now();const c=cfg();c.last=st.last;setCfg(c)}notify()}
 function device(pending=false){
  if(st.local===true||st.mirror===true){st.device='saved';st.lastDevice=Date.now();
   st.deviceMessage=st.local&&st.mirror?'Saved in browser storage and device mirror':st.local?'Saved in browser storage; '+(pending?'device mirror pending':'device mirror unavailable'):'Saved in device mirror; browser storage unavailable';
   if(st.snapshots===false&&!pending)st.deviceMessage+='; restore point unavailable';
  }else{st.device=pending?'saving':'error';st.deviceMessage=pending?'Saving to device':'Device save failed. Export a backup before closing Lift.'}
  notify();
 }

 // ---------- IndexedDB ----------
 function open(){return new Promise(res=>{if(!('indexedDB'in self))return res(null);let r;try{r=indexedDB.open('lift',1)}catch(e){return res(null)}
  r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('snaps'))d.createObjectStore('snaps')};
  r.onsuccess=()=>res(r.result);r.onerror=r.onblocked=()=>res(null)})}
 function req(store,mode,fn){return new Promise(res=>{if(!db)return res({ok:false});try{const t=db.transaction(store,mode);const r=fn(t.objectStore(store));t.oncomplete=()=>res({ok:true,value:r?r.result:undefined});t.onerror=t.onabort=()=>res({ok:false})}catch(e){res({ok:false})}})}
 async function writeIdb(){clearTimeout(idbT);if(writing)return writing;
  writing=(async()=>{let revision;do{revision=latest;if(!revision)return;const{json,meta}=revision;
   const mirror=await req('kv','readwrite',s=>s.put(json,'state'));
   const snapshot=await req('snaps','readwrite',s=>s.put({json,mt:meta.mt,n:meta.n},dayKey()));
   if(latest===revision){st.mirror=mirror.ok;st.snapshots=snapshot.ok;device()}
   if(snapshot.ok){const read=await req('snaps','readonly',s=>s.getAllKeys());const keys=(read.value||[]).filter(k=>/^\d{4}-\d\d-\d\d$/.test(k)).sort();
    for(const k of keys.slice(0,Math.max(0,keys.length-KEEP)))await req('snaps','readwrite',s=>s.delete(k))}
  }while(latest!==revision)})();
  try{await writing}finally{writing=null}
 }
 // Do not overwrite a local state during restore unless its undo copy was saved.
 async function stash(){const s=app.get();const r=await req('snaps','readwrite',o=>o.put({json:JSON.stringify(s),mt:s.mt||0,n:(s.sessions||[]).length},'before-restore'));if(!r.ok)throw new Error('Could not save a restore point. Export your current data before restoring or pulling from cloud.')}
 async function snaps(){const keys=await req('snaps','readonly',s=>s.getAllKeys()),vals=await req('snaps','readonly',s=>s.getAll());
  if(!keys.ok||!vals.ok)return[];
  return keys.value.map((k,i)=>({key:k,mt:vals.value[i].mt,n:vals.value[i].n,size:vals.value[i].json.length})).sort((a,b)=>a.key<b.key?1:-1)}
 async function restore(key){const r=await req('snaps','readonly',s=>s.get(key));const v=r.value;if(!r.ok||!v)throw new Error('Restore point not found');const o=JSON.parse(v.json);await stash();o.mt=Date.now();app.adopt(o,'snapshot')}

 // ---------- cloud (secret gist) ----------
 async function gh(path,opt={}){const r=await fetch(API+path,{...opt,cache:'no-store',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+cfg().token,...(opt.body?{'Content-Type':'application/json'}:{})}});
  if(!r.ok){const e=new Error(r.status===401?'GitHub rejected the token':r.status===403?'Token has no Gist permission (or rate limited)':r.status===404?'Backup gist not found':'GitHub error '+r.status);e.status=r.status;throw e}return r.json()}
 function secret(g){if(g.public!==false)throw new Error('This backup is a public Gist. Lift will not read or write it as a secret backup.')}
 async function readRemote(){const g=await gh('/gists/'+cfg().gistId);secret(g);const f=g.files&&g.files[FILE];if(!f)throw new Error('Backup file is missing; no data was overwritten');let txt=f.content;
  if(f.truncated){const r=await fetch(f.raw_url,{cache:'no-store'});if(!r.ok)throw new Error('Could not download backup');txt=await r.text()}
  let o;try{o=JSON.parse(txt)}catch(e){}if(!o||!Array.isArray(o.days)||!Array.isArray(o.sessions))throw new Error('Backup data is invalid; no data was overwritten');return o}
 const cloudState=()=>app.cloudGet?app.cloudGet():app.get();
 const pushNow=()=>gh('/gists/'+cfg().gistId,{method:'PATCH',body:JSON.stringify({files:{[FILE]:{content:JSON.stringify(cloudState())}}})});
 // Newest state wins; a local state being replaced is preserved first.
 async function sync(force){clearTimeout(pushT);if(!linked())return;if(busy){dirty=true;return}if(navigator.onLine===false)return set('offline');
  busy=true;set('syncing');
  try{const remote=await readRemote();const lm=app.get().mt||0,rm=remote.mt||0;
   if(force==='push')await pushNow();
   else if(rm>lm||force==='pull'){await stash();app.adopt(remote,'cloud')}
   else if(lm>rm)await pushNow();
   busy=false;set('ok')}
  catch(e){busy=false;set(navigator.onLine===false?'offline':'error',e.message)}
  if(dirty){dirty=false;queue()}}
 function queue(){if(!linked())return;clearTimeout(pushT);pushT=setTimeout(sync,4000)}
 // An existing backup is read before the user chooses which copy to retain.
 async function connect(token){token=String(token||'').trim();if(!token)throw new Error('Paste a token first');const previous=cfg();if(!setCfg({token}))throw new Error('Cannot save sync settings on this device');
  try{let found=null;for(let p=1;p<=10&&!found;p++){const l=await gh('/gists?per_page=100&page='+p);found=l.find(g=>g.files&&g.files[FILE]);if(l.length<100)break}
   if(found){secret(found);if(!setCfg({token,gistId:found.id}))throw new Error('Cannot save sync settings on this device');const remote=await readRemote();set('pending','Backup found; choose which copy to keep');return{remote}}
   const g=await gh('/gists',{method:'POST',body:JSON.stringify({description:'Lift app data (secret backup)',public:false,files:{[FILE]:{content:JSON.stringify(cloudState())}}})});
   secret(g);if(!setCfg({token,gistId:g.id}))throw new Error('Backup created, but this device could not save its sync settings');set('ok');return{created:true}}
  catch(e){setCfg(previous);set(linked()?'pending':'off');throw e}}
 function disconnect(){clearTimeout(pushT);if(!setCfg({})){set('error','Could not remove sync settings from this device');return}st.last=0;set('off')}

 // ---------- lifecycle ----------
 function changed(json,meta={}){latest={json,meta};st.local=typeof meta.local==='boolean'?meta.local:null;st.mirror=null;st.snapshots=null;device(true);clearTimeout(idbT);idbT=setTimeout(writeIdb,400);if(busy)dirty=true;else queue()}
 async function init(a){app=a;st.last=cfg().last||0;if(linked())st.cloud='pending';db=await open();
  try{if(navigator.storage&&navigator.storage.persist)persisted=(await navigator.storage.persisted())||(await navigator.storage.persist())}catch(e){}
  const r=await req('kv','readonly',s=>s.get('state'));let stored=null;try{stored=r.value?JSON.parse(r.value):null}catch(e){}
  const local=app.get();
  if(stored&&Array.isArray(stored.days)&&Array.isArray(stored.sessions)&&(stored.mt||0)>(local.mt||0))app.adopt(stored,'device');
  else{const json=JSON.stringify(local);let saved=false;try{localStorage.setItem(KEY,json);saved=true}catch(e){}latest={json,meta:{mt:local.mt||0,n:local.sessions.length,local:saved}};st.local=saved;device(true)}
  await writeIdb();sync();
  addEventListener('online',()=>sync());addEventListener('pagehide',writeIdb);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')writeIdb();sync()})}
 const status=()=>({...st,linked:linked(),gistId:cfg().gistId||null,persisted,idb:!!db});
 return{init,changed,sync,connect,disconnect,snaps,restore,status}
})();
