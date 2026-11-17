# Health sync for Lift

A web app can't read Apple Health (HealthKit) directly. Instead, Lift fetches
`./health.json` from the same site every time it opens or comes back to the foreground
(cache-busted and network-first; the service worker never serves a stale copy while you're online).

If the file is empty or missing, the Health cards just stay hidden. Manual entries in the app still work.

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
| `updated` | ISO 8601 string or `null` | shown as "Health · synced <time>" |
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
  - **Sleep** = hours asleep ÷ sleep goal.
  - **Recovery** = HRV vs your 30-day baseline (50%), resting HR vs baseline (20%), sleep (30%). Green ≥ 67, yellow 34–66, red < 34. Needs 5+ baseline readings for the HRV/RHR parts.
  - **Strain** = active energy, steps and logged lifting sets, 0–100.
- Readiness ("Push hard / Train normal / Go lighter") follows the recovery band, then steps down for 5 h+ sleep debt or lifting two days running.
- Habits: sleep goal, step goal and bedtime tick themselves from this file. "What moves your recovery" compares next-morning recovery on days a habit was done vs missed.
- Body chart: Health weights fill in days you didn't log by hand. Composition cards and the lean-vs-fat chart use the Renpho fields.
- Sleep tab: stages, duration vs goal, bedtime vs target, 7/30-day chart, consistency, 7-day sleep debt, HRV and resting-HR trends with a ±1 SD band.
- Vitals tab: 30/90-day recovery bars plus a tile per metric (latest, average, trend).

Health data usually lands the morning after, so the Overview opens on the latest day that has data; use ‹ › to move between days.

## Producing the file

There are two ways to get data in. Both can run side by side.

### 1. Replace the whole file (how it works today)
Something on the phone builds the full JSON and commits it as `health.json`. Today that runs once a
day at about 7:30 AM and writes **yesterday's** totals, which is why the app is always a day behind.

### 2. Push small updates, as often as you like (recommended)
`.github/workflows/health-ingest.yml` accepts a tiny payload and merges it into `health.json`
(`tools/merge-health.mjs`). Only the days and fields you send are touched, and `null` never erases
anything, so you can push today's running totals every half hour.

One request from an iOS Shortcut ("Get Contents of URL"):

```
POST https://api.github.com/repos/MacgregorQuiz/lift-app/dispatches
Authorization: Bearer <fine-grained token: this repo only, Contents = Read and write>
Accept: application/vnd.github+json

{"event_type":"health","client_payload":{"days":[
  {"date":"2026-11-17","steps":5120,"activeKcal":310,"hrv":68,"restingHR":48,
   "sleepHours":7.9,"bedtime":"2026-11-16T22:40:00-05:00","wakeTime":"2026-11-17T06:50:00-05:00"}
]}}
```

The app picks the change up within about two minutes (Action run + Pages deploy) and re-checks the
file every 5 minutes while it is open.

### Why syncs go missing, and how to get close to every 30 minutes
- **Health is locked while the phone is locked.** A Shortcut that runs at 7:30 AM on a locked phone
  reads nothing, or only part of the data. That is what the gaps and the half-empty days are.
  Trigger it when the phone is certain to be unlocked: the Sleep Focus "Waking Up" automation,
  "When I open <an app you use every morning>", or "When CarPlay / charger connects".
- **iOS has no "every 30 minutes" trigger.** The closest you can get with Shortcuts is several
  Time of Day automations (for example every hour from 7 AM to 10 PM, "Run Immediately" on), each
  running the same Shortcut. Runs that land while the phone is locked simply send nothing, and the
  merge keeps what is already there.
- Send **today's** date with running totals as well as yesterday's final numbers, so the Overview
  stops lagging a day.

Keep only real measured data in the file.
