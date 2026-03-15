import { fetchSegmentsInRadius, fetchSegmentsByStreetName } from '../api/csclApi';
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

const BORO_NAMES: Record<string, string> = {
  '1': 'Manhattan', '2': 'Bronx', '3': 'Brooklyn', '4': 'Queens', '5': 'Staten Island',
};

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
    .replace(/\bPARKWAY\b/g, 'PKWY')
    .replace(/\bEXPRESSWAY\b/g, 'EXPY')
    .replace(/\bHIGHWAY\b/g, 'HWY')
    .replace(/\bTERRACE\b/g, 'TER')
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
 *  e.g. "139-49 Queens Blvd" → { houseNum: "139-49", street: "Queens Blvd" }
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
  // Keep hyphenated numbers intact (e.g. "139-20" is a Queens address, not a range)
  const m = cleaned.match(/^(\d+(?:-\d+)?)\s+(.+)$/);
  if (m) {
    return { houseNum: m[1], street: m[2].trim() };
  }
  // No house number — entire thing is street name
  return { houseNum: '', street: cleaned };
}

/** Parse a CSCL house number like "139-098" or "901" into a comparable integer.
 *  Hyphenated Queens-style addresses (block-unit) are converted: "139-098" → 139098.
 *  Plain numbers pass through: "901" → 901. */
function parseCsclHouseNumber(hn: string): number {
  if (!hn) return NaN;
  const s = String(hn).trim();
  const m = s.match(/^(\d+)-(\d+)$/);
  if (m) {
    // Queens hyphenated: "139-098" → 139098 (block * 1000 + unit)
    return parseInt(m[1], 10) * 1000 + parseInt(m[2], 10);
  }
  return parseInt(s, 10);
}

/** Normalize a user-entered house number to the same scale as CSCL.
 *  "139-20" → 139020, "139" → 139, "901" → 901. */
function parseUserHouseNumber(hn: string): { plain: number; hyphenated: number | null } {
  const s = String(hn).trim();
  const m = s.match(/^(\d+)-(\d+)$/);
  if (m) {
    return {
      plain: parseInt(m[1], 10),
      hyphenated: parseInt(m[1], 10) * 1000 + parseInt(m[2], 10),
    };
  }
  return { plain: parseInt(s, 10), hyphenated: null };
}

/** Check if a house number falls within a CSCL segment's address ranges.
 *  Handles Queens-style hyphenated addresses (e.g. "139-20" within "139-000" to "139-098"). */
function houseNumberInRange(houseNum: number, seg: CsclSegment, rawHouseNum?: string): boolean {
  const ranges = [
    [seg.l_low_hn, seg.l_high_hn],
    [seg.r_low_hn, seg.r_high_hn],
  ];
  for (const [lo, hi] of ranges) {
    const low = parseCsclHouseNumber(lo);
    const high = parseCsclHouseNumber(hi);
    if (isNaN(low) || isNaN(high) || (low === 0 && high === 0)) continue;

    // If CSCL uses hyphenated format, compare in hyphenated scale
    const isHyphenated = String(lo).includes('-');
    if (isHyphenated && rawHouseNum) {
      const parsed = parseUserHouseNumber(rawHouseNum);
      const checkVal = parsed.hyphenated ?? parsed.plain;
      if (checkVal >= low && checkVal <= high) return true;
    } else {
      if (houseNum >= low && houseNum <= high) return true;
    }
  }
  return false;
}

