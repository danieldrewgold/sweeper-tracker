import type { AspSign, ParsedSchedule } from '../types/asp';
import { parseTimeToMinutes } from '../utils/time';

const DAY_NAMES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const TIME_PATTERN = /(?:MIDNIGHT|NOON|\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi;

/**
 * Parse a sign description that may contain multiple days, e.g.:
 * "NO PARKING (SANITATION BROOM SYMBOL) MONDAY THURSDAY 9:30AM-11AM"
 * Returns one ParsedSchedule per day found.
 */
export function parseSignDescription(sign: AspSign): ParsedSchedule[] {
  const desc = sign.sign_description;
  if (!desc) return [];

  // Must be a sanitation/broom sign
  if (!/(?:BROOM|SANITATION)/i.test(desc)) return [];

  // Extract all day names
  const upperDesc = desc.toUpperCase();
  const days = DAY_NAMES.filter((d) => upperDesc.includes(d));
  if (days.length === 0) return [];

  // Extract time range (first two time-like tokens)
  const times = [...desc.matchAll(TIME_PATTERN)].map((m) => m[0].trim());
  if (times.length < 2) return [];

  const startStr = times[0];
  const endStr = times[1];

  const startMinutes = parseTimeToMinutes(startStr);
  const endMinutes = parseTimeToMinutes(endStr);

  // Skip if times couldn't be parsed
  if (isNaN(startMinutes) || isNaN(endMinutes)) return [];

  return days.map((day) => ({
    day,
    startTime: startStr,
    endTime: endStr,
    startMinutes,
    endMinutes,
    side: sign.side_of_street || '',
    rawDescription: desc,
  }));
}

export function parseAllSigns(signs: AspSign[]): ParsedSchedule[] {
  const parsed: ParsedSchedule[] = [];
  const seen = new Set<string>();

  for (const sign of signs) {
    const schedules = parseSignDescription(sign);

    for (const schedule of schedules) {
      // Deduplicate by day + side (different blocks on the same street
      // may have slightly different time windows, keep the first seen)
      const key = `${schedule.day}-${schedule.side}`;
      if (seen.has(key)) continue;
      seen.add(key);

      parsed.push(schedule);
    }
  }

  // Sort by day of week
  const dayOrder: Record<string, number> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
  };

  parsed.sort((a, b) => (dayOrder[a.day] ?? 8) - (dayOrder[b.day] ?? 8));
  return parsed;
}
