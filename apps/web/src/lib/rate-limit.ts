const buckets = new Map<string, number[]>();

export function enforceRateLimit(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const timestamps = buckets.get(key);
  if (!timestamps) {
    buckets.set(key, [now]);
    return true;
  }

  const active = timestamps.filter(timestamp => now - timestamp < 60_000);
  if (active.length >= maxRequests) {
    buckets.set(key, active);
    return false;
  }

  active.push(now);
  buckets.set(key, active);

  // Periodic cleanup if map grows large to prevent memory leak
  if (buckets.size > 1000) {
    buckets.forEach((v: number[], k: string) => {
      if (v.every((ts: number) => now - ts >= 60_000)) {
        buckets.delete(k);
      }
    });
  }

  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}

