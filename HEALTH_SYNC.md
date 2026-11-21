# Apple Health sync for Lift

Lift is a web app. It cannot directly request HealthKit permission or read the Health database on your iPhone. An iPhone exporter or Shortcut must first read the permitted Health data and publish a feed; Lift then fetches that feed.

**Privacy:** `MacgregorQuiz/lift-app` is a public repository, and its `health.json` feed is public. Committing more readings there exposes them in the file and Git history. The app's separate Gist health-sharing setting does not make this feed private. For long-term sensitive-data storage, prefer a native HealthKit companion with an authenticated private backend. Do not configure new exports to this public destination unless you understand and choose that exposure.

After restoring device storage, Lift checks the feed on open, on return to the foreground, and about every 60 seconds while visible. **Refresh** requests the feed again; it does not pull new samples out of Apple Health. A configured Shortcut launch button opens the named Shortcut on your iPhone, where permissions and export execution still apply. It cannot confirm that the export finished. See [SHORTCUT.md](SHORTCUT.md).

Feed requests try the network first. A slow or failed request can fall back to a cached response, and the saved Health archive remains available offline. Consequently, being online or having a recent successful check does not prove that the readings are current. Compare these separate status values:

- **Export time:** the feed's `updated` timestamp, set by the exporter or ingest process.
- **Latest data day:** the newest date represented in the feed; individual metrics may be older or absent.
- **Last successful source check:** when Lift last successfully retrieved the published feed. This is separate from its export time and does not prove new measurements arrived.

## What the November 21, 2026 inspection showed

The main-branch feed reported `updated: 2026-11-21T07:30:00-05:00`, but its latest data day was November 20. Recent Health commits appeared around 12:30 UTC and 01:55 UTC, roughly twice daily. No repository-dispatch Health ingest runs were found in the inspected workflow history. This points to an upstream export/publication schedule or date selection; faster browser refreshes alone cannot supply today's missing measurements. The repository does not identify which exporter is currently running on the phone.

## Schema

```json
{
  "updated": "2026-10-25T07:30:00-04:00",
  "days": [
    {
      "date": "2026-10-25",
      "steps": 9234,
      "sleepHours": 7.6,
      "sleepScore": 84,
      "hrv": 62,
      "restingHR": 52,
      "activeKcal": 610,
      "weightLb": 175.4,
      "bodyFatPct": 13.1,
      "bedtime": "2026-10-24T22:51:00-04:00",
      "wakeTime": "2026-10-25T06:40:00-04:00",
      "sleepDeepMin": 72,
      "sleepRemMin": 96,
      "sleepLightMin": 248,
      "sleepAwakeMin": 22,
      "leanMassLb": 152.4,
      "muscleMassLb": 144.8,
      "bmi": 22.4,
      "bodyWaterPct": 60.8,
      "visceralFat": 6,
      "bmr": 1820
    }
  ]
}
```

| field | type | notes |
|---|---|---|
| `updated` | ISO 8601 string with timezone, or `null` | export/ingest time, not the measurement time or a guarantee every field is current |
| `date` | `YYYY-MM-DD` (local) | sleep/HRV/resting HR belong to the **morning you woke up** |
| `steps` | number | total steps for that day |
| `sleepHours` | number or null | hours asleep the night before |
| `sleepScore` | number or null | 0–100 if your tracker gives one |
| `hrv` | number or null | ms (SDNN from Apple Health is fine) |
| `restingHR` | number or null | bpm |
| `activeKcal` | number or null | active energy |
| `weightLb` | number or null | e.g. Renpho → Apple Health. **A manual weigh-in in the app wins on the same date** |
| `bodyFatPct` | number or null | |
| `bedtime` / `wakeTime` | ISO 8601 local time with offset, or null | main overnight sleep session; drives the bedtime vs 10:45 PM check and the consistency score |
| `sleepDeepMin` / `sleepRemMin` / `sleepLightMin` / `sleepAwakeMin` | minutes or null | stage bar on the Sleep tab |
| `leanMassLb` | number or null | Renpho lean/fat-free mass; if missing, lean = weight × (1 − bodyFat%) |
| `muscleMassLb` | number or null | Renpho skeletal muscle mass |
| `bmi` | number or null | |
| `bodyWaterPct` | number or null | |
| `visceralFat` | number or null | Renpho visceral-fat rating |
| `bmr` | number or null | kcal/day |

