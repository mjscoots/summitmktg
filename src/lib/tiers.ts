/**
 * Access tiers. The database keeps legacy app_role values, the app talks in tiers.
 *   sales   -> rookie (compatibility)
 *   manager -> manager (president is a manager with an industry)
 *   admin   -> admin
 *   owner   -> owner
 */
export type Tier = 'sales' | 'manager' | 'admin' | 'owner';

export const TIERS: Tier[] = ['sales', 'manager', 'admin', 'owner'];

export function tierOf(role: string | null | undefined): Tier {
  switch (role) {
    case 'owner':
      return 'owner';
    case 'admin':
      return 'admin';
    case 'manager':
    case 'president':
      return 'manager';
    default:
      return 'sales';
  }
}

export function tierLabel(tier: Tier): string {
  switch (tier) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Pillar';
    case 'manager':
      return 'Manager';
    default:
      return 'Sales';
  }
}

/** Admin and owner. Sees every lead, private notes, imports, reassignment. */
export function isStaffTier(tier: Tier): boolean {
  return tier === 'admin' || tier === 'owner';
}

/** Manager and above. Can work leads. */
export function canWorkLeads(tier: Tier): boolean {
  return tier !== 'sales';
}

/** The tier used for the database role write. */
export function tierToDbRole(tier: Tier): string {
  return tier === 'sales' ? 'rookie' : tier;
}
