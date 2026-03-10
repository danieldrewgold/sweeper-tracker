import { useCallback, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import { fetchSegmentsInRadius } from '../api/csclApi';
import { useSweepStore } from '../store';
import { MIN_SEGMENT_ZOOM, SEGMENT_FETCH_RADIUS } from '../utils/constants';

/** Quantize to ~100m grid cells (must match csclApi gridKey) */
function gridKey(lat: number, lng: number, radius: number): string {
  return `${Math.round(lat * 1000) / 1000},${Math.round(lng * 1000) / 1000},${radius}`;
}

export function useMapSegments() {
  const addSegments = useSweepStore((s) => s.addSegments);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchingRef = useRef(false);
  /** Grid cells already fetched this session — skips even the IndexedDB lookup */
  const fetchedCells = useRef(new Set<string>());

  const fetchForView = useCallback(
    async (lat: number, lng: number, zoom: number) => {
      if (zoom < MIN_SEGMENT_ZOOM) return;
      if (fetchingRef.current) return;

      const radius = zoom >= 16 ? 400 : zoom >= 15 ? 600 : SEGMENT_FETCH_RADIUS;
      const key = gridKey(lat, lng, radius);

      // Skip if we already fetched this grid cell this session
      if (fetchedCells.current.has(key)) return;
      fetchedCells.current.add(key);

      fetchingRef.current = true;
      try {
        const segs = await fetchSegmentsInRadius(lat, lng, radius);
        addSegments(segs);
      } catch (err) {
        // Allow retry on error by removing from fetched set
        fetchedCells.current.delete(key);
        console.error('Failed to fetch CSCL segments:', err);
      } finally {
        fetchingRef.current = false;
      }
    },
    [addSegments]
  );

  useMapEvents({
    moveend: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const map = e.target;
        const center = map.getCenter();
        fetchForView(center.lat, center.lng, map.getZoom());
      }, 500);
    },
    zoomend: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const map = e.target;
        const center = map.getCenter();
        fetchForView(center.lat, center.lng, map.getZoom());
      }, 500);
    },
  });

  return { fetchForView };
}
