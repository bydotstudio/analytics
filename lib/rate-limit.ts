/**
 * In-memory sliding-window rate limiter.
 * Suitable for single-node deployments (Hetzner self-hosted).
 * Limit: 120 requests per 60-second window per IP.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

interface Entry {
  count: number;
  windowStart: number;
}

const store = new Map<string, Entry>();

// Evict entries older than 2x the window to prevent unbounded memory growth
function evict() {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [key, entry] of store) {
    if (entry.windowStart < cutoff) store.delete(key);
  }
}

let evictTimer: ReturnType<typeof setInterval> | null = null;
function ensureEvictTimer() {
  if (!evictTimer) {
    evictTimer = setInterval(evict, WINDOW_MS * 2);
    // Don't prevent process exit
    if (typeof evictTimer.unref === "function") evictTimer.unref();
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  ensureEvictTimer();
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  return { allowed: true, retryAfter: 0 };
}
