import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Target, GraduationCap, FileText, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type ResultKind = 'rep' | 'lead' | 'lesson' | 'script';

interface SearchResult {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle?: string;
  to: string;
}

const KIND_META: Record<ResultKind, { label: string; icon: typeof User }> = {
  rep: { label: 'People', icon: User },
  lead: { label: 'Leads', icon: Target },
  lesson: { label: 'Training', icon: GraduationCap },
  script: { label: 'Scripts', icon: FileText },
};

/**
 * App-wide search. Every query goes through the normal Data API, so RLS
 * decides what the searcher can see — no extra role logic needed here.
 */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const runSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    const reqId = ++reqRef.current;
    setLoading(true);
    const like = `%${q}%`;

    const [reps, leads, lessons, scripts] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, status').eq('archived', false).ilike('full_name', like).limit(6),
      (supabase as any).from('recruiting_leads').select('id, full_name, status').ilike('full_name', like).limit(6),
      (supabase as any).from('training_lessons').select('id, title, module_id').ilike('title', like).limit(6),
      (supabase as any).from('scripts').select('id, title, category').ilike('title', like).limit(6),
    ]);

    if (reqId !== reqRef.current) return;

    const next: SearchResult[] = [
      ...((reps.data || []) as any[]).filter(r => r.full_name).map(r => ({
        kind: 'rep' as const, id: r.user_id, title: r.full_name,
        subtitle: r.status || undefined, to: `/app/team?member=${r.user_id}`,
      })),
      ...((leads.data || []) as any[]).map(l => ({
        kind: 'lead' as const, id: l.id, title: l.full_name || 'Lead',
        subtitle: l.status || undefined, to: `/app/recruits?lead=${l.id}`,
      })),
      ...((lessons.data || []) as any[]).map(l => ({
        kind: 'lesson' as const, id: l.id, title: l.title, to: `/app/lesson/${l.id}`,
      })),
      ...((scripts.data || []) as any[]).map(s => ({
        kind: 'script' as const, id: s.id, title: s.title,
        subtitle: s.category || undefined, to: `/app/scripts?script=${s.id}`,
      })),
    ];

    setResults(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => runSearch(query), 180);
    return () => window.clearTimeout(id);
  }, [query, runSearch]);

  const grouped = useMemo(() => {
    const map: Partial<Record<ResultKind, SearchResult[]>> = {};
    results.forEach(r => { (map[r.kind] ||= []).push(r); });
    return map;
  }, [results]);

  const select = (r: SearchResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(r.to);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2.5 text-muted-foreground',
          'transition-colors hover:border-primary/30 hover:text-foreground lg:min-h-9 lg:px-3'
        )}
      >
        <Search className="h-4 w-4" />
        <span className="hidden text-[12px] font-medium lg:inline">Search</span>
        <kbd className="hidden rounded border border-border/40 px-1 text-[10px] font-semibold lg:inline">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search people, leads, training, scripts..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[70vh]">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
            </div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>No matches.</CommandEmpty>
          )}
          {!loading && query.trim().length < 2 && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">Type at least 2 characters.</div>
          )}
          {(Object.keys(grouped) as ResultKind[]).map(kind => {
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            return (
              <CommandGroup key={kind} heading={meta.label}>
                {grouped[kind]!.map(r => (
                  <CommandItem key={`${kind}-${r.id}`} value={`${kind}-${r.id}-${r.title}`} onSelect={() => select(r)}>
                    <Icon className="mr-2 h-3.5 w-3.5 text-primary/70" />
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="ml-auto truncate pl-2 text-[11px] capitalize text-muted-foreground">{r.subtitle}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
