import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSweepStore } from '../store';
import { fetchActive, getSweepTileUrl } from '../api/mappingApi';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function SweepTileOverlay() {
  const map = useMap();
  const sweepActive = useSweepStore((s) => s.sweepActive);
  const tileCacheTime = useSweepStore((s) => s.sweepTileCacheTime);
  const setSweepActive = useSweepStore((s) => s.setSweepActive);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Poll the active endpoint
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const data = await fetchActive();
        const cacheTime = new Date(data.LastModified).getTime();
        setSweepActive(data.Active, cacheTime);

        // Schedule next poll based on API's NextModify hint
        const nextModify = new Date(data.NextModify).getTime();
        const delay = Math.max(10_000, nextModify - Date.now());
        timer = setTimeout(poll, Math.min(delay, POLL_INTERVAL_MS));
      } catch {
        // Retry in 60s on error
        timer = setTimeout(poll, 60_000);
      }
    }

    poll();
    return () => clearTimeout(timer);
  }, [setSweepActive]);

  // Manage tile layer based on active state and cache time
  useEffect(() => {
    if (sweepActive && tileCacheTime > 0) {
      // Remove old layer if cache time changed
      if (tileLayerRef.current) {
        tileLayerRef.current.removeFrom(map);
      }

      const url = getSweepTileUrl(tileCacheTime);
      tileLayerRef.current = L.tileLayer(url, {
        minZoom: 13,
        maxZoom: 18,
        opacity: 0.7,
        errorTileUrl: '', // silently handle missing tiles
      });
      tileLayerRef.current.addTo(map);
    } else if (tileLayerRef.current) {
      tileLayerRef.current.removeFrom(map);
      tileLayerRef.current = null;
    }

    return () => {
      if (tileLayerRef.current) {
        tileLayerRef.current.removeFrom(map);
        tileLayerRef.current = null;
      }
    };
  }, [sweepActive, tileCacheTime, map]);

  return null;
}
