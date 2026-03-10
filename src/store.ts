import { create } from 'zustand';
import type { CsclSegment } from './types/cscl';
import type { SweepRecord, HistoricalPattern, EtaResult } from './types/sweep';
import type { ParsedSchedule } from './types/asp';

interface SweepState {
  // Map
  mapCenter: [number, number];
  mapZoom: number;

  // CSCL segments loaded for current viewport
  segments: Map<string, CsclSegment>;
  addSegments: (segs: CsclSegment[]) => void;

  // Today's sweep records (SODA — delayed, used for historical + bulk count)
  sweepRecords: Map<string, SweepRecord[]>;
  lastPollTime: Date | null;
  dataDate: string; // "YYYY-MM-DD"
  setSweepRecords: (records: SweepRecord[], dateStr: string) => void;
  addSweepRecords: (records: SweepRecord[]) => void;
  clearSweepData: () => void;
  setLastPollTime: (t: Date) => void;

  // Real-time sweep info (from mappingapi — authoritative)
  sweepVisitTime: Date | null;       // real-time visit time for user's block
  sweepActive: boolean;              // whether sweep tracking is currently active
  sweepTileCacheTime: number;        // cache-busting timestamp for tile overlay
  setSweepVisitTime: (t: Date | null) => void;
  setSweepActive: (active: boolean, cacheTime: number) => void;

  // User's block
  userAddress: string | null;
  userPhysicalId: string | null;
  userLatLng: [number, number] | null;
  setUserBlock: (address: string, physicalId: string, latLng: [number, number]) => void;
  clearUserBlock: () => void;

  // Historical pattern
  historicalPattern: HistoricalPattern | null;
  setHistoricalPattern: (p: HistoricalPattern | null) => void;

  // ASP schedule
  aspSchedules: ParsedSchedule[];
  setAspSchedules: (s: ParsedSchedule[]) => void;

  // ETA
  eta: EtaResult | null;
  setEta: (e: EtaResult | null) => void;

  // UI
  isLoading: boolean;
  error: string | null;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useSweepStore = create<SweepState>((set) => ({
  mapCenter: [40.7580, -73.9855],
  mapZoom: 13,

  segments: new Map(),
  addSegments: (segs) =>
    set((state) => {
      const next = new Map(state.segments);
      for (const seg of segs) {
        if (seg.the_geom) {
          next.set(seg.physicalid, seg);
        }
      }
      return { segments: next };
    }),

  sweepRecords: new Map(),
  lastPollTime: null,
  dataDate: '',
  setSweepRecords: (records, dateStr) =>
    set(() => {
      const map = new Map<string, SweepRecord[]>();
      for (const r of records) {
        const existing = map.get(r.physical_id) ?? [];
        existing.push(r);
        map.set(r.physical_id, existing);
      }
      return { sweepRecords: map, dataDate: dateStr };
    }),
  addSweepRecords: (records) =>
    set((state) => {
      const next = new Map(state.sweepRecords);
      for (const r of records) {
        const existing = next.get(r.physical_id) ?? [];
        existing.push(r);
        next.set(r.physical_id, existing);
      }
      return { sweepRecords: next };
    }),
  clearSweepData: () =>
    set({ sweepRecords: new Map(), lastPollTime: null, dataDate: '' }),
  setLastPollTime: (t) => set({ lastPollTime: t }),

  sweepVisitTime: null,
  sweepActive: false,
  sweepTileCacheTime: 0,
  setSweepVisitTime: (t) => set({ sweepVisitTime: t }),
  setSweepActive: (active, cacheTime) => set({ sweepActive: active, sweepTileCacheTime: cacheTime }),

  userAddress: null,
  userPhysicalId: null,
  userLatLng: null,
  setUserBlock: (address, physicalId, latLng) =>
    set({ userAddress: address, userPhysicalId: physicalId, userLatLng: latLng }),
  clearUserBlock: () =>
    set({
      userAddress: null,
      userPhysicalId: null,
      userLatLng: null,
      historicalPattern: null,
      aspSchedules: [],
      eta: null,
      sweepVisitTime: null,
    }),

  historicalPattern: null,
  setHistoricalPattern: (p) => set({ historicalPattern: p }),

  aspSchedules: [],
  setAspSchedules: (s) => set({ aspSchedules: s }),

  eta: null,
  setEta: (e) => set({ eta: e }),

  isLoading: false,
  error: null,
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),
}));
