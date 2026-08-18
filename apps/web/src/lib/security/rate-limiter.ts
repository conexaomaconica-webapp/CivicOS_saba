import { headers } from 'next/headers';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  failOpen: boolean;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000,
  failOpen: true,
};

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  analytics: { maxRequests: 60, windowMs: 60_000, failOpen: true },
  reviews: { maxRequests: 5, windowMs: 60_000, failOpen: false },
  checkout: { maxRequests: 5, windowMs: 60_000, failOpen: false },
  auth: { maxRequests: 10, windowMs: 60_000, failOpen: false },
  default: DEFAULT_CONFIG,
};

// In-memory fallback LRU store for dev/test and serverless instance isolation
const memoryStore = new Map<string, { count: number; resetTime: number }>();

export async function getClientIpAddress(): Promise<string> {
  try {
    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get('x-forwarded-for');
    if (forwardedFor) {
      const parts = forwardedFor.split(',');
      if (parts.length > 0 && parts[0]) {
        return parts[0].trim();
      }
    }
    const realIp = reqHeaders.get('x-real-ip');
    if (realIp) {
      return realIp;
    }
  } catch {
    // Ignore error if invoked outside request context
  }
  return '127.0.0.1';
}

export async function checkRateLimit(
  endpointKey: string,
  clientKey: string,
  tenantId: string = 'default'
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const config: RateLimitConfig = DEFAULT_CONFIGS[endpointKey] ?? DEFAULT_CONFIG;
  const compositeKey = `${endpointKey}:${tenantId}:${clientKey}`;
  const now = Date.now();

  try {
    const record = memoryStore.get(compositeKey);

    if (!record || now > record.resetTime) {
      memoryStore.set(compositeKey, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetMs: config.windowMs,
      };
    }

    if (record.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, record.resetTime - now),
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetMs: Math.max(0, record.resetTime - now),
    };
  } catch (err) {
    console.warn(`[RateLimiter] Exception checking rate limit for ${compositeKey}:`, err);
    if (config.failOpen) {
      return { allowed: true, remaining: 1, resetMs: 0 };
    }
    // Fail-closed for sensitive operations (checkout, auth, reviews)
    return { allowed: false, remaining: 0, resetMs: config.windowMs };
  }
}
