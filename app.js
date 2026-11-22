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
let storageReady=false;
const STACKS=[['am','Morning'],['day','Daytime'],['pm','Evening']];
const STC={am:'#ffd84d',day:'#19e3b1',pm:'#7c8cff'};
const AUTO={weigh:'weigh-in logged',sleep:'sleep goal from Health',lift:'logged workout',meal:'meal-prep check-in',pro:'protein goal',steps:'step goal',bed:'bedtime from Health',screen:'screen time under your limit'};
function defaultHabits(){return[
 {id:'h_weigh',name:'Weigh in',stack:'am',auto:'weigh'},{id:'h_sleep',name:'Hit sleep goal',stack:'am',auto:'sleep'},{id:'h_creatine',name:'Creatine',stack:'am'},
 {id:'h_lift',name:'Workout',stack:'day',auto:'lift'},{id:'h_meal',name:'Eat prepped meals',stack:'day',auto:'meal'},{id:'h_pro',name:'Protein goal',stack:'day',auto:'pro'},{id:'h_steps',name:'Step goal',stack:'day',auto:'steps'},
 {id:'h_screens',name:'Screens off before bed',stack:'pm'},{id:'h_bed',name:'In bed on time',stack:'pm',auto:'bed'}]}
function migrate(s){s.sessions=s.sessions||[];s.active=s.active||null;s.settings=Object.assign({restCompound:120,restIso:90},s.settings||{});
 s.goals=Object.assign({sleep:8,kcal:2800,protein:165,steps:8000,lifts:4,bed:'22:45',gainLo:0.25,gainHi:0.5,screen:180},s.goals||{});
 s.body=s.body||{};s.body.weights=s.body.weights||[];s.body.meas=s.body.meas||[];
 s.food=s.food||{};s.manual=s.manual||{};s.notes=s.notes||{};
 s.meals=s.meals||{};s.settings.eatOutCost=s.settings.eatOutCost??25;s.settings.prepCost=s.settings.prepCost??6.5;
 if(!s.habits){const d=new Date();const since=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');s.habits=defaultHabits().map(h=>({...h,since}))}
 s.hlog=s.hlog||{};s.screen=s.screen||{};if((s.v||0)<9&&!s.habits.some(h=>h.auto==='screen')){const d=new Date();s.habits.push({id:'h_screen',name:'Screen time under limit',stack:'pm',auto:'screen',since:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})}s.cues=Object.assign({am:'I wake up',day:'I sit down for lunch',pm:'I brush my teeth'},s.cues||{});s.rem=Object.assign({gym:'17:30',wake:'07:00',on:{gym:1,bed:1,am:0}},s.rem||{});s.acts=s.acts||[];s.favs=s.favs||[];if(!s.plan||!Array.isArray(s.plan.days))s.plan={tpl:'ul4',days:[1,1,0,1,1,0,0]};s.mt=s.mt||0;s.v=16;s.healthArchive=s.healthArchive||{updated:null,days:[]};s.settings.syncHealth=s.settings.syncHealth===true;return WorkoutPlan.migrate(s)}
// mt = last-modified time; it decides which copy is newest when restoring or syncing
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.days){s.mt=s.mt||1;return migrate(s)}}catch(e){}return migrate({days:defaultProgram(),sessions:[],active:null,settings:{restCompound:120,restIso:90}})}
const MEMO=new Map();function memo(k,fn){if(MEMO.has(k))return MEMO.get(k);const v=fn();MEMO.set(k,v);return v}
function persist(){MEMO.clear();const j=JSON.stringify(S);let local=false;try{localStorage.setItem(KEY,j);local=true}catch(e){}Store.changed(j,{mt:S.mt,n:S.sessions.length,local})}
function save(){S.mt=Date.now();persist()}
const norm=n=>n.trim().toLowerCase();
const e1rm=(w,r)=>r>0?w*(1+r/30):0; // Epley
const r1=x=>Math.round(x*10)/10;
const fmtD=d=>new Date(d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
const sorted=()=>[...S.sessions].sort((a,b)=>a.date-b.date);
// all past entries for an exercise name, oldest→newest, only with logged sets
function hist(entry,beforeId){return TrainingCoach.matchingHistory(S.sessions,typeof entry==='string'?{name:entry}:entry,beforeId)}
function bestE1(entry,beforeId){let b=0;for(const h of hist(entry,beforeId))for(const x of h.sets)b=Math.max(b,e1rm(x.w,x.r));return b}
function target(ex,beforeId){const cue=S.notes[norm(ex.name)]||'';if(!ex.notes&&TrainingCoach.suggestion(cue,ex))ex={...ex,notes:cue};return TrainingCoach.recommend({entry:ex,sessions:S.sessions,beforeId,health:trainingReadiness(),now:Date.now()})}
function weekStart(t=Date.now()){const d=new Date(t);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()}
function nextDay(){const s=sorted();if(!S.days.length)return null;const last=[...s].reverse().find(x=>S.days.some(d=>d.id===x.dayId||d.name===x.dayName));if(!last)return S.days[0];let i=S.days.findIndex(d=>d.id===last.dayId);if(i<0)i=S.days.findIndex(d=>d.name===last.dayName);return S.days[(i+1)%S.days.length]}
function stalled(name){const h=hist(name);if(h.length<4)return false;const best=h.map(x=>Math.max(...x.sets.map(s=>e1rm(s.w,s.r))));const prior=Math.max(...best.slice(0,-3));return Math.max(...best.slice(-3))<=prior}
function isCompound(e){return!!e.compound}

let view='today',editSess=null,healthSel='sleep';
function go(v){view=v;editSess=null;closeSheet();render();window.scrollTo(0,0)}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
const TABOF={workout:'home',progress:'home',history:'home',program:'home',streaks:'habits',sleep:'health',body:'health',vitals:'health',data:'more'};
function render(){if(view==='more')view='data';if(view==='health')view=healthSel;if(['sleep','body','vitals'].includes(view))healthSel=view;
 const tv=TABOF[view]||view;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('act',b.dataset.v===tv));
 const V=$('#view');V.onclick=V.oninput=V.onchange=V.onpointerdown=V.onpointermove=V.onpointerup=V.onpointercancel=null;
 $('#topRight').innerHTML='';$('#sub').textContent='';({today,home,workout,progress,history,program,data,body,sleep:sleepView,streaks,habits,vitals}[view])();
 V.classList.remove('view-in');if(lastView!==view){void V.offsetWidth;V.classList.add('view-in')}lastView=view}
let lastView=null;
function segNav(items,cur){return`<div class="seg">${items.map(([k,l])=>`<button data-go="${k}" class="${k===cur?'on':''}">${l}</button>`).join('')}</div>`}
const trainSeg=c=>segNav([['home','Workout'],['progress','Progress'],['history','History'],['program','Program']],c);
const healthSeg=c=>segNav([['sleep','Sleep'],['body','Body'],['vitals','Vitals']],c)+healthSyncCard();
const habitSeg=c=>segNav([['habits','Stack'],['streaks','Meal prep']],c);
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-go]');if(b){ev.stopPropagation();go(b.dataset.go)}},true);
let toastT=null;function toast(msg){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}t.textContent=msg;clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),2200)}

