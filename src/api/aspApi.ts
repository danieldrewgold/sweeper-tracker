import { ASP_API } from '../utils/constants';
import { sodaFetch, escapeSoql } from './sodaClient';
import { cacheGet, cacheSet } from '../services/cache';
import type { AspSign } from '../types/asp';

const ASP_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days — sign regulations rarely change

/** Convert CSCL abbreviations to ASP format for LIKE matching.
 *  CSCL: "W 79 ST" → ASP: "%WEST%79%STREET%"
 */
function toAspLikePattern(csclStreet: string): string {
  const expansions: Record<string, string> = {
    'W': 'WEST', 'E': 'EAST', 'N': 'NORTH', 'S': 'SOUTH',
    'ST': 'STREET', 'AVE': 'AVENUE', 'BLVD': 'BOULEVARD',
    'DR': 'DRIVE', 'PL': 'PLACE', 'RD': 'ROAD', 'LN': 'LANE', 'CT': 'COURT',
  };
  const words = csclStreet.toUpperCase().split(/\s+/).filter(Boolean);
  const expanded = words.map((w) => expansions[w] || w);
  return '%' + expanded.join('%') + '%';
}

export async function fetchAspSigns(
  onStreet: string,
  borough: string
): Promise<AspSign[]> {
  const cacheKey = `${onStreet.toUpperCase()}|${borough.toUpperCase()}`;

  const cached = await cacheGet<AspSign[]>('asp-signs', cacheKey);
  if (cached) return cached;

  const street = escapeSoql(onStreet.toUpperCase());
  const boro = escapeSoql(borough.toUpperCase());

  // Try exact match first
  const exact = await sodaFetch<AspSign[]>(ASP_API, {
    $where: `upper(on_street)='${street}' AND upper(borough)='${boro}'`,
    $limit: '50',
  });
  if (exact.length > 0) {
    cacheSet('asp-signs', cacheKey, exact, ASP_TTL);
    return exact;
  }

  // Fall back to LIKE pattern (handles CSCL→ASP format differences)
  const pattern = escapeSoql(toAspLikePattern(onStreet));
  const fallback = await sodaFetch<AspSign[]>(ASP_API, {
    $where: `upper(on_street) like '${pattern}' AND upper(borough)='${boro}'`,
    $limit: '50',
  });

  cacheSet('asp-signs', cacheKey, fallback, ASP_TTL);
  return fallback;
}

export async function fetchAspSignsByStreetAndCrossStreets(
  onStreet: string,
  fromStreet: string,
  toStreet: string,
  borough: string
): Promise<AspSign[]> {
  const cacheKey = `${onStreet.toUpperCase()}|${fromStreet.toUpperCase()}|${toStreet.toUpperCase()}|${borough.toUpperCase()}`;

  const cached = await cacheGet<AspSign[]>('asp-signs', cacheKey);
  if (cached) return cached;

  const boro = escapeSoql(borough.toUpperCase());

  // Use LIKE patterns for street names (CSCL uses abbreviations, ASP uses full words)
  const streetPat = escapeSoql(toAspLikePattern(onStreet));
  const fromPat = escapeSoql(toAspLikePattern(fromStreet));
  const toPat = escapeSoql(toAspLikePattern(toStreet));

  // Try matching on_street + from_street + to_street (either direction since ASP block direction varies)
  const exact = await sodaFetch<AspSign[]>(ASP_API, {
    $where: `upper(on_street) like '${streetPat}' AND upper(borough)='${boro}' AND ((upper(from_street) like '${fromPat}' AND upper(to_street) like '${toPat}') OR (upper(from_street) like '${toPat}' AND upper(to_street) like '${fromPat}'))`,
    $limit: '20',
  });

  if (exact.length > 0) {
    cacheSet('asp-signs', cacheKey, exact, ASP_TTL);
    return exact;
  }

  // ASP signs can span multiple blocks (e.g. "W 135 ST" to "W 140 ST") or
  // straddle our block boundary. Try partial match: any sign where at least one
  // of our cross streets appears in from_street or to_street.
  const partial = await sodaFetch<AspSign[]>(ASP_API, {
    $where: `upper(on_street) like '${streetPat}' AND upper(borough)='${boro}' AND (upper(from_street) like '${fromPat}' OR upper(to_street) like '${toPat}' OR upper(from_street) like '${toPat}' OR upper(to_street) like '${fromPat}')`,
    $limit: '20',
  });

  if (partial.length > 0) {
    cacheSet('asp-signs', cacheKey, partial, ASP_TTL);
    return partial;
  }

  // No matching signs found even with partial match — return empty rather than
  // falling back to avenue-wide query which creates a Frankenstein schedule
  cacheSet('asp-signs', cacheKey, [], ASP_TTL);
  return [];
}
