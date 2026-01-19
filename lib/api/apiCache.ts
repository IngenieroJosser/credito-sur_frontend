type CacheEntry<T = unknown> = {
  data: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

const DEFAULT_TTL = 30_000; // 30 segundos

export const getCacheKey = (method: string, url: string) =>
  `${method.toUpperCase()}:${url}`;

export const getCached = <T>(key: string): T | null => {
  const entry = memoryCache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data as T;
};

export const setCache = <T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
) => {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
};

export const invalidateCache = () => {
  memoryCache.clear();
};