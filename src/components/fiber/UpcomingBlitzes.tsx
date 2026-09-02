import { useMemo, useState } from 'react';
import { Copy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { blitzKey, useFiberBlitzes, type FiberBlitz } from '@/hooks/useFiberHub';
import { useBlitzOptins } from '@/hooks/useBlitzOptins';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FiberEyebrow, HUB_CARD } from '@/components/fiber/FiberHubCards';

function plainDate(date?: string): string {
  if (!date) return '';
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
}

/** True once the blitz start date has passed, so opting out closes. */
function started(b: FiberBlitz): boolean {
  if (!b.start_date) return false;
  return new Date(`${b.start_date}T12:00:00`).getTime() <= Date.now();
}

/** The exact request text the dealer asked for, from real data only. */
export function requestText(b: FiberBlitz, count: number): string {
  return `Team of ${count}, ${plainDate(b.start_date)} to ${plainDate(b.end_date)}, ${b.place}`;
}

/**
 * Pass 92 - blitzes fill by opt-in. Reps see a live count and can opt in until
 * capacity; managers see the opted roster and copy the request text.
 */
export function UpcomingBlitzes() {
  const { loading, blitzes } = useFiberBlitzes();
  const keys = useMemo(() => blitzes.map(blitzKey), [blitzes]);
  const { eligible, isLead, counts, roster, optIn, optOut } = useBlitzOptins(keys);
  const [busy, setBusy] = useState<string | null>(null);
  const [openRoster, setOpenRoster] = useState<string | null>(null);

  if (loading) return <Skeleton className="mb-4 h-28 w-full" />;
  if (!blitzes.length) return null;

  const toggle = async (key: string, isIn: boolean) => {
    setBusy(key);
    const ok = isIn ? await optOut(key) : await optIn(key);
    setBusy(null);
    if (!ok) toast.error('That did not save. Try again.');
    else toast.success(isIn ? 'You are out' : 'You are in');
  };

  const copy = async (b: FiberBlitz, count: number) => {
    try {
      await navigator.clipboard.writeText(requestText(b, count));
      toast.success('Request copied');
    } catch {
      toast.error('Could not copy that here.');
    }
  };

  return (
    <div className={`${HUB_CARD} mb-4 p-4`}>
      <FiberEyebrow>Upcoming blitzes</FiberEyebrow>
      <ul className="divide-y divide-border">
        {blitzes.map((b) => {
          const key = blitzKey(b);
          const count = counts[key]?.optin_count || 0;
          const isIn = Boolean(counts[key]?.i_am_in);
          const capacity = b.capacity && b.capacity > 0 ? b.capacity : null;
          const full = capacity !== null && count >= capacity && !isIn;
          const window = [plainDate(b.start_date), plainDate(b.end_date)].filter(Boolean).join(' to ');
          const opted = roster[key] || [];
          return (
            <li key={key} className="py-3 first:pt-1 last:pb-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-foreground">{b.place}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {window || b.timing}
                    {b.approximate ? ' · timing approximate' : ''}
                  </p>
                  <p className="mt-0.5 text-[12px] tabular-nums text-muted-foreground">
                    {capacity !== null ? `${count} of ${capacity} in` : `${count} in`}
                  </p>
                </div>

                {eligible && (
                  full ? (
                    <span className="chip-warm celebrate-in min-h-11 px-4 text-[13px]">Full</span>
                  ) : (
                    <Button
                      variant={isIn ? 'outline' : 'default'}
                      className="min-h-11"
                      disabled={busy === key || (isIn && started(b))}
                      onClick={() => void toggle(key, isIn)}
                    >
                      {isIn ? 'Opt out' : 'Opt in'}
                    </Button>
                  )
                )}

              </div>

              {isLead && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => setOpenRoster(openRoster === key ? null : key)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Who is in
                  </Button>
                  {count > 0 && b.start_date && b.end_date && (
                    <Button variant="outline" size="sm" className="min-h-11" onClick={() => void copy(b, count)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy request
                    </Button>
                  )}
                </div>
              )}

              {isLead && openRoster === key && (
                <ul className="mt-2 space-y-1">
                  {opted.length === 0 ? (
                    <li className="text-[12px] text-muted-foreground">Nobody has opted in yet.</li>
                  ) : (
                    opted.map((p) => (
                      <li key={p.user_id} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="truncate text-foreground">{p.full_name || 'Unnamed'}</span>
                        <span className="tabular-nums text-muted-foreground">{p.phone || 'No phone'}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default UpcomingBlitzes;
