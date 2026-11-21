import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { ONE_ON_ONE_NOTICE } from '@/data/portal/oneOnOnes';

export default function PortalOneOnOnes() {
  const { role } = useAuth();
  const items = [
    { to: '/portal/one-on-ones/rep', title: 'Rep 1:1', sub: 'Manager with a rep. About 10 minutes.' },
    ...(isManagerOrAbove(role) ? [{ to: '/portal/one-on-ones/pillar', title: 'Pillar 1:1', sub: 'Mathew with a pillar.' }] : []),
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Weekly 1:1s</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">1:1s run every Monday. Same form every week. One commitment, one drill, one next 1:1 on the calendar.</p>
      <ul className="space-y-3">
        {items.map((item) => <li key={item.to}>
          <Link to={item.to} className="flex min-h-11 flex-col justify-center rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary">
            <span className="font-medium">{item.title}</span><span className="text-sm text-muted-foreground">{item.sub}</span>
          </Link>
        </li>)}
      </ul>
      <Link to="/portal/training/one-on-one" className="inline-flex min-h-11 items-center text-sm text-primary">How to run a 1:1</Link>
      <p className="rounded-md border border-border bg-muted p-4 text-sm leading-relaxed">{ONE_ON_ONE_NOTICE}</p>
    </div>
  );
}