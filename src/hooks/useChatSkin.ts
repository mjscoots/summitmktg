import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BUBBLE_HSL,
  TEXT_SIZE_PX,
  getChatPrefs,
  subscribeChatPrefs,
  wallpaperForRoom,
  type ChatPrefs,
} from '@/lib/chatPrefs';

/** Re-renders whenever the person changes their chat look. */
export function useChatPrefs(): ChatPrefs {
  const [prefs, setPrefs] = useState<ChatPrefs>(getChatPrefs());
  useEffect(() => subscribeChatPrefs(() => setPrefs(getChatPrefs())), []);
  return prefs;
}

/**
 * The cosmetic skin for one room: a wallpaper class plus the bubble colour and
 * text size as CSS variables the bubbles and composer read.
 */
export function useChatSkin(slug: string | null | undefined): {
  className: string;
  style: CSSProperties;
  prefs: ChatPrefs;
} {
  const prefs = useChatPrefs();
  const wallpaper = wallpaperForRoom(slug);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (wallpaper !== 'photo' || !prefs.wallpaper_path) {
      setPhotoUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.storage
        .from('chat-wallpapers')
        .createSignedUrl(prefs.wallpaper_path as string, 60 * 60);
      if (!cancelled) setPhotoUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [wallpaper, prefs.wallpaper_path]);

  const bubble = BUBBLE_HSL[prefs.bubble];
  const style: CSSProperties = {
    ['--chat-text' as string]: TEXT_SIZE_PX[prefs.text_size],
  };
  if (bubble) style['--chat-bubble' as string] = bubble;
  if (photoUrl) style['--chat-photo' as string] = `url("${photoUrl}")`;

  return { className: `chat-wall chat-wall-${wallpaper}`, style, prefs };
}
