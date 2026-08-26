import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { celebrate } from '@/lib/celebrate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PricingRow {
  id: string;
  title: string;
  market: string | null;
  meta: {
    plan?: string;
    initial?: string | number;
    recurring?: string | number;
    frequency?: string;
    notes?: string;
  } | null;
}

const num = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? String(n) : '';
};

/**
 * Records one self-reported Pest sale. Plans come from the playbook pricing
 * rows; the amounts prefill from the chosen row and stay editable.
 */
export function LogSaleSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PricingRow[]>([]);
  const [planId, setPlanId] = useState('');
  const [plan, setPlan] = useState('');
  const [initial, setInitial] = useState('');
  const [recurring, setRecurring] = useState('');
  const [frequency, setFrequency] = useState('');
  const [customer, setCustomer] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDup, setConfirmDup] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDup(false);
    (async () => {
      const { data } = await (supabase as any)
        .from('playbook_entries')
        .select('id, title, market, meta')
        .eq('kind', 'pricing')
        .eq('vertical', 'Pest')
        .eq('published', true)
        .order('sort_order');
      setPlans((data as PricingRow[]) || []);
    })();
  }, [open]);

  const market = useMemo(() => plans.find((p) => p.market)?.market || '', [plans]);

  function pickPlan(id: string) {
    setPlanId(id);
    const row = plans.find((p) => p.id === id);
    if (!row) return;
    setPlan(row.meta?.plan || row.title);
    setInitial(num(row.meta?.initial));
    setRecurring(num(row.meta?.recurring));
    setFrequency(row.meta?.frequency || '');
  }

  async function save() {
    if (!user) return;
    if (!plan.trim()) {
      toast.error('Pick a plan first.');
      return;
    }
    setBusy(true);

    if (!confirmDup && customer.trim()) {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: dup } = await (supabase as any)
        .from('sales_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('customer_first', customer.trim())
        .eq('city', city.trim())
        .gte('sold_at', since)
        .limit(1);
      if (((dup as unknown[]) || []).length > 0) {
        setBusy(false);
        setConfirmDup(true);
        return;
      }
    }

    const { error } = await (supabase as any).from('sales_log').insert({
      user_id: user.id,
      vertical: 'Pest',
      plan: plan.trim(),
      initial: initial ? Number(initial) : null,
      recurring: recurring ? Number(recurring) : null,
      frequency: frequency.trim() || null,
      customer_first: customer.trim() || null,
      city: city.trim() || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error('That did not save. Try again.');
      return;
    }
    setCustomer('');
    setNotes('');
    setConfirmDup(false);
    onOpenChange(false);
    onSaved?.();
    toast.success('Sale logged');
    celebrate('sale');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log a sale</DialogTitle>
          <DialogDescription>
            Self-reported. Reconciled against the monthly import.
            {market ? ` Market: ${market}.` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={pickPlan}>
              <SelectTrigger className="min-h-11">
                <SelectValue placeholder="Pick a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.meta?.plan || p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sale-initial">Initial</Label>
              <Input
                id="sale-initial"
                inputMode="decimal"
                value={initial}
                onChange={(e) => setInitial(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-recurring">Recurring</Label>
              <Input
                id="sale-recurring"
                inputMode="decimal"
                value={recurring}
                onChange={(e) => setRecurring(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-frequency">Frequency</Label>
            <Input
              id="sale-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sale-customer">Customer first name</Label>
              <Input id="sale-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sale-city">City</Label>
              <Input id="sale-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-notes">Note</Label>
            <Textarea
              id="sale-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {confirmDup && (
            <p className="text-[13px] text-foreground">Already logged — log again?</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="min-h-11" onClick={save} disabled={busy}>
            {confirmDup ? 'Log again' : 'Save sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LogSaleSheet;
