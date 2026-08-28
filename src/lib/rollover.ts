/**
 * Off-season rollover helpers. Pest reps roll into Fiber on a Monday: the one
 * after the configured season end when a season exists, otherwise the next one.
 */

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The first Monday strictly after the given date. */
export function mondayAfter(date: Date): string {
  const d = new Date(date.getTime());
  d.setHours(12, 0, 0, 0);
  const delta = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

/** Default start date: Monday after season end when set, else next Monday. */
export function defaultStartDate(seasonEnd: string | null): string {
  return mondayAfter(seasonEnd ? new Date(`${seasonEnd}T12:00:00`) : new Date());
}

/** Plain date line, e.g. "Monday, September 7". */
export function formatStart(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** Whole days from today to the given date. Negative when it has passed. */
export function daysUntil(date: string): number {
  const then = new Date(`${date}T12:00:00`).getTime();
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((then - now.getTime()) / 86400000);
}
