const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.LIFT_URL||'http://127.0.0.1:8000');
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.click('nav [data-v="more"]');await page.click('[data-go="program"]');
 await page.click('[data-length="45"]');
 await page.locator('.plan-day summary').first().click();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'/tmp/lift-training-settings-final.png',animations:'disabled',fullPage:false});
 await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.LIFT?.S.plan.length==='45');
 await page.click('nav [data-v="home"]');await page.click('#start');
 assert.ok(await page.evaluate(()=>LIFT.S.active.entries.length<=5));
 assert.deepEqual(errors,[]);
 console.log('PASS: service worker caches the new planner, settings persist, and workouts start offline.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
