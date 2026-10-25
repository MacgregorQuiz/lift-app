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
function migrate(s){s.sessions=s.sessions||[];s.active=s.active||null;s.settings=Object.assign({restCompound:120,restIso:90},s.settings||{});
 s.goals=Object.assign({sleep:8,kcal:2800,protein:165,steps:8000,lifts:4,bed:'22:45',gainLo:0.25,gainHi:0.5},s.goals||{});
 s.body=s.body||{};s.body.weights=s.body.weights||[];s.body.meas=s.body.meas||[];
 s.food=s.food||{};s.manual=s.manual||{};s.notes=s.notes||{};s.v=3;return s}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.days)return migrate(s)}catch(e){}return migrate({days:defaultProgram(),sessions:[],active:null,settings:{restCompound:120,restIso:90}})}
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

let view='today',editSess=null;
function go(v){view=v;editSess=null;closeSheet();render();window.scrollTo(0,0)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
const TABOF={workout:'home',history:'more',program:'more',data:'more'};
function render(){const tv=TABOF[view]||view;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('act',b.dataset.v===tv));movePill();
 $('#topRight').innerHTML='';$('#sub').textContent='';if(view==='more')view='history';({today,home,workout,progress,history,program,data,body,sleep:sleepView}[view])();
 const V=$('#view');V.classList.remove('view-in');if(lastView!==view){void V.offsetWidth;V.classList.add('view-in')}lastView=view}
let lastView=null;
function movePill(){const a=document.querySelector('nav button.act'),p=document.querySelector('nav .pillsel');if(!a||!p)return;p.style.left=a.offsetLeft+'px';p.style.width=a.offsetWidth+'px'}
addEventListener('resize',movePill);

