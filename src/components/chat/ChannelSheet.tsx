import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { ChannelAvatar } from '@/components/chat/ChannelAvatar';
import { MemberPicker } from '@/components/chat/MemberPicker';

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
  can_rename: boolean;
  can_delete_room: boolean;
  can_manage_members: boolean;
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
  onRoomDeleted,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCoverChanged?: () => void;
  onRoomDeleted?: () => void;
}) {
  const { user } = useAuth();
  const [details, setDetails] = useState<Details | null>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
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

  const saveName = async () => {
    const label = nameDraft.trim();
    if (label.length < 2) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('rename_chat_channel', { _slug: slug, _label: label });
    setBusy(false);
    if (error || data?.error) { toast.error(String(data?.error || 'That name did not save.')); return; }
    toast.success('Room renamed');
    setRenaming(false);
    await load();
    onCoverChanged?.();
  };

  const deleteRoom = async () => {
    if (confirmText.trim() !== 'DELETE') return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('delete_chat_channel', { _slug: slug });
    setBusy(false);
    if (error || data?.error) { toast.error(String(data?.error || 'That room did not delete.')); return; }
    toast.success('Room deleted');
    setDeleteOpen(false);
    onOpenChange(false);
    onRoomDeleted?.();
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

        {(details?.can_rename || details?.can_delete_room) && (
          <div className="mt-4 space-y-2 rounded-xl border border-border/60 p-3">
            {details?.can_rename && (
              renaming ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Room name"
                    className="min-h-[44px] flex-1 rounded-xl border border-border/60 bg-background px-3 text-[14px] text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => void saveName()}
                    disabled={busy || nameDraft.trim().length < 2}
                    className="min-h-[44px] rounded-xl border border-border/60 px-3 text-[12px] font-semibold text-foreground disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming(false)}
                    className="min-h-[44px] px-2 text-[12px] text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setNameDraft(details?.label || ''); setRenaming(true); }}
                  className="flex min-h-[44px] w-full items-center gap-2 text-[13px] font-semibold text-foreground"
                >
                  <Pencil className="h-4 w-4" /> Rename room
                </button>
              )
            )}

            {details?.can_delete_room && (
              deleteOpen ? (
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground">
                    Deleting this room removes its messages. Type DELETE to confirm.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="min-h-[44px] flex-1 rounded-xl border border-border/60 bg-background px-3 text-[14px] text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => void deleteRoom()}
                      disabled={busy || confirmText.trim() !== 'DELETE'}
                      className="min-h-[44px] rounded-xl bg-destructive px-3 text-[12px] font-semibold text-destructive-foreground disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeleteOpen(false); setConfirmText(''); }}
                      className="min-h-[44px] px-2 text-[12px] text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="flex min-h-[44px] w-full items-center gap-2 text-[13px] font-semibold text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Delete room
                </button>
              )
            )}
          </div>
        )}

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
