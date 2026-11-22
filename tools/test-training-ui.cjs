// Run with Playwright installed and the app served at LIFT_URL (default localhost:8000).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try {
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/health.json*',r=>r.fulfill({contentType:'application/json',body:'{"updated":null,"days":[]}'}));
 await page.goto(process.env.LIFT_URL||'http://127.0.0.1:8000');
 await page.waitForFunction(()=>window.LIFT?.S);
 // Seed a legacy state through the existing public app object, then reload it.
 await page.evaluate(()=>{
  const s=LIFT.S;s.v=9;delete s.programs;delete s.plan.length;
  s.sessions=[{id:'past',date:Date.now()-86400000,dayId:'ua',dayName:'Upper A',end:Date.now()-86000000,entries:[{name:'Incline DB Press',muscle:'Chest',compound:1,sets:[{w:40,r:10,done:true,rir:2}]}]}];
  s.mt=Date.now();localStorage.setItem('lift.v1',JSON.stringify(s));
 });
 await page.reload();await page.waitForFunction(()=>window.LIFT?.S.sessions.length===1);
 await page.click('nav [data-v="more"]');await page.click('[data-go="program"]');
 assert.equal(await page.getAttribute('[data-length="full"]','aria-pressed'),'true');
 await page.click('[data-length="45"]');
 await page.locator('#dName').fill('My Upper A');await page.locator('#dName').press('Tab');
 const before=await page.evaluate(()=>JSON.parse(JSON.stringify({days:LIFT.S.days,plan:LIFT.S.plan,sessions:LIFT.S.sessions})));
 await page.click('[data-tpl="fb3"]');await page.click('[data-length="30"]');
 await page.click('[data-tpl="ppl3"]');await page.click('[data-tpl="ul4"]');
 assert.deepEqual(await page.evaluate(()=>({days:LIFT.S.days,plan:LIFT.S.plan,sessions:LIFT.S.sessions})),before);
 await page.reload();await page.click('nav [data-v="home"]');
 assert.equal(await page.getAttribute('[data-length="45"]','aria-pressed'),'true');
 const expected=await page.evaluate(()=>WorkoutPlan.preview(LIFT.nextDay(),LIFT.S.plan.length,LIFT.S.settings));
 await page.click('#start');
 assert.deepEqual(await page.evaluate(()=>LIFT.S.active.entries.map(e=>[e.name,e.sets.length])),expected.exercises.map(e=>[e.name,e.sets]));
 await page.locator('[data-f="w"]').first().fill('45');await page.locator('[data-a="chk"]').first().click();
 const active=await page.evaluate(()=>JSON.parse(JSON.stringify(LIFT.S.active)));
 await page.click('nav [data-v="more"]');await page.click('[data-go="program"]');
 await page.click('[data-tpl="fb3"]');await page.click('[data-length="60"]');
 assert.deepEqual(await page.evaluate(()=>LIFT.S.active),active);
 await page.reload();assert.deepEqual(await page.evaluate(()=>LIFT.S.active),active);
 await page.click('nav [data-v="home"]');await page.click('#fin');
 assert.equal(await page.evaluate(()=>LIFT.S.sessions.length),2);
 assert.equal(await page.evaluate(()=>LIFT.S.active),null);
 assert.match(await page.evaluate(()=>LIFT.toCSV()),/45/);
 await page.reload();assert.equal(await page.evaluate(()=>LIFT.S.sessions.length),2);
 await page.click('nav [data-v="more"]');await page.click('[data-go="program"]');
 await page.click('[data-length="45"]');await page.locator('.plan-day summary').first().click();
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal overflow at ${width}`);
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({animations:'disabled',path:process.env.LIFT_SCREENSHOT||'/tmp/lift-training-settings.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: legacy migration, all three styles, saved edits, reload, session preview, active-workout protection, finish/history/CSV, and mobile layout.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
