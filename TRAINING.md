# Training settings

Open **Train → Program**, or **More → Training settings**.

- Switch among the two Minimalist plans, Upper / Lower, Push / Pull / Legs, and Full Body. Each style retains its customized days, exercise IDs, weekly schedule, and session length when you switch away and back.
- Choose a 30-, 45-, or 60-minute guide, or Full. The shorter options cap exercises and sets, favor distinct muscle groups, and trim later sets to approach the guide. They never rewrite the full routine.
- Expand a day under Session preview to see exercises, working sets, rep ranges, prescribed effort, rests, and estimated duration. Estimates include a five-minute warmup, 40 seconds per set, configured rests between sets, and one minute per exercise for transitions. Equipment waits, unilateral exercises, and additional warmups may add time.
- Edit the full routine below the preview. Changes appear in the preview immediately.
- Changes affect the next workout. A session already in progress and completed history are preserved.

Existing saves default to Full so upgrading does not silently change their routines. A newly selected style defaults to 45 minutes. Returning to a style restores its saved choice. Use the session-length buttons on Train for a quick adjustment; the choice persists for that style.

## Minimalist hypertrophy

Choose **Minimalist Upper / Lower** for four days (Monday, Tuesday, Thursday, Saturday), or **Minimalist PPL + Upper / Lower** for five days (Monday, Tuesday, Wednesday, Friday, Saturday). PPL means Push / Pull / Legs. Both are starting routines with four exercises per session and two lower-body sessions weekly. The 45-minute selection is a budget, not a required duration or a guarantee.

The four-day starting routine is:

| Day | Working sets × reps |
| --- | --- |
| Upper A | Incline DB press 3×6–12; neutral-grip pulldown 3×6–12; chest-supported machine row 2×6–12; cable lateral raise 3×10–20 |
| Lower A | Leg press 3×6–12; DB Romanian deadlift 2×6–12; machine calf raise 2×10–20; machine preacher curl 2×10–20 |
| Upper B | Neutral-grip pulldown 3×6–12; incline machine press 3×6–12; reverse pec deck 2×10–20; cable lateral raise 3×10–20 |
| Lower B | Hack squat 3×6–12; seated leg curl 3×10–20; cable crunch 2×10–20; rope pushdown 2×10–20 |

Aim for 1–2 reps in reserve (RIR), starting near 2. Actual RIR fields stay blank until logged; the target is not a measurement. Rest defaults within these routines are 120 seconds for compounds and 90 seconds for accessories. Exercise-specific rests drive both estimates and timers. Change **Rest seconds** in the routine editor, or clear it to use the global default. Workout entries retain their prescribed effort, rest and coaching cue, separate from dated user notes.

Build reps at the same load before adding weight. Automatic load increases retain the stricter requirement of at least two recorded RIR and matching equipment/history/recovery conditions. A set logged at 1 RIR correctly holds back an automatic increase. Machine weight meanings and setup identifiers must be confirmed; plate-loaded and stack machines are not assumed interchangeable.

This shorter version deliberately uses less volume than the pasted five-to-seven-exercise routine. It emphasizes upper chest, lats and shoulders while retaining quad work, a hip hinge and knee flexion across two lower days. It does not claim every muscle receives ten direct sets weekly, guarantee recovery in 48 hours, or prescribe loaded neck exercises. Existing calorie, protein and activity goals are not changed by selecting a training plan.

## Workout data

Completed workouts live in the app state (`sessions`), not this repository. `store.js` writes a device-local mirror and daily restore points using IndexedDB alongside localStorage. Optional **secret GitHub Gist** sync stores an off-device copy if connected in More. A secret Gist is unlisted, not access-controlled private storage: anyone with its link can read it. The repository's health.json is a separate health-metric feed, not the Lift workout log.

Use **More → Backup files → Workouts CSV** to share exercise logs for review, or **Export JSON** for the complete state including saved programs. Checking the repository alone cannot confirm whether a user's device saved a specific workout or whether their Gist sync is connected.

