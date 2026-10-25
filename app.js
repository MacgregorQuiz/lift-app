'use strict';
const KEY='lift.v1';
const uid=()=>Math.random().toString(36).slice(2,10);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MUSCLES=['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Abs'];
// name, sets, min, max, muscle, compound, increment
function E(name,sets,min,max,muscle,compound,inc){return{id:uid(),name,sets,min,max,muscle,compound,inc:inc||5}}
function defaultProgram(){return[
 {id:'ua',name:'Upper A',exercises:[E('Incline DB Press',4,6,10,'Chest',1),E('Lat Pulldown',4,8,12,'Back',1),E('Seated Cable Row',3,10,12,'Back',1),E('Seated DB Shoulder Press',3,8,10,'Shoulders',1),E('Lateral Raise',4,12,20,'Shoulders',0,2.5),E('Incline DB Curl',3,10,15,'Biceps',0,2.5),E('Rope Pushdown',3,10,15,'Triceps',0,2.5),E('Face Pull',2,15,20,'Shoulders',0)]},
 {id:'la',name:'Lower A',exercises:[E('Back Squat',4,6,10,'Quads',1),E('Romanian Deadlift',3,8,10,'Hamstrings',1),E('Leg Press',3,10,15,'Quads',1),E('Leg Curl',3,10,15,'Hamstrings',0),E('Standing Calf Raise',4,10,15,'Calves',0),E('Cable Crunch',3,12,15,'Abs',0)]},
 {id:'ub',name:'Upper B',exercises:[E('Pull-ups',4,6,12,'Back',1),E('Flat DB Press',3,8,12,'Chest',1),E('Chest-Supported Row',3,8,12,'Back',1),E('Cable Fly',3,12,15,'Chest',0),E('Lateral Raise',4,12,20,'Shoulders',0,2.5),E('Rear-Delt Fly',3,15,20,'Shoulders',0),E('EZ Curl',3,8,12,'Biceps',0,2.5),E('Overhead Triceps Extension',3,10,15,'Triceps',0,2.5)]},
 {id:'lb',name:'Lower B',exercises:[E('Hip Thrust',4,8,12,'Glutes',1),E('Walking Lunge',3,10,12,'Quads',1),E('Leg Extension',3,12,15,'Quads',0),E('Leg Curl',3,10,15,'Hamstrings',0),E('Calf Raise',4,10,15,'Calves',0),E('Hanging Leg Raise',3,10,15,'Abs',0)]}]}
