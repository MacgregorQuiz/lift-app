'use strict';
// The user's supplied four-day routine, preserving its exercise order and dosage.
const OriginalPlan = (() => {
  function templates(E, uid) {
    const exercise = (name, sets, min, max, muscle, compound, equipment = 'unknown', basis = 'unknown', cue = '', extra = {}) => ({
      ...E(name, sets, min, max, muscle, compound ? 1 : 0, equipment === 'dumbbell' || name === 'Cable lateral raise' ? 2.5 : 5),
      equipment,
      basis,
      variant: '',
      rirMin: 1,
      rirMax: 3,
      restSeconds: compound ? 120 : 90,
      cue: ['Start near 2 reps in reserve; record your actual effort after each set.', cue].filter(Boolean).join(' '),
      ...extra
    });
    const day = (weekday, name, exercises, timeGuide = '40–45 min lifting guide; warmups and equipment waits can add time.') => ({
      id: uid(),
      name: `Original ${name}`,
      weekday,
      timeGuide,
      exercises
    });
    return {
      original4: {
        name: 'Upper-Body Focus · 4 Days',
        sub: 'Shoulders, back & upper chest · 5–7 exercises',
        sched: [1, 1, 0, 1, 0, 1, 0],
        length: 'full',
        guide: {
          rirMin: 1,
          rirMax: 3,
          note: 'These are working sets, excluding warmups. Start near 2 reps in reserve. Rest about 2 minutes on compounds and 60–90 seconds on isolation exercises. Saturday may need about 50 minutes.'
        },
        days: () => [
          day('Monday', 'Upper A — V-taper', [
            exercise('Incline dumbbell press', 3, 6, 10, 'Chest', true, 'dumbbell', 'per-hand'),
            exercise('Neutral-grip lat pulldown', 3, 8, 12, 'Back', true, 'unknown', 'unknown', 'Confirm the machine or cable setup and its weight convention.'),
            exercise('Chest-supported row', 2, 8, 12, 'Back', true, 'unknown', 'unknown', 'Confirm whether you use dumbbells, a barbell, or a machine.'),
            exercise('Cable lateral raise', 3, 12, 20, 'Shoulders', false, 'cable', 'stack'),
            exercise('Triceps pushdown', 2, 10, 15, 'Triceps', false, 'unknown', 'unknown', 'Confirm the cable or machine setup and attachment.')
          ]),
          day('Tuesday', 'Lower + shoulders', [
            exercise('Leg press', 3, 8, 12, 'Quads', true, 'machine', 'unknown', 'Confirm whether you log a weight stack, total plates, or plates per side.'),
            exercise('Romanian deadlift', 3, 8, 10, 'Hamstrings', true, 'unknown', 'unknown', 'Confirm dumbbells or barbell and how you record the weight.'),
            exercise('Seated leg curl', 2, 10, 15, 'Hamstrings', false, 'machine', 'unknown'),
            exercise('Dumbbell lateral raise', 3, 12, 20, 'Shoulders', false, 'dumbbell', 'per-hand'),
            exercise('Hanging knee raise', 2, 10, 15, 'Abs', false, 'bodyweight', 'bodyweight')
          ]),
          day('Thursday', 'Upper B — Width + arms', [
            exercise('Pull-ups', 3, 6, 10, 'Back', true, 'bodyweight', 'bodyweight',
              'The supplied alternative is assisted pull-ups. Confirm the equipment and record assistance in notes; more assistance is easier, so generic weight-increase guidance does not apply.',
              {sourceName: 'Pull-ups or assisted pull-ups', autoLoadProgression: false}),
            exercise('Incline machine chest press', 3, 8, 12, 'Chest', true, 'machine', 'unknown'),
            exercise('Seated cable row', 2, 8, 12, 'Back', true, 'cable', 'stack'),
            exercise('Reverse pec deck', 2, 12, 20, 'Shoulders', false, 'machine', 'unknown'),
            exercise('Cable lateral raise', 2, 12, 20, 'Shoulders', false, 'cable', 'stack'),
            exercise('Preacher curl', 2, 8, 12, 'Biceps', false, 'unknown', 'unknown', 'Confirm dumbbell, barbell, cable, or machine before comparing weights.')
          ]),
          day('Saturday', 'Full body — Upper emphasis', [
            exercise('Bulgarian split squat', 3, 8, 12, 'Quads', true, 'unknown', 'unknown', 'Confirm bodyweight, dumbbells, barbell, or machine and its weight convention.'),
            exercise('Seated leg curl', 2, 10, 15, 'Hamstrings', false, 'machine', 'unknown'),
            exercise('Machine chest press', 3, 8, 12, 'Chest', true, 'machine', 'unknown'),
            exercise('Single-arm lat pulldown', 2, 10, 15, 'Back', true, 'unknown', 'unknown', 'Confirm the machine or cable setup and keep each side’s logging consistent.'),
            exercise('Cable lateral raise', 3, 12, 20, 'Shoulders', false, 'cable', 'stack'),
            exercise('Hammer curl', 2, 10, 15, 'Biceps', false, 'unknown', 'unknown', 'Confirm dumbbells or cable and how you log the load.'),
            exercise('Cable crunch', 2, 12, 20, 'Abs', false, 'cable', 'stack')
          ], 'About 50 min lifting; equipment availability and warmups can add time.')
        ]
      }
    };
  }
  return {templates};
})();
if (typeof module !== 'undefined') module.exports = OriginalPlan;
