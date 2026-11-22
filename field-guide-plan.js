'use strict';
// Selectable training routines. Source-page metadata is kept separate from logs.
const FieldGuidePlan = (() => {
  function templates(E, uid) {
    const exercise = (name, sets, min, max, muscle, compound, equipment = 'unknown', basis = 'unknown', extra = {}) => ({
      ...E(name, sets, min, max, muscle, compound ? 1 : 0, equipment === 'dumbbell' || name === 'Cable lateral raise' ? 2.5 : 5),
      equipment,
      basis,
      variant: '',
      rirMin: 1,
      rirMax: 3,
      restSeconds: compound ? 120 : 90,
      cue: 'Start near 2 reps in reserve. Record actual effort after each set and take more rest when you need it.',
      ...extra
    });
    const move = {
      inclineDB: () => exercise('Incline dumbbell press',3,6,10,'Chest',true,'dumbbell','per-hand',{sourceName:'Low-incline dumbbell press'}),
      neutralLat: () => exercise('Neutral-grip lat pulldown',3,8,12,'Back',true,'machine','unknown'),
      legPress: () => exercise('Leg press',2,8,12,'Quads',true,'machine','unknown',{sourceName:'Leg press or split squat'}),
      chestRow: () => exercise('Chest-supported row',2,8,12,'Back',true),
      cableLat: () => exercise('Cable lateral raise',2,12,20,'Shoulders',false,'cable','stack'),
      rdl: () => exercise('Romanian deadlift',2,8,10,'Hamstrings',true),
      flatPress: () => exercise('Machine chest press',3,8,12,'Chest',true,'machine','unknown',{sourceName:'Flat machine or DB press'}),
      pulldown: () => exercise('Lat pulldown',3,6,10,'Back',true,'machine','unknown',{
        sourceName:'Assisted pull-up or pulldown',
        cue:'Start near 2 reps in reserve. This version uses a pulldown. If you swap to assisted pull-ups, confirm that setup; assistance does not follow ordinary load-increase rules.'
      }),
      goblet: () => exercise('Goblet squat',2,8,12,'Quads',true,'dumbbell','unknown',{
        sourceName:'Goblet squat or split squat',
        cue:'Start near 2 reps in reserve. Confirm how you record the single held dumbbell before comparing loads.'
      }),
      cableRow: () => exercise('Seated cable row',2,8,12,'Back',true,'cable','stack'),
      dbLat: () => exercise('Dumbbell lateral raise',2,12,20,'Shoulders',false,'dumbbell','per-hand'),
      legCurl: () => exercise('Seated leg curl',2,10,15,'Hamstrings',false,'machine','unknown',{sourceName:'Seated or lying leg curl'}),
      inclineMachine: () => exercise('Incline machine chest press',2,8,12,'Chest',true,'machine','unknown',{sourceName:'Low-incline machine press'}),
      oneArmLat: () => exercise('Single-arm lat pulldown',2,10,15,'Back',true,'cable','stack',{sourceName:'One-arm cable row or pulldown'}),
      reverseFly: () => exercise('Reverse pec deck',2,12,20,'Shoulders',false,'machine','unknown',{sourceName:'Reverse fly'}),
      curl: () => exercise('Preacher curl',2,10,15,'Biceps',false,'unknown','unknown',{sourceName:'Curl'}),
      pressdown: () => exercise('Triceps pushdown',2,10,15,'Triceps',false,'cable','stack',{sourceName:'Cable pressdown'})
    };
    const makeDay = (name, keys, extra = {}) => ({
      id: uid(), name,
      exercises: keys.map(key => typeof key === 'string' ? move[key]() : {...move[key.move](),optionalAccessory:true}),
      ...extra
    });
    const core = () => [
      makeDay('Field Guide A',['inclineDB','neutralLat','legPress','chestRow','cableLat','rdl'],{
        sourcePage:17,timeGuide:'40–55 min lifting guide; equipment and rest change the duration.'
      }),
      makeDay('Field Guide B',['flatPress','pulldown','goblet','cableRow','dbLat','legCurl'],{
        sourcePage:17,timeGuide:'40–55 min lifting guide; equipment and rest change the duration.'
      })
    ];
    const optional = move => ({move});
    const sessionC = () => makeDay('Field Guide C · Optional',[
      'inclineMachine','oneArmLat','cableLat','reverseFly',optional('curl'),optional('pressdown')
    ],{
      optional:true,sourcePage:18,timeGuide:'Optional session; the final arm pairing can be skipped.'
    });
    const guide = derived => ({
      sourcePages:[16,17,18],
      derived,
      rirMin:1,rirMax:3,
      note:derived
        ? 'Four lifting days distribute the same weekly work as A, B and the optional session at its starting set counts. Keep extra work optional when recovery or time is limited.'
        : 'A and B are the main sessions. Start with comfortable loads and about 2 reps in reserve. The optional session starts at the lower end of its set ranges.',
      shortDay:'For A or B with 30 minutes, keep the first three exercises and the lateral raise.',
      progression:'Repeat the load until every working set reaches the top of the rep range with control and some reserve. Then consider the smallest available increase.'
    });
    return {
      field2:{
        name:'Upper-Body Focus · 2 Days',sub:'A / B · 6 exercises per full session',
        sched:[0,1,0,0,0,1,0],length:'full',guide:guide(false),days:core
      },
      field3:{
        name:'Upper-Body Focus · 2 + Optional',sub:'A / B plus an optional upper-body session',
        sched:[0,1,0,0,0,1,0],length:'full',guide:guide(false),days:()=>[...core(),sessionC()]
      },
      field4:{
        name:'Upper-Body Focus · 4 Days',sub:'Same weekly work spread across 4 days · 4–5 exercises',
        sched:[1,1,0,1,0,1,0],length:'full',guide:guide(true),days:()=>[
          makeDay('Field Guide Upper A',['inclineDB','neutralLat','chestRow','cableLat',optional('reverseFly')],{
            sourcePage:18,timeGuide:'About 45 min guide; adjust for warmups, rest, and equipment.'
          }),
          makeDay('Field Guide Lower A + chest / arms',['legPress','rdl',optional('inclineMachine'),optional('curl')],{
            sourcePage:18,timeGuide:'About 45 min guide; extra chest and arm work is optional.'
          }),
          makeDay('Field Guide Upper B',['flatPress','pulldown','cableRow','dbLat'],{
            sourcePage:18,timeGuide:'About 45 min guide; adjust for warmups, rest, and equipment.'
          }),
          makeDay('Field Guide Lower B + back / delts / arms',['goblet','legCurl',optional('oneArmLat'),optional('cableLat'),optional('pressdown')],{
            sourcePage:18,timeGuide:'About 45 min guide; extra back, delt, and arm work is optional.'
          })
        ]
      }
    };
  }
  return {templates};
})();
if(typeof module!=='undefined')module.exports=FieldGuidePlan;
