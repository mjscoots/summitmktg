/**
 * Pass 221 - every public production line is built from live aggregates.
 *
 * The owner's sentences stay word for word; only the digits come from
 * get_public_counters. Nothing rounds up: "over" figures floor to the
 * threshold they clear, and the top rep line states the exact number.
 * A figure that is missing produces no line at all.
 */
import type { PublicCounters } from '@/hooks/usePublicRecruiting';

const money = (value: number) => `$${Math.floor(value).toLocaleString('en-US')}`;

/** Floors down to the nearest step, so a figure is never inflated. */
const floorTo = (value: number, step: number) => Math.floor(value / step) * step;

/** The one line that carries the first screen. Null when the count is absent. */
export function topRepsLine(counters: PublicCounters | null): string | null {
  const count = counters?.reps_over_100k;
  if (!count || count <= 0) return null;
  return `${count} Trinity reps each sold over $100,000 last summer.`;
}

/** The full set for the foot of the page, in the owner's words. */
export function proofLines(counters: PublicCounters | null): string[] {
  if (!counters) return [];
  const lines: string[] = [];

  if (counters.top_rep_revenue && counters.top_rep_revenue > 0) {
    lines.push(`A verified Trinity rep sold ${money(counters.top_rep_revenue)} in accounts last summer.`);
  }
  const over100k = topRepsLine(counters);
  if (over100k) lines.push(over100k);
  if (counters.reps_over_50k && counters.reps_over_50k > 0) {
    lines.push(`${counters.reps_over_50k} reps sold over $50,000.`);
  }
  if (counters.serviced_total && counters.serviced_total >= 1_000_000) {
    lines.push(`The team serviced over ${money(floorTo(counters.serviced_total, 1_000_000))} in accounts.`);
  }
  return lines;
}
