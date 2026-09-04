import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Pillar {
  team_id: string;
  name: string;
  vertical: string | null;
  leader_name: string | null;
  token: string | null;
  expires_at: string | null;
}

const linkFor = (token: string) => `${window.location.origin}/p/${token}`;

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const isExpired = (iso: string | null) => !!iso && new Date(iso).getTime() <= Date.now();

/**
 * The permanent recruit link for a pillar. One link per pillar, it never
 * expires, and regenerating it stops the old one working.
 */
export function PillarLinksPanel() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).rpc('my_pillars');
    setPillars((data as Pillar[] | null) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ensure = async (p: Pillar) => {
    setBusy(p.team_id);
    const { data, error } = await (supabase as any).rpc('pillar_link_ensure', { _team_id: p.team_id });
    setBusy(null);
    const res = (data as { success?: boolean; token?: string; error?: string } | null) || null;
    if (error || !res?.success || !res.token) {
      toast.error(res?.error || error?.message || 'That did not go through');
      return;
    }
    await share(p, res.token);
    void load();
  };

  const regenerate = async (p: Pillar) => {
    setBusy(p.team_id);
    const { data, error } = await (supabase as any).rpc('pillar_link_regenerate', { _team_id: p.team_id });
    setBusy(null);
    const res = (data as { success?: boolean; token?: string; error?: string } | null) || null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || 'That did not go through');
      return;
    }
    toast.success('New link made. The old one no longer works.');
    void load();
  };

  const renew = async (p: Pillar) => {
    setBusy(p.team_id);
    const { data, error } = await (supabase as any).rpc('pillar_link_ensure', { _team_id: p.team_id });
    setBusy(null);
    const res = (data as { success?: boolean; error?: string } | null) || null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || 'That did not go through');
      return;
    }
    toast.success('Link renewed for another 90 days.');
    void load();
  };

  const share = async (p: Pillar, token: string) => {
    const url = linkFor(token);
    const text = `Join ${p.name} at Summit: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${p.name}`, text, url });
        return;
      } catch {
        // The share sheet was closed. Fall through to the clipboard.
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (pillars.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-card/60 p-4">
      <p className="text-[15px] font-semibold text-foreground">Your recruit link</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        One permanent link per pillar. Anyone who joins through it lands in your pillar and waits for you to accept
        them.
      </p>

      <div className="mt-3 space-y-3">
        {pillars.map((p) => (
          <div key={p.team_id} className="rounded-xl border border-white/[0.06] bg-background/40 p-3">
            <p className="text-[14px] font-semibold text-foreground">{p.name}</p>
            <p className="text-[12px] text-muted-foreground">
              {p.vertical || 'Pest'}
              {p.leader_name ? ` · Led by ${p.leader_name}` : ''}
            </p>

            {p.token ? (
              <>
                <p className="mt-2 break-all text-[12px] text-muted-foreground">{linkFor(p.token)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" className="min-h-11" onClick={() => share(p, p.token as string)}>
                    Copy or share
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-11"
                    disabled={busy === p.team_id}
                    onClick={() => regenerate(p)}
                  >
                    {busy === p.team_id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Make a new link
                  </Button>
                </div>
              </>
            ) : (
              <Button
                size="sm"
                className="mt-2 min-h-11"
                disabled={busy === p.team_id}
                onClick={() => ensure(p)}
              >
                {busy === p.team_id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create the link
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default PillarLinksPanel;
