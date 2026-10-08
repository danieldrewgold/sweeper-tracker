/**
 * First-party usage logging (what is kept is described on /privacy).
 * Fire-and-forget: never blocks the UI, never throws, never shows errors.
 *
 * Opt out on a device with ?notrack (persists), opt back in with ?track.
 * Automated browsers and Global Privacy Control are never tracked.
 * Campaign links: ?s=name (or utm_source=name), e.g. sweeptracker.nyc/?s=sticker-flatbush.
 */

export type LookupSource = 'search' | 'gps' | 'map' | 'saved' | 'shared_link';

export type TrackedEvent =
  | { name: 'alert_toggle'; props: { on: boolean; permission: NotificationPermission | 'unsupported' } }
  | { name: 'coffee_click' }
  | { name: 'directions_click'; props: { app: 'google' | 'waze' } }
  | { name: 'page_view'; props: { page: 'data' | 'privacy' } }
  | {
      name: 'lookup_failed';
      props: { reason: 'no_results' | 'search_error' | 'no_segment' | 'error' | 'restore_failed' };
    };

const OPT_OUT_KEY = 'st_notrack';

function computeDisabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('notrack')) localStorage.setItem(OPT_OUT_KEY, '1');
    if (params.has('track')) localStorage.removeItem(OPT_OUT_KEY);
    if (localStorage.getItem(OPT_OUT_KEY) === '1') return true;
  } catch {
    // storage blocked: fall through to the other checks
  }
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.webdriver === true || nav.globalPrivacyControl === true;
}

let disabled: boolean | null = null;
const isDisabled = () => (disabled ??= computeDisabled());

function post(payload: Record<string, unknown>): Promise<void> {
  if (isDisabled()) return Promise.resolve();
  return fetch('/api/e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
    keepalive: true,
  }).then(
    () => undefined,
    () => undefined,
  );
}

/** Referring site's hostname only (never the full URL); null for direct visits and internal navigation. */
function referrerDomain(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.replace(/^www\./, '');
    return host === window.location.hostname.replace(/^www\./, '') ? null : host;
  } catch {
    return null;
  }
}

function campaignTag(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const tag = (params.get('s') ?? params.get('utm_source') ?? '').trim().toLowerCase();
    return /^[a-z0-9_-]{1,40}$/.test(tag) ? tag : null;
  } catch {
    return null;
  }
}

function landingPage(): string {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return path === '/' || path === '/data' || path === '/privacy' ? path : 'other';
}

function openedFromHomeScreen(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  try {
    return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

let visit: Promise<void> | null = null;

/** Log one visit per page load. Everything else waits for it so the first request sets the visitor cookie. */
export function trackVisit(): Promise<void> {
  visit ??= post({
    t: 'visit',
    ref: referrerDomain(),
    campaign: campaignTag(),
    props: { page: landingPage(), standalone: openedFromHomeScreen() },
  });
  return visit;
}

/** Odd or even side of the street, from the house number (Queens "139-49" uses the last part). */
export function sideFromHouseNumber(houseNumber?: string | null): 'odd' | 'even' | null {
  const m = houseNumber?.match(/(\d+)\s*$/);
  if (!m) return null;
  return Number(m[1]) % 2 === 1 ? 'odd' : 'even';
}

let lookupsThisLoad = 0;

export function trackLookup(args: {
  segmentId: string;
  label: string;
  source: LookupSource;
  houseNumber?: string | null;
  phase?: 'during' | 'before' | 'none';
  minsToNext?: number | null;
  sweptToday?: boolean;
}): void {
  const first = lookupsThisLoad++ === 0;
  const msSinceLoad = Math.round(performance.now());
  void trackVisit().then(() =>
    post({
      t: 'lookup',
      seg: args.segmentId,
      label: args.label,
      src: args.source,
      side: sideFromHouseNumber(args.houseNumber),
      props: {
        phase: args.phase,
        mins_to_next: args.minsToNext ?? undefined,
        swept_today: args.sweptToday,
        ms_since_load: msSinceLoad,
        first,
      },
    }),
  );
}

export function trackEvent(event: TrackedEvent): void {
  void trackVisit().then(() => post({ t: 'event', name: event.name, props: 'props' in event ? event.props : {} }));
}
