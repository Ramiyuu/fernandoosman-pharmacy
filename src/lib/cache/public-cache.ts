import 'server-only';

/**
 * Small in-process cache for public (visitor) data. Public pages render on
 * every request (the database is unreachable while Railway builds, so nothing
 * is prerendered), and this keeps them fast:
 *
 *  - entries live for PUBLIC_CACHE_SECONDS, then the next request reloads them;
 *  - any admin change clears everything (revalidatePublicContent), so edits
 *    show up immediately on this instance;
 *  - if the database is briefly unavailable, the last good value is served
 *    instead of an error page.
 *
 * Only data that is identical for every visitor (read as web_anon) may be
 * cached here. With several instances, others catch up within the TTL.
 */

export const PUBLIC_CACHE_SECONDS = 60;
const MAX_ENTRIES = 500;

interface Entry {
  value: unknown;
  expiresAt: number;
}

const globalForCache = globalThis as typeof globalThis & { __portfolioPublicCache?: Map<string, Entry> };
const store = (globalForCache.__portfolioPublicCache ??= new Map<string, Entry>());
const inFlight = new Map<string, Promise<unknown>>();

export async function cachedPublic<T>(key: string, load: () => Promise<T>): Promise<T> {
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value as T;

  // Concurrent requests for the same key share one database round trip.
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    try {
      const value = await load();
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value as string);
      store.set(key, { value, expiresAt: Date.now() + PUBLIC_CACHE_SECONDS * 1000 });
      return value;
    } catch (error) {
      if (entry) return entry.value as T;
      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  return promise;
}

export function clearPublicCache(): void {
  store.clear();
}
