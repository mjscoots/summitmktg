import { useState, useRef } from 'react';
import { Send, Paperclip, Image, BarChart3, X, Reply, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StickerPicker, STICKER_PREFIX, type Sticker } from '@/components/dashboard/StickerPicker';
import { GifPicker } from '@/components/dashboard/GifPicker';
import { ChatImageUpload, uploadChatFile } from '@/components/dashboard/ChatImageUpload';
import { PollCreator } from '@/components/dashboard/ChatPoll';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const DAILY_CHIPS = [
  ['🔥 All gas', '✅ Let\'s eat', '⛰️ Peak energy'],
  ['💪 Grind time', '🚀 Send it', '👑 We run this'],
  ['⚔️ War mode', '💰 Money time', '🏆 Champions only'],
  ['🔥 No days off', '✅ Locked in', '⛰️ To the top'],
  ['💪 Beast mode', '🚀 Full send', '👑 Stay hungry'],
];

const getDailyChips = () => {
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_CHIPS.length;
  return DAILY_CHIPS[dayIndex];
};

interface ChatComposerProps {
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onSendFile: (content: string) => Promise<void>;
  onSendGif: (url: string) => void;
  onSendSticker: (sticker: any) => void;
  onCreatePoll: (q: string, opts: string[]) => void;
  isSending: boolean;
  replyingTo: { full_name: string; content: string } | null;
  onCancelReply: () => void;
  onTyping: () => void;
  typingUsers: { fullName: string }[];
}

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  onSendFile,
  onSendGif,
  onSendSticker,
  onCreatePoll,
  isSending,
  replyingTo,
  onCancelReply,
  onTyping,
  typingUsers,
}: ChatComposerProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showGifs, setShowGifs] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const chips = getDailyChips();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !user) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        try {
          await uploadChatFile(file, user.id, onSendFile);
          toast.success('Image uploaded');
        } catch { toast.error('Failed to upload'); }
        return;
      }
    }
  };

  return (
    <div className="flex-shrink-0 relative border-t border-border/20 bg-background/90 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[11px] text-muted-foreground/50">
            {typingUsers.length === 1 ? `${typingUsers[0].fullName} is typing` : `${typingUsers.length} people typing`}
          </span>
        </div>
      )}

      {/* Quick chips */}
      {!input && (
        <div className="flex items-center gap-1.5 px-4 pt-2 pb-1 overflow-x-auto scrollbar-none">
          {chips.map(chip => (
            <button
              key={chip}
              onClick={() => { onInputChange(chip); onTyping(); inputRef.current?.focus(); }}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium whitespace-nowrap",
                "bg-muted/30 border border-border/30 text-muted-foreground/60",
                "hover:text-foreground/80 hover:border-border/50 hover:bg-muted/50",
                "transition-all active:scale-95"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Pickers */}
      {showGifs && <GifPicker onSelect={(url) => { onSendGif(url); setShowGifs(false); }} onClose={() => setShowGifs(false)} />}
      {showStickers && <StickerPicker onSelect={(s) => { onSendSticker(s); setShowStickers(false); }} onClose={() => setShowStickers(false)} />}
      {showPoll && <PollCreator onSubmit={(q, o) => { onCreatePoll(q, o); setShowPoll(false); }} onClose={() => setShowPoll(false)} />}

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 mx-4 mt-2 px-3 py-2 bg-muted/30 rounded-t-xl border border-b-0 border-border/30">
          <Reply className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-[11px] font-medium text-foreground/60 truncate flex-1">
            {replyingTo.full_name}: {replyingTo.content.slice(0, 60)}
          </span>
          <button onClick={onCancelReply} className="text-muted-foreground/40 hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className={cn("flex items-center gap-1.5 px-3 py-2", replyingTo && "pt-0")}>
        {/* Attachment */}
        <ChatImageUpload onSend={onSendFile} />

        <button
          onClick={() => { setShowGifs(!showGifs); setShowStickers(false); setShowPoll(false); }}
          className={cn("p-2 rounded-full transition-colors flex-shrink-0", showGifs ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground")}
        >
          <Image className="w-[18px] h-[18px]" />
        </button>

        {/* Text input - iMessage pill style */}
        <div className={cn(
          "flex-1 flex items-center bg-muted/30 border border-border/30 rounded-full",
          "focus-within:border-primary/30 focus-within:bg-muted/40 transition-all",
          replyingTo && "rounded-t-none rounded-b-full"
        )}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { onInputChange(e.target.value); onTyping(); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Message the team..."
            className="flex-1 bg-transparent text-foreground text-sm px-4 py-2.5 focus:outline-none placeholder:text-muted-foreground/30"
            disabled={isSending}
          />
        </div>

        {/* Send */}
        <button
          onClick={onSend}
          disabled={!input.trim() || isSending}
          className={cn(
            "p-2.5 rounded-full transition-all flex-shrink-0",
            input.trim()
              ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90 shadow-lg shadow-primary/20"
              : "text-muted-foreground/20"
          )}
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
