import { useEffect, useRef } from 'react';
import { useSweepStore } from '../store';
import { useUserBlock } from './useUserBlock';
import { geocodeSearch, reverseGeocode } from '../services/geocoder';
import type { NominatimResult } from '../services/geocoder';

const STORAGE_KEY = 'sweeptracker_block';

/**
 * Try to get the user's live GPS location without prompting.
 * Only succeeds if permission was already granted (e.g., they clicked
 * the GPS button once before). Returns null if denied/prompt/unavailable.
 */
async function tryAutoGeolocation(): Promise<NominatimResult | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return null;
  }

  // Check if permission is already granted — don't show a prompt on load
  try {
    if (navigator.permissions) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state !== 'granted') return null;
    }
  } catch {
    // permissions API not available — skip auto-geolocation to avoid prompt
    return null;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000, // accept cached position up to 1 min old
      });
    });
    const { latitude, longitude } = position.coords;
    return await reverseGeocode(latitude, longitude);
  } catch {
    return null;
  }
}

/**
 * On app load:
 * 1. If URL has ?address=... (shared link), search for that address
 * 2. Otherwise, try live geolocation (if permission already granted)
 * 3. Fall back to last saved block from LocalStorage
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

  // On mount: check URL param → geolocation → LocalStorage (runs once)
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlAddress = params.get('address');

    // ── Step 1: Shared links (URL ?address=) always win ──
    if (urlAddress) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { address: savedAddress } = JSON.parse(saved);
          if (savedAddress && savedAddress === urlAddress) {
            // Stale URL from previous session — strip it, fall through to geolocation
            const url = new URL(window.location.href);
            url.searchParams.delete('address');
            window.history.replaceState({}, '', url.toString());
            // Fall through to geolocation + localStorage below
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
        geocodeSearch(urlAddress).then((results) => {
          if (results.length > 0) {
            userActivelySelected.current = true;
            selectGeoRef.current(results[0]);
          }
        }).catch(() => {});
        return;
      }
    }

    // ── Step 2: Try live geolocation (only if already granted — no prompt) ──
    // ── Step 3: Fall back to LocalStorage ──
    tryAutoGeolocation()
      .then((geoResult) => {
        if (geoResult) {
          selectGeoRef.current(geoResult);
          return;
        }
        // Geolocation unavailable/denied — restore from localStorage
        restoreFromLocalStorage();
      })
      .catch(() => {
        restoreFromLocalStorage();
      });

    function restoreFromLocalStorage() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { address, physicalId, latLng } = JSON.parse(saved);
          if (physicalId && latLng && address) {
            selectSavedRef.current(physicalId, latLng, address);
            return;
          }
          if (address) {
            geocodeSearch(address).then((results) => {
              if (results.length > 0) {
                selectGeoRef.current(results[0]);
              }
            }).catch(() => {});
          }
        }
      } catch {}
    }
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
