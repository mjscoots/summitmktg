import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export interface AnnouncementCardMeta {
  title?: string;
  body?: string | null;
  is_pinned?: boolean;
}

interface AckStatus {
  mine: boolean;
  is_staff: boolean;
  ack_count: number;
  not_acked: { user_id: string; name: string | null }[] | null;
}

export function AnnouncementCard({ postId, meta, title }: { postId: string | null; meta: AnnouncementCardMeta | null; title: string }) {
  const [status, setStatus] = useState<AckStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    const { data } = await (supabase as any).rpc('get_announcement_ack_status', { _post_id: postId });
    if (data && !data.error) setStatus(data as AckStatus);
  }, [postId]);

  useEffect(() => { void load(); }, [load]);

  const ack = async () => {
    if (!postId) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('ack_announcement', { _post_id: postId });
    setBusy(false);
    if (error) { toast.error('That did not save. Try again.'); return; }
    void load();
  };

  const pinned = !!meta?.is_pinned;

  return (
    <div className="my-3 px-3">
      <div className="mx-auto max-w-md rounded-xl border border-border/60 bg-card p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          {pinned ? 'Pinned update' : 'Update'}
        </span>
        <p className="mt-1 text-[15px] font-semibold text-foreground">{meta?.title || title}</p>
        {meta?.body && <p className="mt-1 whitespace-pre-wrap text-[13px] text-muted-foreground">{meta.body}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {pinned && !status?.mine && (
            <button
              onClick={ack}
              disabled={busy}
              className="min-h-[44px] rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              Got it
            </button>
          )}
          {pinned && status?.mine && <span className="text-[12px] text-muted-foreground">You said got it</span>}
          {status?.is_staff && pinned && (
            <button
              onClick={() => setSheetOpen(true)}
              className="min-h-[44px] text-[12px] text-muted-foreground hover:text-foreground"
            >
              {status.ack_count} acknowledged
            </button>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Has not acknowledged</SheetTitle>
          </SheetHeader>
          <ul className="mt-4 space-y-2">
            {(status?.not_acked || []).map((p) => (
              <li key={p.user_id} className="text-[13px] text-foreground">{p.name || 'Team member'}</li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
