import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageCircle, Plus, Check, GraduationCap, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Workspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NeedsYouRow } from '@/components/chat/NeedsYouRow';
import { TodayNumberSheet, PAY_NOTE } from '@/components/fiber/TodayNumberSheet';
import { useFiberToday } from '@/hooks/useFiberToday';
import { useMyFiberStart } from '@/hooks/useRollover';
import { daysUntil, formatStart } from '@/lib/rollover';
import { isManagerOrAbove } from '@/lib/roles';
import { useFiberHub } from '@/hooks/useFiberHub';
import {
  GainzHero,
  JoinGainzCard,
  ContactsCard,
  FiberQuestions,
  FiberEyebrow,
  HUB_CARD,
} from '@/components/fiber/FiberHubCards';
import { UpdatesStrip } from '@/components/home/UpdatesStrip';
import { UpcomingBlitzes } from '@/components/fiber/UpcomingBlitzes';
import { MoreReveal } from '@/components/home/MoreReveal';
import { YourThreeCard } from '@/components/home/YourThreeCard';

export const FIBER_CARD = HUB_CARD;

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

/**
 * Pass 86 — the Fiber hub. The real work runs on Gainz, so this screen is
 * resources: Gainz, contacts, how it works, questions, training and chat.
 * Team tracking (installs, tier, region) is kept but demoted to the bottom.
 */
