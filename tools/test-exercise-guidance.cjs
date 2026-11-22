const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('../exercise-guidance.js');

test('guidance respects saved logging basis and shares affirmative assistance detection with coaching',()=>{
 for(const name of ['Incline dumbbell press','Dumbbell lateral raise']){
  const g=G.forExercise({name,equipment:'dumbbell',basis:'total'});
  assert.doesNotMatch(g.cues.join(' '),/log.*one dumbbell/i);
 }
 assert.equal(G.isAssistance({notes:'Used 50 lb assistance'}),true);
 assert.equal(G.isAssistance({variant:'counterweight station'}),true);
 assert.equal(G.isAssistance({notes:'No assistance'}),false);
 assert.equal(G.isAssistance({name:'Unassisted pull-ups'}),false);
 assert.equal(G.forExercise({name:'Dips',equipment:'machine',variant:'counterweight station'}).progressionKind,'assistance');
});
const names=['Incline dumbbell press','Neutral-grip lat pulldown','Chest-supported row','Cable lateral raise','Triceps pushdown','Leg press','Romanian deadlift','Seated leg curl','Dumbbell lateral raise','Hanging knee raise','Pull-ups','Incline machine chest press','Seated cable row','Reverse pec deck','Preacher curl','Bulgarian split squat','Machine chest press','Single-arm lat pulldown','Hammer curl','Cable crunch'];

test('all 20 original movements get two or three concise cues without needing new stored fields',()=>{
 assert.equal(new Set(names).size,20);
 for(const name of names){const result=G.forExercise({name});assert.equal(result.specific,true,name);assert.ok(result.cues.length>=2&&result.cues.length<=3,name);assert.ok(result.cues.every(c=>typeof c==='string'&&c.length>0&&c.length<180));}
});
test('case, hyphens, dumbbell shorthand and common aliases resolve consistently',()=>{
 const pairs=[['  INCLINE DB PRESS  ','Incline dumbbell press'],['Single–arm lat pulldown','Single-arm lat pulldown'],['DB lateral raise','Dumbbell lateral raise'],['Pullups','Pull-ups'],['RDL','Romanian deadlift'],['Rope pushdown','Triceps pushdown']];
 for(const [alias,canonical]of pairs)assert.deepEqual(G.forExercise({name:alias}),G.forExercise({name:canonical}));
});
test('explicit incompatible equipment receives safe generic cues instead of incorrect specific instructions',()=>{
 for(const e of [{name:'Incline dumbbell press',equipment:'machine'},{name:'Seated cable row',equipment:'barbell'},{name:'Cable lateral raise',equipment:'dumbbell'},{name:'Machine chest press',equipment:'dumbbell'},{name:'DB Romanian deadlift',equipment:'barbell'},{name:'Chest supported machine row',equipment:'dumbbell'}]){
  const r=G.forExercise(e);assert.equal(r.specific,false);assert.equal(r.perSide,false);assert.doesNotMatch(r.cues.join(' '),/one dumbbell|pulley|stack|attachment|machine and seat/i);
 }
 assert.equal(G.forExercise({name:'Chest-supported row',equipment:'dumbbell'}).specific,true);
 assert.equal(G.forExercise({name:'Romanian deadlift',equipment:'barbell'}).specific,true);
});
test('known unilateral movements explain that the rep target applies to each side',()=>{
 for(const name of ['Bulgarian split squat','Single-arm lat pulldown','Cable lateral raise']){
  const r=G.forExercise({name});assert.equal(r.perSide,true);assert.match(r.cues.join(' '),/each side/);
 }
 for(const name of ['Leg press','Machine chest press','Seated leg curl'])assert.equal(G.forExercise({name}).perSide,false);
});
test('bodyweight and positive assistance references change progression kind without computing loads',()=>{
 assert.equal(G.forExercise({name:'Pull-ups'}).progressionKind,'bodyweight');
 assert.equal(G.forExercise({name:'Hanging knee raise'}).progressionKind,'bodyweight');
 assert.equal(G.forExercise({name:'Custom movement',equipment:'bodyweight'}).progressionKind,'bodyweight');
 for(const e of [{name:'Assisted pull-ups'},{name:'Pull-ups',variant:'assisted machine'},{name:'Pull-ups',notes:'Used 30 lb assistance'},{name:'Pull-ups',equipment:'machine',autoLoadProgression:false}])assert.equal(G.forExercise(e).progressionKind,'assistance');
 assert.equal(G.forExercise({name:'Pull-ups',notes:'No assistance today'}).progressionKind,'bodyweight');
 assert.equal(G.forExercise({name:'Incline dumbbell press'}).progressionKind,'load');
});
test('custom movements use a generic fallback and never mutate inputs or share cue arrays',()=>{
 const e={name:'My custom movement',equipment:'kettlebell',sets:3,min:7,max:11,notes:'My setup',variant:'mine'},before=structuredClone(e);
 const r=G.forExercise(e);assert.equal(r.specific,false);assert.equal(r.perSide,false);assert.equal(r.cues.length,3);assert.deepEqual(e,before);
 r.cues[0]='edited';assert.notEqual(G.forExercise(e).cues[0],'edited');
 const first=G.forExercise({name:'Pull-ups'});first.cues.push('changed');assert.equal(G.forExercise({name:'Pull-ups'}).cues.length,3);
 assert.equal(G.forExercise().specific,false);
});