function home(){if(S.active){view='workout';return workout()}
 $('#title').textContent='Train';$('#sub').textContent='Next up';const d=nextDay();const ws=weekStart();const n=S.sessions.filter(s=>s.date>=ws).length;
 const last=sorted().slice(-1)[0];
 $('#view').innerHTML=`<div class="card"><div class="mu">Today</div><div class="hero">${esc(d?d.name:'—')}</div>
 <div class="mu sm">${d?d.exercises.length+' exercises':''}${last?' · last: '+esc(last.dayName)+' '+fmtD(last.date):''}</div>
 <div style="margin-top:10px">${readyPill()}</div><div style="margin-top:14px"><button class="big" id="start">Start workout</button></div>
 <div class="row wrap" style="margin-top:10px">${S.days.filter(x=>x!==d).map(x=>`<button class="pill alt" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div></div>
 <div class="card"><div class="row sp"><b>This week</b><span><b id="wk">${n}</b> / 4</span></div><div class="dots">${[0,1,2,3].map(i=>`<div class="dot ${i<n?'on':''}"></div>`).join('')}</div></div>
 ${d?`<div class="card"><b>Today's targets</b>${d.exercises.map(e=>{const t=target(e);const s0=t.sets[0];return`<div class="row sp sm" style="margin-top:8px"><span>${esc(e.name)}</span><span class="${t.up?'tgt':'mu'}" style="${t.up?'color:var(--ac)':''}">${t.last?`${e.sets}×${s0.w} lb × ${s0.r}`:`${e.sets}×${e.min}-${e.max}`}${t.up?' ↑':''}</span></div>`}).join('')}</div>`:''}`;
 $('#start').onclick=()=>startWorkout(d);document.querySelectorAll('.alt').forEach(b=>b.onclick=()=>startWorkout(S.days.find(x=>x.id===b.dataset.id)))}
function startWorkout(d){if(!d)return;S.active={id:uid(),date:Date.now(),dayId:d.id,dayName:d.name,entries:d.exercises.map(e=>{const t=target(e);return{exId:e.id,name:e.name,muscle:e.muscle,compound:e.compound,min:e.min,max:e.max,inc:e.inc,sets:t.sets.map(s=>({w:s.w,r:s.r,rir:'',done:false}))}})};save();go('workout')}

function setRow(e,i,ei){const s=e.sets[i];return`<div class="setw"><div class="delbg">Delete</div><div class="set ${s.done?'done':''}" data-e="${ei}" data-i="${i}"><span class="mu">${i+1}</span>
 <div class="stp"><button data-a="w-">−</button><input inputmode="decimal" data-f="w" value="${esc(s.w)}" placeholder="lb"><button data-a="w+">+</button></div>
 <div class="stp"><button data-a="r-">−</button><input inputmode="numeric" data-f="r" value="${esc(s.r)}"><button data-a="r+">+</button></div>
 <select class="rir" data-f="rir"><option value="">–</option>${[0,1,2,3,4,5].map(n=>`<option ${String(s.rir)===String(n)?'selected':''}>${n}</option>`).join('')}</select>
 <button class="chk" data-a="chk">✓</button></div></div>`}
function workout(){const W=editSess||S.active;if(!W)return go('home');const editing=!!editSess;
 $('#title').textContent=W.dayName;$('#topRight').innerHTML=editing?`<button id="fin">Save</button>`:`<button id="fin" style="background:var(--ac2);color:#05210f;font-weight:700">Finish</button>`;
 $('#view').innerHTML=(editing?`<div class="mu">Editing ${fmtD(W.date)}</div>`:'')+W.entries.map((e,ei)=>{const ex={name:e.name,sets:Math.max(1,e.sets.length),min:e.min,max:e.max,inc:e.inc};const t=target(ex,W.id);const prev=bestE1(e.name,W.id);const cur=Math.max(0,...e.sets.filter(s=>s.done).map(s=>e1rm(+s.w,+s.r)));const pr=prev>0&&cur>prev;
 const wu=(!editing&&ei===warmIdx(W))?warmups(e,t):'';
 return`<div class="card ex"><div class="row sp"><h3>${esc(e.name)}${pr?'<span class="badge">PR</span>':''}</h3><span class="row"><span class="mu sm">${e.min}-${e.max}</span><button class="mini" data-plates="${ei}">Plates</button></span></div>
 <div class="last">Last: ${t.last?t.last.sets.map(s=>`${s.w}×${s.r}`).join(', ')+' · '+fmtD(t.last.date):'—'}</div>
 <div class="tgt">Target: ${t.last?`${t.sets[0].w} lb × ${t.sets.map(s=>s.r).join('/')}`:'—'} <span class="mu sm" style="font-weight:400">${esc(t.note)}</span></div>${wu}
 <div class="lbl"><span>#</span><span>lb</span><span>reps</span><span>RIR</span><span></span></div>
 ${e.sets.map((_,i)=>setRow(e,i,ei)).join('')}
 <div class="row" style="margin-top:8px"><button class="sm" data-add="${ei}">+ Set</button><button class="sm" data-rm="${ei}">− Set</button><span class="mu sm" style="margin-left:auto">swipe set ← to delete</span></div>
 <textarea class="note" data-note="${esc(norm(e.name))}" placeholder="Notes (seat height, grip, cues…)" style="margin-top:8px">${esc(S.notes[norm(e.name)]||'')}</textarea></div>`}).join('')+
 (editing?`<button class="danger" id="delS" style="width:100%">Delete workout</button>`:`<button class="danger" id="discard" style="width:100%">Discard workout</button>`);
 const V=$('#view');
 V.oninput=V.onchange=ev=>{if(ev.target.dataset.note!==undefined){const k=ev.target.dataset.note,v=ev.target.value.trim();if(v)S.notes[k]=ev.target.value;else delete S.notes[k];save();return}const f=ev.target.dataset.f;if(!f)return;const r=ev.target.closest('.set');const s=W.entries[r.dataset.e].sets[r.dataset.i];s[f]=f==='rir'?ev.target.value:(ev.target.value===''?'':+ev.target.value);save()};
 swipeable(V,(ei,i)=>{const e=W.entries[ei];if(e.sets.length<=1)return false;e.sets.splice(i,1);save();const y=window.scrollY;workout();window.scrollTo(0,y);return true});
 V.onclick=ev=>{if(swSuppress)return;const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.plates){const e=W.entries[b.dataset.plates];const s=e.sets.find(x=>!x.done)||e.sets[0];return plateSheet(e.name,+s.w||0)}
  if(b.dataset.add){const e=W.entries[b.dataset.add];const l=e.sets[e.sets.length-1]||{w:'',r:e.min};e.sets.push({w:l.w,r:l.r,rir:'',done:false});save();return workout()}
  if(b.dataset.rm){const e=W.entries[b.dataset.rm];if(e.sets.length>1)e.sets.pop();save();return workout()}
  const r=b.closest('.set');if(!r)return;const e=W.entries[r.dataset.e];const s=e.sets[r.dataset.i];const a=b.dataset.a;
  const step=e.inc||5;
  if(a==='w+')s.w=r1((+s.w||0)+step);if(a==='w-')s.w=Math.max(0,r1((+s.w||0)-step));
  if(a==='r+')s.r=(+s.r||0)+1;if(a==='r-')s.r=Math.max(0,(+s.r||0)-1);
  if(a==='chk'){if(!s.done&&(s.r===''||+s.r<=0))return;s.done=!s.done;if(s.done&&navigator.vibrate)navigator.vibrate(18);if(s.done&&!editing)startTimer(e.compound?S.settings.restCompound:S.settings.restIso)}
  save();const y=window.scrollY;workout();window.scrollTo(0,y)};
 $('#fin').onclick=()=>{if(editing){const i=S.sessions.findIndex(x=>x.id===W.id);W.entries.forEach(e=>e.sets=e.sets.filter(s=>s.done));W.entries=W.entries.filter(e=>e.sets.length);S.sessions[i]=W;save();return go('history')}
  const done=W.entries.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);if(!done&&!confirm('No sets logged. Finish anyway?'))return;
  W.entries.forEach(e=>e.sets=e.sets.filter(s=>s.done));W.entries=W.entries.filter(e=>e.sets.length);let sum=null;if(done){W.end=Date.now();sum=summary(W);S.sessions.push(W)}S.active=null;stopTimer();save();go('today');if(sum)summarySheet(sum)};
 if(editing)$('#delS').onclick=()=>{if(confirm('Delete this workout?')){S.sessions=S.sessions.filter(x=>x.id!==W.id);save();go('history')}};
 else $('#discard').onclick=()=>{if(confirm('Discard this workout?')){S.active=null;stopTimer();save();go('today')}}}

// rest timer (timestamp based so it survives background)
let tEnd=0,tInt=null;
function startTimer(sec){tEnd=Date.now()+sec*1000;$('#timer').classList.remove('hidden','done');clearInterval(tInt);tInt=setInterval(tick,250);tick()}
function stopTimer(){clearInterval(tInt);tEnd=0;$('#timer').classList.add('hidden')}
function tick(){const l=Math.round((tEnd-Date.now())/1000);if(l<=0){$('#timerTxt').textContent='Go!';$('#timer').classList.add('done');clearInterval(tInt);if(navigator.vibrate)navigator.vibrate([300,150,300]);setTimeout(()=>{if(tEnd&&Date.now()>=tEnd)stopTimer()},8000);return}$('#timerTxt').textContent=Math.floor(l/60)+':'+String(l%60).padStart(2,'0')}
$('#tPlus').onclick=()=>{tEnd+=15000;tick()};$('#tMinus').onclick=()=>{tEnd-=15000;tick()};$('#tStop').onclick=stopTimer;

function allNames(){const m=new Map();for(const d of S.days)for(const e of d.exercises)m.set(norm(e.name),e.name);for(const s of S.sessions)for(const e of s.entries)if(!m.has(norm(e.name)))m.set(norm(e.name),e.name);return[...m.values()]}
let progSel=null;
function progress(){$('#title').textContent='Progress';$('#sub').textContent='Strength';const names=allNames();if(!progSel||!names.includes(progSel))progSel=names.find(n=>hist(n).length)||names[0];
 const ws=weekStart();const cnt={};MUSCLES.forEach(m=>cnt[m]=0);
 for(const s of S.sessions)if(s.date>=ws)for(const e of s.entries)cnt[e.muscle||'Other']=(cnt[e.muscle||'Other']||0)+e.sets.filter(x=>x.done&&(x.rir===''||+x.rir<=4)).length;
 const st=names.filter(stalled);
 $('#view').innerHTML=`<div class="card"><select id="exSel" style="width:100%">${names.map(n=>`<option ${n===progSel?'selected':''}>${esc(n)}</option>`).join('')}</select>
 <canvas id="ch" width="700" height="400"></canvas><div class="row sm" style="gap:14px"><span style="color:#30d158">● est. 1RM</span><span style="color:#0a84ff">● top weight</span><span id="chInfo" class="mu"></span></div></div>
 <div class="card"><b>Hard sets this week</b> <span class="mu sm">target 10–20</span>${Object.entries(cnt).map(([m,n])=>`<div class="row" style="margin-top:8px"><span style="width:96px" class="sm">${m}</span><div class="bar ${n<10?'lo':n>20?'hi':''}"><i style="width:${Math.min(100,n/20*100)}%"></i></div><span style="width:28px;text-align:right">${n}</span></div>`).join('')}
 <div class="mu sm" style="margin-top:8px">Counts logged sets with RIR ≤ 4 (or blank).</div></div>
 <div class="card"><b>Stalls</b> <span class="mu sm">no e1RM gain in 3 sessions</span>${st.length?st.map(n=>`<div style="margin-top:8px"><span class="stall">STALL</span> ${esc(n)}</div>`).join('')+'<div class="mu sm" style="margin-top:8px">Try a deload, swap variation, or add a set.</div>':'<div class="mu sm" style="margin-top:6px">None — keep pushing.</div>'}</div>`;
 $('#exSel').onchange=e=>{progSel=e.target.value;progress()};drawChart()}
function drawChart(){const c=$('#ch');const x=c.getContext('2d');const h=hist(progSel);const W=c.width,H=c.height,p=40;x.clearRect(0,0,W,H);
 const pts=h.map(s=>({d:s.date,e:Math.max(...s.sets.map(t=>e1rm(+t.w,+t.r))),w:Math.max(...s.sets.map(t=>+t.w))}));
 $('#chInfo').textContent=pts.length?`best ${r1(Math.max(...pts.map(p=>p.e)))} lb${stalled(progSel)?' · STALL':''}`:'';
 x.font='22px -apple-system,sans-serif';x.fillStyle=cssv('--mu');
 if(!pts.length){x.fillText('No data yet — log a session.',p,H/2);return}
 const vs=pts.flatMap(p=>[p.e,p.w]);let lo=Math.min(...vs),hi=Math.max(...vs);if(hi-lo<10){lo-=5;hi+=5}lo=Math.max(0,lo-5);
 const X=i=>pts.length===1?W/2:p+i*(W-2*p)/(pts.length-1),Y=v=>H-p-(v-lo)/(hi-lo)*(H-2*p);
 x.strokeStyle=cssv('--grid');x.lineWidth=1;for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;x.beginPath();x.moveTo(p,Y(v));x.lineTo(W-10,Y(v));x.stroke();x.fillText(Math.round(v),0,Y(v)+7)}
 for(const[k,col]of[['e','#30d158'],['w','#0a84ff']]){x.strokeStyle=col;x.fillStyle=col;x.lineWidth=4;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(X(i),Y(q[k])):x.moveTo(X(i),Y(q[k])));x.stroke();pts.forEach((q,i)=>{x.beginPath();x.arc(X(i),Y(q[k]),6,0,7);x.fill()})}}

function history(){$('#title').textContent='History';const s=sorted().reverse();
 $('#view').innerHTML=moreSeg('history')+(s.length?s.map(w=>{const n=w.entries.reduce((a,e)=>a+e.sets.length,0);return`<div class="card" data-id="${w.id}"><div class="row sp"><b>${esc(w.dayName)}</b><span class="mu sm">${fmtD(w.date)}</span></div>
 <div class="mu sm">${w.entries.filter(e=>e.sets.length).map(e=>esc(e.name)+' '+e.sets.map(x=>x.w+'×'+x.r).join(', ')).join('<br>')}</div>
 <div class="row" style="margin-top:8px"><span class="mu sm" style="flex:1">${n} sets</span><button class="ed">Edit</button><button class="danger del">Delete</button></div></div>`}).join(''):'<div class="card mu">No workouts yet.</div>');
 $('#view').onclick=ev=>{const c=ev.target.closest('.card');if(!c||!c.dataset.id)return;const w=S.sessions.find(x=>x.id===c.dataset.id);
  if(ev.target.classList.contains('del')){if(confirm('Delete this workout?')){S.sessions=S.sessions.filter(x=>x!==w);save();history()}}
  if(ev.target.classList.contains('ed')){const cp=JSON.parse(JSON.stringify(w));cp.entries.forEach(e=>e.sets.forEach(s=>s.done=true));view='workout';editSess=cp;render()}}}

let progDay=0;
function program(){$('#title').textContent='Program';if(progDay>=S.days.length)progDay=0;const d=S.days[progDay];
 $('#view').innerHTML=moreSeg('program')+`<div class="row wrap">${S.days.map((x,i)=>`<button class="pill dsel" data-i="${i}" style="${i===progDay?'background:var(--ac2);color:#05210f':''}">${esc(x.name)}</button>`).join('')}<button class="pill" id="addDay">+ Day</button></div>
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
 $('#view').innerHTML=moreSeg('data')+`<div class="card"><b>Backup</b><div class="mu sm">${S.sessions.length} workouts, ${S.body.weights.length} weigh-ins stored on this device.</div>
 <div class="row wrap" style="margin-top:10px"><button id="xj">Export JSON</button><button id="xc">Export CSV</button><button id="cp">Copy CSV</button></div></div>
 <div class="card"><b>Import JSON</b><div class="mu sm">Replaces all data on this device.</div><input type="file" id="imp" accept=".json,application/json" style="margin-top:10px;width:100%;padding-top:10px"></div>
 <div class="card"><b>Profile</b><div class="mu sm">Mac · 6'2.5" · 175 lb start · lean gain +0.25–0.5 lb/wk · Upper/Lower 4×/wk · 2,800 kcal · 165 g protein · 8k steps · bed 10:45 PM</div></div>
 <button class="danger" id="wipe" style="width:100%">Erase all workouts</button><div class="mu sm" style="margin-top:14px;text-align:center">Lift v4 · data stays on this phone · export regularly</div>`;
 $('#xj').onclick=()=>dl(`lift-backup-${stamp}.json`,JSON.stringify(S,null,1),'application/json');
 $('#xc').onclick=()=>dl(`lift-${stamp}.csv`,toCSV(),'text/csv');
 $('#cp').onclick=async()=>{try{await navigator.clipboard.writeText(toCSV());alert('CSV copied')}catch(e){alert('Copy failed')}};
 $('#imp').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const o=JSON.parse(t);if(!o.days||!o.sessions)throw 0;if(!confirm('Replace all data with this backup?'))return;S=migrate(o);save();alert('Imported '+o.sessions.length+' workouts');go('today')}catch(_){alert('Invalid backup file')}})};
 $('#wipe').onclick=()=>{if(confirm('Erase ALL logged workouts? Program is kept.')){S.sessions=[];S.active=null;save();go('today')}}}

