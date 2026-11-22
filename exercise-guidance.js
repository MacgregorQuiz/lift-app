'use strict';
// Runtime display guidance only: never changes a routine, entry, or saved history.
const ExerciseGuidance = (() => {
  const normalize = value => String(value ?? '').toLowerCase()
    .replace(/[‐‑‒–—_-]/g, ' ').replace(/[’']/g, '')
    .replace(/\bdb\b/g, 'dumbbell').replace(/\bbb\b/g, 'barbell')
    .replace(/\s+/g, ' ').trim();
  const entries = [
    {
      names: ['Incline dumbbell press','Incline DB press','Incline dumbbell chest press'],
      equipment: ['dumbbell'],
      cues: ['Choose a comfortable low incline you can repeat and keep your feet planted.', 'Lower the dumbbells under control with your forearms supporting the load.', 'Press through a comfortable range and keep your selected weight-logging convention consistent.']
    },
    {
      names: ['Neutral-grip lat pulldown','Neutral grip pulldown','Neutral-grip lat pull down'],
      equipment: ['machine','cable'],
      cues: ['Adjust the thigh pad and use a comfortable palms-facing grip.', 'Draw your elbows down while keeping your torso mostly steady.', 'Control the return and use the same seat, handle, and range each time.']
    },
    {
      names: ['Lat pulldown','Lat pull down','Lat pulldowns','Cable lat pulldown'],
      equipment: ['machine','cable'],
      cues: ['Adjust the thigh pad and choose a comfortable grip and handle.', 'Draw your elbows down while keeping your torso mostly steady.', 'Control the return and use the same seat, handle, and range each time.']
    },
    {
      names: ['Chest-supported row','Chest supported machine row','Chest supported dumbbell row','Chest supported DB row'],
      equipment: ['machine','dumbbell','barbell','cable'],
      cues: ['Set the support so you can reach the handles while keeping your chest supported.', 'Pull your elbows back without lifting your chest off the support.', 'Lower under control and keep your grip and seat or bench setting consistent.']
    },
    {
      names: ['Cable lateral raise','Single-arm cable lateral raise','One-arm cable lateral raise'],
      equipment: ['cable'], perSide: true,
      cues: ['Keep the pulley height and handle position consistent.', 'Raise your arm out to the side with a softly bent elbow and a steady torso.', 'Use controlled reps on each side; lower without letting the stack drop.']
    },
    {
      names: ['Triceps pushdown','Tricep pushdown','Rope pushdown','Cable triceps pushdown','Triceps push down'],
      equipment: ['cable','machine'],
      cues: ['Choose a comfortable handle and keep your upper arms mostly still.', 'Straighten your elbows without using your torso to drive the load.', 'Control the return and keep the attachment and pulley setup consistent.']
    },
    {
      names: ['Leg press'], equipment: ['machine'],
      cues: ['Set the seat and foot position so you can keep your back and pelvis supported.', 'Lower through a comfortable range without bouncing at the bottom.', 'Press smoothly and record the machine plus how you count its plates or stack.']
    },
    {
      names: ['Goblet squat','Dumbbell goblet squat','DB goblet squat','Kettlebell goblet squat'],
      equipment: ['dumbbell','kettlebell'],
      cues: ['Hold one dumbbell or kettlebell securely at your chest and plant your feet in a comfortable stance.', 'Lower through a range you can control with your feet planted, then stand without bouncing.', 'Keep the same stance, depth, and weight-logging convention when comparing sessions.']
    },
    {
      names: ['Romanian deadlift','Barbell Romanian deadlift','DB Romanian deadlift','Dumbbell Romanian deadlift','RDL'],
      equipment: ['barbell','dumbbell','machine','cable'],
      cues: ['Start with a soft knee bend and move your hips back.', 'Keep the load close and use a range you can control without rounding to reach lower.', 'Stand by bringing your hips forward; keep the same knee bend and range between sets.']
    },
    {
      names: ['Seated leg curl','Seated hamstring curl'], equipment: ['machine'],
      cues: ['Align the seat and pads with the machine’s adjustment guides.', 'Keep your hips settled as you bend your knees.', 'Control both directions and use the same seat and pad settings each session.']
    },
    {
      names: ['Dumbbell lateral raise','DB lateral raise','Dumbbell lateral raises'], equipment: ['dumbbell'],
      cues: ['Keep a soft bend in your elbows and a steady torso.', 'Raise the dumbbells out to the sides through a comfortable range.', 'Lower under control instead of swinging, and keep your selected weight-logging convention consistent.']
    },
    {
      names: ['Hanging knee raise','Hanging knee raises'], equipment: ['bodyweight'], bodyweight: true,
      cues: ['Start from a stable hang and avoid building momentum.', 'Bring your knees up with a controlled curl of your pelvis.', 'Lower gradually and settle any swinging before the next rep.']
    },
    {
      names: ['Pull-ups','Pull ups','Pullups','Pull-up','Pull up','Assisted pull-ups','Assisted pull ups','Pull-ups or assisted pull-ups'],
      equipment: ['bodyweight','machine'], bodyweight: true,
      cues: ['Use a comfortable grip and begin from a controlled position.', 'Pull without kicking or swinging, then lower through a repeatable range.', 'If assisted, keep the machine or band setup consistent and record the assistance separately.']
    },
    {
      names: ['Incline machine chest press','Incline machine press','Machine incline chest press'], equipment: ['machine'],
      cues: ['If adjustable, choose a comfortable low incline; set the seat so the handles start near your upper chest.', 'Keep your torso supported as you press without bouncing out of the bottom.', 'Use the same seat setting and machine when comparing weights.']
    },
    {
      names: ['Seated cable row','Seated cable rows'], equipment: ['cable'],
      cues: ['Set your feet and reach the handle without losing a comfortable torso position.', 'Draw your elbows back while keeping large forward-and-back rocking out of the rep.', 'Control the reach forward and keep the attachment consistent.']
    },
    {
      names: ['Reverse pec deck','Reverse pec-deck','Reverse pec deck fly'], equipment: ['machine'],
      cues: ['Set the seat so the handles are at a comfortable shoulder height.', 'Keep your chest supported and move your arms outward with a soft elbow bend.', 'Control the return; keep the seat and handle positions the same.']
    },
    {
      names: ['Preacher curl','Machine preacher curl','Dumbbell preacher curl','Barbell preacher curl','Cable preacher curl'],
      equipment: ['machine','dumbbell','barbell','cable'],
      cues: ['Adjust the support so your upper arms stay comfortably on the pad.', 'Curl without lifting your shoulders or upper arms off the support.', 'Lower under control through a comfortable range and record the equipment used.']
    },
    {
      names: ['Bulgarian split squat','Rear-foot-elevated split squat','Rear foot elevated split squat'],
      equipment: ['unknown','bodyweight','dumbbell','barbell','machine'], perSide: true,
      cues: ['Use a stable rear-foot support and a stance you can balance in.', 'Lower with control and push through your front foot without bouncing.', 'Complete the prescribed reps on each side; keep your stance and loading convention consistent.']
    },
    {
      names: ['Machine chest press','Chest press machine'], equipment: ['machine'],
      cues: ['Adjust the seat so the handles line up comfortably with your chest.', 'Keep your torso supported and press through a repeatable range.', 'Control the return and use the same machine and seat setting for comparisons.']
    },
    {
      names: ['Single-arm lat pulldown','Single arm lat pulldown','One-arm lat pulldown','One arm lat pulldown'],
      equipment: ['machine','cable'], perSide: true,
      cues: ['Set the seat or support so you can pull with one arm without twisting your torso.', 'Draw your elbow down and control the return.', 'Complete the prescribed reps on each side and use the same handle and setup.']
    },
    {
      names: ['Hammer curl','Hammer curls','Dumbbell hammer curl','DB hammer curl','Cable hammer curl','Rope hammer curl'],
      equipment: ['dumbbell','cable','machine'],
      cues: ['Use a neutral, thumbs-up grip that feels comfortable.', 'Keep your upper arms mostly still as you bend your elbows.', 'Lower with control rather than swinging; record whether you used dumbbells or a cable.']
    },
    {
      names: ['Cable crunch','Cable crunches','Kneeling cable crunch'], equipment: ['cable'],
      cues: ['Keep the attachment position and distance from the pulley consistent.', 'Curl your torso toward your pelvis instead of pulling mainly with your arms.', 'Return under control and avoid letting the stack slam.']
    }
  ];
  const byName = new Map(entries.flatMap(entry => entry.names.map(name => [normalize(name), entry])));
  const generic = name => /\bpress\b/.test(name) ? [
    'Set up so your support and starting position feel stable.',
    'Press through a comfortable, controlled range without bouncing.',
    'Confirm the equipment and weight convention before comparing past loads.'
  ] : [
    'Choose a stable setup and a range of motion you can repeat with control.',
    'Keep the movement controlled rather than using momentum.',
    'Confirm the equipment and how you log its weight before comparing past loads.'
  ];
  function positiveAssistance(text) {
    const cleaned = normalize(text).replace(/\b(?:no|not|without)\s+(?:any\s+|added\s+|extra\s+)?(?:assistance|assisted|counterweight)\b/g, '');
    return /\b(?:assisted|assistance|counterweight)\b/.test(cleaned);
  }
  function isAssistance(entry = {}) {return positiveAssistance([entry.name,entry.variant,entry.notes,entry.note].filter(Boolean).join(' '));}
  function forExercise(entry = {}) {
    const name = normalize(entry.name), explicit = normalize(entry.equipment);
    const equipment = explicit === 'dumbbells' ? 'dumbbell' : explicit === 'body weight' ? 'bodyweight' : explicit;
    const known = byName.get(name);
    const namedEquipment = /\bdumbbell\b/.test(name) ? 'dumbbell' : /\bbarbell\b/.test(name) ? 'barbell' : /\bcable\b/.test(name) ? 'cable' : /\bmachine\b/.test(name) ? 'machine' : null;
    const mismatch = known && equipment && equipment !== 'unknown' && (!known.equipment.includes(equipment) || (namedEquipment && namedEquipment !== equipment));
    const assisted = isAssistance(entry) || (entry.autoLoadProgression === false && equipment === 'machine');
    const progressionKind = assisted ? 'assistance' : equipment === 'bodyweight' || known?.bodyweight ? 'bodyweight' : 'load';
    return {
      cues: [...(known && !mismatch ? known.cues : generic(name))],
      perSide: !!(known && !mismatch && known.perSide),
      progressionKind,
      specific: !!(known && !mismatch)
    };
  }
  return {forExercise,isAssistance};
})();
if (typeof module !== 'undefined') module.exports = ExerciseGuidance;
