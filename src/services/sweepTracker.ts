import { fetchSweepsSince, fetchTodaySweeps, getCurrentDateString } from '../api/sweepApi';
import { useSweepStore } from '../store';
import type { SweepRecord } from '../types/sweep';

let lastFetchedTimestamp: string | null = null;

export async function pollSweepData(): Promise<SweepRecord[]> {
  const store = useSweepStore.getState();
  const today = getCurrentDateString();

  // Date rollover — clear everything and start fresh
  if (store.dataDate && store.dataDate !== today) {
    store.clearSweepData();
    lastFetchedTimestamp = null;
  }

  let records: SweepRecord[];

  if (!lastFetchedTimestamp || store.dataDate !== today) {
    // First fetch of the day — get everything
    records = await fetchTodaySweeps();
    store.setSweepRecords(records, today);
  } else {
    // Incremental fetch — only new records
    records = await fetchSweepsSince(lastFetchedTimestamp, 5000);
    if (records.length > 0) {
      store.addSweepRecords(records);
    }
  }

  if (records.length > 0) {
    lastFetchedTimestamp = records[records.length - 1].date_visited;
  }

  store.setLastPollTime(new Date());
  return records;
}

export function resetTracker() {
  lastFetchedTimestamp = null;
  useSweepStore.getState().clearSweepData();
}
