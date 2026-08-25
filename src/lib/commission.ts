/**
 * Commission pay scales — single source of truth.
 * These are the same brackets used by the public earnings calculators
 * (EarningsCalculator, VetCalculator) and the rep-facing My Money page.
 * Rates are a percentage of ACTIVE serviced revenue.
 */

export type PayScale = 'rookie' | 'veteran' | 'marketing';

export interface Tier {
  min: number;
  max: number;
  rate: number;
}

export const ROOKIE_TIERS: Tier[] = [
  { min: 0, max: 69999, rate: 0.18 },
  { min: 70000, max: 99999, rate: 0.22 },
  { min: 100000, max: 149999, rate: 0.25 },
  { min: 150000, max: 199999, rate: 0.35 },
  { min: 200000, max: 249999, rate: 0.40 },
  { min: 250000, max: 299999, rate: 0.45 },
  { min: 300000, max: 399999, rate: 0.50 },
  { min: 400000, max: Infinity, rate: 0.55 },
];

export const VETERAN_TIERS: Tier[] = [
  { min: 0, max: 199999, rate: 0.40 },
  { min: 200000, max: 249999, rate: 0.50 },
  { min: 250000, max: 299999, rate: 0.55 },
  { min: 300000, max: 399999, rate: 0.60 },
  { min: 400000, max: 499999, rate: 0.65 },
  { min: 500000, max: Infinity, rate: 0.70 },
];

export const MARKETING_TIERS: Tier[] = [
  { min: 0, max: 249999, rate: 0.45 },
  { min: 250000, max: 499999, rate: 0.50 },
  { min: 500000, max: 1249999, rate: 0.55 },
  { min: 1250000, max: 2499999, rate: 0.60 },
  { min: 2500000, max: 3749999, rate: 0.65 },
  { min: 3750000, max: 4999999, rate: 0.675 },
  { min: 5000000, max: 7499999, rate: 0.70 },
  { min: 7500000, max: 9999999, rate: 0.72 },
  { min: 10000000, max: 12499999, rate: 0.74 },
  { min: 12500000, max: 14999999, rate: 0.76 },
  { min: 15000000, max: 19999999, rate: 0.78 },
  { min: 20000000, max: Infinity, rate: 0.80 },
];

export const PAY_SCALE_LABELS: Record<PayScale, string> = {
  rookie: 'Rookie',
  veteran: 'Veteran',
  marketing: 'Marketing deal',
};

export function getTiers(scale: PayScale): Tier[] {
  if (scale === 'veteran') return VETERAN_TIERS;
  if (scale === 'marketing') return MARKETING_TIERS;
  return ROOKIE_TIERS;
}

export function getTier(scale: PayScale, revenue: number): Tier {
  const tiers = getTiers(scale);
  return tiers.find(t => revenue >= t.min && revenue <= t.max) ?? tiers[0];
}

export function getRate(scale: PayScale, revenue: number): number {
  return getTier(scale, revenue).rate;
}

export function getNextTier(scale: PayScale, revenue: number): Tier | null {
  const tiers = getTiers(scale);
  const current = getTier(scale, revenue);
  const index = tiers.indexOf(current);
  return index >= 0 && index < tiers.length - 1 ? tiers[index + 1] : null;
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
  if (tier.max === Infinity) return `${formatCurrency(tier.min)}+`;
  return `${formatCurrency(tier.min)} – ${formatCurrency(tier.max)}`;
}
