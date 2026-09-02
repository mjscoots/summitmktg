import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pass 153 - the three doors on the public front.
 *
 * Structure, status and accent come from the industries catalog (name,
 * short_name, slug, status, theme only). The lines below are the same plain
 * descriptions the public industry content already uses. No money, no counts.
 */
const LINES: Record<string, string> = {
  pest: 'Door to door pest control. The summer product. You close, you get paid on what you close.',
  fiber: 'Door to door fiber internet. The winter product. Paid per install.',
  life: 'Life insurance. The career product for reps who want off the doors. Requires a state license to sell.',
};

const APPLY_VERTICAL: Record<string, string> = { pest: 'Pest', fiber: 'Fiber', life: 'Life' };

interface Door {
  name: string;
  short_name: string | null;
  slug: string;
  status: string | null;
  theme: { accent?: string } | null;
}

export default function ThreeDoorSection() {
  const [doors, setDoors] = useState<Door[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('verticals')
        .select('name, short_name, slug, status, theme');
      if (!alive || !data) return;
      const order = ['pest', 'fiber', 'life'];
      const rows = (data as unknown as Door[])
        .filter((d) => order.includes(d.slug))
        .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
      setDoors(rows);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (doors.length === 0) return null;

  return (
    <section className="border-b border-border/70 px-5 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="micro-label text-primary">Three doors</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Pick where you want to sell
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {doors.map((d) => {
            const accent = d.theme?.accent ? `hsl(${d.theme.accent})` : 'hsl(var(--primary))';
            const comingSoon = d.status === 'coming_soon';
            return (
              <article
                key={d.slug}
                className="flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6"
                style={{ borderTopColor: accent, borderTopWidth: 2 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/industries/${d.slug}`}
                    className="inline-flex min-h-11 items-center text-lg font-extrabold text-foreground hover:underline"
                  >
                    {d.name}
                  </Link>
                  {comingSoon && (
                    <span className="micro-label rounded border border-border px-2 py-1 text-text-muted">
                      Coming soon
                    </span>
                  )}
                </div>

                <p className="mt-2 flex-1 text-sm text-text-secondary">{LINES[d.slug]}</p>

                <Link
                  to={`/apply/rookie?vertical=${APPLY_VERTICAL[d.slug]}`}
                  className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
                  style={{ border: `1px solid ${accent}` }}
                >
                  {comingSoon ? 'Tell me when' : 'Apply'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
