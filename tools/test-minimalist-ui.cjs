// Browser regression for the four- and five-day minimalist training styles.
// Serve Lift locally; set LIFT_URL / CHROMIUM_PATH when needed. Synthetic data only.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/health.json*',route=>route.fulfill({contentType:'application/json',body:'{"updated":null,"days":[]}'}));
  const boot=async()=>page.waitForFunction(()=>window.LIFT?.S&&!document.querySelector('nav [data-v="more"]').disabled);
  const program=async()=>{await page.click('nav [data-v="more"]');await page.click('[data-go="program"]');};
  const change=async(selector,value)=>{await page.locator(selector).fill(value);await page.locator(selector).press('Tab');};
  await page.goto(process.env.LIFT_URL||'http://127.0.0.1:8000');await boot();
  assert.equal(await page.evaluate(()=>typeof MinimalistPlan),'object','minimalist module loaded');
  await page.evaluate(()=>{
   const s=LIFT.S;s.sessions=[{id:'preserved-history',date:Date.now()-86400000,end:Date.now()-86000000,dayId:'archived-day',dayName:'Past custom session',entries:[{name:'Incline DB Press',muscle:'Chest',compound:1,equipment:'dumbbell',basis:'per-hand',notes:'Saved workout fixture',sets:[{w:35,r:8,rir:2,done:true}]}]}];
   save();
  });
  const history=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.sessions)));
  await program();await page.click('[data-tpl="minimalist4"]');
  assert.equal(await page.getAttribute('[data-length="45"]','aria-pressed'),'true','new style defaults to 45 minutes');
  assert.equal(await page.locator('.plan-day').count(),4);
  const four=await page.evaluate(()=>LIFT.S.days.map(day=>WorkoutPlan.preview(day,LIFT.S.plan.length,LIFT.S.settings)));
  assert.equal(four.length,4);
  for(const day of four){
   assert.equal(day.exercises.length,4,day.name+' has four exercises');
   for(const exercise of day.exercises){
    assert.ok(exercise.sets>=2&&exercise.sets<=3,'two or three working sets');
    assert.equal(exercise.rirMin,1);assert.equal(exercise.rirMax,2);
    assert.ok([90,120].includes(exercise.restSeconds),'template has 90/120-second rest');
    assert.equal(typeof exercise.cue,'string');assert.ok(exercise.cue.length>0);
   }
  }
  assert.deepEqual(await page.evaluate(()=>LIFT.S.sessions),history,'choosing a style preserves history');
  await change('#dName','My minimalist day');
  // Empty per-exercise rest means use the global settings, not a zero-second override.
  await change('[data-k="restSeconds"] >> nth=0','');
  assert.ok(await page.evaluate(()=>LIFT.S.days[0].exercises[0].restSeconds==null||LIFT.S.days[0].exercises[0].restSeconds===''),'blank rest uses the fallback');
  const customRest=four[0].exercises[0].restSeconds===90?120:90;
  await change('[data-k="restSeconds"] >> nth=0',String(customRest));
  await page.click('[data-pd="6"]');
  const customized=await page.evaluate(()=>JSON.parse(JSON.stringify({days:LIFT.S.days,plan:LIFT.S.plan})));
  await page.click('[data-tpl="minimalist5"]');
  assert.equal(await page.locator('.plan-day').count(),5);
  assert.ok(await page.evaluate(()=>LIFT.S.days.every(day=>day.exercises.length===4)),'five-day style has four exercises per day');
  assert.equal(await page.evaluate(()=>LIFT.S.plan.days.filter(Boolean).length),5);
  await page.click('[data-tpl="minimalist4"]');
  assert.deepEqual(await page.evaluate(()=>({days:LIFT.S.days,plan:LIFT.S.plan})),customized,'custom routine and schedule restored');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.sessions),history);
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'program fits '+width+'px');
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'/tmp/lift-minimalist-program.png',animations:'disabled',fullPage:true});
  // The exercise-specific prescription must win over different global defaults.
  await change('#rc','17');await change('#ri','19');
  await page.reload();await boot();await page.click('nav [data-v="home"]');
  const expected=await page.evaluate(()=>WorkoutPlan.preview(LIFT.nextDay(),LIFT.S.plan.length,LIFT.S.settings));
  const prescriptions=await page.evaluate(()=>WorkoutPlan.preview(LIFT.nextDay(),LIFT.S.plan.length,LIFT.S.settings).exercises.map(exercise=>WorkoutPlan.prescription(exercise)));
  await page.click('#start');
  const started=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.active)));
  assert.equal(started.program,'minimalist4');
  assert.deepEqual(started.entries.map(entry=>[entry.name,entry.sets.length]),expected.exercises.map(exercise=>[exercise.name,exercise.sets]));
  started.entries.forEach((entry,index)=>{
   for(const field of ['rirMin','rirMax','restSeconds','cue'])assert.equal(entry[field],prescriptions[index][field],field+' carried into session');
   assert.ok(entry.sets.every(set=>set.rir===''),'prescribed RIR does not become a logged effort');
  });
  assert.equal(started.entries[0].restSeconds,customRest);
  // Swapping a movement changes its identity, not the session's effort/rest prescription.
  await page.locator('[data-exm]').first().click();
  await page.click('#sheet [data-a="swap"]');
  await page.locator('#exQ').fill('Flat DB Press');
  await page.locator('#sheet').getByRole('button',{name:/^Flat DB Press/}).first().click();
  const swapped=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.active.entries[0])));
  assert.equal(swapped.name,'Flat DB Press');
  assert.equal(swapped.sets.length,started.entries[0].sets.length,'swap retains working set count');
  assert.equal(swapped.rirMin,started.entries[0].rirMin);assert.equal(swapped.rirMax,started.entries[0].rirMax);
  assert.equal(swapped.restSeconds,customRest,'swap retains exercise rest prescription');
  assert.ok(swapped.sets.every(set=>set.rir===''),'swap does not log prescribed RIR as actual effort');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'/tmp/lift-minimalist-workout.png',animations:'disabled',fullPage:false});
  await change('[data-f="w"] >> nth=0','40');await change('[data-f="r"] >> nth=0','8');
  await page.locator('[data-a="chk"]').first().click();
  const timer=await page.locator('#timerTxt').innerText();
  const [minutes,seconds]=timer.split(':').map(Number),remaining=minutes*60+seconds;
  assert.ok(remaining<=customRest&&remaining>=customRest-2,'completed set uses prescribed rest, got '+timer);
  assert.ok(remaining>19,'rest timer did not use changed global defaults');
  const active=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.active)));
  assert.equal(active.entries[0].sets[0].rir,'','unlogged actual RIR remains blank');
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'workout fits '+width+'px');
  }
  await program();await page.click('[data-tpl="minimalist5"]');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.active),active,'style switch preserves active prescription and completed sets');
  await page.reload();await boot();
  assert.deepEqual(await page.evaluate(()=>LIFT.S.active),active,'active session survives reload');
  await page.click('nav [data-v="home"]');await page.click('#fin');
  const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.sessions)));
  assert.equal(saved.length,2);assert.deepEqual(saved[0],history[0]);
  assert.equal(saved[1].entries[0].restSeconds,customRest);assert.equal(saved[1].entries[0].rirMin,1);assert.equal(saved[1].entries[0].rirMax,2);
  assert.equal(saved[1].entries[0].sets[0].rir,'');assert.equal(saved[1].entries[0].sets[0].done,true);
  await page.reload();await boot();
  assert.deepEqual(await page.evaluate(()=>LIFT.S.sessions),saved,'finished session and historical prescriptions survive reload');
  assert.equal(await page.evaluate(()=>LIFT.S.active),null);
  await page.click('nav [data-v="home"]');await page.click('[data-go="progress"]');
  assert.doesNotMatch(await page.locator('#view').innerText(),/target\s+10\s*[–-]\s*20/i,'minimalist progress does not impose a universal 10–20-set target');
  assert.deepEqual(errors,[]);
  console.log('PASS: minimalist 4/5-day styles, four-exercise previews, RIR/rest prescriptions, blank rest fallback, edit/schedule restoration, timer override, swap prescription retention, active-session protection, reload/history, minimalist volume guidance, and 320/390px layouts.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1;});
