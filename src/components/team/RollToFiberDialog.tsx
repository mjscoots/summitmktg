import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { defaultStartDate, formatStart } from '@/lib/rollover';
import type { FiberCarrier, RollCandidate } from '@/hooks/useRollover';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reps: RollCandidate[];
  carriers: FiberCarrier[];
  seasonEnd: string | null;
  /** Pre-selected rep, for the per-row shortcut. */
  preselect?: string | null;
  onDone?: () => void;
}

/** Manager bulk rollover: pick reps, pick a start date, confirm the names. */
export function RollToFiberDialog({
  open,
  onOpenChange,
  reps,
  carriers,
  seasonEnd,
  preselect,
  onDone,
}: Props) {
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const [startDate, setStartDate] = useState(() => defaultStartDate(seasonEnd));
  const [carrierId, setCarrierId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reps.filter((r) => !q || (r.full_name || '').toLowerCase().includes(q));
  }, [reps, search]);

  const names = selected
    .map((id) => reps.find((r) => r.user_id === id)?.full_name || 'Unnamed')
    .sort((a, b) => a.localeCompare(b));

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async () => {
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('roll_reps_to_fiber', {
      _rep_ids: selected,
      _start_date: startDate,
      _carrier_id: carrierId || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || 'Could not roll these reps over');
      return;
    }
    toast.success(`${data ?? selected.length} rolled into Fiber`);
    setSelected([]);
    setConfirming(false);
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Roll into Fiber</DialogTitle>
        </DialogHeader>

        {confirming ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {names.length} {names.length === 1 ? 'rep' : 'reps'} start fiber on {formatStart(startDate)}.
              Their pest workspace stays as it is.
            </p>
            <ul className="max-h-56 space-y-1 overflow-y-auto text-sm text-foreground">
              {names.map((n) => (
                <li key={n} className="truncate">
                  {n}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="min-h-11 flex-1"
                onClick={() => setConfirming(false)}
                disabled={saving}
              >
                Back
              </Button>
              <Button className="min-h-11 flex-1" onClick={submit} disabled={saving}>
                {saving ? 'Rolling over…' : 'Confirm'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Start date</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-h-11"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Carrier (optional)</span>
                <select
                  value={carrierId}
                  onChange={(e) => setCarrierId(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                >
                  <option value="">Not set</option>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reps"
              className="min-h-11"
            />

            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {list.map((r) => (
                <li key={r.user_id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2">
                    <Checkbox
                      checked={selected.includes(r.user_id)}
                      onCheckedChange={() => toggle(r.user_id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {r.full_name || 'Unnamed'}
                    </span>
                    {r.hasFiber && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {r.fiberStart ? `Starts ${r.fiberStart}` : 'In Fiber'}
                      </span>
                    )}
                  </label>
                </li>
              ))}
              {list.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">No reps to show.</li>
              )}
            </ul>

            <Button
              className="min-h-11 w-full"
              disabled={selected.length === 0 || !startDate}
              onClick={() => setConfirming(true)}
            >
              Review {selected.length || ''} {selected.length === 1 ? 'rep' : 'reps'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RollToFiberDialog;
