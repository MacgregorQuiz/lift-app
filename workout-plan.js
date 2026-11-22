'use strict';
// Short sessions are derived from the full routine; switching never discards it.
const WorkoutPlan = (() => {
  const lengths = {
    '30': {name: 'Quick', label: '30 min', exercises: 4, sets: 3},
    '45': {name: 'Balanced', label: '45 min', exercises: 5, sets: 3},
    '60': {name: 'Extended', label: '60 min', exercises: 6, sets: 4},
    full: {name: 'Full routine', label: 'Full', exercises: Infinity, sets: Infinity}
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  const mode = value => Object.hasOwn(lengths, value) ? value : 'full';
  function migrate(state) {
    state.programs = state.programs || {};
    state.plan.length = mode(state.plan.length);
    return state;
  }
  function restSeconds(exercise, settings = {}) {
    const value = exercise.restSeconds;
    const explicit = value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
    return Math.max(0, Math.min(600, Number(explicit ? value : (exercise.compound ? settings.restCompound : settings.restIso)) || 0));
  }
  function prescription(exercise) {
    const result = {};
    if (exercise.autoLoadProgression === false) result.autoLoadProgression = false;
    if (exercise.optionalAccessory === true) result.optionalAccessory = true;
    if (exercise.restSeconds !== '' && exercise.restSeconds !== null && exercise.restSeconds !== undefined && Number.isFinite(Number(exercise.restSeconds))) result.restSeconds = restSeconds(exercise);
    if (Number.isFinite(exercise.rirMin) && Number.isFinite(exercise.rirMax) && exercise.rirMin >= 0 && exercise.rirMax >= exercise.rirMin && exercise.rirMax <= 5) {
      result.rirMin = exercise.rirMin;
      result.rirMax = exercise.rirMax;
    }
    if (typeof exercise.cue === 'string') result.cue = exercise.cue;
    return result;
  }
  function sessionDay(days, session) {
    // IDs take precedence, but a stable day name also connects saved A/B logs
    // when switching between the two-day and two-plus-optional templates.
    const byId = session.dayId != null && session.dayId !== ''
      ? days.find(day => day.id === session.dayId) : null;
    return byId || (session.dayName ? days.find(day => day.name === session.dayName) : null);
  }
  function requiredSessions(sessions = [], days = []) {
    // Keep unrelated historical workouts. Only explicitly optional sessions or
    // sessions matching a currently optional day are excluded from core goals.
    return sessions.filter(session => session.optional !== true && sessionDay(days, session)?.optional !== true);
  }
  function nextDay(days = [], sessions = []) {
    const core = days.filter(day => day.optional !== true);
    if (!core.length) return null;
    const ordered = requiredSessions(sessions, days)
      .filter(session => Number.isFinite(Number(session.date)))
      .sort((a, b) => Number(a.date) - Number(b.date));
    for (let i = ordered.length - 1; i >= 0; i--) {
      const matched = sessionDay(days, ordered[i]);
      const index = core.indexOf(matched);
      if (index >= 0) return core[(index + 1) % core.length];
    }
    return core[0];
  }
  function stats(day, settings) {
    const exercises = day.exercises.length;
    let sets = 0, seconds = exercises ? 300 : 0; // five-minute warmup allowance
    for (const e of day.exercises) {
      const n = Math.max(1, Math.floor(Number(e.sets) || 1));
      const rest = restSeconds(e, settings);
      sets += n;
      seconds += n * 40 + Math.max(0, n - 1) * rest + 60;
    }
    return {exercises, sets, minutes: Math.ceil(seconds / 60)};
  }
  function preview(day, length, settings) {
    if (!day) return null;
    const key = mode(length), limits = lengths[key];
    const result = copy(day);
    if (key === 'full') return result;
    // Cover distinct muscle groups before adding a second exercise for a group.
    // Keep the user's order within the selected exercises.
    const seen = new Set(), first = [], extra = [];
    day.exercises.forEach((e, i) => {
      const group = e.muscle || e.name;
      (seen.has(group) ? extra : first).push(i);
      seen.add(group);
    });
    const chosen = first.concat(extra).slice(0, limits.exercises).sort((a, b) => a - b);
    result.exercises = chosen.map(i => ({...result.exercises[i], sets: Math.min(limits.sets, Math.max(1, Math.floor(Number(day.exercises[i].sets) || 1)))}));
    // Trim later sets to fit the guide, keeping at least two when programmed.
    while (stats(result, settings).minutes > Number(key)) {
      const e = [...result.exercises].reverse().find(e => e.sets > 2);
      if (!e) break;
      e.sets--;
    }
    return result;
  }
  function switchTo(state, key, template) {
    if (!template || key === state.plan.tpl) return false;
    state.programs[state.plan.tpl] = copy({days: state.days, plan: state.plan});
    const saved = Object.hasOwn(state.programs, key) ? state.programs[key] : null;
    state.days = saved ? copy(saved.days) : template.days();
    state.plan = saved ? copy(saved.plan) : {tpl: key, days: [...template.sched], length: mode(template.length || '45')};
    state.goals.lifts = state.plan.days.filter(Boolean).length;
    return true;
  }
  return {lengths, mode, migrate, restSeconds, prescription, requiredSessions, nextDay, stats, preview, switchTo};
})();
if (typeof module !== 'undefined') module.exports = WorkoutPlan;
