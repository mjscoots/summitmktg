import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PayBand {
  min: number;
  max: number | null;
  rate: number;
}

export interface PublicPayScale {
  key: string;
  label: string;
  bands: PayBand[];
}

export interface CalcChip {
  vertical: string;
  value: number;
  label: string | null;
}

export interface PublicCalc {
  settings: Record<string, string>;
  chips: CalcChip[];
  pay_scale: PublicPayScale | null;
}

const EMPTY: PublicCalc = { settings: {}, chips: [], pay_scale: null };

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Public (anon-safe) calculator settings, preset chips, and the public pay scale. */
export function usePublicCalc() {
  const [calc, setCalc] = useState<PublicCalc | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).rpc('get_public_calc');
      if (!alive) return;
      setCalc({ ...EMPTY, ...((data as Partial<PublicCalc>) || {}) });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return calc;
}

export function chipsFor(calc: PublicCalc | null, vertical: string): CalcChip[] {
  return (calc?.chips ?? []).filter((c) => c.vertical.toLowerCase() === vertical.toLowerCase());
}

export function pestDefaults(calc: PublicCalc | null) {
  const s = calc?.settings ?? {};
  return {
    contractValue: num(s.calc_avg_contract_value, 1000),
    accountsPerWeek: Math.round(num(s.calc_default_accounts_per_week, 10)),
    weeks: Math.round(num(s.calc_default_weeks, 20)),
    minWeeks: Math.round(num(s.calc_min_weeks, 18)),
    maxWeeks: Math.round(num(s.calc_max_weeks, 30)),
    reductionPct: Number.isFinite(Number(s.calc_active_reduction_pct))
      ? Number(s.calc_active_reduction_pct)
      : 25,
  };
}

export function fiberDefaults(calc: PublicCalc | null) {
  const s = calc?.settings ?? {};
  const rate = Number(s.public_fiber_starting_rate);
  return {
    weeks: Math.round(num(s.fiber_calc_default_weeks, 12)),
    minWeeks: Math.round(num(s.fiber_calc_min_weeks, 8)),
    maxWeeks: Math.round(num(s.fiber_calc_max_weeks, 26)),
    startingRate: Number.isFinite(rate) && rate > 0 ? rate : null,
  };
}
