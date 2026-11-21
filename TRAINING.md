# Training settings

Open **Train → Program**, or **More → Training settings**.

- Switch among Upper / Lower, Push / Pull / Legs, and Full Body. Each style retains its customized days, exercise IDs, weekly schedule, and session length when you switch away and back.
- Choose a 30-, 45-, or 60-minute guide, or Full. The shorter options cap exercises and sets, favor distinct muscle groups, and trim later sets to approach the guide. They never rewrite the full routine.
- Expand a day under Session preview to see exercises, working sets, rep ranges, and estimated duration. Estimates include a five-minute warmup, 40 seconds per set, configured rests between sets, and one minute per exercise for transitions. Equipment waits and additional warmups may add time.
- Edit the full routine below the preview. Changes appear in the preview immediately.
- Changes affect the next workout. A session already in progress and completed history are preserved.

Existing saves default to Full so upgrading does not silently change their routines. A newly selected style defaults to 45 minutes. Returning to a style restores its saved choice. Use the session-length buttons on Train for a quick adjustment; the choice persists for that style.

## Workout data

Completed workouts live in the app state (`sessions`), not this repository. `store.js` writes a device-local mirror and daily restore points using IndexedDB alongside localStorage. Optional GitHub Gist sync stores an off-device copy if the user has connected it in More. The repository's health.json is a separate health-metric feed, not the Lift workout log.

Use **More → Backup files → Workouts CSV** to share exercise logs for review, or **Export JSON** for the complete state including saved programs. Checking the repository alone cannot confirm whether a user's device saved a specific workout or whether their Gist sync is connected.

## Verification

Run the pure planner regression tests with Node:

```sh
node tools/test-workout-plan.cjs
```

For browser checks, install Playwright in your development environment, serve this directory, and run the two scripts below. These use isolated browser contexts and synthetic data. `CHROMIUM_PATH` can select an existing Chromium executable; otherwise Playwright uses its installed browser. `LIFT_URL` defaults to http://127.0.0.1:8000.

```sh
python -m http.server 8000
# In a second terminal:
node tools/test-training-ui.cjs
node tools/test-training-offline.cjs
```

The UI test covers legacy saves, switching all three styles, customized routine restoration, reload persistence, preview/start agreement, preserving an active workout, completion, CSV output, and layouts at 320, 390, and 768 pixels. The offline test exercises service-worker installation and starting a shortened session without a connection.
