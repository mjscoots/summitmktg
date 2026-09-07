import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The fold under the one number: everything else a home used to open with. */
export function MoreOnYourWeek({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 text-left"
      >
        <span className="flex-1 text-[13px] font-semibold text-foreground">More on your week</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-3 space-y-4">{children}</div>}
    </section>
  );
}

export default MoreOnYourWeek;
