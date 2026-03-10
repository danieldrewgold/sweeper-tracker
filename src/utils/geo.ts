import type { CsclSegment } from '../types/cscl';

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

/** Haversine distance in meters between two [lat, lng] points */
export function haversine(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * DEG_TO_RAD;
  const dLng = (b[1] - a[1]) * DEG_TO_RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a[0] * DEG_TO_RAD) * Math.cos(b[0] * DEG_TO_RAD) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Get the center point [lat, lng] of a CSCL segment */
export function getSegmentCenter(segment: CsclSegment): [number, number] {
  const coords = segment.the_geom?.coordinates;
  if (!coords || coords.length === 0 || coords[0].length === 0) {
    return [0, 0];
  }

  const line = coords[0]; // first linestring
  let sumLat = 0;
  let sumLng = 0;
  for (const [lng, lat] of line) {
    sumLat += lat;
    sumLng += lng;
  }
  return [sumLat / line.length, sumLng / line.length];
}

/** Convert CSCL segment geometry to Leaflet-friendly [lat, lng][] arrays */
export function segmentToLatLngs(segment: CsclSegment): [number, number][][] {
  const coords = segment.the_geom?.coordinates;
  if (!coords) return [];
  return coords.map((line) => line.map(([lng, lat]) => [lat, lng] as [number, number]));
}
