'use strict';
// Explainable training guidance computed on-device. No network or model calls.
const TrainingCoach = (() => {
  const isAssistance = (typeof ExerciseGuidance !== 'undefined' ? ExerciseGuidance : require('./exercise-guidance.js')).isAssistance;
  const equipmentOptions = [
    ['unknown', 'Not specified'], ['dumbbell', 'Dumbbells'], ['barbell', 'Barbell'],
    ['machine', 'Machine'], ['cable', 'Cable'], ['bodyweight', 'Bodyweight']
  ];
  const bases = ['unknown', 'per-hand', 'total', 'stack', 'bodyweight'];
  const defaultBasis = {unknown:'unknown', dumbbell:'per-hand', barbell:'total', machine:'stack', cable:'stack', bodyweight:'bodyweight'};
  const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const number = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
  const round = value => Math.round(value * 100) / 100;
  const clone = value => JSON.parse(JSON.stringify(value));
  const dateKey = value => {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const tokens = {
    dumbbell: /\bdumbbells?\b|\bdb\b/gi,
    barbell: /\bbarbells?\b|\bbb\b|\bez[ -]?bar\b/gi,
    machine: /\bmachine\b|\bsmith\b|\bhammer strength\b/gi,
    cable: /\bcables?\b/gi,
    bodyweight: /\bbody[ -]?weight\b/gi
  };
  function mentions(text) {
    return Object.keys(tokens).filter(key => {tokens[key].lastIndex=0;return tokens[key].test(text)});
  }
  function inferred(name) {
    const n = normalize(name), found = mentions(n);
    // Smith is a machine even if its name includes "barbell".
    if (/\bsmith\b/.test(n)) return 'machine';
    if (found.length === 1) return found[0];
    if (found.length > 1) return 'unknown';
    if (/^(back squat|front squat|romanian deadlift|deadlift|barbell row|bench press|overhead press|ez curl)$/.test(n)) return 'barbell';
    if (/\b(leg press|leg extension|leg curl|lat pulldown|pec deck|hack squat|seated calf raise)\b/.test(n)) return 'machine';
    if (/^(pull[ -]?ups?|chin[ -]?ups?|push[ -]?ups?|plank|hanging leg raise)$/.test(n)) return 'bodyweight';
    return 'unknown';
  }
  function equipment(entry = {}) {
    const selected = normalize(entry.equipment);
    const kind = equipmentOptions.some(([key]) => key === selected) ? selected : inferred(entry.name);
    return {equipment:kind, basis:bases.includes(entry.basis) ? entry.basis : defaultBasis[kind], variant:normalize(entry.variant)};
  }
  function key(entry) {
    const info = equipment(entry);
    return JSON.stringify([normalize(entry.name), info.equipment, info.basis, info.variant]);
  }
  function matchingHistory(sessions = [], entry, beforeId) {
    const identity = key(entry), out = [];
    // When editing history, exclude the session being edited and anything later.
    const before = sessions.find(s => s.id === beforeId);
    const cutoff = before ? Number(before.date) : Infinity;
    for (const session of sessions) {
      if (session.id === beforeId || !Number.isFinite(Number(session.date)) || Number(session.date) > cutoff) continue;
      for (const past of session.entries || []) {
        if (key(past) !== identity || suggestion(past.notes || past.note, past)) continue;
        const sets = (past.sets || []).filter(set => set.done && number(set.r) > 0 && number(set.w) !== null && number(set.w) >= 0);
        if (sets.length) out.push({date:Number(session.date), sid:session.id, sets:clone(sets), notes:String(past.notes || past.note || ''), plannedSetCount:number(past.plannedSetCount), ...equipment(past)});
      }
    }
    return out.sort((a,b) => a.date-b.date);
  }
  function suggestion(note, currentEntry = {}) {
    let text = normalize(note);
    if (!text) return null;
    // Ignore hypothetical changes and questions; the user must choose those explicitly.
    if (/\?|\b(maybe|might|could|consider|next time|try using|switch to)\b/.test(text)) return null;
    // Exclude negative alternatives: "machine, not dumbbells or barbell".
    text = text.replace(/\b(?:not|rather than|instead of)\b[^.;\n]*/g, '');
    const found = mentions(text);
    if (found.length !== 1) return null;
    const kind = found[0], existing = equipment(currentEntry);
    if (kind === existing.equipment) return null;
    return {equipment:kind, basis:defaultBasis[kind], reason:`Your note mentions ${equipmentOptions.find(([key]) => key === kind)[1].toLowerCase()}. Confirm the equipment before comparing weights.`};
  }
  function readiness({days = [], updated, sleepGoal = 8, today, now = Date.now(), sessions = []} = {}) {
    const current = Number(now), day = today || dateKey(current);
    const result = (level, reasons, asOf = null) => ({level, label:{ready:'Progress may fit today',steady:'Keep your usual effort',easy:'Keep today easier',unknown:'Not enough current data'}[level], reasons, asOf});
    const stamp = typeof updated === 'number' ? updated : Date.parse(updated);
    if (!Number.isFinite(current) || !day || !Number.isFinite(stamp) || stamp > current || current-stamp > 30*3600000) return result('unknown',['Health data is missing, stale, or future-dated. No extra load is suggested from it.']);
    const latest = [...days].reverse().find(d => d && d.date === day);
    if (!latest) return result('unknown',[`No health readings for ${day}.`]);
    const sleep = number(latest.sleepHours), hrv = number(latest.hrv), rhr = number(latest.restingHR);
    const reasons = [], flags = [];
    const goal = Number.isFinite(Number(sleepGoal)) && Number(sleepGoal)>0 ? Number(sleepGoal) : 8;
    const prior = [...new Map(days.filter(d => d && d.date < day && d.date >= dateKey(current-30*86400000)).map(d=>[d.date,d])).values()];
    function baseline(field) {
      const values = prior.map(d=>number(d[field])).filter(n=>n!==null&&n>0);
      return values.length>=7 ? values.reduce((a,b)=>a+b,0)/values.length : null;
    }
    const hBase=baseline('hrv'), rBase=baseline('restingHR');
    if (sleep !== null && sleep >= 0 && sleep <= 24) {
      reasons.push(`Sleep: ${round(sleep)} h against your ${round(goal)} h goal.`);
      if (sleep < Math.max(6,goal-1.5)) flags.push('Sleep was below your usual need.');
    } else reasons.push('Today’s sleep duration is missing.');
    if (hrv !== null && hrv > 0 && hBase !== null) {
      reasons.push(`HRV: ${round(hrv)} ms; recent baseline ${round(hBase)} ms.`);
      if (hrv < hBase*.85) flags.push('HRV is below your recent baseline.');
    } else reasons.push('HRV needs today’s reading and at least 7 prior readings.');
    if (rhr !== null && rhr > 0 && rBase !== null) {
      reasons.push(`Resting heart rate: ${round(rhr)} bpm; recent baseline ${round(rBase)} bpm.`);
      if (rhr > rBase+5 || rhr > rBase*1.1) flags.push('Resting heart rate is above your recent baseline.');
    } else reasons.push('Resting heart rate needs today’s reading and at least 7 prior readings.');
    if (sessions.some(s=>dateKey(s.date)===day&&(s.entries||[]).some(e=>(e.sets||[]).some(x=>x.done)))) flags.push('You already logged a lifting workout today.');
    if (flags.length) return result('easy',flags.concat(reasons),day);
    const complete = sleep !== null && sleep>=0 && sleep<=24 && hrv!==null && hrv>0 && rhr!==null && rhr>0 && hBase!==null && rBase!==null;
    if (!complete) return result('unknown',reasons,day);
    const ready = sleep>=goal-.5 && hrv>=hBase*.95 && rhr<=rBase+3;
    return result(ready?'ready':'steady',reasons.concat('Wearable trends are training context, not a guarantee that a heavier load is right for you.'),day);
  }
  function noteCaution(notes) {
    const text = normalize(notes).replace(/\bno (?:pain|discomfort)\b/g,'');
    return /\b(pain|painful|hurt|hurts|injur\w*|dizzy|dizziness|failed|failure|struggl\w*|couldn.t finish|could not finish)\b/.test(text);
  }
  function recommend({entry, sessions = [], beforeId, health, now = Date.now()} = {}) {
    const count=Math.max(1,Math.min(50,Math.floor(Number(entry.sets)||1)));
    const min=Math.max(1,Math.floor(Number(entry.min)||1)), max=Math.max(min,Math.floor(Number(entry.max)||min));
    const history=matchingHistory(sessions,entry,beforeId), last=history[history.length-1]||null;
    const make=(sets,note,status,up=false)=>({sets,note,last,up,status,reason:note});
    if(suggestion(entry.notes||entry.note,entry))return make(Array.from({length:count},()=>({w:'',r:min})),'Your note suggests different equipment. Confirm that setup before using past weights.','equipment-review');
    if(!last)return make(Array.from({length:count},()=>({w:'',r:min})),'No comparable history for this equipment and setup. Choose a comfortable starting weight.','new');
    const previous=last.sets;
    const sets=Array.from({length:count},(_,i)=>{
      const set=previous[i]||previous[previous.length-1];
      return {w:Number(set.w),r:Math.max(min,Math.min(max,Math.floor(Number(set.r))))};
    });
    if(noteCaution(entry.notes||entry.note)||noteCaution(last.notes)) return make(sets,'A workout note mentions pain, difficulty, or a failed set. Do not increase automatically; check the note and how you feel.','caution');
    if(entry.autoLoadProgression===false||isAssistance(entry)||isAssistance({notes:last.notes}))return make(sets,'Adjust this exercise manually. More assistance makes the movement easier; no automatic weight increase is suggested.','manual');
    const eq=equipment(entry);
    if(eq.equipment==='unknown'||eq.basis==='unknown')return make(sets,'Confirm the equipment and weight basis before increasing from this history.','equipment-review');
    if((eq.equipment==='machine'||eq.equipment==='cable')&&!eq.variant)return make(sets,'Name this machine or cable setup before progressing; stack weights vary between machines.','equipment-review');
    const age=Number(now)-Number(last.date);
    if(!Number.isFinite(age)||age<0||age>28*86400000)return make(sets,'This matching workout is over four weeks old or has an invalid date. Re-establish a comfortable baseline first.','history-stale');
    if(!health||health.level!=='ready'||health.asOf!==dateKey(now))return make(sets,health?.level==='easy'?'Recovery signals suggest an easier day. Hold or reduce load based on your warmup.':'Hold the last weight until current recovery data and performance both support a small increase.','hold');
    if(previous.length<count)return make(sets,'Last time had fewer completed sets than today’s plan. Complete the planned sets before adding weight.','hold');
    if(previous.some(s=>number(s.rir)===null||number(s.rir)<2))return make(sets,'Effort was high or unrecorded last time. Repeat the load and reps with about two reps in reserve before progressing.','hold');
    if(previous.some(s=>Number(s.r)<max)){
      // Build reps at the same load when recovery supports progression.
      return make(sets.map((s,i)=>({...s,r:Math.min(max,Math.max(min,Number((previous[i]||previous[previous.length-1]).r)+1))})),'Keep the last weight and aim for one more rep, stopping with about two reps in reserve.','reps');
    }
    if(last.plannedSetCount===null||last.plannedSetCount<=0||previous.length<last.plannedSetCount)return make(sets,'The full set prescription was not recorded or completed last time. Repeat the planned sets before adding weight.','hold');
    // A single load is needed: never turn mixed top/back-off sets into one heavy target.
    const weights=new Set(previous.map(s=>Number(s.w)));
    if(weights.size!==1)return make(sets,'Last time used different weights across sets. Keep those set-by-set loads; no blanket increase is suggested.','hold');
    const weight=Number(previous[0].w), increment=number(entry.inc);
    if(eq.equipment==='bodyweight'||weight<=0||increment===null||increment<=0||increment>weight*.1)return make(sets,'The configured increase would exceed 10% or needs a known external load. Use a smaller increment or build reps first.','hold');
    const next=round(weight+increment);
    return make(Array.from({length:count},()=>({w:next,r:min})),`Last time: ${weight} lb for all ${previous.length} sets at ${max}+ reps, with at least 2 reps in reserve. Current recovery supports trying ${next} lb; confirm during your warmup.`,'increase',true);
  }
  return {equipmentOptions,bases,equipment,key,matchingHistory,suggestion,readiness,recommend};
})();
if(typeof module!=='undefined')module.exports=TrainingCoach;