### Extra fields (v6, all optional)

The Health › Vitals tab shows a tile with a trend line for **every numeric field** in the file.
Add any of these to the exporter and they appear automatically, no app change needed:

| field | Apple Health source | unit |
|---|---|---|
| `respiratoryRate` | Respiratory Rate (sleep average) | breaths/min |
| `spo2` | Blood Oxygen | % |
| `wristTempDeltaF` | Sleeping Wrist Temperature (deviation from baseline) | °F |
| `walkingHR` | Walking Heart Rate Average | bpm |
| `vo2max` | Cardio Fitness | mL/kg/min |
| `basalKcal` | Resting Energy | kcal |
| `exerciseMin` | Exercise Minutes | min |
| `standHours` | Stand Hours | h |
| `distanceMi` | Walking + Running Distance | mi |
| `flights` | Flights Climbed | count |
| `mindfulMin` | Mindful Minutes | min |
| `daylightMin` | Time in Daylight | min |
| `dietaryKcal` / `dietaryProteinG` / `waterOz` | Dietary Energy / Protein / Water | kcal / g / oz |

A numeric field with any other name is shown too, under "Other", labelled from its key.

Any field can be left out or set to `null`. A v3 file still works unchanged.

The example values above only illustrate the format. They aren't real data.

## How it's used
- Overview dials (Lift's own formulas, not a wearable vendor's):
  - **Sleep** = hours asleep ÷ sleep goal (time asleep, not time in bed).
  - **Recovery** = HRV vs your 30-day baseline (50%), resting HR vs baseline (20%), sleep (30%). A normal day lands near 60. Green ≥ 67, yellow 34–66, red < 34. Needs HRV or resting HR with 5+ baseline readings; a night of sleep alone does not produce a score.
  - **Strain** = lifting sets, logged activities, active energy and steps, 0–100 (a score, not a percentage). Target range follows recovery: green 50–80, yellow 30–55, red under 30.
  - **Sleep debt** = shortfall against the sleep goal over the last 7 tracked nights; nights above the goal pay it back.
- Training readiness is separate from the overview score: it requires current-day sleep, HRV, and resting-heart-rate readings, a fresh non-future export timestamp, and at least seven prior HRV and resting-heart-rate readings for personal baselines. Missing or stale context does not justify a load increase. See [TRAINING.md](TRAINING.md).
- Habits: sleep goal, step goal and bedtime tick themselves from this file. "What moves your recovery" compares next-morning recovery on days a habit was done vs missed.
- Body chart: Health weights fill in days you didn't log by hand. Composition cards and the lean-vs-fat chart use the Renpho fields.
- Sleep tab: stages, duration vs goal, bedtime vs target, 7/30-day chart, consistency, 7-day sleep debt, HRV and resting-HR trends with a ±1 SD band.
- Vitals tab: 30/90-day recovery bars plus a tile per metric (latest, average, trend).

Sleep belongs to the morning you woke up. Activity can contain today’s running totals. The Overview can display the latest day with data; check its displayed date and use ‹ › to move between days.

## Getting fresher readings

Start with the exporter already installed on your iPhone: open it while unlocked, verify Health read permissions for the required categories, run a manual export, and inspect the result. Configure it to include **today plus yesterday**, not just a completed prior day. Today's activity is provisional; yesterday can still receive late Watch data or corrections. Verify the units and each field's date before increasing the schedule.

Shortcuts Time of Day or App Is Opened automations can request additional runs. Use **Run Immediately** where that option is available, and first complete permissions through a manual run. A Home Screen web app may not appear in the App trigger's selection list; use a suitable native app or launch the Shortcut from Lift instead. Automation triggers and network requests are not guarantees of successful Health reads.

