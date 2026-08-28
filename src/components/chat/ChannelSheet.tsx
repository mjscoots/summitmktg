import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ChannelAvatar } from '@/components/chat/ChannelAvatar';

interface Member {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Details {
  slug: string;
  label: string;
  kind: string;
  cover_image_path: string | null;
  can_set_cover: boolean;
  members: Member[];
  member_count: number;
}

/**
 * Tap the room name to see who is in it, with their profile photos. Owners,
 * admins and the room's own manager can set the cover photo here; the database
 * decides who may, the client only shows what it is told.
 */
export function ChannelSheet({
  slug,
  open,
  onOpenChange,
  onCoverChanged,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoverChanged?: () => void;
}) {
  const { user } = useAuth();
  const [details, setDetails] = useState<Details | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc('get_channel_details', { _slug: slug });
    if (error || !data || data.error) return;
    setDetails(data as Details);
  }, [slug]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const pickCover = async (file: File | undefined) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/cover-${slug}-${Date.now()}.${ext}`;
      const buffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('chat-uploads')
        .upload(path, new Blob([buffer], { type: file.type || 'image/jpeg' }), {
          contentType: file.type || 'image/jpeg',
        });
      if (uploadError) throw uploadError;

      const { data, error } = await (supabase as any).rpc('set_channel_cover', { _slug: slug, _path: path });
      if (error) throw error;
      if (data?.error) { toast.error(String(data.error)); return; }
      toast.success('Cover photo updated');
      await load();
      onCoverChanged?.();
    } catch {
      toast.error('That photo did not save. Try again.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[14px]">{details?.label || 'Room'}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex items-center gap-3">
          <ChannelAvatar name={details?.label || ''} coverPath={details?.cover_image_path} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">{details?.label}</p>
            <p className="text-[12px] text-muted-foreground">
              {details ? `${details.member_count} ${details.member_count === 1 ? 'person' : 'people'}` : ''}
            </p>
          </div>
          {details?.can_set_cover && details.kind !== 'dm' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void pickCover(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border/60 px-3 text-[12px] font-semibold text-foreground transition-colors hover:border-[hsl(var(--ice)/0.5)] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Cover photo
              </button>
            </>
          )}
        </div>

        <ul className="mt-4 space-y-1.5">
          {(details?.members || []).map((m) => (
            <li key={m.user_id} className="flex min-h-[52px] items-center gap-3 rounded-xl px-1">
              <UserAvatar avatarUrl={m.avatar_url} fullName={m.full_name} size="md" />
              <span className="min-w-0 flex-1 truncate text-[14px] text-foreground">{m.full_name}</span>
            </li>
          ))}
          {details && details.members.length === 0 && (
            <li className="py-4 text-center text-[13px] text-muted-foreground">Nobody has posted here yet.</li>
          )}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

export default ChannelSheet;
