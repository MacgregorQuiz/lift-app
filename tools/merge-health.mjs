// Merges a partial Health payload into health.json (run by .github/workflows/health-ingest.yml).
// Payload: {"updated":"<ISO, optional>","days":[{"date":"YYYY-MM-DD", ...any HEALTH_SYNC.md fields}]}
// Only the days/fields sent are touched, so today's running totals can be pushed as often as you like.
import {readFileSync,writeFileSync} from 'node:fs';
const file=process.argv[2]||'health.json';
const payload=JSON.parse(process.env.PAYLOAD||'{}');
let cur={updated:null,days:[]};try{cur=JSON.parse(readFileSync(file,'utf8'))}catch{}
const days=new Map((cur.days||[]).map(d=>[d.date,d]));
const KEY=/^[A-Za-z][A-Za-z0-9]{0,39}$/,ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(?:\.\d+)?)?([+-]\d\d:\d\d|Z)?$/;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
let touched=0;
for(const d of Array.isArray(payload.days)?payload.days.slice(0,62):[]){
  if(!d||!validDate(d.date))continue;
  const row=days.get(d.date)||{date:d.date};
  let accepted=0;
  for(const[k,v]of Object.entries(d)){
    if(k==='date'||!KEY.test(k)||v===null||v===''||v===undefined)continue;     // nulls never erase existing data
    const n=typeof v==='string'&&v.trim()!==''&&!ISO.test(v)?Number(v):v;       // Shortcuts often sends numbers as text
    if(typeof n==='number'&&Number.isFinite(n)){row[k]=Math.round(n*100)/100;accepted++}
    else if(typeof v==='string'&&ISO.test(v)&&validDate(v.slice(0,10))&&Number.isFinite(Date.parse(v))){row[k]=v;accepted++}
  }
  // An existing row with no valid incoming measurements is not a fresh sync.
  if(accepted){days.set(d.date,row);touched++}
}
if(!touched){console.log('Nothing to merge');process.exit(0)}
const receivedAt=new Date();
let updated=receivedAt.toISOString();
if(payload.updated!==undefined){
  const supplied=typeof payload.updated==='string'&&ISO.test(payload.updated)&&validDate(payload.updated.slice(0,10))&&/(?:Z|[+-]\d\d:\d\d)$/.test(payload.updated)?Date.parse(payload.updated):NaN;
  if(!Number.isFinite(supplied)||supplied>receivedAt.getTime())throw new Error('updated must be a valid, non-future timestamp with a timezone');
  updated=new Date(supplied).toISOString();
}
const out={updated,
  days:[...days.values()].sort((a,b)=>a.date<b.date?-1:1).slice(-730)};
writeFileSync(file,JSON.stringify(out,null,2)+'\n');
console.log(`Merged ${touched} day(s); ${out.days.length} total`);

