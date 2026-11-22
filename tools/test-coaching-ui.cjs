const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const today=new Date(),date=n=>{const d=new Date(today);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const health={updated:new Date(Date.now()-60000).toISOString(),days:Array.from({length:8},(_,i)=>({date:date(i-7),sleepHours:8,hrv:60,restingHR:52}))};
 await page.route('**/health.json*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(health)}));
 let aiPayloads=[];
 await page.route('https://api.anthropic.com/**',async r=>{aiPayloads.push(JSON.parse(r.request().postData()));await r.fulfill({contentType:'application/json',body:JSON.stringify({content:[{type:'text',text:JSON.stringify({summary:'Review the machine setup before comparing weights.',observations:['Equipment differs between sessions.'],questions:['Which machine did you use?']})}]})})});
 await page.goto(process.env.LIFT_URL||'http://127.0.0.1:8000');await page.waitForFunction(()=>storageReady&&LIFT.H.days.length===8);
 assert.ok(await page.evaluate(()=>LIFT.S.mt<=1),'automatic Health fetch must not outrank a recoverable cloud workout backup');
 await page.evaluate(()=>{
  const e={id:'press',name:'Bench Press',equipment:'dumbbell',basis:'per-hand',variant:'',muscle:'Chest',compound:1,min:8,max:12,inc:2.5,sets:3};
  S.days=[{id:'testday',name:'Test workout',exercises:[e]}];S.sessions=[{id:'old',date:Date.now()-3*864e5,end:Date.now()-3*864e5+1800000,dayId:'testday',dayName:'Test workout',entries:[{...e,plannedSetCount:3,notes:'Felt comfortable',sets:Array.from({length:3},()=>({w:50,r:12,rir:2,done:true}))}]}];S.notes={};save();
 });
 await page.waitForFunction(()=>Store.status().mirror===true);await page.reload();await page.waitForFunction(()=>storageReady);
 await page.click('nav [data-v="home"]');await page.click('#start');
 assert.equal(await page.locator('[data-f="w"]').first().inputValue(),'52.5');
 assert.match(await page.locator('.tgt').innerText(),/52.5/);
 assert.match(await page.locator('#view').innerText(),/Felt comfortable/);
 await page.locator('[data-note]').fill('machine not dumbbell or barbell');await page.locator('[data-note]').press('Tab');
 assert.match(await page.locator('.tgt').innerText(),/Confirm/);
 assert.doesNotMatch(await page.locator('.tgt').innerText(),/52.5 lb/);
 await page.click('[data-equipment]');await page.selectOption('#eqType','machine');await page.fill('#eqVariant','Gym A press');await page.click('#eqSave');
 assert.equal(await page.locator('[data-f="w"]').first().inputValue(),'');
 await page.locator('[data-f="w"]').first().fill('80');await page.locator('[data-f="r"]').first().fill('10');await page.locator('[data-a="chk"]').first().click();
 await page.click('#fin');await page.click('#sdone');
 const logged=await page.evaluate(()=>LIFT.S.sessions.at(-1));
 assert.equal(logged.entries[0].equipment,'machine');assert.equal(logged.entries[0].notes,'machine not dumbbell or barbell');assert.equal(logged.entries[0].plannedSetCount,3);assert.ok(logged.healthContext);
 await page.click('nav [data-v="home"]');await page.click('[data-go="progress"]');
 assert.equal(await page.locator('#exSel option').count(),2);assert.match(await page.locator('#exSel').innerText(),/Dumbbells/);assert.match(await page.locator('#exSel').innerText(),/Machine/);
 const cloud=await page.evaluate(()=>sanitizedCloudState());assert.equal(cloud.healthArchive,undefined);assert.ok(cloud.sessions.every(w=>!w.healthContext));
 assert.equal(await page.evaluate(()=>preserveLocalHealth(sanitizedCloudState()).healthArchive.days.length),8);
 assert.match(await page.evaluate(()=>LIFT.toCSV()),/weight_basis/);assert.match(await page.evaluate(()=>LIFT.toCSV()),/machine not dumbbell/);
 // Local insights need no AI credentials or network request.
 assert.equal(aiPayloads.length,0);
 await page.evaluate(()=>localStorage.setItem('lift.ai','test-only-not-a-real-key'));
 await page.click('[data-ai-insights]');assert.equal(await page.locator('#aiHealth').isChecked(),false);
 await page.click('#aiExplain');await page.waitForFunction(()=>document.querySelector('#aiInsightResult').textContent.includes('AI explanation'));
 assert.equal(JSON.parse(aiPayloads[0].messages[0].content).health,undefined);
 await page.check('#aiHealth');await page.click('#aiExplain');await page.waitForFunction(()=>!document.querySelector('#aiExplain').disabled);
 assert.equal(JSON.parse(aiPayloads[1].messages[0].content).health.length,8);
 await page.evaluate(()=>closeSheet());
 // Simulate loss of localStorage while the device mirror survives. A fresh Health
 // response must not overwrite the recovered workouts with a new empty state.
 await page.waitForFunction(()=>Store.status().mirror===true);
 await page.evaluate(()=>localStorage.removeItem('lift.v1'));await page.reload();await page.waitForFunction(()=>storageReady);
 assert.equal(await page.evaluate(()=>LIFT.S.sessions.length),2);
 await page.click('nav [data-v="home"]');await page.click('[data-go="progress"]');
 for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow at ${width}`)}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'/tmp/lift-coaching.png',animations:'disabled'});
 assert.deepEqual(errors,[]);
 console.log('PASS: historical load target, equipment conflict/confirmation, dated notes, health snapshots, separated charts, opt-in AI/health payloads, cloud filtering, lost-localStorage recovery, mobile layout. AI provider response mocked.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
