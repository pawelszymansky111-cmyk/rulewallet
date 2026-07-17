type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + options.windowMs };
    buckets.set(key, bucket);
    return { allowed: true, remaining: options.limit - 1, resetAt: bucket.resetAt };
  }

  current.count += 1;
  return {
    allowed: current.count <= options.limit,
    remaining: Math.max(0, options.limit - current.count),
    resetAt: current.resetAt,
  };
}
