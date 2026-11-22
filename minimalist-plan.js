'use strict';
// Small hypertrophy routines. Working sets exclude warmups; time is a guide.
const MinimalistPlan = (() => {
  function templates(E, uid) {
    const make = (name, sets, muscle, compound, equipment, cue = '') => ({
      ...E(name, sets, compound ? 6 : 10, compound ? 12 : 20, muscle, compound ? 1 : 0,
        equipment === 'dumbbell' || name === 'Cable Lateral Raise' ? 2.5 : 5),
      equipment,
      // Machine numbers may mean a weight stack, loaded plates, or plates per side.
      // Confirm the logging basis for the actual machine instead of guessing.
      basis: equipment === 'dumbbell' ? 'per-hand' : equipment === 'barbell' ? 'total' : equipment === 'cable' ? 'stack' : 'unknown',
      variant: '',
      rirMin: 1,
      rirMax: 2,
      restSeconds: compound ? 120 : 90,
      cue
    });
    const moves = {
      inclineDB: sets => make('Incline DB Press', sets, 'Chest', true, 'dumbbell', 'Log the weight of one dumbbell. Use the same bench angle for comparisons.'),
      inclineMachine: sets => make('Incline Machine Press', sets, 'Chest', true, 'machine', 'Confirm the machine and seat setting before comparing loads.'),
      pulldown: sets => make('Neutral-Grip Lat Pulldown', sets, 'Back', true, 'machine', 'Use a comfortable neutral grip and a consistent range of motion.'),
      row: sets => make('Chest-Supported Machine Row', sets, 'Back', true, 'machine', 'Keep your chest supported; record the machine and handle setup.'),
      lateral: sets => make('Cable Lateral Raise', sets, 'Shoulders', false, 'cable', 'Keep the same pulley height and use controlled reps.'),
      shoulderPress: sets => make('Machine Shoulder Press', sets, 'Shoulders', true, 'machine', 'Use a comfortable range and the same seat setting.'),
      legPress: sets => make('Leg Press', sets, 'Quads', true, 'machine', 'Keep the seat position and range of motion consistent.'),
      rdl: sets => make('DB Romanian Deadlift', sets, 'Hamstrings', true, 'dumbbell', 'Log the weight of one dumbbell. Hinge at the hips with control.'),
      calf: sets => make('Machine Calf Raise', sets, 'Calves', false, 'machine', 'Pause briefly and keep the range consistent rather than bouncing.'),
      curl: sets => make('Machine Preacher Curl', sets, 'Biceps', false, 'machine', 'Keep your upper arms supported and control the lowering.'),
      rearDelt: sets => make('Reverse Pec Deck', sets, 'Shoulders', false, 'machine', 'Use the same seat and handle position for comparisons.'),
      hack: sets => make('Hack Squat', sets, 'Quads', true, 'machine', 'Use a comfortable depth you can repeat with control.'),
      legCurl: sets => make('Seated Leg Curl', sets, 'Hamstrings', false, 'machine', 'Adjust the pads consistently and control each rep.'),
      crunch: sets => make('Cable Crunch', sets, 'Abs', false, 'cable', 'Keep the same cable setup and move through a controlled range.'),
      pushdown: sets => make('Rope Pushdown', sets, 'Triceps', false, 'cable', 'Keep your upper arms steady and use the same attachment.')
    };
    const day = (name, selections) => ({id: uid(), name, exercises: selections.map(([move, sets]) => moves[move](sets))});
    const guide = () => ({
      goal: 'Hypertrophy',
      sessionMinutes: 45,
      exercisesPerSession: 4,
      setsMin: 2,
      setsMax: 3,
      rirMin: 1,
      rirMax: 2,
      note: 'Aim to finish working sets with 1–2 reps in reserve. Warm up separately and adjust to how you feel; 45 minutes is a guide.'
    });
    return {
      minimalist4: {
        name: 'Minimalist Upper / Lower',
        sub: '4 days · 4 exercises · about 45 min',
        sched: [1, 1, 0, 1, 0, 1, 0],
        guide: guide(),
        days: () => [
          day('Minimalist Upper A', [['inclineDB',3],['pulldown',3],['row',2],['lateral',3]]),
          day('Minimalist Lower A', [['legPress',3],['rdl',2],['calf',2],['curl',2]]),
          day('Minimalist Upper B', [['pulldown',3],['inclineMachine',3],['rearDelt',2],['lateral',3]]),
          day('Minimalist Lower B', [['hack',3],['legCurl',3],['crunch',2],['pushdown',2]])
        ]
      },
      minimalist5: {
        name: 'Minimalist PPL + Upper / Lower',
        sub: '5 days · 4 exercises · about 45 min',
        sched: [1, 1, 1, 0, 1, 1, 0],
        guide: guide(),
        days: () => [
          day('Minimalist Push', [['inclineMachine',3],['shoulderPress',2],['lateral',3],['pushdown',2]]),
          day('Minimalist Pull', [['pulldown',3],['row',3],['rearDelt',2],['curl',2]]),
          day('Minimalist Legs', [['legPress',3],['rdl',3],['calf',2],['crunch',2]]),
          day('Minimalist Upper', [['inclineDB',3],['pulldown',3],['lateral',2],['pushdown',2]]),
          day('Minimalist Lower', [['hack',3],['legCurl',3],['calf',2],['curl',2]])
        ]
      }
    };
  }
  return {templates};
})();
if (typeof module !== 'undefined') module.exports = MinimalistPlan;
