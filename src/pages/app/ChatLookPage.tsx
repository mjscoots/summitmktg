import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatPrefs } from '@/hooks/useChatSkin';
import { prepareChatImage } from '@/lib/chatImage';
import { cn } from '@/lib/utils';
import {
  BUBBLES,
  TEXT_SIZES,
  WALLPAPERS,
  saveChatPrefs,
  type BubbleColor,
  type TextSize,
  type Wallpaper,
} from '@/lib/chatPrefs';
import { ChatLookPreview } from '@/components/chat/ChatLookPreview';

/**
 * Chat look: wallpaper, bubble colour and text size, all per person and all
 * cosmetic. Nothing here changes what anyone can see or send.
 */
export default function ChatLookPage() {
  const { user } = useAuth();
  const prefs = useChatPrefs();
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pickWallpaper = async (key: Wallpaper) => {
    if (key === 'photo' && !prefs.wallpaper_path) {
      photoRef.current?.click();
      return;
    }
    await saveChatPrefs({ wallpaper: key }, user?.id);
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const prepared = await prepareChatImage(file);
      if (!prepared) {
        toast.error('That image could not be read');
        return;
      }
      const path = `${user.id}/wallpaper.jpg`;
      const { error } = await supabase.storage
        .from('chat-wallpapers')
        .upload(path, prepared.blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      await saveChatPrefs({ wallpaper: 'photo', wallpaper_path: path }, user.id);
      toast.success('Wallpaper set');
    } catch {
      toast.error('That upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Chat look" context="Yours only. Nobody else sees these choices." />

        <ChatLookPreview />

        <section className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Wallpaper</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Applies to every room. A single room can be set from its own room sheet.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WALLPAPERS.map((w) => (
              <button
                key={w.key}
                onClick={() => void pickWallpaper(w.key)}
                aria-pressed={prefs.wallpaper === w.key}
                className={cn(
                  'min-h-[88px] overflow-hidden rounded-[var(--radius)] border text-left transition-colors',
                  prefs.wallpaper === w.key ? 'border-primary' : 'border-border hover:border-muted-foreground'
                )}
              >
                <span className={cn('block h-14 w-full', `chat-wall chat-wall-${w.key}`)}>
                  {w.key === 'photo' && !prefs.wallpaper_path && (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImagePlus className="h-4 w-4" />
                    </span>
                  )}
                </span>
                <span className="block px-2 py-2 text-[13px] text-foreground">{w.label}</span>
              </button>
            ))}
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void uploadPhoto(file);
            }}
          />
          <button
            onClick={() => photoRef.current?.click()}
            disabled={uploading}
            className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-[14px] text-foreground transition-colors hover:bg-secondary"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {prefs.wallpaper_path ? 'Replace your photo' : 'Upload your photo'}
          </button>
        </section>

        <section className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Bubble color</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your own messages only. Other people keep the standard bubble.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Bubble color">
            {BUBBLES.map((b) => (
              <button
                key={b.key}
                role="radio"
                aria-checked={prefs.bubble === b.key}
                onClick={() => void saveChatPrefs({ bubble: b.key as BubbleColor }, user?.id)}
                className={cn(
                  'min-h-11 rounded-full border px-5 text-[14px]',
                  prefs.bubble === b.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground'
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Text size</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Applies to message text and the box you type in.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Text size">
            {TEXT_SIZES.map((t) => (
              <button
                key={t.key}
                role="radio"
                aria-checked={prefs.text_size === t.key}
                onClick={() => void saveChatPrefs({ text_size: t.key as TextSize }, user?.id)}
                className={cn(
                  'min-h-11 rounded-full border px-5 text-[14px]',
                  prefs.text_size === t.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
