// Edit permissions utility for member profiles
// Extends the existing hierarchy-based permission system

import type { TeamMember } from './hierarchyUtils';
import {
  PILLAR_OWNERS,
  namesMatch,
  getDescendants,
  getEffectiveManager,
} from './hierarchyUtils';

export interface EditPermission {
  canEdit: boolean;
  canEditAll: boolean; // Full access to all fields
  canEditBasic: boolean; // Only basic contact info
  canEditHierarchy: boolean; // Can change Reports To / Team
  reason?: string;
  allowedFields: string[];
}

// All fields that can be edited
export const ALL_EDITABLE_FIELDS = [
  'full_name',
  'phone',
  'email',
  'status',
  'direct_manager',
  'pillar_slug',
  'team_id',
];

// Basic fields rookies can edit on their own profile
export const BASIC_EDITABLE_FIELDS = [
  'phone',
];

/**
 * Check if current user can edit target member's profile
 * 
 * Permission hierarchy:
 * - Admin: Can edit anyone across all teams
 * - Pillar Owner: Can edit anyone within their pillar/team
 * - Manager: Can edit their direct reports only
 * - Rookie: Can only edit their own basic contact info
 */
export function canEditMemberProfile(
  roster: TeamMember[],
  currentUserName: string,
  currentUserRole: 'rookie' | 'manager' | 'admin' | undefined,
  currentUserId: string,
  targetMember: TeamMember
): EditPermission {
  // Admins can edit anyone with full access including hierarchy
  if (currentUserRole === 'admin') {
    return {
      canEdit: true,
      canEditAll: true,
      canEditBasic: true,
      canEditHierarchy: true,
      allowedFields: ALL_EDITABLE_FIELDS,
    };
  }

  // Self-editing (limited to basic fields for non-admins)
  const isSelf = currentUserId === targetMember.user_id;
  if (isSelf) {
    if (currentUserRole === 'manager') {
      return {
        canEdit: true,
        canEditAll: false,
        canEditBasic: true,
        canEditHierarchy: false,
        allowedFields: ['phone', 'email'],
        reason: 'You can edit your contact information',
      };
    }
    return {
      canEdit: true,
      canEditAll: false,
      canEditBasic: true,
      canEditHierarchy: false,
      allowedFields: BASIC_EDITABLE_FIELDS,
      reason: 'You can edit your phone number',
    };
  }

  // Rookies cannot edit anyone else
  if (currentUserRole === 'rookie' || !currentUserRole) {
    return {
      canEdit: false,
      canEditAll: false,
      canEditBasic: false,
      canEditHierarchy: false,
      reason: 'Only managers can edit member profiles',
      allowedFields: [],
    };
  }

  // Check if current user is a pillar owner
  const isPillarOwner = Object.values(PILLAR_OWNERS).some(
    ownerName => namesMatch(currentUserName, ownerName)
  );

  if (isPillarOwner) {
    const currentUserPillar = Object.entries(PILLAR_OWNERS).find(
      ([_, ownerName]) => namesMatch(currentUserName, ownerName)
    )?.[0];

    if (currentUserPillar && targetMember.pillar === currentUserPillar) {
      return {
        canEdit: true,
        canEditAll: true,
        canEditBasic: true,
        canEditHierarchy: true, // Pillars CAN edit hierarchy
        allowedFields: ALL_EDITABLE_FIELDS,
      };
    }

    const descendants = getDescendants(roster, currentUserName);
    if (descendants.some(d => d.user_id === targetMember.user_id)) {
      return {
        canEdit: true,
        canEditAll: true,
        canEditBasic: true,
        canEditHierarchy: true, // Pillars CAN edit hierarchy
        allowedFields: ALL_EDITABLE_FIELDS,
      };
    }

    return {
      canEdit: false,
      canEditAll: false,
      canEditBasic: false,
      canEditHierarchy: false,
      reason: 'Member is not in your team',
      allowedFields: [],
    };
  }

  // Regular managers can edit their direct reports BUT NOT hierarchy fields
  const effectiveTargetManager = getEffectiveManager(targetMember.direct_manager);
  if (namesMatch(effectiveTargetManager, currentUserName)) {
    const managerFields = ALL_EDITABLE_FIELDS.filter(f => f !== 'direct_manager' && f !== 'pillar_slug' && f !== 'team_id');
    return {
      canEdit: true,
      canEditAll: false,
      canEditBasic: true,
      canEditHierarchy: false, // Managers CANNOT edit hierarchy
      allowedFields: managerFields,
      reason: 'Only Pillars and Admins can change reporting structure',
    };
  }

  return {
    canEdit: false,
    canEditAll: false,
    canEditBasic: false,
    canEditHierarchy: false,
    reason: 'You can only edit your direct reports',
    allowedFields: [],
  };
}

/**
 * Check if a field is editable by the current user for the target member
 */
export function isFieldEditable(
  permission: EditPermission,
  fieldName: string
): boolean {
  return permission.allowedFields.includes(fieldName);
}
