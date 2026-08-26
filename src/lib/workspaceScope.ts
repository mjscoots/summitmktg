/**
 * Workspace (industry) content scoping.
 *
 * Content tables carry a nullable `vertical` column:
 *   NULL          = company-wide, visible in every workspace
 *   'Pest' | ...  = only visible inside that workspace
 */

export const COMPANY_WIDE = null;

/** PostgREST filter string: company-wide rows plus the active workspace's rows. */
export function verticalFilter(vertical: string | null | undefined): string {
  const v = (vertical || 'Pest').replace(/[,()]/g, '');
  return `vertical.is.null,vertical.eq.${v}`;
}

/** Apply the scope filter to a supabase query builder. */
export function scopeToWorkspace<T extends { or: (f: string) => T }>(
  query: T,
  vertical: string | null | undefined
): T {
  return query.or(verticalFilter(vertical));
}

/** Client-side equivalent, for rows already fetched. */
export function inWorkspace(
  row: { vertical?: string | null },
  vertical: string | null | undefined
): boolean {
  return row.vertical == null || row.vertical === (vertical || 'Pest');
}

/** Label for the admin "All industries" toggle. */
export const ALL_INDUSTRIES_LABEL = 'All industries';
