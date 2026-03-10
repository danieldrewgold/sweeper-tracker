import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSweepStore } from '../store';
import { useUserBlock } from '../hooks/useUserBlock';
import { COLORS, FRONTIER_WINDOW_MS, MIN_SEGMENT_ZOOM } from '../utils/constants';
import { segmentToLatLngs } from '../utils/geo';

/**
 * Renders CSCL segments as interactive polylines with sweep status coloring.
 * Uses SODA data for baseline coloring + tile overlay for additional real-time coverage.
 * User's selected block is highlighted in blue.
 */
export default function SegmentLayer() {
  const map = useMap();
  const segments = useSweepStore((s) => s.segments);
  const sweepRecords = useSweepStore((s) => s.sweepRecords);
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);
  const { selectFromClick } = useUserBlock();
  const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const polylineMapRef = useRef<Map<string, L.Polyline[]>>(new Map());
  const selectFromClickRef = useRef(selectFromClick);
  selectFromClickRef.current = selectFromClick;

  // Add layer group to map once
  useEffect(() => {
    layerGroupRef.current.addTo(map);
    return () => {
      layerGroupRef.current.removeFrom(map);
    };
  }, [map]);

  // Add new segments as polylines
  useEffect(() => {
    const zoom = map.getZoom();
    if (zoom < MIN_SEGMENT_ZOOM) {
      layerGroupRef.current.clearLayers();
      polylineMapRef.current.clear();
      return;
    }

    for (const [id, segment] of segments) {
      if (polylineMapRef.current.has(id)) continue;

      const latLngs = segmentToLatLngs(segment);
      const polylines: L.Polyline[] = [];

      for (const line of latLngs) {
        const polyline = L.polyline(line, {
          color: COLORS.notYet,
          weight: COLORS.defaultWeight,
          opacity: 0.7,
          interactive: true,
        });
        polyline.on('click', () => selectFromClickRef.current(id));
        polyline.on('mouseover', function (this: L.Polyline) {
          this.setStyle({ weight: 6 });
        });
        polyline.on('mouseout', function (this: L.Polyline) {
          const isUser = id === useSweepStore.getState().userPhysicalId;
          this.setStyle({ weight: isUser ? COLORS.userBlockWeight : COLORS.defaultWeight });
        });
        polyline.addTo(layerGroupRef.current);
        polylines.push(polyline);
      }

      polylineMapRef.current.set(id, polylines);
    }
  }, [segments, map]);

  // Update colors based on SODA sweep data + user selection
  useEffect(() => {
    const now = Date.now();
    const frontierCutoff = now - FRONTIER_WINDOW_MS;

    for (const [id, polylines] of polylineMapRef.current) {
      let color: string = COLORS.notYet;
      let weight: number = COLORS.defaultWeight;
      let opacity = 0.7;

      const records = sweepRecords.get(id);
      if (records && records.length > 0) {
        const latest = records[records.length - 1];
        const visitTime = new Date(latest.date_visited).getTime();
        if (visitTime >= frontierCutoff) {
          color = COLORS.frontier;
          opacity = 0.9;
        } else {
          color = COLORS.swept;
          opacity = 0.8;
        }
      }

      if (id === userPhysicalId) {
        color = COLORS.userBlock;
        weight = COLORS.userBlockWeight;
        opacity = 1;
      }

      for (const pl of polylines) {
        pl.setStyle({ color, weight, opacity });
      }
    }
  }, [sweepRecords, userPhysicalId, segments]);

  // Hide/show on zoom
  useEffect(() => {
    const onZoom = () => {
      const zoom = map.getZoom();
      if (zoom < MIN_SEGMENT_ZOOM) {
        layerGroupRef.current.clearLayers();
        polylineMapRef.current.clear();
      }
    };
    map.on('zoomend', onZoom);
    return () => {
      map.off('zoomend', onZoom);
    };
  }, [map]);

  return null;
}
