import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
  event_kind: string;
  scope: string | null;
  description: string | null;
}

interface Item {
  key: string;
  tag: string;
  title: string;
  detail: string;
  to: string;
}

function utcDay(iso: string, withWeekday = false) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    month: 'short',
    day: 'numeric',
  });
}

function whenLine(ev: EventRow) {
  if (ev.end_date && ev.end_date.slice(0, 10) !== ev.event_date.slice(0, 10)) {
    return `${utcDay(ev.event_date, true)} to ${utcDay(ev.end_date)}`;
  }
  return new Date(ev.event_date).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Pulls the incentive sentence out of a card the manager can already read. */
function incentiveLine(text: string | null): string | null {
  if (!text) return null;
  const i = text.toUpperCase().indexOf('INCENTIVE');
  if (i < 0) return null;
  const rest = text.slice(i).split('\n')[0].trim();
  return rest.length > 4 ? rest : null;
}

/**
 * Pass 130 — Home opens with what is new, never a stat. Real items only, newest
 * first, every one tappable. Nothing to say means the strip is not there.
 */
export function UpdatesStrip({ isManagerTier }: { isManagerTier: boolean }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const [postRes, evRes] = await Promise.all([
        (supabase as any)
          .from('announcement_posts')
          .select('id, title, created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(1),
        (supabase as any)
          .from('calendar_events')
          .select('id, title, event_date, end_date, location, event_kind, scope, description')
          .gte('event_date', new Date(now - 21 * 86_400_000).toISOString())
          .lte('event_date', new Date(now + 120 * 86_400_000).toISOString())
          .order('event_date', { ascending: true }),
      ]);
      if (cancelled) return;

      const next: Item[] = [];

      const post = ((postRes.data as { id: string; title: string; created_at: string }[]) || [])[0];
      if (post && now - new Date(post.created_at).getTime() < 14 * 86_400_000) {
        next.push({ key: `post-${post.id}`, tag: 'Update', title: post.title, detail: 'Latest post', to: '/app/chat' });
      }

      const events = ((evRes.data as EventRow[]) || []).filter(
        (e) => new Date(e.end_date || e.event_date).getTime() >= now
      );

      const blitz = events.find((e) => e.event_kind === 'blitz');
      if (blitz) {
        next.push({
          key: `blitz-${blitz.id}`,
          tag: 'Blitz',
          title: blitz.title,
          detail: [whenLine(blitz), blitz.location].filter(Boolean).join(' · '),
          to: `/app/events#event-${blitz.id}`,
        });
      }

      const soon = events.find(
        (e) => e.id !== blitz?.id && new Date(e.event_date).getTime() <= now + 14 * 86_400_000
      );
      if (soon) {
        next.push({
          key: `soon-${soon.id}`,
          tag: 'Next up',
          title: soon.title,
          detail: [whenLine(soon), soon.location].filter(Boolean).join(' · '),
          to: `/app/events#event-${soon.id}`,
        });
      }

      if (isManagerTier) {
        for (const e of events) {
          if (e.scope !== 'managers') continue;
          const line = incentiveLine(e.description);
          if (!line) continue;
          next.push({
            key: `inc-${e.id}`,
            tag: 'Incentive',
            title: e.title,
            detail: line,
            to: `/app/events#event-${e.id}`,
          });
          break;
        }
      }

      setItems(next);
    })();
    return () => { cancelled = true; };
  }, [isManagerTier]);

  if (items.length === 0) return null;

  return (
    <section>
      <SectionEyebrow>Updates</SectionEyebrow>
      <div className="space-y-2">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => navigate(it.to)}
            className="card-ice flex min-h-14 w-full items-center gap-3 p-3 text-left"
          >
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                background: 'hsl(var(--workspace-accent) / 0.16)',
                color: 'hsl(var(--workspace-accent))',
              }}
            >
              {it.tag}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-foreground">{it.title}</span>
              {it.detail && (
                <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{it.detail}</span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  );
}

export default UpdatesStrip;
