import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PayScale, getTier } from '@/lib/commission';

export interface MoneySummaryRaw {
  user_id: string;
  pest: {
    pay_scale: string | null;
    signs: number | null;
    avg_account_value: number | null;
    active_revenue: number | null;
    rate_override: number | null;
    logged_sales: number | null;
  };
  fiber: {
    carrier: string | null;
    installs: number | null;
    cancels: number | null;
    per_install: number | null;
    holdback_percent: number | null;
  };
  months: { month: string; pest_revenue: number | null; fiber_installs: number | null }[];
  events: {
    at: string | null;
    vertical: string;
    kind: 'sale' | 'install' | 'housing';
    description: string;
    amount: number | null;
    detail: string | null;
  }[];
}

export interface VerticalLine {
  vertical: 'Pest' | 'Fiber' | 'Life';
  label: string;
  amount: number;
  /** True when no rate is set, so the amount counts as zero. */
  rateMissing: boolean;
  driver: string;
  note?: string;
}

export interface MoneySummary {
  raw: MoneySummaryRaw;
  total: number;
  lines: VerticalLine[];
  months: { month: string; pest: number; fiber: number }[];
}

/** Pest earnings use the existing commission calculation, unchanged. */
function pestEarnings(pest: MoneySummaryRaw['pest']) {
  const scale = (['rookie', 'veteran', 'marketing'].includes(pest.pay_scale ?? '')
    ? pest.pay_scale
    : 'rookie') as PayScale;
  const signs = pest.signs ?? 0;
  const avg = pest.avg_account_value !== null ? Number(pest.avg_account_value) : null;
  const revenue =
    pest.active_revenue !== null ? Number(pest.active_revenue) : avg !== null ? signs * avg : null;
  if (revenue === null) return { amount: 0, rateMissing: true, revenue: null, signs };
  const rate = pest.rate_override !== null ? Number(pest.rate_override) : getTier(scale, revenue).rate;
  return { amount: revenue * rate, rateMissing: false, revenue, signs, rate };
}

/** Fiber earnings: installs x per-install pay, less the holdback. Existing rule. */
function fiberEarnings(fiber: MoneySummaryRaw['fiber']) {
  const installs = Number(fiber.installs ?? 0);
  const per = fiber.per_install !== null ? Number(fiber.per_install) : null;
  if (per === null) return { amount: 0, rateMissing: true, installs };
  const hold = fiber.holdback_percent !== null ? Number(fiber.holdback_percent) : 0;
  return { amount: installs * per * (1 - hold / 100), rateMissing: false, installs };
}

export function useMoneySummary(targetUserId?: string | null) {
  const [data, setData] = useState<MoneySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data: res } = await (supabase as any).rpc('get_my_money_summary', {
        _target: targetUserId ?? null,
      });
      if (!active) return;
      const raw = res as MoneySummaryRaw | null;
      if (!raw) {
        setData(null);
        setLoading(false);
        return;
      }
      const p = pestEarnings(raw.pest);
      const f = fiberEarnings(raw.fiber);
      const lines: VerticalLine[] = [
        {
          vertical: 'Pest',
          label: 'Pest control',
          amount: p.amount,
          rateMissing: p.rateMissing,
          driver:
            p.revenue !== null
              ? `${p.signs} ${p.signs === 1 ? 'account' : 'accounts'}`
              : 'No revenue entered',
          note: p.rateMissing ? 'Not set' : undefined,
        },
        {
          vertical: 'Fiber',
          label: 'Fiber internet',
          amount: f.amount,
          rateMissing: f.rateMissing,
          driver: `${f.installs} ${f.installs === 1 ? 'install' : 'installs'}`,
          note: f.rateMissing ? 'Rate not set' : undefined,
        },
        {
          vertical: 'Life',
          label: 'Life insurance',
          amount: 0,
          rateMissing: true,
          driver: '—',
          note: 'Not open yet',
        },
      ];
      setData({
        raw,
        total: lines.reduce((s, l) => s + l.amount, 0),
        lines,
        months: (raw.months ?? []).map((m) => ({
          month: m.month,
          // Estimated earnings per month, from the same rate and per-install pay.
          pest: p.rate ? Number(m.pest_revenue ?? 0) * p.rate : 0,
          fiber: f.rateMissing
            ? 0
            : Number(m.fiber_installs ?? 0) *
              Number(raw.fiber.per_install) *
              (1 - Number(raw.fiber.holdback_percent ?? 0) / 100),
        })),

      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  return { data, loading };
}
