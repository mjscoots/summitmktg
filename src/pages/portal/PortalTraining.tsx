import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';

type Item = { to: string; label: string; sub?: string };
const ROOKIE: Item[] = [
  { to: '/app/training/summer-sales-manual', label: 'Rookie Manual', sub: 'Summer Sales Manual' },
  { to: '/app/training/learn-your-pitch', label: 'Learn Your Pitch' },
  { to: '/app/training/videos', label: 'Training videos' },
  { to: '/summer-checklist', label: 'Bootcamp' },
];
const MANAGER: Item[] = [
  { to: '/app/training/manager-manual', label: 'Manager Manual' },
  { to: '/app/training/management-basics', label: 'Recruiting Resources' },
  { to: '/app/training/manager-videos', label: 'Manager videos' },
];

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="space-y-3">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="flex min-h-11 flex-col justify-center rounded-lg border border-border bg-card p-4 hover:border-primary transition-colors">
              <span className="font-medium">{i.label}</span>
              {i.sub && <span className="text-sm text-muted-foreground">{i.sub}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PortalTraining() {
  const { role } = useAuth();
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Training</h1>
      <Section title="Rookie training" items={ROOKIE} />
      {isManagerOrAbove(role) && <Section title="Manager training" items={MANAGER} />}
    </div>
  );
}
