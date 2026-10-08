import type { ParsedSchedule } from '../types/asp';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export interface WindowContext {
  phase: 'during' | 'before' | 'none';
  minsToNext: number | null;
}

/**
 * Where "now" falls relative to the block's next posted cleaning window, on either side of the
 * street, looking up to a week ahead. Days the GPS has never seen a sweep are skipped, matching
 * PredictionCard (dowSkipRates is indexed Monday = 0 ... Saturday = 5; negative = never swept).
 * Used for analytics context only.
 */
export function windowContext(
  schedules: ParsedSchedule[],
  dowSkipRates: number[] | null | undefined,
  now: Date = new Date(),
): WindowContext {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let best: number | null = null;

  for (let offset = 0; offset < 7; offset++) {
    const dow = (now.getDay() + offset) % 7;
    const gpsIndex = dow >= 1 ? dow - 1 : -1;
    if (dowSkipRates && gpsIndex >= 0 && dowSkipRates[gpsIndex] < 0) continue;

    for (const s of schedules) {
      if (s.day !== DAYS[dow]) continue;
      if (offset === 0 && nowMinutes >= s.startMinutes && nowMinutes < s.endMinutes) {
        return { phase: 'during', minsToNext: 0 };
      }
      const mins = offset * 1440 + s.startMinutes - nowMinutes;
      if (mins > 0 && (best === null || mins < best)) best = mins;
    }
  }
  return best === null ? { phase: 'none', minsToNext: null } : { phase: 'before', minsToNext: best };
}
