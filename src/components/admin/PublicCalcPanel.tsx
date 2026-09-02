import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

interface ChipRow {
  id: string;
  vertical: string;
  value: number;
  label: string | null;
  display_order: number;
  is_active: boolean;
}
interface BandRow {
  id: string;
  min_revenue: number;
  max_revenue: number | null;
  rate: number;
  display_order: number;
}
interface ScaleRow {
  id: string;
  key: string;
  label: string;
}

/** Owner/admin controls for the public calculator: preset chips and the public pay scale. */
export default function PublicCalcPanel() {
  const [loading, setLoading] = useState(true);
  const [chips, setChips] = useState<ChipRow[]>([]);
  const [scale, setScale] = useState<ScaleRow | null>(null);
  const [bands, setBands] = useState<BandRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      (supabase as any).from('public_calc_chips').select('*').order('vertical').order('display_order'),
      (supabase as any).from('public_pay_scales').select('*').eq('key', 'rookie_2027').maybeSingle(),
    ]);
    setChips((c.data as ChipRow[]) || []);
    const sc = (s.data as ScaleRow) || null;
    setScale(sc);
    if (sc) {
      const { data: b } = await (supabase as any)
        .from('public_pay_bands')
        .select('*')
        .eq('scale_id', sc.id)
        .order('display_order');
      setBands((b as BandRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchChip = async (id: string, patch: Partial<ChipRow>) => {
    const { error } = await (supabase as any).from('public_calc_chips').update(patch).eq('id', id);
    if (error) toast.error('Could not save');
  };

  const addChip = async (vertical: string) => {
    const { error } = await (supabase as any)
      .from('public_calc_chips')
      .insert({ vertical, value: 5, display_order: chips.filter((c) => c.vertical === vertical).length + 1 });
    if (error) return toast.error('Could not add');
    load();
  };

  const deleteChip = async (id: string) => {
    const { error } = await (supabase as any).from('public_calc_chips').delete().eq('id', id);
    if (error) return toast.error('Could not delete');
    load();
  };

  const patchBand = async (id: string, patch: Partial<BandRow>) => {
    const { error } = await (supabase as any).from('public_pay_bands').update(patch).eq('id', id);
    if (error) toast.error('Could not save');
  };

  const saveScaleLabel = async (label: string) => {
    if (!scale) return;
    const { error } = await (supabase as any).from('public_pay_scales').update({ label }).eq('id', scale.id);
    if (error) toast.error('Could not save');
  };

  if (loading) {
    return (
      <div className={`${CARD} p-5 text-xs text-muted-foreground`}>
        <Loader2 className="inline w-3.5 h-3.5 animate-spin mr-2" /> Loading calculator settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chips */}
      {['Pest', 'Fiber'].map((v) => (
        <div key={v} className={`${CARD} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {v} calculator presets
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {v === 'Pest' ? 'Accounts' : 'Installs'} per week. Labels are optional - blank shows the plain number.
              </p>
            </div>
            <button
              onClick={() => addChip(v)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {chips
              .filter((c) => c.vertical === v)
              .map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Input
                    type="number"
                    defaultValue={c.value}
                    onBlur={(e) => patchChip(c.id, { value: Number(e.target.value) })}
                    className="h-9 w-24 text-xs"
                    aria-label="Value"
                  />
                  <Input
                    defaultValue={c.label || ''}
                    placeholder="Label (optional)"
                    onBlur={(e) => patchChip(c.id, { label: e.target.value.trim() || null })}
                    className="h-9 flex-1 text-xs"
                    aria-label="Label"
                  />
                  <button
                    onClick={() => deleteChip(c.id)}
                    className="rounded-lg border border-border p-2 text-muted-foreground hover:text-destructive"
                    aria-label="Remove preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* Public pay scale */}
      {scale && (
        <div className={`${CARD} p-5`}>
          <h3 className="text-sm font-bold text-foreground mb-1">Public pay scale</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Public calculator only - the in-app season pay scales are separate. The tier reached pays on all
            season active revenue.
          </p>
          <label className="micro-label mb-1 block">Label shown on the calculator</label>
          <Input
            defaultValue={scale.label}
            onBlur={(e) => saveScaleLabel(e.target.value)}
            className="h-9 text-xs mb-3"
          />
          <div className="space-y-2">
            {bands.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <Input
                  type="number"
                  defaultValue={b.min_revenue}
                  onBlur={(e) => patchBand(b.id, { min_revenue: Number(e.target.value) })}
                  className="h-9 flex-1 text-xs"
                  aria-label="Band minimum"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="number"
                  defaultValue={b.max_revenue ?? ''}
                  placeholder="No cap"
                  onBlur={(e) =>
                    patchBand(b.id, { max_revenue: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  className="h-9 flex-1 text-xs"
                  aria-label="Band maximum"
                />
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={b.rate}
                  onBlur={(e) => patchBand(b.id, { rate: Number(e.target.value) })}
                  className="h-9 w-24 text-xs"
                  aria-label="Rate as a decimal"
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Rate is a decimal - 0.28 is 28%.</p>
        </div>
      )}
    </div>
  );
}
