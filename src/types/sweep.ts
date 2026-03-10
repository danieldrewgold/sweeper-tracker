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
