import { useCallback, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import { fetchSegmentsInRadius } from '../api/csclApi';
import { useSweepStore } from '../store';
import { MIN_SEGMENT_ZOOM, SEGMENT_FETCH_RADIUS } from '../utils/constants';

export function useMapSegments() {
  const addSegments = useSweepStore((s) => s.addSegments);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchingRef = useRef(false);

  const fetchForView = useCallback(
    async (lat: number, lng: number, zoom: number) => {
      if (zoom < MIN_SEGMENT_ZOOM) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;
      try {
        const radius = zoom >= 16 ? 400 : zoom >= 15 ? 600 : SEGMENT_FETCH_RADIUS;
        const segs = await fetchSegmentsInRadius(lat, lng, radius);
        addSegments(segs);
      } catch (err) {
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
