import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { useChatAttachmentUrl } from '@/lib/chatAttachments';

/**
 * Video in a bubble: first tap plays muted in place, second tap goes full
 * screen. Never autoplays.
 */
export function ChatVideo({ path }: { path: string }) {
  const { url, failed } = useChatAttachmentUrl(path);
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  if (failed) return <p className="text-xs text-muted-foreground">Video unavailable</p>;
  if (!url) return <div className="h-[180px] w-[240px] animate-pulse rounded-lg bg-muted/40" />;

  const handleClick = () => {
    const el = ref.current;
    if (!el) return;
    if (!started) {
      el.muted = true;
      void el.play();
      setStarted(true);
      return;
    }
    const anyEl = el as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    if (anyEl.webkitEnterFullscreen) anyEl.webkitEnterFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
  };

  return (
    <div className="relative w-[240px] overflow-hidden rounded-lg bg-black/40">
      <video
        ref={ref}
        src={url}
        preload="metadata"
        playsInline
        controls={started}
        onClick={handleClick}
        className="max-h-[280px] w-full"
      />
      {!started && (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/25"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white">
            <Play className="h-6 w-6" />
          </span>
        </button>
      )}
    </div>
  );
}
