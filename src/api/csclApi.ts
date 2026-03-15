import { CSCL_API } from '../utils/constants';
import { sodaFetch, escapeSoql } from './sodaClient';
import { cacheGet, cacheSet } from '../services/cache';
import type { CsclSegment } from '../types/cscl';

const CSCL_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days — street geometry doesn't change

/** Quantize lat/lng to ~100m grid cells for cache keys */
function gridKey(lat: number, lng: number, radius: number): string {
  return `${Math.round(lat * 1000) / 1000},${Math.round(lng * 1000) / 1000},${radius}`;
}

export async function fetchSegmentsInRadius(
  lat: number,
  lng: number,
  radiusMeters: number,
  limit = 5000
): Promise<CsclSegment[]> {
  const key = gridKey(lat, lng, radiusMeters);

  // Check cache first
  const cached = await cacheGet<CsclSegment[]>('cscl-segments', key);
  if (cached) return cached;

  const results = await sodaFetch<CsclSegment[]>(CSCL_API, {
    $where: `within_circle(the_geom, ${lat}, ${lng}, ${radiusMeters})`,
    $limit: String(limit),
  });

  // Cache the results (fire-and-forget)
  cacheSet('cscl-segments', key, results, CSCL_TTL);

  return results;
}

export async function fetchSegmentById(physicalId: string): Promise<CsclSegment | null> {
  const key = `id:${physicalId}`;

  const cached = await cacheGet<CsclSegment>('cscl-segments', key);
  if (cached) return cached;

  const results = await sodaFetch<CsclSegment[]>(CSCL_API, {
    physicalid: physicalId,
    $limit: '1',
  });

  const segment = results[0] ?? null;
  if (segment) {
    cacheSet('cscl-segments', key, segment, CSCL_TTL);
  }
  return segment;
}

/** Search CSCL by street name (exact match on full_street_name).
 *  Used when Nominatim geocodes to the wrong part of a long street. */
export async function fetchSegmentsByStreetName(
  streetName: string,
  limit = 200
): Promise<CsclSegment[]> {
  const key = `street:${streetName.toUpperCase()}`;

  const cached = await cacheGet<CsclSegment[]>('cscl-segments', key);
  if (cached) return cached;

  const results = await sodaFetch<CsclSegment[]>(CSCL_API, {
    $where: `upper(full_street_name)='${escapeSoql(streetName.toUpperCase())}'`,
    $limit: String(limit),
  });

  if (results.length > 0) {
    cacheSet('cscl-segments', key, results, CSCL_TTL);
  }
  return results;
}

export async function fetchSegmentsByIds(physicalIds: string[]): Promise<CsclSegment[]> {
  if (physicalIds.length === 0) return [];

  // Check cache for each ID, only fetch missing ones
  const results: CsclSegment[] = [];
  const missingIds: string[] = [];

  for (const id of physicalIds) {
    const cached = await cacheGet<CsclSegment>('cscl-segments', `id:${id}`);
    if (cached) {
      results.push(cached);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length > 0) {
    const idList = missingIds.map((id) => `'${escapeSoql(id)}'`).join(',');
    const fetched = await sodaFetch<CsclSegment[]>(CSCL_API, {
      $where: `physicalid in (${idList})`,
      $limit: String(missingIds.length),
    });

    // Cache each fetched segment individually
    for (const seg of fetched) {
      cacheSet('cscl-segments', `id:${seg.physicalid}`, seg, CSCL_TTL);
      results.push(seg);
    }
  }

  return results;
}
