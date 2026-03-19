export const SODA_BASE = 'https://data.cityofnewyork.us/resource';
export const SWEEP_DATASET = 'c23c-uwsm';
export const CSCL_DATASET = 'inkn-q76z';
export const ASP_SIGNS_DATASET = '2x64-6f34';

export const SWEEP_API = `${SODA_BASE}/${SWEEP_DATASET}.json`;
export const CSCL_API = `${SODA_BASE}/${CSCL_DATASET}.json`;
export const ASP_API = `${SODA_BASE}/${ASP_SIGNS_DATASET}.json`;

export const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export const SODA_APP_TOKEN = import.meta.env.VITE_SODA_APP_TOKEN || '';

// NYC default center (Manhattan, centered for good overview)
export const NYC_CENTER: [number, number] = [40.7484, -73.9857];
export const DEFAULT_ZOOM = 14;
export const MIN_SEGMENT_ZOOM = 14;

// Polling
export const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const FRONTIER_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Segment colors
export const COLORS = {
  swept: '#22C55E',
  notYet: '#CBD5E1',
  noAsp: '#D8B4FE',    // lavender — metered / commercial / no street cleaning
  frontier: '#EAB308',
  userBlock: '#3B82F6',
  userBlockWeight: 7,
  defaultWeight: 4,
} as const;

// CSCL fetch radius in meters
export const SEGMENT_FETCH_RADIUS = 800;
