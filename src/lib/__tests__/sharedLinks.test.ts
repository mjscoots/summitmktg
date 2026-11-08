import { readFileSync } from 'node:fs';
import { expect, test } from 'bun:test';

test('shared Resources requests shared links, not personal shortcuts', async () => {
  const source = readFileSync(new URL('../../pages/app/LinksPage.tsx', import.meta.url), 'utf8');
  const query = source.match(/const fetchLinks = async \(\) => \{([\s\S]*?)setLinks\(/)?.[1];
  if (!query) throw new Error('Resources query was not found');
  const rows = [
    { id: 'company', link_scope: 'shared', is_active: true },
    { id: 'mine', link_scope: 'personal', is_active: true },
    { id: 'another-rep', link_scope: 'personal', is_active: true },
  ];
  let selected = rows;
  const builder = {
    select: () => builder,
    eq: (key: string, value: unknown) => {
      selected = selected.filter(row => row[key as keyof typeof row] === value);
      return builder;
    },
    order: async () => ({ data: selected }),
  };
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
  const run = new AsyncFunction('supabase', `${query}\nreturn data;`);
  const result = await run({ from: (table: string) => {
    expect(table).toBe('managed_links');
    return builder;
  } });
  expect(result.map((row: { id: string }) => row.id)).toEqual(['company']);
});