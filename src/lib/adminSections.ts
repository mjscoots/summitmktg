/**
 * Admin is six sections, each its own route. Every old tab still exists —
 * it now lives inside one of these sections.
 */
export type AdminSection = 'inbox' | 'people' | 'money' | 'content' | 'reports' | 'settings';

export interface AdminTabDef {
  value: string;
  label: string;
  adminOnly?: boolean;
  ownerOnly?: boolean;
}

export const ADMIN_SECTIONS: { key: AdminSection; label: string; path: string }[] = [
  { key: 'inbox', label: 'Inbox', path: '/admin/inbox' },
  { key: 'people', label: 'People', path: '/admin/people' },
  { key: 'money', label: 'Money', path: '/admin/money' },
  { key: 'content', label: 'Content', path: '/admin/content' },
  { key: 'reports', label: 'Reports', path: '/admin/reports' },
  { key: 'settings', label: 'Settings', path: '/admin/settings' },
];

export const SECTION_TABS: Record<AdminSection, AdminTabDef[]> = {
  inbox: [
    { value: 'queue', label: 'Decisions' },
    { value: 'approvals', label: 'Approvals' },
    { value: 'apps', label: 'Applications' },
    { value: 'requests', label: 'Reactivations' },
    { value: 'pitches', label: 'Pitches' },
    { value: 'feedback', label: 'Feedback' },
  ],
  people: [
    { value: 'users', label: 'Roster' },
    { value: 'teams', label: 'Teams and regions' },
    { value: 'restore', label: 'Restore access' },
    { value: 'tiers', label: 'Access tiers' },
    { value: 'leadimport', label: 'Import leads', adminOnly: true },
    { value: 'archived', label: 'Archived' },
    { value: 'sync', label: 'Hierarchy sync' },
  ],
  money: [
    { value: 'money', label: 'Ladders and production', adminOnly: true },
    { value: 'statements', label: 'Statements', adminOnly: true },
  ],
  content: [
    { value: 'drills', label: 'Drills', adminOnly: true },
    { value: 'culture', label: 'Culture', adminOnly: true },
    { value: 'recruiting', label: 'Public site' },
    { value: 'assistant', label: 'Ask Summit', adminOnly: true },
  ],
  reports: [
    { value: 'overview', label: 'Overview' },
    { value: 'offseason', label: 'Off-season' },
    { value: 'targets', label: 'Targets', ownerOnly: true },
  ],
  settings: [
    { value: 'industries', label: 'Industries' },
    { value: 'audit', label: 'Audit log' },
    { value: 'export', label: 'Exports', adminOnly: true },
    { value: 'system', label: 'System', ownerOnly: true },
  ],
};

/** Which section owns a legacy tab value (used for /admin/team redirects). */
export function sectionForTab(tab: string | null): AdminSection {
  if (!tab) return 'inbox';
  for (const [key, tabs] of Object.entries(SECTION_TABS) as [AdminSection, AdminTabDef[]][]) {
    if (tabs.some((t) => t.value === tab)) return key;
  }
  return 'inbox';
}