function home(){if(S.active){view='workout';return workout()}
 $('#title').textContent='Train';$('#sub').textContent='Next up';const d=plannedDay(nextDay());const g=S.goals.lifts;const n=weekCount(weekStart());
 const last=sorted().slice(-1)[0];
 $('#view').innerHTML=trainSeg('home')+originalPlanPrompt()+`<div class="card"><div class="k">Next workout</div><div class="hero">${esc(d?d.name:'—')}</div>
 <div class="mu sm">${d?workoutEstimate(d):''}${last?' · last: '+esc(last.dayName)+' '+fmtD(last.date):''}</div>
 ${lengthPicker()}<button class="plan-link" data-go="program">${esc(TEMPLATES[S.plan.tpl]?.name||'Custom program')} · Training settings ›</button><div style="margin-top:10px">${readyPill()}</div><div style="margin-top:14px"><button class="big" id="start">Start workout</button></div>
 <div class="row wrap" style="margin-top:10px">${S.days.filter(x=>x.id!==d?.id).map(x=>`<button class="pill alt" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div></div>
 <div class="card"><div class="row sp"><div class="k">This week</div><span class="num"><b id="wk">${n}</b> / ${g} lifts</span></div>${weekStrip()}
 ${actsOn(ymd()).concat(S.acts.filter(a=>a.date>=weekStart()&&a.date<ymdToT(ymd()))).sort((a,b)=>b.date-a.date).map(a=>`<div class="kv"><span>${esc(a.type)} <span class="mu sm">${fmtD(a.date)}</span></span><span>${actLine(a)}</span></div>`).join('')}</div>
 <div class="row"><button id="actAdd" style="flex:1">+ Log activity</button><button id="emptyW" style="flex:1">Empty workout</button></div><div class="mu sm" style="margin:8px 2px 0">Rowing, a bike ride, hockey: log it as an activity. Or start empty and add lifts as you go.</div>
 ${d?`<div class="card"><div class="k">Targets</div>${d.exercises.map(e=>{const t=target(e);const s0=t.sets[0];return`<div class="row sp sm" style="margin-top:8px"><span>${esc(e.name)}</span><span class="${t.up?'tgt':'mu'}" style="${t.up?'color:var(--ac)':''}">${t.last?`${e.sets}×${s0.w} lb × ${s0.r}`:`${e.sets}×${e.min}-${e.max}`}${t.up?' ↑':''}</span></div>`}).join('')}</div>`:''}`;
 bindLengthPicker(home);$('#start').disabled=!d;$('#start').onclick=()=>startWorkout(d);$('#actAdd').onclick=()=>actSheet();$('#emptyW').onclick=startEmpty;document.querySelectorAll('.alt').forEach(b=>b.onclick=()=>startWorkout(S.days.find(x=>x.id===b.dataset.id)))}
function startWorkout(d){if(S.active)return go('workout');d=plannedDay(d);if(!d)return;S.active={program:S.plan.tpl,length:S.plan.length,id:uid(),date:Date.now(),dayId:d.id,dayName:d.name,healthContext:healthSnapshot(),entries:d.exercises.map(e=>{const t=target(e);return{...TrainingCoach.equipment(e),...WorkoutPlan.prescription(e),notes:'',plannedSetCount:t.sets.length,exId:e.id,name:e.name,muscle:e.muscle,compound:e.compound,min:e.min,max:e.max,inc:e.inc,sets:t.sets.map(s=>({w:s.w,r:s.r,rir:'',done:false}))}})};save();go('workout')}

function setRow(e,i,ei){const s=e.sets[i];return`<div class="setw"><div class="delbg">Delete</div><div class="set ${s.done?'done':''}" data-e="${ei}" data-i="${i}"><span class="mu">${i+1}</span>
 <div class="stp"><button data-a="w-">−</button><input inputmode="decimal" data-f="w" value="${esc(s.w)}" placeholder="lb"><button data-a="w+">+</button></div>
 <div class="stp"><button data-a="r-">−</button><input inputmode="numeric" data-f="r" value="${esc(s.r)}"><button data-a="r+">+</button></div>
 <select class="rir" data-f="rir"><option value="">–</option>${[0,1,2,3,4,5].map(n=>`<option ${String(s.rir)===String(n)?'selected':''}>${n}</option>`).join('')}</select>
 <button class="chk" data-a="chk">✓</button></div></div>`}
function workout(){const W=editSess||S.active;if(!W)return go('home');const editing=!!editSess;
 $('#title').textContent=W.dayName;$('#topRight').innerHTML=editing?`<button id="fin">Save</button>`:`<button id="fin" style="background:var(--ac2);color:#00231a;font-weight:700">Finish</button>`;
 const rdy=editing?null:readiness();
 $('#view').innerHTML=(editing?`<div class="mu">Editing ${fmtD(W.date)}</div>`:rdy.lvl==='light'&&W.entries.length?`<div class="card" style="border-color:rgba(255,90,90,.35)"><span class="ready light">● Go lighter today</span><div class="mu sm" style="margin-top:6px">${esc(rdy.why.join(' · '))}. Keep the weights, stop two reps short, and skip the last set of the small lifts.</div></div>`:'')+(W.entries.length?'':`<div class="card mu sm">Empty workout. Add whatever you end up doing.</div>`)+W.entries.map((e,ei)=>{const ex={...e,sets:Math.max(1,e.sets.length)};const t=target(ex,W.id);const prev=bestE1(e,W.id);const cur=Math.max(0,...e.sets.filter(s=>s.done).map(s=>e1rm(+s.w,+s.r)));const pr=prev>0&&cur>prev;
 const wu=(!editing&&ei===warmIdx(W))?warmups(e,t):'';
 return`<div class="card ex"><div class="row sp"><h3>${esc(e.name)}${pr?'<span class="badge">PR</span>':''}</h3><span class="row"><button class="mini" data-plates="${ei}">Plates</button><button class="mini" data-exm="${ei}" aria-label="Exercise options">•••</button></span></div>
 ${liftTargetHTML(e)}${equipmentControl(e,ei)}${liftGuideHTML(e)}<div class="last">Last matching setup: ${t.last?t.last.sets.map(s=>`${s.w}×${s.r}`).join(', ')+' · '+fmtD(t.last.date):'—'}</div>
 <div class="tgt">From your history: ${t.status==='equipment-review'?'Confirm setup first':t.last?`${t.sets[0].w} lb × ${t.sets.map(s=>s.r).join('/')}`:'—'} <span class="mu sm" style="font-weight:400">${esc(t.note)}</span></div>${t.last?.notes?`<div class="mu sm">Last session note: ${esc(t.last.notes)}</div>`:''}${wu}
 <div class="lbl"><span>#</span><span>lb</span><span>reps</span><span>RIR</span><span></span></div>
 ${e.sets.map((_,i)=>setRow(e,i,ei)).join('')}
 <div class="row" style="margin-top:8px"><button class="sm" data-add="${ei}">+ Set</button><button class="sm" data-rm="${ei}">− Set</button><span class="mu sm" style="margin-left:auto">swipe set ← to delete</span></div>
 <textarea class="note" data-note="${ei}" placeholder="Notes for this workout (equipment, difficulty, discomfort…)" style="margin-top:8px">${esc(e.notes||'')}</textarea></div>`}).join('')+`<button id="wAdd" style="width:100%;margin:4px 0 12px">+ Add exercise</button>`+
 (editing?`<button class="danger" id="delS" style="width:100%">Delete workout</button>`:`<button class="danger" id="discard" style="width:100%">Discard workout</button>`);
 const V=$('#view');
 V.oninput=V.onchange=ev=>{if(ev.target.dataset.note!==undefined){const ei=+ev.target.dataset.note;W.entries[ei].notes=ev.target.value;if(!editing)save();if(ev.type==='change')reWorkout();return}const f=ev.target.dataset.f;if(!f)return;const r=ev.target.closest('.set');const s=W.entries[r.dataset.e].sets[r.dataset.i];s[f]=f==='rir'?ev.target.value:(ev.target.value===''?'':+ev.target.value);if(!editing)save()};
 swipeable(V,(ei,i)=>{const e=W.entries[ei];if(e.sets.length<=1)return false;e.sets.splice(i,1);save();const y=window.scrollY;workout();window.scrollTo(0,y);return true});
 V.onclick=ev=>{if(swSuppress)return;const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.equipment!==undefined)return equipmentSheet(W,+b.dataset.equipment);
  if(b.id==='wAdd')return exPicker('Add exercise',x=>{W.entries.push(mkEntry(x,W));if(!editing)save();reWorkout();window.scrollTo(0,document.body.scrollHeight)});
  if(b.dataset.exm)return exMenu(W,+b.dataset.exm);
  if(b.dataset.plates){const e=W.entries[b.dataset.plates];const s=e.sets.find(x=>!x.done)||e.sets[0];return plateSheet(e.name,+s.w||0,TrainingCoach.equipment(e))}
  if(b.dataset.add){const e=W.entries[b.dataset.add];const l=e.sets[e.sets.length-1]||{w:'',r:e.min};e.sets.push({w:l.w,r:l.r,rir:'',done:false});save();return workout()}
  if(b.dataset.rm){const e=W.entries[b.dataset.rm];if(e.sets.length>1)e.sets.pop();save();return workout()}
  const r=b.closest('.set');if(!r)return;const e=W.entries[r.dataset.e];const s=e.sets[r.dataset.i];const a=b.dataset.a;
  const step=e.inc||5;
  if(a==='w+')s.w=r1((+s.w||0)+step);if(a==='w-')s.w=Math.max(0,r1((+s.w||0)-step));
  if(a==='r+')s.r=(+s.r||0)+1;if(a==='r-')s.r=Math.max(0,(+s.r||0)-1);
  if(a!=='chk'&&!s.done){save();r.querySelector('[data-f=w]').value=s.w;r.querySelector('[data-f=r]').value=s.r;return}
  if(a==='chk'){if(!s.done&&(s.r===''||+s.r<=0))return;s.done=!s.done;if(s.done&&navigator.vibrate)navigator.vibrate(18);if(s.done&&!editing)startTimer(WorkoutPlan.restSeconds(e,S.settings))}
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
function progress(){$('#title').textContent='Train';$('#sub').textContent='Progress';const variants=exerciseVariants(),names=variants.map(e=>TrainingCoach.key(e));if(!progSel||!names.includes(progSel))progSel=names.find(k=>hist(variants.find(e=>TrainingCoach.key(e)===k)).length)||names[0];
 const ws=weekStart();const cnt={};MUSCLES.forEach(m=>cnt[m]=0);
 for(const s of S.sessions)if(s.date>=ws)for(const e of s.entries)cnt[e.muscle||'Other']=(cnt[e.muscle||'Other']||0)+e.sets.filter(x=>x.done&&(x.rir===''||+x.rir<=4)).length;
 const st=variants.filter(stalled);
 $('#view').innerHTML=trainSeg('progress')+trainingInsightHTML()+`<div class="card"><select id="exSel" style="width:100%">${variants.map(e=>`<option value="${esc(TrainingCoach.key(e))}" ${TrainingCoach.key(e)===progSel?'selected':''}>${esc(e.name+' · '+equipmentLabel(e))}</option>`).join('')}</select>
 <canvas id="ch" width="700" height="400"></canvas><div class="row sm" style="gap:14px"><span style="color:#19e3b1">● est. 1RM</span><span style="color:#2c9cff">● top weight</span><span id="chInfo" class="mu"></span></div></div>
 ${weeklySetsHTML(cnt)}
 <div class="card"><b>Stalls</b> <span class="mu sm">no e1RM gain in 3 sessions</span>${st.length?st.map(n=>`<div style="margin-top:8px"><span class="stall">STALL</span> ${esc(n.name+' · '+equipmentLabel(n))}</div>`).join('')+'<div class="mu sm" style="margin-top:8px">Review recovery or try a deload, swap variation, or add a set.</div>':'<div class="mu sm" style="margin-top:6px">None — keep pushing.</div>'}</div>`;
 $('#exSel').onchange=e=>{progSel=e.target.value;progress()};drawChart()}
function drawChart(){const c=$('#ch');const x=c.getContext('2d');const selected=exerciseVariants().find(e=>TrainingCoach.key(e)===progSel);const h=selected?hist(selected):[];const W=c.width,H=c.height,p=40;x.clearRect(0,0,W,H);
 const pts=h.map(s=>({d:s.date,e:Math.max(...s.sets.map(t=>e1rm(+t.w,+t.r))),w:Math.max(...s.sets.map(t=>+t.w))}));
 $('#chInfo').textContent=pts.length?`best ${r1(Math.max(...pts.map(p=>p.e)))} lb${selected&&stalled(selected)?' · STALL':''}`:'';
 x.font='22px -apple-system,Inter,sans-serif';x.fillStyle=cssv('--mu');
 if(!pts.length){x.fillText('No data yet — log a session.',p,H/2);return}
 const vs=pts.flatMap(p=>[p.e,p.w]);let lo=Math.min(...vs),hi=Math.max(...vs);if(hi-lo<10){lo-=5;hi+=5}lo=Math.max(0,lo-5);
 const X=i=>pts.length===1?W/2:p+i*(W-2*p)/(pts.length-1),Y=v=>H-p-(v-lo)/(hi-lo)*(H-2*p);
 x.strokeStyle=cssv('--grid');x.lineWidth=1;for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4;x.beginPath();x.moveTo(p,Y(v));x.lineTo(W-10,Y(v));x.stroke();x.fillText(Math.round(v),0,Y(v)+7)}
 for(const[k,col]of[['e','#19e3b1'],['w','#2c9cff']]){x.strokeStyle=col;x.fillStyle=col;x.lineWidth=4;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(X(i),Y(q[k])):x.moveTo(X(i),Y(q[k])));x.stroke();pts.forEach((q,i)=>{x.beginPath();x.arc(X(i),Y(q[k]),6,0,7);x.fill()})}}
function history(){$('#title').textContent='Train';$('#sub').textContent='History';const L=[...S.sessions.map(w=>({t:w.date,w})),...S.acts.map(a=>({t:a.date,a}))].sort((x,y)=>y.t-x.t);
 $('#view').innerHTML=trainSeg('history')+(L.length?L.map(({w,a})=>{if(a)return`<div class="card" data-aid="${a.id}"><div class="row sp"><b>${esc(a.type)}</b><span class="mu sm">${fmtD(a.date)}</span></div><div class="mu sm">${actLine(a)}${a.note?'<br>'+esc(a.note):''}</div><div class="row" style="margin-top:8px"><span class="chip" style="margin-right:auto">Activity</span><button class="danger del">Delete</button></div></div>`;
 const n=w.entries.reduce((x,e)=>x+e.sets.length,0);return`<div class="card" data-id="${w.id}"><div class="row sp"><b>${esc(w.dayName)}</b><span class="mu sm">${fmtD(w.date)}</span></div>
 <div class="mu sm">${w.entries.filter(e=>e.sets.length).map(e=>esc(e.name)+' · '+esc(equipmentLabel(e))+' '+e.sets.map(x=>x.w+'×'+x.r).join(', ')+(e.notes?'<br><span class="mu sm">'+esc(e.notes)+'</span>':'')).join('<br>')}</div>
 <div class="row" style="margin-top:8px"><span class="mu sm" style="flex:1">${n} sets</span><button class="ed">Edit</button><button class="danger del">Delete</button></div></div>`}).join(''):'<div class="card mu">Nothing logged yet.</div>');
 $('#view').onclick=ev=>{const c=ev.target.closest('.card');if(!c)return;
  if(c.dataset.aid){if(ev.target.classList.contains('del')&&confirm('Delete this activity?')){S.acts=S.acts.filter(x=>x.id!==c.dataset.aid);save();history()}return}
  if(!c.dataset.id)return;const w=S.sessions.find(x=>x.id===c.dataset.id);
  if(ev.target.classList.contains('del')){if(confirm('Delete this workout?')){S.sessions=S.sessions.filter(x=>x!==w);save();history()}}
  if(ev.target.classList.contains('ed')){const cp=JSON.parse(JSON.stringify(w));cp.entries.forEach(e=>e.sets.forEach(s=>s.done=true));view='workout';editSess=cp;render()}}}

let progDay=0;
function program(){$('#title').textContent='Train';$('#sub').textContent='Program';if(progDay>=S.days.length)progDay=0;const d=S.days[progDay];
 $('#view').innerHTML=trainSeg('program')+planHTML()+`<h2>Edit full routine</h2><p class="mu sm">Your full routine stays saved. Shorter sessions use the preview above; choose Full to include every exercise and set.</p><div class="row wrap">${S.days.map((x,i)=>`<button class="pill dsel" data-i="${i}" style="${i===progDay?'background:var(--ac2);color:#00231a':''}">${esc(x.name)}</button>`).join('')}<button class="pill" id="addDay">+ Day</button></div>
 ${d?`<div class="card"><div class="row"><input id="dName" value="${esc(d.name)}" style="flex:1;min-width:0"><button data-dm="-1">◀</button><button data-dm="1">▶</button><button class="danger" id="delDay">🗑</button></div>
 ${d.exercises.map((e,i)=>`<div class="edrow" data-i="${i}"><input data-k="name" value="${esc(e.name)}"><button data-m="-1">↑</button><button data-m="1">↓</button><button class="danger" data-x="1">✕</button>
 <div class="f" style="grid-column:1/-1"><label>Sets<input data-k="sets" type="number" inputmode="numeric" value="${e.sets}"></label><label>Min reps<input data-k="min" type="number" inputmode="numeric" value="${e.min}"></label><label>Max reps<input data-k="max" type="number" inputmode="numeric" value="${e.max}"></label>
 <label>Muscle<select data-k="muscle">${MUSCLES.map(m=>`<option ${m===e.muscle?'selected':''}>${m}</option>`).join('')}</select></label><label>+lb<select data-k="inc">${[2.5,5,10].map(v=>`<option ${v==e.inc?'selected':''}>${v}</option>`).join('')}</select></label><label>Type<select data-k="compound"><option value="1" ${e.compound?'selected':''}>Compound</option><option value="0" ${!e.compound?'selected':''}>Isolation</option></select></label><label>Rest seconds<input data-k="restSeconds" type="number" min="0" max="600" inputmode="numeric" value="${esc(e.restSeconds??'')}" placeholder="Default"></label></div></div>`).join('')}
 <button id="addEx" style="width:100%;margin-top:10px">+ Add exercise</button></div>`:''}
 <div class="card"><b>Default rest timer</b><p class="mu sm">Used when an exercise’s Rest seconds field is blank. Minimalist plans start with their own 120s / 90s rests; edit those per exercise above.</p><div class="f"><label>Compound (s)<input id="rc" type="number" value="${S.settings.restCompound}"></label><label>Isolation (s)<input id="ri" type="number" value="${S.settings.restIso}"></label></div></div>
 <button class="danger" id="resetProg" style="width:100%">Reset this style to default</button>`;
 const V=$('#view');
 V.querySelectorAll('.dsel').forEach(b=>b.onclick=()=>{progDay=+b.dataset.i;program()});
 $('#addDay').onclick=()=>{S.days.push({id:uid(),name:'New Day',exercises:[]});progDay=S.days.length-1;save();program()};
 $('#rc').onchange=e=>{S.settings.restCompound=Math.max(0,Math.min(600,Number(e.target.value)||0));save();program()};$('#ri').onchange=e=>{S.settings.restIso=Math.max(0,Math.min(600,Number(e.target.value)||0));save();program()};
 $('#resetProg').onclick=()=>{if(confirm('Reset this style’s exercises and schedule? Logged history and other styles are kept.')){const t=TEMPLATES[S.plan.tpl]||TEMPLATES.ul4;S.days=t.days();S.plan.days=[...t.sched];if(t.length)S.plan.length=WorkoutPlan.mode(t.length);S.goals.lifts=t.sched.filter(Boolean).length;progDay=0;save();program()}};bindPlan();
 if(!d)return;
 $('#dName').onchange=e=>{d.name=e.target.value||'Day';save();program()};
 $('#delDay').onclick=()=>{if(confirm('Delete '+d.name+'?')){S.days.splice(progDay,1);save();program()}};
 V.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{const j=progDay+ +b.dataset.dm;if(j<0||j>=S.days.length)return;[S.days[progDay],S.days[j]]=[S.days[j],S.days[progDay]];progDay=j;save();program()});
 $('#addEx').onclick=()=>{d.exercises.push(E('New Exercise',3,8,12,'Chest',0));save();program()};
 V.onchange=ev=>{const k=ev.target.dataset.k;if(!k)return;const e=d.exercises[ev.target.closest('.edrow').dataset.i];let v=ev.target.value;
  if(k==='name')v=v||'Exercise';else if(k==='muscle');else if(k==='restSeconds')v=v===''?'':Math.max(0,Math.min(600,Number(v)||0));else if(k==='compound')v=v==='1';else v=Math.max(k==='inc'?0.5:1,+v||1);e[k]=v;if(e.min>e.max)[e.min,e.max]=[e.max,e.min];save();updatePlanPreview()};
 V.onclick=ev=>{const r=ev.target.closest('.edrow');if(!r)return;const i=+r.dataset.i;
  if(ev.target.dataset.x){d.exercises.splice(i,1);save();program()}
  if(ev.target.dataset.m){const j=i+ +ev.target.dataset.m;if(j<0||j>=d.exercises.length)return;[d.exercises[i],d.exercises[j]]=[d.exercises[j],d.exercises[i]];save();program()}}}

function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function toCSV(){const rows=[['date','day','exercise','muscle','set','weight_lb','reps','rir','e1rm','equipment','weight_basis','setup','notes']];for(const s of sorted())for(const e of s.entries)e.sets.forEach((x,i)=>rows.push([new Date(s.date).toISOString(),s.dayName,e.name,e.muscle||'',i+1,x.w,x.r,x.rir,r1(e1rm(+x.w,+x.r)),TrainingCoach.equipment(e).equipment,TrainingCoach.equipment(e).basis,e.variant||'',e.notes||'']));return rows.map(r=>r.map(v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(',')).join('\n')}
const ago=t=>{if(!t)return'never';const s=(Date.now()-t)/1000;return s<60?'just now':s<3600?Math.round(s/60)+' min ago':s<86400?Math.round(s/3600)+' h ago':new Date(t).toLocaleDateString([],{month:'short',day:'numeric'})};
function syncChip(){const s=Store.status();const m=s.device==='error'?['var(--bad)','Save failed']:s.device==='saving'?['var(--warn)','Saving…']:!s.linked?['var(--mu)','Saved on device']:s.cloud==='syncing'?['var(--warn)','Syncing']:s.cloud==='error'?['var(--bad)','Sync error']:s.cloud==='pending'?['var(--warn)','Sync not verified']:s.cloud==='offline'?['var(--mu)','Saved · cloud offline']:['var(--ac)','Synced'];
 return`<button class="chip" id="syncChip" data-go="data"><i style="background:${m[0]}"></i>${m[1]}</button>`}
function onStatus(){const c=$('#syncChip');if(c)c.outerHTML=syncChip();if(view==='data'&&!$('#sheet')&&!document.activeElement.matches('input,textarea,select'))data()}
function adopt(o,why){if(why==='cloud')o=preserveLocalHealth(o);S=migrate(o);H=JSON.parse(JSON.stringify(S.healthArchive));S.mt=S.mt||1;persist();toast(why==='cloud'?'Loaded newer data from cloud':why==='device'?'Restored your data on this device':'Restore point loaded');if(!$('#sheet')&&!document.activeElement.matches('input,textarea,select'))render()}
function data(){$('#title').textContent='More';$('#sub').textContent='Memory & settings';const stamp=ymd();const g=S.goals;const s=Store.status();
 $('#view').innerHTML=`<h2 style="margin-top:6px">Training settings</h2><div class="card"><button class="plan-link" data-go="program">${esc(TEMPLATES[S.plan.tpl]?.name||'Custom program')} · ${WorkoutPlan.lengths[S.plan.length].name} ›</button><div class="mu sm">Switch workout styles, choose shorter sessions, and preview your plan.</div></div><h2>Memory</h2><div class="card"><div class="kv"><span>Device storage</span><span class="${s.device==='error'?'err':'ok'}">${s.device==='saved'?'Saved':s.device==='saving'?'Saving…':'Save failed'}</span></div>
 <div class="kv"><span>Protected from auto-clearing</span><span>${s.persisted?'<span class="ok">Yes</span>':'Not guaranteed'}</span></div>
 <div class="kv"><span>Stored</span><span>${S.sessions.length} workouts · ${S.acts.length} activities · ${S.body.weights.length} weigh-ins · ${Object.keys(S.hlog).length} habit days</span></div>
 <div class="k" style="margin-top:12px">Daily restore points</div><div class="row" style="margin-top:6px"><select id="snapSel" style="flex:1;min-width:0"><option>Loading…</option></select><button id="snapGo">Restore</button></div>
 <div class="mu sm" style="margin-top:6px">${esc(s.deviceMessage)}. When device storage is available, daily restore points are kept for 30 days. Export a backup before changing devices or clearing browser data.</div></div>
 <h2>Cloud sync</h2><div class="card">${s.linked?`<div class="kv"><span>Status</span><span class="${s.cloud==='error'?'err':s.cloud==='ok'?'ok':''}">${s.cloud==='syncing'?'Syncing…':s.cloud==='error'?esc(s.msg):s.cloud==='offline'?'Offline, will sync later':s.cloud==='pending'?'Connection not verified yet':'Synced '+ago(s.last)}</span></div>
 <div class="kv"><span>Where</span><span><a href="https://gist.github.com/${esc(s.gistId)}" target="_blank" rel="noopener">Your secret gist</a></span></div>
 <div class="row" style="margin-top:10px"><button id="syNow" style="flex:1">Sync now</button><button class="danger" id="syOff">Disconnect</button></div>
 <div class="mu sm" style="margin-top:8px">Syncs automatically after every change and whenever you open the app. Newest copy wins; the other is kept as a restore point. GitHub also keeps every past revision.</div>`
 :`<div class="mu sm">Optionally keep an off-device copy in a secret GitHub Gist. It is unlisted, but anyone with its link can read it. This is not access-controlled private storage.</div>
 <div class="mu sm" style="margin-top:8px">1. On GitHub: Settings › Developer settings › <a href="https://github.com/settings/tokens/new?scopes=gist&description=Lift%20app%20sync" target="_blank" rel="noopener">create a token</a> with only the <b>gist</b> scope.<br>2. Paste it here.</div>
 <div class="row" style="margin-top:10px"><input id="syTok" type="password" autocomplete="off" placeholder="ghp_…" style="flex:1;min-width:0"><button id="syOn">Connect</button></div><div class="sm err" id="syMsg" style="margin-top:6px"></div>`}</div>
 <h2>Apple Health connection</h2>${healthSyncCard()}<h2>Health history</h2><div class="card"><div class="mu sm">${S.healthArchive.days.length} Health days saved on this device (up to 365). New workouts keep a snapshot of their health context. JSON exports include these readings.</div><label class="row" style="margin-top:10px"><input id="syncHealth" type="checkbox" ${S.settings.syncHealth?'checked':''}> Include imported Health readings and workout health snapshots in Gist sync</label><p class="mu sm">Off by default. Anyone with the Gist link can read included data. Turning this off stops future inclusion; it does not remove older Gist revisions. Workout logs, notes, and other app data are included whenever Gist sync is connected.</p></div>
 <h2>Reminders</h2><div class="card"><div class="mu sm">Phone alerts for gym time, wind-down and your morning stack, delivered by your Calendar so they arrive even when Lift is closed.</div><button id="remGo" style="width:100%;margin-top:10px">Set up reminders</button></div>
 <h2>How your scores work</h2><div class="card" style="padding:2px 14px">${[['sleep','Sleep'],['rec','Recovery'],['strain','Strain'],['debt','Sleep debt'],['cons','Bedtime consistency'],['streak','Streaks']].map(([k,l])=>`<button class="kv linkrow" data-ex="${k}"><span>${l}</span><span>›</span></button>`).join('')}</div>
 <h2>AI food logging</h2><div class="card">${aiKey()?`<div class="kv"><span>Claude API key</span><span class="ok">Saved on this phone</span></div><button class="danger" id="aiOff" style="width:100%;margin-top:8px">Remove key</button>`:`<div class="mu sm">Describe a meal or snap a photo and Claude estimates calories and macros. It runs on your own Anthropic API key (<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">create one</a>); each estimate is billed to that key and costs a fraction of a cent to about a cent.</div><div class="row" style="margin-top:10px"><input id="aiK" type="password" autocomplete="off" placeholder="sk-ant-…" style="flex:1;min-width:0"><button id="aiOn">Save</button></div>`}<div class="mu sm" style="margin-top:8px">The key is stored only on this device and is never included in backups or cloud sync.</div></div>
 <h2>Goals</h2><div class="card"><div class="f" style="grid-template-columns:repeat(4,1fr)"><label>Lifts / wk<input data-g="lifts" type="number" inputmode="numeric" value="${g.lifts}"></label><label>Protein g<input data-g="protein" type="number" inputmode="numeric" value="${g.protein}"></label><label>Calories<input data-g="kcal" type="number" inputmode="numeric" value="${g.kcal}"></label><label>Steps<input data-g="steps" type="number" inputmode="numeric" value="${g.steps}"></label>
 <label>Sleep h<input data-g="sleep" type="number" inputmode="decimal" step="0.25" value="${g.sleep}"></label><label style="grid-column:span 1">Gain lo<input data-g="gainLo" type="number" inputmode="decimal" step="0.05" value="${g.gainLo}"></label><label>Gain hi<input data-g="gainHi" type="number" inputmode="decimal" step="0.05" value="${g.gainHi}"></label><label>Bedtime<input data-g="bed" type="time" value="${g.bed}" style="padding:0 4px"></label></div>
 <button id="gSave" style="width:100%;margin-top:10px">Save goals</button><div class="mu sm" style="margin-top:6px">Gain = target lb per week. Every score, ring and habit uses these.</div></div>
 <h2>Backup files</h2><div class="card"><div class="row wrap"><button id="xj">Export JSON</button><button id="xc">Workouts CSV</button><button id="cp">Copy CSV</button><button id="xh">Habits CSV</button></div>
 <div class="k" style="margin-top:14px">Import JSON</div><div class="mu sm">Replaces all data on this device.</div><input type="file" id="imp" accept=".json,application/json" style="margin-top:8px;width:100%;padding-top:10px"></div>
 <button class="danger" id="wipe" style="width:100%;margin-top:14px">Erase all workouts</button><div class="mu sm" style="margin-top:14px;text-align:center">Lift v16</div>`;
 Store.snaps().then(l=>{const sel=$('#snapSel');if(!sel||view!=='data')return;sel.innerHTML=l.length?l.map(x=>`<option value="${x.key}">${x.key==='before-restore'?'Before last restore/sync':fmtD(ymdToT(x.key))} · ${x.n} workouts</option>`).join(''):'<option value="">None yet</option>'});
 $('#snapGo').onclick=()=>{const k=$('#snapSel').value;if(!k)return;if(confirm('Replace the data on this device with this restore point? Your current data is kept as "Before last restore".'))Store.restore(k).catch(e=>alert(e.message))};
 if(s.linked){$('#syNow').onclick=()=>Store.sync();$('#syOff').onclick=()=>{if(confirm('Stop syncing? Data stays on this device and in your gist.'))Store.disconnect()}}
 else $('#syOn').onclick=async()=>{const b=$('#syOn');b.disabled=true;b.textContent='Connecting…';try{const r=await Store.connect($('#syTok').value);
   if(r.remote){const useCloud=confirm(`Found a cloud backup with ${r.remote.sessions.length} workouts (saved ${r.remote.mt>1?new Date(r.remote.mt).toLocaleString():'earlier'}).\n\nOK = load the cloud backup onto this device\nCancel = keep this device's data and overwrite the cloud`);await Store.sync(useCloud?'pull':'push')}
   toast('Cloud sync is on')}catch(e){const m=$('#syMsg');if(m)m.textContent=e.message;const b2=$('#syOn');if(b2){b2.disabled=false;b2.textContent='Connect'}}};
 $('#syncHealth').onchange=e=>{if(e.target.checked&&!confirm('Include your imported Health history and workout health snapshots in future Gist backups? Anyone with the Gist link can read them, including older revisions.')){e.target.checked=false;return}S.settings.syncHealth=e.target.checked;save()};
 $('#remGo').onclick=remindSheet;
 if($('#aiOn'))$('#aiOn').onclick=()=>{const k=$('#aiK').value.trim();if(k){localStorage.setItem(AIK,k);toast('AI food logging is on');data()}};if($('#aiOff'))$('#aiOff').onclick=()=>{localStorage.removeItem(AIK);data()};
 $('#gSave').onclick=()=>{document.querySelectorAll('[data-g]').forEach(i=>{const k=i.dataset.g;if(k==='bed'){if(/^\d\d:\d\d$/.test(i.value))g.bed=i.value}else{const v=+i.value;if(i.value!==''&&v>0)g[k]=k==='lifts'?Math.min(7,Math.round(v)):v}});if(g.gainLo>g.gainHi)[g.gainLo,g.gainHi]=[g.gainHi,g.gainLo];save();toast('Goals saved');data()};
 $('#xj').onclick=()=>dl(`lift-backup-${stamp}.json`,JSON.stringify(S,null,1),'application/json');
 $('#xc').onclick=()=>dl(`lift-${stamp}.csv`,toCSV(),'text/csv');
 $('#xh').onclick=()=>dl(`lift-habits-${stamp}.csv`,habitsCSV(),'text/csv');
 $('#cp').onclick=async()=>{try{await navigator.clipboard.writeText(toCSV());toast('CSV copied')}catch(e){alert('Copy failed')}};
 $('#imp').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const o=JSON.parse(t);if(!o.days||!o.sessions)throw 0;if(!confirm('Replace all data with this backup?'))return;S=migrate(o);H=JSON.parse(JSON.stringify(S.healthArchive));save();alert('Imported '+o.sessions.length+' workouts');go('today')}catch(_){alert('Invalid backup file')}})};
 $('#wipe').onclick=()=>{if(confirm('Erase ALL logged workouts? Program is kept.')){S.sessions=[];S.active=null;save();go('today')}}}

