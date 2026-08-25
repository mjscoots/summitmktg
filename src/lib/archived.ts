/**
 * Archived-roster helpers.
 * Archived profiles stay in the database so historical records keep attribution,
 * but they must never appear in active-roster lists. When their name shows up in
 * historical data (chat history, lead attribution, points history), suffix it.
 */

/** Append "(archived)" to a name when the person is archived. */
export function withArchivedSuffix(name: string | null | undefined, archived?: boolean | null): string {
  const base = name || 'Team Member';
  return archived ? `${base} (archived)` : base;
}

/** Filter helper for arrays of profile-like rows. */
export function excludeArchived<T extends { archived?: boolean | null }>(rows: T[]): T[] {
  return rows.filter(r => r.archived !== true);
}
