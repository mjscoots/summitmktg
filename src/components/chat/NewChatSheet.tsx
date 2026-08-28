import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MemberPicker } from '@/components/chat/MemberPicker';
import { PeopleSearch } from '@/components/chat/PeopleSearch';
import { cn } from '@/lib/utils';

/**
 * New chat: managers and above name a group and pick its members, everyone can
 * start a direct message through the existing people search.
 */
export function NewChatSheet({
  open,
  onOpenChange,
  onOpenRoom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenRoom: (slug: string) => void;
}) {
  const { user, role } = useAuth();
  const canGroup = isManagerOrAbove(role);
  const [tab, setTab] = useState<'group' | 'dm'>(canGroup ? 'group' : 'dm');
  const [label, setLabel] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickCover = async (file: File | undefined) => {
    if (!file || !user) return;
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/newroom-${Date.now()}.${ext}`;
      const buffer = await file.arrayBuffer();
      const { error } = await supabase.storage
        .from('chat-uploads')
        .upload(path, new Blob([buffer], { type: file.type || 'image/jpeg' }), {
          contentType: file.type || 'image/jpeg',
        });
      if (error) throw error;
      setCover(path);
      toast.success('Cover photo ready');
    } catch {
      toast.error('That photo did not save. Try again.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const create = async () => {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('create_group_channel', {
      _label: label.trim(),
      _ids: picked,
      _cover: cover,
    });
    setBusy(false);
    if (error || data?.error) { toast.error(String(data?.error || 'That room did not save.')); return; }
    toast.success('Room created');
    setLabel('');
    setPicked([]);
    setCover(null);
    onOpenChange(false);
    onOpenRoom(String(data.slug));
  };

  const TAB = 'min-h-[44px] flex-1 rounded-xl border px-3 text-[13px] font-semibold transition-colors';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[14px]">New chat</SheetTitle>
        </SheetHeader>

        {canGroup && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('group')}
              className={cn(TAB, tab === 'group' ? 'border-primary/50 bg-primary/5 text-foreground' : 'border-border/60 text-muted-foreground')}
            >
              Group
            </button>
            <button
              type="button"
              onClick={() => setTab('dm')}
              className={cn(TAB, tab === 'dm' ? 'border-primary/50 bg-primary/5 text-foreground' : 'border-border/60 text-muted-foreground')}
            >
              Direct message
            </button>
          </div>
        )}

        {tab === 'group' && canGroup ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Room name"
                className="min-h-[44px] flex-1 rounded-xl border border-border/60 bg-background px-3 text-[14px] text-foreground"
              />
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
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border/60 px-3 text-[12px] font-semibold text-foreground disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {cover ? 'Photo set' : 'Cover'}
              </button>
            </div>

            <MemberPicker
              selected={picked}
              onToggle={(id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
            />

            <button
              type="button"
              onClick={() => void create()}
              disabled={busy || label.trim().length < 2}
              className="min-h-[44px] w-full rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              Create room{picked.length > 0 ? ` · ${picked.length}` : ''}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <PeopleSearch
              onOpenDm={(slug) => {
                onOpenChange(false);
                onOpenRoom(slug);
              }}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default NewChatSheet;
