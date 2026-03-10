import { fetchHistoricalSweeps } from '../api/sweepApi';
import type { HistoricalPattern } from '../types/sweep';
import { dayName, formatMinutes, dateToMinutes } from '../utils/time';

export async function analyzeHistoricalPattern(
  physicalId: string
): Promise<HistoricalPattern | null> {
  // Look back 26 weeks for more data (SODA coverage can be sparse)
  const records = await fetchHistoricalSweeps(physicalId, 26);
  if (records.length === 0) return null;

  // Group by day of week
  const byDay = new Map<number, number[]>(); // dayOfWeek -> array of minutes-since-midnight

  for (const r of records) {
    const date = new Date(r.date_visited);
    const dow = date.getDay();
    const minutes = dateToMinutes(date);

    const existing = byDay.get(dow) ?? [];
    existing.push(minutes);
    byDay.set(dow, existing);
  }

  // Prefer today's day of week if we have data; otherwise pick the day with most data
  const todayDow = new Date().getDay();
  const todayTimes = byDay.get(todayDow);

  let bestDay: number;
  if (todayTimes && todayTimes.length >= 1) {
    bestDay = todayDow;
  } else {
    bestDay = -1;
    for (const [dow, dayTimes] of byDay) {
      const currentBest = byDay.get(bestDay)?.length ?? 0;
      if (dayTimes.length > currentBest) {
        bestDay = dow;
      }
    }
  }

  const bestTimes = byDay.get(bestDay);
  if (bestDay === -1 || !bestTimes || bestTimes.length === 0) return null;

  const times = bestTimes;
  times.sort((a, b) => a - b);

  // Median
  const mid = Math.floor(times.length / 2);
  const median =
    times.length % 2 === 0 ? (times[mid - 1] + times[mid]) / 2 : times[mid];

  // Range (interquartile-ish)
  const q1 = times[Math.floor(times.length * 0.25)];
  const q3 = times[Math.floor(times.length * 0.75)];
  const range = Math.round((q3 - q1) / 2);

  return {
    physicalId,
    dayOfWeek: bestDay,
    dayName: dayName(bestDay),
    medianTimeMinutes: median,
    medianTimeFormatted: formatMinutes(median),
    rangeMinutes: Math.max(range, 5), // at least ±5 min
    sampleCount: times.length,
  };
}
