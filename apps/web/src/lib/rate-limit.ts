const buckets = new Map<string, number[]>();

export function enforceRateLimit(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const active = (buckets.get(key) || []).filter(timestamp => now - timestamp < 60_000);
  if (active.length >= maxRequests) return false;
  active.push(now);
  buckets.set(key, active);
  return true;
}
