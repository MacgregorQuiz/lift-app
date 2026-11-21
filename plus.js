'use strict';
// Lift v7 additions: coach, flexible training (exercise library, swaps, activities, schedule, templates), AI food log.

function reWorkout(){const y=window.scrollY;workout();window.scrollTo(0,y)}
const lbNow=()=>{const s=weightSeries();return s.length?s[s.length-1].lb:175};

// ===== exercise library =====
// name, muscle, compound
const EXLIB=[['Bench Press','Chest',1],['Incline Bench Press','Chest',1],['Incline DB Press','Chest',1],['Flat DB Press','Chest',1],['Machine Chest Press','Chest',1],['Push-ups','Chest',1],['Dips','Chest',1],['Cable Fly','Chest',0],['Pec Deck','Chest',0],['DB Fly','Chest',0],
 ['Pull-ups','Back',1],['Chin-ups','Back',1],['Lat Pulldown','Back',1],['Barbell Row','Back',1],['Seated Cable Row','Back',1],['Chest-Supported Row','Back',1],['One-Arm DB Row','Back',1],['T-Bar Row','Back',1],['Deadlift','Back',1],['Rack Pull','Back',1],['Straight-Arm Pulldown','Back',0],['Back Extension','Back',0],['Shrug','Back',0],
 ['Overhead Press','Shoulders',1],['Seated DB Shoulder Press','Shoulders',1],['Machine Shoulder Press','Shoulders',1],['Arnold Press','Shoulders',1],['Lateral Raise','Shoulders',0],['Cable Lateral Raise','Shoulders',0],['Rear-Delt Fly','Shoulders',0],['Face Pull','Shoulders',0],['Front Raise','Shoulders',0],['Upright Row','Shoulders',0],
 ['EZ Curl','Biceps',0],['Barbell Curl','Biceps',0],['Incline DB Curl','Biceps',0],['Hammer Curl','Biceps',0],['Preacher Curl','Biceps',0],['Cable Curl','Biceps',0],
 ['Rope Pushdown','Triceps',0],['Overhead Triceps Extension','Triceps',0],['Skull Crusher','Triceps',0],['Close-Grip Bench Press','Triceps',1],['Triceps Dip Machine','Triceps',0],
 ['Back Squat','Quads',1],['Front Squat','Quads',1],['Leg Press','Quads',1],['Hack Squat','Quads',1],['Bulgarian Split Squat','Quads',1],['Walking Lunge','Quads',1],['Goblet Squat','Quads',1],['Step-ups','Quads',1],['Leg Extension','Quads',0],
 ['Romanian Deadlift','Hamstrings',1],['Good Morning','Hamstrings',1],['Leg Curl','Hamstrings',0],['Seated Leg Curl','Hamstrings',0],['Nordic Curl','Hamstrings',0],
 ['Hip Thrust','Glutes',1],['Glute Bridge','Glutes',1],['Kettlebell Swing','Glutes',1],['Cable Kickback','Glutes',0],['Hip Abduction','Glutes',0],
 ['Standing Calf Raise','Calves',0],['Seated Calf Raise','Calves',0],['Calf Raise','Calves',0],
 ['Cable Crunch','Abs',0],['Hanging Leg Raise','Abs',0],['Plank','Abs',0],['Ab Wheel','Abs',0],['Russian Twist','Abs',0],['Pallof Press','Abs',0],['Farmer Carry','Abs',1]];
const smallInc=m=>['Shoulders','Biceps','Triceps'].includes(m);
// library + anything you've ever logged or programmed
function exAll(){const m=new Map();for(const[n,mu,c]of EXLIB){const e={name:n,muscle:mu,compound:!!c,inc:!c&&smallInc(mu)?2.5:5};m.set(TrainingCoach.key(e),e)}
 for(const d of S.days)for(const e of d.exercises)m.set(TrainingCoach.key(e),{...e,mine:1});
 for(const s of S.sessions)for(const e of s.entries)if(!m.has(TrainingCoach.key(e)))m.set(TrainingCoach.key(e),{...e,sets:e.plannedSetCount||e.sets.length||3,mine:1});return[...m.values()]}
function mkEntry(x,W){const ex={...x,sets:x.sets||3,min:x.min||(x.compound?6:10),max:x.max||(x.compound?10:15),inc:x.inc||5};const t=target(ex,W.id);
 return{...TrainingCoach.equipment(x),notes:'',plannedSetCount:t.sets.length,exId:uid(),name:x.name,muscle:x.muscle,compound:!!x.compound,min:ex.min,max:ex.max,inc:ex.inc,sets:t.sets.map(s=>({w:s.w,r:s.r,rir:'',done:false}))}}
function exPicker(title,onPick,muscle){let mu=muscle||'';openSheet(`<h3>${esc(title)}</h3><input id="exQ" placeholder="Search exercises" autocomplete="off" style="width:100%;margin-top:10px"><div class="chips" id="exM"></div><div id="exL" class="plist"></div>`);
 const draw=()=>{const q=norm($('#exQ').value);$('#exM').innerHTML=['',...MUSCLES].map(m=>`<button class="pill ${m===mu?'on':''}" data-mu="${m}">${m||'All'}</button>`).join('');
  const all=exAll();const L=all.filter(x=>(!mu||x.muscle===mu)&&(!q||norm(x.name).includes(q))).sort((a,b)=>(b.mine||0)-(a.mine||0)||a.name.localeCompare(b.name));
  const exact=all.some(x=>norm(x.name)===q);
  $('#exL').innerHTML=(q&&!exact?`<button class="prow" data-new="1"><b>Add “${esc($('#exQ').value.trim())}”</b><small>New ${mu||'Chest'} exercise · pick a muscle above first</small></button>`:'')+L.slice(0,60).map(x=>{const h=hist(x);const l=h[h.length-1];return`<button class="prow" data-n="${esc(TrainingCoach.key(x))}"><b>${esc(x.name)}</b><small>${x.muscle} · ${esc(equipmentLabel(x))}${x.compound?' · compound':''}${l?' · last '+l.sets.map(s=>s.w+'×'+s.r).slice(0,3).join(', '):''}</small></button>`}).join('')||'<div class="mu sm" style="padding:14px 0">Nothing matches. Type a name to add your own.</div>'};
 draw();$('#exQ').oninput=draw;const on=$('#exM .on');if(on&&mu)on.scrollIntoView({inline:'center',block:'nearest'});
 $('#sheet').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.mu!==undefined){mu=b.dataset.mu;return draw()}
  let x=null;if(b.dataset.new){const n=$('#exQ').value.trim();const m=mu||'Chest';x={name:n,muscle:m,compound:false,inc:smallInc(m)?2.5:5}}else if(b.dataset.n)x=exAll().find(q=>TrainingCoach.key(q)===b.dataset.n);
  if(x){closeSheet();onPick(x)}}}
function exMenu(W,ei){const e=W.entries[ei];openSheet(`<h3>${esc(e.name)}</h3><div class="mu sm">${e.muscle||''}</div><div class="plist" style="max-height:none">
 <button class="prow" data-a="swap"><b>Swap exercise</b><small>Machine taken or want a different ${esc((e.muscle||'').toLowerCase())} move</small></button>
 <button class="prow" data-a="up"><b>Move up</b><small>Do it earlier</small></button><button class="prow" data-a="down"><b>Move down</b><small>Do it later</small></button>
 <button class="prow" data-a="rm"><b style="color:var(--bad)">Skip today</b><small>Remove from this workout only; your program is unchanged</small></button></div>`);
 $('#sheet').onclick=ev=>{const b=ev.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
  if(a==='swap')return exPicker('Swap '+e.name,x=>{W.entries[ei]=mkEntry(x,W);if(W===S.active)save();reWorkout()},e.muscle);
  if(a==='rm'){if(e.sets.some(s=>s.done)&&!confirm('This exercise has logged sets. Remove it?'))return;W.entries.splice(ei,1)}
  const j=a==='up'?ei-1:a==='down'?ei+1:-1;if(j>=0&&j<W.entries.length)[W.entries[ei],W.entries[j]]=[W.entries[j],W.entries[ei]];
  if(W===S.active)save();closeSheet();reWorkout()}}
