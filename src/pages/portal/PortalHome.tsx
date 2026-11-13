import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const LINKS = [
  { to: '/portal/training', label: 'Training' },
  { to: '/portal/forms', label: 'Forms' },
  { to: '/portal/resources', label: 'Resources' },
  { to: '/portal/calendar', label: 'Calendar' },
];

export default function PortalHome() {
  const { profile } = useAuth();
  const name = profile?.full_name?.split(' ')[0] || profile?.full_name || '';
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{name ? `Hi, ${name}` : 'Welcome'}</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="flex min-h-11 items-center rounded-lg border border-border bg-card p-4 font-medium hover:border-primary transition-colors">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
