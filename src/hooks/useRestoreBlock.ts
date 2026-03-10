import { useEffect, useRef } from 'react';
import { useSweepStore } from '../store';
import { useUserBlock } from './useUserBlock';
import { geocodeSearch } from '../services/geocoder';

const STORAGE_KEY = 'sweeptracker_block';

/**
 * On app load:
 * 1. If URL has ?address=..., search for that address
 * 2. Otherwise, restore the last saved block from LocalStorage
 *
 * Also syncs the current block to the URL for sharing.
 */
export function useRestoreBlock() {
  const { selectFromGeocode, selectFromSaved } = useUserBlock();
  const userAddress = useSweepStore((s) => s.userAddress);
  const userPhysicalId = useSweepStore((s) => s.userPhysicalId);
  const hasRestored = useRef(false);
  const selectGeoRef = useRef(selectFromGeocode);
  const selectSavedRef = useRef(selectFromSaved);
  selectGeoRef.current = selectFromGeocode;
  selectSavedRef.current = selectFromSaved;

  // On mount: check URL param or LocalStorage (runs once)
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlAddress = params.get('address');

    if (urlAddress) {
      // URL param takes priority — search and select
      geocodeSearch(urlAddress).then((results) => {
        if (results.length > 0) {
          selectGeoRef.current(results[0]);
        }
      }).catch(() => {});
      return;
    }

    // Fall back to LocalStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { address, physicalId, latLng } = JSON.parse(saved);

        // Fast path: restore directly from saved data (skips geocoding)
        if (physicalId && latLng && address) {
          selectSavedRef.current(physicalId, latLng, address);
          return;
        }

        // Fallback: geocode the address
        if (address) {
          geocodeSearch(address).then((results) => {
            if (results.length > 0) {
              selectGeoRef.current(results[0]);
            }
          }).catch(() => {});
        }
      }
    } catch {}
  }, []); // stable — uses refs for callbacks

  // Sync current block to URL (without page reload)
  useEffect(() => {
    if (userPhysicalId && userAddress) {
      const url = new URL(window.location.href);
      url.searchParams.set('address', userAddress);
      window.history.replaceState({}, '', url.toString());
    } else {
      const url = new URL(window.location.href);
      if (url.searchParams.has('address')) {
        url.searchParams.delete('address');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [userAddress, userPhysicalId]);
}
