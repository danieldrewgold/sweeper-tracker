const MAPPING_BASE = 'https://sweepnyc.nyc.gov/mappingapi/api';

export interface ActiveResponse {
  Active: boolean;
  LastModified: string; // ISO timestamp
  NextModify: string;   // ISO timestamp
}

export interface SweepInfoTime {
  Type: string;       // "VISITED"
  VisitedTime: string; // ISO UTC timestamp
  ReceivedTime: string;
}

export interface SweepInfoSign {
  HasSanitationBroomSymbol: boolean;
  HasMoonAndStarsSymbol: boolean;
  SignText: string;
}

export interface SweepInfoNotes {
  Next: unknown;
  Signs: SweepInfoSign[];
}

export interface SweepInfoResponse {
  ObjectId: number;
  Street: string;
  Notes: string; // JSON string → SweepInfoNotes
  Times: SweepInfoTime[];
}

/** Check if sweep tracking is currently active and get last-modified timestamp */
export async function fetchActive(): Promise<ActiveResponse> {
  const now = Math.floor(Date.now() / 1000);
  const res = await fetch(`${MAPPING_BASE}/highlight/active?now=${now}`);
  if (!res.ok) throw new Error(`Active API error: ${res.status}`);
  return res.json();
}

/** Get sweep info for a specific location (real-time visit data + signs) */
export async function fetchSweepInfo(
  lat: number,
  lon: number
): Promise<SweepInfoResponse | null> {
  const t = Date.now();
  const res = await fetch(
    `${MAPPING_BASE}/highlight/sweepinfo?lat=${lat}&lon=${lon}&t=${t}&radius=0.5`
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`SweepInfo API error: ${res.status}`);
  }
  return res.json();
}

/** Build the tile URL template for Leaflet TileLayer */
export function getSweepTileUrl(cacheTime: number): string {
  return `${MAPPING_BASE}/highlight?layerName=VISITED&z={z}&x={x}&y={y}&t=${cacheTime}`;
}
