/**
 * Admin is five groups, each its own route. Every group says what lives in it,
 * and nothing sits more than two taps from the Admin root.
 */
export type AdminSection = 'people' | 'requests' | 'money' | 'content' | 'settings';

export interface AdminTabDef {
  value: string;
  label: string;
  adminOnly?: boolean;
  ownerOnly?: boolean;
}

export const ADMIN_SECTIONS: { key: AdminSection; label: string; path: string; blurb: string }[] = [
  {
    key: 'people',
    label: 'People',
    path: '/admin/people',
    blurb: 'Roster, teams and regions, access, and archived records.',
  },
  {
    key: 'requests',
    label: 'Requests',
    path: '/admin/requests',
    blurb: 'Everything waiting on a decision: approvals, applications, vertical access, pitches.',
  },
  {
    key: 'money',
    label: 'Money',
    path: '/admin/money',
    blurb: 'Pest revenue import, fiber weekly sheet, pay scales and holdback.',
  },
  {
    key: 'content',
    label: 'Content',
    path: '/admin/content',
    blurb: 'Playbook, training content, and what the public recruiting site says.',
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/admin/settings',
    blurb: 'Fiber hub, app settings, themes, exports, and the audit log.',
  },
];

export const SECTION_TABS: Record<AdminSection, AdminTabDef[]> = {
  people: [
    { value: 'users', label: 'Roster' },
    { value: 'teams', label: 'Teams and regions' },
    { value: 'tiers', label: 'Access tiers' },
    { value: 'restore', label: 'Restore access' },
    { value: 'leadimport', label: 'Import leads', adminOnly: true },
    { value: 'archived', label: 'Archived' },
  ],
  requests: [
    { value: 'queue', label: 'Decisions' },
    { value: 'approvals', label: 'Approvals' },
    { value: 'verticals', label: 'Vertical requests', adminOnly: true },
    { value: 'apps', label: 'Applications' },
    { value: 'requests', label: 'Reactivations' },
    { value: 'pitches', label: 'Pitches' },
  ],
  money: [{ value: 'money', label: 'Ladders and production', adminOnly: true }],
  content: [
    { value: 'playbook', label: 'Playbook', adminOnly: true },
    { value: 'firstweek', label: 'First week', adminOnly: true },
    { value: 'drills', label: 'Drills', adminOnly: true },
    { value: 'recruiting', label: 'Public site' },
    { value: 'assistant', label: 'Ask Summit', adminOnly: true },
  ],
  settings: [
    { value: 'industries', label: 'Industries' },
    { value: 'fiberhub', label: 'Fiber hub', adminOnly: true },
    { value: 'themes', label: 'Themes' },
    { value: 'audit', label: 'Audit log' },
    { value: 'export', label: 'Exports', adminOnly: true },
    { value: 'system', label: 'System', ownerOnly: true },
  ],
};

/** Which group owns a legacy tab value (used for /admin/team redirects). */
export function sectionForTab(tab: string | null): AdminSection {
  if (!tab) return 'requests';
  for (const [key, tabs] of Object.entries(SECTION_TABS) as [AdminSection, AdminTabDef[]][]) {
    if (tabs.some((t) => t.value === tab)) return key;
  }
  return 'requests';
}