/** Score and rank CSCL segments for a given search */
function scoreSegments(
  segments: CsclSegment[],
  lat: number,
  lng: number,
  streetFromAddress: string,
  parsed: { houseNum: string; street: string } | null,
  rawHouseNum: string,
  houseNum: number,
): { segment: CsclSegment; score: number; distance: number }[] {
  return segments
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
      if (!isNaN(houseNum) && houseNumberInRange(houseNum, seg, rawHouseNum)) {
        houseBonus = 50;
      }

      // For direct CSCL lookups (where distance to Nominatim point is irrelevant),
      // house number match is the dominant factor
      const score = nameSim * 100 + houseBonus - distance * 0.5;
      return { segment: seg, score, distance };
    })
    .sort((a, b) => b.score - a.score);
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
  const rawHouseNum = parsed?.houseNum || result.address?.house_number || '';
  const houseNum = rawHouseNum ? parseInt(rawHouseNum, 10) : NaN;

  // Step 1: Find nearby CSCL segments from Nominatim's geocoded location
  let segments = await fetchSegmentsInRadius(lat, lng, 150);
  const targetStreet = parsed?.street || streetFromAddress;
  const hasStreetMatch = segments.some(
    (seg) => streetSimilarity(targetStreet, seg.full_street_name || '') >= 0.8,
  );
  if (segments.length === 0 || !hasStreetMatch) {
    segments = await fetchSegmentsInRadius(lat, lng, 300);
  }

  // Score what we found nearby
  let scored = scoreSegments(segments, lat, lng, streetFromAddress, parsed, rawHouseNum, houseNum);

  // Check if we found a house-number match in the nearby results
  const hasHouseMatch = !isNaN(houseNum) && scored.some((s) =>
    houseNumberInRange(houseNum, s.segment, rawHouseNum)
  );

  // Step 2: If user specified a house number and we didn't find it nearby,
  // the geocoder probably landed on the wrong part of a long street.
  // Fall back to a direct CSCL search by street name.
  if (!isNaN(houseNum) && !hasHouseMatch && parsed?.street) {
    // Use the normalized name (BOULEVARD→BLVD, AVENUE→AVE, etc.)
    // which matches CSCL's naming convention
    const normalizedQuery = normalizeStreetName(parsed.street);

    // Also try the Nominatim road name if available (it's often the CSCL-exact name)
    const nominatimRoad = result.address?.road ? normalizeStreetName(result.address.road) : '';

    let directSegments: CsclSegment[] = [];
    directSegments = await fetchSegmentsByStreetName(normalizedQuery).catch(() => []);
    // If normalized query didn't work, try the Nominatim road name
    if (directSegments.length === 0 && nominatimRoad && nominatimRoad !== normalizedQuery) {
      directSegments = await fetchSegmentsByStreetName(nominatimRoad).catch(() => []);
    }

    if (directSegments.length > 0) {
      // Score these by house number match (distance to Nominatim point doesn't matter)
      const directScored = directSegments
        .filter((seg) => seg.the_geom)
        .map((seg) => {
          const segName = seg.full_street_name || '';
          const nameSim = streetSimilarity(targetStreet, segName);
          let houseBonus = 0;
          if (houseNumberInRange(houseNum, seg, rawHouseNum)) {
            houseBonus = 100; // Strong bonus — this is the primary signal
          }
          return { segment: seg, score: nameSim * 100 + houseBonus, distance: 0 };
        })
        .sort((a, b) => b.score - a.score);

      // If we found a house number match via direct lookup, use it
      const directMatch = directScored.find((s) =>
        houseNumberInRange(houseNum, s.segment, rawHouseNum)
      );
      if (directMatch) {
        const seg = directMatch.segment;
        const center = getSegmentCenter(seg);
        const streetName = seg.full_street_name || seg.stname_label || 'Unknown street';

        // Fetch neighbors around the actual segment for display
        const nearbySegments = await fetchSegmentsInRadius(center[0], center[1], 300).catch(() => [seg]);

        // Use the user's original house number + borough (NOT the wrong Nominatim neighborhood)
        const displayHouse = rawHouseNum ? `${rawHouseNum} ` : '';
        const boroName = BORO_NAMES[seg.boroughcode] || '';
        const displayAddress = boroName
          ? `${displayHouse}${streetName}, ${boroName}`
          : `${displayHouse}${streetName}`;

        return {
          address: displayAddress,
          physicalId: seg.physicalid,
          segment: seg,
          latLng: center,
          nearbySegments,
        };
      }
    }
  }

  // Step 3: Use the best nearby match (original flow)
  if (scored.length === 0) return null;

  const match = scored[0];
  const seg = match.segment;
  const streetName = seg.full_street_name || seg.stname_label || 'Unknown street';
  const neighborhood = result.address?.neighbourhood
    || (result.address as Record<string, string | undefined>)?.quarter
    || result.address?.suburb
    || '';
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