// ===== v3 additions =====
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
const ymd=(t=Date.now())=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dayMs=864e5;const ymdToT=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d).getTime()};
const addDays=(s,n)=>{const d=new Date(ymdToT(s));d.setDate(d.getDate()+n);return ymd(d)};
const fmtN=n=>Math.round(n).toLocaleString();
function moreSeg(cur){return`<div class="seg">${[['history','History'],['program','Program'],['data','Data']].map(([k,l])=>`<button data-more="${k}" class="${k===cur?'on':''}">${l}</button>`).join('')}</div>`}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-more]');if(b){ev.stopPropagation();go(b.dataset.more)}},true);
// sheets
function openSheet(html){closeSheet();const bg=document.createElement('div');bg.className='sheetbg';bg.id='sbg';const sh=document.createElement('div');sh.className='sheet';sh.id='sheet';sh.innerHTML='<div class="grab"></div>'+html;bg.onclick=closeSheet;document.body.append(bg,sh);return sh}
function closeSheet(){const a=$('#sheet'),b=$('#sbg');if(a)a.remove();if(b)b.remove()}
// swipe-to-delete for set rows
let swSuppress=false;
function swipeable(V,onDel){let sw=null;
 V.onpointerdown=ev=>{const r=ev.target.closest('.set');if(!r||ev.target.matches('input,select,textarea'))return;sw={r,x:ev.clientX,y:ev.clientY,dx:0,on:false}};
 V.onpointermove=ev=>{if(!sw)return;const dx=ev.clientX-sw.x,dy=ev.clientY-sw.y;
  if(!sw.on){if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.5)sw.on=true;else{if(Math.abs(dy)>12)sw=null;return}}
  sw.dx=Math.min(0,dx);sw.r.parentNode.classList.add('swiping');sw.r.style.transition='none';sw.r.style.transform=`translateX(${sw.dx}px)`};
 V.onpointerup=V.onpointercancel=()=>{if(!sw)return;const{r,dx,on}=sw;sw=null;if(!on)return;swSuppress=true;setTimeout(()=>swSuppress=false,60);r.style.transition='';
  if(dx<-90){r.style.transform='translateX(-110%)';setTimeout(()=>{if(!onDel(+r.dataset.e,+r.dataset.i)){r.style.transform='';r.parentNode.classList.remove('swiping')}},180)}else{r.style.transform='';setTimeout(()=>r.parentNode&&r.parentNode.classList.remove('swiping'),350)}}}
// warm-ups for first compound lift
const isDB=n=>/\bDB\b|dumbbell/i.test(n);const isBB=n=>/squat|deadlift|bench|barbell|\bOHP\b|hip thrust|\bEZ\b/i.test(n)&&!isDB(n);
function warmIdx(W){return W.entries.findIndex(e=>e.compound)}
function warmups(e,t){const w=+((t.sets[0]||{}).w)||+((e.sets[0]||{}).w)||0;if(w<20)return`<div class="warm">Warm-up: 1–2 light sets of 10–12 before your first working set.</div>`;
 const rd=x=>Math.round(x/5)*5;let L=[];
 if(isBB(e.name)){L=[[45,10]];for(const[p,r]of[[.5,8],[.7,5],[.85,3]]){const v=rd(w*p);if(v>45&&v<w)L.push([v,r])}}
 else for(const[p,r]of(isDB(e.name)?[[.5,10],[.75,5]]:[[.5,10],[.7,6],[.85,3]])){const v=rd(w*p);if(v>0&&v<w)L.push([v,r])}
 return`<div class="warm">Warm-up: ${L.map(([v,r])=>`${v}×${r}`).join(' → ')} <span class="mu sm">(don't log)</span></div>`}
// plate / dumbbell helper
function plates(total,bar=45){let side=(total-bar)/2;const out=[];if(side<0)return null;for(const p of[45,35,25,10,5,2.5])while(side>=p-1e-9){out.push(p);side=r1(side-p)}return{out,rem:r1(side)}}
function plateSheet(name,w){const db=isDB(name);openSheet(`<h3>${esc(name)}</h3><div class="mu sm">${db?'Dumbbell helper (weight per hand)':'Plate helper (45 lb bar)'}</div>
 <div class="bigstep"><button data-pw="-5">−</button><input id="pw" inputmode="decimal" value="${w||(db?30:135)}"><button data-pw="5">+</button></div><div class="seg"><button data-pm="bar" class="${db?'':'on'}">Barbell</button><button data-pm="db" class="${db?'on':''}">Dumbbells</button></div><div id="pout"></div>`);
 let mode=db?'db':'bar';const sh=$('#sheet');
 const draw=()=>{const v=+$('#pw').value||0;let h='';
  if(mode==='bar'){const p=plates(v);if(!p)h='<div class="mu">Less than the empty bar (45 lb).</div>';else h=`<div class="plates"><div class="barx"></div>${p.out.map(x=>`<i style="height:${30+x*1.3}px" title="${x}"></i>`).join('')}</div><div style="text-align:center"><b>Each side:</b> ${p.out.length?p.out.join(' + '):'empty bar'}${p.rem?` <span class="mu">(+${p.rem} can't be made)</span>`:''}</div>`}
  else{const st=v<25?2.5:5;const lo=Math.floor(v/st)*st,hi=Math.ceil(v/st)*st;h=`<div style="text-align:center;margin:16px 0"><div class="stat">${v} lb</div><div class="mu">per hand · ${r1(v*2)} lb total</div>${lo!==hi?`<div class="mu sm">Nearest DBs: ${lo} or ${hi} lb</div>`:''}</div>`}
  $('#pout').innerHTML=h};
 sh.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.pw){$('#pw').value=Math.max(0,(+$('#pw').value||0)+ +b.dataset.pw*(mode==='bar'?1:.5)*(mode==='bar'?2:1))}if(b.dataset.pm){mode=b.dataset.pm;sh.querySelectorAll('[data-pm]').forEach(x=>x.classList.toggle('on',x===b))}draw()};
 $('#pw').oninput=draw;draw()}
// workout summary
function summary(W){const mus={};let vol=0,sets=0;const prs=[];
 for(const e of W.entries){const d=e.sets.filter(s=>s.done);if(!d.length)continue;sets+=d.length;mus[e.muscle||'Other']=(mus[e.muscle||'Other']||0)+d.length;for(const s of d)vol+=(+s.w||0)*(+s.r||0);
  const prev=bestE1(e.name,W.id),cur=Math.max(...d.map(s=>e1rm(+s.w,+s.r)));if(prev>0&&cur>prev)prs.push({name:e.name,e:r1(cur),prev:r1(prev)})}
 return{name:W.dayName,dur:Math.max(1,Math.round(((W.end||Date.now())-W.date)/60000)),vol,sets,mus,prs}}
