// Centralized role helper utilities
// Replaces all inline `role === 'manager' || role === 'admin' || role === 'owner'` checks

type UserRole = 'rookie' | 'manager' | 'president' | 'admin' | 'owner' | 'spectator';

/** Manager, President, Admin, or Owner */
export function isManagerOrAbove(role: string | undefined | null): boolean {
  return role === 'manager' || role === 'president' || role === 'admin' || role === 'owner';
}

/** President of an industry workspace */
export function isPresident(role: string | undefined | null): boolean {
  return role === 'president';
}

/** Admin or Owner only */
export function isAdminOrAbove(role: string | undefined | null): boolean {
  return role === 'admin' || role === 'owner';
}

/** Owner only */
export function isOwner(role: string | undefined | null): boolean {
  return role === 'owner';
}

/** Map app role to a simplified DB role for queries */
export function toDbRole(role: string | undefined | null): 'manager' | 'rookie' {
  return isManagerOrAbove(role) ? 'manager' : 'rookie';
}
