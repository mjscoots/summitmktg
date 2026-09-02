import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChatAttachmentUrl } from '@/lib/chatAttachments';
import { STATUS_LABELS } from '@/components/feedback/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Row {
  id: string;
  user_id: string;
  feedback_type: string;
  message: string;
  status: string;
  admin_notes: string | null;
  page_path: string | null;
  device_info: string | null;
  app_commit: string | null;
  screenshot_path: string | null;
  created_at: string;
}

const STATUSES = ['open', 'in_progress', 'fixed', 'wont_fix'];
const TYPES = ['bug', 'idea', 'confusing', 'other'];

function Thumb({ path }: { path: string }) {
  const { url } = useChatAttachmentUrl(path);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img loading="lazy" decoding="async" src={url} alt="Report screenshot" className="mt-2 max-h-32 rounded-lg border border-border" />
    </a>
  );
}

/** Owner and admin lane: read, triage and close every report. */
export default function AdminFeedbackTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from('app_feedback' as any) as any)
      .select('*')
      .order('created_at', { ascending: false });
    const list = (data as Row[]) || [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => {
        map[p.user_id] = p.full_name || 'Unknown';
      });
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (statusFilter === 'all' || r.status === statusFilter) &&
          (typeFilter === 'all' || r.feedback_type === typeFilter),
      ),
    [rows, statusFilter, typeFilter],
  );

  const setStatus = async (row: Row, status: string) => {
    const { error } = await (supabase.from('app_feedback' as any) as any)
      .update({ status })
      .eq('id', row.id);
    if (error) {
      toast.error('That change did not save.');
      return;
    }
    await load();
  };

  const saveNote = async (row: Row) => {
    const value = notes[row.id] ?? '';
    const { error } = await (supabase.from('app_feedback' as any) as any)
      .update({ admin_notes: value })
      .eq('id', row.id);
    if (error) {
      toast.error('That note did not save.');
      return;
    }
    toast.success('Note saved');
    await load();
  };

  const openCount = rows.filter((r) => r.status === 'open').length;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        {openCount} open {openCount === 1 ? 'report' : 'reports'}.
      </p>

      <div className="flex flex-wrap gap-2">
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'min-h-[44px] rounded-lg border px-3 text-[13px] transition-colors',
              statusFilter === s ? 'border-primary text-foreground' : 'border-border text-muted-foreground',
            )}
          >
            {s === 'all' ? 'All statuses' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', ...TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'min-h-[44px] rounded-lg border px-3 text-[13px] capitalize transition-colors',
              typeFilter === t ? 'border-primary text-foreground' : 'border-border text-muted-foreground',
            )}
          >
            {t === 'all' ? 'All types' : t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-muted-foreground">Loading.</p>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {r.feedback_type} · {names[r.user_id] || 'Unknown'} ·{' '}
                  {r.created_at ? format(new Date(r.created_at), 'MMM d, h:mm a') : ''}
                </span>
                <span className="text-[11px] font-semibold text-primary">
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>

              <p className="mt-2 text-[14px] text-foreground">{r.message}</p>

              <p className="mt-2 break-all text-[11px] text-muted-foreground">
                {r.page_path || 'Page not recorded'}
                {r.app_commit ? ` · build ${r.app_commit}` : ''}
              </p>
              {r.device_info && (
                <p className="mt-1 break-all text-[11px] text-muted-foreground">{r.device_info}</p>
              )}
              {r.screenshot_path && <Thumb path={r.screenshot_path} />}

              <div className="mt-3 flex flex-wrap gap-2">
                {STATUSES.filter((s) => s !== r.status).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant="secondary"
                    className="min-h-[44px]"
                    onClick={() => setStatus(r, s)}
                  >
                    {STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  value={notes[r.id] ?? r.admin_notes ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="Admin notes"
                  className="min-h-[44px] max-w-sm"
                />
                <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => saveNote(r)}>
                  Save note
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