function summarySheet(m){openSheet(`<div class="k">Workout complete</div><h1 style="font-size:28px">${esc(m.name)}</h1>
 <div class="grid3" style="margin:14px 0"><div><div class="k">Time</div><div class="stat">${m.dur}<span class="mu sm"> min</span></div></div><div><div class="k">Volume</div><div class="stat">${fmtN(m.vol)}<span class="mu sm"> lb</span></div></div><div><div class="k">Sets</div><div class="stat">${m.sets}</div></div></div>
 <div class="k">PRs (est. 1RM)</div>${m.prs.length?m.prs.map(p=>`<div class="row sp" style="margin:6px 0"><span><span class="badge" style="margin:0 6px 0 0">PR</span>${esc(p.name)}</span><span class="num">${p.e} <span class="mu sm">was ${p.prev}</span></span></div>`).join(''):'<div class="mu sm" style="margin:6px 0">None this time. Consistency builds them.</div>'}
 <div class="k" style="margin-top:12px">Sets per muscle</div>${Object.entries(m.mus).map(([k,n])=>`<div class="row" style="margin-top:6px"><span class="sm" style="width:96px">${k}</span><div class="bar"><i style="width:${Math.min(100,n/8*100)}%"></i></div><span class="num" style="width:24px;text-align:right">${n}</span></div>`).join('')}
 <button class="big" id="sdone" style="margin-top:18px">Done</button>`);$('#sdone').onclick=closeSheet}
