import { supabase } from '@/integrations/supabase/client';

/**
 * Chat look: per person, cosmetic only. Nothing here changes what anyone can
 * see or send. Read once at app load, held in memory, written through on change.
 */

export type Wallpaper = 'summit' | 'night' | 'slate' | 'forest' | 'sand' | 'ice' | 'photo';
export type BubbleColor = 'workspace' | 'classic' | 'ocean' | 'graphite' | 'ember';
export type TextSize = 'small' | 'default' | 'large';

export interface ChatPrefs {
  wallpaper: Wallpaper;
  wallpaper_path: string | null;
  bubble: BubbleColor;
  text_size: TextSize;
  room_overrides: Record<string, Wallpaper>;
}

export const WALLPAPERS: { key: Wallpaper; label: string }[] = [
  { key: 'summit', label: 'Summit' },
  { key: 'night', label: 'Night' },
  { key: 'slate', label: 'Slate' },
  { key: 'forest', label: 'Forest' },
  { key: 'sand', label: 'Sand' },
  { key: 'ice', label: 'Ice' },
  { key: 'photo', label: 'Your photo' },
];

export const BUBBLES: { key: BubbleColor; label: string }[] = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'classic', label: 'Classic' },
  { key: 'ocean', label: 'Ocean' },
  { key: 'graphite', label: 'Graphite' },
  { key: 'ember', label: 'Ember' },
];

export const TEXT_SIZES: { key: TextSize; label: string }[] = [
  { key: 'small', label: 'Small' },
  { key: 'default', label: 'Default' },
  { key: 'large', label: 'Large' },
];

/** Own bubble tint, as raw H S L so CSS can add its own alpha. */
export const BUBBLE_HSL: Record<BubbleColor, string | null> = {
  workspace: null, // falls back to the workspace accent already on the page
  classic: '142 62% 38%',
  ocean: '199 78% 44%',
  graphite: '215 12% 46%',
  ember: '18 84% 50%',
};

export const TEXT_SIZE_PX: Record<TextSize, string> = {
  small: '13px',
  default: '14px',
  large: '16px',
};

export const DEFAULT_PREFS: ChatPrefs = {
  wallpaper: 'summit',
  wallpaper_path: null,
  bubble: 'workspace',
  text_size: 'default',
  room_overrides: {},
};

let cache: ChatPrefs = { ...DEFAULT_PREFS };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getChatPrefs(): ChatPrefs {
  return cache;
}

export function subscribeChatPrefs(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const isWallpaper = (v: unknown): v is Wallpaper =>
  WALLPAPERS.some((w) => w.key === v);

/** Folds a database row into the cache. Unknown values fall back to defaults. */
export function setChatPrefsFromRow(row: unknown) {
  const r = (row || {}) as Partial<Record<keyof ChatPrefs, unknown>>;
  const overrides: Record<string, Wallpaper> = {};
  const raw = (r.room_overrides || {}) as Record<string, unknown>;
  for (const [slug, value] of Object.entries(raw)) {
    if (isWallpaper(value)) overrides[slug] = value;
  }
  cache = {
    wallpaper: isWallpaper(r.wallpaper) ? r.wallpaper : 'summit',
    wallpaper_path: typeof r.wallpaper_path === 'string' ? r.wallpaper_path : null,
    bubble: BUBBLES.some((b) => b.key === r.bubble) ? (r.bubble as BubbleColor) : 'workspace',
    text_size: TEXT_SIZES.some((t) => t.key === r.text_size) ? (r.text_size as TextSize) : 'default',
    room_overrides: overrides,
  };
  emit();
}

/** Applies a change in memory straight away, then writes it through. */
export async function saveChatPrefs(patch: Partial<ChatPrefs>, userId: string | null | undefined) {
  cache = { ...cache, ...patch };
  emit();
  if (!userId) return;
  await (supabase as any).from('chat_prefs').upsert(
    {
      user_id: userId,
      wallpaper: cache.wallpaper,
      wallpaper_path: cache.wallpaper_path,
      bubble: cache.bubble,
      text_size: cache.text_size,
      room_overrides: cache.room_overrides,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

/** Reads the row once. Safe to call for any signed in person. */
export async function loadChatPrefs(userId: string) {
  const { data } = await (supabase as any)
    .from('chat_prefs')
    .select('wallpaper, wallpaper_path, bubble, text_size, room_overrides')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) setChatPrefsFromRow(data);
}

/** The wallpaper a given room shows: its own override, else the default. */
export function wallpaperForRoom(slug: string | null | undefined): Wallpaper {
  const p = cache;
  if (slug && p.room_overrides[slug]) return p.room_overrides[slug];
  return p.wallpaper;
}
