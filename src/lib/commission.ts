/**
 * Commission helpers.
 *
 * There are no pay tables in this file. Every rate a person sees comes from
 * confirmed rank_stacks rows read through my_comp_ladder() (see
 * src/hooks/useCompLadder.ts) or from a rate a Pillar set by hand.
 */

export type PayScale = 'rookie' | 'veteran' | 'marketing';

export interface Tier {
  min: number;
  max: number;
  rate: number;
  label?: string;
}

export const PAY_SCALE_LABELS: Record<PayScale, string> = {
  rookie: 'Rookie',
  veteran: 'Veteran',
  marketing: 'Marketing deal',
};

/** Shown wherever a rate is missing. */
export const NOT_CONFIRMED = 'Your pay scale is not confirmed yet. Ask your Pillar.';

/** The bracket a revenue figure lands in, for a ladder read from the database. */
export function tierFor(tiers: Tier[], revenue: number): Tier | null {
  return tiers.find((t) => revenue >= t.min && revenue <= t.max) ?? null;
}

/** The bracket above the current one, for a ladder read from the database. */
export function nextTierFor(tiers: Tier[], revenue: number): Tier | null {
  const current = tierFor(tiers, revenue);
  if (!current) return null;
  const index = tiers.indexOf(current);
  return index >= 0 && index < tiers.length - 1 ? tiers[index + 1] : null;
}

/** The rate for a revenue figure, or null when the ladder is empty. */
export function rateFor(tiers: Tier[], revenue: number): number | null {
  return tierFor(tiers, revenue)?.rate ?? null;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatRate(rate: number): string {
  const pct = rate * 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

export function formatTierRange(tier: Tier): string {
  if (tier.label) return tier.label;
  if (!Number.isFinite(tier.max)) return `${formatCurrency(tier.min)}+`;
  return `${formatCurrency(tier.min)} to ${formatCurrency(tier.max)}`;
}
