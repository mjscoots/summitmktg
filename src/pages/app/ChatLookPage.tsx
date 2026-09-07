import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useChatPrefs } from '@/hooks/useChatSkin';
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

  const pickWallpaper = async (key: Wallpaper) => {
    await saveChatPrefs({ wallpaper: key }, user?.id);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8 px-5 py-8 md:space-y-12 md:px-8 md:py-12">
        <PageHeader title="Chat look" context="Yours only. Nobody else sees these choices." />

        <ChatLookPreview />

        <section className="space-y-3 rounded bg-card p-5">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Wallpaper</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Applies to every room. A single room can be set from its own room sheet.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WALLPAPERS.filter((w) => w.key !== 'photo').map((w) => (
              <button
                key={w.key}
                onClick={() => void pickWallpaper(w.key)}
                aria-pressed={prefs.wallpaper === w.key}
                className={cn(
                  'min-h-[88px] overflow-hidden rounded bg-secondary text-left transition-colors',
                  prefs.wallpaper === w.key ? 'ring-2 ring-primary' : 'hover:bg-muted'
                )}
              >
                <span className={cn('block h-14 w-full', `chat-surface chat-surface-${w.key}`)}>
                </span>
                <span className="block px-2 py-2 text-[13px] text-foreground">{w.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded bg-card p-5">
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
                  'min-h-11 rounded px-5 text-[14px]',
                  prefs.bubble === b.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded bg-card p-5">
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
                  'min-h-11 rounded px-5 text-[14px]',
                  prefs.text_size === t.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
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
