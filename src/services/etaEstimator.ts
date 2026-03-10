import type { SweepRecord, EtaResult } from '../types/sweep';
import type { CsclSegment } from '../types/cscl';
import { haversine, getSegmentCenter } from '../utils/geo';
import { FRONTIER_WINDOW_MS } from '../utils/constants';

export function estimateEta(
  userPhysicalId: string,
  sweepRecords: Map<string, SweepRecord[]>,
  segments: Map<string, CsclSegment>
): EtaResult | null {
  const userSegment = segments.get(userPhysicalId);
  if (!userSegment) return null;

  // If user's block is already swept, no ETA needed
  if (sweepRecords.has(userPhysicalId)) return null;

  const userCenter = getSegmentCenter(userSegment);
  const now = Date.now();
  const frontierCutoff = now - FRONTIER_WINDOW_MS;

  // Find frontier segments (swept in last 10 min) near user's block
  const nearbyFrontier: Array<{
    id: string;
    distance: number;
    latestTime: number;
  }> = [];

  for (const [id, records] of sweepRecords) {
    const seg = segments.get(id);
    if (!seg) continue;

    const latest = records[records.length - 1];
    const visitTime = new Date(latest.date_visited).getTime();
    if (visitTime < frontierCutoff) continue;

    const center = getSegmentCenter(seg);
    const distance = haversine(userCenter, center);
    if (distance < 2000) {
      nearbyFrontier.push({ id, distance, latestTime: visitTime });
    }
  }

  if (nearbyFrontier.length === 0) return null;

  nearbyFrontier.sort((a, b) => a.distance - b.distance);
  const closest = nearbyFrontier[0];

  // Estimate blocks away (assume ~150m per block)
  const blocksAway = Math.max(1, Math.round(closest.distance / 150));

  // Find consecutive sweep pairs to estimate speed
  const recentRecords: Array<{
    id: string;
    time: number;
    center: [number, number];
  }> = [];

  for (const f of nearbyFrontier) {
    const seg = segments.get(f.id);
    if (!seg) continue;
    const records = sweepRecords.get(f.id);
    if (!records) continue;
    for (const r of records) {
      const time = new Date(r.date_visited).getTime();
      if (time >= frontierCutoff) {
        recentRecords.push({ id: f.id, time, center: getSegmentCenter(seg) });
      }
    }
  }

  recentRecords.sort((a, b) => a.time - b.time);

  // Calculate speed from consecutive different-segment records
  const speeds: number[] = [];
  for (let i = 1; i < recentRecords.length; i++) {
    const prev = recentRecords[i - 1];
    const curr = recentRecords[i];
    if (prev.id === curr.id) continue;

    const dist = haversine(prev.center, curr.center);
    const timeDelta = (curr.time - prev.time) / 1000;
    if (timeDelta > 0 && timeDelta < 600 && dist > 10 && dist < 500) {
      speeds.push(dist / timeDelta);
    }
  }

  let speedMps: number;
  let confidence: EtaResult['confidence'];

  if (speeds.length >= 3) {
    speedMps = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    confidence = 'high';
  } else if (speeds.length >= 1) {
    speedMps = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    confidence = 'medium';
  } else {
    // Fallback: ~8 mph = 3.6 m/s average sweeper speed
    speedMps = 3.6;
    confidence = 'low';
  }

  const etaSeconds = closest.distance / speedMps;
  const etaMinutes = Math.round((etaSeconds * 1.3) / 60); // 1.3x buffer

  const closestRecords = sweepRecords.get(closest.id)!;
  const latestRecord = closestRecords[closestRecords.length - 1];

  return {
    estimatedMinutes: Math.max(1, etaMinutes),
    confidence,
    sweeperDirection: 'approaching', // simplified — always assume approaching if frontier is nearby
    lastSeenPhysicalId: closest.id,
    lastSeenTime: new Date(latestRecord.date_visited),
    blocksAway,
  };
}
