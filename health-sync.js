'use strict';
// Checks the health feed without confusing a recent request with a recent export.
// This helper has no storage and never posts workout or health data anywhere.
const HealthSync = (() => {
  const THROTTLE_MS = 60000;
  function validDay(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function validate(payload, timestamp) {
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.days)) {
      throw new Error('Health export is not a valid days list.');
    }
    for (const day of payload.days) {
      if (!day || typeof day !== 'object' || Array.isArray(day) || !validDay(day.date)) {
        throw new Error('Health export contains an invalid calendar date.');
      }
    }
    const updated = payload.updated;
    if (updated == null) {
      if (payload.days.length) throw new Error('Health export is missing its export timestamp.');
    } else {
      if (typeof updated !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(updated) || !validDay(updated.slice(0, 10))) {
        throw new Error('Health export has an invalid export timestamp.');
      }
      const time = Date.parse(updated);
      if (!Number.isFinite(time)) throw new Error('Health export has an invalid export timestamp.');
      if (time > timestamp) throw new Error('Health export timestamp is in the future. Check the export device’s clock.');
    }
    return {updated: updated ?? null, days: payload.days};
  }
  function create({fetcher = (...args) => fetch(...args), now = Date.now, timeoutMs = 12000, onStatus} = {}) {
    const state = {checking: false, lastAttempt: 0, lastChecked: 0, lastExport: null, latestDay: null, error: '', offline: false, cached: false, empty: false};
    let inflight = null, attempted = false;
    const status = () => ({...state});
    const notify = () => {if (onStatus) onStatus(status());};
    function refresh({url, force = false} = {}) {
      if (inflight) return inflight;
      const attemptedAt = now();
      if (!force && attempted && attemptedAt - state.lastAttempt >= 0 && attemptedAt - state.lastAttempt < THROTTLE_MS) return Promise.resolve(null);
      if (typeof url !== 'string' || !url.trim()) return Promise.resolve(null);
      attempted = true;
      state.lastAttempt = attemptedAt;
      state.checking = true;
      state.error = '';
      const controller = new AbortController();
      let timer;
      // Deferring the request one microtask publishes inflight before onStatus
      // can trigger another refresh, including when an injected fetcher throws.
      inflight = Promise.resolve().then(async () => {
        notify();
        try {
          const request = (async () => {
            const response = await fetcher(url, {cache: 'no-store', signal: controller.signal});
            if (!response || !response.ok) throw new Error('Health sync failed' + (response ? ' (HTTP ' + response.status + ')' : '') + '.');
            let body;
            try {body = await response.json();} catch (_) {throw new Error('Health export is not valid JSON.');}
            const payload = validate(body, now());
            const cached = response.headers?.get('X-Lift-Cache') === 'offline';
            return {payload, cached};
          })();
          const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error('Health sync timed out. Try again.'));
              controller.abort();
            }, timeoutMs);
          });
          const {payload, cached} = await Promise.race([request, timeout]);
          state.cached = cached;
          state.offline = cached;
          if (!cached) state.lastChecked = now();
          state.lastExport = payload.updated;
          state.latestDay = payload.days.reduce((latest, row) => !latest || row.date > latest ? row.date : latest, null);
          state.empty = payload.days.length === 0;
          return payload;
        } catch (error) {
          state.error = error?.message || 'Health sync failed. Try again.';
          state.offline = typeof navigator !== 'undefined' && navigator.onLine === false;
          // Previous source timestamps are retained to show what is still available.
          return null;
        } finally {
          clearTimeout(timer);
          state.checking = false;
          inflight = null;
          notify();
        }
      });
      return inflight;
    }
    return {refresh, status};
  }
  return {create};
})();
if (typeof module !== 'undefined') module.exports = HealthSync;
