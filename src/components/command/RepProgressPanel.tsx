import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/commission';
import { sanitizeUrl } from '@/lib/sanitizeUrl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ProgressApplication { id: string; vertical: string; status: string; created_at: string }
interface ProgressLink { id: string; title: string; url: string }
interface RepProgress {
  user_id: string;
  full_name: string;
  vertical: string;
  application_count: number;
  latest_application_status: string | null;
  applications: ProgressApplication[];
  earnings_goal: number | null;
  personal_link_count: number;
  personal_links: ProgressLink[];
}

export function RepProgressPanel() {
  const [rows, setRows] = useState<RepProgress[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc('rep_progress_summary');
      setRows((Array.isArray(data) ? data : []) as unknown as RepProgress[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? rows.filter((row) => `${row.full_name} ${row.vertical}`.toLowerCase().includes(needle)) : rows;
  }, [query, rows]);

  if (loading) return <div className="h-24 animate-pulse rounded-md bg-muted/20" />;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card text-foreground">
      <div className="border-b border-border p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reps" className="pl-9" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {filtered.map((row) => {
          const completed = Number(row.application_count > 0) + Number(Boolean(row.earnings_goal)) + Number(row.personal_link_count > 0);
          return (
            <Collapsible key={row.user_id}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 md:grid-cols-[minmax(180px,1.4fr)_minmax(120px,1fr)_110px_90px_110px_auto]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{row.full_name}</p>
                  <p className="text-xs text-muted-foreground">{row.vertical}</p>
                </div>
                <div className="hidden text-xs text-muted-foreground md:block">{row.application_count} application{row.application_count === 1 ? '' : 's'}{row.latest_application_status ? ` · ${row.latest_application_status}` : ''}</div>
                <div className="hidden text-sm tabular-nums md:block">{row.earnings_goal ? formatCurrency(Number(row.earnings_goal)) : 'Not set'}</div>
                <div className="hidden text-sm tabular-nums md:block">{row.personal_link_count} links</div>
                <div className="text-right text-xs font-semibold text-primary">{completed}/3 complete</div>
                <CollapsibleTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label={`Show ${row.full_name} details`}><ChevronDown className="h-4 w-4" /></Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="border-t border-border bg-muted/10 px-4 py-4">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Industry applications</p>
                    {row.applications.length ? row.applications.map((application) => (
                      <p key={application.id} className="mb-1 text-sm">{application.vertical} <span className="text-muted-foreground">· {application.status}</span></p>
                    )) : <p className="text-sm text-muted-foreground">No applications.</p>}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Personal Resource links</p>
                    {row.personal_links.length ? row.personal_links.map((link) => (
                      <a key={link.id} href={sanitizeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-1 text-sm text-primary hover:underline">{link.title}<ExternalLink className="h-3 w-3" /></a>
                    )) : <p className="text-sm text-muted-foreground">No personal links.</p>}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No reps match that search.</p>}
      </div>
    </div>
  );
}