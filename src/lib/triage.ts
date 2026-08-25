/**
 * Rep triage buckets — shared by the live board on the Team page and the
 * Rep Triage section of the Weekly Manager Meeting form so both speak the
 * same language.
 */
export type TriageBucket = 'cut' | 'watch' | 'help' | 'promote';

export const TRIAGE_BUCKETS: TriageBucket[] = ['promote', 'help', 'watch', 'cut'];

export const TRIAGE_META: Record<
  TriageBucket,
  { label: string; chip: string; column: string; bar: string }
> = {
  promote: {
    label: 'Promote/Spotlight',
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    column: 'border-emerald-500/25',
    bar: 'bg-emerald-500',
  },
  help: {
    label: 'Needs Help',
    chip: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    column: 'border-blue-500/25',
    bar: 'bg-blue-500',
  },
  watch: {
    label: 'Watch',
    chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    column: 'border-amber-500/25',
    bar: 'bg-amber-500',
  },
  cut: {
    label: 'Cut',
    chip: 'bg-red-500/15 text-red-300 border-red-500/30',
    column: 'border-red-500/25',
    bar: 'bg-red-500',
  },
};
