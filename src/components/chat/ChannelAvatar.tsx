import { useChatAttachmentUrl } from '@/lib/chatAttachments';
import { cn } from '@/lib/utils';

/** Summit tokens only. One tone per room, picked from the room name. */
const TONES = ['--ice', '--fiber-mint', '--success', '--warning', '--primary-muted'];

function toneFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return TONES[Math.abs(hash) % TONES.length];
}

function monogram(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '#';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const SIZES = {
  sm: 'h-11 w-11 text-[13px]',
  md: 'h-12 w-12 text-[14px]',
  lg: 'h-16 w-16 text-[18px]',
};

/**
 * A group room's cover photo, or a clean monogram when no cover is set.
 * Covers live in the private chat bucket and are signed at read time.
 */
export function ChannelAvatar({
  name,
  coverPath,
  avatarUrl,
  size = 'md',
  className,
  online = false,
}: {
  name: string;
  /** Object path of the room cover, when the room has one. */
  coverPath?: string | null;
  /** Direct messages pass the other person's avatar instead. */
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Direct messages: the other person is active right now. */
  online?: boolean;
}) {
  const { url } = useChatAttachmentUrl(coverPath || null);
  const src = avatarUrl || url;
  const tone = toneFor(name || '');

  const inner = (
    <div
      className={cn(
        'relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-bold',
        SIZES[size],
        className
      )}
      style={
        src
          ? { background: 'hsl(var(--surface-elevated))' }
          : { background: `hsl(var(${tone}) / 0.18)`, color: `hsl(var(${tone}))` }
      }
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span>{monogram(name)}</span>
      )}
    </div>
  );

  if (!online) return inner;

  return (
    <div className="relative flex-shrink-0 rounded-full p-[2px]" style={{ background: 'hsl(var(--success) / 0.9)' }}>
      {inner}
    </div>
  );
}

export default ChannelAvatar;
