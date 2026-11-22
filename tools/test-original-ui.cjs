// Browser regression for the user's source-exact four-day original plan.
// Uses isolated synthetic data. Serve Lift and optionally set LIFT_URL / CHROMIUM_PATH.
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
  const compareOriginal=async()=>{
   const days=await page.evaluate(()=>LIFT.S.days.map(day=>WorkoutPlan.preview(day,LIFT.S.plan.length,LIFT.S.settings)));
   assert.deepEqual(days.map(day=>day.exercises.length),[5,5,6,7],'all source exercises remain in Full');
   assert.deepEqual(days.map(day=>day.exercises.reduce((sum,exercise)=>sum+exercise.sets,0)),[13,13,14,17],'working-set totals match the source');
   assert.match(days[3].exercises.at(-1).name,/^cable crunch$/i);
   return days;
  };
  await page.goto(process.env.LIFT_URL||'http://127.0.0.1:8000');await boot();
  assert.equal(await page.evaluate(()=>typeof OriginalPlan),'object','original plan module loaded');
  await page.evaluate(()=>{
   LIFT.S.sessions=[{id:'original-test-history',date:Date.now()-86400000,end:Date.now()-86000000,dayId:'old-custom',dayName:'Saved custom workout',entries:[{name:'Incline DB Press',muscle:'Chest',compound:1,equipment:'dumbbell',basis:'per-hand',notes:'Historical fixture',sets:[{w:30,r:8,rir:2,done:true}]}]}];save();
  });
  const history=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.sessions)));
  // Preserve an already customized minimalist routine when correcting the plan.
  await program();await page.click('[data-tpl="minimalist4"]');
  await page.click('[data-length="30"]');await change('#dName','My earlier minimalist day');await page.click('[data-pd="6"]');
  const minimalist=await page.evaluate(()=>JSON.parse(JSON.stringify({days:LIFT.S.days,plan:LIFT.S.plan})));
  await page.click('nav [data-v="home"]');
  await page.locator('[data-use-original]').first().click();
  assert.equal(await page.evaluate(()=>LIFT.S.plan.tpl),'original4','home action selects the original plan');
  assert.equal(await page.evaluate(()=>LIFT.S.plan.length),'full','first selection preserves the complete source routine');
  await program();assert.equal(await page.getAttribute('[data-length="full"]','aria-pressed'),'true');
  assert.equal(await page.locator('.plan-day').count(),4);
  assert.deepEqual(await page.evaluate(()=>LIFT.S.plan.days),[1,1,0,1,0,1,0],'Monday, Tuesday, Thursday, Saturday');
  const full=await compareOriginal();
  await page.locator('.plan-day > summary').last().click();
  await page.locator('#toast').waitFor({state:'hidden'});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'/tmp/lift-original-program.png',animations:'disabled',fullPage:true});
  await page.locator('.plan-day').last().scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/lift-original-saturday.png',animations:'disabled',fullPage:false});
  assert.deepEqual(await page.evaluate(()=>LIFT.S.sessions),history,'selecting original does not change history');
  for(const day of full)for(const exercise of day.exercises){
   assert.equal(exercise.rirMin,1);assert.equal(exercise.rirMax,3);
   assert.ok(Number.isFinite(exercise.restSeconds)&&exercise.restSeconds>0,'prescribed rest is retained');
   assert.ok(exercise.compound?exercise.restSeconds===120:exercise.restSeconds>=60&&exercise.restSeconds<=90,'rest matches compound/accessory guidance');
  }
  await page.click('[data-length="45"]');
  await page.locator('#originalLengthWarning').waitFor({state:'visible'});
  const shorter=await page.evaluate(()=>WorkoutPlan.preview(LIFT.S.days[3],LIFT.S.plan.length,LIFT.S.settings));
  assert.ok(shorter.exercises.length<7,'45 minutes explicitly shortens Saturday');
  assert.ok(shorter.exercises.reduce((sum,exercise)=>sum+exercise.sets,0)<17);
  assert.equal(await page.evaluate(()=>LIFT.S.days[3].exercises.length),7,'shortening preserves the full stored routine');
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'original plan fits '+width+'px');
  }
  await page.click('[data-length="full"]');
  assert.equal(await page.locator('#originalLengthWarning').isVisible(),false,'Full clears the shortening warning');
  await compareOriginal();
  await page.reload();await boot();assert.equal(await page.evaluate(()=>LIFT.S.plan.length),'full','Full persists across reload');
  await program();await page.click('[data-tpl="minimalist4"]');
  assert.deepEqual(await page.evaluate(()=>({days:LIFT.S.days,plan:LIFT.S.plan})),minimalist,'previous minimalist edits and schedule survive');
  await page.click('[data-tpl="original4"]');await compareOriginal();
  assert.equal(await page.evaluate(()=>LIFT.S.plan.length),'full','returning to original restores Full');
  const saturdayId=await page.evaluate(()=>LIFT.S.days[3].id);
  await page.click('nav [data-v="home"]');
  await page.locator(`.alt[data-id="${saturdayId}"]`).click();
  await page.waitForFunction(()=>LIFT.S.active?.program==='original4');
  const activeStart=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.active)));
  assert.equal(activeStart.entries.length,7,'Saturday starts all seven movements');
  assert.equal(activeStart.entries.reduce((sum,entry)=>sum+entry.sets.length,0),17,'Saturday starts all seventeen working sets');
  assert.match(activeStart.entries.at(-1).name,/^cable crunch$/i,'Cable Crunch is not silently omitted');
  for(const entry of activeStart.entries){
   assert.equal(entry.rirMin,1);assert.equal(entry.rirMax,3);assert.ok(entry.restSeconds>0);
   assert.ok(entry.sets.every(set=>set.rir===''),'prescribed RIR is not logged as actual effort');
  }
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Saturday workout fits '+width+'px');
  }
  await change('[data-f="w"] >> nth=0','40');await change('[data-f="r"] >> nth=0','8');await page.locator('[data-a="chk"]').first().click();
  const active=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.active)));
  await program();await page.click('[data-tpl="minimalist4"]');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.active),active,'switching back does not truncate the active original session');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.sessions),history);
  await page.reload();await boot();assert.deepEqual(await page.evaluate(()=>LIFT.S.active),active,'active original session survives reload');
  await page.click('nav [data-v="home"]');await page.click('#fin');
  const completed=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.sessions)));
  assert.equal(completed.length,2);assert.deepEqual(completed[0],history[0]);assert.equal(completed[1].program,'original4');
  assert.equal(completed[1].entries[0].rirMin,1);assert.equal(completed[1].entries[0].rirMax,3);assert.equal(completed[1].entries[0].sets[0].rir,'');
  await page.reload();await boot();assert.deepEqual(await page.evaluate(()=>LIFT.S.sessions),completed);assert.equal(await page.evaluate(()=>LIFT.S.active),null);
  assert.deepEqual(errors,[]);
  console.log('PASS: home original-plan action, exact source totals/schedule, explicit shortening warning, Full restoration/reload, minimalist customization retention, complete seven-exercise Saturday, RIR/rest metadata, active/history preservation, and 320/390px layouts.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1;});
