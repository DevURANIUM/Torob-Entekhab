import { productDetails, priceHistory } from "./client";
import type { TorobHistory, TorobProductDetails } from "./types";
import type { TorobListing } from "./snapshot";

// Prices arrive in Toman, exactly as Torob shows them ("از ۱۰۸٫۰۰۰٫۰۰۰ تومان"),
// so they are passed through unchanged.
//
// Torob answers bursts with a bot challenge, so live reads are cached per
// product and a failure is remembered briefly instead of retried per request.
const TTL = 30 * 60 * 1000;
const FAILURE_TTL = 2 * 60 * 1000;
const cache = new Map<string, { at: number; ttl: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as T | null;
  try {
    const value = await load();
    cache.set(key, { at: Date.now(), ttl: TTL, value });
    return value;
  } catch {
    cache.set(key, { at: Date.now(), ttl: FAILURE_TTL, value: null });
    return null;
  }
}

export const liveDetails = (l: TorobListing) =>
  cached<TorobProductDetails>(`details:${l.prk}`, () =>
    productDetails(l.prk, l.detailsUrl ?? undefined),
  );

export const liveHistory = (l: TorobListing) =>
  cached<TorobHistory>(`history:${l.prk}`, () =>
    priceHistory(l.prk, l.detailsUrl ?? undefined),
  );
