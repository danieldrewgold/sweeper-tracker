// Allowed analytics details. Anything not listed here is dropped; unknown event names are rejected.

type Field =
  | { kind: 'bool' }
  | { kind: 'int'; min: number; max: number }
  | { kind: 'enum'; values: readonly string[] };

const BOOL: Field = { kind: 'bool' };
const int = (min: number, max: number): Field => ({ kind: 'int', min, max });
const oneOf = (...values: string[]): Field => ({ kind: 'enum', values });

/** Details accepted on page visits and block lookups. */
export const BUILTIN_PROPS: Record<'visit' | 'lookup', Record<string, Field>> = {
  visit: {
    page: oneOf('/', '/data', '/privacy', 'other'),
    standalone: BOOL, // opened from a home-screen icon
  },
  lookup: {
    phase: oneOf('during', 'before', 'none'), // relative to the block's next posted window, either side
    mins_to_next: int(0, 7 * 1440),
    swept_today: BOOL,
    ms_since_load: int(0, 60 * 60 * 1000),
    first: BOOL, // first lookup of this page load
  },
};

/** Named feature events and their details. */
export const EVENT_PROPS: Record<string, Record<string, Field>> = {
  alert_toggle: { on: BOOL, permission: oneOf('granted', 'denied', 'default', 'unsupported') },
  coffee_click: {},
  directions_click: { app: oneOf('google', 'waze') },
  page_view: { page: oneOf('data', 'privacy') },
  lookup_failed: { reason: oneOf('no_results', 'search_error', 'no_segment', 'error', 'restore_failed') },
};

/** Keep only allowed, well-typed keys. Returns null when nothing valid remains. */
export function cleanProps(schema: Record<string, Field>, raw: unknown): Record<string, boolean | number | string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, boolean | number | string> = {};
  for (const [key, field] of Object.entries(schema)) {
    const value = (raw as Record<string, unknown>)[key];
    if (field.kind === 'bool' && typeof value === 'boolean') out[key] = value;
    else if (field.kind === 'int' && typeof value === 'number' && Number.isFinite(value)) {
      out[key] = Math.min(field.max, Math.max(field.min, Math.round(value)));
    } else if (field.kind === 'enum' && typeof value === 'string' && field.values.includes(value)) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}