// ===== v3 additions =====
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
const ymd=(t=Date.now())=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dayMs=864e5;const ymdToT=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d).getTime()};
const addDays=(s,n)=>{const d=new Date(ymdToT(s));d.setDate(d.getDate()+n);return ymd(d)};
const fmtN=n=>Math.round(n).toLocaleString();
// sheets
function openSheet(html){closeSheet();const bg=document.createElement('div');bg.className='sheetbg';bg.id='sbg';const sh=document.createElement('div');sh.className='sheet';sh.id='sheet';sh.innerHTML='<div class="grab"></div>'+html;bg.onclick=closeSheet;document.body.append(bg,sh);document.documentElement.classList.add('lock');fitSheet();return sh}
function closeSheet(){const a=$('#sheet'),b=$('#sbg');if(a)a.remove();if(b)b.remove();document.documentElement.classList.remove('lock')}
// keep the sheet above the on-screen keyboard
function fitSheet(){const sh=$('#sheet'),vv=window.visualViewport;if(!sh||!vv)return;const kb=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);sh.style.bottom=kb+'px';sh.style.maxHeight=Math.round(vv.height*.9)+'px'}
if(window.visualViewport){visualViewport.addEventListener('resize',fitSheet);visualViewport.addEventListener('scroll',fitSheet)}
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
function warmups(e,t){const g=liftGuidance(e);if(g.progressionKind!=='load'||e.autoLoadProgression===false)return '<div class="warm">Warm-up: use a few easy practice reps or an easier variation. Keep them well short of failure; assistance is not resistance.</div>';const w=+((t.sets[0]||{}).w)||+((e.sets[0]||{}).w)||0;if(w<20)return`<div class="warm">Warm-up: 1–2 light sets of 10–12 before your first working set.</div>`;
 const rd=x=>Math.round(x/5)*5;let L=[];
 if(TrainingCoach.equipment(e).equipment==='barbell'){L=[[45,10]];for(const[p,r]of[[.5,8],[.7,5],[.85,3]]){const v=rd(w*p);if(v>45&&v<w)L.push([v,r])}}
 else for(const[p,r]of(TrainingCoach.equipment(e).equipment==='dumbbell'?[[.5,10],[.75,5]]:[[.5,10],[.7,6],[.85,3]])){const v=rd(w*p);if(v>0&&v<w)L.push([v,r])}
 return`<div class="warm">Warm-up: ${L.map(([v,r])=>`${v}×${r}`).join(' → ')} <span class="mu sm">(don't log)</span></div>`}