// ----- health.json -----
let H={updated:null,days:[]};
async function loadHealth(){try{const r=await fetch('health.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();if(j&&Array.isArray(j.days)){H={updated:j.updated||null,days:j.days.filter(d=>d&&/^\d{4}-\d\d-\d\d$/.test(d.date))};if(['today','body','home','sleep'].includes(view)&&!$('#sheet')&&!document.activeElement.matches('input,textarea,select'))render()}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadHealth()});
const hDay=d=>H.days.find(x=>x.date===d)||null;
const hasHealth=()=>H.days.length>0;
const num=v=>typeof v==='number'&&isFinite(v)?v:null;
function healthChip(){if(!H.updated||!hasHealth())return'';const t=new Date(H.updated);const s=isNaN(t)?'':(ymd(t)===ymd()?t.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):t.toLocaleDateString([],{month:'short',day:'numeric'}));return`<span class="chip"><i></i>Health · synced ${s}</span>`}
function stepsFor(d){const m=S.manual[d];if(m&&num(m.steps)!==null)return m.steps;const h=hDay(d);return h?num(h.steps):null}
function sleepFor(d){return sleepRec(d).hours}
// ----- weight -----
function weightSeries(){const m=new Map();for(const d of H.days){const w=num(d.weightLb);if(w)m.set(d.date,{date:d.date,lb:w,bf:num(d.bodyFatPct),src:'health'})}
 for(const w of S.body.weights)if(num(w.lb))m.set(w.date,{date:w.date,lb:w.lb,bf:num(w.bf),src:'manual'});return[...m.values()].sort((a,b)=>a.date<b.date?-1:1)}
function withMA(ser){return ser.map(p=>{const lo=addDays(p.date,-6);const win=ser.filter(q=>q.date>=lo&&q.date<=p.date);return{...p,ma:win.reduce((a,q)=>a+q.lb,0)/win.length}})}
function weeklyRate(ser=weightSeries()){const end=ymd(),lo=addDays(end,-21);const pts=ser.filter(p=>p.date>=lo);if(pts.length<4)return null;
 const xs=pts.map(p=>(ymdToT(p.date)-ymdToT(pts[0].date))/dayMs);if(xs[xs.length-1]<7)return null;const ys=pts.map(p=>p.lb);const n=xs.length,mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;
 let nu=0,de=0;xs.forEach((x,i)=>{nu+=(x-mx)*(ys[i]-my);de+=(x-mx)**2});return de?nu/de*7:null}
function rateTip(r){const g=S.goals;if(r===null)return'Log at least 4 weigh-ins over 7+ days to see your weekly rate.';
 if(r<g.gainLo)return`Gaining slower than ${g.gainLo} lb/wk. Add ~200 kcal/day (aim ~${fmtN(g.kcal+200)}).`;
 if(r>g.gainHi)return`Gaining faster than ${g.gainHi} lb/wk, likely extra fat. Cut ~200 kcal/day (aim ~${fmtN(g.kcal-200)}).`;return'Right in the lean-gain band. Keep calories where they are.'}
// ----- food -----
const foodDay=d=>S.food[d]||[];
const foodTot=d=>foodDay(d).reduce((a,x)=>({p:a.p+(+x.p||0),k:a.k+(+x.k||0)}),{p:0,k:0});
function addFood(p,k,label){const d=ymd();(S.food[d]=S.food[d]||[]).push({t:Date.now(),p,k,label});save()}
// ----- rings -----
let ringN=0;
function rings(list,size=150,sw=16){const c=size/2;let h=`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs>`;const id='r'+(ringN++);
 list.forEach((r,i)=>h+=`<linearGradient id="${id}${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r.c[0]}"/><stop offset="1" stop-color="${r.c[1]}"/></linearGradient>`);h+='</defs>';
 list.forEach((r,i)=>{const rad=c-sw/2-i*(sw+3);const L=2*Math.PI*rad;const f=Math.max(0,Math.min(1,(r.v||0)/r.max));
  h+=`<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.c[0]}" stroke-opacity=".2" stroke-width="${sw}"/><circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="url(#${id}${i})" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L*(1-f)}" transform="rotate(-90 ${c} ${c})" data-ring="${r.k||''}"/>`});
 return h+'</svg>'}
const RC={lift:['#ff2d55','#ff6a3d'],pro:['#30d158','#b4f000'],steps:['#00c7be','#64d2ff'],kcal:['#ff9f0a','#ffd60a']};
// ----- readiness, streak, recap -----
function lastLiftDays(){const s=sorted();if(!s.length)return null;return Math.round((ymdToT(ymd())-ymdToT(ymd(s[s.length-1].date)))/dayMs)}
function readiness(){let sc=0;const why=[];const d=ymd();const sl=sleepFor(d);
 if(sl!==null){if(sl>=7.5){sc++;why.push(`slept ${r1(sl)} h`)}else if(sl<6.5){sc--;why.push(`only ${r1(sl)} h sleep`)}else why.push(`${r1(sl)} h sleep`)}
 const sd=sleepDebt();if(sd.n>=3&&sd.debt>=5){sc--;why.push(`${Math.round(sd.debt)} h sleep debt`)}
 const t=hDay(d);const hv=t&&num(t.hrv);if(hv!==null){const prev=H.days.filter(x=>x.date<d&&x.date>=addDays(d,-7)&&num(x.hrv)!==null).map(x=>x.hrv);if(prev.length>=3){const av=prev.reduce((a,b)=>a+b)/prev.length;const q=hv/av;if(q>=1.05){sc++;why.push('HRV above baseline')}else if(q<0.9){sc--;why.push('HRV below baseline')}else why.push('HRV normal')}}
 const rh=t&&num(t.restingHR);if(rh!==null){const prev=H.days.filter(x=>x.date<d&&x.date>=addDays(d,-7)&&num(x.restingHR)!==null).map(x=>x.restingHR);if(prev.length>=3){const av=prev.reduce((a,b)=>a+b)/prev.length;if(rh>av+5){sc--;why.push('resting HR elevated')}}}
 const ll=lastLiftDays();if(ll===null)why.push('fresh start');else if(ll>=2){sc++;why.push(`${ll} days since last lift`)}else{const s=sorted();const prevDay=s.length>1?Math.round((ymdToT(ymd(s[s.length-1].date))-ymdToT(ymd(s[s.length-2].date)))/dayMs):9;if(ll<=1&&prevDay<=1){sc--;why.push('lifted 2 days running')}else why.push(ll===0?'lifted today':'lifted yesterday')}
 const lvl=sc>=1?'hard':sc<=-1?'light':'normal';return{lvl,label:{hard:'Train hard',normal:'Train normal',light:'Go lighter'}[lvl],why}}
function readyPill(){const r=readiness();return`<span class="ready ${r.lvl}">● ${r.label}</span> <span class="mu sm">${esc(r.why.join(' · '))}</span>`}
function weekCount(ws){const we=new Date(ws);we.setDate(we.getDate()+7);return S.sessions.filter(s=>s.date>=ws&&s.date<we.getTime()).length}
function streak(){const g=S.goals.lifts;let n=0;let ws=weekStart();if(weekCount(ws)>=g)n++;for(let i=0;i<520;i++){const d=new Date(ws);d.setDate(d.getDate()-7);ws=d.getTime();if(weekCount(ws)>=g)n++;else break}return n}
function recap(){const t=ymd(),lo=addDays(t,-6),loT=ymdToT(lo);const ss=S.sessions.filter(s=>s.date>=loT);let vol=0,sets=0;for(const s of ss)for(const e of s.entries)for(const x of e.sets){sets++;vol+=(+x.w||0)*(+x.r||0)}
 const days=[...Array(7)].map((_,i)=>addDays(lo,i));const pr=days.map(d=>foodDay(d).length?foodTot(d).p:null).filter(x=>x!==null);const st=days.map(stepsFor).filter(x=>x!==null);const sl=days.map(sleepFor).filter(x=>x!==null);
 const ser=withMA(weightSeries());const now=ser[ser.length-1];const then=[...ser].reverse().find(p=>p.date<=addDays(t,-7));
 return{n:ss.length,vol,sets,pro:pr.length?pr.reduce((a,b)=>a+b)/pr.length:null,steps:st.length?st.reduce((a,b)=>a+b)/st.length:null,sleep:sl.length?sl.reduce((a,b)=>a+b)/sl.length:null,dw:now&&then?now.ma-then.ma:null}}
// ----- TODAY -----
function today(){const g=S.goals;const d=ymd();const dt=new Date();$('#sub').textContent=dt.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});$('#title').textContent='Today';$('#topRight').innerHTML=healthChip();
 const n=weekCount(weekStart());const ft=foodTot(d);const steps=stepsFor(d);const nd=nextDay();const ser=withMA(weightSeries());const lw=ser[ser.length-1];const rate=weeklyRate();
 const h=hDay(d)||hDay(addDays(d,-1));const sl=sleepFor(d);const showRec=sl!==null||(h&&(num(h.hrv)!==null||num(h.restingHR)!==null||num(h.sleepScore)!==null));
 const rc=recap();const stk=streak();const m=S.manual[d]||{};
 $('#view').innerHTML=`<div class="card"><div class="rings">${rings([{v:n,max:g.lifts,c:RC.lift,k:'lift'},{v:ft.p,max:g.protein,c:RC.pro,k:'pro'},{v:steps||0,max:g.steps,c:RC.steps,k:'steps'}])}
 <div class="legend"><div><div class="t" style="color:#ff375f">Lifts</div><b id="rLift">${n}/${g.lifts}</b> <span class="mu sm">this week</span></div>
 <div><div class="t" style="color:#30d158">Protein</div><b id="rPro">${Math.round(ft.p)}/${g.protein}</b> <span class="mu sm">g</span></div>
 <div><div class="t" style="color:#00c7be">Steps</div><b id="rSteps">${steps===null?'—':fmtN(steps)}</b> <span class="mu sm">/ ${fmtN(g.steps)}</span></div></div></div></div>
 <div class="card">${S.active?`<div class="k">In progress</div><div class="hero">${esc(S.active.dayName)}</div><button class="big" id="tStart" style="margin-top:12px">Resume workout</button>`:
  `<div class="row sp"><div class="k">Suggested workout</div>${stk?`<span class="chip">🔥 ${stk}-week streak</span>`:''}</div><div class="hero">${esc(nd?nd.name:'—')}</div><div class="mu sm">${nd?nd.exercises.length+' exercises · '+nd.exercises.slice(0,3).map(e=>esc(e.name)).join(', ')+'…':''}</div>
  <div style="margin-top:10px">${readyPill()}</div><button class="big" id="tStart" style="margin-top:14px">Start ${esc(nd?nd.name:'workout')}</button>`}</div>
 <h2>Nutrition</h2><div class="card"><div class="rings">${rings([{v:ft.p,max:g.protein,c:RC.pro},{v:ft.k,max:g.kcal,c:RC.kcal}],104,13)}
 <div class="legend"><div><div class="t" style="color:#30d158">Protein</div><b id="fP">${Math.round(ft.p)}</b> <span class="mu sm">/ ${g.protein} g</span></div><div><div class="t" style="color:#ff9f0a">Calories</div><b id="fK">${fmtN(ft.k)}</b> <span class="mu sm">/ ${fmtN(g.kcal)}</span></div></div></div>
 <div class="qa"><button data-food="meal">Meal +75 g</button><button data-food="shake">Shake +30 g</button></div>
 <div class="f" style="grid-template-columns:1fr 1fr auto;align-items:end"><label>Protein g<input id="cP" type="number" inputmode="numeric" placeholder="0"></label><label>kcal<input id="cK" type="number" inputmode="numeric" placeholder="0"></label><button id="cAdd">Add</button></div>
 <div class="row sp" style="margin-top:8px"><span class="mu sm">${foodDay(d).length} entries today · meals log protein + ~800 kcal, shake ~200 kcal</span>${foodDay(d).length?'<button class="mini" id="fUndo">Undo</button>':''}</div></div>
 <h2>Body</h2><div class="card" id="tBody"><div class="row sp"><div><div class="k">Weight</div><div class="stat">${lw?r1(lw.lb)+'<span class="mu sm"> lb</span>':'—'}</div><div class="mu sm">${lw?`7-day avg ${r1(lw.ma)} · ${lw.date===d?'today':fmtD(ymdToT(lw.date))}`:'No weigh-ins yet'}</div></div>
 <div style="text-align:right"><div class="k">Trend</div><div class="stat" style="font-size:20px">${rate===null?'—':(rate>=0?'+':'')+r1(rate)+' lb/wk'}</div><div class="mu sm">goal +${g.gainLo}–${g.gainHi}</div></div></div>
 <button style="width:100%;margin-top:12px" id="tW">${lw&&lw.date===d?'Update weigh-in':'Log weigh-in'}</button></div>
 ${showRec?`<div class="card"><div class="row sp"><div class="k">Last night</div><button class="mini" id="tSleep">Sleep ›</button></div><div class="grid3" style="margin-top:6px">
 <div><div class="mu sm">Sleep</div><div class="stat">${sl===null?'—':r1(sl)+'<span class="mu sm">h</span>'}</div>${h&&num(h.sleepScore)!==null?`<div class="mu sm">score ${h.sleepScore}</div>`:''}</div>
 <div><div class="mu sm">HRV</div><div class="stat">${h&&num(h.hrv)!==null?Math.round(h.hrv)+'<span class="mu sm">ms</span>':'—'}</div></div>
 <div><div class="mu sm">Resting HR</div><div class="stat">${h&&num(h.restingHR)!==null?Math.round(h.restingHR)+'<span class="mu sm">bpm</span>':'—'}</div></div></div>
 <div class="mu sm" style="margin-top:6px">Bedtime goal ${fmtBed(g.bed)}</div></div>`:''}
 <div class="card"><div class="k">Log today manually</div><div class="f" style="grid-template-columns:1fr 1fr auto;align-items:end"><label>Steps<input id="mSteps" type="number" inputmode="numeric" value="${num(m.steps)??''}" placeholder="${steps??'0'}"></label><label>Sleep h<input id="mSleep" type="number" inputmode="decimal" step="0.1" value="${num(m.sleep)??''}" placeholder="7.5"></label><button id="mSave">Save</button></div><div class="mu sm" style="margin-top:6px">Manual values override Health for today.</div></div>
 <h2>This week</h2><div class="card" id="recap"><div class="grid3"><div><div class="mu sm">Workouts</div><div class="stat">${rc.n}</div></div><div><div class="mu sm">Volume</div><div class="stat" style="font-size:20px">${fmtN(rc.vol)}</div><div class="mu sm">lb · ${rc.sets} sets</div></div><div><div class="mu sm">Weight</div><div class="stat" style="font-size:20px">${rc.dw===null?'—':(rc.dw>=0?'+':'')+r1(rc.dw)}</div><div class="mu sm">lb (7-day avg)</div></div>
 <div><div class="mu sm">Avg protein</div><div class="stat" style="font-size:20px">${rc.pro===null?'—':Math.round(rc.pro)+'g'}</div></div><div><div class="mu sm">Avg steps</div><div class="stat" style="font-size:20px">${rc.steps===null?'—':fmtN(rc.steps)}</div></div><div><div class="mu sm">Avg sleep</div><div class="stat" style="font-size:20px">${rc.sleep===null?'—':r1(rc.sleep)+'h'}</div></div></div><div class="mu sm" style="margin-top:8px">Last 7 days</div></div>`;
 $('#tStart').onclick=()=>{if(S.active)go('workout');else startWorkout(nd)};
 $('#tW').onclick=()=>go('body');if($('#tSleep'))$('#tSleep').onclick=()=>go('sleep');
 $('#view').querySelectorAll('[data-food]').forEach(b=>b.onclick=()=>{if(b.dataset.food==='meal')addFood(75,800,'Meal');else addFood(30,200,'Shake');if(navigator.vibrate)navigator.vibrate(10);today()});
 $('#cAdd').onclick=()=>{const p=+$('#cP').value||0,k=+$('#cK').value||0;if(!p&&!k)return;addFood(p,k,'Custom');today()};
 if($('#fUndo'))$('#fUndo').onclick=()=>{foodDay(d).pop();if(!foodDay(d).length)delete S.food[d];save();today()};
 $('#mSave').onclick=()=>{const st=$('#mSteps').value,sp=$('#mSleep').value;const o=Object.assign({},S.manual[d]||{});delete o.steps;if(st!=='')o.steps=Math.max(0,+st);if(sp!==''){if(+sp!==o.sleep){o.sleep=Math.max(0,+sp);delete o.bed;delete o.wake}}else{delete o.sleep;delete o.bed;delete o.wake;delete o.score}if(Object.keys(o).length)S.manual[d]=o;else delete S.manual[d];save();today()}}
