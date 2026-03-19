import { useCallback, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import { fetchSegmentsInRadius } from '../api/csclApi';
import { useSweepStore } from '../store';
import { MIN_SEGMENT_ZOOM, SEGMENT_FETCH_RADIUS } from '../utils/constants';

/** Quantize to ~100m grid cells (must match csclApi gridKey) */
function gridKey(lat: number, lng: number, radius: number): string {
  return `${Math.round(lat * 1000) / 1000},${Math.round(lng * 1000) / 1000},${radius}`;
}

/** Max parallel CSCL fetches */
const MAX_PARALLEL = 6;

export function useMapSegments() {
  const addSegments = useSweepStore((s) => s.addSegments);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Grid cells already fetched this session — skips even the IndexedDB lookup */
  const fetchedCells = useRef(new Set<string>());
  const activeFetches = useRef(0);

  const fetchCell = useCallback(
    async (lat: number, lng: number, radius: number) => {
      const key = gridKey(lat, lng, radius);
      if (fetchedCells.current.has(key)) return;
      fetchedCells.current.add(key);

      activeFetches.current++;
      try {
        const segs = await fetchSegmentsInRadius(lat, lng, radius);
        addSegments(segs);
      } catch (err) {
        fetchedCells.current.delete(key);
        console.error('Failed to fetch CSCL segments:', err);
      } finally {
        activeFetches.current--;
      }
    },
    [addSegments]
  );

  const fetchForView = useCallback(
    (map: L.Map) => {
      const zoom = map.getZoom();
      if (zoom < MIN_SEGMENT_ZOOM) return;

      const radius = zoom >= 16 ? 400 : zoom >= 15 ? 600 : SEGMENT_FETCH_RADIUS;
      const bounds = map.getBounds();

      // Generate grid points covering the full viewport
      // Step slightly smaller than diameter to ensure overlap
      const stepDeg = (radius / 111_000) * 1.4;
      const south = bounds.getSouth();
      const north = bounds.getNorth();
      const west = bounds.getWest();
      const east = bounds.getEast();

      const unfetched: Array<{ lat: number; lng: number }> = [];
      for (let lat = south; lat <= north + stepDeg / 2; lat += stepDeg) {
        for (let lng = west; lng <= east + stepDeg / 2; lng += stepDeg) {
          if (!fetchedCells.current.has(gridKey(lat, lng, radius))) {
            unfetched.push({ lat, lng });
          }
        }
      }

      if (unfetched.length === 0) return;

      // Launch fetches with concurrency cap
      const launch = () => {
        while (activeFetches.current < MAX_PARALLEL && unfetched.length > 0) {
          const cell = unfetched.shift()!;
          fetchCell(cell.lat, cell.lng, radius).then(launch);
        }
      };
      launch();
    },
    [fetchCell]
  );

  useMapEvents({
    moveend: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fetchForView(e.target), 200);
    },
    zoomend: (e) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fetchForView(e.target), 200);
    },
  });

  return { fetchForView };
}
