# Run an Apple Health export from your iPhone

Lift can refresh a published feed and open a named iPhone Shortcut. It cannot read Apple Health directly or create your phone's Health permissions and automations remotely. Begin by finding the exporter or Shortcut that already updates your feed; reconfigure and test that before building a second exporter.

**The existing destination is public.** This repository and its `health.json` expose submitted readings, including committed history. The steps below describe the existing integration, not private storage. Do not send additional personal Health data there unless you choose that exposure. For a long-term private integration, use a native HealthKit companion with an authenticated backend. See [HEALTH_SYNC.md](HEALTH_SYNC.md).

## 1. Check the exporter on an unlocked iPhone

1. Open Apple Health and confirm that today's expected readings exist. Check the measurement dates as well as the latest value.
2. Open your current exporter or **Lift Sync** Shortcut. Run it manually and grant only the Health read categories it needs. Review the allowed categories through Health's app/privacy settings if necessary.
3. Configure the export to cover **today and yesterday** in the phone's local timezone. Activity uses each day's totals; last night's sleep belongs to the morning you woke up. A file exported today can still contain only yesterday's data.
4. Review the payload before upload. Preserve missing data as omitted fields or `null`; do not substitute zero after a failed or empty query.
5. After a successful export and publication, return to Lift and tap **Refresh**. Compare export time, latest data day, and last successful source check. Refreshing Lift alone cannot make the phone export new samples.

Locked-device protection may prevent Health reads. A scheduled run can fail or return incomplete data; it is not guaranteed to safely send nothing. Test the actual actions and error handling on your iPhone. [Apple: HealthKit privacy](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)

## 2. Open an existing Shortcut from Lift

Save the exact Shortcut name in Lift's Health sync setup. For example, a Shortcut named **Lift Sync** can be opened with:

```text
shortcuts://run-shortcut?name=Lift%20Sync
```

Lift's launch button uses this supported URL scheme; it does not install a Shortcut or prove that it ran successfully. iOS may ask to open Shortcuts or request permissions. Return to Lift after the export and check the feed status. [Apple: run a Shortcut using a URL scheme](https://support.apple.com/guide/shortcuts/run-a-shortcut-using-a-url-scheme-apd624386f42/ios)

## 3. Add a practical automation

In **Shortcuts → Automation**, add a **Time of Day** trigger at a useful time, choose a daily repeat, and select your export Shortcut. Choose **Run Immediately** where available; older iOS versions may present an equivalent confirmation setting. Run the Shortcut manually first to resolve permission prompts.

You can add additional times, or an **App → Is Opened** trigger for a native app you commonly open while unlocked. The Home Screen Lift web app may not appear in the selectable app list. A wake-up, charger, or app trigger does not itself guarantee that Health is readable. Keep an easily accessible manual export as a fallback. The available triggers and settings depend on the device and iOS version. [Apple: add automations](https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios), [Apple: App setting triggers](https://support.apple.com/guide/shortcuts/setting-triggers-apde31e9638b/ios)

Adding more trigger times requests more runs; it is not an unlimited-read service or a guarantee of exact half-hourly/hourly delivery. Apple's native HealthKit background notifications also have maximum frequencies and system limits rather than a guaranteed schedule. [Apple: background delivery](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:))

## 4. Build a Shortcut only if you need one

This is a manual recipe, not an installed or device-tested Shortcut. Action names and available Health fields may differ by iOS version. Use a single export Shortcut for all automations so fixes apply consistently.

1. Create a Shortcut named **Lift Sync**. Produce local date boundaries for today and yesterday; format day keys as `yyyy-MM-dd` and the export time as ISO 8601 with a timezone.
2. For each day, use **Find Health Samples** for each permitted metric within that day's boundaries. Check whether samples exist before calculating a value. Extract a numeric quantity in the intended unit rather than sending a Health sample object.
3. Build a dictionary with `date` and only available, validated metrics. Put the two day dictionaries in a `days` array. Examples of the intended meanings are below.
4. If no real measurements were collected, stop before uploading and surface the failure. Do not fabricate an empty day's zeros or report the run as a new successful export.
5. Review the payload locally, then send it only to the destination you have chosen. For the existing public GitHub destination, use the request configuration below.

| Field | Intended value | Check before exporting |
|---|---|---|
| `steps` | Daily running total | Do not blindly sum overlapping Watch/iPhone samples |
| `activeKcal` | Daily active energy, kcal | Validate units and overlapping sources |
| `hrv` | Chosen daily HRV aggregate, ms | Average numeric sample values consistently; missing is not zero |
| `restingHR` | Most recent applicable resting-heart-rate quantity, bpm | Check its date; do not use a generic heart-rate reading |
| `sleepHours` | Time asleep for the night ending that morning | Avoid overlap and double-counting stages plus aggregate asleep records |
| `weightLb` | Applicable weight in pounds | Convert units explicitly and keep the measurement date |

Apple Health applies source priority to data from multiple devices. A raw sum in Shortcuts need not reproduce the Health app's displayed total. Prefer validated exporter aggregation, or filter to one documented source and compare the result against Health before relying on it. [Apple: Health data sources](https://support.apple.com/en-us/108779)

### Existing public GitHub destination

Only proceed here after choosing to expose the submitted data in this repository. Create a fine-grained GitHub token restricted to `lift-app`, with **Contents: read and write**, and store it only in your private phone setup. That permission allows repository writes beyond this one data file; do not share the token or a Shortcut containing it.

Configure **Get Contents of URL**:

- URL: `https://api.github.com/repos/MacgregorQuiz/lift-app/dispatches`
- Method: `POST`
- Headers: `Authorization: Bearer <your token>` and `Accept: application/vnd.github+json`
- JSON body: `event_type` = `health`; `client_payload` is a dictionary containing the actual export `updated` time with timezone and the `days` array. The timestamp must be valid and not in the future. Empty or invalid-only measurement payloads do not advance the feed timestamp.

A successful repository dispatch returns HTTP 204, meaning the event was accepted—not that the Health data was read correctly or published. Verify the **Health ingest** Action, resulting `health.json` commit, **Pages build/deployment**, and the feed actually served to Lift. [GitHub: repository dispatch](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)

The updated ingest workflow requests a Pages build explicitly after successfully pushing changed data on the default branch. This compensates for the fact that `GITHUB_TOKEN` pushes do not automatically trigger Pages builds. The build-request step has not been tested live; verify both the ingest Action and the Pages result. Publication time is not guaranteed, and a queued build does not mean the feed is already deployed. Lift's refresh/launch controls do not install or configure phone automations. [GitHub: Pages publishing](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [GitHub: request a Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build)

For a test, inspect a local payload first. Do not send invented example values to the live feed: they become stored health records.
