/**
 * Lightweight IndexedDB cache for expensive API responses.
 * Gracefully falls back to no-op if IndexedDB is unavailable (e.g., private browsing).
 */

const DB_NAME = 'sweeptracker-cache';
const DB_VERSION = 1;
const STORES = ['cscl-segments', 'asp-signs', 'historical-sweeps'] as const;
export type CacheStore = (typeof STORES)[number];

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'key' });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB unavailable, caching disabled');
        resolve(null);
      };
    } catch {
      // IndexedDB not available (e.g., some private browsing modes)
      resolve(null);
    }
  });

  return dbPromise;
}

/** Get a cached value. Returns null if missing, expired, or DB unavailable. */
export async function cacheGet<T>(storeName: CacheStore, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        if (!entry || entry.expiresAt < Date.now()) {
          resolve(null);
        } else {
          resolve(entry.data);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Store a value in the cache with a TTL in milliseconds. */
export async function cacheSet<T>(storeName: CacheStore, key: string, data: T, ttlMs: number): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(entry);
  } catch {
    // Silently fail — caching is best-effort
  }
}

/** Clear all entries in a store. */
export async function cacheClear(storeName: CacheStore): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;

    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
  } catch {}
}
