import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getServerEnv } from '@/lib/env';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type Bucket = {
  prefix: string;
  limit: number;
  windowSec: number;
};

// Named buckets — tuned for the traffic shape of each surface.
export const BUCKETS = {
  stripeWebhook:   { prefix: 'rl:wh:stripe',   limit: 60,  windowSec: 60 },
  clerkWebhook:    { prefix: 'rl:wh:clerk',    limit: 60,  windowSec: 60 },
  sanityWebhook:   { prefix: 'rl:wh:sanity',   limit: 30,  windowSec: 60 },
  checkoutAction:  { prefix: 'rl:act:checkout', limit: 10, windowSec: 60 },
} satisfies Record<string, Bucket>;

export type BucketName = keyof typeof BUCKETS;

const limiters = new Map<BucketName, Ratelimit>();
let warned = false;

function getRedis(): Redis | null {
  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = getServerEnv();
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    if (!warned) {
      warned = true;
      console.warn(
        '[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is DISABLED.',
      );
    }
    return null;
  }
  return new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });
}

function getLimiter(name: BucketName): Ratelimit | null {
  const cached = limiters.get(name);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) return null;
  const b = BUCKETS[name];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(b.limit, `${b.windowSec} s`),
    prefix: b.prefix,
    analytics: false,
  });
  limiters.set(name, limiter);
  return limiter;
}

// Extract a best-effort client identifier from forwarding headers.
// Falls back to 'unknown' so the limiter still groups unidentified traffic.
export function clientKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Runs the named limiter against `key` and returns the result. When Upstash
// is not configured, returns a permissive result so the caller can proceed.
export async function rateLimit(name: BucketName, key: string): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) {
    return { success: true, limit: Number.POSITIVE_INFINITY, remaining: Number.POSITIVE_INFINITY, reset: 0 };
  }
  const { success, limit, remaining, reset } = await limiter.limit(key);
  return { success, limit, remaining, reset };
}

// Standard 429 response with headers for webhooks / JSON API routes.
export function tooManyRequestsResponse(result: RateLimitResult): Response {
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return new Response(JSON.stringify({ error: 'too many requests' }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'retry-after': String(retryAfter),
      'x-ratelimit-limit': String(result.limit),
      'x-ratelimit-remaining': String(result.remaining),
      'x-ratelimit-reset': String(result.reset),
    },
  });
}