function startEmpty(){S.active={id:uid(),date:Date.now(),dayId:null,dayName:'Custom workout',healthContext:healthSnapshot(),entries:[]};save();go('workout')}

// ===== activities (cardio, sport, anything that isn't sets × reps) =====
// name, MET at moderate effort
const ACTS=[['Rowing machine',7],['Cycling',7],['Stationary bike',6.5],['Run',9.5],['Walk',3.5],['Hike',6],['Hockey',8],['Swim',7],['Stair climber',8.5],['Elliptical',5.5],['HIIT',9],['Basketball',7],['Soccer',8],['Tennis',7],['Pickleball',5],['Golf',4.5],['Skiing',6.5],['Skating',6],['Yoga',2.8],['Mobility',2.3],['Jump rope',10],['Boxing',8.5],['Climbing',7],['Kayak / paddle',5],['Sauna',1.5]];
const EFF=[['Easy',.7,.5],['Moderate',1,.75],['Hard',1.25,1],['All-out',1.45,1.2]]; // label, MET multiplier, strain weight
const actMet=n=>{const a=ACTS.find(x=>norm(x[0])===norm(n));return a?a[1]:6};
const actKcal=(type,min,eff)=>Math.round(actMet(type)*EFF[eff][1]*(lbNow()/2.2046)*(min/60)/5)*5;
function actsOn(d){const lo=ymdToT(d),hi=ymdToT(addDays(d,1));return S.acts.filter(a=>a.date>=lo&&a.date<hi)}
const actLine=a=>`${a.min} min · ${EFF[a.eff][0]}${a.dist?' · '+a.dist+' mi':''} · ~${fmtN(a.kcal)} kcal`;
function actSheet(done){const recent=[...new Set([...S.acts].reverse().map(a=>a.type))];const quick=[...new Set([...recent,'Rowing machine','Cycling','Hockey','Run','Walk','Stair climber'])].slice(0,8);
 let eff=1,when=0;openSheet(`<h3>Log activity</h3><div class="mu sm">Cardio, a game, anything outside the weights.</div><div class="chips" id="acQ">${quick.map(q=>`<button class="pill" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
 <div class="f" style="grid-template-columns:1fr"><label>Activity<input id="acT" list="acList" placeholder="Search or type your own" autocomplete="off"><datalist id="acList">${ACTS.map(a=>`<option value="${a[0]}">`).join('')}</datalist></label></div>
 <div class="k" style="margin-top:14px;text-align:center">Minutes</div><div class="bigstep"><button data-am="-5">−</button><input id="acM" inputmode="numeric" value="30"><button data-am="5">+</button></div>
 <div class="k">Effort</div><div class="seg" id="acE">${EFF.map((e,i)=>`<button data-ef="${i}">${e[0]}</button>`).join('')}</div>
 <div class="f" style="grid-template-columns:1fr 1fr"><label>Distance mi (optional)<input id="acD" type="number" inputmode="decimal" step="0.1" placeholder="—"></label><label>When<select id="acW"><option value="0">Today</option><option value="1">Yesterday</option><option value="2">2 days ago</option></select></label></div>
 <div class="f" style="grid-template-columns:1fr"><label>Note (optional)<input id="acN" placeholder="e.g. beer league, 3 periods"></label></div>
 <div class="mu sm" id="acK" style="margin-top:10px;text-align:center"></div><button class="big" id="acS" style="margin-top:10px">Save activity</button>`);
 const upd=()=>{document.querySelectorAll('#acE button').forEach((b,i)=>b.classList.toggle('on',i===eff));document.querySelectorAll('#acQ button').forEach(b=>b.classList.toggle('on',norm(b.dataset.q)===norm($('#acT').value)));const m=+$('#acM').value||0,t=$('#acT').value.trim();$('#acK').textContent=t&&m?`About ${fmtN(actKcal(t,m,eff))} kcal at ${Math.round(lbNow())} lb. Counts toward today’s strain.`:''};
 upd();$('#sheet').oninput=upd;
 $('#sheet').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.q){$('#acT').value=b.dataset.q;return upd()}if(b.dataset.am){$('#acM').value=Math.max(5,(+$('#acM').value||0)+ +b.dataset.am);return upd()}if(b.dataset.ef){eff=+b.dataset.ef;return upd()}
  if(b.id==='acS'){const t=$('#acT').value.trim(),m=Math.round(+$('#acM').value||0);if(!t)return $('#acT').focus();if(m<1)return;when=+$('#acW').value;const d=$('#acD').value;
   S.acts.push({id:uid(),date:when?ymdToT(addDays(ymd(),-when))+18*36e5:Date.now(),type:t,min:m,eff,kcal:actKcal(t,m,eff),...(d!==''?{dist:+d}:{}),...($('#acN').value.trim()?{note:$('#acN').value.trim()}:{})});
   save();if(navigator.vibrate)navigator.vibrate(15);closeSheet();toast(t+' logged');(done||render)()}}}

// ===== weekly schedule + program templates =====
const WD=['M','T','W','T','F','S','S'];
function weekStrip(){const ws=ymd(weekStart()),t=ymd();return`<div class="wk">${WD.map((l,i)=>{const d=addDays(ws,i);const lo=ymdToT(d);const s=S.sessions.find(q=>q.date>=lo&&q.date<lo+dayMs);const a=actsOn(d).length;const plan=S.plan.days[i];
 return`<div class="wd ${d===t?'now':''}"><span>${l}</span><i class="${s?'done':plan?(d<t?'missed':'plan'):''}">${s?'✓':''}</i><em>${s?esc(s.dayName.split(' ').map(w=>w[0]).join('').slice(0,3)):a?'•':plan&&d>=t?'lift':''}</em></div>`}).join('')}</div>`}
const isTrainDay=(d=ymd())=>!!S.plan.days[(new Date(ymdToT(d)).getDay()+6)%7];
function nextTrainLabel(){const t=ymd();for(let i=1;i<=7;i++){const d=addDays(t,i);if(isTrainDay(d))return i===1?'tomorrow':new Date(ymdToT(d)).toLocaleDateString(undefined,{weekday:'long'})}return'when you’re ready'}
const TEMPLATES={
 ul4:{name:'Upper / Lower',sub:'4 days · balanced size and strength',sched:[1,1,0,1,1,0,0],days:()=>defaultProgram()},
 ppl3:{name:'Push / Pull / Legs',sub:'3 days · more work per session',sched:[1,0,1,0,1,0,0],days:()=>[
  {id:uid(),name:'Push',exercises:[E('Incline DB Press',4,6,10,'Chest',1),E('Machine Chest Press',3,8,12,'Chest',1),E('Seated DB Shoulder Press',3,8,10,'Shoulders',1),E('Lateral Raise',4,12,20,'Shoulders',0,2.5),E('Cable Fly',3,12,15,'Chest',0),E('Rope Pushdown',3,10,15,'Triceps',0,2.5),E('Overhead Triceps Extension',3,10,15,'Triceps',0,2.5)]},
  {id:uid(),name:'Pull',exercises:[E('Pull-ups',4,6,12,'Back',1),E('Chest-Supported Row',4,8,12,'Back',1),E('Lat Pulldown',3,10,12,'Back',1),E('Face Pull',3,15,20,'Shoulders',0),E('Rear-Delt Fly',3,15,20,'Shoulders',0),E('Incline DB Curl',3,10,15,'Biceps',0,2.5),E('Hammer Curl',3,10,12,'Biceps',0,2.5)]},
  {id:uid(),name:'Legs',exercises:[E('Back Squat',4,6,10,'Quads',1),E('Romanian Deadlift',3,8,10,'Hamstrings',1),E('Leg Press',3,10,15,'Quads',1),E('Leg Curl',3,10,15,'Hamstrings',0),E('Leg Extension',3,12,15,'Quads',0),E('Standing Calf Raise',4,10,15,'Calves',0),E('Cable Crunch',3,12,15,'Abs',0)]}]},
 fb3:{name:'Full Body',sub:'3 days · most efficient, good around sport',sched:[1,0,1,0,1,0,0],days:()=>[
  {id:uid(),name:'Full Body A',exercises:[E('Back Squat',3,6,10,'Quads',1),E('Incline DB Press',3,6,10,'Chest',1),E('Chest-Supported Row',3,8,12,'Back',1),E('Leg Curl',3,10,15,'Hamstrings',0),E('Lateral Raise',3,12,20,'Shoulders',0,2.5),E('Rope Pushdown',2,10,15,'Triceps',0,2.5)]},
  {id:uid(),name:'Full Body B',exercises:[E('Romanian Deadlift',3,8,10,'Hamstrings',1),E('Seated DB Shoulder Press',3,8,10,'Shoulders',1),E('Pull-ups',3,6,12,'Back',1),E('Leg Press',3,10,15,'Quads',1),E('Cable Fly',3,12,15,'Chest',0),E('Incline DB Curl',2,10,15,'Biceps',0,2.5)]},
  {id:uid(),name:'Full Body C',exercises:[E('Hip Thrust',3,8,12,'Glutes',1),E('Flat DB Press',3,8,12,'Chest',1),E('Lat Pulldown',3,8,12,'Back',1),E('Walking Lunge',3,10,12,'Quads',1),E('Face Pull',3,15,20,'Shoulders',0),E('Cable Crunch',3,12,15,'Abs',0)]}]}};
function plannedDay(day){return WorkoutPlan.preview(day,S.plan.length,S.settings)}
function workoutEstimate(day){const n=WorkoutPlan.stats(day,S.settings);return `${n.exercises} exercises · ${n.sets} sets · ~${n.minutes} min`}
function lengthPicker(){return `<fieldset class="length-picker"><legend>Session length</legend><div class="length-options">${Object.entries(WorkoutPlan.lengths).map(([key,p])=>`<button type="button" data-length="${key}" aria-pressed="${S.plan.length===key}" class="${S.plan.length===key?'on':''}"><b>${p.label}</b><small>${p.name}</small></button>`).join('')}</div></fieldset>`}
function bindLengthPicker(redraw){document.querySelectorAll('[data-length]').forEach(b=>b.onclick=()=>{S.plan.length=b.dataset.length;save();redraw()})}
function planPreview(){return S.days.length?S.days.map(d=>{const p=plannedDay(d),before=WorkoutPlan.stats(d,S.settings),after=WorkoutPlan.stats(p,S.settings);return `<details class="plan-day"><summary><b>${esc(d.name)}</b><span class="mu sm">${workoutEstimate(p)}</span></summary><div class="mu sm plan-saving">${before.sets>after.sets?`${before.sets-after.sets} fewer sets than your full routine. `:''}${after.minutes>Number(S.plan.length)?'Your rest settings put this above the time guide. ':''}Estimate includes a 5-minute warmup; equipment waits and extra warmups can add time.</div>${p.exercises.map(e=>`<div class="kv sm"><span>${esc(e.name)}</span><span>${e.sets} × ${e.min}–${e.max}</span></div>`).join('')||'<p class="mu sm">Add exercises below to build this day.</p>'}</details>`}).join(''):'<p class="mu sm">Add a day below to start building your routine.</p>'}
function updatePlanPreview(){const p=$('#planPreview');if(p)p.innerHTML=planPreview()}
function planHTML(){return `<div class="card training-settings"><div class="k">Your workout style</div><h3 style="margin-top:6px">${esc(TEMPLATES[S.plan.tpl]?.name||'Custom program')}</h3><div class="mu sm" style="margin-top:6px">Switch back anytime. Each style keeps its edited routine, schedule, and session length.</div>
 <div class="style-options">${Object.entries(TEMPLATES).map(([k,t])=>`<button data-tpl="${k}" aria-pressed="${S.plan.tpl===k}" class="style-option ${S.plan.tpl===k?'on':''}"><b>${t.name}</b><small>${t.sub}</small><span class="sm">${S.plan.tpl===k?'Current style':Object.hasOwn(S.programs,k)?'Restore saved style':'Try this style'}</span></button>`).join('')}</div>
 ${lengthPicker()}<div class="mu sm">30 min: up to 4 exercises, 3 sets each. 45 min: up to 5 × 3. 60 min: up to 6 × 4. Short sessions favor different muscle groups and trim sets to fit the time guide. Full uses your entire routine.</div>
 ${S.active?'<div class="plan-notice">A workout is in progress. These settings apply to your next workout; your current sets are kept. <button data-go="workout">Resume workout</button></div>':''}</div>
 <div class="card"><div class="k">Session preview</div><div id="planPreview">${planPreview()}</div></div>
 <div class="card"><div class="k">Training days</div><div class="wk" style="margin-top:10px">${WD.map((l,i)=>`<button class="wdb ${S.plan.days[i]?'on':''}" aria-label="${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]}" aria-pressed="${!!S.plan.days[i]}" data-pd="${i}">${l}</button>`).join('')}</div><div class="mu sm" style="margin-top:8px">${S.plan.days.filter(Boolean).length} lifting days a week. Workouts rotate in order, so a missed day just moves to the next one. Your history and exercise progression carry across styles.</div></div>`}
function bindPlan(){bindLengthPicker(program);
 document.querySelectorAll('[data-pd]').forEach(b=>b.onclick=()=>{const i=+b.dataset.pd;S.plan.days[i]=S.plan.days[i]?0:1;if(!S.plan.days.some(Boolean))S.plan.days[i]=1;S.goals.lifts=S.plan.days.filter(Boolean).length;save();const y=window.scrollY;program();window.scrollTo(0,y)});
 document.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{const key=b.dataset.tpl;if(!WorkoutPlan.switchTo(S,key,TEMPLATES[key]))return;progDay=0;save();toast(TEMPLATES[key].name+' is now your program');program();window.scrollTo(0,0)})}

// ===== coach: reads everything and says what matters today =====
function latestRec(){const t=ymd();for(let i=0;i<3;i++){const r=recovery(addDays(t,-i));if(r)return{r,i}}return null}
function coach(){const t=ymd(),g=S.goals,out=[],hr=new Date().getHours();const add=(tag,col,title,body,go_)=>out.push({tag,col,title,body,go:go_});
 const lr=latestRec(),rd=readiness(),nd=plannedDay(nextDay()),lo=ymdToT(t);const todayS=S.sessions.filter(s=>s.date>=lo&&s.date<lo+dayMs);const recTxt=lr?`Recovery ${lr.r.score}%${lr.i?(lr.i===1?' yesterday':' two days ago'):''}`:'';
 const n=weekCount(weekStart());const wsI=(new Date().getDay()+6)%7;const left=S.plan.days.slice(wsI+1).filter(Boolean).length;const behind=n+left<g.lifts;
 const yA=actsOn(addDays(t,-1)).filter(a=>a.eff>=2&&a.min>=40)[0];const yNote=yA?` ${yA.type} yesterday (${yA.min} min, ${EFF[yA.eff][0].toLowerCase()}) is still in your legs.`:'';
 // train
 if(S.active)add('Train','var(--ac)','Workout in progress',`${S.active.dayName}: pick it back up.`,'workout');
 else if(todayS.length){const s=todayS[todayS.length-1];const sm=summary(s);add('Train','var(--ac)',`${s.dayName} done`,`${sm.sets} set${sm.sets===1?'':'s'}${sm.vol?', '+fmtN(sm.vol)+' lb moved':''}. Get 30–40 g of protein in over the next couple of hours and you’ve done the job for today.`,'history')}
 else if(nd&&(isTrainDay()||behind)){const ups=nd.exercises.filter(e=>target(e).up).length;const e0=nd.exercises[0],t0=e0&&target(e0);const first=t0&&t0.last?` First up: ${e0.name}, ${t0.sets[0].w} lb × ${t0.sets[0].r}.`:'';
  const why=!isTrainDay()&&behind?' Not a scheduled day, but you need it to hit '+g.lifts+' this week.':'';
  const hr=trainingReadiness();add('Train',hr.level==='easy'?'var(--warn)':'var(--ac)',`${nd.name}: ${hr.label.toLowerCase()}`,`${hr.reasons.join(' ')}${ups?` ${ups} exercise${ups>1?'s have':' has'} earned a small load increase from matching past sets.`:' Match the last load and use the exercise-specific suggestion.'}${first}${yNote}`,'home')}

 else add('Train','var(--mu)','Rest day',`Next lift: ${nd?nd.name:'—'} ${nextTrainLabel()}. A walk toward ${fmtN(g.steps)} steps helps you recover without costing anything.${yNote}`,'home');
 // sleep
 const debt=sleepDebt(),con=consistency(),ns=sleepNights(7).filter(x=>x.hours!==null),last=lastSleep();
 if(debt.n>=3&&debt.debt>=3){const[bh,bm]=g.bed.split(':').map(Number);const early=Math.min(60,Math.round(debt.debt*10/15)*15);add('Sleep','var(--sleep)',`${hm(debt.debt)} of sleep debt this week`,`Lights out by ${fmtMin(bh*60+bm-early)} tonight, ${early} min ahead of your usual target, to start paying it back.`,'sleep')}
 else if(con&&con.sd>45)add('Sleep','var(--sleep)',`Bedtime swings ±${Math.round(con.sd)} min`,`You average ${fmtMin(con.avg)}. Holding ${fmtBed(g.bed)} every night is the cheapest recovery gain you have.`,'sleep');
 else if(ns.length>=4)add('Sleep','var(--sleep)',`Sleep is on point`,`${hm(avg(ns.map(x=>x.hours)))} a night over the last ${ns.length} tracked nights. Keep ${fmtBed(g.bed)} as the anchor.`,'sleep');
 // HRV trend
 const h7=H.days.filter(x=>x.date>addDays(t,-8)&&num(x.hrv)!==null).map(x=>x.hrv),hb=baseAt('hrv',t);
 if(h7.length>=4&&hb){const p=(avg(h7)-hb.mu)/hb.mu*100;if(p<=-8)add('Recovery','var(--bad)',`HRV is trending ${Math.abs(Math.round(p))}% under baseline`,'A week-long dip usually means sleep, stress or volume is piling up. Protect sleep and don’t add sets this week.','vitals');else if(p>=8)add('Recovery','var(--good)',`HRV is running ${Math.round(p)}% above baseline`,'This is one recovery signal. Increase a load only when matching workout history supports it and you feel ready.','vitals')}
 // fuel
 const ft=foodTot(t),anyFood=[0,1,2,3].some(i=>foodDay(addDays(t,-i)).length),remP=Math.round(g.protein-ft.p),remK=Math.round(g.kcal-ft.k);
 if(!anyFood)add('Fuel','#ff9f0a','Start logging what you eat','Tap Log food and just say it: “chicken burrito bowl, large, with guac”. Lift estimates calories and protein so your targets mean something.','food');
 else if(remP>5){const meals=hr<11?3:hr<15?2:1;add('Fuel','#ff9f0a',`${remP} g of protein to go`,hr>=19?`That’s roughly a chicken breast plus a shake before bed.${remK>300?' You also have '+fmtN(remK)+' kcal left.':''}`:`About ${Math.round(remP/meals)} g at each of your next ${meals} meal${meals>1?'s':''}.${remK>300?' '+fmtN(remK)+' kcal left for the day.':''}`,'food')}
 else add('Fuel','var(--good)','Protein goal hit',remK>300?`${fmtN(remK)} kcal still to eat if you want to stay on the gain target.`:'Calories are on target too.','food');
 // body trend
 const rate=weeklyRate();if(rate!==null&&(rate<g.gainLo||rate>g.gainHi))add('Body','var(--ac)',`Weight is moving ${rate>=0?'+':''}${r1(rate)} lb a week`,rateTip(rate),'body');
 // movement
 const st=[...Array(7)].map((_,i)=>stepsFor(addDays(t,-i-1))).filter(x=>x!==null);if(st.length>=4&&avg(st)<g.steps*.7)add('Move','var(--strain)',`Steps are averaging ${fmtN(avg(st))}`,`Your goal is ${fmtN(g.steps)}. One 20-minute walk adds about 2,000.`,'vitals');
 // screen time
 const sc=scrDays(7).filter(q=>q.x);if(sc.length>=3&&avg(sc.map(q=>q.x.min))>g.screen*1.15){const top=(sc[sc.length-1].x.top||[])[0];add('Focus','var(--purple)',`Screen time is averaging ${hm(avg(sc.map(q=>q.x.min))/60)}`,`Your limit is ${hm(g.screen/60)}.${top?' Biggest lately: '+top.n+'.':''} Late screens also push your bedtime back.`,'vitals')}
 // plateaus
 const stl=allNames().filter(stalled);if(stl.length>=2)add('Program','var(--warn)',`Plateau on ${stl.slice(0,2).join(' and ')}${stl.length>2?' +'+(stl.length-2):''}`,'No estimated-1RM gain in three sessions. Take a deload week (10% lighter, one set fewer) or swap the variation from the ••• menu.','progress');
 // health sync freshness
 if(H.updated){const age=(Date.now()-new Date(H.updated).getTime())/36e5;if(age>30)add('Sync','var(--mu)',`Health data is ${Math.round(age/24)||1} day${age>=36?'s':''} old`,'Recovery and sleep are based on the last sync. Open your Health sync shortcut with the phone unlocked to refresh it.','vitals')}
 return out}
function coachHTML(){const c=coach().slice(0,5);return`<h2>Today’s read</h2><div class="card coach">${c.map(x=>`<button class="crow" data-cgo="${x.go}"><span class="ctag" style="color:${x.col}">${x.tag}</span><b>${esc(x.title)}</b><small>${esc(x.body)}</small></button>`).join('')}</div>`}

// ===== fuel: AI food log =====
const AIK='lift.ai';const aiKey=()=>{try{return localStorage.getItem(AIK)||''}catch(e){return''}};
const FOOD_SCHEMA={type:'object',properties:{meal_name:{type:'string'},items:{type:'array',items:{type:'object',properties:{name:{type:'string'},portion:{type:'string'},kcal:{type:'number'},protein_g:{type:'number'},carbs_g:{type:'number'},fat_g:{type:'number'}},required:['name','portion','kcal','protein_g','carbs_g','fat_g'],additionalProperties:false}},confidence:{type:'string',enum:['low','medium','high']},note:{type:'string'}},required:['meal_name','items','confidence','note'],additionalProperties:false};
const FOOD_SYS=`You estimate nutrition for one person's food log. They describe what they ate, send a photo, or both.

Break the meal into its distinct foods and estimate calories, protein, carbs and fat for the amount actually eaten. Use any sizes they state. Where they don't, assume a typical portion for an adult man who lifts and is eating to gain lean mass, and write the amount you assumed in "portion" (for example "~6 oz cooked" or "1.5 cups") so he can correct it. Count cooking oil, butter, sauces, dressings and drinks: they are where estimates usually run low. For restaurant or packaged items you recognise, use their published numbers.

Round calories to the nearest 10 and macros to the nearest gram. "meal_name" is a short label for the log, five words at most. "confidence" reflects how well the portions are pinned down. "note" is one short sentence only when something would change the numbers materially and is worth checking; otherwise an empty string.`;
// Calls the Claude API straight from this device with the user's own key (single-user app, key never leaves the phone except to Anthropic).
async function aiJSON(system,schema,messages){let r;try{r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':aiKey(),'anthropic-version':'2026-10-21','anthropic-beta':'server-side-fallback-2026-07-01','anthropic-dangerous-direct-browser-access':'true'},
  body:JSON.stringify({model:'claude-opus-5-5',max_tokens:16000,fallbacks:'default',output_config:{effort:'low',format:{type:'json_schema',schema}},system,messages})})}catch(e){throw new Error(navigator.onLine===false?'You’re offline. Enter it by hand, or try again with signal.':'Couldn’t reach Claude. Check your connection and try again.')}
 if(!r.ok){let m='';try{m=(await r.json()).error.message}catch(e){}throw new Error(r.status===401?'That API key was rejected. Check it in More.':r.status===429?'Rate limited. Give it a few seconds and try again.':r.status>=500?'Claude is busy right now. Try again in a moment.':(m||'Request failed ('+r.status+')'))}
 const j=await r.json();if(j.stop_reason==='refusal')throw new Error('Couldn’t read that one. Try a different description or photo.');
 const raw=(j.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');try{return{raw,data:JSON.parse(raw)}}catch(e){throw new Error('Got an incomplete answer. Try again.')}}
async function aiFood(messages){const r=await aiJSON(FOOD_SYS,FOOD_SCHEMA,messages);if(!r.data.items||!r.data.items.length)throw new Error('No food found in that. Add a bit more detail.');return r}
function shrinkPhoto(file){return new Promise((res,rej)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const k=Math.min(1,1280/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',.82))};img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('Couldn’t read that photo'))};img.src=url})}
function logFood(e){const d=ymd();(S.food[d]=S.food[d]||[]).push({t:Date.now(),...e});if(e.fav!==false&&e.label&&e.k){const key=norm(e.label);S.favs=[{label:e.label,k:e.k,p:e.p,c:e.c||0,f:e.f||0},...S.favs.filter(x=>norm(x.label)!==key)].slice(0,10)}save();if(navigator.vibrate)navigator.vibrate(12)}
function foodSheet(done){const fin=()=>{closeSheet();(done||render)()};let photo=null,msgs=[],res=null,busy=false;
 openSheet(`<h3>Log food</h3>${S.favs.length?`<div class="k" style="margin-top:10px">Log again</div><div class="chips">${S.favs.map((x,i)=>`<button class="pill" data-fav="${i}">${esc(x.label)} <span class="mu">${fmtN(x.k)}</span></button>`).join('')}</div>`:''}
 <textarea id="fdT" placeholder="Say what you ate and roughly how much. e.g. chicken burrito bowl with rice, beans and guac, large; plus a Coke Zero" style="margin-top:12px;min-height:88px"></textarea>
 <div id="fdP"></div><div class="row" style="margin-top:8px"><label class="fbtn"><input type="file" id="fdF" accept="image/*" hidden>Add photo</label><button id="fdGo" style="flex:1;background:var(--ac);color:#00231a;border:0;font-weight:800">Estimate</button></div>
 <div id="fdO"></div>
 <div class="k" style="margin-top:18px">Quick add</div><div class="qa" style="margin-top:6px"><button data-qa="meal">Meal +75 g</button><button data-qa="shake">Shake +30 g</button></div>
 <div class="f" style="grid-template-columns:1fr 1fr auto;align-items:end"><label>Protein g<input id="cP" type="number" inputmode="numeric" placeholder="0"></label><label>kcal<input id="cK" type="number" inputmode="numeric" placeholder="0"></label><button id="cAdd">Add</button></div>`);
 const O=()=>$('#fdO');const tot=()=>res.items.reduce((a,x)=>({k:a.k+(+x.kcal||0),p:a.p+(+x.protein_g||0),c:a.c+(+x.carbs_g||0),f:a.f+(+x.fat_g||0)}),{k:0,p:0,c:0,f:0});
 const keyBox=()=>{O().innerHTML=`<div class="card" style="background:var(--card2)"><div class="k">One-time setup</div><div class="mu sm" style="margin-top:4px">Estimating from a description or photo uses Claude through your own Anthropic API key. <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Create a key</a>, paste it here, and it stays on this phone.</div><div class="row" style="margin-top:8px"><input id="fdK" type="password" autocomplete="off" placeholder="sk-ant-…" style="flex:1;min-width:0"><button id="fdKS">Save</button></div></div>`};
 const show=()=>{const t=tot();O().innerHTML=`<div class="fres"><div class="row sp"><div class="k">${esc(res.meal_name)}</div><span class="chip"><i style="background:${{high:'var(--good)',medium:'var(--warn)',low:'var(--bad)'}[res.confidence]}"></i>${res.confidence} confidence</span></div>
  ${res.items.map((x,i)=>`<div class="fit"><div class="hn"><b>${esc(x.name)}</b><small>${esc(x.portion)} · ${Math.round(x.carbs_g)} g carbs · ${Math.round(x.fat_g)} g fat</small></div><label>kcal<input type="number" inputmode="numeric" data-fi="${i}" data-fk="kcal" value="${Math.round(x.kcal)}"></label><label>prot<input type="number" inputmode="numeric" data-fi="${i}" data-fk="protein_g" value="${Math.round(x.protein_g)}"></label><button class="mini danger" data-frm="${i}">✕</button></div>`).join('')}
  <div class="ftot"><span><b id="ftK">${fmtN(t.k)}</b> kcal</span><span><b id="ftP">${Math.round(t.p)}</b> g protein</span><span>${Math.round(t.c)} g carbs</span><span>${Math.round(t.f)} g fat</span></div>
  ${res.note?`<div class="mu sm" style="margin-top:6px">${esc(res.note)}</div>`:''}
  <div class="row" style="margin-top:10px"><input id="fdFix" placeholder="Something off? e.g. “rice was 2 cups”" style="flex:1;min-width:0"><button id="fdFixGo">Fix</button></div>
  <button class="big" id="fdAdd" style="margin-top:10px">Add to today</button></div>`};
 const run=async(fix)=>{if(busy)return;if(!aiKey())return keyBox();const txt=$('#fdT').value.trim();
  if(fix){msgs.push({role:'user',content:fix})}else{if(!txt&&!photo){$('#fdT').focus();return}const c=[];if(photo)c.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:photo.split(',')[1]}});c.push({type:'text',text:txt||'Estimate the meal in this photo.'});msgs=[{role:'user',content:c}]}
  busy=true;const b=$('#fdGo');b.disabled=true;b.textContent='Estimating…';if(!res)O().innerHTML='<div class="mu sm" style="margin-top:12px">Working out portions and macros…</div>';const fb=$('#fdFixGo');if(fb){fb.disabled=true;fb.textContent='…'}
  try{const r=await aiFood(msgs);if(!$('#fdO'))return;msgs.push({role:'assistant',content:r.raw});res=r.data;show()}
  catch(e){if(fix)msgs.pop();if($('#fdO')){if(res)show();O().insertAdjacentHTML('afterbegin',`<div class="sm err" style="margin-top:10px">${esc(e.message)}</div>`)}}
  busy=false;const b2=$('#fdGo');if(b2){b2.disabled=false;b2.textContent=res?'Re-estimate':'Estimate'}};
 $('#fdF').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{photo=await shrinkPhoto(f);$('#fdP').innerHTML=`<div class="row" style="margin-top:8px"><img src="${photo}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px"><span class="mu sm" style="flex:1">Photo attached. Add a line of detail if anything isn’t obvious from the picture.</span><button class="mini" id="fdPX">Remove</button></div>`}catch(err){toast(err.message)}};
 const sh=$('#sheet');
 sh.oninput=ev=>{const i=ev.target.dataset.fi;if(i===undefined||!res)return;res.items[i][ev.target.dataset.fk]=+ev.target.value||0;const t=tot();$('#ftK').textContent=fmtN(t.k);$('#ftP').textContent=Math.round(t.p)};
 sh.onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.fav){const x=S.favs[b.dataset.fav];logFood({label:x.label,k:x.k,p:x.p,c:x.c,f:x.f});toast(x.label+' logged');return fin()}
  if(b.id==='fdGo')return run();if(b.id==='fdFixGo'){const v=$('#fdFix').value.trim();return v?run(v):$('#fdFix').focus()}
  if(b.id==='fdPX'){photo=null;$('#fdP').innerHTML='';$('#fdF').value='';return}
  if(b.id==='fdKS'){const k=$('#fdK').value.trim();if(!k)return;localStorage.setItem(AIK,k);O().innerHTML='';return run()}
  if(b.dataset.frm){res.items.splice(+b.dataset.frm,1);return res.items.length?show():(res=null,O().innerHTML='')}
  if(b.id==='fdAdd'){const t=tot();logFood({label:res.meal_name,k:Math.round(t.k),p:Math.round(t.p),c:Math.round(t.c),f:Math.round(t.f),src:'ai',items:res.items.map(x=>({n:x.name,q:x.portion,k:x.kcal,p:x.protein_g}))});toast(`${res.meal_name}: ${fmtN(t.k)} kcal, ${Math.round(t.p)} g protein`);return fin()}
  if(b.dataset.qa){b.dataset.qa==='meal'?logFood({label:'Meal',k:800,p:75,fav:false}):logFood({label:'Shake',k:200,p:30,fav:false});return fin()}
  if(b.id==='cAdd'){const p=+$('#cP').value||0,k=+$('#cK').value||0;if(!p&&!k)return;logFood({label:'Quick add',k,p,fav:false});return fin()}}}
function fuelHTML(d){const g=S.goals,ft=foodTot(d),L=foodDay(d);const bar=(l,v,max,u,col)=>`<div class="pb"><div class="row sp"><span class="k">${l}</span><span class="num"><b>${fmtN(v)}</b><span class="mu sm"> / ${fmtN(max)}${u}</span></span></div><div class="bar"><i style="width:${Math.min(100,v/max*100)}%;${col?'background:'+col:''}"></i></div></div>`;
 return`<h2>Fuel</h2><div class="card" id="fuel">${bar('Protein',ft.p,g.protein,' g')}${bar('Calories',ft.k,g.kcal,'','var(--strain)')}
 ${ft.c||ft.f?`<div class="row mu sm" style="margin-top:10px;gap:16px"><span>Carbs <b style="color:var(--tx)">${Math.round(ft.c)} g</b></span><span>Fat <b style="color:var(--tx)">${Math.round(ft.f)} g</b></span></div>`:''}
 ${L.length?`<div style="margin-top:10px">${L.map((x,i)=>`<div class="kv"><span>${esc(x.label||'Food')}</span><span class="num" style="white-space:nowrap">${fmtN(x.k||0)} kcal · ${Math.round(x.p||0)} g <button class="mini danger" data-fdel="${i}" aria-label="Remove">✕</button></span></div>`).join('')}</div>`:'<div class="mu sm" style="margin-top:10px">Nothing logged yet today.</div>'}
 <button class="big" id="fLog" style="margin-top:12px">Log food</button></div>`}
function bindFuel(re){const d=ymd();$('#fLog').onclick=()=>foodSheet(re);document.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>{foodDay(d).splice(+b.dataset.fdel,1);if(!foodDay(d).length)delete S.food[d];save();re()})}

// ===== plain-language explanations: every score says what it is, how it's built and what to do with it =====
function explain(k,D){const g=S.goals,t=ymd();let d=D;if(!d){d=t;for(let i=0;i<4;i++){const x=addDays(t,-i);if(recovery(x)||sleepRec(x).hours!==null){d=x;break}}}
 const row=(l,v,sub)=>`<div class="kv"><span>${l}${sub?`<br><span class="mu sm">${sub}</span>`:''}</span><span style="color:var(--tx);font-weight:600;white-space:nowrap">${v}</span></div>`;const P=x=>`<p class="xp">${x}</p>`;let h='',goBtn='';
 if(k==='sleep'){const r=sleepRec(d),sp=sleepPerf(d);goBtn='sleep';h=`<h3>Sleep ${sp===null?'':sp+'%'}</h3>${P('How much of the sleep you need you actually got.')}
  ${r.hours===null?P('No sleep recorded for this day yet.'):row('Asleep',hm(r.hours))+row('Your need',g.sleep+' h','set in More › Goals')+(r.bed?row('In bed',fmtMin(tod(r.bed))+' → '+fmtMin(tod(r.wake))):'')}
  ${P('<b>Read it like this:</b> 100% means you got all of it. 85% or more is a solid night. Under 70% and you will feel it in the gym.')}${P('This counts time actually asleep, not time in bed. Getting '+g.sleep+' h asleep usually takes about '+r1(g.sleep+.6)+' h in bed.')}`}
 else if(k==='rec'){const r=recovery(d);goBtn='vitals';const dir=(v,mu,up)=>{const p=(v-mu)/mu*100;return Math.abs(p)<3?'right at your normal':(p>0?'above':'below')+' your normal, which '+((p>0)===up?'helps':'pulls the score down')};
  h=`<h3>Recovery ${r?r.score+'%':''}</h3>${P('How ready your body is today, compared with <b>your own</b> normal. It is not a comparison with anyone else.')}
  ${r?(r.hrv?row('Heart-rate variability',Math.round(r.hrv.v)+' ms',`${dir(r.hrv.v,r.hrv.mu,true)} (${Math.round(r.hrv.mu)}) · half the score`):'')+(r.rhr?row('Resting heart rate',Math.round(r.rhr.v)+' bpm',`${dir(r.rhr.v,r.rhr.mu,false)} (${Math.round(r.rhr.mu)}) · a fifth of the score`):'')+(r.sleep!==undefined?row('Sleep',r.sleep+'%','about a third of the score'):''):P('Needs heart-rate variability or resting heart rate from your watch, plus about a week of history.')}
  ${P('<b style="color:var(--good)">Green, 67+</b>: better than your usual. Push.<br><b style="color:var(--warn)">Yellow, 34–66</b>: a normal day. Train as planned.<br><b style="color:var(--bad)">Red, under 34</b>: run down. Go lighter or rest.')}${P('An ordinary day after an ordinary night lands around 60, so most days should be yellow. Higher variability and a lower resting pulse than usual both mean you have recovered well.')}`}
 else if(k==='strain'){const s_=strain(d),r=recovery(d)||(latestRec()||{}).r,tg=r?strainTarget(r.band):null;goBtn='home';
  h=`<h3>Strain ${s_?s_.score:''}</h3>${P('How much you asked of your body that day, on a 0 to 100 scale. It is a score, not a percentage of anything.')}
  ${s_?row('Lifting',s_.sets?s_.sets+' sets':'none')+(s_.acts.length?s_.acts.map(a=>row(esc(a.type),a.min+' min',EFF[a.eff][0].toLowerCase())).join(''):row('Activities','none'))+row('Active calories',s_.kcal===null?'not synced':fmtN(s_.kcal))+row('Steps',s_.steps===null?'not synced':fmtN(s_.steps)):P('Nothing recorded for this day yet.')}
  ${P('<b>Under 25</b> light · <b>25–50</b> moderate · <b>50–75</b> high · <b>75+</b> all out. Each source has diminishing returns, so a second hard session adds less than the first.')}${tg?P(`<b>Today’s target: ${tg[0]}–${tg[1]}.</b> With recovery ${r.band==='g'?'in the green you can take on a big day':r.band==='y'?'in the yellow a normal session fits':'in the red keep it easy'}.`):''}`}
 else if(k==='debt'){const sd=sleepDebt();goBtn='sleep';h=`<h3>Sleep debt ${sd.n?hm(sd.debt):''}</h3>${P('The sleep you still owe yourself from the last week: every night under your '+g.sleep+' h need adds to it, every night over pays some back.')}
  ${sd.nights.map(n=>{const x=n.hours-g.sleep;return row(fmtD(ymdToT(n.date)),hm(n.hours),`<span style="color:${x>=0?'var(--good)':'var(--bad)'}">${x>=0?'+':'−'}${hm(Math.abs(x)).replace(/^0h /,'')}</span> vs need`)}).join('')||P('No nights tracked this week.')}
  ${P('<b>Read it like this:</b> under 2 h is normal life. 2–5 h, get to bed earlier for a few nights. Over 5 h, Lift stops telling you to push hard until you pay it down.')}${P('Nights your watch did not record are left out, not counted as zero.')}`}
 else if(k==='cons'){const c=consistency();goBtn='sleep';h=`<h3>Bedtime consistency</h3>${P('How much your bedtime moves around from night to night over the last two weeks. A steady schedule improves sleep quality even at the same number of hours.')}
  ${c?row('Bedtime varies by','±'+Math.round(c.sd)+' min','usually '+fmtMin(c.avg))+(c.wsd!==null?row('Wake time varies by','±'+Math.round(c.wsd)+' min','usually '+fmtMin(c.wavg)):'')+row('Verdict',c.label):P('Needs at least three tracked nights.')}
  ${P('<b>±30 min or less</b>: locked in. <b>±30–60</b>: fairly steady. <b>Over ±60</b>: irregular, and the easiest thing to fix. Your target is lights out by '+fmtBed(g.bed)+'.')}`}
 else if(k==='streak'){goBtn='habits';h=`<h3>Streaks</h3>${P('A streak counts the days you did the habit. The stack streak counts strong days: days where you did at least 80% of what you track, so one stubborn habit does not zero out the whole day.')}
  ${P('<b>Never miss twice.</b> One missed day does not reset a streak; it just does not count. Two misses in a row ends it. Research on habit formation found that a single miss barely slows a habit down, while quitting after a miss is what kills it.')}
  ${P('<b>The 66.</b> Next to each streak is how many times you have done the habit out of 66. That is the average number of repetitions before a behaviour starts to feel automatic. Some take three weeks, some take months.')}
  ${P('<b>Why stacks.</b> Each stack starts “after” something you already do every day. Tying a new habit to an existing cue is the most reliable way found so far to make it stick. Change the cues under Edit.')}`}
 openSheet(h+`<div class="row" style="margin-top:14px">${goBtn&&goBtn!==view?`<button id="xGo" style="flex:1">Open details</button>`:''}<button class="big" id="xOk" style="flex:1;min-height:44px">Got it</button></div>`);$('#xOk').onclick=closeSheet;if($('#xGo'))$('#xGo').onclick=()=>go(goBtn)}

// ===== reminders: calendar alerts (work with the app closed, no server needed) =====
const PEP=['New week. Set the tone today.','You never regret the session you showed up for.','Midweek is where the gains are made.','One more rep than last time. That’s the whole job.','Finish the week strong.','Extra work, extra result.','Start the week ahead.'];
const BYDAY=['MO','TU','WE','TH','FR','SA','SU'];
function buildICS(){const r=S.rem,g=S.goals,p2=n=>String(n).padStart(2,'0');const now=new Date();const stamp=now.toISOString().replace(/[-:]|\.\d+/g,'');
 const url=location.origin+location.pathname;const escT=x=>String(x).replace(/([,;\\])/g,'\\$1');
 // first date on/after today that falls on weekday i (0 = Monday), as a floating local time
 const first=(i,hhmm)=>{const d=new Date();d.setHours(0,0,0,0);while(((d.getDay()+6)%7)!==i)d.setDate(d.getDate()+1);return d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+'T'+hhmm.replace(':','')+'00'};
 const ev=(uid,start,rule,dur,title,desc)=>['BEGIN:VEVENT','UID:lift-'+uid+'@lift-app','DTSTAMP:'+stamp,'DTSTART:'+start,'DURATION:PT'+dur+'M','RRULE:'+rule,'SUMMARY:'+escT(title),'DESCRIPTION:'+escT(desc),'URL:'+url,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+escT(title),'TRIGGER:PT0M','END:VALARM','END:VEVENT'];
 let L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lift//Reminders//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Lift'];let n=0;
 if(r.on.gym)S.plan.days.forEach((on,i)=>{if(!on)return;n++;L=L.concat(ev('gym-'+i,first(i,r.gym),'FREQ=WEEKLY;BYDAY='+BYDAY[i],75,'Lift time. '+PEP[i],'Open Lift for today’s workout, targets and how hard to push. '+url))});
 if(r.on.bed){const[bh,bm]=g.bed.split(':').map(Number);const m=((bh*60+bm-45)%1440+1440)%1440;n++;L=L.concat(ev('bed',first((now.getDay()+6)%7,p2(Math.floor(m/60))+':'+p2(m%60)),'FREQ=DAILY',45,'Wind down. Lights out at '+fmtBed(g.bed),'Screens off, tomorrow’s recovery starts now. Evening stack: '+(S.habits.filter(h=>h.stack==='pm').map(h=>h.name).join(', ')||'none')+'.'))}
 if(r.on.am){n++;L=L.concat(ev('am',first((now.getDay()+6)%7,r.wake),'FREQ=DAILY',10,'Morning stack: '+(S.habits.filter(h=>h.stack==='am').map(h=>h.name).join(' → ')||'check in'),'After '+S.cues.am+'. Open Lift and tick them off. '+url))}
 return{text:L.concat('END:VCALENDAR').join('\r\n')+'\r\n',n}}
function remindSheet(){const r=S.rem,days=S.plan.days.map((on,i)=>on?['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]:null).filter(Boolean).join(', ');
 const tg=(k,l,sub)=>`<label class="tg"><input type="checkbox" data-ron="${k}" ${r.on[k]?'checked':''}><span><b>${l}</b><small>${sub}</small></span></label>`;
 openSheet(`<h3>Reminders</h3><div class="mu sm" style="margin-top:4px">These go into your phone’s Calendar as repeating alerts, so they arrive at the right time even when Lift is closed.</div>
 ${tg('gym','Gym time','On your training days ('+days+') with a different push each day')}<div class="f" style="grid-template-columns:1fr 1fr"><label>Gym time<input id="rGym" type="time" value="${r.gym}"></label><label>Wake time<input id="rWake" type="time" value="${r.wake}"></label></div>
 ${tg('bed','Wind-down','Every night, 45 min before your '+fmtBed(S.goals.bed)+' lights-out')}${tg('am','Morning stack','Every morning at wake time, listing your morning habits')}
 <button class="big" id="rAdd" style="margin-top:14px">Add to Calendar</button><div class="mu sm" style="margin-top:8px">Your phone will show the events and ask to add them. To change or stop them later, delete the “Lift” events in Calendar (choose “all future events”), then add again from here.</div>`);
 const sv=()=>{document.querySelectorAll('[data-ron]').forEach(c=>r.on[c.dataset.ron]=c.checked?1:0);if(/^\d\d:\d\d$/.test($('#rGym').value))r.gym=$('#rGym').value;if(/^\d\d:\d\d$/.test($('#rWake').value))r.wake=$('#rWake').value;save()};
 $('#sheet').onchange=sv;$('#rAdd').onclick=()=>{sv();const o=buildICS();if(!o.n)return toast('Turn on at least one reminder');dl('lift-reminders.ics',o.text,'text/calendar');toast(o.n+' reminder'+(o.n>1?'s':'')+' ready to add')}}

// ===== screen time =====
// iOS gives no app (or Shortcut) access to Screen Time numbers, so they come in by screenshot or by hand.
const SCR_SCHEMA={type:'object',properties:{days:{type:'array',items:{type:'object',properties:{date:{type:'string'},total_min:{type:'number'},pickups:{type:'number'},top_apps:{type:'array',items:{type:'object',properties:{name:{type:'string'},min:{type:'number'}},required:['name','min'],additionalProperties:false}}},required:['date','total_min','pickups','top_apps'],additionalProperties:false}},note:{type:'string'}},required:['days','note'],additionalProperties:false};
const SCR_SYS=`You read iPhone Screen Time screenshots for one person's tracker.

Return one entry for each day whose total screen time is printed as a number in the screenshot. "date" is YYYY-MM-DD, worked out from the labels in the image ("Today", "Yesterday", a weekday, or a date) and the current date given in the message. "total_min" is that day's total in minutes. In a week view, include only days with an exact printed figure; never estimate from bar heights, and never use the "daily average" as a day. "pickups" is that day's pickup count if shown, otherwise 0. "top_apps" lists up to five apps with their minutes when they clearly belong to that single day, otherwise an empty list. "note" is one short sentence if something could not be read, otherwise an empty string. If the image is not a Screen Time screen, return no days and say so in "note".`;
const scrDays=n=>{const t=ymd();return[...Array(n)].map((_,i)=>{const d=addDays(t,i-n+1);return{d,x:S.screen[d]||null}})};
function screenHTML(){const g=S.goals.screen,D=scrDays(14),have=D.filter(q=>q.x),last=[...D].reverse().find(q=>q.x),w=scrDays(7).filter(q=>q.x),mx=Math.max(g*1.5,...have.map(q=>q.x.min));
 return`<h2>Screen time</h2><div class="card"><div class="row sp"><div><div class="stat">${last?hm(last.x.min/60):'—'}</div><div class="mu sm">${last?`${dayLabel(last.d).toLowerCase()} · limit ${hm(g/60)}${last.x.pk?' · '+last.x.pk+' pickups':''}`:'Nothing logged yet'}</div></div>${w.length?`<div style="text-align:right"><div class="k">7-day avg</div><div class="stat" style="font-size:20px;color:${avg(w.map(q=>q.x.min))<=g?'var(--good)':'var(--warn)'}">${hm(avg(w.map(q=>q.x.min))/60)}</div></div>`:''}</div>
 ${have.length?`<div class="rbars" style="height:64px;background:none">${D.map(q=>`<i style="height:${q.x?Math.max(4,q.x.min/mx*100):0}%;background:${q.x?(q.x.min<=g?'var(--good)':'var(--warn)'):'none'}"></i>`).join('')}</div><div class="row sp mu sm"><span>14 days</span><span>green = under your limit</span></div>`:''}
 ${last&&last.x.top&&last.x.top.length?`<div style="margin-top:8px">${last.x.top.slice(0,4).map(a=>`<div class="kv"><span>${esc(a.n)}</span><span>${hm(a.m/60)}</span></div>`).join('')}</div>`:''}
 <button id="scrAdd" style="width:100%;margin-top:12px">Log screen time</button></div>`}
function screenSheet(done){const fin=()=>{closeSheet();(done||render)()};let found=null;
 openSheet(`<h3>Screen time</h3><div class="mu sm" style="margin-top:4px">iPhone doesn’t let any app read Screen Time, so add it one of two ways. Fastest: screenshot <b>Settings › Screen Time › See All App & Website Activity</b> and Lift reads it.</div>
 <label class="fbtn" style="width:100%;margin-top:12px"><input type="file" id="scF" accept="image/*" hidden>Read a screenshot</label><div id="scO"></div>
 <div class="k" style="margin-top:18px">Or type it in</div><div class="f" style="grid-template-columns:1.3fr 1fr 1fr 1fr;align-items:end"><label>Day<select id="scW"><option value="0">Today</option><option value="1" selected>Yesterday</option><option value="2">2 days ago</option></select></label><label>Hours<input id="scH" type="number" inputmode="numeric" placeholder="0"></label><label>Min<input id="scM" type="number" inputmode="numeric" placeholder="0"></label><label>Pickups<input id="scP" type="number" inputmode="numeric" placeholder="opt."></label></div>
 <button id="scS" style="width:100%;margin-top:8px">Save</button>
 <div class="f" style="grid-template-columns:1fr auto;align-items:end;margin-top:14px"><label>Daily limit (hours)<input id="scG" type="number" inputmode="decimal" step="0.25" value="${r1(S.goals.screen/60)}"></label><button id="scGS">Set</button></div>`);
 const O=()=>$('#scO');
 $('#scF').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!aiKey()){O().innerHTML='<div class="sm err" style="margin-top:8px">Reading screenshots uses your Claude API key. Add it under More › AI food logging, or type the numbers in below.</div>';return}
  O().innerHTML='<div class="mu sm" style="margin-top:8px">Reading the screenshot…</div>';
  try{const img=await shrinkPhoto(f);const now=new Date();const r=await aiJSON(SCR_SYS,SCR_SCHEMA,[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:img.split(',')[1]}},{type:'text',text:`Today is ${ymd()} (${now.toLocaleDateString('en-US',{weekday:'long'})}).`}]}]);if(!$('#scO'))return;
   found=(r.data.days||[]).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)&&x.date<=ymd()&&x.total_min>0&&x.total_min<=1440);
   O().innerHTML=found.length?`<div class="fres">${found.map(x=>`<div class="kv"><span>${fmtD(ymdToT(x.date))}</span><span style="color:var(--tx)">${hm(x.total_min/60)}${x.pickups?' · '+x.pickups+' pickups':''}</span></div>`).join('')}${r.data.note?`<div class="mu sm">${esc(r.data.note)}</div>`:''}<button class="big" id="scOK" style="margin-top:10px">Save ${found.length} day${found.length>1?'s':''}</button></div>`:`<div class="sm err" style="margin-top:8px">${esc(r.data.note||'Couldn’t find a daily total in that screenshot.')}</div>`}
  catch(err){if($('#scO'))O().innerHTML=`<div class="sm err" style="margin-top:8px">${esc(err.message)}</div>`}};
 $('#sheet').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.id==='scOK'&&found){for(const x of found)S.screen[x.date]={min:Math.round(x.total_min),...(x.pickups?{pk:Math.round(x.pickups)}:{}),top:(x.top_apps||[]).slice(0,5).map(a=>({n:a.name,m:Math.round(a.min)})),src:'shot'};save();toast('Screen time saved');return fin()}
  if(b.id==='scS'){const m=(+$('#scH').value||0)*60+(+$('#scM').value||0);if(m<=0||m>1440)return $('#scH').focus();const d=addDays(ymd(),-+$('#scW').value),pk=$('#scP').value;S.screen[d]={min:Math.round(m),...(pk!==''?{pk:Math.round(+pk)}:{}),src:'manual'};save();toast('Screen time saved');return fin()}
  if(b.id==='scGS'){const v=+$('#scG').value;if(v>0&&v<=24){S.goals.screen=Math.round(v*60);save();toast('Limit set to '+hm(v))}}}}

// ---- boot (kept last so every script has loaded) ----
Object.assign(window.LIFT,{screenHTML,aiJSON,buildICS,explain,coach,actsOn,exAll,aiFood});
document.querySelectorAll('nav button').forEach(b=>b.disabled=true);$('#view').innerHTML='<div class="card mu">Restoring your saved workouts…</div>';
Store.init({get:()=>S,cloudGet:sanitizedCloudState,adopt,onStatus}).then(()=>{storageReady=true;document.querySelectorAll('nav button').forEach(b=>b.disabled=false);render();loadHealth()});
setInterval(()=>{if(document.visibilityState==='visible')loadHealth()},5*60e3);
if('serviceWorker'in navigator){navigator.serviceWorker.register('sw.js').then(r=>setInterval(()=>r.update().catch(()=>{}),30*60e3)).catch(()=>{})}

