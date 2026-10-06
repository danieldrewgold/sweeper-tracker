import { ASP_API } from '../utils/constants';
import { sodaFetch, escapeSoql } from './sodaClient';
import { cacheGet, cacheSet } from '../services/cache';
import type { AspSign } from '../types/asp';
import { STREET_ABBREVIATIONS, filterSignsForBlock } from '../utils/streetNames';

const ASP_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days — sign regulations rarely change
// v2: results are filtered to our street; drops week-old cache entries from before that
const CACHE_VERSION = 'v2';
// LIKE can return other streets' rows ahead of ours, so fetch wide and filter client-side
const ROW_LIMIT = '200';
const ROW_ORDER = 'order_completed_on_date DESC, order_number';

/** Convert CSCL abbreviations to ASP format for LIKE matching.
 *  CSCL: "W 79 ST" → ASP: "%WEST%79%STREET%"
 */
function toAspLikePattern(csclStreet: string): string {
  const words = csclStreet.toUpperCase().split(/\s+/).filter(Boolean);
  const expanded = words.map((w) => STREET_ABBREVIATIONS[w] || w);
  return '%' + expanded.join('%') + '%';
}

export async function fetchAspSigns(
  onStreet: string,
  borough: string
): Promise<AspSign[]> {
  const cacheKey = `${CACHE_VERSION}|${onStreet.toUpperCase()}|${borough.toUpperCase()}`;

  const cached = await cacheGet<AspSign[]>('asp-signs', cacheKey);
  if (cached) return cached;

  const street = escapeSoql(onStreet.toUpperCase());
  const boro = escapeSoql(borough.toUpperCase());

  // Try exact match first
  const exact = await sodaFetch<AspSign[]>(ASP_API, {
    $where: `upper(on_street)='${street}' AND upper(borough)='${boro}'`,
    $limit: '50',
    $order: ROW_ORDER,
  });
  if (exact.length > 0) {
    cacheSet('asp-signs', cacheKey, exact, ASP_TTL);
    return exact;
  }

  // Fall back to LIKE pattern (handles CSCL→ASP format differences)
  const pattern = escapeSoql(toAspLikePattern(onStreet));
  const fallback = filterSignsForBlock(
    await sodaFetch<AspSign[]>(ASP_API, {
      $where: `upper(on_street) like '${pattern}' AND upper(borough)='${boro}'`,
      $limit: ROW_LIMIT,
      $order: ROW_ORDER,
    }),
    onStreet,
  );

  cacheSet('asp-signs', cacheKey, fallback, ASP_TTL);
  return fallback;
}

export async function fetchAspSignsByStreetAndCrossStreets(
  onStreet: string,
  fromStreet: string,
  toStreet: string,
  borough: string
): Promise<AspSign[]> {
  const cacheKey = `${CACHE_VERSION}|${onStreet.toUpperCase()}|${fromStreet.toUpperCase()}|${toStreet.toUpperCase()}|${borough.toUpperCase()}`;

  const cached = await cacheGet<AspSign[]>('asp-signs', cacheKey);
  if (cached) return cached;

  const boro = escapeSoql(borough.toUpperCase());

  // Use LIKE patterns for street names (CSCL uses abbreviations, ASP uses full words)
  const streetPat = escapeSoql(toAspLikePattern(onStreet));
  const fromPat = escapeSoql(toAspLikePattern(fromStreet));
  const toPat = escapeSoql(toAspLikePattern(toStreet));

  // Try matching on_street + from_street + to_street (either direction since ASP block direction varies)
  const exact = filterSignsForBlock(
    await sodaFetch<AspSign[]>(ASP_API, {
      $where: `upper(on_street) like '${streetPat}' AND upper(borough)='${boro}' AND ((upper(from_street) like '${fromPat}' AND upper(to_street) like '${toPat}') OR (upper(from_street) like '${toPat}' AND upper(to_street) like '${fromPat}'))`,
      $limit: ROW_LIMIT,
      $order: ROW_ORDER,
    }),
    onStreet,
    [fromStreet, toStreet],
  );

  if (exact.length > 0) {
    cacheSet('asp-signs', cacheKey, exact, ASP_TTL);
    return exact;
  }

  // ASP signs can span multiple blocks (e.g. "W 135 ST" to "W 140 ST") or
  // straddle our block boundary. Try partial match: any sign where at least one
  // of our cross streets appears in from_street or to_street.
  const partial = filterSignsForBlock(
    await sodaFetch<AspSign[]>(ASP_API, {
      $where: `upper(on_street) like '${streetPat}' AND upper(borough)='${boro}' AND (upper(from_street) like '${fromPat}' OR upper(to_street) like '${toPat}' OR upper(from_street) like '${toPat}' OR upper(to_street) like '${fromPat}')`,
      $limit: ROW_LIMIT,
      $order: ROW_ORDER,
    }),
    onStreet,
    [fromStreet, toStreet],
    false,
  );

  if (partial.length > 0) {
    cacheSet('asp-signs', cacheKey, partial, ASP_TTL);
    return partial;
  }

  // No matching signs found even with partial match — return empty rather than
  // falling back to avenue-wide query which creates a Frankenstein schedule
  cacheSet('asp-signs', cacheKey, [], ASP_TTL);
  return [];
}
