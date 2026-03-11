export interface SweepRecord {
  physical_id: string;
  date_visited: string; // ISO 8601
  cscl_version: string;
}

export type SweepStatus = 'swept' | 'not_yet' | 'frontier';

export interface HistoricalPattern {
  physicalId: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ...
  dayName: string;
  medianTimeMinutes: number; // minutes since midnight
  medianTimeFormatted: string; // e.g. "8:35 AM"
  rangeMinutes: number; // approximate ± spread
  sampleCount: number;
}

export interface EtaResult {
  estimatedMinutes: number | null;
  confidence: 'high' | 'medium' | 'low';
  sweeperDirection: 'approaching' | 'receding' | 'unknown';
  lastSeenPhysicalId: string;
  lastSeenTime: Date;
  blocksAway: number | null;
}

export interface SweepReliability {
  skipRate: number;      // 0-100, percentage of ASP days the sweeper skipped
  totalDays: number;     // total ASP-active days observed
  totalTickets: number;  // tickets issued on this segment
  /** Per-day skip rates [Mon%, Tue%, Wed%, Thu%, Fri%], null if no strong pattern */
  dowSkipRates: number[] | null;
}

export interface InspectorTiming {
  medianMinutes: number;  // minutes since midnight
  q25Minutes: number;     // 25th percentile
  q75Minutes: number;     // 75th percentile
  sampleCount: number;
}

export interface PostSweepReturn {
  afterRate: number;      // % of ticket-days where inspector returned after sweep
  ticketDays: number;     // total ticket-days observed
}

export interface DoubleSweepInfo {
  doubleDays: number;     // days block was swept 2+ times in the past year
}
