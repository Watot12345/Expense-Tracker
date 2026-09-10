interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory bucket per Edge Function runtime
const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  userId: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(userId);

  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInMs: windowMs,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, existing.resetTime - now),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetInMs: Math.max(0, existing.resetTime - now),
  };
}
