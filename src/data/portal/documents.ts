import outline from './training-outline.md?raw';
import script from './training-script.md?raw';

export const PORTAL_DOCS = {
  outline: { title: 'Recruiting training outline (2 hours)', path: '/portal/training/outline', source: outline },
  script: { title: 'Recruiting training script (2 hours)', path: '/portal/training/script', source: script },
} as const;
export type PortalDocKey = keyof typeof PORTAL_DOCS;
