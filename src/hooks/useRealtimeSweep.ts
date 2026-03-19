import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useSweepStore } from '../store';
import { scanVisibleSegments, resetScannerCache, abortCurrentScan } from '../services/realtimeSweepScanner';
import { getSegmentCenter } from '../utils/geo';
import type { CsclSegment } from '../types/cscl';

/** Re-scan interval to catch sweepers that arrive after initial scan */
const RESCAN_INTERVAL_MS = 3 * 60 * 1000;

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

export function useRealtimeSweep() {
  const map = useMap();
  const segments = useSweepStore((s) => s.segments);
  const sweepActive = useSweepStore((s) => s.sweepActive);
  const scanDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rescanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When new segments load — scan them (queues behind any running scan, doesn't abort)
  useEffect(() => {
    if (!sweepActive) return;

    if (scanDebounce.current) clearTimeout(scanDebounce.current);
    scanDebounce.current = setTimeout(() => {
      const visible = getVisibleSegments(map, segments);
      if (visible.size > 0) {
        scanVisibleSegments(visible).catch(console.error);
      }
    }, 150);

    return () => {
      if (scanDebounce.current) clearTimeout(scanDebounce.current);
    };
  }, [segments, sweepActive, map]);

  // When viewport changes (pan/zoom) — abort old scan, restart for new viewport
  useEffect(() => {
    if (!sweepActive) return;

    const onMoveEnd = () => {
      // Abort whatever's running for the old viewport
      abortCurrentScan();

      // Short delay then scan the new viewport
      if (scanDebounce.current) clearTimeout(scanDebounce.current);
      scanDebounce.current = setTimeout(() => {
        const visible = getVisibleSegments(map, useSweepStore.getState().segments);
        if (visible.size > 0) {
          scanVisibleSegments(visible).catch(console.error);
        }
      }, 200);
    };

    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [sweepActive, map]);

  // Periodic re-scan for segments that weren't swept earlier but might be now
  useEffect(() => {
    if (!sweepActive) return;

    rescanRef.current = setInterval(() => {
      const allSegments = useSweepStore.getState().segments;
      if (allSegments.size === 0) return;

      const visible = getVisibleSegments(map, allSegments);
      if (visible.size > 0) {
        resetScannerCache();
        abortCurrentScan();
        scanVisibleSegments(visible).catch(console.error);
      }
    }, RESCAN_INTERVAL_MS);

    return () => {
      if (rescanRef.current) clearInterval(rescanRef.current);
    };
  }, [sweepActive, map]);
}
