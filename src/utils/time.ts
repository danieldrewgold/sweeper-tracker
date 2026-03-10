/** Format minutes since midnight to a display string like "8:35 AM" */
export function formatMinutes(minutes: number): string {
  if (isNaN(minutes)) return '';
  // Clamp to valid 24-hour range
  const clamped = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(clamped / 60);
  const m = Math.round(clamped % 60);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Parse a time string like "8:30AM" or "MIDNIGHT" to minutes since midnight */
export function parseTimeToMinutes(timeStr: string): number {
  if (timeStr.toUpperCase() === 'MIDNIGHT') return 0;
  if (timeStr.toUpperCase() === 'NOON') return 720;

  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return NaN; // return NaN on parse failure (distinguishable from midnight = 0)

  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** Get minutes since midnight for a Date, in NYC Eastern time.
 *  Ensures correct results regardless of the user's local timezone. */
export function dateToMinutes(date: Date): number {
  const nycTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return nycTime.getHours() * 60 + nycTime.getMinutes();
}

/** Get day-of-week (0=Sun) for a Date, in NYC Eastern time. */
export function dateToNycDay(date: Date): number {
  const nycTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return nycTime.getDay();
}

/** Format a Date to "9:14 AM" */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Relative time string like "2 min ago" */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/** Get today's date as YYYY-MM-DD */
export function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Day of week name */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function dayName(dayIndex: number): string {
  return DAY_NAMES[dayIndex] ?? '';
}
