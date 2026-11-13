// Static portal calendar. Not read from or written to the database.
// Source: owner direction, Nov 13, 2026, 2:42 AM America/Phoenix.
export const PORTAL_TZ = 'America/Phoenix';

export interface PortalEvent { chip: string; title: string; time: string; place?: string }

// Weekly items are all-day; no times were sourced.
const WEEKLY: Record<number, PortalEvent> = {
  1: { chip: '1:1s · Time TBA', title: '1:1s', time: 'Time TBA' },
  2: { chip: 'Manager Call · Time TBA', title: 'Manager Call', time: 'Time TBA' },
  4: { chip: 'Recruiting Training · Time TBA', title: 'Recruiting Training', time: 'Time TBA' },
};

// Utah trip, Nov 13-14, 2026. Times are Utah Mountain Time (MT).
const ONE_OFF: Record<string, PortalEvent[]> = {
  '2026-11-13': [
    { chip: 'Utah · LDP', title: 'LDP', time: '11:00 AM-1:00 PM MT', place: 'Creator Space, Lehi' },
  ],
  '2026-11-14': [
    { chip: 'Utah · Power of Wisdom', title: 'Power of Wisdom', time: '12:00-4:00 PM MT' },
    { chip: 'Utah · Hawx Honors', title: 'Hawx Honors', time: '5:00 PM MT' },
    { chip: 'Utah · Speaker', title: 'Speaker', time: '6:00-7:00 PM MT' },
  ],
};

/** ymd = 'YYYY-MM-DD'; weekday 0=Sun. */
export function eventsFor(ymd: string, weekday: number): PortalEvent[] {
  const out: PortalEvent[] = [];
  if (WEEKLY[weekday]) out.push(WEEKLY[weekday]);
  out.push(...(ONE_OFF[ymd] ?? []));
  return out;
}

/** Timed one-offs within a given month (m is 0-based). */
export function timedEventsInMonth(y: number, m: number): { ymd: string; events: PortalEvent[] }[] {
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}-`;
  return Object.keys(ONE_OFF).filter((k) => k.startsWith(prefix)).sort().map((ymd) => ({ ymd, events: ONE_OFF[ymd] }));
}

export function todayInTz(): { y: number; m: number; d: number } {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: PORTAL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
  return { y: +p[0], m: +p[1] - 1, d: +p[2] };
}
