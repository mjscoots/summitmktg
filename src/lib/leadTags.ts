/**
 * Lead tag helpers. Labels are derived from the tag itself, never from a
 * hand written list, so a new tag in the data reads correctly with no code change.
 */

export const RANK_PREFIX = 'rank-';
export const STATUS_PREFIX = 'status-';
export const POS_PREFIX = 'pos-';

/** rank-a -> A, status-hype-up -> Hype up, pos-pest-rookie -> Pest rookie. */
export function tagLabel(tag: string): string {
  if (tag.startsWith(RANK_PREFIX)) return tag.slice(RANK_PREFIX.length).toUpperCase();
  const body = tag.startsWith(STATUS_PREFIX)
    ? tag.slice(STATUS_PREFIX.length)
    : tag.startsWith(POS_PREFIX)
      ? tag.slice(POS_PREFIX.length)
      : tag;
  const words = body.replace(/-/g, ' ').trim();
  if (!words) return tag;
  // PEST rookie style: keep known short words readable in sentence case.
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function rankOf(tags: string[] | null | undefined): string | null {
  const hit = (tags || []).find((t) => t.startsWith(RANK_PREFIX));
  return hit ? hit.slice(RANK_PREFIX.length).toUpperCase() : null;
}

export function statusTagOf(tags: string[] | null | undefined): string | null {
  return (tags || []).find((t) => t.startsWith(STATUS_PREFIX)) || null;
}

export function posTagOf(tags: string[] | null | undefined): string | null {
  return (tags || []).find((t) => t.startsWith(POS_PREFIX)) || null;
}

/** Untagged sorts after every ranked lead. */
export function rankWeight(tags: string[] | null | undefined): number {
  const r = rankOf(tags);
  if (!r) return 99;
  const code = r.charCodeAt(0) - 65;
  return code >= 0 && code < 26 ? code : 98;
}

/**
 * Rank first, then the least recently contacted first so nobody is called twice.
 * Never contacted comes before anyone who has been contacted.
 */
export function byRankThenColdest(
  a: { tags: string[] | null; last_contact_at: string | null; full_name: string },
  b: { tags: string[] | null; last_contact_at: string | null; full_name: string }
): number {
  const w = rankWeight(a.tags) - rankWeight(b.tags);
  if (w !== 0) return w;
  const ta = a.last_contact_at ? new Date(a.last_contact_at).getTime() : -1;
  const tb = b.last_contact_at ? new Date(b.last_contact_at).getTime() : -1;
  if (ta !== tb) return ta - tb;
  return (a.full_name || '').localeCompare(b.full_name || '');
}

/** The sheet a lead's original line came from, read plainly from its source slug. */
export function sourceLabel(source: string | null | undefined): string {
  if (!source) return 'Sheet';
  return tagLabel(source);
}