## Exercise history and coaching

Each workout entry now keeps its own notes, equipment, weight basis (such as per hand or total), setup identifier, and original `plannedSetCount`. CSV exports include the notes and setup. Old global notes remain visible as undated reminders; they are not retroactively assigned to past workouts.

History, progression charts, and personal records compare matching exercise names, equipment, weight bases, and setups. Give each machine or cable station a consistent identifier. Confirm equipment suggested by a note before using a target; changing a setup never converts recorded weights between machines, dumbbells, or barbells.

Open **Train → Progress** for on-device training insights. Load increases require matching recent history, a completed recorded set prescription, target reps, at least two recorded reps in reserve, and current recovery support. The configured increase cannot exceed 10%. Partial sessions, mixed loads, missing effort data, concerning notes, or unidentified machines hold back increases. Legacy sessions without a recorded set prescription remain available, but cannot justify an automatic weight increase.

Recovery guidance uses today's sleep, HRV, and resting heart rate, with a fresh, non-future Health sync timestamp. HRV and resting heart rate each need at least seven distinct prior readings within 30 days to establish a personal baseline. Missing or stale data is labeled unknown. Wearable signals provide training context; they do not establish that heavier exercise is safe.

## Health storage and optional sharing

The app retains up to 365 days of imported Health readings on the device. New workouts capture their health context at the start. Full JSON exports and device restore points include these records. Startup restores the IndexedDB mirror before loading and saving new Health data, so a fresh feed cannot overwrite workouts when localStorage has been lost. The Memory screen reports actual device save results; configured cloud credentials alone do not count as a verified sync.

**More → Health history** controls whether imported Health readings and workout health snapshots enter Gist sync. This is off by default and is a device preference. Connected Gist sync still includes workout logs, notes, body entries, and the rest of the existing app state. Turning Health sharing off stops future inclusion; it does not remove earlier Gist revisions. A filtered cloud restore preserves Health data already stored on the device. Automatic Health downloads do not advance the workout-state modification timestamp; opted-in readings enter the next sync caused by a workout or other edit. This prevents a background feed refresh from winning over a newer workout backup.

**Ask AI to explain my recent training** is optional. The confirmation screen sends the last three workouts and their exercise notes to Anthropic using the user's configured Claude API key. A separate unchecked box includes the latest eight saved Health days. Local insights work without a key or AI request. AI explanations do not change logged weights, equipment, or targets; provider charges may apply. The provider response was mocked during verification, so live provider compatibility and account access are not verified.

## Verification

Run the planner, coaching, and storage regression tests with Node:

```sh
node tools/test-workout-plan.cjs
node tools/test-minimalist-plan.cjs
node tools/test-training-coach.cjs
node tools/test-store.cjs
node tools/test-health-privacy.cjs
```

For browser checks, install Playwright in your development environment, serve this directory, and run the scripts below. These use isolated browser contexts and synthetic data. `CHROMIUM_PATH` can select an existing Chromium executable; otherwise Playwright uses its installed browser. `LIFT_URL` defaults to http://127.0.0.1:8000.

```sh
python -m http.server 8000 --bind 127.0.0.1
# In a second terminal:
node tools/test-training-ui.cjs
node tools/test-minimalist-ui.cjs
node tools/test-training-offline.cjs
node tools/test-coaching-ui.cjs
```

The UI test covers legacy saves, switching all three styles, customized routine restoration, reload persistence, preview/start agreement, preserving an active workout, completion, CSV output, and layouts at 320, 390, and 768 pixels. The offline test exercises service-worker installation and starting a shortened session without a connection.

The coaching UI test covers setup conflicts and confirmation, dated notes, health snapshots, separate equipment charts, explicit AI/Health sharing, filtered cloud payloads, and recovery after losing localStorage. The storage tests exercise localStorage/IndexedDB failures, restore safeguards, unverified sync status, secret-Gist validation, and separation of credentials from backup data.
