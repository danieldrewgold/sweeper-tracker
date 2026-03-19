import { fetchSweepInfo } from '../api/mappingApi';
import { getSegmentCenter } from '../utils/geo';
import { useSweepStore } from '../store';
import type { CsclSegment } from '../types/cscl';

/** Max concurrent sweepinfo requests */
const CONCURRENCY = 40;

/** Segments confirmed swept today — never re-query (streets don't un-sweep) */
const confirmedSwept = new Set<string>();
/** Segments checked but not swept — re-query on periodic rescan */
const checkedNotSwept = new Set<string>();
let queriedDate = '';

/** Abort controller for the current scan — allows cancellation when viewport changes */
let currentAbort: AbortController | null = null;

function getTodayStr(): string {
  return new Date().toDateString();
}

/** Reset cache for periodic re-scan. Only clears not-swept segments —
 *  swept segments don't need re-checking (streets don't un-sweep). */
export function resetScannerCache() {
  checkedNotSwept.clear();
}

/**
 * Scan visible segments for real-time sweep status.
 *
 * If a scan is already running, it is ABORTED so the new viewport gets
 * priority. Already-fetched results from the aborted scan are kept.
 */
export async function scanVisibleSegments(segments: Map<string, CsclSegment>) {
  // Abort any running scan — the new viewport takes priority
  if (currentAbort) {
    currentAbort.abort();
  }

  const abort = new AbortController();
  currentAbort = abort;

  const today = getTodayStr();

  // Date rollover — clear all caches
  if (queriedDate !== today) {
    confirmedSwept.clear();
    checkedNotSwept.clear();
    queriedDate = today;
    useSweepStore.getState().clearRealtimeSweepStatus();
  }

  // Find segments we haven't queried yet
  const toQuery: Array<{ id: string; lat: number; lng: number }> = [];
  for (const [id, segment] of segments) {
    if (confirmedSwept.has(id) || checkedNotSwept.has(id)) continue;
    const [lat, lng] = getSegmentCenter(segment);
    if (lat === 0 && lng === 0) continue;
    toQuery.push({ id, lat, lng });
  }

  if (toQuery.length === 0) {
    currentAbort = null;
    return;
  }

  try {
    // Process in batches of CONCURRENCY
    for (let i = 0; i < toQuery.length; i += CONCURRENCY) {
      // Check if this scan was aborted (new viewport arrived)
      if (abort.signal.aborted) return;

      const batch = toQuery.slice(i, i + CONCURRENCY);
      const batchResults = new Map<string, Date | null>();

      const promises = batch.map(async ({ id, lat, lng }) => {
        if (abort.signal.aborted) return;
        if (confirmedSwept.has(id) || checkedNotSwept.has(id)) return;

        try {
          const info = await fetchSweepInfo(lat, lng);
          if (abort.signal.aborted) return;

          if (info && info.Times && info.Times.length > 0) {
            const visitedTimes = info.Times
              .filter((t) => t.Type === 'VISITED')
              .map((t) => new Date(t.VisitedTime));

            if (visitedTimes.length > 0) {
              const latest = visitedTimes.reduce((a, b) => (a > b ? a : b));
              if (latest.toDateString() === today) {
                confirmedSwept.add(id);
                batchResults.set(id, latest);
                return;
              }
            }
          }

          checkedNotSwept.add(id);
          batchResults.set(id, null);
        } catch (err) {
          if (!abort.signal.aborted) {
            console.warn(`sweepinfo query failed for ${id}:`, err);
          }
        }
      });

      await Promise.all(promises);

      // Push batch results to store progressively (even if aborting — keep what we got)
      if (batchResults.size > 0) {
        useSweepStore.getState().mergeRealtimeSweepStatus(batchResults);
      }
    }
  } finally {
    // Only clear currentAbort if this is still the active scan
    if (currentAbort === abort) {
      currentAbort = null;
    }
  }
}
