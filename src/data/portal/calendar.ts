// Static portal calendar. Not read from or written to the database.
// Weekly rhythm source: owner direction Nov 13, 2026. No times were sourced.
export const PORTAL_TZ = 'America/Phoenix';
const WEEKLY: Record<number, string> = { 1: '1:1s', 2: 'Team meeting', 3: 'Leadership', 4: 'Recruiting training', 5: 'Company call' };
// One-offs: internal calendar title / travel sheet for Utah, Nov 13-15, 2026.
const ONE_OFF: { start: string; end: string; title: string }[] = [
  { start: '2026-11-13', end: '2026-11-15', title: 'Season Close — Salt Lake City' },
  { start: '2026-11-14', end: '2026-11-14', title: 'Hawx Honors' },
];
/** ymd = 'YYYY-MM-DD'; weekday 0=Sun. */
export function eventsFor(ymd: string, weekday: number): string[] {
  const out: string[] = [];
  if (WEEKLY[weekday]) out.push(WEEKLY[weekday]);
  for (const e of ONE_OFF) if (ymd >= e.start && ymd <= e.end) out.push(e.title);
  return out;
}
export function todayInTz(): { y: number; m: number; d: number } {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: PORTAL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
  return { y: +p[0], m: +p[1] - 1, d: +p[2] };
}
