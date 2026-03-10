import { useEffect } from 'react';
import { useSweepStore } from '../store';
import { estimateEta } from '../services/etaEstimator';

/** Recomputes ETA whenever sweep data or user block changes */
export function useEta() {
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);
  const sweepRecords = useSweepStore((s) => s.sweepRecords);
  const segments = useSweepStore((s) => s.segments);
  const setEta = useSweepStore((s) => s.setEta);

  useEffect(() => {
    if (!userPhysicalId) {
      setEta(null);
      return;
    }

    const result = estimateEta(userPhysicalId, sweepRecords, segments);
    setEta(result);
  }, [userPhysicalId, sweepRecords, segments, setEta]);
}