let S=load();
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.days)return s}catch(e){}return{days:defaultProgram(),sessions:[],active:null,settings:{restCompound:120,restIso:90}}}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
const norm=n=>n.trim().toLowerCase();
const e1rm=(w,r)=>r>0?w*(1+r/30):0; // Epley
const r1=x=>Math.round(x*10)/10;
const fmtD=d=>new Date(d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
const sorted=()=>[...S.sessions].sort((a,b)=>a.date-b.date);
// all past entries for an exercise name, oldest→newest, only with logged sets
function hist(name,beforeId){const n=norm(name),o=[];for(const s of sorted()){if(s.id===beforeId)continue;for(const e of s.entries)if(norm(e.name)===n&&e.sets.some(x=>x.done))o.push({date:s.date,sid:s.id,sets:e.sets.filter(x=>x.done)})}return o}
function bestE1(name,beforeId){let b=0;for(const h of hist(name,beforeId))for(const x of h.sets)b=Math.max(b,e1rm(x.w,x.r));return b}
// Double progression target
function target(ex,beforeId){const h=hist(ex.name,beforeId);const last=h[h.length-1];
 if(!last)return{sets:Array.from({length:ex.sets},()=>({w:'',r:ex.min})),note:'No history — pick a weight you can do for '+ex.min+'-'+ex.max+' reps',last:null};
 const ls=last.sets;const topW=Math.max(...ls.map(x=>+x.w||0));
 const allTop=ls.length>=ex.sets&&ls.every(x=>x.r>=ex.max);
 if(allTop){const w=topW+(ex.inc||5);return{sets:Array.from({length:ex.sets},()=>({w,r:ex.min})),note:`Hit ${ex.max} on all sets → +${ex.inc||5} lb`,last,up:true}}
 const sets=Array.from({length:ex.sets},(_,i)=>{const p=ls[i]||ls[ls.length-1];return{w:p.w,r:Math.min(ex.max,(p.r||0)+1)}});
 return{sets,note:'Same weight — beat last reps',last}}
function weekStart(t=Date.now()){const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()}
function nextDay(){const s=sorted();if(!S.days.length)return null;if(!s.length)return S.days[0];const last=s[s.length-1];let i=S.days.findIndex(d=>d.id===last.dayId);if(i<0)i=S.days.findIndex(d=>d.name===last.dayName);return S.days[(i+1)%S.days.length]}
function stalled(name){const h=hist(name);if(h.length<4)return false;const best=h.map(x=>Math.max(...x.sets.map(s=>e1rm(s.w,s.r))));const prior=Math.max(...best.slice(0,-3));return Math.max(...best.slice(-3))<=prior}
function isCompound(e){return!!e.compound}

let view='home',editSess=null;
function go(v){view=v;editSess=null;render();window.scrollTo(0,0)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
function render(){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('act',b.dataset.v===view||(view==='workout'&&b.dataset.v==='home')));
 $('#topRight').innerHTML='';({home,workout,progress,history,program,data}[view])()}

function home(){if(S.active){view='workout';return workout()}
 $('#title').textContent='Lift';const d=nextDay();const ws=weekStart();const n=S.sessions.filter(s=>s.date>=ws).length;
 const last=sorted().slice(-1)[0];
 $('#view').innerHTML=`<div class="card"><div class="mu">Today</div><div class="hero">${esc(d?d.name:'—')}</div>
 <div class="mu sm">${d?d.exercises.length+' exercises':''}${last?' · last: '+esc(last.dayName)+' '+fmtD(last.date):''}</div>
 <div style="margin-top:14px"><button class="big" id="start">Start workout</button></div>
 <div class="row wrap" style="margin-top:10px">${S.days.filter(x=>x!==d).map(x=>`<button class="pill alt" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div></div>
 <div class="card"><div class="row sp"><b>This week</b><span><b id="wk">${n}</b> / 4</span></div><div class="dots">${[0,1,2,3].map(i=>`<div class="dot ${i<n?'on':''}"></div>`).join('')}</div></div>
 ${d?`<div class="card"><b>Today's targets</b>${d.exercises.map(e=>{const t=target(e);const s0=t.sets[0];return`<div class="row sp sm" style="margin-top:8px"><span>${esc(e.name)}</span><span class="${t.up?'tgt':'mu'}" style="${t.up?'color:var(--ac)':''}">${t.last?`${e.sets}×${s0.w} lb × ${s0.r}`:`${e.sets}×${e.min}-${e.max}`}${t.up?' ↑':''}</span></div>`}).join('')}</div>`:''}`;
 $('#start').onclick=()=>startWorkout(d);document.querySelectorAll('.alt').forEach(b=>b.onclick=()=>startWorkout(S.days.find(x=>x.id===b.dataset.id)))}
function startWorkout(d){if(!d)return;S.active={id:uid(),date:Date.now(),dayId:d.id,dayName:d.name,entries:d.exercises.map(e=>{const t=target(e);return{exId:e.id,name:e.name,muscle:e.muscle,compound:e.compound,min:e.min,max:e.max,inc:e.inc,sets:t.sets.map(s=>({w:s.w,r:s.r,rir:'',done:false}))}})};save();go('workout')}

function setRow(e,i,ei){const s=e.sets[i];return`<div class="set ${s.done?'done':''}" data-e="${ei}" data-i="${i}"><span class="mu">${i+1}</span>
 <div class="stp"><button data-a="w-">−</button><input inputmode="decimal" data-f="w" value="${esc(s.w)}" placeholder="lb"><button data-a="w+">+</button></div>
 <div class="stp"><button data-a="r-">−</button><input inputmode="numeric" data-f="r" value="${esc(s.r)}"><button data-a="r+">+</button></div>
 <select class="rir" data-f="rir"><option value="">–</option>${[0,1,2,3,4,5].map(n=>`<option ${String(s.rir)===String(n)?'selected':''}>${n}</option>`).join('')}</select>
 <button class="chk" data-a="chk">✓</button></div>`}
function workout(){const W=editSess||S.active;if(!W)return go('home');const editing=!!editSess;
 $('#title').textContent=W.dayName;$('#topRight').innerHTML=editing?`<button id="fin">Save</button>`:`<button id="fin" style="background:var(--ac2);color:#05210f;font-weight:700">Finish</button>`;
 $('#view').innerHTML=(editing?`<div class="mu">Editing ${fmtD(W.date)}</div>`:'')+W.entries.map((e,ei)=>{const ex={name:e.name,sets:Math.max(1,e.sets.length),min:e.min,max:e.max,inc:e.inc};const t=target(ex,W.id);const prev=bestE1(e.name,W.id);const cur=Math.max(0,...e.sets.filter(s=>s.done).map(s=>e1rm(+s.w,+s.r)));const pr=prev>0&&cur>prev;
 return`<div class="card ex"><div class="row sp"><h3>${esc(e.name)}${pr?'<span class="badge">PR</span>':''}</h3><span class="mu sm">${e.min}-${e.max}</span></div>
 <div class="last">Last: ${t.last?t.last.sets.map(s=>`${s.w}×${s.r}`).join(', ')+' · '+fmtD(t.last.date):'—'}</div>
 <div class="tgt">Target: ${t.last?`${t.sets[0].w} lb × ${t.sets.map(s=>s.r).join('/')}`:'—'} <span class="mu sm" style="font-weight:400">${esc(t.note)}</span></div>
 <div class="lbl"><span>#</span><span>lb</span><span>reps</span><span>RIR</span><span></span></div>
 ${e.sets.map((_,i)=>setRow(e,i,ei)).join('')}
 <div class="row" style="margin-top:8px"><button class="sm" data-add="${ei}">+ Set</button><button class="sm" data-rm="${ei}">− Set</button></div></div>`}).join('')+
 (editing?`<button class="danger" id="delS" style="width:100%">Delete workout</button>`:`<button class="danger" id="discard" style="width:100%">Discard workout</button>`);
 const V=$('#view');
 V.oninput=V.onchange=ev=>{const f=ev.target.dataset.f;if(!f)return;const r=ev.target.closest('.set');const s=W.entries[r.dataset.e].sets[r.dataset.i];s[f]=f==='rir'?ev.target.value:(ev.target.value===''?'':+ev.target.value);save()};
 V.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.add){const e=W.entries[b.dataset.add];const l=e.sets[e.sets.length-1]||{w:'',r:e.min};e.sets.push({w:l.w,r:l.r,rir:'',done:false});save();return workout()}
  if(b.dataset.rm){const e=W.entries[b.dataset.rm];if(e.sets.length>1)e.sets.pop();save();return workout()}
  const r=b.closest('.set');if(!r)return;const e=W.entries[r.dataset.e];const s=e.sets[r.dataset.i];const a=b.dataset.a;
  const step=e.inc||5;
  if(a==='w+')s.w=r1((+s.w||0)+step);if(a==='w-')s.w=Math.max(0,r1((+s.w||0)-step));
  if(a==='r+')s.r=(+s.r||0)+1;if(a==='r-')s.r=Math.max(0,(+s.r||0)-1);
  if(a==='chk'){if(!s.done&&(s.r===''||+s.r<=0))return;s.done=!s.done;if(s.done&&!editing)startTimer(e.compound?S.settings.restCompound:S.settings.restIso)}
  save();const y=window.scrollY;workout();window.scrollTo(0,y)};
 $('#fin').onclick=()=>{if(editing){const i=S.sessions.findIndex(x=>x.id===W.id);W.entries.forEach(e=>e.sets=e.sets.filter(s=>s.done));W.entries=W.entries.filter(e=>e.sets.length);S.sessions[i]=W;save();return go('history')}
  const done=W.entries.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);if(!done&&!confirm('No sets logged. Finish anyway?'))return;
  W.entries.forEach(e=>e.sets=e.sets.filter(s=>s.done));W.entries=W.entries.filter(e=>e.sets.length);if(done)S.sessions.push(W);S.active=null;stopTimer();save();go('home')};
 if(editing)$('#delS').onclick=()=>{if(confirm('Delete this workout?')){S.sessions=S.sessions.filter(x=>x.id!==W.id);save();go('history')}};
 else $('#discard').onclick=()=>{if(confirm('Discard this workout?')){S.active=null;stopTimer();save();go('home')}}}

// rest timer (timestamp based so it survives background)
let tEnd=0,tInt=null;
function startTimer(sec){tEnd=Date.now()+sec*1000;$('#timer').classList.remove('hidden','done');clearInterval(tInt);tInt=setInterval(tick,250);tick()}
function stopTimer(){clearInterval(tInt);tEnd=0;$('#timer').classList.add('hidden')}
function tick(){const l=Math.round((tEnd-Date.now())/1000);if(l<=0){$('#timerTxt').textContent='Go!';$('#timer').classList.add('done');clearInterval(tInt);if(navigator.vibrate)navigator.vibrate([300,150,300]);setTimeout(()=>{if(tEnd&&Date.now()>=tEnd)stopTimer()},8000);return}$('#timerTxt').textContent=Math.floor(l/60)+':'+String(l%60).padStart(2,'0')}
$('#tPlus').onclick=()=>{tEnd+=15000;tick()};$('#tMinus').onclick=()=>{tEnd-=15000;tick()};$('#tStop').onclick=stopTimer;

function allNames(){const m=new Map();for(const d of S.days)for(const e of d.exercises)m.set(norm(e.name),e.name);for(const s of S.sessions)for(const e of s.entries)if(!m.has(norm(e.name)))m.set(norm(e.name),e.name);return[...m.values()]}
let progSel=null;
function progress(){$('#title').textContent='Progress';const names=allNames();if(!progSel||!names.includes(progSel))progSel=names.find(n=>hist(n).length)||names[0];
 const ws=weekStart();const cnt={};MUSCLES.forEach(m=>cnt[m]=0);
 for(const s of S.sessions)if(s.date>=ws)for(const e of s.entries)cnt[e.muscle||'Other']=(cnt[e.muscle||'Other']||0)+e.sets.filter(x=>x.done&&(x.rir===''||+x.rir<=4)).length;
 const st=names.filter(stalled);
 $('#view').innerHTML=`<div class="card"><select id="exSel" style="width:100%">${names.map(n=>`<option ${n===progSel?'selected':''}>${esc(n)}</option>`).join('')}</select>
 <canvas id="ch" width="700" height="400"></canvas><div class="row sm" style="gap:14px"><span style="color:var(--ac)">● est. 1RM</span><span style="color:#60a5fa">● top weight</span><span id="chInfo" class="mu"></span></div></div>
 <div class="card"><b>Hard sets this week</b> <span class="mu sm">target 10–20</span>${Object.entries(cnt).map(([m,n])=>`<div class="row" style="margin-top:8px"><span style="width:96px" class="sm">${m}</span><div class="bar ${n<10?'lo':n>20?'hi':''}"><i style="width:${Math.min(100,n/20*100)}%"></i></div><span style="width:28px;text-align:right">${n}</span></div>`).join('')}
 <div class="mu sm" style="margin-top:8px">Counts logged sets with RIR ≤ 4 (or blank).</div></div>
 <div class="card"><b>Stalls</b> <span class="mu sm">no e1RM gain in 3 sessions</span>${st.length?st.map(n=>`<div style="margin-top:8px"><span class="stall">STALL</span> ${esc(n)}</div>`).join('')+'<div class="mu sm" style="margin-top:8px">Try a deload, swap variation, or add a set.</div>':'<div class="mu sm" style="margin-top:6px">None — keep pushing.</div>'}</div>`;
 $('#exSel').onchange=e=>{progSel=e.target.value;progress()};drawChart()}
function drawChart(){const c=$('#ch');const x=c.getContext('2d');const h=hist(progSel);const W=c.width,H=c.height,p=40;x.clearRect(0,0,W,H);
 const pts=h.map(s=>({d:s.date,e:Math.max(...s.sets.map(t=>e1rm(+t.w,+t.r))),w:Math.max(...s.sets.map(t=>+t.w))}));
 $('#chInfo').textContent=pts.length?`best ${r1(Math.max(...pts.map(p=>p.e)))} lb${stalled(progSel)?' · STALL':''}`:'';
 x.font='22px -apple-system,sans-serif';x.fillStyle='#8b93a1';
 if(!pts.length){x.fillText('No data yet — log a session.',p,H/2);return}
 const vs=pts.flatMap(p=>[p.e,p.w]);let lo=Math.min(...vs),hi=Math.max(...vs);if(hi-lo<10){lo-=5;hi+=5}lo=Math.max(0,lo-5);
 const X=i=>pts.length===1?W/2:p+i*(W-2*p)/(pts.length-1),Y=v=>H-p-(v-lo)/(hi-lo)*(H-2*p);
 x.strokeStyle='#262b34';x.lineWidth=1;for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;x.beginPath();x.moveTo(p,Y(v));x.lineTo(W-10,Y(v));x.stroke();x.fillText(Math.round(v),0,Y(v)+7)}
 for(const[k,col]of[['e','#4ade80'],['w','#60a5fa']]){x.strokeStyle=col;x.fillStyle=col;x.lineWidth=4;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(X(i),Y(q[k])):x.moveTo(X(i),Y(q[k])));x.stroke();pts.forEach((q,i)=>{x.beginPath();x.arc(X(i),Y(q[k]),6,0,7);x.fill()})}}

function history(){$('#title').textContent='History';const s=sorted().reverse();
 $('#view').innerHTML=s.length?s.map(w=>{const n=w.entries.reduce((a,e)=>a+e.sets.length,0);return`<div class="card" data-id="${w.id}"><div class="row sp"><b>${esc(w.dayName)}</b><span class="mu sm">${fmtD(w.date)}</span></div>
 <div class="mu sm">${w.entries.filter(e=>e.sets.length).map(e=>esc(e.name)+' '+e.sets.map(x=>x.w+'×'+x.r).join(', ')).join('<br>')}</div>
 <div class="row" style="margin-top:8px"><span class="mu sm" style="flex:1">${n} sets</span><button class="ed">Edit</button><button class="danger del">Delete</button></div></div>`}).join(''):'<div class="card mu">No workouts yet.</div>';
 $('#view').onclick=ev=>{const c=ev.target.closest('.card');if(!c||!c.dataset.id)return;const w=S.sessions.find(x=>x.id===c.dataset.id);
  if(ev.target.classList.contains('del')){if(confirm('Delete this workout?')){S.sessions=S.sessions.filter(x=>x!==w);save();history()}}
  if(ev.target.classList.contains('ed')){const cp=JSON.parse(JSON.stringify(w));cp.entries.forEach(e=>e.sets.forEach(s=>s.done=true));view='workout';editSess=cp;render()}}}

let progDay=0;
function program(){$('#title').textContent='Program';if(progDay>=S.days.length)progDay=0;const d=S.days[progDay];
 $('#view').innerHTML=`<div class="row wrap">${S.days.map((x,i)=>`<button class="pill dsel" data-i="${i}" style="${i===progDay?'background:var(--ac2);color:#05210f':''}">${esc(x.name)}</button>`).join('')}<button class="pill" id="addDay">+ Day</button></div>
 ${d?`<div class="card"><div class="row"><input id="dName" value="${esc(d.name)}" style="flex:1"><button data-dm="-1">◀</button><button data-dm="1">▶</button><button class="danger" id="delDay">🗑</button></div>
 ${d.exercises.map((e,i)=>`<div class="edrow" data-i="${i}"><input data-k="name" value="${esc(e.name)}"><button data-m="-1">↑</button><button data-m="1">↓</button><button class="danger" data-x="1">✕</button>
 <div class="f" style="grid-column:1/-1"><label>Sets<input data-k="sets" type="number" inputmode="numeric" value="${e.sets}"></label><label>Min reps<input data-k="min" type="number" inputmode="numeric" value="${e.min}"></label><label>Max reps<input data-k="max" type="number" inputmode="numeric" value="${e.max}"></label>
 <label>Muscle<select data-k="muscle">${MUSCLES.map(m=>`<option ${m===e.muscle?'selected':''}>${m}</option>`).join('')}</select></label><label>+lb<select data-k="inc">${[2.5,5,10].map(v=>`<option ${v==e.inc?'selected':''}>${v}</option>`).join('')}</select></label><label>Type<select data-k="compound"><option value="1" ${e.compound?'selected':''}>Compound</option><option value="0" ${!e.compound?'selected':''}>Isolation</option></select></label></div></div>`).join('')}
 <button id="addEx" style="width:100%;margin-top:10px">+ Add exercise</button></div>`:''}
 <div class="card"><b>Rest timer</b><div class="f"><label>Compound (s)<input id="rc" type="number" value="${S.settings.restCompound}"></label><label>Isolation (s)<input id="ri" type="number" value="${S.settings.restIso}"></label></div></div>
 <button class="danger" id="resetProg" style="width:100%">Reset program to default</button>`;
 const V=$('#view');
 V.querySelectorAll('.dsel').forEach(b=>b.onclick=()=>{progDay=+b.dataset.i;program()});
 $('#addDay').onclick=()=>{S.days.push({id:uid(),name:'New Day',exercises:[]});progDay=S.days.length-1;save();program()};
 $('#rc').onchange=e=>{S.settings.restCompound=+e.target.value||120;save()};$('#ri').onchange=e=>{S.settings.restIso=+e.target.value||90;save()};
 $('#resetProg').onclick=()=>{if(confirm('Reset program? Logged history is kept.')){S.days=defaultProgram();save();program()}};
 if(!d)return;
 $('#dName').onchange=e=>{d.name=e.target.value||'Day';save();program()};
 $('#delDay').onclick=()=>{if(confirm('Delete '+d.name+'?')){S.days.splice(progDay,1);save();program()}};
 V.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{const j=progDay+ +b.dataset.dm;if(j<0||j>=S.days.length)return;[S.days[progDay],S.days[j]]=[S.days[j],S.days[progDay]];progDay=j;save();program()});
 $('#addEx').onclick=()=>{d.exercises.push(E('New Exercise',3,8,12,'Chest',0));save();program()};
 V.onchange=ev=>{const k=ev.target.dataset.k;if(!k)return;const e=d.exercises[ev.target.closest('.edrow').dataset.i];let v=ev.target.value;
  if(k==='name')v=v||'Exercise';else if(k==='muscle');else if(k==='compound')v=v==='1';else v=Math.max(k==='inc'?0.5:1,+v||1);e[k]=v;if(e.min>e.max)[e.min,e.max]=[e.max,e.min];save()};
 V.onclick=ev=>{const r=ev.target.closest('.edrow');if(!r)return;const i=+r.dataset.i;
  if(ev.target.dataset.x){d.exercises.splice(i,1);save();program()}
  if(ev.target.dataset.m){const j=i+ +ev.target.dataset.m;if(j<0||j>=d.exercises.length)return;[d.exercises[i],d.exercises[j]]=[d.exercises[j],d.exercises[i]];save();program()}}}

function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function toCSV(){const rows=[['date','day','exercise','muscle','set','weight_lb','reps','rir','e1rm']];for(const s of sorted())for(const e of s.entries)e.sets.forEach((x,i)=>rows.push([new Date(s.date).toISOString(),s.dayName,e.name,e.muscle||'',i+1,x.w,x.r,x.rir,r1(e1rm(+x.w,+x.r))]));return rows.map(r=>r.map(v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(',')).join('\n')}
function data(){$('#title').textContent='Data';const stamp=new Date().toISOString().slice(0,10);
 $('#view').innerHTML=`<div class="card"><b>Backup</b><div class="mu sm">${S.sessions.length} workouts stored on this device.</div>
 <div class="row wrap" style="margin-top:10px"><button id="xj">Export JSON</button><button id="xc">Export CSV</button><button id="cp">Copy CSV</button></div></div>
 <div class="card"><b>Import JSON</b><div class="mu sm">Replaces all data on this device.</div><input type="file" id="imp" accept=".json,application/json" style="margin-top:10px;width:100%;padding-top:10px"></div>
 <div class="card"><b>Profile</b><div class="mu sm">Mac · 6'2.5" · 175 lb · Upper/Lower 4×/wk · hypertrophy</div></div>
 <button class="danger" id="wipe" style="width:100%">Erase all workouts</button><div class="mu sm" style="margin-top:14px;text-align:center">Lift v1 · data stays on this phone · export regularly</div>`;
 $('#xj').onclick=()=>dl(`lift-backup-${stamp}.json`,JSON.stringify(S,null,1),'application/json');
 $('#xc').onclick=()=>dl(`lift-${stamp}.csv`,toCSV(),'text/csv');
 $('#cp').onclick=async()=>{try{await navigator.clipboard.writeText(toCSV());alert('CSV copied')}catch(e){alert('Copy failed')}};
 $('#imp').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const o=JSON.parse(t);if(!o.days||!o.sessions)throw 0;if(!confirm('Replace all data with this backup?'))return;o.settings=o.settings||{restCompound:120,restIso:90};S=o;save();alert('Imported '+o.sessions.length+' workouts');go('home')}catch(_){alert('Invalid backup file')}})};
 $('#wipe').onclick=()=>{if(confirm('Erase ALL logged workouts? Program is kept.')){S.sessions=[];S.active=null;save();go('home')}}}

window.LIFT={get S(){return S},target,nextDay,stalled,e1rm,toCSV};
render();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
