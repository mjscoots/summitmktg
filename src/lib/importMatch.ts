/** Shared helpers for matching imported rep names to profiles. */

export interface MatchTarget {
  user_id: string;
  full_name: string | null;
}

export const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** "Doe, Jane" -> "Jane Doe" */
export function flipComma(s: string) {
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : s;
}

/**
 * Fuzzy match a name against profiles: exact, then last name plus first initial,
 * then unique substring. Returns null when nothing is confident or unique.
 */
export function matchName(raw: string, targets: MatchTarget[]): MatchTarget | null {
  const q = normName(flipComma(raw));
  if (!q) return null;

  const exact = targets.filter((t) => normName(t.full_name || '') === q);
  if (exact.length === 1) return exact[0];

  const qp = q.split(' ');
  const qFirst = qp[0];
  const qLast = qp[qp.length - 1];

  if (qp.length >= 2) {
    const initial = targets.filter((t) => {
      const tp = normName(t.full_name || '').split(' ');
      if (tp.length < 2) return false;
      return tp[tp.length - 1] === qLast && tp[0][0] === qFirst[0];
    });
    if (initial.length === 1) return initial[0];
  }

  const contains = targets.filter((t) => {
    const n = normName(t.full_name || '');
    return n.includes(q) || q.includes(n);
  });
  if (contains.length === 1) return contains[0];

  return null;
}

export const toNum = (v: string | undefined): number | null => {
  if (v === undefined) return null;
  const t = v.replace(/[$,%\s"]/g, '').trim();
  if (!t) return null;
  const n = Number(t.replace(/[()]/g, ''));
  if (!Number.isFinite(n)) return null;
  return /^\(.*\)$/.test(v.trim()) ? -n : n;
};

export const toInt = (v: string | undefined): number | null => {
  const n = toNum(v);
  return n === null ? null : Math.round(n);
};

/** Split a pasted or uploaded sheet into cells, handling commas and tabs. */
export function splitRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => (line.includes('\t') ? line.split('\t') : line.split(',')).map((c) => c.replace(/^"|"$/g, '').trim()));
}

/** Monday of the week containing the given date, as YYYY-MM-DD. */
export function mondayOf(d: Date) {
  const copy = new Date(d.getTime());
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy.toISOString().slice(0, 10);
}

export function formatLoadedAt(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
