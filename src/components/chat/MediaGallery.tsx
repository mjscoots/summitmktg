import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatAttachmentUrl } from '@/lib/chatAttachments';

/** One thumbnail in the grid, signed on demand. */
function Tile({
  path,
  className,
  overlay,
  onClick,
}: {
  path: string;
  className?: string;
  overlay?: string | null;
  onClick: () => void;
}) {
  const { url, failed } = useChatAttachmentUrl(path);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('relative overflow-hidden bg-muted/30', className)}
    >
      {url && !failed ? (
        <img
          src={url}
          alt="Shared photo"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
          {failed ? 'Unavailable' : ''}
        </span>
      )}
      {overlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-[18px] font-semibold text-white">
          {overlay}
        </span>
      )}
    </button>
  );
}

function Lightbox({
  paths,
  index,
  onIndex,
  onClose,
}: {
  paths: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { url } = useChatAttachmentUrl(paths[index]);
  const [startX, setStartX] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex(Math.min(paths.length - 1, index + 1));
      if (e.key === 'ArrowLeft') onIndex(Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, paths.length, onIndex, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      // Swipe to reply lives on the bubble: the lightbox keeps its own gestures.
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <button
        aria-label="Close photo"
        onClick={onClose}
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:text-white"
      >
        <X className="h-6 w-6" />
      </button>

      {url && (
        <img
          src={url}
          alt="Shared photo"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => setStartX(e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (startX === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
            if (dx < -40) onIndex(Math.min(paths.length - 1, index + 1));
            if (dx > 40) onIndex(Math.max(0, index - 1));
            setStartX(null);
          }}
          className="max-h-full max-w-full rounded-lg"
        />
      )}
      {paths.length > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={(e) => { e.stopPropagation(); onIndex(Math.max(0, index - 1)); }}
            className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:text-white"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            aria-label="Next photo"
            onClick={(e) => { e.stopPropagation(); onIndex(Math.min(paths.length - 1, index + 1)); }}
            className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:text-white"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
          <span className="absolute bottom-4 text-[12px] text-white/70">
            {index + 1} of {paths.length}
          </span>
        </>
      )}
    </div>
  );
}

/** Photos sent together, laid out like a messaging app album. */
export function MediaGallery({ paths }: { paths: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (paths.length === 0) return null;

  const shown = paths.slice(0, 4);
  const extra = paths.length - shown.length;
  const openAt = (i: number) => setOpen(i);

  let grid;
  if (paths.length === 1) {
    grid = (
      <div className="w-[240px] overflow-hidden rounded-lg">
        <Tile path={paths[0]} className="h-[240px] w-full" onClick={() => openAt(0)} />
      </div>
    );
  } else if (paths.length === 2) {
    grid = (
      <div className="grid w-[240px] grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
        {shown.map((p, i) => (
          <Tile key={p} path={p} className="h-[120px]" onClick={() => openAt(i)} />
        ))}
      </div>
    );
  } else if (paths.length === 3) {
    grid = (
      <div className="grid w-[240px] grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
        <Tile path={shown[0]} className="row-span-2 h-[180px]" onClick={() => openAt(0)} />
        <Tile path={shown[1]} className="h-[89px]" onClick={() => openAt(1)} />
        <Tile path={shown[2]} className="h-[89px]" onClick={() => openAt(2)} />
      </div>
    );
  } else {
    grid = (
      <div className="grid w-[240px] grid-cols-2 gap-0.5 overflow-hidden rounded-lg">
        {shown.map((p, i) => (
          <Tile
            key={p}
            path={p}
            className="h-[120px]"
            overlay={i === 3 && extra > 0 ? `+${extra}` : null}
            onClick={() => openAt(i)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {grid}
      {open !== null && (
        <Lightbox paths={paths} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
