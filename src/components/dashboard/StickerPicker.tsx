import { cn } from '@/lib/utils';

export interface Sticker {
  id: string;
  label: string;
  src: string;
}

export const SUMMIT_STICKERS: Sticker[] = [
  { id: 'lets-go', label: "Let's Go!", src: '/stickers/lets-go.png' },
  { id: 'fired-up', label: 'Fired Up!', src: '/stickers/fired-up.png' },
  { id: 'winner', label: 'Winner!', src: '/stickers/winner.png' },
  { id: 'knock-knock', label: 'Knock Knock!', src: '/stickers/knock-knock.png' },
  { id: 'to-the-top', label: 'To the Top!', src: '/stickers/to-the-top.png' },
  { id: 'close-it', label: 'Close It!', src: '/stickers/close-it.png' },
  { id: 'nice-work', label: 'Nice Work!', src: '/stickers/nice-work.png' },
  { id: 'summit', label: 'Summit!', src: '/stickers/summit.png' },
  { id: 'lol', label: 'LOL', src: '/stickers/lol.png' },
  { id: 'go-go-go', label: 'Go Go Go!', src: '/stickers/go-go-go.png' },
  { id: 'grind-time', label: 'Grind Time', src: '/stickers/grind-time.png' },
  { id: 'first-sale', label: 'First Sale!', src: '/stickers/first-sale.png' },
  { id: 'beast-mode', label: 'Beast Mode', src: '/stickers/beast-mode.png' },
  { id: 'send-it', label: 'Send It!', src: '/stickers/send-it.png' },
  { id: 'no-days-off', label: 'No Days Off', src: '/stickers/no-days-off.png' },
  { id: 'money-time', label: 'Money Time', src: '/stickers/money-time.png' },
  { id: 'crushed-it', label: 'Crushed It!', src: '/stickers/crushed-it.png' },
  { id: 'good-morning', label: 'Good Morning', src: '/stickers/good-morning.png' },
  { id: 'hot-streak', label: 'Hot Streak', src: '/stickers/hot-streak.png' },
  { id: 'game-day', label: 'Game Day', src: '/stickers/game-day.png' },
];

export const STICKER_PREFIX = 'sticker:';

export function isStickerMessage(content: string): boolean {
  return content.startsWith(STICKER_PREFIX);
}

export function getStickerFromMessage(content: string): Sticker | null {
  if (!isStickerMessage(content)) return null;
  const id = content.slice(STICKER_PREFIX.length);
  return SUMMIT_STICKERS.find(s => s.id === id) || null;
}

interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void;
  onClose: () => void;
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  return (
    <div className="absolute bottom-full mb-2 right-0 w-[320px] bg-card border border-border rounded-xl shadow-xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Summit Stickers</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
      <div className="grid grid-cols-5 gap-1 p-2 max-h-[240px] overflow-y-auto">
        {SUMMIT_STICKERS.map(sticker => (
          <button
            key={sticker.id}
            onClick={() => onSelect(sticker)}
            className="aspect-square rounded-lg hover:bg-muted/60 transition-colors p-1.5 group relative"
            title={sticker.label}
          >
            <img
              src={sticker.src}
              alt={sticker.label}
              className="w-full h-full object-contain rounded group-hover:scale-110 transition-transform"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
