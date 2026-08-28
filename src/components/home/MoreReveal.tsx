import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Pass 95 — Air. Everything that is not one of the few things a rep needs
 * above the fold folds in here. Collapsed by default, one 44px row.
 */
export function MoreReveal({
  label = 'More',
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-card px-4 text-left text-[15px] font-semibold text-foreground"
      >
        {label}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && <div className="mt-4 space-y-4">{children}</div>}
    </section>
  );
}

export default MoreReveal;