function fmtBed(b){const[h,m]=b.split(':').map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
// ----- BODY -----
let measSel='arms';const MEAS=[['arms','Arms'],['chest','Chest'],['waist','Waist'],['shoulders','Shoulders']];
function body(){const g=S.goals;const d=ymd();$('#title').textContent='Body';$('#sub').textContent='Composition';$('#topRight').innerHTML=renphoChip()||healthChip();
 const ser=withMA(weightSeries());const lw=ser[ser.length-1];const todayE=S.body.weights.find(w=>w.date===d);const def=todayE?todayE.lb:(lw?lw.lb:175);
 const rate=weeklyRate(weightSeries());const lm=S.body.meas.slice().sort((a,b)=>a.date<b.date?-1:1);const lastM=k=>{for(let i=lm.length-1;i>=0;i--)if(num(lm[i][k]))return lm[i][k];return null};
 const pos=v=>Math.max(0,Math.min(100,(v+0.5)/1.5*100));
 $('#view').innerHTML=`<div class="card"><div class="k">${todayE?'Today’s weigh-in ✓':'Log today’s weigh-in'}</div>
 <div class="bigstep"><button data-ws="-0.2">−</button><input id="wIn" inputmode="decimal" value="${r1(def)}"><button data-ws="0.2">+</button></div><div class="mu sm" style="text-align:center;margin-top:-6px">lb</div>
 <div class="f" style="grid-template-columns:1fr auto;align-items:end"><label>Body fat % (optional)<input id="bfIn" type="number" inputmode="decimal" step="0.1" value="${todayE&&num(todayE.bf)!==null?todayE.bf:''}" placeholder="—"></label><button id="wSave" style="background:var(--btn);color:#032010;border:0;padding:0 26px">Save</button></div></div>
 <div class="card"><div class="row sp"><div class="k">Weight</div><span class="mu sm">${ser.length} entries</span></div><canvas id="wch" width="700" height="400"></canvas>
 <div class="row sm" style="gap:14px"><span style="color:#64d2ff">● daily</span><span style="color:#ff375f">● 7-day avg</span><span class="mu">${lw?'avg '+r1(lw.ma)+' lb':''}</span></div></div>
 <div class="card"><div class="row sp"><div class="k">Weekly rate</div><b class="num" id="rate">${rate===null?'—':(rate>=0?'+':'')+r1(rate)+' lb/wk'}</b></div>
 <div style="position:relative;height:14px;border-radius:7px;background:var(--glass2);margin:14px 0 4px"><div style="position:absolute;top:0;bottom:0;left:${pos(g.gainLo)}%;width:${pos(g.gainHi)-pos(g.gainLo)}%;background:rgba(48,209,88,.45);border-radius:7px"></div>${rate===null?'':`<div style="position:absolute;top:-4px;width:6px;height:22px;border-radius:3px;background:var(--tx);left:calc(${pos(rate)}% - 3px);box-shadow:0 0 8px rgba(0,0,0,.4)"></div>`}</div>
 <div class="row sp mu sm"><span>−0.5</span><span>goal ${g.gainLo}–${g.gainHi}</span><span>+1.0</span></div><div style="margin-top:8px" id="tip">${rateTip(rate)}</div></div>
 ${compHTML()}<h2>Measurements</h2><div class="card"><div class="f" style="grid-template-columns:repeat(4,1fr)">${MEAS.map(([k,l])=>`<label>${l} in<input data-m="${k}" type="number" inputmode="decimal" step="0.1" placeholder="${lastM(k)??'—'}"></label>`).join('')}</div>
 <button id="mAdd" style="width:100%;margin-top:10px">Save measurements</button>
 <div class="seg" style="margin-top:12px">${MEAS.map(([k,l])=>`<button data-ms="${k}" class="${k===measSel?'on':''}">${l}</button>`).join('')}</div><canvas id="mch" width="700" height="300" style="height:150px"></canvas></div>
 <h2>Recent</h2><div class="card">${ser.slice(-10).reverse().map(p=>`<div class="row sp" style="padding:6px 0;border-top:1px solid var(--grid)"><span>${fmtD(ymdToT(p.date))}</span><span class="num"><b>${r1(p.lb)}</b> lb${p.bf!==null?` · ${p.bf}%`:''} <span class="mu sm">${p.src==='health'?'Health':'manual'}</span>${p.src==='manual'?` <button class="mini danger" data-wdel="${p.date}">✕</button>`:''}</span></div>`).join('')||'<div class="mu">No weigh-ins yet. Step on the Renpho and log it above.</div>'}</div>`;
 const V=$('#view');
 V.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.ws){$('#wIn').value=r1(Math.max(50,(+$('#wIn').value||def)+ +b.dataset.ws));return}
  if(b.id==='wSave'){const lb=+$('#wIn').value;if(!(lb>50&&lb<500))return alert('Enter a valid weight');const bf=$('#bfIn').value;const e={date:d,lb:r1(lb)};if(bf!=='')e.bf=r1(+bf);S.body.weights=S.body.weights.filter(w=>w.date!==d);S.body.weights.push(e);save();if(navigator.vibrate)navigator.vibrate(15);return body()}
  if(b.dataset.wdel){if(confirm('Delete this weigh-in?')){S.body.weights=S.body.weights.filter(w=>w.date!==b.dataset.wdel);save();body()}return}
  if(b.id==='mAdd'){const e={date:d};let any=false;V.querySelectorAll('[data-m]').forEach(i=>{if(i.value!==''){e[i.dataset.m]=r1(+i.value);any=true}});if(!any)return;const ex=S.body.meas.find(x=>x.date===d);if(ex)Object.assign(ex,e);else S.body.meas.push(e);save();return body()}
  if(b.dataset.ms){measSel=b.dataset.ms;return body()}};
 lineChart($('#wch'),ser.slice(-90).map(p=>({t:ymdToT(p.date),a:p.lb,b:p.ma})),['#64d2ff','#ff375f'],'No weigh-ins yet');
 drawLF();lineChart($('#mch'),lm.filter(x=>num(x[measSel])).map(x=>({t:ymdToT(x.date),a:x[measSel]})),['#bf5af2'],'No '+measSel+' measurements yet')}
function lineChart(c,pts,cols,empty,band){const x=c.getContext('2d');const W=c.width,Hh=c.height,p=46;x.clearRect(0,0,W,Hh);x.font='22px -apple-system,sans-serif';x.fillStyle=cssv('--mu');
 if(!pts.length){x.fillText(empty,p,Hh/2);return}const vs=pts.flatMap(q=>[q.a,q.b].filter(v=>v!=null)).concat(band?[band.lo,band.hi]:[]);let lo=Math.min(...vs),hi=Math.max(...vs);if(hi-lo<2){lo-=1;hi+=1}const pad=(hi-lo)*.1;lo-=pad;hi+=pad;
 const t0=pts[0].t,t1=pts[pts.length-1].t;const X=t=>t1===t0?W/2:p+(t-t0)/(t1-t0)*(W-p-14),Y=v=>Hh-28-(v-lo)/(hi-lo)*(Hh-46);
 x.strokeStyle=cssv('--grid');x.lineWidth=1;for(let k=0;k<=3;k++){const v=lo+(hi-lo)*k/3;x.beginPath();x.moveTo(p,Y(v));x.lineTo(W-6,Y(v));x.stroke();x.fillText(r1(v),0,Y(v)+7)}
 if(band){x.fillStyle='rgba(48,209,88,.16)';if(cols[0]==='#ff375f')x.fillStyle='rgba(255,55,95,.14)';x.fillRect(p,Y(band.hi),W-p-6,Y(band.lo)-Y(band.hi));x.fillStyle=cssv('--mu')}
 x.fillText(new Date(t0).toLocaleDateString([],{month:'short',day:'numeric'}),p,Hh-2);if(t1!==t0){const s=new Date(t1).toLocaleDateString([],{month:'short',day:'numeric'});x.fillText(s,W-x.measureText(s).width-6,Hh-2)}
 const a=pts.map(q=>[X(q.t),Y(q.a)]);x.fillStyle=cols[0];a.forEach(([u,v])=>{x.beginPath();x.arc(u,v,cols.length>1?5:7,0,7);x.fill()});
 const ln=(arr,col,w)=>{x.strokeStyle=col;x.lineWidth=w;x.lineJoin='round';x.beginPath();arr.forEach(([u,v],i)=>i?x.lineTo(u,v):x.moveTo(u,v));x.stroke()};
 if(cols.length>1)ln(pts.filter(q=>q.b!=null).map(q=>[X(q.t),Y(q.b)]),cols[1],5);else ln(a,cols[0],4)}

