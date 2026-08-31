import { useWorkspace } from '@/contexts/WorkspaceContext';

export const ALL_SUMMIT = 'all';

/** Turn the picker value into the database column value. */
export function audienceToVertical(value: string): string | null {
  return value === ALL_SUMMIT ? null : value;
}

/** Turn a stored column value into the picker value. */
export function verticalToAudience(vertical: string | null | undefined): string {
  return vertical || ALL_SUMMIT;
}

const CHOICES = ['Pest', 'Fiber', 'Life'];

/**
 * Pass 144 — every piece of content says who it is for. One industry, or
 * All Summit, which shows in every workspace.
 */
export function AudienceSelect({
  value,
  onChange,
  label = 'Audience',
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const { activeVertical } = useWorkspace();
  const choices = Array.from(new Set([activeVertical || 'Pest', ...CHOICES]));

  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-foreground" htmlFor="audience-select">
        {label}
      </label>
      <select
        id="audience-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded-[var(--radius)] border border-border bg-card px-3 text-[14px] text-foreground"
      >
        {choices.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
        <option value={ALL_SUMMIT}>All Summit</option>
      </select>
    </div>
  );
}

export default AudienceSelect;
