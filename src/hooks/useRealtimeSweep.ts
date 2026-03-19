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

/** Get segments within current map bounds */
function getVisibleSegments(map: L.Map, segments: Map<string, CsclSegment>): Map<string, CsclSegment> {
  const bounds = map.getBounds();
  const visible = new Map<string, CsclSegment>();
  for (const [id, seg] of segments) {
    const center = getSegmentCenter(seg);
    if (bounds.contains([center[0], center[1]])) {
      visible.set(id, seg);
    }
  }
  return visible;
}

/**
 * Watches the segments store and viewport changes, triggers real-time sweep
 * status scanning via the sweepinfo API. Prioritizes the current viewport —
 * panning/zooming aborts any in-progress scan for the old viewport.
 */
export function useRealtimeSweep() {
  const map = useMap();
  const segments = useSweepStore((s) => s.segments);
  const sweepActive = useSweepStore((s) => s.sweepActive);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rescanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scan when segments change OR viewport moves (debounced)
  // scanVisibleSegments auto-aborts any running scan, so new viewport always wins
  useEffect(() => {
    if (!sweepActive) return;

    const triggerScan = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const visible = getVisibleSegments(map, useSweepStore.getState().segments);
        if (visible.size > 0) {
          scanVisibleSegments(visible).catch((err) =>
            console.error('Real-time sweep scan failed:', err)
          );
        }
      }, SCAN_DEBOUNCE_MS);
    };

    // Trigger on segment changes
    triggerScan();

    // Also trigger on viewport changes (pan/zoom)
    map.on('moveend', triggerScan);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.off('moveend', triggerScan);
    };
  }, [segments, sweepActive, map]);

  // Periodic re-scan — only re-query segments currently visible in the viewport
  useEffect(() => {
    if (!sweepActive) return;

    rescanRef.current = setInterval(() => {
      const allSegments = useSweepStore.getState().segments;
      if (allSegments.size === 0) return;

      const visible = getVisibleSegments(map, allSegments);
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
