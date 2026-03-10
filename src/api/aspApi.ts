import { ASP_API } from '../utils/constants';
import { sodaFetch } from './sodaClient';
import type { AspSign } from '../types/asp';

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
  // Try exact match first
  const exact = await sodaFetch<AspSign[]>(ASP_API, {
    $where: `upper(on_street)='${onStreet.toUpperCase()}' AND upper(borough)='${borough.toUpperCase()}'`,
    $limit: '50',
  });
  if (exact.length > 0) return exact;

  // Fall back to LIKE pattern (handles CSCL→ASP format differences)
  const pattern = toAspLikePattern(onStreet);
  return sodaFetch<AspSign[]>(ASP_API, {
    $where: `upper(on_street) like '${pattern}' AND upper(borough)='${borough.toUpperCase()}'`,
    $limit: '50',
  });
}

export async function fetchAspSignsByStreetAndCrossStreets(
  onStreet: string,
  fromStreet: string,
  toStreet: string,
  borough: string
): Promise<AspSign[]> {
  // Try exact match first, fall back to just street + borough
  const exact = await sodaFetch<AspSign[]>(ASP_API, {
    $where: `upper(on_street)='${onStreet.toUpperCase()}' AND upper(from_street)='${fromStreet.toUpperCase()}' AND upper(to_street)='${toStreet.toUpperCase()}' AND upper(borough)='${borough.toUpperCase()}'`,
    $limit: '20',
  });

  if (exact.length > 0) return exact;

  // Fall back to street + borough only
  return fetchAspSigns(onStreet, borough);
}
