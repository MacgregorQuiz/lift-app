const C='lift-v9';const A=['./','index.html','style.css','store.js','app.js','plus.js','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(u=>new Request(u,{cache:'reload'})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// Same-origin GETs: try the network (fresh code + fresh health.json), fall back to cache when offline or slow.
const key=r=>{const u=new URL(r.url);return r.mode==='navigate'?'index.html':u.origin+u.pathname};
function fresh(r,ms){return new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('slow')),ms);fetch(r,{cache:'no-store'}).then(x=>{clearTimeout(t);if(x.ok){const cp=x.clone();caches.open(C).then(c=>c.put(key(r),cp))}res(x)},e=>{clearTimeout(t);rej(e)})})}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);if(u.origin!==location.origin)return;
 const hj=u.pathname.endsWith('/health.json');
 e.respondWith(fresh(r,hj?8000:3000).catch(()=>caches.match(key(r)).then(m=>m||(hj?new Response('{"updated":null,"days":[]}',{headers:{'Content-Type':'application/json'}}):fetch(r)))))});