export function FiberHome({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const canShareJoinLink = isManagerOrAbove(role);
  const { contacts, joinLink, faq } = useFiberHub();
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [week, setWeek] = useState(0);
  const [season, setSeason] = useState(0);
  const [recent, setRecent] = useState(0);
  const [money, setMoney] = useState<Money | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [steps, setSteps] = useState({ done: 0, total: 0 });
  const [stepList, setStepList] = useState<{ id: string; title: string; done: boolean }[]>([]);
  const [regionIntro, setRegionIntro] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const { start: fiberStart } = useMyFiberStart();
  const { today: todaySold, week: weekSold, reload: reloadToday } = useFiberToday();

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
    const prev = new Date(`${w}T00:00:00`);
    prev.setDate(prev.getDate() - 7);
    const prevW = prev.toISOString().slice(0, 10);
    setRecent(
      rows.filter((r) => r.week_start === w || r.week_start === prevW).reduce((a, r) => a + (r.installs || 0), 0)
    );
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
          .eq('user_id', region.lead_user_id)
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
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const gap = money?.next_tier_gap ?? null;
  const notStarted = Boolean(fiberStart && daysUntil(fiberStart) > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-8 sm:space-y-10">
      <UpdatesStrip isManagerTier={false} />

      <GainzHero />

      <ContactsCard contacts={contacts} />

      <FiberQuestions faq={faq} />

      <UpcomingBlitzes />

      <MoreReveal>
        <YourThreeCard />
        <section className={`${HUB_CARD} p-4`}>
          <FiberEyebrow>Today</FiberEyebrow>
          <div className="flex items-end justify-between gap-4">
            <div>
              {(todaySold > 0 || weekSold > 0) && (
                <>
                  <p className="text-4xl font-semibold tabular-nums text-foreground">{todaySold}</p>
                  {weekSold > 0 && (
                    <p className="text-[15px] tabular-nums text-muted-foreground">This week {weekSold}</p>
                  )}
                </>
              )}
            </div>
            <Button className="min-h-11" onClick={() => setLogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              How many today?
            </Button>
          </div>
          <p className="mt-3 text-[15px] text-muted-foreground">{PAY_NOTE}</p>
        </section>

        {notStarted && fiberStart && (
          <div className={`${HUB_CARD} p-4`}>
            <p className="text-[15px] font-semibold text-foreground">You start {formatStart(fiberStart)}</p>
            <p className="mt-1 text-[15px] text-muted-foreground">
              Your installs and pay live here once you start.
            </p>
          </div>
        )}

        {canShareJoinLink && <JoinGainzCard link={joinLink} />}

        {/* Two links, inlined as rows instead of two cards. */}
        <div className={`${HUB_CARD} divide-y divide-border`}>
          <button
            type="button"
            onClick={() => navigate('/app/training')}
            className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
          >
            <GraduationCap className="h-5 w-5" style={{ color: 'hsl(var(--workspace-accent))' }} />
            <span className="text-[15px] font-semibold text-foreground">Training</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/chat')}
            className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
          >
            <MessageCircle className="h-5 w-5" style={{ color: 'hsl(var(--workspace-accent))' }} />
            <span className="text-[15px] font-semibold text-foreground">{workspace.short_name} chat</span>
          </button>
        </div>

        <NeedsYouRow className="!px-0" />

        {steps.total > 0 && steps.done < steps.total && (
          <div className={`${HUB_CARD} space-y-3 p-4`}>
            <FiberEyebrow>Setup path</FiberEyebrow>
            <p className="text-[15px] tabular-nums text-muted-foreground">
              {steps.done} of {steps.total} steps complete
            </p>
            <ul className="space-y-1.5">
              {stepList.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-[15px]">
                  <Check className={s.done ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground/40'} />
                  <span className={s.done ? 'text-muted-foreground' : 'text-foreground'}>{s.title}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="min-h-11" onClick={() => navigate('/app/industries')}>
              Continue setup
            </Button>
          </div>
        )}

        <div className={`${HUB_CARD} p-4`}>
          <FiberEyebrow>Announcement</FiberEyebrow>
          <p className="text-[15px] text-muted-foreground">{pinned || 'No announcement yet.'}</p>
        </div>
      </MoreReveal>


      {/* Team tracking, demoted: official pay and orders live on Gainz. */}
      <div className={`${HUB_CARD} p-4`}>
        <button
          type="button"
          onClick={() => setTrackingOpen((v) => !v)}
          aria-expanded={trackingOpen}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-[14px] font-semibold text-foreground">Team tracking</span>
            <span className="block text-[12px] text-muted-foreground">
              Installs this week {week} · Season {season}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${trackingOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {trackingOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-[12px] text-muted-foreground">
              Official pay runs through Gainz / Sales Raptor. This is team tracking only.
            </p>
            <p className="text-[13px] text-muted-foreground">
              {[regionName ? `${regionName} region` : null, carrierName, money?.rank_label]
                .filter(Boolean)
                .join(' · ') || 'Region and carrier not set'}
            </p>
            <p className="text-[13px] tabular-nums text-muted-foreground">Last two weeks {recent}</p>

            <p className="text-[12px] text-muted-foreground">{PAY_NOTE}</p>

            {money?.next_tier_label && (
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] text-foreground">Next tier: {money.next_tier_label}</p>
                  <p className="text-[13px] tabular-nums text-muted-foreground">
                    {gap !== null ? `${gap} installs to go` : 'Amount not set'}
                  </p>
                </div>
                {gap !== null && season + gap > 0 && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, Math.round((season / (season + gap)) * 100))}%`,
                        background: 'hsl(var(--workspace-accent))',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-border p-3">
              <p className="mb-3 text-[13px] font-medium text-foreground">Region lead</p>
              {lead ? (
                <div className="flex items-center gap-3">
                  {lead.avatar_url ? (
                    <img src={lead.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary text-[13px] font-medium text-foreground">
                      {(lead.full_name || '—').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {lead.full_name || 'Unnamed'}
                  </p>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground"
                      aria-label="Call region lead"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">No region lead assigned yet.</p>
              )}
              {regionIntro && <p className="mt-3 text-[13px] text-muted-foreground">{regionIntro}</p>}
            </div>

            <Button variant="outline" size="sm" onClick={() => navigate('/app/leaderboard')}>
              Open the board
            </Button>
          </div>
        )}
      </div>

      <TodayNumberSheet open={logOpen} onOpenChange={setLogOpen} onSaved={() => { void load(); void reloadToday(); }} />
    </div>
  );
}

export default FiberHome;
