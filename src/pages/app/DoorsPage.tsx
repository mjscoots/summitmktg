import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogSaleSheet } from '@/components/sales/LogSaleSheet';
import { cn } from '@/lib/utils';

/** Doors mode content. Everything here comes from the playbook and script cards. */
interface Entry {
  id: string;
  kind: string;
  title: string;
  body: string;
  followup: string | null;
  sort_order: number;
  market: string | null;
  meta: Record<string, string> | null;
}

interface ScriptRow {
  id: string;
  title: string;
  category: string;
  body: string;
}

interface DoorsContent {
  entries: Entry[];
  scripts: ScriptRow[];
  bugSheet: string | null;
}

const CACHE_KEY = 'summit-doors-cache-v1';

const SEGMENTS = [
  { key: 'script', label: 'Script' },
  { key: 'objections', label: 'Objections' },
  { key: 'closes', label: 'Closes' },
  { key: 'bugs', label: 'Bug sheet' },
  { key: 'pricing', label: 'Pricing' },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]['key'];

const DOORS = [
  { key: 'fresh', label: 'Fresh account' },
  { key: 'switchover', label: 'Switchover' },
  { key: 'diy', label: 'DIY' },
] as const;

type DoorKey = (typeof DOORS)[number]['key'];

/** Oversized field card. 18px body minimum, hairline border, no decoration. */
function FieldCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-border bg-card p-4', className)}>{children}</div>;
}

function ScriptBlock({ title, note, body }: { title: string; note?: string; body: string }) {
  return (
    <FieldCard>
      <p className="font-display text-[19px] font-extrabold leading-tight text-foreground">{title}</p>
      {note && <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{note}</p>}
      {body && (
        <p className="mt-3 whitespace-pre-wrap text-[19px] leading-[1.6] text-foreground">{body}</p>
      )}
    </FieldCard>
  );
}

/** Objection and close cards: the line big, one tap to the answer. */
function FlipCard({ front, back, followup }: { front: string; back: string; followup: string | null }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped((v) => !v)}
      aria-expanded={flipped}
      className="w-full rounded-xl border border-border bg-card p-4 text-left"
      style={{ minHeight: 96 }}
    >
      <p className="font-display text-[22px] font-extrabold leading-tight text-foreground">{front}</p>
      {!flipped ? (
        <p className="mt-3 flex items-center gap-2 text-[15px] text-muted-foreground">
          <RotateCcw className="h-4 w-4" aria-hidden />
          Tap for the answer
        </p>
      ) : (
        <>
          <p className="mt-3 whitespace-pre-wrap text-[19px] leading-[1.6] text-foreground">{back}</p>
          {followup && (
            <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-[17px] leading-[1.6] text-muted-foreground">
              {followup}
            </p>
          )}
        </>
      )}
    </button>
  );
}

