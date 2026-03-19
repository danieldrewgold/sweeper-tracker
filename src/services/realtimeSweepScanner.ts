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

/** Abort controller for the current scan — allows cancellation on viewport change */
let currentAbort: AbortController | null = null;
let scanning = false;
let pendingSegments: Map<string, CsclSegment> = new Map();

function getTodayStr(): string {
  return new Date().toDateString();
}

/** Reset cache for periodic re-scan. Only clears not-swept segments. */
export function resetScannerCache() {
  checkedNotSwept.clear();
}

/** Abort the current scan (call on viewport change so new area gets priority) */
export function abortCurrentScan() {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
    scanning = false;
    pendingSegments.clear();
  }
}

/**
 * Scan segments for real-time sweep status.
 * If a scan is already running, queues segments and processes after.
 * Call abortCurrentScan() separately when viewport changes.
 */
export async function scanVisibleSegments(segments: Map<string, CsclSegment>) {
  // If already scanning, queue these and they'll be picked up after
  if (scanning) {
    for (const [id, seg] of segments) {
      pendingSegments.set(id, seg);
    }
    return;
  }

  const abort = new AbortController();
  currentAbort = abort;

  const today = getTodayStr();

  // Date rollover
  if (queriedDate !== today) {
    confirmedSwept.clear();
    checkedNotSwept.clear();
    queriedDate = today;
    useSweepStore.getState().clearRealtimeSweepStatus();
  }

  const toQuery: Array<{ id: string; lat: number; lng: number }> = [];
  for (const [id, segment] of segments) {
    if (confirmedSwept.has(id) || checkedNotSwept.has(id)) continue;
    const [lat, lng] = getSegmentCenter(segment);
    if (lat === 0 && lng === 0) continue;
    toQuery.push({ id, lat, lng });
  }

  console.log(`[scan] ${toQuery.length} segments to query (${segments.size} visible, ${confirmedSwept.size} cached swept, ${checkedNotSwept.size} cached not-swept)`);

  if (toQuery.length === 0) {
    currentAbort = null;
    // Still check pending
    if (pendingSegments.size > 0) {
      const queued = pendingSegments;
      pendingSegments = new Map();
      return scanVisibleSegments(queued);
    }
    return;
  }

  scanning = true;

  try {
    for (let i = 0; i < toQuery.length; i += CONCURRENCY) {
      if (abort.signal.aborted) return;

      const batch = toQuery.slice(i, i + CONCURRENCY);
      const batchResults = new Map<string, Date | null>();

      const promises = batch.map(async ({ id, lat, lng }) => {
        if (confirmedSwept.has(id) || checkedNotSwept.has(id)) return;

        try {
          const info = await fetchSweepInfo(lat, lng);
          // Don't check abort here — always keep results from completed requests

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

      if (batchResults.size > 0) {
        useSweepStore.getState().mergeRealtimeSweepStatus(batchResults);
        const swept = [...batchResults.values()].filter(v => v !== null).length;
        console.log(`[scan] batch done: ${batchResults.size} results (${swept} swept)`);
      }
    }
  } finally {
    scanning = false;
    if (currentAbort === abort) {
      currentAbort = null;
    }

    // Process any segments that arrived while scanning
    if (pendingSegments.size > 0 && !abort.signal.aborted) {
      const queued = pendingSegments;
      pendingSegments = new Map();
      scanVisibleSegments(queued).catch(console.error);
    }
  }
}
