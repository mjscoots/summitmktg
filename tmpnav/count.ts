import { moreGroups, phoneBar, desktopMain, manageFor } from '../src/lib/appNav';
const personas: Array<[string, string, string]> = [
  ['rep Pest','Pest','rookie'],['rep Fiber','Fiber','rookie'],['rep Life','Life','rookie'],
  ['manager Pest','Pest','manager'],['manager Fiber','Fiber','manager'],['owner Pest','Pest','owner'],
];
for (const [name, vert, role] of personas) {
  const g = moreGroups(vert, role);
  const items = g.flatMap((x) => x.items);
  console.log(`\n== ${name}`);
  console.log(`bottom bar: ${phoneBar(vert).length} [${phoneBar(vert).map(i=>i.label).join(', ')}]`);
  console.log(`More groups: ${g.length}  More items: ${items.length}`);
  g.forEach((x) => console.log(`  ${x.title}: ${x.items.map(i=>i.label).join(', ')}`));
  console.log(`sidebar main: ${desktopMain(vert).map(i=>i.label).join(', ')}`);
  console.log(`sidebar manage: ${manageFor(vert, role).map(i=>i.label).join(', ')}`);
}
