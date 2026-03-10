import { fetchSweepInfo } from '../api/mappingApi';
import { getSegmentCenter } from '../utils/geo';
import { useSweepStore } from '../store';
import type { CsclSegment } from '../types/cscl';

/** Max concurrent sweepinfo requests */
const CONCURRENCY = 8;

/** Minimum delay between batches to avoid hammering the API */
const BATCH_DELAY_MS = 50;

/** Cache of already-queried physical_ids for today (cleared on date change) */
const queriedToday = new Set<string>();
let queriedDate = '';

/** Track if a scan is currently running (to avoid duplicate parallel scans) */
let scanning = false;

function getTodayStr(): string {
  return new Date().toDateString();
}

/** Clear the daily cache (e.g., on date rollover or periodic re-scan) */
export function resetScannerCache() {
  queriedToday.clear();
  queriedDate = '';
}

/**
 * Scan visible segments for real-time sweep status.
 * Queries the sweepinfo endpoint for each unscanned segment in throttled batches
 * and progressively updates the store.
 *
 * Safe to call repeatedly — skips already-queried segments via the daily cache.
 * If a scan is already running, this returns immediately (the running scan
 * will pick up any new segments on the next trigger).
 */
export async function scanVisibleSegments(segments: Map<string, CsclSegment>) {
  // Avoid overlapping scans
  if (scanning) return;

  const today = getTodayStr();

  // Date rollover — clear cache
  if (queriedDate !== today) {
    queriedToday.clear();
    queriedDate = today;
    useSweepStore.getState().clearRealtimeSweepStatus();
  }

  // Find segments we haven't queried yet
  const toQuery: Array<{ id: string; lat: number; lng: number }> = [];
  for (const [id, segment] of segments) {
    if (queriedToday.has(id)) continue;
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
        if (queriedToday.has(id)) return;

        try {
          const info = await fetchSweepInfo(lat, lng);
          queriedToday.add(id);

          if (info && info.Times && info.Times.length > 0) {
            // Find the latest VISITED time
            const visitedTimes = info.Times
              .filter((t) => t.Type === 'VISITED')
              .map((t) => new Date(t.VisitedTime));

            if (visitedTimes.length > 0) {
              const latest = visitedTimes.reduce((a, b) => (a > b ? a : b));
              // Only count as swept if it's from today
              if (latest.toDateString() === today) {
                batchResults.set(id, latest);
                return;
              }
            }
          }

          // Not swept today
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
  }
}
