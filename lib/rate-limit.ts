/**
 * Lightweight in-memory rate limiting for client-side actions.
 *
 * IMPORTANT: Real IP- and user-based rate limiting MUST be enforced
 * on the backend or at the API gateway (per OWASP recommendations).
 * This helper only adds an extra layer on the client to avoid
 * accidental hammering of public endpoints from this app.
 */

type BucketKey = string;

interface Bucket {
  count: number;
  resetAt: number;
}

const DEFAULT_LIMIT = 10; // max attempts per window
const DEFAULT_WINDOW_MS = 60_000; // 1 minute

const buckets = new Map<BucketKey, Bucket>();

export class RateLimitError extends Error {
  status = 429;

  constructor(message = 'Too many attempts. Please try again later.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function checkRateLimit(options: {
  /**
   * Stable key combining action + user identifier, e.g.
   * "auth:login:student@example.com".
   */
  key: string;
  limit?: number;
  windowMs?: number;
}): void {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;

  const now = Date.now();
  const existing = buckets.get(options.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (existing.count >= limit) {
    throw new RateLimitError();
  }

  existing.count += 1;
}

