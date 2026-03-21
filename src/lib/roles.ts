// Centralized role helper utilities
// Replaces all inline `role === 'manager' || role === 'admin' || role === 'owner'` checks

type UserRole = 'rookie' | 'manager' | 'admin' | 'owner' | 'spectator';

/** Manager, Admin, or Owner */
export function isManagerOrAbove(role: string | undefined | null): boolean {
  return role === 'manager' || role === 'admin' || role === 'owner';
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
