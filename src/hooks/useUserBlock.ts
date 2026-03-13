import { useCallback } from 'react';
import { useSweepStore } from '../store';
import { resolveFromGeocode } from '../services/addressResolver';
import { analyzeHistoricalPattern } from '../services/historicalAnalyzer';
import { fetchAspSigns } from '../api/aspApi';
import { fetchSweepInfo } from '../api/mappingApi';
import { parseAllSigns } from '../services/aspParser';
import { getSegmentCenter, findCrossStreets } from '../utils/geo';
import { fetchSegmentById, fetchSegmentsInRadius } from '../api/csclApi';
import { getSweepReliability, getInspectorTiming, getPostSweepReturn, getDoubleSweepInfo } from '../services/sweepData';
import { fetchAspSignsByStreetAndCrossStreets } from '../api/aspApi';
import type { NominatimResult } from '../services/geocoder';
import type { CsclSegment } from '../types/cscl';

const BORO_MAP: Record<string, string> = {
  '1': 'Manhattan',
  '2': 'Bronx',
  '3': 'Brooklyn',
  '4': 'Queens',
  '5': 'Staten Island',
};

/** Build a display address from a CSCL segment */
function buildAddress(segment: CsclSegment): string {
  const streetName = segment.full_street_name || segment.stname_label || 'Unknown street';
  const boroName = BORO_MAP[segment.boroughcode] ?? '';
  return boroName ? `${streetName}, ${boroName}` : streetName;
}

export function useUserBlock() {
  const setUserBlock = useSweepStore((s) => s.setUserBlock);
  const setHistoricalPattern = useSweepStore((s) => s.setHistoricalPattern);
  const setSweepReliability = useSweepStore((s) => s.setSweepReliability);
  const setInspectorTiming = useSweepStore((s) => s.setInspectorTiming);
  const setPostSweepReturn = useSweepStore((s) => s.setPostSweepReturn);
  const setDoubleSweepInfo = useSweepStore((s) => s.setDoubleSweepInfo);
  const setAspSchedules = useSweepStore((s) => s.setAspSchedules);
  const setSweepVisitTime = useSweepStore((s) => s.setSweepVisitTime);
  const addSegments = useSweepStore((s) => s.addSegments);
  const setLoading = useSweepStore((s) => s.setLoading);
  const setError = useSweepStore((s) => s.setError);

  /** Shared: load historical pattern + ASP schedule + real-time sweep info for a segment */
  const loadBlockData = useCallback(
    async (segment: CsclSegment, physicalId: string, latLng: [number, number], address: string) => {
      setLoading(true);
      setError(null);
      setSweepVisitTime(null);

      try {
        setUserBlock(address, physicalId, latLng);

        const boroName = BORO_MAP[segment.boroughcode] ?? '';
        const streetName = segment.full_street_name || '';

        // Try to find cross streets from loaded segments for precise ASP lookup
        let allSegments = useSweepStore.getState().segments;
        let crossStreets = findCrossStreets(segment, allSegments);

        // If cross streets not found (edge of viewport or sparse data), fetch nearby segments
        if (!crossStreets) {
          const nearby = await fetchSegmentsInRadius(latLng[0], latLng[1], 300).catch(() => []);
          if (nearby.length > 0) {
            addSegments(nearby);
            allSegments = useSweepStore.getState().segments;
            crossStreets = findCrossStreets(segment, allSegments);
          }
        }

        const fetchAsp = () => {
          if (!boroName || !streetName) return Promise.resolve([]);
          if (crossStreets) {
            return fetchAspSignsByStreetAndCrossStreets(
              streetName, crossStreets[0], crossStreets[1], boroName,
            ).catch(() => []);
          }
          return fetchAspSigns(streetName, boroName).catch(() => []);
        };

        const [pattern, aspSigns, sweepInfo, reliability, inspTiming, postSweep, dblSweep] = await Promise.all([
          analyzeHistoricalPattern(physicalId).catch(() => null),
          fetchAsp(),
          fetchSweepInfo(latLng[0], latLng[1]).catch(() => null),
          getSweepReliability(physicalId).catch(() => null),
          boroName && streetName ? getInspectorTiming(streetName, boroName).catch(() => null) : null,
          boroName && streetName ? getPostSweepReturn(streetName, boroName).catch(() => null) : null,
          getDoubleSweepInfo(physicalId).catch(() => null),
        ]);

        setHistoricalPattern(pattern);
        setSweepReliability(reliability);
        setInspectorTiming(inspTiming);
        setPostSweepReturn(postSweep);
        setDoubleSweepInfo(dblSweep);
        setAspSchedules(parseAllSigns(aspSigns));

        // Extract latest real-time visit time from mappingapi
        if (sweepInfo?.Times?.length) {
          const visitedTimes = sweepInfo.Times
            .filter((t) => t.Type === 'VISITED')
            .map((t) => new Date(t.VisitedTime));
          if (visitedTimes.length > 0) {
            const latest = visitedTimes.reduce((a, b) => (a > b ? a : b));
            setSweepVisitTime(latest);
          }
        }
      } catch (err) {
        console.error('Block selection failed:', err);
        setError('Failed to load block data. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [setUserBlock, setHistoricalPattern, setSweepReliability, setInspectorTiming, setPostSweepReturn, setDoubleSweepInfo, setAspSchedules, setSweepVisitTime, setLoading, setError]
  );

  /** Select block from address search (geocoded result) */
  const selectFromGeocode = useCallback(
    async (result: NominatimResult, originalQuery?: string) => {
      setLoading(true);
      setError(null);

      try {
        const resolved = await resolveFromGeocode(result, originalQuery);
        if (!resolved) {
          setError('Could not find a street segment for this address.');
          setLoading(false);
          return;
        }

        addSegments(resolved.nearbySegments);
        await loadBlockData(resolved.segment, resolved.physicalId, resolved.latLng, resolved.address);
      } catch (err) {
        console.error('Block selection failed:', err);
        setError('Failed to load block data. Try again.');
        setLoading(false);
      }
    },
    [addSegments, loadBlockData, setLoading, setError]
  );

  /** Select block by clicking a segment on the map */
  const selectFromClick = useCallback(
    async (physicalId: string) => {
      // Read segments from store imperatively to avoid stale closure
      const segment = useSweepStore.getState().segments.get(physicalId);
      if (!segment) return;

      const latLng = getSegmentCenter(segment);
      const address = buildAddress(segment);
      await loadBlockData(segment, physicalId, latLng, address);
    },
    [loadBlockData]
  );

  /** Restore a previously saved block (skip geocoding, use cached segment) */
  const selectFromSaved = useCallback(
    async (physicalId: string, latLng: [number, number], address: string) => {
      setLoading(true);
      setError(null);

      try {
        const segment = await fetchSegmentById(physicalId);
        if (!segment) {
          setError('Could not find the saved block.');
          setLoading(false);
          return;
        }

        // Fetch nearby segments so cross-street matching works for ASP lookup
        const nearby = await fetchSegmentsInRadius(latLng[0], latLng[1], 300).catch(() => [segment]);
        addSegments(nearby.length > 0 ? nearby : [segment]);
        await loadBlockData(segment, physicalId, latLng, address);
      } catch (err) {
        console.error('Block restore failed:', err);
        setError('Failed to restore block. Try searching again.');
        setLoading(false);
      }
    },
    [addSegments, loadBlockData, setLoading, setError]
  );

  return { selectFromGeocode, selectFromClick, selectFromSaved };
}
