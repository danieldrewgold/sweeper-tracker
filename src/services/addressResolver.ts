import { fetchSegmentsInRadius } from '../api/csclApi';
import { haversine, getSegmentCenter } from '../utils/geo';
import type { CsclSegment } from '../types/cscl';
import type { NominatimResult } from './geocoder';

export interface ResolvedBlock {
  address: string;
  physicalId: string;
  segment: CsclSegment;
  latLng: [number, number];
}

/** Normalize NYC street abbreviations for comparison */
function normalizeStreetName(s: string): string {
  return s
    .toUpperCase()
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bAVENUE\b/g, 'AVE')
    .replace(/\bBOULEVARD\b/g, 'BLVD')
    .replace(/\bDRIVE\b/g, 'DR')
    .replace(/\bPLACE\b/g, 'PL')
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bLANE\b/g, 'LN')
    .replace(/\bCOURT\b/g, 'CT')
    .replace(/\bWEST\b/g, 'W')
    .replace(/\bEAST\b/g, 'E')
    .replace(/\bNORTH\b/g, 'N')
    .replace(/\bSOUTH\b/g, 'S')
    .replace(/(\d+)(?:ST|ND|RD|TH)\b/g, '$1')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** String similarity with NYC street abbreviation normalization */
function streetSimilarity(a: string, b: string): number {
  const normA = normalizeStreetName(a);
  const normB = normalizeStreetName(b);

  // Exact match after normalization
  if (normA === normB) return 1;

  // Check if one contains the other
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;

  // Word-level overlap
  const wordsA = normA.split(' ').filter(Boolean);
  const wordsB = new Set(normB.split(' ').filter(Boolean));
  if (wordsA.length === 0) return 0;

  let matches = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) matches++;
  }
  return matches / Math.max(wordsA.length, wordsB.size);
}

/** Resolve a Nominatim result (already geocoded) to a CSCL segment */
export async function resolveFromGeocode(result: NominatimResult): Promise<ResolvedBlock | null> {
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);

  // Find nearby CSCL segments
  let segments = await fetchSegmentsInRadius(lat, lng, 150);
  if (segments.length === 0) {
    segments = await fetchSegmentsInRadius(lat, lng, 300);
  }
  if (segments.length === 0) return null;

  // Score by distance + street name similarity
  const streetFromAddress = result.address?.road ?? result.display_name;

  const scored = segments
    .filter((seg) => seg.the_geom)
    .map((seg) => {
      const center = getSegmentCenter(seg);
      const distance = haversine([lat, lng], center);
      const nameSim = streetSimilarity(streetFromAddress, seg.full_street_name || '');
      const score = nameSim * 100 - distance * 0.5;
      return { segment: seg, score, distance };
    });

  scored.sort((a, b) => b.score - a.score);

  const match = scored[0];
  if (!match) return null;

  // Build a readable address from CSCL segment data
  const seg = match.segment;
  const streetName = seg.full_street_name || seg.stname_label || 'Unknown street';
  const neighborhood = result.address?.suburb || result.address?.neighbourhood || '';
  const displayAddress = neighborhood
    ? `${streetName}, ${neighborhood}`
    : streetName;

  return {
    address: displayAddress,
    physicalId: match.segment.physicalid,
    segment: match.segment,
    latLng: [lat, lng],
  };
}
