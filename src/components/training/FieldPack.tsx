import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';

export interface PlaybookEntry {
  id: string;
  vertical: string;
  kind: string;
  title: string;
  body: string;
  followup: string | null;
  tags: string[] | null;
  sort_order: number;
  market: string | null;
  meta: Record<string, string> | null;
}

const CHIPS = [
  { key: 'script', label: 'Script' },
  { key: 'objection', label: 'Objections' },
  { key: 'close', label: 'Closes' },
  { key: 'talk_track', label: 'Backyard' },
  { key: 'pricing', label: 'Pricing' },
] as const;

type ChipKey = (typeof CHIPS)[number]['key'];

/** The line Ask Summit practice mode opens with for one entry. */
export function practiceSeed(entry: Pick<PlaybookEntry, 'kind' | 'title'>) {
  return entry.kind === 'close'
    ? `Let me practice the ${entry.title}`
    : `Run the objection: ${entry.title}`;
}

function PracticeButton({ entry }: { entry: PlaybookEntry }) {
  const navigate = useNavigate();
  return (
    <Button
      size="sm"
      className="min-h-11 rounded-full px-5"
      onClick={() => navigate(`/app/ask?practice=${encodeURIComponent(practiceSeed(entry))}`)}
    >
      Practice this
    </Button>
  );
}

function EntryCard({
  entry,
  open,
  onToggle,
}: {
  entry: PlaybookEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const [showFollowup, setShowFollowup] = useState(false);
  const whenToUse = entry.meta?.when_to_use || '';
  const notes = entry.meta?.notes || '';

  return (
    <div className="card-ice overflow-hidden">
      <button
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-3 px-3 py-3 text-left"
        aria-expanded={open}
      >
        <span className="icon-tile shrink-0">
          <BookOpen className="h-4 w-4 text-primary" />
        </span>
        <span className="min-w-0 flex-1 font-display text-[15px] font-extrabold text-foreground">{entry.title}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          {whenToUse && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-label">When to use</p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                {whenToUse}
              </p>
            </div>
          )}

          {entry.body && (
            <p className="whitespace-pre-wrap text-[17px] leading-[1.6] text-foreground sm:text-[15px]">{entry.body}</p>
          )}

          {notes && (
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">{notes}</p>
          )}

          {entry.followup && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 px-0"
                onClick={() => setShowFollowup((v) => !v)}
              >
                {showFollowup ? 'Hide follow-up' : 'They said it again'}
              </Button>
              {showFollowup && (
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                  {entry.followup}
                </p>
              )}
            </div>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <p className="text-[12px] text-muted-foreground">{entry.tags.join(' · ')}</p>
          )}

          <PracticeButton entry={entry} />
        </div>
      )}
    </div>
  );
}

function PricingTable({ rows }: { rows: PlaybookEntry[] }) {
  const market = rows.find((r) => r.market)?.market || '';
  return (
    <div className="space-y-2">
      {market && <p className="text-[13px] text-muted-foreground">Market: {market}</p>}
      <div className="card-ice overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-secondary-label">
              <th className="px-3 py-2 font-semibold">Plan</th>
              <th className="px-3 py-2 font-semibold">Size</th>
              <th className="px-3 py-2 font-semibold">Initial</th>
              <th className="px-3 py-2 font-semibold">Recurring</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-foreground">{r.meta?.plan || r.title}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.meta?.notes || ''}</td>
                <td className="px-3 py-2 tabular-nums text-accent-number">{r.meta?.initial || ''}</td>
                <td className="px-3 py-2 tabular-nums text-accent-number">{r.meta?.recurring || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-muted-foreground">
        The last page of the price sheet, Seasonal insects, is an image and is not loaded here.
      </p>
    </div>
  );
}

/**
 * The field pack inside Learn: the owner's script, objections, closes, backyard
 * pitch and price sheet, searchable. It used to be its own Playbook page.
 */
export function FieldPack() {
  const { activeVertical } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<PlaybookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [chip, setChip] = useState<ChipKey>('script');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('playbook_entries')
      .select('id, vertical, kind, title, body, followup, tags, sort_order, market, meta')
      .eq('vertical', activeVertical)
      .eq('published', true)
      .order('kind')
      .order('sort_order');
    setRows((data as PlaybookEntry[]) || []);
    setLoading(false);
  }, [activeVertical]);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep link from search: open one entry on its own chip.
  const entryParam = params.get('entry');
  useEffect(() => {
    if (!entryParam || rows.length === 0) return;
    const hit = rows.find((r) => r.id === entryParam);
    if (hit) {
      setChip((hit.kind === 'assumption' ? 'script' : hit.kind) as ChipKey);
      setOpen((p) => ({ ...p, [hit.id]: true }));
    }
    params.delete('entry');
    setParams(params, { replace: true });
  }, [entryParam, rows, params, setParams]);

  const searching = q.trim().length >= 2;
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (searching) {
      return rows.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          (r.body || '').toLowerCase().includes(term) ||
          (r.followup || '').toLowerCase().includes(term) ||
          (r.tags || []).some((t) => t.toLowerCase().includes(term))
      );
    }
    return rows.filter((r) => r.kind === chip);
  }, [rows, q, chip, searching]);

  const pricingRows = visible.filter((r) => r.kind === 'pricing');
  const cardRows = visible.filter((r) => r.kind !== 'pricing');

  return (
    <section id="field-pack" className="min-w-0 scroll-mt-20">
      <h2 className="font-display text-[17px] font-extrabold text-foreground">Field pack</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        The script, objections, closes, backyard pitch and prices.
      </p>

      <div className="mt-3 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the field pack"
            className="min-h-11 pl-9"
            aria-label="Search the field pack"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c.key}
              onClick={() => {
                setQ('');
                setChip(c.key);
              }}
              className={cn(
                'min-h-11 rounded-full border px-3 text-[13px]',
                !searching && chip === c.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-[10px]" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Nothing here yet.</p>
        ) : (
          <div className="space-y-4">
            {pricingRows.length > 0 && <PricingTable rows={pricingRows} />}
            {cardRows.length > 0 && (
              <div className="space-y-2">
                {cardRows.map((r) => (
                  <EntryCard
                    key={r.id}
                    entry={r}
                    open={!!open[r.id]}
                    onToggle={() => setOpen((p) => ({ ...p, [r.id]: !p[r.id] }))}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default FieldPack;
