import type { CsclSegment } from '../types/cscl';

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

/** Quick approximate distance in meters (good enough for <1km, avoids trig) */
function quickDist(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * 111_320;
  const dLng = (b[1] - a[1]) * 111_320 * Math.cos(a[0] * DEG_TO_RAD);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Get start and end points [lat, lng] of a CSCL segment */
export function getSegmentEndpoints(segment: CsclSegment): [[number, number], [number, number]] | null {
  const coords = segment.the_geom?.coordinates;
  if (!coords || coords.length === 0 || coords[0].length < 2) return null;
  const line = coords[0];
  return [
    [line[0][1], line[0][0]],
    [line[line.length - 1][1], line[line.length - 1][0]],
  ];
}

/**
 * Find cross street names at a segment's endpoints by checking nearby segments
 * with different street names. Returns [fromStreet, toStreet] or null.
 */
export function findCrossStreets(
  segment: CsclSegment,
  allSegments: Map<string, CsclSegment>,
): [string, string] | null {
  const endpoints = getSegmentEndpoints(segment);
  if (!endpoints) return null;

  const myStreet = (segment.full_street_name || '').toUpperCase().trim();
  const THRESHOLD = 35; // meters — NYC intersections aren't perfectly coincident in CSCL data

  const findCrossAt = (point: [number, number]): string | null => {
    for (const other of allSegments.values()) {
      const otherStreet = (other.full_street_name || '').toUpperCase().trim();
      if (!otherStreet || otherStreet === myStreet) continue;
      const otherEndpoints = getSegmentEndpoints(other);
      if (!otherEndpoints) continue;
      for (const ep of otherEndpoints) {
        if (quickDist(point, ep) < THRESHOLD) {
          return otherStreet;
        }
      }
    }
    return null;
  };

  const from = findCrossAt(endpoints[0]);
  const to = findCrossAt(endpoints[1]);
  if (!from || !to) return null;
  return [from, to];
}

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
