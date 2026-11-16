import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { useLeadsList, leadActions, telHref, type LeadRow } from '@/hooks/useLeads';
import LeadFormSlot from '@/components/recruiting/LeadFormSlot';

export default function PortalClaimLeads() {
  const { role, isLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const mine = useLeadsList('mine', {});
  const pool = useLeadsList('free', { search, limit: 50 });

  if (isLoading) {
    return (
      <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
    );
  }

  if (!isManagerOrAbove(role)) {
    return <Navigate to="/portal" replace />;
  }

  const claim = async (lead: LeadRow) => {
    setClaimingId(lead.id);
    const { error } = await leadActions.claim(lead.id);
    setClaimingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${lead.full_name} is yours`);
    mine.reload();
    pool.reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Claim leads</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My leads</h2>
        {mine.loading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        ) : mine.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no leads yet.</p>
        ) : (
          <ul className="space-y-2">
            {mine.rows.map((lead) => {
              const tel = telHref(lead.phone);
              return (
                <li
                  key={lead.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{lead.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.stage && (
                        <span className="mr-2 inline-block rounded-full border border-border px-2 py-0.5">
                          {lead.stage.replace(/_/g, ' ')}
                        </span>
                      )}
                      {lead.designation_status === 'claimed' ? 'Claimed by you' : 'Assigned to you'}
                    </p>
                  </div>
                  {tel && (
                    <a href={tel} className="text-sm text-primary hover:underline">
                      Call
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Lead pool</h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        {pool.loading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        ) : pool.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No free leads in your pool right now.</p>
        ) : (
          <ul className="space-y-2">
            {pool.rows.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{lead.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.system && <span className="mr-2">{lead.system}</span>}
                    {lead.stage && (
                      <span className="inline-block rounded-full border border-border px-2 py-0.5">
                        {lead.stage.replace(/_/g, ' ')}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => claim(lead)}
                  disabled={claimingId === lead.id}
                  className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {claimingId === lead.id ? 'Claiming...' : 'Claim'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link to="/app/leads?tab=mine" className="inline-block text-sm text-primary hover:underline">
        Open full Leads page to log calls
      </Link>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">New recruit funnel</h2>
        <LeadFormSlot />
      </section>
    </div>
  );
}
