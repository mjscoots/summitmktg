import outline from './training-outline.md?raw';
import script from './training-script.md?raw';
import onboarding from './rep-onboarding.md?raw';
import sales from './rookie-sales-outline.md?raw';
import oneonone from './one-on-one-guide.md?raw';
import coldleads from './cold-lead-texts.md?raw';

export const PORTAL_DOCS = {
  outline: { title: 'Recruiting training outline (2 hours)', path: '/portal/training/outline', source: outline, managerOnly: false },
  script: { title: 'Recruiting training script (2 hours)', path: '/portal/training/script', source: script, managerOnly: false },
  onboarding: { title: 'Rep onboarding', path: '/portal/training/onboarding', source: onboarding, managerOnly: false },
  sales: { title: 'Rookie sales outline', path: '/portal/training/sales-outline', source: sales, managerOnly: false },
  oneonone: { title: 'Running a 1:1', path: '/portal/training/one-on-one', source: oneonone, managerOnly: false },
  coldleads: { title: 'Cold lead texts (manager only)', path: '/portal/training/cold-leads', source: coldleads, managerOnly: true },
} as const;
export type PortalDocKey = keyof typeof PORTAL_DOCS;
