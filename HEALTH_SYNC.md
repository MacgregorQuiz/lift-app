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

Any field can be left out or set to `null`. All v4 fields are optional, so a v3 file still works unchanged.

The example values above only illustrate the format. They aren't real data.

## How it's used
- Today rings: steps (a manual value for today overrides Health).
- Readiness: last night's sleep, HRV against your 7-day baseline, resting HR, and days since your last lift.
- Body chart: Health weights fill in days you didn't log by hand.
- Body composition cards and the lean-vs-fat chart use the Renpho fields; the "Renpho · synced" chip appears once any scale data is present.
- Sleep tab: last night's stages, duration vs the 8 h goal, bedtime vs 10:45 PM, 7/30-day chart, consistency (bedtime SD over 14 nights), 7-day sleep debt, HRV and resting-HR trends with a ±1 SD baseline band. Sleep debt of 5 h+ lowers readiness.

## Producing the file
Use any exporter that writes this JSON and commit it to the repo root as `health.json`
(for example, an iOS Shortcut that reads Health samples, builds the JSON, and pushes it through
the GitHub API, or an export app plus a small script). Keep only real measured data in it.
