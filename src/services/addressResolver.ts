import { fetchSegmentsInRadius } from '../api/csclApi';
import { haversine, getSegmentCenter } from '../utils/geo';
import type { CsclSegment } from '../types/cscl';
import type { NominatimResult } from './geocoder';

export interface ResolvedBlock {
  address: string;
  physicalId: string;
  segment: CsclSegment;
  latLng: [number, number];
  nearbySegments: CsclSegment[];
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

/** Parse house number and street name from a user's search query.
 *  e.g. "503 84th St Brooklyn" → { houseNum: "503", street: "84th St" }
 *  e.g. "Broadway, Manhattan" → { houseNum: "", street: "Broadway" } */
function parseQuery(query: string): { houseNum: string; street: string } | null {
  if (!query) return null;
  // Strip borough / city / state suffixes
  const cleaned = query
    .replace(/,?\s*(brooklyn|manhattan|bronx|queens|staten\s*island|new\s*york|nyc?|ny)\s*$/i, '')
    .replace(/,?\s*(brooklyn|manhattan|bronx|queens|staten\s*island|new\s*york|nyc?|ny)\s*$/i, '')
    .trim();
  if (!cleaned) return null;

  // Try to extract leading house number + street
  const m = cleaned.match(/^(\d+[-\d]*)\s+(.+)$/);
  if (m) {
    return { houseNum: m[1].replace(/-.*/, ''), street: m[2].trim() };
  }
  // No house number — entire thing is street name
  return { houseNum: '', street: cleaned };
}

/** Check if a house number falls within a CSCL segment's address ranges */
function houseNumberInRange(houseNum: number, seg: CsclSegment): boolean {
  const ranges = [
    [seg.l_low_hn, seg.l_high_hn],
    [seg.r_low_hn, seg.r_high_hn],
  ];
  for (const [lo, hi] of ranges) {
    const low = parseInt(lo, 10);
    const high = parseInt(hi, 10);
    if (!isNaN(low) && !isNaN(high) && houseNum >= low && houseNum <= high) {
      return true;
    }
  }
  return false;
}

/** Resolve a Nominatim result (already geocoded) to a CSCL segment.
 *  @param originalQuery — the raw text the user typed in the search box,
 *  used to extract the intended street name when Nominatim returns a POI
 *  whose address.road doesn't match. */
export async function resolveFromGeocode(
  result: NominatimResult,
  originalQuery?: string,
): Promise<ResolvedBlock | null> {
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);

  // Determine the best street name to match against
  const streetFromAddress = result.address?.road ?? result.display_name;
  const parsed = parseQuery(originalQuery ?? '');

  // Find nearby CSCL segments — expand radius if the intended street isn't found
  let segments = await fetchSegmentsInRadius(lat, lng, 150);
  const targetStreet = parsed?.street || streetFromAddress;
  const hasStreetMatch = segments.some(
    (seg) => streetSimilarity(targetStreet, seg.full_street_name || '') >= 0.8,
  );
  if (segments.length === 0 || !hasStreetMatch) {
    segments = await fetchSegmentsInRadius(lat, lng, 300);
  }
  if (segments.length === 0) return null;
  const houseNum = parsed?.houseNum
    ? parseInt(parsed.houseNum, 10)
    : result.address?.house_number
      ? parseInt(result.address.house_number, 10)
      : NaN;

  const scored = segments
    .filter((seg) => seg.the_geom)
    .map((seg) => {
      const center = getSegmentCenter(seg);
      const distance = haversine([lat, lng], center);
      const segName = seg.full_street_name || '';

      // Name similarity: take the best of Nominatim road vs user's query
      let nameSim = streetSimilarity(streetFromAddress, segName);
      if (parsed?.street) {
        const querySim = streetSimilarity(parsed.street, segName);
        nameSim = Math.max(nameSim, querySim);
      }

      // House number bonus: strongly prefer segments containing the address
      let houseBonus = 0;
      if (!isNaN(houseNum) && houseNumberInRange(houseNum, seg)) {
        houseBonus = 50;
      }

      const score = nameSim * 100 + houseBonus - distance * 0.5;
      return { segment: seg, score, distance };
    });

  scored.sort((a, b) => b.score - a.score);

  const match = scored[0];
  if (!match) return null;

  // Build a readable address from CSCL segment data
  const seg = match.segment;
  const streetName = seg.full_street_name || seg.stname_label || 'Unknown street';
  const neighborhood = result.address?.suburb || result.address?.neighbourhood || '';
  const housePrefix = result.address?.house_number ? `${result.address.house_number} ` : '';
  const displayAddress = neighborhood
    ? `${housePrefix}${streetName}, ${neighborhood}`
    : `${housePrefix}${streetName}`;

  return {
    address: displayAddress,
    physicalId: match.segment.physicalid,
    segment: match.segment,
    latLng: [lat, lng],
    nearbySegments: segments,
  };
}