// plate / dumbbell helper
function plates(total,bar=45){let side=(total-bar)/2;const out=[];if(side<0)return null;for(const p of[45,35,25,10,5,2.5])while(side>=p-1e-9){out.push(p);side=r1(side-p)}return{out,rem:r1(side)}}
function plateSheet(name,w,setup){if(setup&&(!['dumbbell','barbell'].includes(setup.equipment)||(setup.equipment==='dumbbell'&&setup.basis!=='per-hand')||(setup.equipment==='barbell'&&setup.basis!=='total'))){toast('The helper needs barbell total weight or dumbbell weight per hand. Check your setup.');return}const db=setup?setup.equipment==='dumbbell':isDB(name);openSheet(`<h3>${esc(name)}</h3><div class="mu sm">${db?'Dumbbell helper (weight per hand)':'Plate helper (45 lb bar)'}</div>
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
  const prev=bestE1(e,W.id),cur=Math.max(...d.map(s=>e1rm(+s.w,+s.r)));if(prev>0&&cur>prev)prs.push({name:e.name,e:r1(cur),prev:r1(prev)})}
 return{name:W.dayName,dur:Math.max(1,Math.round(((W.end||Date.now())-W.date)/60000)),vol,sets,mus,prs}}
function summarySheet(m){openSheet(`<div class="k">Workout complete</div><h1 style="font-size:28px">${esc(m.name)}</h1>
 <div class="grid3" style="margin:14px 0"><div><div class="k">Time</div><div class="stat">${m.dur}<span class="mu sm"> min</span></div></div><div><div class="k">Volume</div><div class="stat">${fmtN(m.vol)}<span class="mu sm"> lb</span></div></div><div><div class="k">Sets</div><div class="stat">${m.sets}</div></div></div>
 <div class="k">PRs (est. 1RM)</div>${m.prs.length?m.prs.map(p=>`<div class="row sp" style="margin:6px 0"><span><span class="badge" style="margin:0 6px 0 0">PR</span>${esc(p.name)}</span><span class="num">${p.e} <span class="mu sm">was ${p.prev}</span></span></div>`).join(''):'<div class="mu sm" style="margin:6px 0">None this time. Consistency builds them.</div>'}
 <div class="k" style="margin-top:12px">Sets per muscle</div>${Object.entries(m.mus).map(([k,n])=>`<div class="row" style="margin-top:6px"><span class="sm" style="width:96px">${k}</span><div class="bar"><i style="width:${Math.min(100,n/8*100)}%"></i></div><span class="num" style="width:24px;text-align:right">${n}</span></div>`).join('')}
 <button class="big" id="sdone" style="margin-top:18px">Done</button>`);$('#sdone').onclick=closeSheet}
// ----- health.json -----
let H=JSON.parse(JSON.stringify(S.healthArchive));
const HealthFeed=HealthSync.create({fetcher:(url,options)=>fetch(url,options),onStatus:refreshHealthUI});
async function loadHealth(options={}){if(!storageReady)return;const j=await HealthFeed.refresh({url:'health.json?t='+Date.now(),force:options.force===true});if(!j)return;const merged=mergeHealthArchive(S.healthArchive,j),sig=JSON.stringify(merged);if(sig===JSON.stringify(S.healthArchive)){refreshHealthUI();return}S.healthArchive=merged;H=JSON.parse(sig);persist();if(['today','body','home','sleep','vitals','habits','progress'].includes(view)&&!$('#sheet')&&!document.activeElement.matches('input,textarea,select'))render();else refreshHealthUI()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadHealth({force:true})});
window.addEventListener('online',()=>loadHealth({force:true}));
window.addEventListener('pageshow',()=>loadHealth({force:true}));
const hDay=d=>H.days.find(x=>x.date===d)||null;
const hasHealth=()=>H.days.length>0;
const num=v=>typeof v==='number'&&isFinite(v)?v:null;
function healthChip(){return `<button class="chip" data-health-setup="1">Health · ${H.updated?'export '+esc(ago(Date.parse(H.updated))):'connect'}</button>`}
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
const foodTot=d=>foodDay(d).reduce((a,x)=>({p:a.p+(+x.p||0),k:a.k+(+x.k||0),c:a.c+(+x.c||0),f:a.f+(+x.f||0)}),{p:0,k:0,c:0,f:0});
function addFood(p,k,label){const d=ymd();(S.food[d]=S.food[d]||[]).push({t:Date.now(),p,k,label});save()}
// ----- rings -----
let ringN=0;
function rings(list,size=150,sw=16){const c=size/2;let h=`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs>`;const id='r'+(ringN++);
 list.forEach((r,i)=>h+=`<linearGradient id="${id}${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r.c[0]}"/><stop offset="1" stop-color="${r.c[1]}"/></linearGradient>`);h+='</defs>';
 list.forEach((r,i)=>{const rad=c-sw/2-i*(sw+3);const L=2*Math.PI*rad;const f=Math.max(0,Math.min(1,(r.v||0)/r.max));
  h+=`<circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${r.c[0]}" stroke-opacity=".2" stroke-width="${sw}"/><circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="url(#${id}${i})" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L*(1-f)}" transform="rotate(-90 ${c} ${c})" data-ring="${r.k||''}"/>`});
 return h+'</svg>'}
const RC={lift:['#ff2d55','#ff6a3d'],pro:['#19e3b1','#b4f000'],steps:['#2c9cff','#8fb4d9'],kcal:['#ff9f0a','#ffd60a']};
// ----- readiness, streak, recap -----
function lastLiftDays(){const s=sorted();if(!s.length)return null;return Math.round((ymdToT(ymd())-ymdToT(ymd(s[s.length-1].date)))/dayMs)}
function readiness(){const r=trainingReadiness();return{lvl:{ready:'hard',steady:'normal',easy:'light',unknown:'normal'}[r.level],label:r.label,why:r.reasons}}
function readyPill(){const r=readiness();return`<span class="ready ${r.lvl}">● ${r.label}</span> <span class="mu sm">${esc(r.why.join(' · '))}</span>`}
function weekCount(ws){const we=new Date(ws);we.setDate(we.getDate()+7);return S.sessions.filter(s=>s.date>=ws&&s.date<we.getTime()).length}
function streak(){const g=S.goals.lifts;let n=0;let ws=weekStart();if(weekCount(ws)>=g)n++;for(let i=0;i<520;i++){const d=new Date(ws);d.setDate(d.getDate()-7);ws=d.getTime();if(weekCount(ws)>=g)n++;else break}return n}
function recap(){const t=ymd(),lo=addDays(t,-6),loT=ymdToT(lo);const ss=S.sessions.filter(s=>s.date>=loT);let vol=0,sets=0;for(const s of ss)for(const e of s.entries)for(const x of e.sets){sets++;vol+=(+x.w||0)*(+x.r||0)}
 const days=[...Array(7)].map((_,i)=>addDays(lo,i));const pr=days.map(d=>foodDay(d).length?foodTot(d).p:null).filter(x=>x!==null);const st=days.map(stepsFor).filter(x=>x!==null);const sl=days.map(sleepFor).filter(x=>x!==null);
 const ser=withMA(weightSeries());const now=ser[ser.length-1];const then=[...ser].reverse().find(p=>p.date<=addDays(t,-7));
 return{n:ss.length,vol,sets,pro:pr.length?pr.reduce((a,b)=>a+b)/pr.length:null,steps:st.length?st.reduce((a,b)=>a+b)/st.length:null,sleep:sl.length?sl.reduce((a,b)=>a+b)/sl.length:null,dw:now&&then?now.ma-then.ma:null}}
// ----- OVERVIEW -----
let ovDate=null; // null = latest day that has recovery/sleep data (Health usually lands the next morning)
function autoDay(){const t=ymd();for(let i=0;i<3;i++){const d=addDays(t,-i);if(recovery(d)||sleepRec(d).hours!==null)return d}return t}
function dayLabel(d){const t=ymd();return d===t?'Today':d===addDays(t,-1)?'Yesterday':new Date(ymdToT(d)).toLocaleDateString(undefined,{weekday:'long'})}
function dialSvg(pct,col,sw=7){const r=50-sw/2,L=2*Math.PI*r,f=Math.max(0,Math.min(1,(pct||0)/100));
 return`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="${sw}"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L*(1-f)}" transform="rotate(-90 50 50)"/></svg>`}
function dial(k,label,v,col,sub){return`<button class="dial" data-dial="${k}" style="--c:${col}"><div class="dw">${dialSvg(v,col)}<div class="dv"><b>${v===null?'—':v}</b>${v===null||k==='strain'?'':'<i>%</i>'}</div></div><span class="dl">${label}</span><span class="ds">${sub||'&nbsp;'}</span></button>`}
function vsBase(key,d,v,dir){const b=baseAt(key,d);if(v===null||!b||!b.mu)return'<span class="dlt">&nbsp;</span>';const p=(v-b.mu)/b.mu*100;if(Math.abs(p)<1)return'<span class="dlt">at baseline</span>';const good=dir===0?null:(p>0)===(dir>0);return`<span class="dlt ${good===null?'':good?'up':'dn'}">${p>0?'▲':'▼'} ${Math.abs(Math.round(p))}% vs 30d</span>`}
function stackMini(d){return STACKS.map(([k,l])=>{const hs=S.habits.filter(h=>h.stack===k);if(!hs.length)return'';return`<div class="smrow"><span class="k">${l}</span><div class="smn" style="--c:${STC[k]}">${hs.map(h=>{const v=hv(h,d);return`<i class="${hit(h,v)&&v>=1?'on':v>0?'half':''}"></i>`}).join('')}</div></div>`}).join('')}
function today(){const g=S.goals,t=ymd(),D=ovDate||autoDay();
 $('#title').textContent='Overview';$('#sub').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});$('#topRight').innerHTML=syncChip();
 const rec=recovery(D),sp=sleepPerf(D),stn=strain(D),sr=sleepRec(D),h=hDay(D)||{},steps=stepsFor(D);
 const n=weekCount(weekStart()),ft=foodTot(t),nd=plannedDay(nextDay()),ser=withMA(weightSeries()),lw=ser[ser.length-1],rate=weeklyRate(),rc=recap(),stk=streak(),m=S.manual[t]||{},ds=dayStack(t),ss=stackStreak();
 const hsync=H.updated&&!isNaN(new Date(H.updated))?'Health export '+ago(new Date(H.updated).getTime()):'No Health data yet';
 const vt=(l,val,unit,dl)=>`<div><div class="k">${l}</div><div class="stat">${val===null?'—':val}${val===null?'':`<small>${unit}</small>`}</div>${dl}</div>`;
 $('#view').innerHTML=`<div class="daybar"><button id="dPrev" aria-label="Previous day">‹</button><div><div class="dayname">${dayLabel(D)}</div><div class="mu sm" style="text-align:center">${new Date(ymdToT(D)).toLocaleDateString(undefined,{month:'short',day:'numeric'})} · ${hsync}</div></div><button id="dNext" aria-label="Next day" ${D>=t?'disabled':''}>›</button></div>
 <div class="dials">${dial('sleep','Sleep',sp,'var(--sleep)',sr.hours===null?'no data':hm(sr.hours))}${dial('rec','Recovery',rec?rec.score:null,rec?BAND[rec.band]:'var(--mu)',rec?{g:'primed',y:'steady',r:'run down'}[rec.band]:'no data')}${dial('strain','Strain',stn?stn.score:null,'var(--strain)',stn?stn.label.toLowerCase():'no data')}</div>
 <div class="card vit">${vt('HRV',num(h.hrv)===null?null:Math.round(h.hrv),'ms',vsBase('hrv',D,num(h.hrv),1))}${vt('Resting HR',num(h.restingHR)===null?null:Math.round(h.restingHR),'bpm',vsBase('restingHR',D,num(h.restingHR),-1))}${vt('Sleep',sr.hours===null?null:r1(sr.hours),'h',`<span class="dlt">need ${g.sleep} h</span>`)}
 ${vt('Steps',steps===null?null:fmtN(steps),'',`<span class="dlt ${steps!==null&&steps>=g.steps?'up':''}">goal ${fmtN(g.steps)}</span>`)}${vt('Active',num(h.activeKcal)===null?null:fmtN(h.activeKcal),'kcal',vsBase('activeKcal',D,num(h.activeKcal),1))}${vt('Lifts',n+'/'+g.lifts,'wk',`<span class="dlt ${stk?'up':''}">${stk?stk+'-week streak':'this week'}</span>`)}</div>
 ${healthSyncCard()}
  ${coachHTML()}
 <h2>Today’s plan</h2><div class="card">${S.active?`<div class="k">In progress</div><div class="hero">${esc(S.active.dayName)}</div><button class="big" id="tStart" style="margin-top:12px">Resume workout</button>`:
  `<div class="k">Suggested workout</div><div class="hero">${esc(nd?nd.name:'—')}</div><div class="mu sm">${nd?workoutEstimate(nd)+' · '+nd.exercises.slice(0,3).map(e=>esc(e.name)).join(', ')+'…':''}</div>
  <div style="margin-top:10px">${readyPill()}</div><button class="big" id="tStart" style="margin-top:14px">Start ${esc(nd?nd.name:'workout')}</button>`}</div>
 <div class="card linkcard" id="tHab"><div class="row sp"><div class="k">Habit stack</div><span class="num"><b style="font:700 20px/1 var(--num)">${ds.hit}</b><span class="mu sm"> / ${ds.n} today${ss?' · '+ss+'-day streak':''}</span></span></div>${stackMini(t)}</div>
 ${fuelHTML(t)}
 <h2>Body</h2><div class="card" id="tBody"><div class="row sp"><div><div class="k">Weight</div><div class="stat">${lw?r1(lw.lb)+'<span class="mu sm"> lb</span>':'—'}</div><div class="mu sm">${lw?`7-day avg ${r1(lw.ma)} · ${lw.date===t?'today':fmtD(ymdToT(lw.date))}`:'No weigh-ins yet'}</div></div>
 <div style="text-align:right"><div class="k">Trend</div><div class="stat" style="font-size:20px">${rate===null?'—':(rate>=0?'+':'')+r1(rate)+' lb/wk'}</div><div class="mu sm">goal +${g.gainLo}–${g.gainHi}</div></div></div>
 <button style="width:100%;margin-top:12px" id="tW">${lw&&lw.date===t?'Update weigh-in':'Log weigh-in'}</button></div>
 <h2>Last 7 days</h2><div class="card vit" id="recap">${vt('Workouts',rc.n,'','')}${vt('Volume',fmtN(rc.vol),'lb',`<span class="dlt">${rc.sets} sets</span>`)}${vt('Weight',rc.dw===null?null:(rc.dw>=0?'+':'')+r1(rc.dw),'lb','<span class="dlt">7-day avg</span>')}
 ${vt('Avg protein',rc.pro===null?null:Math.round(rc.pro),'g','')}${vt('Avg steps',rc.steps===null?null:fmtN(rc.steps),'','')}${vt('Avg sleep',rc.sleep===null?null:r1(rc.sleep),'h','')}</div>
 <h2>Log manually</h2><div class="card"><div class="f" style="grid-template-columns:1fr 1fr auto;align-items:end;margin-top:0"><label>Steps today<input id="mSteps" type="number" inputmode="numeric" value="${num(m.steps)??''}" placeholder="${stepsFor(t)??'0'}"></label><label>Sleep h<input id="mSleep" type="number" inputmode="decimal" step="0.1" value="${num(m.sleep)??''}" placeholder="7.5"></label><button id="mSave">Save</button></div><div class="mu sm" style="margin-top:6px">Manual values override Health for today.</div></div>`;
 $('#dPrev').onclick=()=>{ovDate=addDays(D,-1);today()};$('#dNext').onclick=()=>{const x=addDays(D,1);ovDate=x>=t&&autoDay()===t?null:x;today()};
 document.querySelectorAll('[data-dial]').forEach(b=>b.onclick=()=>explain(b.dataset.dial,D));
 $('#tStart').onclick=()=>{if(S.active)go('workout');else startWorkout(nd)};$('#tHab').onclick=()=>go('habits');
 $('#tW').onclick=()=>go('body');
 bindFuel(today);document.querySelectorAll('[data-cgo]').forEach(b=>b.onclick=()=>b.dataset.cgo==='food'?foodSheet(today):go(b.dataset.cgo));
 $('#mSave').onclick=()=>{const st=$('#mSteps').value,sp=$('#mSleep').value;const o=Object.assign({},S.manual[t]||{});delete o.steps;if(st!=='')o.steps=Math.max(0,+st);if(sp!==''){if(+sp!==o.sleep){o.sleep=Math.max(0,+sp);delete o.bed;delete o.wake}}else{delete o.sleep;delete o.bed;delete o.wake;delete o.score}if(Object.keys(o).length)S.manual[t]=o;else delete S.manual[t];save();today()}}
