import { useEffect, useRef } from 'react';
import { useSweepStore } from '../store';
import { scanVisibleSegments, resetScannerCache } from '../services/realtimeSweepScanner';

/** Short debounce — just enough for the map to settle after pan/zoom */
const SCAN_DEBOUNCE_MS = 300;

/** Re-scan interval to catch sweepers that arrive after initial scan */
const RESCAN_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Watches the segments store and triggers real-time sweep status scanning
 * via the sweepinfo API when new segments appear.
 */
export function useRealtimeSweep() {
  const segments = useSweepStore((s) => s.segments);
  const sweepActive = useSweepStore((s) => s.sweepActive);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rescanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scan when segments change (debounced)
  // Don't cancel in-flight scans — the scanner skips already-queried segments,
  // so overlapping scans just means the new one handles only truly new segments.
  useEffect(() => {
    if (!sweepActive) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      scanVisibleSegments(segments).catch((err) =>
        console.error('Real-time sweep scan failed:', err)
      );
    }, SCAN_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [segments, sweepActive]);

  // Periodic re-scan to catch newly swept segments
  useEffect(() => {
    if (!sweepActive) return;

    rescanRef.current = setInterval(() => {
      const currentSegments = useSweepStore.getState().segments;
      if (currentSegments.size > 0) {
        resetScannerCache();
        scanVisibleSegments(currentSegments).catch(console.error);
      }
    }, RESCAN_INTERVAL_MS);

    return () => {
      if (rescanRef.current) clearInterval(rescanRef.current);
    };
  }, [sweepActive]);
}
