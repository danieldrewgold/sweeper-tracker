import { SODA_APP_TOKEN } from '../utils/constants';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

/** Escape a string value for use inside SoQL single-quoted literals */
export function escapeSoql(value: string): string {
  return value.replace(/'/g, "''");
}

export async function sodaFetch<T>(url: string, params?: Record<string, string>): Promise<T> {
  const u = new URL(url);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
  }
  if (SODA_APP_TOKEN) {
    u.searchParams.set('$$app_token', SODA_APP_TOKEN);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(u.toString());

      if (res.status === 429) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        throw new Error(`SODA API error: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error('SODA API request failed');
}
