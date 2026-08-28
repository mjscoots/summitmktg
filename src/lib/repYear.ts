/**
 * Rep year helpers.
 *
 * The roster stores the CURRENT rep year (profiles.rep_year, people_leads.rep_year)
 * and that data is never overwritten. Any 2027 / next-season context derives the
 * year here by adding one. Server side, the same derivation lives inside the
 * my_next_year_pay() function.
 */

/** Parse a stored rep year like "1", "Year 2", "3rd" into a number. Defaults to 1. */
export function parseRepYear(raw: string | number | null | undefined): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(1, Math.round(raw));
  const digits = String(raw ?? '').replace(/\D/g, '');
  const n = digits ? Number(digits) : 1;
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

/** Next season's rep year: current plus one. */
export function nextRepYear(raw: string | number | null | undefined): number {
  return parseRepYear(raw) + 1;
}

/** Year in words. Fourth year and up share one label. */
export function repYearLabel(year: number): string {
  if (year <= 1) return 'First year';
  if (year === 2) return 'Second year';
  if (year === 3) return 'Third year';
  return 'Fourth year and up';
}
