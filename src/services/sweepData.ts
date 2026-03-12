import type { SweepReliability, InspectorTiming, PostSweepReturn, DoubleSweepInfo } from '../types/sweep';

interface SweepData {
  r: Record<string, [number, number, number, number[] | null]>;
  i: Record<string, [number, number, number, number]>;
  p: Record<string, [number, number]>;
  d: Record<string, number>;
}

let sweepData: SweepData | null = null;
let loadPromise: Promise<SweepData> | null = null;

function loadData(): Promise<SweepData> {
  if (sweepData) return Promise.resolve(sweepData);
  if (!loadPromise) {
    loadPromise = import('../data/sweepData.json').then((mod) => {
      sweepData = mod.default as unknown as SweepData;
      return sweepData;
    });
  }
  return loadPromise;
}

/** Normalize street name to match JSON keys (mirrors Python normalizer) */
function normalizeStreet(s: string): string {
  return s
    .toUpperCase()
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bAVENUE\b/g, 'AVE')
    .replace(/\bBOULEVARD\b/g, 'BLVD')
    .replace(/\bDRIVE\b/g, 'DR')
    .replace(/\bPLACE\b/g, 'PL')
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bLANE\b/g, 'LN')
    .replace(/\bCOURT\b/g, 'CT')
    .replace(/\bWEST\b/g, 'W')
    .replace(/\bEAST\b/g, 'E')
    .replace(/\bNORTH\b/g, 'N')
    .replace(/\bSOUTH\b/g, 'S')
    .replace(/(\d+)(?:ST|ND|RD|TH)\b/g, '$1')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getSweepReliability(physicalId: string): Promise<SweepReliability | null> {
  const data = await loadData();
  const entry = data.r[physicalId];
  if (!entry) return null;
  return {
    skipRate: entry[0],
    totalDays: entry[1],
    totalTickets: entry[2],
    dowSkipRates: entry[3] ?? null,
  };
}

export async function getInspectorTiming(
  streetName: string,
  borough: string,
): Promise<InspectorTiming | null> {
  const data = await loadData();
  const key = `${normalizeStreet(streetName)}|${borough}`;
  const entry = data.i[key];
  if (!entry) return null;
  return {
    medianMinutes: entry[0],
    q25Minutes: entry[1],
    q75Minutes: entry[2],
    sampleCount: entry[3],
  };
}

/** Synchronous inspector lookup — returns q75 (minutes since midnight) or null.
 *  Only works after sweepData.json has been loaded (always true once a block is selected). */
export function getInspectorQ75Sync(streetName: string, borough: string): number | null {
  if (!sweepData) return null;
  const key = `${normalizeStreet(streetName)}|${borough}`;
  const entry = sweepData.i[key];
  return entry ? entry[2] : null; // index 2 = q75Minutes
}

/** Synchronous post-sweep return lookup — returns afterRate (%) or null.
 *  High afterRate = inspector often comes back after sweeper passes. */
export function getPostSweepReturnSync(streetName: string, borough: string): number | null {
  if (!sweepData) return null;
  const key = `${normalizeStreet(streetName)}|${borough}`;
  const entry = sweepData.p[key];
  return entry ? entry[0] : null; // index 0 = afterRate
}

export async function getPostSweepReturn(
  streetName: string,
  borough: string,
): Promise<PostSweepReturn | null> {
  const data = await loadData();
  const key = `${normalizeStreet(streetName)}|${borough}`;
  const entry = data.p[key];
  if (!entry) return null;
  return {
    afterRate: entry[0],
    ticketDays: entry[1],
  };
}

export async function getDoubleSweepInfo(physicalId: string): Promise<DoubleSweepInfo | null> {
  const data = await loadData();
  const days = data.d[physicalId];
  if (days === undefined) return null;
  return { doubleDays: days };
}
