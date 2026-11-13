import { useAuth } from '@/hooks/useAuth';
import { usePortalPeople, Person } from './usePortalPeople';
import { Loader2 } from 'lucide-react';

function List({ title, people, empty, extra }: { title: string; people: Person[]; empty: string; extra?: string | null }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h2>
      {people.length ? (
        <ul className="space-y-2">{people.map((p) => <li key={p.user_id} className="text-foreground">{p.full_name || 'Name not on file'}</li>)}</ul>
      ) : extra ? null : <p className="text-muted-foreground">{empty}</p>}
      {extra && <p className="mt-2 text-sm text-muted-foreground">Direct manager on profile: {extra}</p>}
    </section>
  );
}

export default function PortalHome() {
  const { user, profile } = useAuth();
  const { data, isLoading } = usePortalPeople(user?.id);
  const name = profile?.full_name?.split(' ')[0] || profile?.full_name || '';
  const dm = (profile as { direct_manager?: string | null } | null)?.direct_manager;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{name ? `Hi, ${name}` : 'Welcome'}</h1>
        <p className="text-muted-foreground mt-1">Your place in the team</p>
      </div>
      {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          <List title="Upline" people={data?.upline ?? []} empty="No upline on file." extra={dm} />
          <List title="Downline" people={data?.downline ?? []} empty="No downline on file." />
        </div>
      )}
    </div>
  );
}