Apple explains that locked-device encryption can prevent background Health reads. Missing results can also reflect absent samples or denied access, which apps cannot always distinguish. A Shortcut may fail or return partial results; it is not guaranteed to safely send nothing. Explicitly omit unavailable fields, and stop before sending if no real measurements were collected. Do not turn a missing measurement into zero. [Apple: HealthKit privacy and encrypted data](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)

### Existing publication options

**Full-file replacement:** the exporter builds a complete feed and replaces `health.json`. Preserve the intended history and confirm the deployed feed reflects the commit. The current exporter and its iPhone automation settings need to be inspected before changing their schedule.

**Partial ingest (existing public-repository endpoint):** `.github/workflows/health-ingest.yml` accepts `repository_dispatch` events of type `health`; `tools/merge-health.mjs` merges the supplied days and fields. This endpoint is documented for maintaining the current setup, not as a private storage recommendation. Only use it after accepting the public-feed exposure described above.

The request shape is:

```text
POST https://api.github.com/repos/MacgregorQuiz/lift-app/dispatches
Authorization: Bearer <token stored only on your phone>
Accept: application/vnd.github+json
Content-Type: application/json
```

```json
{
  "event_type": "health",
  "client_payload": {
    "updated": "<actual export timestamp with timezone>",
    "days": [
      {"date": "<today YYYY-MM-DD>", "steps": "<actual measured running total>"},
      {"date": "<yesterday YYYY-MM-DD>", "steps": "<actual measured total>"}
    ]
  }
}
```

The placeholders above describe the structure; replace them with real dates and numeric measurements before use. A fine-grained GitHub token restricted to this repository needs **Contents: read and write** for repository dispatch. Keep it out of app code, exported logs, screenshots, and shared Shortcuts. [GitHub: repository dispatch](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)

The merge skips omitted fields, `null`, empty strings, and invalid dates, but accepts numeric zero. An empty payload or one without valid incoming measurements does not advance `updated`. If supplied, `updated` must be a valid non-future timestamp with a timezone; otherwise the merge rejects it. When omitted from a valid update, it uses ingestion time. The merger cannot determine whether a numeric measurement came from a successful Health read. Send one aggregate per metric/day; repeated exports should replace that day's total, not add another increment. A recent `updated` value alone does not establish that every measurement was refreshed.

A successful dispatch response only acknowledges the request. The updated **Health ingest** workflow explicitly requests a Pages build after a changed `health.json` is successfully pushed on the default branch, using its `pages: write` permission. This is necessary because commits pushed with `GITHUB_TOKEN` do not themselves trigger Pages builds. The build request is implemented but has not been tested against the live site. Verify the **Health ingest** Action, resulting commit, **Pages build/deployment**, and feed actually served to Lift; a build request is not proof of deployment success. Actions queues, failures, publishing, and caches can add delay, so there is no guaranteed two-minute delivery. [GitHub: Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [GitHub: request a Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build)

### Correct aggregation

Apple Health prioritizes sources when several devices record the same type. Blindly summing raw step or energy samples from iPhone, Watch, and third-party apps can double-count overlapping records. Use an exporter with validated aggregation, or select and validate a single source in a Shortcut; compare its totals with the Health app and document that source choice. Sleep intervals also need overlap handling: do not add an aggregate asleep interval to its Core/Deep/REM intervals. [Apple: manage Health data and sources](https://support.apple.com/en-us/108779)

### A native integration

For tighter integration, a native iOS companion can request HealthKit access, observe changes, and upload permitted data to an authenticated backend. This is additional native-app work; installing Lift as a Home Screen web app does not grant HealthKit access. HealthKit background delivery frequencies are maximum rates, not promised execution intervals, and some types have stricter limits. Apple documents an hourly maximum for step-count background notifications on iOS. This is not a guarantee of an hourly upload. [Apple: HealthKit background delivery](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:))
