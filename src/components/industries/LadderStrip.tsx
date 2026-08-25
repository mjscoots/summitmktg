import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, ChevronRight } from 'lucide-react';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

interface Rung {
  id: string;
  rung: number;
  title: string;
  description: string | null;
}

interface LadderData {
  rungs: Rung[];
  timeline_note: string | null;
  my_rung: number;
  seasons_completed: number;
  rep_year: number;
  min_seasons: number;
  min_rep_year: number;
  can_apply: boolean;
  application: { id: string; vertical: string; status: string; review_note: string | null } | null;
  reapply_after: string | null;
}

/** The org's career pathway plus the "Run a team" application for eligible reps. */
export function LadderStrip({ verticals }: { verticals: { vertical: string; label: string }[] }) {
  const [data, setData] = useState<LadderData | null>(null);
  const [open, setOpen] = useState(false);
  const [vertical, setVertical] = useState(verticals[0]?.vertical || 'Pest');
  const [why, setWhy] = useState('');
  const [results, setResults] = useState('');
  const [availability, setAvailability] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: res } = await supabase.rpc('get_ladder' as never);
    setData((res as unknown as LadderData) || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (why.trim().length < 10) {
      toast({ title: 'Add a bit more', description: 'Tell us why in a sentence or two.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { data: res, error } = await supabase.rpc('apply_run_team' as never, {
      _vertical: vertical,
      _why: why.trim().slice(0, 2000),
      _prior_results: results.trim().slice(0, 2000),
      _availability: availability.trim().slice(0, 1000),
    } as never);
    setBusy(false);
    const out = res as unknown as { success: boolean; error?: string } | null;
    if (error || !out?.success) {
      toast({ title: 'Could not submit', description: out?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Application sent' });
    setOpen(false);
    setWhy('');
    setResults('');
    setAvailability('');
    load();
  };

  if (!data || data.rungs.length === 0) return null;

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">The pathway</h2>
        {data.timeline_note && (
          <p className="text-[12px] text-muted-foreground">{data.timeline_note}</p>
        )}
      </div>

      <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {data.rungs.map((r, i) => {
          const passed = r.rung < data.my_rung;
          const current = r.rung === data.my_rung;
          return (
            <div key={r.id} className="flex shrink-0 items-center gap-2">
              <div
                className={cn(
                  'w-[190px] snap-start rounded-lg border p-3',
                  current
                    ? 'border-primary/40 bg-primary/[0.08]'
                    : passed
                      ? 'border-border/50 bg-surface'
                      : 'border-border/40 bg-surface/60 opacity-70'
                )}
              >
                <div className="flex items-center gap-1.5">
                  {passed && <Check className="h-3.5 w-3.5 text-primary" />}
                  <p className={cn('text-[13px] font-semibold', current ? 'text-primary' : 'text-foreground')}>
                    {r.title}
                  </p>
                </div>
                {r.description && (
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{r.description}</p>
                )}
                {current && <p className="mt-2 micro-label !text-primary">You are here</p>}
              </div>
              {i < data.rungs.length - 1 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {data.application?.status === 'pending' && (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Your request to run a {data.application.vertical} team is with the owner.
        </p>
      )}

      {data.application?.status === 'denied' && data.reapply_after && (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Your last request wasn't approved. You can apply again after{' '}
          {new Date(data.reapply_after).toLocaleDateString()}.
          {data.application.review_note ? ` Note: ${data.application.review_note}` : ''}
        </p>
      )}

      {data.can_apply && !open && (
        <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
          Run a team
        </Button>
      )}

      {open && (
        <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">Which industry</label>
            <Select value={vertical} onValueChange={setVertical}>
              <SelectTrigger className="h-9 max-w-[220px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {verticals.map((v) => (
                  <SelectItem key={v.vertical} value={v.vertical}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">Why you</label>
            <Textarea
              value={why}
              onChange={(e) => setWhy(e.target.value.slice(0, 2000))}
              placeholder="A few sentences"
              className="min-h-[80px]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">Prior results</label>
            <Textarea
              value={results}
              onChange={(e) => setResults(e.target.value.slice(0, 2000))}
              placeholder="Accounts, recruits, seasons"
              className="min-h-[70px]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground">Availability</label>
            <Input
              value={availability}
              onChange={(e) => setAvailability(e.target.value.slice(0, 1000))}
              placeholder="Dates you can be in market"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={submit}>Submit</Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default LadderStrip;
