import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useSweepStore } from '../store';
import { scanVisibleSegments, resetScannerCache } from '../services/realtimeSweepScanner';
import { getSegmentCenter } from '../utils/geo';
import type { CsclSegment } from '../types/cscl';

/** Short debounce — just enough for the map to settle after pan/zoom */
const SCAN_DEBOUNCE_MS = 100;

/** Re-scan interval to catch sweepers that arrive after initial scan */
const RESCAN_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Watches the segments store and triggers real-time sweep status scanning
 * via the sweepinfo API when new segments appear.
 */
export function useRealtimeSweep() {
  const map = useMap();
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
      // Only scan segments currently visible on screen — prioritize what the user sees
      const bounds = map.getBounds();
      const visible = new Map<string, CsclSegment>();
      for (const [id, seg] of segments) {
        const center = getSegmentCenter(seg);
        if (bounds.contains([center[0], center[1]])) {
          visible.set(id, seg);
        }
      }
      if (visible.size > 0) {
        scanVisibleSegments(visible).catch((err) =>
          console.error('Real-time sweep scan failed:', err)
        );
      }
    }, SCAN_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [segments, sweepActive]);

  // Periodic re-scan — only re-query segments currently visible in the viewport
  useEffect(() => {
    if (!sweepActive) return;

    rescanRef.current = setInterval(() => {
      const allSegments = useSweepStore.getState().segments;
      if (allSegments.size === 0) return;

      // Filter to segments within current map bounds
      const bounds = map.getBounds();
      const visible = new Map<string, CsclSegment>();
      for (const [id, seg] of allSegments) {
        const center = getSegmentCenter(seg);
        if (bounds.contains([center[0], center[1]])) {
          visible.set(id, seg);
        }
      }

      if (visible.size > 0) {
        resetScannerCache();
        scanVisibleSegments(visible).catch(console.error);
      }
    }, RESCAN_INTERVAL_MS);

    return () => {
      if (rescanRef.current) clearInterval(rescanRef.current);
    };
  }, [sweepActive, map]);
}
