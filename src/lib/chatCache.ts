/**
 * Pass 211 - the last five opened rooms stay in memory so going back into a
 * room paints on the first frame instead of replaying a spinner. Memory only:
 * nothing is written to storage and nothing survives a reload.
 */

export interface CachedRoom<T> {
  messages: T[];
  hasMore: boolean;
  profiles: Record<string, unknown>;
}

const MAX_ROOMS = 5;
const store = new Map<string, CachedRoom<any>>();

export function readRoomCache<T>(channel: string): CachedRoom<T> | null {
  const hit = store.get(channel);
  if (!hit) return null;
  // Touch it so the least recently opened room is the one evicted.
  store.delete(channel);
  store.set(channel, hit);
  return hit as CachedRoom<T>;
}

export function writeRoomCache<T>(channel: string, room: CachedRoom<T>) {
  if (store.has(channel)) store.delete(channel);
  store.set(channel, room);
  while (store.size > MAX_ROOMS) {
    const oldest = store.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

/** Test hook: how many rooms are held right now. */
export function cachedRoomCount() {
  return store.size;
}
