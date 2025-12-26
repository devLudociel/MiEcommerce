// src/lib/rateLimitPersistent.ts
import { getAdminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface RateLimitOptions {
  intervalMs?: number; // ventana, por defecto 60s
  max?: number; // peticiones por ventana, por defecto 30
}

// In-memory fallback for when Firestore is unavailable
interface MemoryRateLimitWindow {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryRateLimitWindow>();

// Clean up expired memory entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of memoryStore.entries()) {
    if (now > window.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 60_000); // Clean every minute

/**
 * In-memory rate limiting fallback
 * Used when Firestore is unavailable
 */
function rateLimitMemory(
  key: string,
  max: number,
  interval: number,
  now: number
): { ok: boolean; remaining: number; resetAt: number } {
  const existing = memoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    // New window
    const newWindow: MemoryRateLimitWindow = {
      count: 1,
      resetAt: now + interval,
    };
    memoryStore.set(key, newWindow);
    return {
      ok: true,
      remaining: max - 1,
      resetAt: newWindow.resetAt,
    };
  }

  // Increment count in existing window
  existing.count += 1;
  memoryStore.set(key, existing);

  return {
    ok: existing.count <= max,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.resetAt,
  };
}

interface RateLimitWindow {
  count: number;
  resetAt: number;
  ip: string;
  scope: string;
  lastRequest: number;
}

/**
 * Persistent rate limiting using Firestore
 *
 * Advantages over in-memory rate limiting:
 * - Works across multiple server instances
 * - Survives server restarts
 * - Can be queried and monitored
 *
 * Usage:
 * const result = await rateLimitPersistent(request, 'login', { max: 5, intervalMs: 60000 });
 * if (!result.ok) {
 *   return new Response('Too many requests', { status: 429 });
 * }
 */
export async function rateLimitPersistent(
  request: Request,
  scope: string,
  opts: RateLimitOptions = {}
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const interval = opts.intervalMs ?? 60_000;
  const max = opts.max ?? 30;

  // Extract IP address
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const key = `${scope}:${ip}`;
  const now = Date.now();

  try {
    const db = getAdminDb();
    const rateLimitRef = db.collection('rate_limits').doc(key);

    // Use transaction to ensure atomic read-modify-write
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);

      let window: RateLimitWindow;

      if (!doc.exists || !doc.data()) {
        // First request for this key
        window = {
          count: 1,
          resetAt: now + interval,
          ip,
          scope,
          lastRequest: now,
        };
      } else {
        const data = doc.data() as RateLimitWindow;

        // Check if window has expired
        if (now > data.resetAt) {
          // Reset window
          window = {
            count: 1,
            resetAt: now + interval,
            ip,
            scope,
            lastRequest: now,
          };
        } else {
          // Increment count in current window
          window = {
            ...data,
            count: data.count + 1,
            lastRequest: now,
          };
        }
      }

      // Write updated window
      transaction.set(rateLimitRef, {
        ...window,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const remaining = Math.max(0, max - window.count);
      const ok = window.count <= max;

      return { ok, remaining, resetAt: window.resetAt };
    });

    return result;
  } catch (error) {
    console.error(
      '[rateLimitPersistent] Firestore error, falling back to in-memory rate limiting:',
      error
    );

    // SECURITY FIX: Fallback to in-memory rate limiting instead of failing open
    // This ensures we still have some rate limiting protection even if Firestore is down
    const fallbackResult = rateLimitMemory(key, max, interval, now);

    console.warn('[rateLimitPersistent] Using in-memory fallback for key:', key, {
      ok: fallbackResult.ok,
      remaining: fallbackResult.remaining,
    });

    return fallbackResult;
  }
}

/**
 * Cleanup old rate limit records
 * Run this periodically (e.g., via cron job) to prevent collection growth
 *
 * @param olderThanMs Delete records older than this (default: 1 hour)
 */
export async function cleanupOldRateLimits(olderThanMs: number = 60 * 60 * 1000): Promise<number> {
  const db = getAdminDb();
  const cutoff = Date.now() - olderThanMs;

  const snapshot = await db
    .collection('rate_limits')
    .where('resetAt', '<', cutoff)
    .limit(500) // Process in batches to avoid timeouts
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`[rateLimitPersistent] Deleted ${snapshot.size} old rate limit records`);

  return snapshot.size;
}
