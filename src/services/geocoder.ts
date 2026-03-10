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

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL - elapsed));
  }
}

export async function geocodeSearch(query: string): Promise<NominatimResult[]> {
  const cacheKey = query.toLowerCase().trim();
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  await throttle();

  const params = new URLSearchParams({
    q: query,
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
