import { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Copy, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ScriptRow {
  id: string;
  title: string;
  body: string;
}

/** Opens the Re-sign call scripts one at a time. Managers and admins only. */
export default function ReSignScriptsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ScriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('scripts')
      .select('id, title, body')
      .eq('category', 'Re-sign')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error('Could not load scripts');
        setRows((data as ScriptRow[]) || []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const current = rows[index] || null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[520px]">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">Re-sign scripts</SheetTitle>
          <SheetDescription className="text-[12px]">
            Say it out loud. Confirm any number on the call.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !current ? (
          <p className="pt-8 text-[13px] text-muted-foreground">No re-sign scripts yet.</p>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                disabled={index === 0}
                aria-label="Previous script"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 bg-surface text-muted-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-[12px] tabular-nums text-muted-foreground">
                {index + 1} of {rows.length}
              </p>
              <button
                onClick={() => setIndex((i) => Math.min(i + 1, rows.length - 1))}
                disabled={index >= rows.length - 1}
                aria-label="Next script"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border/60 bg-surface text-muted-foreground disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 rounded-[var(--radius)] border border-border/60 bg-surface p-4">
              <p className="text-[14px] font-semibold text-foreground">{current.title}</p>
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                {current.body}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(current.body || '');
                  toast.success('Script copied');
                }}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-3 text-[12px] font-medium text-foreground"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {rows.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'min-h-11 rounded-lg border px-2.5 text-left text-[11px] font-medium',
                    i === index
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/60 bg-surface text-muted-foreground'
                  )}
                >
                  {r.title}
                </button>
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function ScriptsButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-3 text-[13px] font-semibold text-foreground',
        className
      )}
    >
      <BookOpen className="h-3.5 w-3.5" /> Scripts
    </button>
  );
}
