import { describe, expect, it } from 'vitest';
import raw from '@/data/portal/training-library.json?raw';

type Item = { title?: string; href?: string; linkKind?: string; managerOnly?: boolean };
const items = JSON.parse(raw) as Item[];

describe('training-library.json', () => {
  it('has no item with an empty title or href', () => {
    for (const item of items) {
      expect(item.title?.trim(), JSON.stringify(item)).toBeTruthy();
      expect(item.href?.trim(), JSON.stringify(item)).toBeTruthy();
    }
  });

  it('every item visible to non-managers links to a portal or app page', () => {
    for (const item of items.filter((i) => i.managerOnly === false)) {
      expect(['portal', 'app'], item.title).toContain(item.linkKind);
    }
  });
});
