import { NOMINATIM_BASE } from '../utils/constants';

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    borough?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
}

const cache = new Map<string, NominatimResult[]>();
let lastRequestTime = 0;
const MIN_INTERVAL = 1100; // 1.1 seconds

/** Add ordinal suffixes to bare street numbers so Nominatim resolves correctly.
 *  e.g. "W 59 ST" → "W 59th ST", "123 E 4 Street" → "123 E 4th Street" */
function addOrdinalSuffixes(query: string): string {
  // Match a standalone number that's followed by a street-type word (or end of string)
  // but NOT already followed by st/nd/rd/th
  return query.replace(
    /\b(\d+)\s+(?=(ST|STREET|AVE|AVENUE|PL|PLACE|DR|DRIVE|BLVD|RD|ROAD|LN|CT)\b)/gi,
    (_, num) => {
      const n = parseInt(num, 10);
      const suffix = ordinalSuffix(n);
      return `${num}${suffix} `;
    }
  );
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL - elapsed));
  }
}

export async function geocodeSearch(query: string): Promise<NominatimResult[]> {
  const normalized = addOrdinalSuffixes(query.trim());
  const cacheKey = normalized.toLowerCase();
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  await throttle();

  const params = new URLSearchParams({
    q: normalized,
    format: 'json',
    countrycodes: 'us',
    viewbox: '-74.26,40.50,-73.70,40.92', // NYC bounding box
    bounded: '1',
    limit: '5',
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { 'User-Agent': 'NYCSweepTracker/1.0' },
  });

  lastRequestTime = Date.now();

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const results: NominatimResult[] = await response.json();
  cache.set(cacheKey, results);
  return results;
}
