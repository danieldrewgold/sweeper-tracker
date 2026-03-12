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
  // Track whether the user actively selected a block (vs. auto-restore)
  const userActivelySelected = useRef(false);
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
      // Check if this is a stale URL from a previous session or a fresh shared link.
      // If localStorage has the same address, it's likely the user returning — not a shared link.
      // Strip the param and fall through to localStorage restore (no URL persistence).
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { address: savedAddress } = JSON.parse(saved);
          if (savedAddress && savedAddress === urlAddress) {
            // Stale URL from previous session — strip it and restore from localStorage
            const url = new URL(window.location.href);
            url.searchParams.delete('address');
            window.history.replaceState({}, '', url.toString());
            // Fall through to localStorage restore below
          } else {
            // Different address — likely a shared link, respect it
            geocodeSearch(urlAddress).then((results) => {
              if (results.length > 0) {
                userActivelySelected.current = true;
                selectGeoRef.current(results[0]);
              }
            }).catch(() => {});
            return;
          }
        } else {
          // No localStorage — this is a shared link, respect it
          geocodeSearch(urlAddress).then((results) => {
            if (results.length > 0) {
              userActivelySelected.current = true;
              selectGeoRef.current(results[0]);
            }
          }).catch(() => {});
          return;
        }
      } catch {
        // Parse error, just try the URL
        geocodeSearch(urlAddress).then((results) => {
          if (results.length > 0) {
            userActivelySelected.current = true;
            selectGeoRef.current(results[0]);
          }
        }).catch(() => {});
        return;
      }
    }

    // Fall back to LocalStorage (no URL sync — just quietly restore)
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

  // Mark active selection whenever the user picks a new block after initial restore
  useEffect(() => {
    if (hasRestored.current && userPhysicalId) {
      // After the first restore cycle, any block change is an active selection
      // (small delay to skip the restore itself)
      const timer = setTimeout(() => { userActivelySelected.current = true; }, 500);
      return () => clearTimeout(timer);
    }
  }, [userPhysicalId]);

  // Sync current block to URL only when user actively selected (not on auto-restore)
  useEffect(() => {
    if (userPhysicalId && userAddress && userActivelySelected.current) {
      const url = new URL(window.location.href);
      url.searchParams.set('address', userAddress);
      window.history.replaceState({}, '', url.toString());
    } else if (!userPhysicalId) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('address')) {
        url.searchParams.delete('address');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [userAddress, userPhysicalId]);
}
