// Browser regression: runtime guidance enriches saved workouts without resetting them.
// Run against a local Lift server; LIFT_URL and CHROMIUM_PATH are optional.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/health.json*',route=>route.fulfill({contentType:'application/json',body:'{"updated":null,"days":[]}'}));
  const boot=async()=>page.waitForFunction(()=>window.LIFT?.S&&!document.querySelector('nav [data-v="more"]').disabled);
  const program=async()=>{await page.click('nav [data-v="more"]');await page.click('[data-go="program"]');};
  const selectStyle=async key=>{
   const button=page.locator(`[data-tpl="${key}"]`);
   if(!await button.isVisible())await page.locator('details.other-styles > summary').click();
   await button.click();
  };
  const captureState=()=>page.evaluate(()=>JSON.parse(JSON.stringify({days:LIFT.S.days,sessions:LIFT.S.sessions,active:LIFT.S.active})));
  const change=async(selector,value)=>{await page.locator(selector).fill(value);await page.locator(selector).press('Tab');};
  const checkWidths=async label=>{for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' fits '+width+'px');}};
  await page.goto(process.env.LIFT_URL||'http://127.0.0.1:8000');await boot();
  assert.equal(await page.evaluate(()=>typeof ExerciseGuidance.forExercise),'function');
  await program();await selectStyle('original4');
  // A preexisting original plan and active session have no serialized guidance data.
  await page.evaluate(()=>{
   const s=LIFT.S,day=s.days[0];
   s.sessions=[{id:'old-guidance-history',date:Date.now()-86400000,end:Date.now()-86000000,dayId:'old-custom',dayName:'Historical workout',entries:[{name:'Incline dumbbell press',equipment:'dumbbell',basis:'per-hand',muscle:'Chest',compound:1,notes:'Old note is retained',sets:[{w:30,r:8,rir:2,done:true}]}]}];
   s.active={id:'old-guidance-active',date:Date.now(),program:'original4',length:'full',dayId:day.id,dayName:day.name,entries:day.exercises.map(e=>({exId:e.id,name:e.name,muscle:e.muscle,compound:e.compound,min:e.min,max:e.max,inc:e.inc,...TrainingCoach.equipment(e),...WorkoutPlan.prescription(e),notes:'',plannedSetCount:e.sets,sets:Array.from({length:e.sets},()=>({w:'',r:e.min,rir:'',done:false}))}))};
   s.active.entries[0].cue='Log the weight of one dumbbell. Use the same bench angle.';
   for(const d of s.days)for(const e of d.exercises)delete e.guidance;
   save();
  });
  const old=await captureState();
  await page.reload();await boot();await page.click('nav [data-v="home"]');
  assert.deepEqual(await captureState(),old,'loading and showing guidance keeps saved days/history/active unchanged');
  const first=()=>page.locator('.ex').first();
  const target=await first().locator('.lift-target').innerText();
  assert.match(target,/6\s*[–-]\s*10/);assert.match(target,/reps/i);assert.match(target,/\b3\b/);
  assert.match(target,/1\s*[–-]\s*3/);assert.match(target,/RIR|reserve/i);assert.match(target,/rest|120|2\s*min/i);
  assert.ok(await page.evaluate(()=>LIFT.S.active.entries.every(e=>e.sets.every(set=>set.rir===''))),'rendering effort targets does not fill actual RIR');
  const initialGuide=first().locator('details.lift-guide');
  assert.equal(await initialGuide.locator('summary').innerText(),'How to approach this lift');
  await initialGuide.locator('summary').click();
  assert.ok(await initialGuide.locator('li').count()>=2,'specific form cues are visible');
  const initialText=await initialGuide.innerText();
  assert.match(initialText,/dumbbell|bench|incline/i);assert.match(initialText,/weight|load/i);assert.match(initialText,/range|increase|progress/i);
  assert.deepEqual(await captureState(),old,'opening guidance does not change weights, notes, history, or routines');
  await checkWidths('expanded workout guidance');
  await page.locator('#toast').waitFor({state:'hidden'});await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'/tmp/lift-guidance-workout.png',animations:'disabled',fullPage:false});
  // A legacy cue stays in saved data but must not override the current equipment or basis.
  await first().locator('[data-equipment]').click();await page.locator('#eqType').selectOption('machine');
  await page.locator('#eqRemember').uncheck();await page.click('#eqSave');
  await first().locator('details.lift-guide summary').click();
  const relabeledMachineText=await first().locator('details.lift-guide').innerText();
  assert.doesNotMatch(relabeledMachineText,/one dumbbell|per hand/i,'legacy dumbbell cue is not shown for a relabeled machine');
  assert.match(await page.evaluate(()=>LIFT.S.active.entries[0].cue),/one dumbbell/,'display adaptation does not rewrite stored legacy cues');
  await first().locator('[data-equipment]').click();await page.locator('#eqType').selectOption('dumbbell');
  await page.locator('#eqBasis').selectOption('total');await page.locator('#eqRemember').uncheck();await page.click('#eqSave');
  await first().locator('details.lift-guide summary').click();
  const totalWeightText=await first().locator('details.lift-guide').innerText();
  assert.doesNotMatch(totalWeightText,/one dumbbell|per hand/i,'total dumbbell logging never receives a per-hand instruction');
  assert.equal(await page.evaluate(()=>LIFT.S.active.entries[0].basis),'total');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.days),old.days,'temporary equipment checks do not modify future routines');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'/tmp/lift-guidance-total-weight.png',animations:'disabled',fullPage:false});
  const assistanceChecks=await page.evaluate(()=>{
   const now=Date.now(),base={name:'Pull-up machine',equipment:'machine',basis:'stack',variant:'Test machine',compound:1,sets:3,min:6,max:10,inc:5};
   return [{current:'Used 50 lb assistance',past:''},{current:'',past:'Used 50 lb assistance'},{current:'Used 50 lb counterweight',past:''}].map(notes=>{
    const entry={...base,notes:notes.current},logged={...base,notes:notes.past,plannedSetCount:3,sets:Array.from({length:3},()=>({w:50,r:10,rir:2,done:true}))};
    const result=TrainingCoach.recommend({entry,sessions:[{id:'legacy-assistance',date:now-86400000,entries:[logged]}],health:{level:'ready',asOf:ymd(now)},now});
    return{status:result.status,up:result.up,weights:result.sets.map(set=>set.w)};
   });
  });
  for(const result of assistanceChecks){assert.equal(result.status,'manual');assert.equal(result.up,false);assert.deepEqual(result.weights,[50,50,50]);}
  // Swapping must choose cues for the new machine, not retain dumbbell instructions.
  await first().locator('[data-exm]').click();await page.click('#sheet [data-a="swap"]');await page.locator('#exQ').fill('Machine Chest Press');
  await page.locator('#sheet').getByRole('button',{name:/^Machine Chest Press/}).first().click();
  await first().locator('details.lift-guide summary').click();
  const machineText=await first().locator('details.lift-guide').innerText();
  assert.match(machineText,/machine|seat|handle/i);assert.doesNotMatch(machineText,/one dumbbell|per hand/i,'machine guide does not inherit dumbbell weight convention');
  assert.equal(await page.evaluate(()=>LIFT.S.active.entries[0].equipment),'machine');
  // Unknown exercise names receive cautious generic guidance without guessed form cues.
  await page.click('#wAdd');await page.locator('#exQ').fill('Unfamiliar custom exercise');await page.click('#sheet [data-new="1"]');
  const custom=page.locator('.ex').last();await custom.locator('details.lift-guide summary').click();
  const genericText=await custom.locator('details.lift-guide').innerText();
  assert.match(genericText,/setup|form|technique|comfortable|controlled|light/i);
  assert.doesNotMatch(genericText,/bench angle|seat height|lat pulldown/i,'unknown movement does not borrow a named exercise technique');
  const activeBeforePreview=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.active)));
  await program();
  const evidence=page.locator('details.training-evidence');
  assert.equal(await evidence.locator('summary').innerText(),'Why these rep and effort targets?');
  await evidence.locator('summary').click();assert.equal(await evidence.locator('a').count(),4,'research sources are available without leaving the plan');
  assert.ok((await evidence.locator('a').evaluateAll(links=>links.map(link=>link.href))).every(url=>url.startsWith('https://')));
  // Guidance is also available when previewing an existing routine.
  const saturday=()=>page.locator('.plan-day').nth(3);
  await saturday().locator(':scope > summary').click();
  await saturday().locator('details.lift-guide summary').first().click();
  assert.match(await saturday().locator('details.lift-guide').first().innerText(),/per side|each side|each leg/i,'unilateral squats explain how to count reps');
  await saturday().locator('details.lift-guide summary').nth(3).click();
  assert.match(await saturday().locator('details.lift-guide').nth(3).innerText(),/per side|each side|each arm/i,'single-arm pulldown guidance is per side');
  const thursday=page.locator('.plan-day').nth(2);await thursday.locator(':scope > summary').click();await thursday.locator('details.lift-guide summary').first().click();
  const assistedText=await thursday.locator('details.lift-guide').first().innerText();
  assert.match(assistedText,/assistan|assisted/i);assert.match(assistedText,/manual|less assistance|not.*increase|no automatic/i,'assistance is not treated as a normal weight increase');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.active),activeBeforePreview,'previewing guides does not alter an active workout');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.days),old.days,'runtime guides preserve all 23 programmed exercises and ranges');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.sessions),old.sessions);
  // Rep cues are generated from current programming, not hard-coded template ranges.
  await change('[data-k="min"] >> nth=0','7');await change('[data-k="max"] >> nth=0','11');
  const monday=page.locator('.plan-day').first();await monday.locator(':scope > summary').click();
  assert.match(await monday.innerText(),/7\s*[–-]\s*11/);
  await monday.locator('details.lift-guide summary').first().click();
  assert.match(await monday.locator('details.lift-guide').first().innerText(),/7\s*[–-]\s*11/);
  assert.deepEqual(await page.evaluate(()=>LIFT.S.active),activeBeforePreview,'editing future ranges leaves current workout intact');
  await checkWidths('program guidance');
  assert.deepEqual(await page.evaluate(()=>LIFT.S.days.map(d=>[d.exercises.length,d.exercises.reduce((n,e)=>n+e.sets,0)])),[[5,13],[5,13],[6,14],[7,17]],'source exercise and set counts remain intact');
  assert.deepEqual(errors,[]);
  console.log('PASS: existing-state guidance without resets, visible rep/effort/rest targets, blank actual RIR, no mutations on expand, dynamic rep ranges, machine-specific swap cues, stale-cue/total-weight protection, legacy-assistance safeguards, unknown-exercise fallback, unilateral counts, assisted-pull-up guidance, and mobile layouts.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1;});