// ===== v4: sleep + composition =====
const tod=iso=>{if(!iso)return null;const m=String(iso).match(/T?(\d{1,2}):(\d{2})/);return m?(+m[1])*60+(+m[2]):null}; // minutes after midnight (local wall clock in the ISO string)
const sinceNoon=min=>min===null?null:(min<720?min+1440:min)-720; // bedtime on a continuous scale
const fmtMin=min=>{if(min===null)return'—';min=((Math.round(min)%1440)+1440)%1440;return new Date(2000,0,1,Math.floor(min/60),min%60).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const hm=h=>{if(h===null||h===undefined)return'—';const m=Math.round(h*60);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'};
function sleepRec(d){const h=hDay(d)||{};const m=S.manual[d]||{};const r={hours:num(m.sleep)??num(h.sleepHours),bed:m.bed||h.bedtime||null,wake:m.wake||h.wakeTime||null,score:num(m.score)??num(h.sleepScore),
 deep:num(h.sleepDeepMin),rem:num(h.sleepRemMin),light:num(h.sleepLightMin),awake:num(h.sleepAwakeMin),src:num(m.sleep)!==null?'manual':(num(h.sleepHours)!==null?'health':null)};
 if(r.src==='manual'){r.deep=r.rem=r.light=r.awake=null}return r}
function sleepNights(n,end=ymd()){return[...Array(n)].map((_,i)=>{const d=addDays(end,i-n+1);return{date:d,...sleepRec(d)}})}
function sleepDebt(){const ns=sleepNights(7).filter(x=>x.hours!==null);return{debt:ns.reduce((a,x)=>a+Math.max(0,S.goals.sleep-x.hours),0),n:ns.length}}
function consistency(){const bs=sleepNights(14).map(x=>sinceNoon(tod(x.bed))).filter(x=>x!==null);if(bs.length<3)return null;const mu=bs.reduce((a,b)=>a+b)/bs.length;const sd=Math.sqrt(bs.reduce((a,b)=>a+(b-mu)**2,0)/bs.length);return{sd,score:Math.max(0,Math.min(100,Math.round(100-sd))),avg:mu+720,n:bs.length}}
function bedLate(bed){const b=sinceNoon(tod(bed)),t=sinceNoon(tod(S.goals.bed));return b===null?null:b-t}
function lastSleep(){for(let i=0;i<90;i++){const d=addDays(ymd(),-i);const r=sleepRec(d);if(r.hours!==null)return{date:d,...r}}return null}
function baseline(key,days=30){const v=H.days.filter(x=>x.date>=addDays(ymd(),-days)&&num(x[key])!==null).map(x=>x[key]);if(v.length<5)return null;const mu=v.reduce((a,b)=>a+b)/v.length;const sd=Math.sqrt(v.reduce((a,b)=>a+(b-mu)**2,0)/v.length);return{mu,lo:mu-sd,hi:mu+sd}}
let sleepRange=7;
function sleepView(){const g=S.goals;const d=ymd();$('#title').textContent='Sleep';$('#sub').textContent='Recovery';$('#topRight').innerHTML=healthChip();
 const L=lastSleep();const isToday=L&&L.date===d;const debt=sleepDebt();const con=consistency();const late=L?bedLate(L.bed):null;const m=S.manual[d]||{};
 const st=L&&[L.deep,L.rem,L.light,L.awake].some(x=>x!==null)?[['Deep',L.deep,'#5e5ce6'],['REM',L.rem,'#64d2ff'],['Light',L.light,'#0a84ff'],['Awake',L.awake,'#ff9f0a']].filter(x=>x[1]!==null&&x[1]>0):null;const stT=st?st.reduce((a,x)=>a+x[1],0):0;
 const hrvB=baseline('hrv'),rhrB=baseline('restingHR');
 $('#view').innerHTML=`<div class="card">${L?`<div class="row sp"><div class="k">${isToday?'Last night':'Latest night · '+fmtD(ymdToT(L.date))}</div><span class="mu sm">${L.src==='manual'?'manual':'Health'}</span></div>
 <div class="rings" style="margin-top:8px">${rings([{v:L.hours,max:g.sleep,c:['#5e5ce6','#bf5af2']}],110,14)}<div class="legend"><div><div class="t" style="color:#bf5af2">Asleep</div><b id="slH">${hm(L.hours)}</b> <span class="mu sm">/ ${g.sleep} h</span></div>
 ${L.score!==null?`<div><div class="t" style="color:var(--mu)">Score</div><b>${L.score}</b></div>`:''}<div><div class="t" style="color:var(--mu)">Bed → wake</div><b style="font-size:16px">${fmtMin(tod(L.bed))} → ${fmtMin(tod(L.wake))}</b></div></div></div>
 ${late===null?'':`<div style="margin-top:10px"><span class="ready ${late<=15?'hard':late<=60?'normal':'light'}" id="bedPill">● ${late<=15?'Bedtime on time':'Late by '+hm(late/60).replace('0h ','')}</span> <span class="mu sm">target ${fmtBed(g.bed)}</span></div>`}
 ${st?`<div class="k" style="margin-top:14px">Stages</div><div class="hyp">${st.map(x=>`<i style="flex:${x[1]};background:${x[2]}"></i>`).join('')}</div><div class="row wrap sm" style="gap:12px">${st.map(x=>`<span><span style="color:${x[2]}">●</span> ${x[0]} ${hm(x[1]/60)} <span class="mu">${Math.round(x[1]/stT*100)}%</span></span>`).join('')}</div>`:'<div class="mu sm" style="margin-top:10px">No stage data for this night.</div>'}`
 :`<div class="k">Sleep</div><div class="mu" style="margin-top:6px">No sleep data yet. It appears here once your watch syncs through Health, or log a night below.</div>`}</div>
 <div class="grid2"><div class="card"><div class="k">Sleep debt · 7d</div><div class="stat" id="debt">${debt.n?hm(debt.debt):'—'}</div><div class="mu sm">${debt.n?`vs ${g.sleep} h goal · ${debt.n}/7 nights logged`:'no nights logged'}</div></div>
 <div class="card"><div class="k">Consistency</div><div class="stat" id="cons">${con?con.score:'—'}</div><div class="mu sm">${con?`bedtime ±${Math.round(con.sd)} min · avg ${fmtMin(con.avg)}`:'needs 3+ bedtimes'}</div></div></div>
 <div class="card"><div class="row sp"><div class="k">Duration</div><div class="seg" style="margin:0;width:120px"><button data-sr="7" class="${sleepRange===7?'on':''}">7d</button><button data-sr="30" class="${sleepRange===30?'on':''}">30d</button></div></div><canvas id="sch" width="700" height="360" style="height:180px"></canvas></div>
 ${hrvB||rhrB?`<div class="card"><div class="k">HRV · 30 days</div><canvas id="hrvch" width="700" height="300" style="height:150px"></canvas><div class="mu sm">${hrvB?`baseline ${Math.round(hrvB.mu)} ms (band = ±1 SD)`:'not enough HRV data'}</div>
 <div class="k" style="margin-top:12px">Resting HR · 30 days</div><canvas id="rhrch" width="700" height="300" style="height:150px"></canvas><div class="mu sm">${rhrB?`baseline ${Math.round(rhrB.mu)} bpm`:'not enough resting-HR data'}</div></div>`:''}
 <div class="card"><div class="k">Log last night manually</div><div class="mu sm">For nights you didn't wear the watch. Manual entries win over Health for that date.</div>
 <div class="f" style="grid-template-columns:1fr 1fr 1fr;align-items:end"><label>Bedtime<input id="sBed" type="time" value="${m.bed?String(m.bed).slice(11,16):''}"></label><label>Wake<input id="sWake" type="time" value="${m.wake?String(m.wake).slice(11,16):''}"></label><label>Score<input id="sScore" type="number" inputmode="numeric" value="${num(m.score)??''}" placeholder="opt."></label></div>
 <div class="row" style="margin-top:8px"><button id="sSave" style="flex:1;background:var(--btn);color:#032010;border:0">Save night</button>${num(m.sleep)!==null?'<button class="danger" id="sClr">Clear</button>':''}</div><div class="mu sm" id="sMsg"></div></div>`;
 const V=$('#view');V.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.sr){sleepRange=+b.dataset.sr;return sleepView()}
  if(b.id==='sSave'){const bt=$('#sBed').value,wt=$('#sWake').value;if(!bt||!wt){$('#sMsg').textContent='Enter bedtime and wake time.';return}
   const bm=tod(bt),wm=tod(wt);let dur=wm-bm;if(dur<=0)dur+=1440;if(dur>16*60){$('#sMsg').textContent='That is over 16 h, check the times.';return}
   const bedDay=bm>=wm?addDays(d,-1):d;const o=Object.assign({},S.manual[d]||{},{sleep:r1(dur/60),bed:bedDay+'T'+bt+':00',wake:d+'T'+wt+':00'});const sc=$('#sScore').value;if(sc!=='')o.score=Math.max(0,Math.min(100,+sc));else delete o.score;S.manual[d]=o;save();return sleepView()}
  if(b.id==='sClr'){const o=S.manual[d];delete o.sleep;delete o.bed;delete o.wake;delete o.score;if(!Object.keys(o).length)delete S.manual[d];save();return sleepView()}};
 barChart($('#sch'),sleepNights(sleepRange).map(x=>({d:x.date,v:x.hours})),g.sleep);
 if($('#hrvch')){const hs=H.days.filter(x=>x.date>=addDays(d,-30));lineChart($('#hrvch'),hs.filter(x=>num(x.hrv)!==null).map(x=>({t:ymdToT(x.date),a:x.hrv})),['#30d158'],'No HRV data',hrvB);lineChart($('#rhrch'),hs.filter(x=>num(x.restingHR)!==null).map(x=>({t:ymdToT(x.date),a:x.restingHR})),['#ff375f'],'No resting-HR data',rhrB)}}
