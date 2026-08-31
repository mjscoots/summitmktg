import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { verticalFilter } from '@/lib/workspaceScope';

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
  /** Announcement rows carry an acknowledgement id. */
  postId?: string;
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
  const { activeVertical } = useWorkspace();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [acking, setAcking] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const [postRes, ackRes, evRes] = await Promise.all([
        (supabase as any)
          .from('announcement_posts')
          .select('id, title, body, created_at, expires_at')
          .eq('status', 'published')
          .or(verticalFilter(activeVertical))
          .order('created_at', { ascending: false })
          .limit(6),
        (supabase as any).from('announcement_acks').select('post_id'),
        (supabase as any)
          .from('calendar_events')
          .select('id, title, event_date, end_date, location, event_kind, scope, description')
          .or(verticalFilter(activeVertical))
          .gte('event_date', new Date(now - 21 * 86_400_000).toISOString())
          .lte('event_date', new Date(now + 120 * 86_400_000).toISOString())
          .order('event_date', { ascending: true }),
      ]);
      if (cancelled) return;

      const next: Item[] = [];

      const acked = new Set(((ackRes.data as { post_id: string }[]) || []).map((a) => a.post_id));
      const posts = ((postRes.data as
        { id: string; title: string; body: string | null; created_at: string; expires_at: string | null }[]) || [])
        .filter((p) => !p.expires_at || p.expires_at > nowIso)
        .filter((p) => !acked.has(p.id))
        .slice(0, 3);

      for (const post of posts) {
        next.push({
          key: `post-${post.id}`,
          tag: 'Update',
          title: post.title,
          detail: (post.body || '').split('\n')[0].slice(0, 120),
          to: '/app/chat',
          postId: post.id,
        });
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
  }, [isManagerTier, activeVertical]);

  if (items.length === 0) return null;

  const ack = async (postId: string, key: string) => {
    setAcking(key);
    await (supabase.rpc as any)('ack_announcement', { _post_id: postId });
    setItems((prev) => prev.filter((i) => i.key !== key));
    setAcking(null);
  };

  return (
    <section>
      <SectionEyebrow>Updates</SectionEyebrow>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.key} className="card-ice flex min-h-14 w-full items-center gap-2 p-3">
            <button
              type="button"
              onClick={() => navigate(it.to)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
            </button>
            {it.postId ? (
              <button
                type="button"
                disabled={acking === it.key}
                onClick={() => ack(it.postId!, it.key)}
                className="min-h-11 shrink-0 rounded-xl border border-border/40 px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60"
              >
                Got it
              </button>
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </section>

  );
}

export default UpdatesStrip;
