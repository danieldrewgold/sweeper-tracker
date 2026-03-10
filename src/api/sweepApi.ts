import { SWEEP_API } from '../utils/constants';
import { sodaFetch, escapeSoql } from './sodaClient';
import { cacheGet, cacheSet } from '../services/cache';
import type { SweepRecord } from '../types/sweep';

const HISTORICAL_TTL = 12 * 60 * 60 * 1000; // 12 hours — historical data doesn't change within a day

function todayMidnightISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00`;
}

export function getCurrentDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Fetch all sweep records since a given ISO timestamp */
export async function fetchSweepsSince(
  sinceISO: string,
  limit = 50000
): Promise<SweepRecord[]> {
  return sodaFetch<SweepRecord[]>(SWEEP_API, {
    $where: `date_visited>'${escapeSoql(sinceISO)}'`,
    $order: 'date_visited ASC',
    $limit: String(limit),
  });
}

/** Fetch all of today's sweep records */
export async function fetchTodaySweeps(): Promise<SweepRecord[]> {
  return fetchSweepsSince(todayMidnightISO());
}

/** Fetch historical sweep records for a specific physical_id over the last N weeks */
export async function fetchHistoricalSweeps(
  physicalId: string,
  weeksBack = 8
): Promise<SweepRecord[]> {
  const cacheKey = `hist:${physicalId}`;

  const cached = await cacheGet<SweepRecord[]>('historical-sweeps', cacheKey);
  if (cached) return cached;

  const since = new Date();
  since.setDate(since.getDate() - weeksBack * 7);
  const sinceISO = since.toISOString().split('.')[0];

  const results = await sodaFetch<SweepRecord[]>(SWEEP_API, {
    $where: `physical_id='${escapeSoql(physicalId)}' AND date_visited>'${escapeSoql(sinceISO)}'`,
    $order: 'date_visited DESC',
    $limit: '200',
  });

  cacheSet('historical-sweeps', cacheKey, results, HISTORICAL_TTL);
  return results;
}
