import { CSCL_API } from '../utils/constants';
import { sodaFetch } from './sodaClient';
import type { CsclSegment } from '../types/cscl';

export async function fetchSegmentsInRadius(
  lat: number,
  lng: number,
  radiusMeters: number,
  limit = 5000
): Promise<CsclSegment[]> {
  return sodaFetch<CsclSegment[]>(CSCL_API, {
    $where: `within_circle(the_geom, ${lat}, ${lng}, ${radiusMeters})`,
    $limit: String(limit),
  });
}

export async function fetchSegmentById(physicalId: string): Promise<CsclSegment | null> {
  const results = await sodaFetch<CsclSegment[]>(CSCL_API, {
    physicalid: physicalId,
    $limit: '1',
  });
  return results[0] ?? null;
}

export async function fetchSegmentsByIds(physicalIds: string[]): Promise<CsclSegment[]> {
  if (physicalIds.length === 0) return [];
  const idList = physicalIds.map((id) => `'${id}'`).join(',');
  return sodaFetch<CsclSegment[]>(CSCL_API, {
    $where: `physicalid in (${idList})`,
    $limit: String(physicalIds.length),
  });
}