function fmtBed(b){const[h,m]=b.split(':').map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
// ----- BODY -----
let measSel='arms';const MEAS=[['arms','Arms'],['chest','Chest'],['waist','Waist'],['shoulders','Shoulders']];
function body(){const g=S.goals;const d=ymd();$('#title').textContent='Health';$('#sub').textContent='Body';$('#topRight').innerHTML=renphoChip()||healthChip();
 const ser=withMA(weightSeries());const lw=ser[ser.length-1];const todayE=S.body.weights.find(w=>w.date===d);const def=todayE?todayE.lb:(lw?lw.lb:175);
 const rate=weeklyRate(weightSeries());const lm=S.body.meas.slice().sort((a,b)=>a.date<b.date?-1:1);const lastM=k=>{for(let i=lm.length-1;i>=0;i--)if(num(lm[i][k]))return lm[i][k];return null};
 const pos=v=>Math.max(0,Math.min(100,(v+0.5)/1.5*100));
 $('#view').innerHTML=healthSeg('body')+`<div class="card"><div class="k">${todayE?'Today’s weigh-in ✓':'Log today’s weigh-in'}</div>
 <div class="bigstep"><button data-ws="-0.2">−</button><input id="wIn" inputmode="decimal" value="${r1(def)}"><button data-ws="0.2">+</button></div><div class="mu sm" style="text-align:center;margin-top:-6px">lb</div>
 <div class="f" style="grid-template-columns:1fr auto;align-items:end"><label>Body fat % (optional)<input id="bfIn" type="number" inputmode="decimal" step="0.1" value="${todayE&&num(todayE.bf)!==null?todayE.bf:''}" placeholder="—"></label><button id="wSave" style="background:var(--btn);color:#00231a;border:0;padding:0 26px">Save</button></div></div>
 <div class="card"><div class="row sp"><div class="k">Weight</div><span class="mu sm">${ser.length} entries</span></div><canvas id="wch" width="700" height="400"></canvas>
 <div class="row sm" style="gap:14px"><span style="color:#8fb4d9">● daily</span><span style="color:#ff5a6e">● 7-day avg</span><span class="mu">${lw?'avg '+r1(lw.ma)+' lb':''}</span></div></div>
 <div class="card"><div class="row sp"><div class="k">Weekly rate</div><b class="num" id="rate">${rate===null?'—':(rate>=0?'+':'')+r1(rate)+' lb/wk'}</b></div>
 <div style="position:relative;height:14px;border-radius:7px;background:var(--glass2);margin:14px 0 4px"><div style="position:absolute;top:0;bottom:0;left:${pos(g.gainLo)}%;width:${pos(g.gainHi)-pos(g.gainLo)}%;background:rgba(25,227,177,.45);border-radius:7px"></div>${rate===null?'':`<div style="position:absolute;top:-4px;width:6px;height:22px;border-radius:3px;background:var(--tx);left:calc(${pos(rate)}% - 3px);box-shadow:0 0 8px rgba(0,0,0,.4)"></div>`}</div>
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
 lineChart($('#wch'),ser.slice(-90).map(p=>({t:ymdToT(p.date),a:p.lb,b:p.ma})),['#8fb4d9','#ff5a6e'],'No weigh-ins yet');
 drawLF();lineChart($('#mch'),lm.filter(x=>num(x[measSel])).map(x=>({t:ymdToT(x.date),a:x[measSel]})),['#8fb4d9'],'No '+measSel+' measurements yet')}
function lineChart(c,pts,cols,empty,band){const x=c.getContext('2d');const W=c.width,Hh=c.height,p=46;x.clearRect(0,0,W,Hh);x.font='22px -apple-system,Inter,sans-serif';x.fillStyle=cssv('--mu');
 if(!pts.length){x.fillText(empty,p,Hh/2);return}const vs=pts.flatMap(q=>[q.a,q.b].filter(v=>v!=null)).concat(band?[band.lo,band.hi]:[]);let lo=Math.min(...vs),hi=Math.max(...vs);if(hi-lo<2){lo-=1;hi+=1}const pad=(hi-lo)*.1;lo-=pad;hi+=pad;
 const t0=pts[0].t,t1=pts[pts.length-1].t;const X=t=>t1===t0?W/2:p+(t-t0)/(t1-t0)*(W-p-14),Y=v=>Hh-28-(v-lo)/(hi-lo)*(Hh-46);
 x.strokeStyle=cssv('--grid');x.lineWidth=1;for(let k=0;k<=3;k++){const v=lo+(hi-lo)*k/3;x.beginPath();x.moveTo(p,Y(v));x.lineTo(W-6,Y(v));x.stroke();x.fillText(r1(v),0,Y(v)+7)}
 if(band){x.fillStyle='rgba(25,227,177,.16)';if(cols[0]==='#ff5a6e')x.fillStyle='rgba(255,90,110,.14)';x.fillRect(p,Y(band.hi),W-p-6,Y(band.lo)-Y(band.hi));x.fillStyle=cssv('--mu')}
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
// shortfall vs your sleep need over the last 7 nights; nights above need pay it back, untracked nights are ignored
function sleepDebt(){const ns=sleepNights(7).filter(x=>x.hours!==null);return{debt:Math.max(0,ns.reduce((a,x)=>a+(S.goals.sleep-x.hours),0)),n:ns.length,nights:ns}}
function consistency(){const N=sleepNights(14);const sdOf=v=>{if(v.length<3)return null;const mu=v.reduce((a,b)=>a+b)/v.length;return{mu,sd:Math.sqrt(v.reduce((a,b)=>a+(b-mu)**2,0)/v.length)}};
 const B=sdOf(N.map(x=>sinceNoon(tod(x.bed))).filter(x=>x!==null));if(!B)return null;const W=sdOf(N.map(x=>tod(x.wake)).filter(x=>x!==null));
 return{sd:B.sd,wsd:W?W.sd:null,wavg:W?W.mu:null,score:Math.max(0,Math.min(100,Math.round(100-B.sd))),avg:B.mu+720,n:N.filter(x=>x.bed).length,label:B.sd<=30?'Locked in':B.sd<=60?'Fairly steady':'Irregular'}}
function bedLate(bed){const b=sinceNoon(tod(bed)),t=sinceNoon(tod(S.goals.bed));return b===null?null:b-t}
function lastSleep(){for(let i=0;i<90;i++){const d=addDays(ymd(),-i);const r=sleepRec(d);if(r.hours!==null)return{date:d,...r}}return null}
function baseline(key,days=30){const v=H.days.filter(x=>x.date>=addDays(ymd(),-days)&&num(x[key])!==null).map(x=>x[key]);if(v.length<5)return null;const mu=v.reduce((a,b)=>a+b)/v.length;const sd=Math.sqrt(v.reduce((a,b)=>a+(b-mu)**2,0)/v.length);return{mu,lo:mu-sd,hi:mu+sd}}
let sleepRange=7;
function sleepView(){const g=S.goals;const d=ymd();$('#title').textContent='Health';$('#sub').textContent='Sleep';$('#topRight').innerHTML=healthChip();
 const L=lastSleep();const isToday=L&&L.date===d;const debt=sleepDebt();const con=consistency();const late=L?bedLate(L.bed):null;const m=S.manual[d]||{};
 const st=L&&[L.deep,L.rem,L.light,L.awake].some(x=>x!==null)?[['Deep',L.deep,'#5f7fb0'],['REM',L.rem,'#8fb4d9'],['Light',L.light,'#2c9cff'],['Awake',L.awake,'#ff9f0a']].filter(x=>x[1]!==null&&x[1]>0):null;const stT=st?st.reduce((a,x)=>a+x[1],0):0;
 const hrvB=baseline('hrv'),rhrB=baseline('restingHR');
 $('#view').innerHTML=healthSeg('sleep')+`<div class="card">${L?`<div class="row sp"><div class="k">${isToday?'Last night':'Latest night · '+fmtD(ymdToT(L.date))}</div><span class="mu sm">${L.src==='manual'?'manual':'Health'}</span></div>
 <div class="rings" style="margin-top:8px">${rings([{v:L.hours,max:g.sleep,c:['#5f7fb0','#8fb4d9']}],110,14)}<div class="legend"><div><div class="t" style="color:#8fb4d9">Asleep</div><b id="slH">${hm(L.hours)}</b> <span class="mu sm">/ ${g.sleep} h</span></div>
 ${L.score!==null?`<div><div class="t" style="color:var(--mu)">Watch score</div><b>${L.score}</b></div>`:''}<div><div class="t" style="color:var(--mu)">Bed → wake</div><b style="font-size:16px">${fmtMin(tod(L.bed))} → ${fmtMin(tod(L.wake))}</b></div></div></div>
 ${late===null?'':`<div style="margin-top:10px"><span class="ready ${late<=15?'hard':late<=60?'normal':'light'}" id="bedPill">● ${late<=15?'Bedtime on time':'Late by '+hm(late/60).replace('0h ','')}</span> <span class="mu sm">target ${fmtBed(g.bed)}</span></div>`}
 ${st?`<div class="k" style="margin-top:14px">Stages</div><div class="hyp">${st.map(x=>`<i style="flex:${x[1]};background:${x[2]}"></i>`).join('')}</div><div class="row wrap sm" style="gap:12px">${st.map(x=>`<span><span style="color:${x[2]}">●</span> ${x[0]} ${hm(x[1]/60)} <span class="mu">${Math.round(x[1]/stT*100)}%</span></span>`).join('')}</div>`:'<div class="mu sm" style="margin-top:10px">No stage data for this night.</div>'}`
 :`<div class="k">Sleep</div><div class="mu" style="margin-top:6px">No sleep data yet. It appears here once your watch syncs through Health, or log a night below.</div>`}</div>
 <div class="grid2"><div class="card"><div class="row sp"><div class="k">Sleep debt</div><button class="info" data-ex="debt">i</button></div><div class="stat" id="debt">${debt.n?hm(debt.debt):'—'}</div><div class="mu sm">${debt.n?`short of your ${g.sleep} h need over the last ${debt.n} tracked night${debt.n>1?'s':''}`:'no nights tracked'}</div></div>
 <div class="card"><div class="row sp"><div class="k">Bedtime</div><button class="info" data-ex="cons">i</button></div><div class="stat" id="cons">${con?'±'+Math.round(con.sd)+'<span class="mu sm"> min</span>':'—'}</div><div class="mu sm">${con?`${con.label} · usually ${fmtMin(con.avg)}${con.wsd!==null?' · wake ±'+Math.round(con.wsd)+' min':''}`:'needs 3+ nights'}</div></div></div>
 <div class="card"><div class="row sp"><div class="k">Duration</div><div class="seg" style="margin:0;width:120px"><button data-sr="7" class="${sleepRange===7?'on':''}">7d</button><button data-sr="30" class="${sleepRange===30?'on':''}">30d</button></div></div><canvas id="sch" width="700" height="360" style="height:180px"></canvas></div>
 ${hrvB||rhrB?`<div class="card"><div class="k">HRV · 30 days</div><canvas id="hrvch" width="700" height="300" style="height:150px"></canvas><div class="mu sm">${hrvB?`baseline ${Math.round(hrvB.mu)} ms (band = ±1 SD)`:'not enough HRV data'}</div>
 <div class="k" style="margin-top:12px">Resting HR · 30 days</div><canvas id="rhrch" width="700" height="300" style="height:150px"></canvas><div class="mu sm">${rhrB?`baseline ${Math.round(rhrB.mu)} bpm`:'not enough resting-HR data'}</div></div>`:''}
 <div class="card"><div class="k">Log last night manually</div><div class="mu sm">For nights you didn't wear the watch. Manual entries win over Health for that date.</div>
 <div class="f" style="grid-template-columns:1fr 1fr 1fr;align-items:end"><label>Bedtime<input id="sBed" type="time" value="${m.bed?String(m.bed).slice(11,16):''}"></label><label>Wake<input id="sWake" type="time" value="${m.wake?String(m.wake).slice(11,16):''}"></label><label>Score<input id="sScore" type="number" inputmode="numeric" value="${num(m.score)??''}" placeholder="opt."></label></div>
 <div class="row" style="margin-top:8px"><button id="sSave" style="flex:1;background:var(--btn);color:#00231a;border:0">Save night</button>${num(m.sleep)!==null?'<button class="danger" id="sClr">Clear</button>':''}</div><div class="mu sm" id="sMsg"></div></div>`;
 const V=$('#view');V.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.sr){sleepRange=+b.dataset.sr;return sleepView()}
  if(b.id==='sSave'){const bt=$('#sBed').value,wt=$('#sWake').value;if(!bt||!wt){$('#sMsg').textContent='Enter bedtime and wake time.';return}
   const bm=tod(bt),wm=tod(wt);let dur=wm-bm;if(dur<=0)dur+=1440;if(dur>16*60){$('#sMsg').textContent='That is over 16 h, check the times.';return}
   const bedDay=bm>=wm?addDays(d,-1):d;const o=Object.assign({},S.manual[d]||{},{sleep:r1(dur/60),bed:bedDay+'T'+bt+':00',wake:d+'T'+wt+':00'});const sc=$('#sScore').value;if(sc!=='')o.score=Math.max(0,Math.min(100,+sc));else delete o.score;S.manual[d]=o;save();return sleepView()}
  if(b.id==='sClr'){const o=S.manual[d];delete o.sleep;delete o.bed;delete o.wake;delete o.score;if(!Object.keys(o).length)delete S.manual[d];save();return sleepView()}};
 barChart($('#sch'),sleepNights(sleepRange).map(x=>({d:x.date,v:x.hours})),g.sleep);
 if($('#hrvch')){const hs=H.days.filter(x=>x.date>=addDays(d,-30));lineChart($('#hrvch'),hs.filter(x=>num(x.hrv)!==null).map(x=>({t:ymdToT(x.date),a:x.hrv})),['#19e3b1'],'No HRV data',hrvB);lineChart($('#rhrch'),hs.filter(x=>num(x.restingHR)!==null).map(x=>({t:ymdToT(x.date),a:x.restingHR})),['#ff5a6e'],'No resting-HR data',rhrB)}}
function barChart(c,pts,goal){const x=c.getContext('2d');const W=c.width,Hh=c.height,p=40,bot=30;x.clearRect(0,0,W,Hh);x.font='20px -apple-system,Inter,sans-serif';x.fillStyle=cssv('--mu');
 if(!pts.some(q=>q.v!==null)){x.fillText('No sleep data in this range',p,Hh/2);return}const mx=Math.max(10,...pts.map(q=>q.v||0));const Y=v=>Hh-bot-v/mx*(Hh-bot-12);const bw=(W-p-8)/pts.length;
 x.strokeStyle=cssv('--grid');for(const v of[0,4,8]){x.beginPath();x.moveTo(p,Y(v));x.lineTo(W,Y(v));x.stroke();x.fillText(v+'h',0,Y(v)+7)}
 pts.forEach((q,i)=>{const X=p+i*bw+bw*.18,w=bw*.64;if(q.v!==null){const gr=x.createLinearGradient(0,Y(q.v),0,Y(0));gr.addColorStop(0,q.v>=goal-.25?'#8fb4d9':'#5f7fb0');gr.addColorStop(1,'rgba(95,127,176,.35)');x.fillStyle=gr;const h=Y(0)-Y(q.v),r=Math.min(w/2,8);x.beginPath();x.roundRect?x.roundRect(X,Y(q.v),w,h,[r,r,2,2]):x.rect(X,Y(q.v),w,h);x.fill()}
  if(pts.length<=7||i%5===0){x.fillStyle=cssv('--mu');const l=pts.length<=7?new Date(ymdToT(q.d)).toLocaleDateString([],{weekday:'short'}):new Date(ymdToT(q.d)).getDate()+'';x.fillText(l,X,Hh-4)}});
 x.strokeStyle='#ff9f0a';x.setLineDash([8,6]);x.lineWidth=2;x.beginPath();x.moveTo(p,Y(goal));x.lineTo(W,Y(goal));x.stroke();x.setLineDash([])}
// composition
function compLatest(){const keys=['weightLb','bodyFatPct','leanMassLb','muscleMassLb','bmi','bodyWaterPct','visceralFat','bmr'];const o={};for(const k of keys)for(let i=H.days.length-1;i>=0;i--){const v=num(H.days[i][k]);if(v!==null){o[k]={v,date:H.days[i].date};break}}return o}
const hasRenpho=()=>H.days.some(x=>num(x.weightLb)!==null||num(x.bodyFatPct)!==null||num(x.leanMassLb)!==null);
function renphoChip(){if(!hasRenpho())return'';const t=new Date(H.updated);return`<span class="chip"><i style="background:#19e3b1"></i>Renpho · synced ${isNaN(t)?'':t.toLocaleDateString([],{month:'short',day:'numeric'})}</span>`}
function leanFatSeries(){const out=[];const hm_=new Map(H.days.map(x=>[x.date,x]));for(const p of weightSeries()){const h=hm_.get(p.date)||{};const bf=p.bf??num(h.bodyFatPct);const lean=p.src==='health'&&num(h.leanMassLb)!==null?h.leanMassLb:(bf!==null?p.lb*(1-bf/100):null);if(lean===null)continue;out.push({t:ymdToT(p.date),a:r1(lean),b:r1(p.lb-lean)})}return out}
function compHTML(){const c=compLatest();const F=[['weightLb','Weight','lb'],['bodyFatPct','Body fat','%'],['leanMassLb','Lean mass','lb'],['muscleMassLb','Muscle','lb'],['bmi','BMI',''],['bodyWaterPct','Water','%'],['visceralFat','Visceral fat',''],['bmr','BMR','kcal']].filter(f=>c[f[0]]);
 const lf=leanFatSeries();
 return(F.length?`<h2>Composition</h2><div class="grid3" id="comp">${F.map(([k,l,u])=>`<div class="card" style="margin:0;padding:12px"><div class="k">${l}</div><div class="stat" style="font-size:21px">${k==='bmr'?fmtN(c[k].v):r1(c[k].v)}<span class="mu sm"> ${u}</span></div><div class="mu sm">${fmtD(ymdToT(c[k].date)).replace(/^\w+, /,'')}</div></div>`).join('')}</div>`:
 `<div class="card"><div class="k">Renpho</div><div class="mu sm" style="margin-top:4px">No scale data synced yet. Turn on Renpho → Apple Health (Renpho app › Settings › Apple Health) and body composition will show up here.</div></div>`)+
 `<div class="card"><div class="row sp"><div class="k">Lean vs fat mass</div><span class="mu sm">${lf.length} pts</span></div><canvas id="lfch" width="700" height="360" style="height:180px"></canvas><div class="row sm" style="gap:14px"><span style="color:#19e3b1">● lean</span><span style="color:#ff9f0a">● fat</span><span class="mu">own scales · goal: lean ↑, fat flat</span></div></div>`}
function drawLF(){const c=$('#lfch');if(!c)return;const s=leanFatSeries();if(s.length<1){lineChart(c,[],['#19e3b1'],'Needs weigh-ins with body fat %');return}
 // two series on separate scales: draw lean, then fat overlay normalized
 const x=c.getContext('2d');const W=c.width,Hh=c.height,p=50;x.clearRect(0,0,W,Hh);x.font='20px -apple-system,Inter,sans-serif';
 const t0=s[0].t,t1=s[s.length-1].t;const X=t=>t1===t0?W/2:p+(t-t0)/(t1-t0)*(W-p*2);
 const sc=(k)=>{const v=s.map(q=>q[k]);let lo=Math.min(...v),hi=Math.max(...v);if(hi-lo<2){lo-=1;hi+=1}return v2=>Hh-30-(v2-lo)/(hi-lo)*(Hh-50)};const YL=sc('a'),YF=sc('b');
 x.fillStyle=cssv('--mu');x.fillText(r1(Math.max(...s.map(q=>q.a))),0,22);x.fillText(r1(Math.max(...s.map(q=>q.b))),W-44,22);
 for(const[k,Y,col]of[['a',YL,'#19e3b1'],['b',YF,'#ff9f0a']]){x.strokeStyle=col;x.fillStyle=col;x.lineWidth=4;x.beginPath();s.forEach((q,i)=>i?x.lineTo(X(q.t),Y(q[k])):x.moveTo(X(q.t),Y(q[k])));x.stroke();s.forEach(q=>{x.beginPath();x.arc(X(q.t),Y(q[k]),4,0,7);x.fill()})}}

// ===== v5: Consistency + meal prep savings =====
const HAB=[['meal','Meal prep','#19e3b1'],['lift','Workout','#ff5a6e'],['bed','Bed by goal','#5f7fb0'],['pro','Protein goal','#2c9cff']];
function mealDay(d){return S.meals[d]||{prep:0,out:[]}}
function setMeal(d,o){if(!o.prep&&!(o.out||[]).length)delete S.meals[d];else S.meals[d]=o;save()}
function habitDay(d){const m=S.meals[d];const lo=ymdToT(d),hi=ymdToT(addDays(d,1));const r={};
 r.meal=m?(m.prep||0)/2:null; // 0, .5, 1 ; null = not logged
 r.lift=S.sessions.some(s=>s.date>=lo&&s.date<hi)?1:0;
 const bed=sleepRec(d).bed;const late=bed?bedLate(bed):null;r.bed=late===null?null:(late<=0?1:0);
 const fd=S.food[d];r.pro=fd&&fd.length?(foodTot(d).p>=S.goals.protein?1:0):null;return r}
function habitStats(k,weeks=12){const t=ymd();const days=[];const start=addDays(ymd(weekStart()),-(weeks-1)*7);for(let d=start;d<=t;d=addDays(d,1))days.push({d,v:habitDay(d)[k]});
 const hit=x=>x.v!==null&&x.v>=(k==='meal'?.5:1);
 // lifts: rest days don't break streak if weekly goal pace; use "days with workout" counts & weekly streak
 let cur=0;for(let i=days.length-1;i>=0;i--){if(hit(days[i]))cur++;else if(i===days.length-1&&days[i].v===null)continue;else break}
 let best=0,run=0;for(const x of days){if(hit(x)){run++;best=Math.max(best,run)}else run=0}
 const pct=lo=>{const s=days.filter(x=>x.d>=lo);const n=k==='lift'?s.length:s.filter(x=>x.v!==null).length;const h=s.filter(hit).length;return{h,n,p:n?Math.round(h/n*100):null}};
 return{days,cur,best,week:pct(ymd(weekStart())),month:pct(t.slice(0,8)+'01'),start}}
function liftWeekStreak(){return streak()}
function savings(){const st=S.settings,per=Math.max(0,st.eatOutCost-st.prepCost);const t=ymd(),ws=ymd(weekStart()),ms=t.slice(0,8)+'01';const z=()=>({prep:0,saved:0,out:0,outN:0});const o={week:z(),month:z(),all:z(),per};
 for(const[d,m]of Object.entries(S.meals)){const pr=m.prep||0,out=(m.out||[]).reduce((a,x)=>a+(+x.amt||0),0),on=(m.out||[]).length;for(const[key,ok]of[['all',1],['month',d>=ms],['week',d>=ws]])if(ok){o[key].prep+=pr;o[key].saved+=pr*per;o[key].out+=out;o[key].outN+=on}}return o}
const $$=n=>'$'+(Math.round(n*100)/100).toLocaleString(undefined,{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});
function checkinHTML(d){const m=mealDay(d);const outT=(m.out||[]).reduce((a,x)=>a+(+x.amt||0),0);
 return`<div class="card ci"><div class="k">Meal prep today</div>
 <div class="ciRow"><button class="ciB ${m.prep>=1?'on':''}" data-prep="1"><span class="ciDot">${m.prep>=1?'✓':'1'}</span>Prepped meal</button><button class="ciB ${m.prep>=2?'on':''}" data-prep="2"><span class="ciDot">${m.prep>=2?'✓':'2'}</span>Prepped meal</button></div>
 <div class="f" style="grid-template-columns:1fr auto;align-items:end;margin-top:10px"><label>Ate out / ordered in · $ optional<input id="outAmt" type="number" inputmode="decimal" step="0.01" placeholder="e.g. ${S.settings.eatOutCost}"></label><button id="outAdd" class="ciOut">Ate out</button></div>
 <div class="row sp" style="margin-top:8px"><span class="mu sm">${(m.out||[]).length?`${m.out.length} eat-out logged today${outT?' · '+$$(outT):''}`:'No eat-out today'}</span>${(m.out||[]).length?'<button class="mini" id="outUndo">Undo</button>':''}</div></div>`}
function bindCheckin(d,re){const V=$('#view');V.querySelectorAll('[data-prep]').forEach(b=>b.onclick=()=>{const m=Object.assign({out:[]},mealDay(d));const n=+b.dataset.prep;m.prep=(m.prep||0)>=n?n-1:n;setMeal(d,m);if(navigator.vibrate)navigator.vibrate(10);re()});
 $('#outAdd').onclick=()=>{const m=Object.assign({prep:0},mealDay(d));const a=$('#outAmt').value;m.out=[...(m.out||[]),{t:Date.now(),amt:a===''?null:Math.max(0,+a)}];setMeal(d,m);re()};
 if($('#outUndo'))$('#outUndo').onclick=()=>{const m=Object.assign({},mealDay(d));m.out=(m.out||[]).slice(0,-1);setMeal(d,m);re()}}
function streaks(){$('#title').textContent='Habits';$('#sub').textContent='Meal prep & savings';
 const sv=savings(),st=S.settings;const goal=Math.max(1,14*sv.per);const pc=Math.min(1,sv.week.saved/goal);
 $('#view').innerHTML=habitSeg('streaks')+checkinHTML(ymd())+`<div class="card saveCard"><div class="k" style="color:var(--ac)">Saved vs eating out</div><div class="saveTop">${rings([{v:sv.week.saved,max:goal,c:['#19e3b1','#19e3b1']}],104,9)}<div><div class="bigNum">${$$(sv.week.saved)}</div><div class="mu sm">this week · ${sv.week.prep}/14 prepped meals</div><div class="mu sm">${Math.round(pc*100)}% of max weekly savings</div></div></div>
 <div class="grid3" style="margin-top:14px"><div><div class="k">This month</div><div class="stat" style="font-size:22px">${$$(sv.month.saved)}</div><div class="mu sm">${sv.month.prep} meals</div></div><div><div class="k">All-time</div><div class="stat" style="font-size:22px;color:var(--ac)">${$$(sv.all.saved)}</div><div class="mu sm">${sv.all.prep} meals</div></div><div><div class="k">Eat-out</div><div class="stat" style="font-size:22px;color:#ff9f0a">${$$(sv.month.out)}</div><div class="mu sm">month · ${sv.month.outN}×</div></div></div>
 <div class="mu sm" style="margin-top:8px">${$$(sv.per)} saved per prepped meal (${$$(st.eatOutCost)} eat-out − ${$$(st.prepCost)} prep)</div></div>
 <h2>Savings settings</h2><div class="card"><div class="f" style="grid-template-columns:1fr 1fr auto;align-items:end;margin-top:0"><label>Eat-out meal $<input id="sEO" type="number" inputmode="decimal" step="0.01" value="${st.eatOutCost}"></label><label>Prepped meal $<input id="sPC" type="number" inputmode="decimal" step="0.01" value="${st.prepCost}"></label><button id="sSave">Save</button></div></div>`;
 bindCheckin(ymd(),streaks);
 $('#sSave').onclick=()=>{const a=+$('#sEO').value,b=+$('#sPC').value;if(a>=0&&$('#sEO').value!=='')st.eatOutCost=a;if(b>=0&&$('#sPC').value!=='')st.prepCost=b;save();streaks()}}
function mealsCSV(){const t=ymd();const ds=new Set(Object.keys(S.meals));const st=habitStats('meal',12);st.days.forEach(x=>ds.add(x.d));const per=Math.max(0,S.settings.eatOutCost-S.settings.prepCost);
 const rows=[['date','prepped_meals','eat_out_count','eat_out_spend','saved','workout','bed_on_time','protein_hit']];for(const d of[...ds].filter(d=>d<=t).sort()){const m=mealDay(d),h=habitDay(d);if(!S.meals[d]&&!h.lift&&h.bed===null&&h.pro===null)continue;rows.push([d,m.prep||0,(m.out||[]).length,(m.out||[]).reduce((a,x)=>a+(+x.amt||0),0),r1((m.prep||0)*per),h.lift,h.bed??'',h.pro??''])}return rows.map(r=>r.join(',')).join('\n')}

// ===== v6: scores =====
// These are Lift's own simple formulas, built only from what health.json and your logs contain.
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
const BAND={g:'var(--good)',y:'var(--warn)',r:'var(--bad)'};
// mean/SD of a metric over the 30 days before d (needs 5+ readings)
function baseAt(key,d,days=30){return memo('b'+key+d+days,()=>{const lo=addDays(d,-days);const v=H.days.filter(x=>x.date>=lo&&x.date<d&&num(x[key])!==null).map(x=>x[key]);if(v.length<5)return null;const mu=avg(v);return{mu,sd:Math.sqrt(avg(v.map(x=>(x-mu)**2)))||1,n:v.length}})}
// Sleep: hours asleep as a share of your sleep goal
function sleepPerf(d){const h=sleepRec(d).hours;return h===null?null:Math.round(clamp(h/S.goals.sleep*100))}
// Recovery: HRV vs your 30-day baseline (50%), resting HR vs baseline (20%), sleep (30%).
// A normal day with a normal night lands near 60, so green (67+) means better than your usual. Needs HRV or resting HR.
function recovery(d){return memo('rec'+d,()=>{const h=hDay(d)||{};const parts=[];const o={};
 const hv_=num(h.hrv),hb=baseAt('hrv',d);if(hv_!==null&&hb){parts.push([.5,clamp(50+25*(hv_-hb.mu)/hb.sd)]);o.hrv={v:hv_,mu:hb.mu}}
 const rv=num(h.restingHR),rb=baseAt('restingHR',d);if(rv!==null&&rb){parts.push([.2,clamp(50-25*(rv-rb.mu)/rb.sd)]);o.rhr={v:rv,mu:rb.mu}}
 if(!parts.length)return null;
 const sp=sleepPerf(d);if(sp!==null){parts.push([.3,clamp(100-(100-sp)*3)]);o.sleep=sp}
 const w=parts.reduce((a,p)=>a+p[0],0);const score=Math.round(parts.reduce((a,p)=>a+p[0]*p[1],0)/w);
 return{score,band:score>=67?'g':score>=34?'y':'r',...o}})}
// Strain: active energy, steps and lifting sets, each with diminishing returns (0–100)
function strain(d){const h=hDay(d)||{};const k=num(h.activeKcal),st=stepsFor(d);const lo=ymdToT(d),hi=ymdToT(addDays(d,1));let sets=0;
 for(const s of S.sessions)if(s.date>=lo&&s.date<hi)for(const e of s.entries)sets+=e.sets.length;
 if(S.active&&S.active.date>=lo&&S.active.date<hi)for(const e of S.active.entries)sets+=e.sets.filter(x=>x.done).length;
 const A=actsOn(d),load=A.reduce((x,q)=>x+q.min*EFF[q.eff][2],0);
 if(k===null&&st===null&&!sets&&!A.length)return null;
 const a=Math.min(1,(k||0)/600),b=Math.min(1,(st||0)/12000),c=Math.min(1,sets/25),e=Math.min(1,load/90);const score=Math.round(100*(1-(1-.6*a)*(1-.35*b)*(1-.5*c)*(1-.55*e)));
 return{score,label:score>=75?'All out':score>=50?'High':score>=25?'Moderate':'Light',kcal:k,steps:st,sets,acts:A,act:A[0]||null}}
// how much to take on today, given recovery
const strainTarget=band=>({g:[50,80],y:[30,55],r:[0,30]}[band]);

// ===== v6: habit stack =====
const hit=(h,v)=>v!==null&&v>=(h.auto==='meal'?.5:1);
// value of a habit on a day: 1 done, 0 missed, .5 half (one prepped meal), null = no data / not applicable
function hv(h,d){switch(h.auto){
 case'weigh':return memo('wd',()=>new Set(weightSeries().map(p=>p.date))).has(d)?1:(h.since&&d<h.since?null:0);
 case'sleep':{const x=sleepRec(d).hours;return x===null?null:(x>=S.goals.sleep-.25?1:0)} // within 15 min counts
 case'lift':return memo('ld',()=>new Set(S.sessions.map(s=>ymd(s.date)))).has(d)?1:null; // rest days never count as a miss
 case'meal':{const m=S.meals[d];return m?Math.min(1,(m.prep||0)/2):null}
 case'pro':{const f=S.food[d];return f&&f.length?(foodTot(d).p>=S.goals.protein?1:0):null}
 case'steps':{const x=stepsFor(d);return x===null?null:(x>=S.goals.steps?1:0)}
 case'bed':{const b=sleepRec(addDays(d,1)).bed;const late=b?bedLate(b):null;return late===null?null:(late<=15?1:0)} // that night's bedtime, known the next morning
 case'screen':{const x=S.screen[d];return x?(x.min<=S.goals.screen?1:0):null}
 default:return h.since&&d<h.since?null:((S.hlog[d]||{})[h.id]?1:0)}}
function hDetail(h,d){const g=S.goals;switch(h.auto){
 case'weigh':{const w=weightSeries().find(p=>p.date===d);return w?r1(w.lb)+' lb':'Step on the scale'}
 case'sleep':{const x=sleepRec(d).hours;return x===null?'Waiting for Health sync':hm(x)+' of '+g.sleep+' h'}
 case'lift':{const lo=ymdToT(d),s=S.sessions.find(q=>q.date>=lo&&q.date<lo+dayMs);const nd=nextDay();return s?s.dayName+' done':S.active?'In progress':'Up next: '+(nd?nd.name:'—')}
 case'meal':return(mealDay(d).prep||0)+' of 2 prepped meals';
 case'pro':return Math.round(foodTot(d).p)+' / '+g.protein+' g';
 case'steps':{const x=stepsFor(d);return x===null?'Waiting for Health sync':fmtN(x)+' / '+fmtN(g.steps)}
 case'bed':return'Lights out by '+fmtBed(g.bed)+' · confirmed tomorrow';
 case'screen':{const x=S.screen[d];return x?hm(x.min/60)+' of '+hm(g.screen/60)+' limit':'Log today’s total tomorrow morning'}
 default:return(S.hlog[d]||{})[h.id]?'Done':'Tap to check off'}}
// Streaks follow "never miss twice": one missed day is forgiven (it just doesn't count), two in a row ends the run.
function runLen(val){const t=ymd();let n=0,gap=0,missed=false;for(let i=0;i<400&&gap<7;i++){const v=val(addDays(t,-i));if(v===null){gap++;continue}gap=0;if(v){n++;missed=false}else if(i===0)continue;else if(missed)break;else missed=true}return n}
function hStreak(h){if(h.auto==='lift')return streak();return memo('st'+h.id,()=>runLen(d=>{const v=hv(h,d);return v===null?null:hit(h,v)}))}
// days done so far, out of the ~66 it takes on average for a habit to become automatic
function hReps(h){return memo('rp'+h.id,()=>{const t=ymd();let n=0;for(let i=0;i<180;i++){const v=hv(h,addDays(t,-i));if(v!==null&&hit(h,v))n++}return n})}
function dayStack(d){return memo('ds'+d,()=>{const o={hit:0,miss:0,n:0,by:{am:0,day:0,pm:0}};for(const h of S.habits){const v=hv(h,d);if(v===null)continue;o.n++;if(hit(h,v)){o.hit++;o.by[h.stack]++}else o.miss++}return o})}
// consecutive strong days (80%+ of tracked habits done), with the same one-miss forgiveness
function stackStreak(){return memo('sstk',()=>runLen(d=>{const s=dayStack(d);return s.n?s.hit/s.n>=.8:null}))}
function weekRate(off){const ws=addDays(ymd(weekStart()),-7*off),t=ymd();let a=0,b=0;const per={};for(let i=0;i<7;i++){const d=addDays(ws,i);if(d>t)break;for(const h of S.habits){const v=hv(h,d);if(v===null||(d===t&&!hit(h,v)))continue;const p=per[h.id]||(per[h.id]={h,a:0,b:0});p.b++;b++;if(hit(h,v)){p.a++;a++}}}return{a,b,p:b?Math.round(a/b*100):null,per:Object.values(per)}}
function stackDone(k){const t=ymd(),hs=S.habits.filter(x=>x.stack===k&&hv(x,t)!==null);if(hs.length&&hs.every(x=>hit(x,hv(x,t)))){toast((STACKS.find(q=>q[0]===k)||[])[1]+' stack complete');if(navigator.vibrate)navigator.vibrate([20,60,20,60,40])}}
function toggleHabit(h,d){const o=S.hlog[d]||(S.hlog[d]={});if(o[h.id])delete o[h.id];else o[h.id]=1;if(!Object.keys(o).length)delete S.hlog[d];if(!h.since||d<h.since)h.since=d;save();if(navigator.vibrate)navigator.vibrate(10)}
// next-morning recovery on days a habit was done vs missed (needs 5+ of each)
function impact(){return memo('impact',()=>{const t=ymd(),out=[];for(const h of S.habits){if(h.auto==='sleep')continue;const a=[],b=[];for(let i=1;i<=90;i++){const d=addDays(t,-i);const v=hv(h,d);if(v===null)continue;const r=recovery(addDays(d,1));if(!r)continue;(hit(h,v)?a:b).push(r.score)}if(a.length>=7&&b.length>=7&&Math.abs(avg(a)-avg(b))>=4)out.push({h,d:avg(a)-avg(b),a:a.length,b:b.length})}return out.sort((x,y)=>Math.abs(y.d)-Math.abs(x.d))})}
let hRange=14;
function habits(keep){const t=ymd();$('#title').textContent='Habits';$('#sub').textContent='Daily stack';$('#topRight').innerHTML='<button class="mini" id="hEdit">Edit</button>';
 const ds=dayStack(t),ss=stackStreak();const days=[...Array(hRange)].map((_,i)=>addDays(t,i-hRange+1));
 let a=0,b=0;for(let i=0;i<30;i++){const s=dayStack(addDays(t,-i));a+=s.hit;b+=s.n}
 let h=habitSeg('habits')+`<div class="card hsum"><div class="hring">${dialSvg(ds.n?ds.hit/ds.n*100:0,'var(--ac)',8)}<div class="dv"><b>${ds.hit}</b><i>/${ds.n}</i></div></div>
 <div class="hs3"><div><div class="row"><div class="k">Stack streak</div><button class="info" data-ex="streak">i</button></div><div class="stat">${ss}<span class="mu sm"> day${ss===1?'':'s'}</span></div></div><div><div class="k">30-day rate</div><div class="stat">${b?Math.round(a/b*100):'—'}<span class="mu sm">${b?' %':''}</span></div></div></div></div>`;
 for(const[k,l]of STACKS){const hs=S.habits.filter(x=>x.stack===k);if(!hs.length)continue;const dn=hs.filter(x=>hit(x,hv(x,t))).length;
  h+=`<div class="shead"><span class="k" style="color:${STC[k]}">${l}</span><span class="mu sm">${dn} / ${hs.length}</span></div><div class="card stackc" style="--c:${STC[k]}"><div class="hrow cue ${dn?'on':''}"><span class="node"></span><span class="hn"><small>After ${esc(S.cues[k])}</small></span></div>${hs.map(x=>{const v=hv(x,t),on=hit(x,v)&&v>=1,s=hStreak(x);
   return`<button class="hrow ${on?'on':''} ${v>0&&v<1?'half':''}" data-h="${x.id}"><span class="node">${on?'✓':''}</span><span class="hn"><b>${esc(x.name)}</b><small>${esc(hDetail(x,t))}</small></span><span class="hstk">${s||0}<small>${x.auto==='lift'?'wk':'d'}</small>${x.auto==='lift'?'':`<em>${Math.min(66,hReps(x))}/66</em>`}</span></button>`}).join('')}</div>`}
 const w0=weekRate(0),w1=weekRate(1),ranked=w0.per.filter(x=>x.b>=2).sort((x,y)=>y.a/y.b-x.a/x.b),top=ranked[0],low=ranked[ranked.length-1];
 h+=`<h2>This week</h2><div class="card"><div class="row sp"><div><div class="stat">${w0.p===null?'—':w0.p+'<span class="mu sm"> %</span>'}</div><div class="mu sm">of tracked habits done</div></div>${w0.p!==null&&w1.p!==null?`<span class="dlt ${w0.p>=w1.p?'up':'dn'}" style="font-size:13px">${w0.p>=w1.p?'▲':'▼'} ${Math.abs(w0.p-w1.p)} pts vs last week (${w1.p}%)</span>`:''}</div>
 ${top?`<div class="kv" style="margin-top:8px"><span>Strongest</span><span>${esc(top.h.name)} · ${top.a}/${top.b}</span></div>`:''}${low&&low!==top&&low.a<low.b?`<div class="kv"><span>Focus next</span><span>${esc(low.h.name)} · ${low.a}/${low.b}</span></div>`:''}</div>`;
 h+=`<h2>Stacked view</h2><div class="card"><div class="row sp"><div class="mu sm">Each column is a day, built up from morning to evening.</div><div class="seg tiny">${[[14,'2W'],[28,'4W'],[84,'12W']].map(([n,l])=>`<button data-hr="${n}" class="${hRange===n?'on':''}">${l}</button>`).join('')}</div></div>
 <div class="hgrid" id="hgrid"><div class="hg" style="--n:${hRange}"><span class="gl k">Done / day</span>${days.map(d=>{const s=dayStack(d),tot=Math.max(1,S.habits.length);return`<span class="gb">${['am','day','pm'].map(k=>s.by[k]?`<i style="height:${s.by[k]/tot*100}%;background:${STC[k]}"></i>`:'').join('')}</span>`}).join('')}
 <span class="gl"></span>${days.map(d=>{const dt=new Date(ymdToT(d));const lb=hRange===14?dt.toLocaleDateString(undefined,{weekday:'narrow'}):(hRange===28||dt.getDay()===1?dt.getDate():'');return`<span class="gd ${d===t?'now':''}">${lb}</span>`}).join('')}`;
 for(const[k,l]of STACKS){const hs=S.habits.filter(x=>x.stack===k);if(!hs.length)continue;h+=`<span class="gl grp" style="color:${STC[k]}">${l}</span><span class="gsp"></span>`;
  for(const x of hs)h+=`<span class="gl">${esc(x.name)}</span>`+days.map(d=>{const v=hv(x,d);return`<i class="gcell ${v===null?'vn':v>=1?'v1':v>0?'vh':'v0'}${d===t?' now':''}${x.auto?'':' tap'}" style="--c:${STC[k]}" data-h="${x.id}" data-d="${d}"></i>`}).join('')}
 h+=`</div></div><div class="mu sm" style="margin-top:10px">Solid = done · faint = half · grey = missed · outline = no data. Tap a square to fix a past day for habits you check off yourself.</div></div>`;
 const im=impact();h+=`<h2>What moves your recovery</h2><div class="card">${im.length?im.slice(0,6).map(x=>`<div class="imp"><b style="color:${x.d>=0?'var(--good)':'var(--bad)'}">${x.d>=0?'+':''}${Math.round(x.d)}%</b><div><div>${esc(x.h.name)}</div><div class="mu sm">recovery next morning · ${x.a} days done vs ${x.b} missed</div></div></div>`).join('')+'<div class="mu sm" style="margin-top:8px">A pattern in your own last 90 days, not proof of cause.</div>':'<div class="mu sm">Shows up once a habit has a week of done days and a week of missed days, and the gap in next-morning recovery is at least 4 points. Sleep itself is left out because it is already part of the recovery score.</div>'}</div>`;
 const V=$('#view');const y=window.scrollY,gx=keep&&$('#hgrid')?$('#hgrid').scrollLeft:null;V.innerHTML=h;const G=$('#hgrid');G.scrollLeft=gx===null?G.scrollWidth:gx;if(keep)window.scrollTo(0,y);
 $('#hEdit').onclick=habitSheet;
 V.onclick=ev=>{const r=ev.target.closest('[data-hr]');if(r){hRange=+r.dataset.hr;habits();return window.scrollTo(0,y)}
  const c=ev.target.closest('.gcell');if(c){const x=S.habits.find(q=>q.id===c.dataset.h);if(x&&!x.auto){toggleHabit(x,c.dataset.d);habits(1)}return}
  const row=ev.target.closest('.hrow');if(!row)return;const x=S.habits.find(q=>q.id===row.dataset.h);if(!x)return;
  if(!x.auto){toggleHabit(x,t);stackDone(x.stack);return habits(1)}
  if(x.auto==='meal'){const m=Object.assign({out:[]},mealDay(t));m.prep=((m.prep||0)+1)%3;setMeal(t,m);stackDone(x.stack);return habits(1)}
  if(x.auto==='screen')return screenSheet(()=>habits(1));go({weigh:'body',lift:'home',pro:'today',steps:'today',sleep:'sleep',bed:'sleep'}[x.auto])}}
function habitSheet(){openSheet(`<h3>Edit habits</h3><div class="mu sm" style="margin-top:4px">List order is the order you do them. Auto habits tick themselves from your data.</div><div class="k" style="margin-top:12px">Each stack starts after…</div><div class="f" style="grid-template-columns:1fr">${STACKS.map(([k,l])=>`<label>${l}: after<input data-cue="${k}" value="${esc(S.cues[k])}"></label>`).join('')}</div><div class="k" style="margin-top:14px">Habits</div><div id="hl" style="margin-top:2px"></div>
 <div class="k" style="margin-top:16px">Add a habit</div><div class="f" style="grid-template-columns:1fr 1fr"><label style="grid-column:1/-1">Name<input id="hnN" placeholder="e.g. Read 10 pages"></label><label>Stack<select id="hnS">${STACKS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label><label>Tracked by<select id="hnT"></select></label></div>
 <button id="hnAdd" style="width:100%;margin-top:8px">Add habit</button><button class="big" id="hDone" style="margin-top:14px">Done</button>`);
 const sh=$('#sheet');const done=()=>{closeSheet();habits(1)};$('#sbg').onclick=done;$('#hDone').onclick=done;
 const draw=()=>{$('#hl').innerHTML=S.habits.map((x,i)=>`<div class="edrow" data-i="${i}"><input data-k="name" value="${esc(x.name)}"><button data-m="-1">↑</button><button data-m="1">↓</button><button class="danger" data-x="1">✕</button>
  <div class="row" style="grid-column:1/-1"><select data-k="stack" style="min-height:36px">${STACKS.map(([k,l])=>`<option value="${k}" ${k===x.stack?'selected':''}>${l}</option>`).join('')}</select><span class="mu sm">${x.auto?'Auto · '+AUTO[x.auto]:'You check it off'}</span></div></div>`).join('');
  const used=new Set(S.habits.map(x=>x.auto));$('#hnT').innerHTML='<option value="">Me (tap to check)</option>'+Object.entries(AUTO).filter(([k])=>!used.has(k)).map(([k,l])=>`<option value="${k}">Auto · ${l}</option>`).join('')};
 draw();
 sh.onchange=ev=>{if(ev.target.dataset.cue){S.cues[ev.target.dataset.cue]=ev.target.value.trim()||'my usual cue';return save()}const k=ev.target.dataset.k;if(!k)return;const x=S.habits[ev.target.closest('.edrow').dataset.i];x[k]=k==='name'?(ev.target.value.trim()||'Habit'):ev.target.value;save()};
 sh.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.id==='hnAdd'){const n=$('#hnN').value.trim(),a=$('#hnT').value;if(!n&&!a)return;S.habits.push({id:'h_'+uid(),name:n||AUTO[a].replace(/^./,c=>c.toUpperCase()),stack:$('#hnS').value,since:ymd(),...(a?{auto:a}:{})});save();$('#hnN').value='';return draw()}
  const r=b.closest('.edrow');if(!r)return;const i=+r.dataset.i;
  if(b.dataset.x){if(confirm('Remove "'+S.habits[i].name+'"? Its history is kept if you add it back.')){S.habits.splice(i,1);save();draw()}return}
  if(b.dataset.m){const j=i+ +b.dataset.m;if(j<0||j>=S.habits.length)return;[S.habits[i],S.habits[j]]=[S.habits[j],S.habits[i]];save();draw()}}}
function habitsCSV(){const t=ymd();const rows=[['date',...S.habits.map(h=>h.name),'done','tracked','prepped_meals','eat_out_count','eat_out_spend','recovery','sleep_pct','strain']];
 for(let i=365;i>=0;i--){const d=addDays(t,-i),s=dayStack(d),m=mealDay(d);if(!s.n&&!S.meals[d])continue;const r=recovery(d),sp=sleepPerf(d),sn=strain(d);
  rows.push([d,...S.habits.map(h=>hv(h,d)??''),s.hit,s.n,m.prep||0,(m.out||[]).length,(m.out||[]).reduce((a,x)=>a+(+x.amt||0),0),r?r.score:'',sp??'',sn?sn.score:''])}
 return rows.map(r=>r.map(v=>/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(',')).join('\n')}

// ===== v6: vitals — every metric the Health file contains =====
// key, label, unit, decimals?, better-direction (1 up, -1 down, 0 neutral), group
const METRICS=[['hrv','HRV','ms',0,1,'Recovery'],['restingHR','Resting HR','bpm',0,-1,'Recovery'],['respiratoryRate','Respiratory rate','br/min',1,0,'Recovery'],['spo2','Blood oxygen','%',1,1,'Recovery'],['wristTempDeltaF','Wrist temp','°F',1,0,'Recovery'],['walkingHR','Walking HR','bpm',0,-1,'Recovery'],['vo2max','VO₂ max','',1,1,'Recovery'],
 ['sleepHours','Sleep','h',1,1,'Sleep'],['sleepScore','Sleep score','',0,1,'Sleep'],['sleepDeepMin','Deep sleep','min',0,1,'Sleep'],['sleepRemMin','REM sleep','min',0,1,'Sleep'],['sleepLightMin','Light sleep','min',0,0,'Sleep'],['sleepAwakeMin','Awake','min',0,-1,'Sleep'],
 ['steps','Steps','',0,1,'Activity'],['activeKcal','Active energy','kcal',0,1,'Activity'],['basalKcal','Resting energy','kcal',0,0,'Activity'],['exerciseMin','Exercise','min',0,1,'Activity'],['standHours','Stand hours','h',0,1,'Activity'],['distanceMi','Distance','mi',1,1,'Activity'],['flights','Flights climbed','',0,1,'Activity'],['mindfulMin','Mindful','min',0,1,'Activity'],['daylightMin','Daylight','min',0,1,'Activity'],
 ['dietaryKcal','Calories eaten','kcal',0,0,'Fuel'],['dietaryProteinG','Protein eaten','g',0,1,'Fuel'],['waterOz','Water','oz',0,1,'Fuel'],
 ['weightLb','Weight','lb',1,0,'Body'],['bodyFatPct','Body fat','%',1,0,'Body'],['leanMassLb','Lean mass','lb',1,1,'Body'],['muscleMassLb','Muscle','lb',1,1,'Body'],['bmi','BMI','',1,0,'Body'],['bodyWaterPct','Body water','%',1,0,'Body'],['visceralFat','Visceral fat','',0,-1,'Body'],['bmr','BMR','kcal',0,0,'Body']];
const GCOL={Recovery:'var(--good)',Sleep:'var(--sleep)',Activity:'var(--strain)',Fuel:'#ff9f0a',Body:'var(--ac)',Other:'var(--mu)'};
function spark(pts,k,lo,n,col){if(pts.length<2)return'<div class="spk mu sm">1 reading</div>';const vs=pts.map(p=>p[k]);let a=Math.min(...vs),b=Math.max(...vs);if(a===b){a-=1;b+=1}const t0=ymdToT(lo);
 return`<svg class="spk" viewBox="0 0 100 28" preserveAspectRatio="none"><polyline points="${pts.map(p=>r1(Math.round((ymdToT(p.date)-t0)/dayMs)/(n-1)*100)+','+r1(26-(p[k]-a)/(b-a)*24)).join(' ')}" fill="none" stroke="${col}" stroke-width="1.7" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`}
let vRange=30;
function vitals(){const t=ymd();$('#title').textContent='Health';$('#sub').textContent='All metrics';$('#topRight').innerHTML=healthChip();
 const lo=addDays(t,-vRange+1);const rows=H.days.filter(x=>x.date>=lo&&x.date<=t);
 const rb=[...Array(vRange)].map((_,i)=>recovery(addDays(lo,i)));const rs=rb.filter(Boolean);const cnt=b=>rs.filter(x=>x.band===b).length;
 let L=null,Ld=null;for(let i=0;i<vRange&&!L;i++){Ld=addDays(t,-i);L=recovery(Ld)}
 const keys=new Set();for(const x of H.days)for(const k in x)if(num(x[k])!==null)keys.add(k);const known=new Set(METRICS.map(m=>m[0]));
 const list=METRICS.filter(m=>keys.has(m[0])).concat([...keys].filter(k=>!known.has(k)).map(k=>[k,k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()),'',1,0,'Other']));
 const missing=METRICS.filter(m=>!keys.has(m[0])&&m[5]!=='Body').map(m=>m[1]);
 const tile=([k,l,u,dp,dir,grp])=>{const all=H.days.filter(x=>num(x[k])!==null),last=all[all.length-1],pts=rows.filter(x=>num(x[k])!==null),f=v=>dp?r1(v):fmtN(v);const mu=pts.length?avg(pts.map(x=>x[k])):null;
  let dl='';if(mu&&pts.length>1){const p=(last[k]-mu)/mu*100;const good=dir===0||Math.abs(p)<1?null:(p>0)===(dir>0);dl=`<span class="dlt ${good===null?'':good?'up':'dn'}">${Math.abs(p)<1?'=':p>0?'▲':'▼'} ${Math.abs(Math.round(p))}%</span>`}
  return`<div class="card vt"><div class="row sp"><div class="k">${l}</div>${dl}</div><div class="stat">${f(last[k])}<span class="mu sm"> ${u}</span></div>${spark(pts,k,lo,vRange,GCOL[grp])}<div class="row sp mu sm"><span>${mu===null?'no data in range':'avg '+f(mu)}</span><span>${last.date===t?'today':new Date(ymdToT(last.date)).toLocaleDateString([],{month:'short',day:'numeric'})}</span></div></div>`};
 let h=healthSeg('vitals')+`<div class="card"><div class="row sp"><div class="k">Recovery</div><div class="seg tiny" style="width:110px">${[30,90].map(n=>`<button data-vr="${n}" class="${vRange===n?'on':''}">${n}D</button>`).join('')}</div></div>
 ${rs.length?`<div class="rbars">${rb.map(x=>`<i style="height:${x?x.score:0}%;background:${x?BAND[x.band]:'none'}"></i>`).join('')}</div><div class="row sp mu sm"><span>avg <b style="color:var(--tx)">${Math.round(avg(rs.map(x=>x.score)))}%</b></span><span><span style="color:var(--good)">●</span> ${cnt('g')} <span style="color:var(--warn)">●</span> ${cnt('y')} <span style="color:var(--bad)">●</span> ${cnt('r')} days</span></div>
 ${L?`<div class="brk"><div><div class="k">HRV</div><div class="stat" style="font-size:20px">${L.hrv?Math.round(L.hrv.v):'—'}</div><div class="mu sm">${L.hrv?'baseline '+Math.round(L.hrv.mu):'no baseline'}</div></div><div><div class="k">Resting HR</div><div class="stat" style="font-size:20px">${L.rhr?Math.round(L.rhr.v):'—'}</div><div class="mu sm">${L.rhr?'baseline '+Math.round(L.rhr.mu):'no baseline'}</div></div><div><div class="k">Sleep</div><div class="stat" style="font-size:20px">${L.sleep!==undefined?L.sleep+'%':'—'}</div><div class="mu sm">of ${S.goals.sleep} h need</div></div></div>
 <div class="mu sm" style="margin-top:10px">${dayLabel(Ld)}: <b style="color:${BAND[L.band]}">${L.score}%</b>. <button class="info" data-ex="rec">i</button></div>`:''}`:'<div class="mu sm" style="margin-top:8px">Needs HRV or sleep from Health. It fills in as soon as health.json has a few days of data.</div>'}</div>`;
 h+=screenHTML();
 let grp='';for(const m of list){if(m[5]!==grp){if(grp)h+='</div>';grp=m[5];h+=`<h2>${grp}</h2><div class="grid2">`}h+=tile(m)}if(grp)h+='</div>';
 if(!list.length)h+='<div class="card mu sm">No Health data yet. See HEALTH_SYNC.md for how the file is produced.</div>';
 else if(missing.length)h+=`<h2>Not in your export yet</h2><div class="card mu sm">${missing.join(' · ')}<div style="margin-top:8px">Add any of these to the Health export and a tile appears here automatically. Field names are in HEALTH_SYNC.md.</div></div>`;
 const V=$('#view');V.innerHTML=h;$('#scrAdd').onclick=()=>screenSheet(vitals);V.onclick=ev=>{const b=ev.target.closest('[data-vr]');if(b){vRange=+b.dataset.vr;vitals()}}}

document.addEventListener('click',ev=>{const b=ev.target.closest('[data-ex]');if(b){ev.stopPropagation();explain(b.dataset.ex)}},true);
window.LIFT={habitDay,habitStats,savings,mealsCSV,habitsCSV,get S(){return S},get H(){return H},target,nextDay,stalled,e1rm,toCSV,readiness,recovery,sleepPerf,strain,hv,dayStack,stackStreak,hStreak,runLen,weekRate,impact,weightSeries,sleepRec,sleepDebt,consistency,leanFatSeries,compLatest,weeklyRate,loadHealth};

