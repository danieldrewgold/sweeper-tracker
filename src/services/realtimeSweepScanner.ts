import { fetchSweepInfo } from '../api/mappingApi';
import { getSegmentCenter } from '../utils/geo';
import { useSweepStore } from '../store';
import type { CsclSegment } from '../types/cscl';

/** Max concurrent sweepinfo requests */
const CONCURRENCY = 40;

/** Minimum delay between batches to avoid hammering the API */
const BATCH_DELAY_MS = 5;

/** Segments confirmed swept today — never re-query (streets don't un-sweep) */
const confirmedSwept = new Set<string>();
/** Segments checked but not swept — re-query on periodic rescan */
const checkedNotSwept = new Set<string>();
let queriedDate = '';

/** Pending segments that arrived while a scan was running */
let pendingSegments: Map<string, CsclSegment> = new Map();
let scanning = false;

function getTodayStr(): string {
  return new Date().toDateString();
}

/** Reset cache for periodic re-scan. Only clears not-swept segments —
 *  swept segments don't need re-checking (streets don't un-sweep). */
export function resetScannerCache() {
  checkedNotSwept.clear();
  // Keep confirmedSwept intact — no need to re-query those
}

/**
 * Scan visible segments for real-time sweep status.
 * Queries the sweepinfo endpoint for each unscanned segment in throttled batches
 * and progressively updates the store.
 *
 * If a scan is already running, queues the new segments and runs them
 * immediately after the current scan finishes.
 */
export async function scanVisibleSegments(segments: Map<string, CsclSegment>) {
  // If already scanning, queue these segments for when the current scan finishes
  if (scanning) {
    for (const [id, seg] of segments) {
      pendingSegments.set(id, seg);
    }
    return;
  }

  const today = getTodayStr();

  // Date rollover — clear all caches
  if (queriedDate !== today) {
    confirmedSwept.clear();
    checkedNotSwept.clear();
    queriedDate = today;
    useSweepStore.getState().clearRealtimeSweepStatus();
  }

  // Find segments we haven't queried yet (skip both swept and recently-checked-not-swept)
  const toQuery: Array<{ id: string; lat: number; lng: number }> = [];
  for (const [id, segment] of segments) {
    if (confirmedSwept.has(id) || checkedNotSwept.has(id)) continue;
    const [lat, lng] = getSegmentCenter(segment);
    if (lat === 0 && lng === 0) continue; // skip invalid geometry
    toQuery.push({ id, lat, lng });
  }

  if (toQuery.length === 0) return;

  scanning = true;

  try {
    // Process in batches of CONCURRENCY
    for (let i = 0; i < toQuery.length; i += CONCURRENCY) {
      const batch = toQuery.slice(i, i + CONCURRENCY);
      const batchResults = new Map<string, Date | null>();

      const promises = batch.map(async ({ id, lat, lng }) => {
        // Skip if already queried (could have been done by a concurrent effect)
        if (confirmedSwept.has(id) || checkedNotSwept.has(id)) return;

        try {
          const info = await fetchSweepInfo(lat, lng);

          if (info && info.Times && info.Times.length > 0) {
            // Find the latest VISITED time
            const visitedTimes = info.Times
              .filter((t) => t.Type === 'VISITED')
              .map((t) => new Date(t.VisitedTime));

            if (visitedTimes.length > 0) {
              const latest = visitedTimes.reduce((a, b) => (a > b ? a : b));
              // Only count as swept if it's from today
              if (latest.toDateString() === today) {
                confirmedSwept.add(id);
                batchResults.set(id, latest);
                return;
              }
            }
          }

          // Not swept today — can be re-checked on rescan
          checkedNotSwept.add(id);
          batchResults.set(id, null);
        } catch (err) {
          // Network error — don't cache, allow retry
          console.warn(`sweepinfo query failed for ${id}:`, err);
        }
      });

      await Promise.all(promises);

      // Push batch results to store progressively
      if (batchResults.size > 0) {
        useSweepStore.getState().mergeRealtimeSweepStatus(batchResults);
      }

      // Small delay between batches to be respectful
      if (i + CONCURRENCY < toQuery.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }
  } finally {
    scanning = false;

    // If new segments arrived while scanning, process them immediately
    if (pendingSegments.size > 0) {
      const queued = pendingSegments;
      pendingSegments = new Map();
      scanVisibleSegments(queued).catch(console.error);
    }
  }
}
