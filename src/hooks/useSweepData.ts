import { useEffect, useRef } from 'react';
import { pollSweepData, resetTracker } from '../services/sweepTracker';
import { useSweepStore } from '../store';
import { POLL_INTERVAL_MS } from '../utils/constants';
import { todayDateString } from '../utils/time';

export function useSweepData() {
  const setError = useSweepStore((s) => s.setError);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initial fetch
    pollSweepData().catch((err) => {
      console.error('Initial sweep poll failed:', err);
      setError('Failed to load sweep data');
    });

    // Polling interval
    intervalRef.current = setInterval(() => {
      pollSweepData().catch((err) => {
        console.error('Sweep poll failed:', err);
      });
    }, POLL_INTERVAL_MS);

    // Visibility change — handle tab sleep/wake
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const store = useSweepStore.getState();
        const today = todayDateString();

        // Date changed while tab was hidden
        if (store.dataDate && store.dataDate !== today) {
          resetTracker();
        }

        // Data is stale (>5 min)
        const staleThreshold = 5 * 60 * 1000;
        if (
          !store.lastPollTime ||
          Date.now() - store.lastPollTime.getTime() > staleThreshold
        ) {
          pollSweepData().catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [setError]);
}
