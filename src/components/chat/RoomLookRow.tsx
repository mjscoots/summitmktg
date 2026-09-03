import { useNavigate } from 'react-router-dom';
import { ChevronRight, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useChatPrefs } from '@/hooks/useChatSkin';
import { WALLPAPERS, saveChatPrefs, type Wallpaper } from '@/lib/chatPrefs';

/**
 * Chat look from inside a room: the whole screen, plus a wallpaper that
 * applies to this room only. Cosmetic, and only this person sees it.
 */
export function RoomLookRow({ slug, onLeave }: { slug: string; onLeave?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefs = useChatPrefs();
  const override = prefs.room_overrides[slug] ?? null;

  const setOverride = async (key: Wallpaper | null) => {
    const next = { ...prefs.room_overrides };
    if (key) next[slug] = key;
    else delete next[slug];
    await saveChatPrefs({ room_overrides: next }, user?.id);
  };

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border/60 p-3">
      <button
        type="button"
        onClick={() => {
          onLeave?.();
          navigate('/app/chat-look');
        }}
        className="flex min-h-[44px] w-full items-center gap-2 text-[13px] font-semibold text-foreground"
      >
        <Palette className="h-4 w-4" />
        Chat look
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>

      <p className="text-[12px] text-muted-foreground">
        Wallpaper for this room only. Yours to see, nobody else's.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void setOverride(null)}
          aria-pressed={override === null}
          className={cn(
            'min-h-11 rounded-full border px-4 text-[13px]',
            override === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground'
          )}
        >
          Use my default
        </button>
        {WALLPAPERS.filter((w) => w.key !== 'photo' || prefs.wallpaper_path).map((w) => (
          <button
            key={w.key}
            type="button"
            onClick={() => void setOverride(w.key)}
            aria-pressed={override === w.key}
            className={cn(
              'min-h-11 rounded-full border px-4 text-[13px]',
              override === w.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground'
            )}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}