function PricingGroup({ title, rows }: { title: string; rows: Entry[] }) {
  return (
    <FieldCard>
      <p className="font-display text-[18px] font-extrabold uppercase tracking-wide text-foreground">{title}</p>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-baseline justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
            <span className="text-[18px] text-foreground">{r.meta?.notes || r.title}</span>
            <span className="shrink-0 text-right text-[18px] tabular-nums text-foreground">
              {r.meta?.initial || ''}
              {r.meta?.recurring ? <span className="block text-[16px] text-muted-foreground">{r.meta.recurring}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </FieldCard>
  );
}

/**
 * Pass 83 — Doors mode. The door script, the objections, the closes, the bug
 * sheet rule and the price sheet, oversized for one thumb in daylight. Log a
 * sale stays pinned at the bottom.
 */
export default function DoorsPage() {
  const navigate = useNavigate();
  const [segment, setSegment] = useState<SegmentKey>('script');
  const [door, setDoor] = useState<DoorKey>('fresh');
  const [content, setContent] = useState<DoorsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);

  // First paint from the offline cache so Doors mode works with no signal.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        setContent(JSON.parse(raw) as DoorsContent);
        setLoading(false);
      }
    } catch {
      /* ignore a bad cache */
    }
  }, []);

  const load = useCallback(async () => {
    const [pb, sc, settings] = await Promise.all([
      (supabase as any)
        .from('playbook_entries')
        .select('id, kind, title, body, followup, sort_order, market, meta')
        .eq('vertical', 'Pest')
        .eq('published', true)
        .order('kind')
        .order('sort_order'),
      (supabase as any).from('scripts').select('id, title, category, body').eq('vertical', 'Pest'),
      (supabase as any).from('app_settings').select('key, value').eq('key', 'pest_bug_sheet').maybeSingle(),
    ]);

    const entries = (pb?.data as Entry[]) || [];
    const scripts = (sc?.data as ScriptRow[]) || [];
    if (entries.length === 0 && scripts.length === 0) {
      setLoading(false);
      return;
    }
    const raw = (settings?.data as { value?: unknown } | null)?.value;
    const bugSheet = typeof raw === 'string' && raw.trim() ? raw : null;
    const next: DoorsContent = { entries, scripts, bugSheet };
    setContent(next);
    setLoading(false);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or private mode */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = content?.entries || [];
  const scripts = content?.scripts || [];

  const bridge = useMemo(() => scripts.find((s) => s.title === 'The Bridge') || null, [scripts]);

  const doorBlocks = useMemo(() => {
    if (door === 'fresh') {
      return entries
        .filter((e) => e.kind === 'script')
        .map((e) => ({ id: e.id, title: e.title, note: e.meta?.notes || '', body: e.body }));
    }
    if (door === 'switchover') {
      const hits = scripts
        .filter((s) => /switchover/i.test(s.title) || /switchover/i.test(s.body))
        .map((s) => ({ id: s.id, title: s.title, note: s.category, body: s.body }));
      if (bridge) hits.push({ id: bridge.id, title: bridge.title, note: bridge.category, body: bridge.body });
      return hits;
    }
    const diy = entries
      .filter((e) => e.kind === 'objection' && /do it myself/i.test(e.title))
      .map((e) => ({ id: e.id, title: e.title, note: e.meta?.notes || '', body: e.body }));
    if (bridge) diy.push({ id: bridge.id, title: bridge.title, note: bridge.category, body: bridge.body });
    return diy;
  }, [door, entries, scripts, bridge]);

  const objections = entries.filter((e) => e.kind === 'objection').sort((a, b) => a.sort_order - b.sort_order);
  const closes = entries.filter((e) => e.kind === 'close').sort((a, b) => a.sort_order - b.sort_order);
  const pricing = entries.filter((e) => e.kind === 'pricing').sort((a, b) => a.sort_order - b.sort_order);

  const pricingGroups = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    pricing.forEach((r) => {
      const plan = r.meta?.plan || r.title;
      const key = r.meta?.notes === 'Add-on' ? 'Add-on services' : plan;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });
    return Array.from(groups.entries());
  }, [pricing]);

  const market = pricing.find((r) => r.market)?.market || '';

  return (
    <div className="min-h-[100dvh] bg-background app-texture">
      {/* Header: out of Doors mode in one tap */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <button
            onClick={() => navigate('/app')}
            className="flex min-h-12 min-w-12 items-center gap-2 px-1 text-[16px] text-muted-foreground"
            aria-label="Leave Doors mode"
          >
            <ArrowLeft className="h-5 w-5" />
            Home
          </button>
          <span className="ml-auto font-display text-[18px] font-extrabold text-foreground">Doors</span>
        </div>
        <div className="mx-auto max-w-3xl overflow-x-auto px-3 pb-2">
          <div className="flex gap-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSegment(s.key)}
                className={cn(
                  'shrink-0 rounded-full border px-5 text-[16px]',
                  segment === s.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground'
                )}
                style={{ minHeight: 48 }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 pb-28 pt-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {segment === 'script' && (
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto">
                  {DOORS.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setDoor(d.key)}
                      className={cn(
                        'shrink-0 rounded-full border px-5 text-[16px]',
                        door === d.key
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-card text-muted-foreground'
                      )}
                      style={{ minHeight: 48 }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {doorBlocks.length === 0 ? (
                  <FieldCard>
                    <p className="text-[18px] text-foreground">
                      Nothing loaded for this door yet — ask your manager.
                    </p>
                  </FieldCard>
                ) : (
                  doorBlocks.map((b) => <ScriptBlock key={b.id} title={b.title} note={b.note} body={b.body} />)
                )}
              </div>
            )}

            {segment === 'objections' && (
              <div className="space-y-3">
                {objections.length === 0 ? (
                  <FieldCard>
                    <p className="text-[18px] text-foreground">No objections loaded yet — ask your manager.</p>
                  </FieldCard>
                ) : (
                  objections.map((o) => <FlipCard key={o.id} front={o.title} back={o.body} followup={o.followup} />)
                )}
              </div>
            )}

            {segment === 'closes' && (
              <div className="space-y-3">
                {closes.length === 0 ? (
                  <FieldCard>
                    <p className="text-[18px] text-foreground">No closes loaded yet — ask your manager.</p>
                  </FieldCard>
                ) : (
                  closes.map((c) => <FlipCard key={c.id} front={c.title} back={c.body} followup={c.followup} />)
                )}
              </div>
            )}

            {segment === 'bugs' && (
              <div className="space-y-3">
                <FieldCard>
                  <p className="text-[19px] font-semibold leading-snug text-foreground">
                    Ask who they use now before you show the sheet.
                  </p>
                </FieldCard>
                <FieldCard>
                  {content?.bugSheet ? (
                    <p className="whitespace-pre-wrap text-[18px] leading-[1.6] text-foreground">{content.bugSheet}</p>
                  ) : (
                    <p className="text-[18px] text-muted-foreground">Bug sheet coming — ask your manager.</p>
                  )}
                </FieldCard>
              </div>
            )}

            {segment === 'pricing' && (
              <div className="space-y-3">
                {market && <p className="text-[16px] text-muted-foreground">Market: {market}</p>}
                {pricingGroups.length === 0 ? (
                  <FieldCard>
                    <p className="text-[18px] text-foreground">No prices loaded for you yet — ask your manager.</p>
                  </FieldCard>
                ) : (
                  pricingGroups.map(([title, rows]) => <PricingGroup key={title} title={title} rows={rows} />)
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Log a sale stays under the thumb on every segment */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Button className="w-full text-[17px]" style={{ minHeight: 52 }} onClick={() => setLogOpen(true)}>
            Log a sale
          </Button>
        </div>
      </div>

      <LogSaleSheet open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}
