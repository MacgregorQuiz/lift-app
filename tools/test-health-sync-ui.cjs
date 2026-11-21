const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const now=new Date(),date=n=>{const d=new Date(now);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 await page.clock.install({time:now});
 const old={updated:new Date(now-8*36e5).toISOString(),days:[{date:date(-1),steps:4200,sleepHours:7}]};
 const fresh={updated:new Date(now-1000).toISOString(),days:[{date:date(-1),steps:4200},{date:date(0),steps:6000,sleepHours:8}]};
 let mode='old',count=0;
 await page.route('**/health.json*',r=>{count++;if(mode==='error')return r.fulfill({status:503,body:'unavailable'});return r.fulfill({contentType:'application/json',headers:mode==='cached'?{'X-Lift-Cache':'offline'}:{},body:JSON.stringify(mode==='old'?old:mode==='empty'?{updated:null,days:[]}:fresh)})});
 await page.goto(process.env.LIFT_URL||'http://127.0.0.1:8000');await page.waitForFunction(()=>storageReady&&LIFT.H.days.length===1&&!HealthFeed.status().checking);
 await page.click('nav [data-v="health"]');
 assert.match(await page.locator('.health-sync-status').innerText(),/exporter is behind/);
 assert.match(await page.locator('.health-sync-status').innerText(),new RegExp(date(-1)));
 const oldExport=await page.evaluate(()=>LIFT.H.updated),before=count;
 await page.click('[data-health-refresh]');await page.waitForFunction(()=>!HealthFeed.status().checking);
 assert.ok(count>before);assert.equal(await page.evaluate(()=>LIFT.H.updated),oldExport);
 // Active polling and background pause.
 const pollBefore=count;await page.clock.fastForward(61000);await page.waitForFunction(()=>!HealthFeed.status().checking);assert.ok(count>pollBefore);
 await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'}));const hiddenBefore=count;await page.clock.fastForward(61000);assert.equal(count,hiddenBefore);
 mode='fresh';await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForFunction(()=>LIFT.H.days.length===2&&!HealthFeed.status().checking);
 assert.match(await page.locator('.health-sync-status').innerText(),/Latest export loaded/);
 assert.equal(await page.evaluate(()=>LIFT.H.days.at(-1).steps),6000);
 const archive=await page.evaluate(()=>JSON.stringify(LIFT.S.healthArchive)),checked=await page.evaluate(()=>HealthFeed.status().lastChecked);
 mode='error';await page.click('[data-health-refresh]');await page.waitForFunction(()=>!!HealthFeed.status().error);
 assert.match(await page.locator('.health-sync-status').innerText(),/HTTP 503/);assert.equal(await page.evaluate(()=>JSON.stringify(LIFT.S.healthArchive)),archive);
 mode='cached';await page.click('[data-health-refresh]');await page.waitForFunction(()=>HealthFeed.status().cached&&!HealthFeed.status().checking);
 assert.match(await page.locator('.health-sync-status').innerText(),/Using saved Health/);assert.equal(await page.evaluate(()=>HealthFeed.status().lastChecked),checked);
 await page.click('.health-connection [data-health-setup]');assert.equal(await page.locator('.health-shortcut-run').count(),0);
 const shortcut='Lift & Health / Daily';await page.fill('#healthShortcutName',shortcut);await page.click('#healthShortcutSave');assert.equal(await page.locator('.health-shortcut-run').getAttribute('href'),'shortcuts://run-shortcut?name='+encodeURIComponent(shortcut));
 assert.match(await page.locator('#sheet').innerText(),/public GitHub repository/);
 await page.evaluate(()=>closeSheet());await page.click('.health-connection [data-health-setup]');assert.equal(await page.locator('#healthShortcutName').inputValue(),shortcut);
 for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow at ${width}`)}
 await page.evaluate(()=>closeSheet());await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/lift-health-sync.png',animations:'disabled'});
 assert.deepEqual(errors,[]);
 console.log('PASS: stale exporter diagnosis, unchanged export vs manual check, one-minute visible polling, hidden pause, return refresh, new readings, HTTP and cached fallback, encoded Shortcut launch, saved setup, and mobile layout. No phone Shortcut run.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
