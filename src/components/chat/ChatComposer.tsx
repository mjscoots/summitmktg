import { useEffect, useState, useRef } from 'react';
import { ArrowUp, Plus, Image, Paperclip, BarChart3, Smile, X, Reply, Loader2, Mic, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { buildVoiceMessage, MAX_VOICE_SECONDS, pickAudioMime, voiceRecordingSupported } from '@/components/chat/VoiceNote';
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
  ['⚔️ Work mode', '💰 Money time', '🏆 Champions only'],
  ['🔥 No days off', '✅ Let\'s eat', '⛰️ Peak energy'],
  ['💪 Locked in', '🚀 Full send', '👑 Stay hungry'],
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
  onSendVoice?: (content: string) => Promise<void> | void;
  mentionables?: { user_id: string; full_name: string }[];
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
  onSendVoice,
  mentionables = [],
}: ChatComposerProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const chips = getDailyChips();
  const canRecord = !!onSendVoice && voiceRecordingSupported();

  // --- @mention autocomplete ---
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionMatches =
    mentionQuery === null
      ? []
      : mentionables
          .filter(m => m.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 5);

  const detectMention = (value: string) => {
    const match = /(?:^|\s)@([\w'-]*(?: [\w'-]*)?)$/.exec(value);
    setMentionQuery(match ? match[1] : null);
    setMentionIndex(0);
  };

  const applyMention = (name: string) => {
    const next = input.replace(/(^|\s)@([\w'-]*(?: [\w'-]*)?)$/, `$1@${name} `);
    onInputChange(next);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  // --- voice notes ---
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      setRecordSeconds(prev => {
        if (prev + 1 >= MAX_VOICE_SECONDS) {
          recorderRef.current?.state === 'recording' && recorderRef.current.stop();
          return MAX_VOICE_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const startRecording = async () => {
    if (!canRecord || !user || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickAudioMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const seconds = recordSecondsRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanupStream();
        setRecording(false);
        setRecordSeconds(0);
        if (cancelledRef.current || blob.size === 0 || seconds < 1) return;
        setUploading(true);
        try {
          const ext = (recorder.mimeType || '').includes('mp4') ? 'm4a' : 'webm';
          const path = `${user.id}/voice-${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from('chat-uploads').upload(path, blob, {
            contentType: recorder.mimeType || 'audio/webm',
          });
          if (error) throw error;
          const { data } = supabase.storage.from('chat-uploads').getPublicUrl(path);
          await onSendVoice?.(buildVoiceMessage(data.publicUrl, seconds));
        } catch {
          toast.error('Failed to send voice note');
        } finally {
          setUploading(false);
        }
      };
      recorder.start();
      setRecordSeconds(0);
      setRecording(true);
    } catch {
      cleanupStream();
      toast.error('Microphone unavailable. Check browser permissions.');
    }
  };

  const stopRecording = (cancel = false) => {
    cancelledRef.current = cancel;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    else { cleanupStream(); setRecording(false); setRecordSeconds(0); }
  };

  const recordSecondsRef = useRef(0);
  recordSecondsRef.current = recordSeconds;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % mentionMatches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + mentionMatches.length) % mentionMatches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(mentionMatches[mentionIndex].full_name); return; }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
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

      {/* Recording status */}
      {recording && (
        <div className="mx-3 mt-1.5 flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5">
          <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-destructive" />
          <span className="text-[11px] font-semibold text-foreground">
            Recording {recordSeconds}s <span className="font-normal text-muted-foreground">/ {MAX_VOICE_SECONDS}s</span>
          </span>
          <button onClick={() => stopRecording(true)} className="ml-auto text-[11px] font-semibold text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      )}

      {/* Quick chips - small pills */}
      {!input && !showDrawer && !recording && (
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

      {/* @mention autocomplete */}
      {mentionMatches.length > 0 && (
        <div className="mx-3 mb-1 overflow-hidden rounded-2xl border border-border/20 bg-card/95 backdrop-blur-xl">
          {mentionMatches.map((m, i) => (
            <button
              key={m.user_id}
              onMouseDown={(e) => { e.preventDefault(); applyMention(m.full_name); }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors',
                i === mentionIndex ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/20'
              )}
            >
              <span className="text-primary">@</span>
              <span className="truncate">{m.full_name}</span>
            </button>
          ))}
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
            onChange={(e) => { onInputChange(e.target.value); detectMention(e.target.value); onTyping(); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Message..."
            className="flex-1 bg-transparent text-foreground text-[14px] px-4 py-2 focus:outline-none placeholder:text-muted-foreground/25"
            disabled={isSending}
          />
        </div>

        {/* Voice note - press to record, press again to send */}
        {canRecord && !input.trim() && (
          <button
            onClick={() => (recording ? stopRecording(false) : startRecording())}
            aria-label={recording ? 'Stop and send voice note' : 'Record voice note'}
            className={cn(
              'mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all',
              recording
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : 'bg-muted/30 text-muted-foreground/40 hover:text-muted-foreground/60'
            )}
            disabled={uploading}
          >
            {recording ? <Square className="h-3 w-3" /> : <Mic className="h-4 w-4" />}
          </button>
        )}

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
