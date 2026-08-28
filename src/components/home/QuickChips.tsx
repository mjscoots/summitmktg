import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface QuickChip {
  label: string;
  to?: string;
  onClick?: () => void;
  badge?: number;
}

/** One horizontal row of 44px pill actions under the hero. */
export function QuickChips({ chips, className }: { chips: QuickChip[]; className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1', className)}>
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => (c.onClick ? c.onClick() : c.to ? navigate(c.to) : undefined)}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] font-semibold text-foreground"
        >
          {c.label}
          {c.badge && c.badge > 0 ? (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] tabular-nums"
              style={{
                background: 'hsl(var(--workspace-accent) / 0.16)',
                color: 'hsl(var(--workspace-accent))',
              }}
            >
              {c.badge > 99 ? '99+' : c.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export default QuickChips;
