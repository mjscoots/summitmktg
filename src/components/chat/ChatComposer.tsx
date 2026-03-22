import { useState, useRef } from 'react';
import { ArrowUp, Plus, Image, Paperclip, BarChart3, Smile, X, Reply, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StickerPicker, type Sticker } from '@/components/dashboard/StickerPicker';
import { GifPicker } from '@/components/dashboard/GifPicker';
import { uploadChatFile } from '@/components/dashboard/ChatImageUpload';
import { PollCreator } from '@/components/dashboard/ChatPoll';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const DAILY_CHIPS = [
  ['🔥 All gas', '✅ Locked in', '⛰️ To the top'],
  ['💪 Grind time', '🚀 Send it', '👑 We run this'],
  ['⚔️ War mode', '💰 Money time', '🏆 Champions only'],
  ['🔥 No days off', '✅ Let\'s eat', '⛰️ Peak energy'],
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      await uploadChatFile(file, user.id, onSendFile);
    } catch {
      toast.error('Failed to upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
    setShowDrawer(false);
  };

  const closeAll = () => {
    setShowDrawer(false);
    setShowGifs(false);
    setShowStickers(false);
    setShowPoll(false);
  };

  return (
    <div className="flex-shrink-0 relative bg-background/80 backdrop-blur-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[11px] text-muted-foreground/40">
            {typingUsers.length === 1 ? `${typingUsers[0].fullName} is typing` : `${typingUsers.length} people typing`}
          </span>
        </div>
      )}

      {/* Quick chips - small pills */}
      {!input && !showDrawer && (
        <div className="flex items-center gap-1 px-3 pt-1.5 pb-0.5 overflow-x-auto scrollbar-none">
          {chips.map(chip => (
            <button
              key={chip}
              onClick={() => { onInputChange(chip); onTyping(); inputRef.current?.focus(); }}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
                "bg-muted/20 text-muted-foreground/40",
                "hover:text-foreground/60 hover:bg-muted/30",
                "transition-all active:scale-95"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* + Drawer - slides up */}
      {showDrawer && (
        <div className="animate-fade-in px-4 py-3 border-t border-border/10">
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: <Image className="w-5 h-5" />, label: 'Photo', action: () => { fileRef.current?.click(); } },
              { icon: <Paperclip className="w-5 h-5" />, label: 'File', action: () => { fileRef.current?.click(); } },
              { icon: <Smile className="w-5 h-5" />, label: 'GIF', action: () => { setShowGifs(true); setShowDrawer(false); } },
              { icon: <span className="text-lg">🏔️</span>, label: 'Sticker', action: () => { setShowStickers(true); setShowDrawer(false); } },
              { icon: <BarChart3 className="w-5 h-5" />, label: 'Poll', action: () => { setShowPoll(true); setShowDrawer(false); } },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="text-primary/70">{item.icon}</div>
                <span className="text-[10px] font-medium text-muted-foreground/60">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="*/*"
        onChange={handleFileUpload}
      />

      {/* Pickers */}
      {showGifs && <GifPicker onSelect={(url) => { onSendGif(url); closeAll(); }} onClose={closeAll} />}
      {showStickers && <StickerPicker onSelect={(s) => { onSendSticker(s); closeAll(); }} onClose={closeAll} />}
      {showPoll && <PollCreator onSubmit={(q, o) => { onCreatePoll(q, o); closeAll(); }} onClose={closeAll} />}

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 mx-3 mt-1.5 px-3 py-1.5 bg-primary/5 rounded-t-2xl border border-b-0 border-primary/10">
          <Reply className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="text-[11px] font-medium text-foreground/50 truncate flex-1">
            {replyingTo.full_name}: {replyingTo.content.slice(0, 60)}
          </span>
          <button onClick={onCancelReply} className="text-muted-foreground/30 hover:text-foreground transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input row - iMessage style */}
      <div className={cn("flex items-end gap-1.5 px-2 py-2", replyingTo && "pt-0")}>
        {/* + button */}
        <button
          onClick={() => { setShowDrawer(!showDrawer); setShowGifs(false); setShowStickers(false); setShowPoll(false); }}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 mb-0.5",
            showDrawer
              ? "bg-primary/20 text-primary rotate-45"
              : "bg-muted/30 text-muted-foreground/40 hover:text-muted-foreground/60"
          )}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </button>

        {/* Text input pill */}
        <div className={cn(
          "flex-1 flex items-center bg-muted/20 border border-border/20 rounded-full",
          "focus-within:border-primary/20 focus-within:bg-muted/30 transition-all",
          replyingTo && "rounded-t-none rounded-b-full"
        )}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { onInputChange(e.target.value); onTyping(); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Message..."
            className="flex-1 bg-transparent text-foreground text-[14px] px-4 py-2 focus:outline-none placeholder:text-muted-foreground/25"
            disabled={isSending}
          />
        </div>

        {/* Send button - circular with up arrow */}
        <button
          onClick={onSend}
          disabled={!input.trim() || isSending}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 mb-0.5",
            input.trim()
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-90"
              : "bg-muted/20 text-muted-foreground/15"
          )}
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