function barChart(c,pts,goal){const x=c.getContext('2d');const W=c.width,Hh=c.height,p=40,bot=30;x.clearRect(0,0,W,Hh);x.font='20px -apple-system,sans-serif';x.fillStyle=cssv('--mu');
 if(!pts.some(q=>q.v!==null)){x.fillText('No sleep data in this range',p,Hh/2);return}const mx=Math.max(10,...pts.map(q=>q.v||0));const Y=v=>Hh-bot-v/mx*(Hh-bot-12);const bw=(W-p-8)/pts.length;
 x.strokeStyle=cssv('--grid');for(const v of[0,4,8]){x.beginPath();x.moveTo(p,Y(v));x.lineTo(W,Y(v));x.stroke();x.fillText(v+'h',0,Y(v)+7)}
 pts.forEach((q,i)=>{const X=p+i*bw+bw*.18,w=bw*.64;if(q.v!==null){const gr=x.createLinearGradient(0,Y(q.v),0,Y(0));gr.addColorStop(0,q.v>=goal?'#bf5af2':'#5e5ce6');gr.addColorStop(1,'rgba(94,92,230,.35)');x.fillStyle=gr;const h=Y(0)-Y(q.v),r=Math.min(w/2,8);x.beginPath();x.roundRect?x.roundRect(X,Y(q.v),w,h,[r,r,2,2]):x.rect(X,Y(q.v),w,h);x.fill()}
  if(pts.length<=7||i%5===0){x.fillStyle=cssv('--mu');const l=pts.length<=7?new Date(ymdToT(q.d)).toLocaleDateString([],{weekday:'short'}):new Date(ymdToT(q.d)).getDate()+'';x.fillText(l,X,Hh-4)}});
 x.strokeStyle='#ff9f0a';x.setLineDash([8,6]);x.lineWidth=2;x.beginPath();x.moveTo(p,Y(goal));x.lineTo(W,Y(goal));x.stroke();x.setLineDash([])}
// composition
function compLatest(){const keys=['weightLb','bodyFatPct','leanMassLb','muscleMassLb','bmi','bodyWaterPct','visceralFat','bmr'];const o={};for(const k of keys)for(let i=H.days.length-1;i>=0;i--){const v=num(H.days[i][k]);if(v!==null){o[k]={v,date:H.days[i].date};break}}return o}
const hasRenpho=()=>H.days.some(x=>num(x.weightLb)!==null||num(x.bodyFatPct)!==null||num(x.leanMassLb)!==null);
function renphoChip(){if(!hasRenpho())return'';const t=new Date(H.updated);return`<span class="chip"><i style="background:#30d158"></i>Renpho · synced ${isNaN(t)?'':t.toLocaleDateString([],{month:'short',day:'numeric'})}</span>`}
function leanFatSeries(){const out=[];const hm_=new Map(H.days.map(x=>[x.date,x]));for(const p of weightSeries()){const h=hm_.get(p.date)||{};const bf=p.bf??num(h.bodyFatPct);const lean=p.src==='health'&&num(h.leanMassLb)!==null?h.leanMassLb:(bf!==null?p.lb*(1-bf/100):null);if(lean===null)continue;out.push({t:ymdToT(p.date),a:r1(lean),b:r1(p.lb-lean)})}return out}
function compHTML(){const c=compLatest();const F=[['weightLb','Weight','lb'],['bodyFatPct','Body fat','%'],['leanMassLb','Lean mass','lb'],['muscleMassLb','Muscle','lb'],['bmi','BMI',''],['bodyWaterPct','Water','%'],['visceralFat','Visceral fat',''],['bmr','BMR','kcal']].filter(f=>c[f[0]]);
 const lf=leanFatSeries();
 return(F.length?`<h2>Composition</h2><div class="grid3" id="comp">${F.map(([k,l,u])=>`<div class="card" style="margin:0;padding:12px"><div class="k">${l}</div><div class="stat" style="font-size:21px">${k==='bmr'?fmtN(c[k].v):r1(c[k].v)}<span class="mu sm"> ${u}</span></div><div class="mu sm">${fmtD(ymdToT(c[k].date)).replace(/^\w+, /,'')}</div></div>`).join('')}</div>`:
 `<div class="card"><div class="k">Renpho</div><div class="mu sm" style="margin-top:4px">No scale data synced yet. Turn on Renpho → Apple Health (Renpho app › Settings › Apple Health) and body composition will show up here.</div></div>`)+
 `<div class="card"><div class="row sp"><div class="k">Lean vs fat mass</div><span class="mu sm">${lf.length} pts</span></div><canvas id="lfch" width="700" height="360" style="height:180px"></canvas><div class="row sm" style="gap:14px"><span style="color:#30d158">● lean</span><span style="color:#ff9f0a">● fat</span><span class="mu">own scales · goal: lean ↑, fat flat</span></div></div>`}
function drawLF(){const c=$('#lfch');if(!c)return;const s=leanFatSeries();if(s.length<1){lineChart(c,[],['#30d158'],'Needs weigh-ins with body fat %');return}
 // two series on separate scales: draw lean, then fat overlay normalized
 const x=c.getContext('2d');const W=c.width,Hh=c.height,p=50;x.clearRect(0,0,W,Hh);x.font='20px -apple-system,sans-serif';
 const t0=s[0].t,t1=s[s.length-1].t;const X=t=>t1===t0?W/2:p+(t-t0)/(t1-t0)*(W-p*2);
 const sc=(k)=>{const v=s.map(q=>q[k]);let lo=Math.min(...v),hi=Math.max(...v);if(hi-lo<2){lo-=1;hi+=1}return v2=>Hh-30-(v2-lo)/(hi-lo)*(Hh-50)};const YL=sc('a'),YF=sc('b');
 x.fillStyle=cssv('--mu');x.fillText(r1(Math.max(...s.map(q=>q.a))),0,22);x.fillText(r1(Math.max(...s.map(q=>q.b))),W-44,22);
 for(const[k,Y,col]of[['a',YL,'#30d158'],['b',YF,'#ff9f0a']]){x.strokeStyle=col;x.fillStyle=col;x.lineWidth=4;x.beginPath();s.forEach((q,i)=>i?x.lineTo(X(q.t),Y(q[k])):x.moveTo(X(q.t),Y(q[k])));x.stroke();s.forEach(q=>{x.beginPath();x.arc(X(q.t),Y(q[k]),4,0,7);x.fill()})}}

window.LIFT={get S(){return S},get H(){return H},target,nextDay,stalled,e1rm,toCSV,readiness,weightSeries,sleepRec,sleepDebt,consistency,leanFatSeries,compLatest,weeklyRate,loadHealth};
render();loadHealth();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
