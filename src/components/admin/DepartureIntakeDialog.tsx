import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export const DEPARTURE_TYPES = [
  { key: 'quit', label: 'Quit' },
  { key: 'fired', label: 'Fired' },
  { key: 'home_early', label: 'Went home early' },
  { key: 'unknown', label: 'Unknown' },
] as const;

export function departureLabel(value: string | null | undefined): string {
  if (!value) return '';
  return DEPARTURE_TYPES.find(t => t.key === value)?.label || value;
}

export interface DepartureTarget {
  user_id: string;
  full_name: string;
  departure_type?: string | null;
  departure_reason?: string | null;
  last_day_worked?: string | null;
  revenue_to_date?: number | null;
}

interface Props {
  target: DepartureTarget | null;
  onClose: () => void;
  /** Called after a successful save with the values written. */
  onSaved?: (values: {
    user_id: string;
    departure_type: string;
    departure_reason: string | null;
    last_day_worked: string | null;
    revenue_to_date: number | null;
  }) => void;
}

/**
 * Departure intake. Never blocks: Unknown is preselected and Save works with
 * nothing else filled in, so archiving stays one tap.
 */
export function DepartureIntakeDialog({ target, onClose, onSaved }: Props) {
  const [type, setType] = useState<string>('unknown');
  const [reason, setReason] = useState('');
  const [lastDay, setLastDay] = useState('');
  const [revenue, setRevenue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setType(target.departure_type || 'unknown');
    setReason(target.departure_reason || '');
    setLastDay(target.last_day_worked || '');
    setRevenue(target.revenue_to_date != null ? String(target.revenue_to_date) : '');
    setSaving(false);
  }, [target]);

  const save = async () => {
    if (!target) return;
    setSaving(true);
    const revenueNum = revenue.trim() === '' ? null : Number(revenue.replace(/[^0-9.-]/g, ''));
    const payload = {
      user_id: target.user_id,
      departure_type: type || 'unknown',
      departure_reason: reason.trim() || null,
      last_day_worked: lastDay || null,
      revenue_to_date: revenueNum != null && isFinite(revenueNum) ? revenueNum : null,
    };

    const { error } = await (supabase as any).rpc('record_departure', {
      _user_id: payload.user_id,
      _departure_type: payload.departure_type,
      _reason: payload.departure_reason,
      _last_day: payload.last_day_worked,
      _revenue: payload.revenue_to_date,
    });
    setSaving(false);

    if (error) {
      console.error(error);
      toast.error('Could not save departure details');
      return;
    }

    toast.success(`${target.full_name} recorded as departed`);
    onSaved?.(payload);
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Departure details</DialogTitle>
          <DialogDescription>
            {target?.full_name}. Unknown is fine — you can add the rest later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Departure type</Label>
            <div className="grid grid-cols-2 gap-2">
              {DEPARTURE_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    type === t.key
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-white/[0.08] bg-muted/30 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="departure-reason" className="text-xs uppercase tracking-wider text-muted-foreground">
              Reason (one line)
            </Label>
            <Input
              id="departure-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Optional"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="departure-lastday" className="text-xs uppercase tracking-wider text-muted-foreground">
                Last day worked
              </Label>
              <Input
                id="departure-lastday"
                type="date"
                value={lastDay}
                onChange={e => setLastDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departure-revenue" className="text-xs uppercase tracking-wider text-muted-foreground">
                Revenue to date
              </Label>
              <Input
                id="departure-revenue"
                inputMode="decimal"
                value={revenue}
                onChange={e => setRevenue(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DepartureIntakeDialog;
