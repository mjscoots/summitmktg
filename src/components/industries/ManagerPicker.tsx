import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getDisplayName } from '@/lib/hierarchyUtils';
import { ChevronRight, Shuffle, Users, Clock, Loader2 } from 'lucide-react';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface EligibleManager {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  rep_year: string | null;
  vertical: string;
  runs_vertical: boolean;
  intro: string | null;
  capacity: number | null;
  mentee_count: number;
  teams_led: string[] | null;
}

interface PendingRequest {
  id: string;
  status: string;
  created_at: string;
  manager_id: string;
  manager_name: string | null;
}

interface Props {
  vertical: string;
  label: string;
  onPaired: () => void;
}

export function ManagerPicker({ vertical, label, onPaired }: Props) {
  const [managers, setManagers] = useState<EligibleManager[]>([]);
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);

  const load = useCallback(async () => {
    const [deck, req] = await Promise.all([
      supabase.rpc('get_eligible_managers' as never, { _vertical: vertical } as never),
      supabase.rpc('get_my_pairing_request' as never, { _vertical: vertical } as never),
    ]);
    setManagers(((deck.data as unknown as { rows: EligibleManager[] })?.rows) || []);
    setPending((req.data as unknown as PendingRequest | null) || null);
    setIndex(0);
    setLoading(false);
  }, [vertical]);

  useEffect(() => {
    load();
  }, [load]);

  const next = () => {
    setDragX(0);
    setIndex((i) => i + 1);
  };

  const pick = async (m: EligibleManager) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('request_pairing' as never, {
      _vertical: vertical,
      _manager_id: m.user_id,
    } as never);
    setBusy(false);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not send request', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request sent', description: `${getDisplayName(m.full_name || '')} has been asked.` });
    load();
    onPaired();
  };

  const chooseForMe = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('auto_pair' as never, { _vertical: vertical } as never);
    setBusy(false);
    const res = data as unknown as { success: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast({ title: 'Could not pick', description: res?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request sent', description: 'We asked the manager with the most room.' });
    load();
    onPaired();
  };

  if (loading) {
    return (
      <div className={CARD}>
        <p className="text-sm text-muted-foreground">Loading managers...</p>
      </div>
    );
  }

  if (pending) {
    return (
      <div className={CARD}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Waiting on {pending.manager_name ? getDisplayName(pending.manager_name) : 'your manager'}
          </p>
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Sent {new Date(pending.created_at).toLocaleDateString()}. If there's no answer in 48 hours you'll be able to pick again.
        </p>
      </div>
    );
  }

  const card = managers[index];

  if (!card) {
    return (
      <div className={CARD}>
        <p className="text-sm font-medium text-foreground">
          {managers.length === 0 ? 'No managers are accepting new reps right now.' : "That's everyone for now."}
        </p>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Check back later, or start over to look again.
        </p>
        {managers.length > 0 && (
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setIndex(0)}>
            Start over
          </Button>
        )}
      </div>
    );
  }

  const firstName = getDisplayName(card.full_name || '') || 'them';

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Pick your {label} manager</h2>
        <p className="mt-1 text-[13px] tabular-nums text-muted-foreground">
          {index + 1} of {managers.length}
        </p>
      </div>

      <div
        className={cn(CARD, 'touch-pan-y select-none')}
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX / 40}deg)`,
          transition: startX.current === null ? 'transform 180ms ease' : 'none',
        }}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          if (startX.current === null) return;
          setDragX(e.touches[0].clientX - startX.current);
        }}
        onTouchEnd={() => {
          const dx = dragX;
          startX.current = null;
          if (Math.abs(dx) > 90) next();
          else setDragX(0);
        }}
      >
        <div className="flex items-center gap-3">
          <UserAvatar fullName={card.full_name || 'Manager'} avatarUrl={card.avatar_url} size="lg" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">{card.full_name || 'Manager'}</p>
            <p className="text-[12px] text-muted-foreground">
              {[card.rep_year, card.vertical, card.runs_vertical ? `Runs ${card.vertical}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        {card.teams_led && card.teams_led.length > 0 && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Leads {card.teams_led.join(', ')}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="tabular-nums">{card.mentee_count}</span>
          <span>
            current {card.mentee_count === 1 ? 'mentee' : 'mentees'}
            {card.capacity != null ? ` of ${card.capacity}` : ''}
          </span>
        </div>

        {card.intro && (
          <p className="mt-3 border-t border-white/[0.06] pt-3 text-[13px] leading-relaxed text-foreground/85">
            {card.intro}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="min-h-9 flex-1" disabled={busy} onClick={() => pick(card)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Work with ${firstName}`}
          </Button>
          <Button size="sm" variant="secondary" className="min-h-9" onClick={next}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button size="sm" variant="ghost" className="w-full" disabled={busy} onClick={chooseForMe}>
        <Shuffle className="mr-1.5 h-4 w-4" /> Choose for me
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">Swipe a card to skip.</p>
    </div>
  );
}

export default ManagerPicker;
