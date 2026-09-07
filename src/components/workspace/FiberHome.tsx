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
import { HomeGreeting } from '@/components/home/HomeGreeting';
import { TodayRow } from '@/components/home/TodayRow';
import { WorkspaceHero } from '@/components/home/WorkspaceHero';

import { UpcomingBlitzes } from '@/components/fiber/UpcomingBlitzes';
import { MoreReveal } from '@/components/home/MoreReveal';

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
 * Pass 86 - the Fiber hub. The real work runs on Gainz, so this screen is
 * resources: Gainz, contacts, how it works, questions, training and chat.
 * Team tracking (installs, tier, region) is kept but demoted to the bottom.
 */
export function FiberHome({ workspace }: { workspace: Workspace }) {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
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
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-8 pt-6 sm:space-y-10">
      <WorkspaceHero
        firstName={profile?.full_name?.split(' ')[0] || null}
        workspaceName={workspace.name}
        metric={{ label: 'Today', value: todaySold }}
      />
      <Button variant="link" className="min-h-11 w-fit px-0 underline" onClick={() => navigate('/app/progress')}>
        Progress
      </Button>
    </div>
  );
}

export default FiberHome;
