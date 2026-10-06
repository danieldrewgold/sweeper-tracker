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

  // Extract all day names, handling "EXCEPT <day>" patterns
  const upperDesc = desc.toUpperCase();

  // Check for "EXCEPT SUNDAY" (or other "EXCEPT <day>") patterns first
  // These mean "every day EXCEPT the named day"
  const exceptMatch = upperDesc.match(/EXCEPT\s+(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)/);
  let days: string[];
  if (exceptMatch) {
    const excludedDay = exceptMatch[1];
    days = DAY_NAMES.filter((d) => d !== excludedDay);
  } else {
    days = DAY_NAMES.filter((d) => upperDesc.includes(d));
  }
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
  // Group every window by day + side, remembering when its order was completed
  const byDaySide = new Map<string, { schedule: ParsedSchedule; completed: string }[]>();

  for (const sign of signs) {
    const completed = sign.order_completed_on_date ?? '';
    for (const schedule of parseSignDescription(sign)) {
      const key = `${schedule.day}-${schedule.side}`;
      const group = byDaySide.get(key) ?? [];
      group.push({ schedule, completed });
      byDaySide.set(key, group);
    }
  }

  // When orders disagree, the most recently completed one wins (older orders can stay
  // marked Current after new signs go up). Windows from the newest date are all kept:
  // one order can post a daily window plus a weekly one along different stretches of curb.
  const parsed: ParsedSchedule[] = [];
  for (const group of byDaySide.values()) {
    const newest = group.reduce((max, g) => (g.completed > max ? g.completed : max), '');
    const seen = new Set<string>();
    for (const { schedule, completed } of group) {
      if (completed !== newest) continue;
      const window = `${schedule.startMinutes}-${schedule.endMinutes}`;
      if (seen.has(window)) continue;
      seen.add(window);
      parsed.push(schedule);
    }
  }

  // Sort by day of week, then side, then start time
  const dayOrder: Record<string, number> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
  };

  parsed.sort((a, b) =>
    (dayOrder[a.day] ?? 8) - (dayOrder[b.day] ?? 8)
    || a.side.localeCompare(b.side)
    || a.startMinutes - b.startMinutes,
  );
  return parsed;
}
