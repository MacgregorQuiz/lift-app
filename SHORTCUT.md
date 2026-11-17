# Your own Health sync (free, no daily limit)

This replaces a third-party bridge with Apple's built-in Shortcuts app. The Shortcut reads Apple
Health on your phone and sends the numbers straight to this repo, where
`.github/workflows/health-ingest.yml` merges them into `health.json`. Nothing else sits in between,
so there is no read limit and no subscription.

What it can and can't do:
- Runs as often as you schedule it. iOS has no "every 30 minutes" trigger, so you add several
  Time of Day automations (step 4). Hourly is about 16 of them; half-hourly is about 32.
- Apple locks Health while the phone is locked. A run that fires on a locked phone sends nothing
  and the merge keeps what is already there, so nothing breaks; that slot is just skipped.
- Screen Time is not available to Shortcuts at all. Log it in Lift under Health › Vitals.

## 1. Create a token (once, 2 minutes)
GitHub › Settings › Developer settings › Fine-grained tokens › Generate new token.
- Repository access: **Only select repositories** → `lift-app`
- Permissions › Repository › **Contents: Read and write**
- Copy the token (`github_pat_…`). It can only touch this one repo.

## 2. Build the Shortcut (once, about 10 minutes)
Shortcuts app › **+** › name it **Lift Sync**. Add these actions in order. Action names are as they
appear in current iOS; if one is worded slightly differently on your phone, search the action list
for the Health type in bold.

| # | Action | Settings | Rename the result to |
|---|---|---|---|
| 1 | Format Date | Date: *Current Date* · Format: Custom `yyyy-MM-dd` | `Today` |
| 2 | Find Health Samples | Type is **Steps** · Start Date *is today* | |
| 3 | Calculate Statistics | *Sum* of the samples | `Steps` |
| 4 | Find Health Samples | Type is **Active Energy** · Start Date *is today* | |
| 5 | Calculate Statistics | *Sum* | `Active` |
| 6 | Find Health Samples | Type is **Heart Rate Variability** · Start Date *is today* | |
| 7 | Calculate Statistics | *Average* | `HRV` |
| 8 | Find Health Samples | Type is **Resting Heart Rate** · Start Date *is today* · Sort by Start Date, Latest First · Limit 1 | `RHR` |
| 9 | Find Health Samples | Type is **Exercise Minutes** · Start Date *is today* | |
| 10 | Calculate Statistics | *Sum* | `Exercise` |
| 11 | Dictionary | `date` → `Today` · `steps` → `Steps` · `activeKcal` → `Active` · `hrv` → `HRV` · `restingHR` → `RHR` · `exerciseMin` → `Exercise` | `Day` |
| 12 | Get Contents of URL | see below | |

Action 12 settings:
- URL: `https://api.github.com/repos/MacgregorQuiz/lift-app/dispatches`
- Method: **POST**
- Headers: `Authorization` = `Bearer <your token>` · `Accept` = `application/vnd.github+json`
- Request Body: **JSON**
  - `event_type` (Text) = `health`
  - `client_payload` (Dictionary) → inside it add `days` (Array) → add one item of type Dictionary
    and set it to the `Day` variable

Run it once by hand. The first run asks for permission to read each Health type and to contact
github.com; allow them. A successful run returns nothing (GitHub answers "204 No Content").

Any metric with no data yet today is simply sent empty and ignored, so the Shortcut never
overwrites good numbers.

**Sleep, weight and anything else:** add more Find Health Samples actions the same way and more keys
to the Dictionary. Field names are in `HEALTH_SYNC.md`. Sleep stages need one Find per stage
(Core, Deep, REM) summed by duration, which is fiddly; it is fine to leave sleep to the existing
morning sync, since it only changes once a day.

## 3. Check it worked
- GitHub › this repo › **Actions** › "Health ingest": a run appears within a few seconds and goes
  green in under a minute.
- Open Lift: the Overview shows "Health synced just now" within about two minutes.

## 4. Schedule it
Shortcuts › **Automation** › **+** › **Time of Day** → pick a time → Repeat **Daily** →
**Run Immediately** (turn off "Notify When Run") → choose **Lift Sync**.
Repeat for each time you want (for example every hour from 7 AM to 10 PM, or every half hour).

Two extra triggers make it much more reliable, because the phone is unlocked when they fire:
- **Sleep › Waking Up** (catches last night's HRV and resting heart rate first thing)
- **App › Lift is opened**, if your home-screen Lift icon appears in the app list; if it doesn't,
  use an app you open every morning.

## Test without the phone
GitHub › Actions › Health ingest › **Run workflow**, and paste a payload such as
`{"days":[{"date":"2026-11-17","steps":5120}]}`. Use real numbers; whatever you send is saved.
