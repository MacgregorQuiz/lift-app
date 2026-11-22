const test = require('node:test');
const assert = require('node:assert/strict');
const HealthSync = require('../health-sync.js');
const TIME = Date.parse('2026-11-21T12:00:00Z');
const payload = {updated:'2026-11-21T08:00:00Z', days:[{date:'2026-11-20',sleepHours:7.5},{date:'2026-11-21',sleepHours:8}]};
const response = (body = payload, cached = false) => ({ok:true,status:200,headers:{get:key=>key.toLowerCase()==='x-lift-cache'&&cached?'offline':null},json:async()=>body});

test('checks no-store, reports source export separately, and never posts data', async () => {
  const calls=[];
  const client=HealthSync.create({now:()=>TIME,fetcher:async (...args)=>{calls.push(args);return response();}});
  assert.deepEqual(await client.refresh({url:'health.json'}),payload);
  assert.equal(calls[0][0],'health.json');
  assert.equal(calls[0][1].cache,'no-store');
  assert.equal(calls[0][1].method,undefined);
  assert.equal(calls[0][1].body,undefined);
  assert.ok(calls[0][1].signal instanceof AbortSignal);
  assert.equal(client.status().lastAttempt,TIME);
  assert.equal(client.status().lastChecked,TIME);
  assert.equal(client.status().lastExport,payload.updated);
  assert.equal(client.status().latestDay,'2026-11-21');
  assert.equal(client.status().checking,false);
});

test('throttles automatic checks but manual refresh checks unchanged exports again', async () => {
  let time=TIME,calls=0;
  const client=HealthSync.create({now:()=>time,fetcher:async()=>{calls++;return response();}});
  await client.refresh({url:'health.json'});time+=1000;
  assert.equal(await client.refresh({url:'health.json'}),null);assert.equal(calls,1);
  await client.refresh({url:'health.json',force:true});assert.equal(calls,2);
  assert.equal(client.status().lastChecked,time);assert.equal(client.status().lastExport,payload.updated);
  time+=60000;await client.refresh({url:'health.json'});assert.equal(calls,3);
});

test('deduplicates in-flight manual and automatic checks', async () => {
  let finish,calls=0;
  const client=HealthSync.create({now:()=>TIME,fetcher:()=>{calls++;return new Promise(resolve=>finish=resolve);}});
  const a=client.refresh({url:'health.json'}),b=client.refresh({url:'health.json',force:true});
  assert.equal(a,b);assert.equal(client.status().checking,true);
  await Promise.resolve();assert.equal(calls,1);finish(response());
  assert.deepEqual(await a,payload);assert.deepEqual(await b,payload);
});

test('old exports remain old even when successfully checked just now', async () => {
  const old={updated:'2026-10-01T08:00:00Z',days:[{date:'2026-10-01',hrv:55}]};
  const client=HealthSync.create({now:()=>TIME,fetcher:async()=>response(old)});
  await client.refresh({url:'health.json'});
  assert.equal(client.status().lastChecked,TIME);assert.equal(client.status().lastExport,old.updated);assert.equal(client.status().latestDay,'2026-10-01');
});

test('cached offline payload is usable but does not count as a fresh source check', async () => {
  let time=TIME,cached=false;
  const client=HealthSync.create({now:()=>time,fetcher:async()=>response(payload,cached)});
  await client.refresh({url:'health.json'});time+=60000;cached=true;
  assert.deepEqual(await client.refresh({url:'health.json'}),payload);
  const status=client.status();assert.equal(status.lastChecked,TIME);assert.equal(status.lastAttempt,time);assert.equal(status.offline,true);assert.equal(status.cached,true);assert.equal(status.error,'');
});

test('valid empty exports are distinguishable from malformed data', async () => {
  for(const body of [{updated:null,days:[]},{days:[]}]) {
    const client=HealthSync.create({now:()=>TIME,fetcher:async()=>response(body)});
    assert.deepEqual(await client.refresh({url:'health.json'}),{updated:null,days:[]});
    assert.equal(client.status().empty,true);assert.equal(client.status().lastExport,null);assert.equal(client.status().latestDay,null);assert.equal(client.status().lastChecked,TIME);
  }
});

test('rejects bad JSON, invalid calendar dates, missing timestamps and future timestamps', async () => {
  const bad=[null,{}, {updated:null,days:[{date:'2026-11-21'}]}, {updated:'not-a-time',days:[]},
    {updated:'2026-11-22T08:00:00Z',days:[]}, {updated:'2026-02-30T08:00:00Z',days:[]},
    {updated:payload.updated,days:[{date:'2026-02-29'}]}, {updated:payload.updated,days:[{date:'2026-11-31'}]},
    {updated:payload.updated,days:[null]}, {updated:payload.updated,days:'wrong'}];
  for(const body of bad) {
    const client=HealthSync.create({now:()=>TIME,fetcher:async()=>response(body)});
    assert.equal(await client.refresh({url:'health.json'}),null);
    assert.ok(client.status().error);assert.equal(client.status().lastChecked,0);assert.equal(client.status().lastExport,null);
  }
  const client=HealthSync.create({now:()=>TIME,fetcher:async()=>({...response(),json:async()=>{throw SyntaxError('bad')}})});
  assert.equal(await client.refresh({url:'health.json'}),null);assert.match(client.status().error,/JSON/);
});

test('network and HTTP failures retain the last usable export and check time', async () => {
  let time=TIME,fail=false;
  const client=HealthSync.create({now:()=>time,fetcher:async()=>{if(fail)throw TypeError('Failed to fetch');return response();}});
  await client.refresh({url:'health.json'});time+=60000;fail=true;
  assert.equal(await client.refresh({url:'health.json'}),null);assert.equal(client.status().lastChecked,TIME);assert.equal(client.status().lastExport,payload.updated);assert.match(client.status().error,/Failed to fetch/);
  const http=HealthSync.create({now:()=>TIME,fetcher:async()=>({ok:false,status:503})});
  assert.equal(await http.refresh({url:'health.json'}),null);assert.match(http.status().error,/503/);assert.equal(http.status().checking,false);
});

test('timeout aborts the request and releases the in-flight lock for retry', async () => {
  let aborted=false,calls=0;
  const client=HealthSync.create({now:()=>TIME,timeoutMs:10,fetcher:async(_,{signal})=>{
    calls++;if(calls>1)return response();
    return new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));}));
  }});
  assert.equal(await client.refresh({url:'health.json'}),null);assert.equal(aborted,true);assert.match(client.status().error,/timed out/);assert.equal(client.status().checking,false);assert.equal(client.status().lastChecked,0);
  assert.deepEqual(await client.refresh({url:'health.json',force:true}),payload);assert.equal(client.status().error,'');
});

test('timeout also bounds a hanging response body, with state notifications', async () => {
  const events=[];
  const client=HealthSync.create({now:()=>TIME,timeoutMs:10,onStatus:s=>events.push(s),fetcher:async()=>({...response(),json:()=>new Promise(()=>{})})});
  assert.equal(await client.refresh({url:'health.json'}),null);assert.deepEqual(events.map(s=>s.checking),[true,false]);assert.match(client.status().error,/timed out/);
});
