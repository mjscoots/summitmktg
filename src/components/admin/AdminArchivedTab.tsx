import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { toast } from 'sonner';
import { Archive, Loader2, RotateCcw, Search } from 'lucide-react';
import { LoadingList } from '@/components/shared/LoadingList';

interface ArchivedRow {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  archived_at: string | null;
  archived_reason: string | null;
  pre_archive_status: string | null;
}

const REASON_LABEL: Record<string, string> = {
  'never-logged-in': 'Never logged in',
  'inactive-60d': 'No activity 60+ days',
  departed: 'Departed / NLC',
  manual: 'Archived manually',
};

const PAGE = 50;

export function AdminArchivedTab() {
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<ArchivedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [visible, setVisible] = useState(PAGE);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, avatar_url, archived_at, archived_reason, pre_archive_status')
      .eq('archived', true)
      .order('archived_at', { ascending: false });
    if (error) {
      console.error(error);
      toast.error('Failed to load archived accounts');
    }
    setRows((data as unknown as ArchivedRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.full_name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const restore = async (row: ArchivedRow) => {
    setRestoring(row.user_id);
    const { error } = await supabase
      .from('profiles')
      .update({
        archived: false,
        archived_at: null,
        archived_reason: null,
        status: (row.pre_archive_status as never) ?? ('active' as never),
      })
      .eq('user_id', row.user_id);
    setRestoring(null);
    if (error) {
      toast.error('Restore failed');
      return;
    }
    toast.success(`${row.full_name} restored`);
    setRows(prev => prev.filter(r => r.user_id !== row.user_id));
  };

  if (loading) return <LoadingList rows={6} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Archive className="w-4 h-4" />
          <span>{rows.length} archived {rows.length === 1 ? 'account' : 'accounts'}</span>
        </div>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setVisible(PAGE); }}
            placeholder="Search archived"
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card/60 backdrop-blur-sm border border-white/[0.06] p-8 text-center text-sm text-muted-foreground">
          No archived accounts.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, visible).map(row => (
            <div
              key={row.user_id}
              className="flex items-center gap-3 rounded-xl bg-card/60 backdrop-blur-sm border border-white/[0.06] px-4 py-3"
            >
              <UserAvatar fullName={row.full_name} avatarUrl={row.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">{row.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {REASON_LABEL[row.archived_reason || ''] || row.archived_reason || 'Archived'}
                  {row.archived_at && ` · ${new Date(row.archived_at).toLocaleDateString()}`}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => restore(row)}
                disabled={restoring === row.user_id}
                className="flex-shrink-0"
              >
                {restoring === row.user_id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <><RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restore</>
                )}
              </Button>
            </div>
          ))}
          {filtered.length > visible && (
            <Button variant="ghost" className="w-full" onClick={() => setVisible(v => v + PAGE)}>
              Load more ({filtered.length - visible} remaining)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminArchivedTab;
