import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Workspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';
import { LogInstallDialog } from '@/components/fiber/LogInstallDialog';

export const FIBER_CARD = 'rounded-xl border border-border bg-card';

function weekStart(): string {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

interface Money {
  rank_label?: string | null;
  next_tier_label?: string | null;
  next_tier_gap?: number | null;
  next_tier_progress?: number | null;
}

interface Lead {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

/** Fiber home. Installs, rank, region lead. No points, streaks, or accounts. */
export function FiberHome({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [week, setWeek] = useState(0);
  const [season, setSeason] = useState(0);
  const [money, setMoney] = useState<Money | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [steps, setSteps] = useState({ done: 0, total: 0 });
  const [pinned, setPinned] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const w = weekStart();
    const [installsRes, moneyRes, meRes, stepsRes, doneRes, pinnedRes] = await Promise.all([
      (supabase as any)
        .from('fiber_installs')
        .select('installs, week_start, carrier_id')
        .eq('user_id', user.id),
      (supabase as any).rpc('get_my_money'),
      (supabase as any).from('profiles').select('region_id, region').eq('id', user.id).maybeSingle(),
      (supabase as any)
        .from('vertical_steps')
        .select('id, title, display_order')
        .eq('vertical', 'Fiber')
        .eq('is_active', true)
        .order('display_order'),

      (supabase as any)
        .from('vertical_step_completions')
        .select('step_id')
        .eq('user_id', user.id)
        .eq('vertical', 'Fiber'),
      (supabase as any)
        .from('announcement_posts')
        .select('title')
        .eq('is_pinned', true)
        .eq('status', 'published')
        .eq('vertical', 'Fiber')
        .limit(1),
    ]);

    const rows = (installsRes.data as { installs: number; week_start: string; carrier_id: string }[]) || [];
    setWeek(rows.filter((r) => r.week_start === w).reduce((a, r) => a + (r.installs || 0), 0));
    setSeason(rows.reduce((a, r) => a + (r.installs || 0), 0));
    setMoney((moneyRes.data as Money) || null);
    const stepRows = (stepsRes.data as { id: string; title: string }[]) || [];
    const doneIds = new Set(((doneRes.data as { step_id: string }[]) || []).map((r) => r.step_id));
    setStepList(stepRows.map((s) => ({ id: s.id, title: s.title, done: doneIds.has(s.id) })));
    setSteps({
      total: stepRows.length,
      done: stepRows.filter((s) => doneIds.has(s.id)).length,
    });
    setPinned(((pinnedRes.data as { title: string }[]) || [])[0]?.title || null);


    const carrierId = rows[0]?.carrier_id;
    if (carrierId) {
      const { data: c } = await (supabase as any).from('carriers').select('name').eq('id', carrierId).maybeSingle();
      setCarrierName((c as { name: string } | null)?.name || null);
    }

    const me = meRes.data as { region_id: string | null; region: string | null } | null;
    setRegionName(me?.region || null);
    if (me?.region_id) {
      const { data: r } = await (supabase as any)
        .from('regions')
        .select('name, lead_user_id, intro')
        .eq('id', me.region_id)
        .maybeSingle();
      const region = r as { name: string; lead_user_id: string | null; intro: string | null } | null;
      if (region?.name) setRegionName(region.name);
      setRegionIntro(region?.intro || null);

      if (region?.lead_user_id) {
        const { data: lp } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url, phone')
          .eq('id', region.lead_user_id)
          .maybeSingle();
        setLead((lp as Lead) || null);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const gap = money?.next_tier_gap ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8">
      <div className="workspace-texture relative mb-4 overflow-hidden rounded-xl border border-border bg-card p-5">
        <div className="relative z-10">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {user?.user_metadata?.full_name || 'Your Fiber'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[regionName ? `${regionName} region` : null, carrierName].filter(Boolean).join(' · ') ||
              'Region and carrier not set'}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <div className={`${FIBER_CARD} p-3`}>
          <p className="text-xs text-muted-foreground">This week</p>
          <p className="text-2xl font-medium tabular-nums text-primary">{week}</p>
        </div>
        <div className={`${FIBER_CARD} p-3`}>
          <p className="text-xs text-muted-foreground">Season</p>
          <p className="text-2xl font-medium tabular-nums text-primary">{season}</p>
        </div>
        <div className={`${FIBER_CARD} p-3`}>
          <p className="text-xs text-muted-foreground">Rank</p>
          <p className="truncate text-base font-medium text-foreground">{money?.rank_label || '—'}</p>
        </div>
      </div>

      {money?.next_tier_label && (
        <div className={`${FIBER_CARD} mb-4 p-4`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-foreground">Next tier: {money.next_tier_label}</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {gap !== null ? `${gap} installs to go` : 'Amount not set'}
            </p>
          </div>
          {gap !== null && season + gap > 0 && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, Math.round((season / (season + gap)) * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}

      <Button className="mb-4 min-h-11 w-full" onClick={() => setLogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Log an install
      </Button>

      <NeedsYouRow />

      <div className={`${FIBER_CARD} mb-4 p-4`}>
        <p className="mb-3 text-sm font-medium text-foreground">Region lead</p>
        {lead ? (
          <div className="flex items-center gap-3">
            {lead.avatar_url ? (
              <img src={lead.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary text-sm font-medium text-foreground">
                {(lead.full_name || '—').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <p className="min-w-0 flex-1 truncate text-sm text-foreground">{lead.full_name || 'Unnamed'}</p>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border text-foreground"
                aria-label="Call region lead"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => navigate('/app/chat')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No region lead assigned yet.</p>
        )}
      </div>

      {steps.total > 0 && steps.done < steps.total && (
        <div className={`${FIBER_CARD} mb-4 space-y-2 p-4`}>
          <p className="text-sm font-medium text-foreground">Setup path</p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {steps.done} of {steps.total} steps complete
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/industries')}>
            Continue setup
          </Button>
        </div>
      )}

      <div className={`${FIBER_CARD} mb-4 p-4`}>
        <p className="text-sm font-medium text-foreground">Announcement</p>
        <p className="mt-1 text-sm text-muted-foreground">{pinned || 'No announcement yet.'}</p>
      </div>

      <div className={`${FIBER_CARD} space-y-2 p-4`}>
        <p className="text-sm font-medium text-foreground">Team chat</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/chat')}>
          Open {workspace.short_name} chat
        </Button>
      </div>

      <LogInstallDialog open={logOpen} onOpenChange={setLogOpen} onSaved={() => void load()} />
    </div>
  );
}

export default FiberHome;
