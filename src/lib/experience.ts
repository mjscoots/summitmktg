/**
 * Experience tiers (Pass 151).
 *
 * profiles.years_in_industry is the count of years a person has worked in the
 * industry. The label and the star count are both derived from that one number,
 * so chat, profile and roster always agree.
 */

/** Tier wording. Fourth year and up is Veteran. */
export function experienceLabel(years: number | null | undefined): string | null {
  if (years == null || !Number.isFinite(years) || years < 1) return null;
  if (years === 1) return 'First year';
  if (years === 2) return 'Second year';
  if (years === 3) return 'Third year';
  return 'Veteran';
}

/** Half a star per year, capped at four stars. */
export function experienceStars(years: number | null | undefined): number {
  if (years == null || !Number.isFinite(years) || years < 1) return 0;
  return Math.min(4, years * 0.5);
}
