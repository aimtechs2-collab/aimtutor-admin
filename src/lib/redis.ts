import { Redis } from "@upstash/redis";

// Only initialize if we have the required tokens
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

// Default TTLs to protect the 256MB free tier limit
export const CACHE_TTL = {
  SHORT: 60 * 60, // 1 hour
  MEDIUM: 60 * 60 * 24, // 24 hours
  LONG: 60 * 60 * 24 * 7, // 7 days (mostly static data)
};

/**
 * Generic caching wrapper for async data fetching.
 * If redis is not configured, it transparently passes through to the fetcher.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // If Redis is not configured, bypass caching
  if (!redis) {
    return fetcher();
  }

  try {
    const cachedData = await redis.get<T>(key);
    if (cachedData !== null) {
      if (process.env.NODE_ENV !== "production") console.log(`[CACHE HIT] ${key}`);
      return cachedData;
    }
  } catch (error) {
    console.warn(`[CACHE WARNING] Failed to get key ${key}:`, error);
  }

  // Cache Miss - Fetch fresh data
  const freshData = await fetcher();
  if (process.env.NODE_ENV !== "production") console.log(`[CACHE MISS] ${key} - Fetching fresh data`);

  await hasher_set(key, freshData, ttlSeconds);
  return freshData;
}

async function hasher_set<T>(key: string, freshData: T, ttlSeconds: number) {
  try {
    if (redis && freshData !== undefined && freshData !== null) {
      await redis.set(key, freshData, { ex: ttlSeconds });
    }
  } catch (error) {
    console.warn(`[CACHE WARNING] Failed to set key ${key}:`, error);
  }
}

/**
 * Helper to delete specific cache keys during mutations (Create/Update/Delete).
 */
export async function invalidateCache(keys: string | string[]) {
  if (!redis) return;
  const keysArray = Array.isArray(keys) ? keys : [keys];
  try {
    await redis.del(...keysArray);
    if (process.env.NODE_ENV !== "production") console.log(`[CACHE INVALIDATED] ${keysArray.join(", ")}`);
  } catch (error) {
    console.warn(`[CACHE WARNING] Failed to invalidate keys:`, error);
  }
}

/**
 * Helper to invalidate all cache keys matching a specific pattern.
 * e.g., invalidateCachePattern("category:*")
 * Useful for 256MB free tier to prevent stale wildcard data gathering up over time.
 */
export async function invalidateCachePattern(pattern: string) {
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      if (keys.length > 0) {
        await redis.del(...keys);
        if (process.env.NODE_ENV !== "production") {
          console.log(`[CACHE INVALIDATED PATTERN] ${keys.length} keys matching ${pattern}`);
        }
      }
      cursor = nextCursor;
    } while (cursor !== "0");
  } catch (error) {
    console.warn(`[CACHE WARNING] Failed to invalidate pattern ${pattern}:`, error);
  }
}
