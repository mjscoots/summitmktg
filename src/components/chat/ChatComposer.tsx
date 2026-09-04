import { useEffect, useState, useRef } from 'react';
import { ArrowUp, Plus, Image, Paperclip, BarChart3, Smile, X, Reply, Loader2, Mic, Square, Sticker, Camera, RotateCw, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { buildVoiceMessage, MAX_VOICE_SECONDS, pickAudioMime, voiceRecordingSupported } from '@/components/chat/VoiceNote';
import { cn } from '@/lib/utils';
import { StickerPicker } from '@/components/dashboard/StickerPicker';
import { GifPicker } from '@/components/dashboard/GifPicker';
import { uploadChatFile } from '@/components/dashboard/ChatImageUpload';
import { PollCreator } from '@/components/dashboard/ChatPoll';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { measureKeyboardOffset, setComposerKeyboard, useComposerKeyboard } from '@/lib/composerKeyboard';
import { prepareChatImage } from '@/lib/chatImage';
import {
  MAX_MEDIA_PER_SEND,
  MAX_VIDEO_BYTES,
  buildImagesMessage,
  buildVideoMessage,
  capturePosterFrame,
  isVideoFile,
} from '@/lib/chatMedia';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';

type TrayStatus = 'ready' | 'uploading' | 'done' | 'error';

interface TrayItem {
  id: string;
  file: File;
  kind: 'image' | 'video' | 'file';
  preview: string | null;
  status: TrayStatus;
  path?: string;
}

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
  /** Composer prompt, e.g. "Message Legion Mafia". */
  placeholder?: string;
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
  placeholder,
}: ChatComposerProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [showAttach, setShowAttach] = useState(false);
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [sendingTray, setSendingTray] = useState(false);
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
  const canRecord = !!onSendVoice && voiceRecordingSupported();

  // Keyboard tracking: while the input is focused the bottom nav hides and the
  // composer is pinned to the visual viewport so it sits above the keyboard.
  const { focused, offset: keyboardOffset } = useComposerKeyboard();
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !focused) return;
    const sync = () => setComposerKeyboard({ offset: measureKeyboardOffset() });
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [focused]);
  useEffect(() => () => setComposerKeyboard({ focused: false, offset: 0 }), []);

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
          // Private bucket: store the object path, signed at read time.
          await onSendVoice?.(buildVoiceMessage(path, seconds));

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

  const trayRef = useRef<TrayItem[]>([]);
  const sendTrayRef = useRef<() => Promise<void>>(async () => {});
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
      if (trayRef.current.length > 0) void sendTrayRef.current();
      else onSend();
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

  // --- attachment tray ---
  const addFiles = (files: File[]) => {
    const room = MAX_MEDIA_PER_SEND - tray.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_MEDIA_PER_SEND} at a time`);
      return;
    }
    const picked = files.slice(0, room);
    const next: TrayItem[] = [];
    for (const file of picked) {
      const video = isVideoFile(file);
      if (video && file.size > MAX_VIDEO_BYTES) {
        toast.error('Videos up to 50 MB');
        continue;
      }
      const kind: TrayItem['kind'] = video ? 'video' : file.type.startsWith('image/') ? 'image' : 'file';
      const item: TrayItem = {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        kind,
        preview: kind === 'image' ? URL.createObjectURL(file) : null,
        status: 'ready',
      };
      next.push(item);
      if (kind === 'video') {
        void capturePosterFrame(file).then((poster) => {
          if (poster) setTray((prev) => prev.map((t) => (t.id === item.id ? { ...t, preview: poster } : t)));
        });
      }
    }
    if (next.length) setTray((prev) => [...prev, ...next]);
    setShowAttach(false);
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length) addFiles(files);
  };

  const removeTrayItem = (id: string) => setTray((prev) => prev.filter((t) => t.id !== id));

  const uploadTrayItem = async (item: TrayItem): Promise<string | null> => {
    if (!user) return null;
    const prepared = item.kind === 'image' ? await prepareChatImage(item.file) : null;
    const ext = prepared ? prepared.ext : item.file.name.split('.').pop() || 'bin';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const body = prepared
      ? prepared.blob
      : new Blob([await item.file.arrayBuffer()], { type: item.file.type || 'application/octet-stream' });
    const { error } = await supabase.storage
      .from('chat-uploads')
      .upload(path, body, { contentType: body.type || 'application/octet-stream' });
    if (error) return null;
    return path;
  };

  const sendTray = async () => {
    if (!user || sendingTray || tray.length === 0) return;
    setSendingTray(true);
    const uploaded: TrayItem[] = [];
    for (const item of tray) {
      if (item.status === 'done' && item.path) { uploaded.push(item); continue; }
      setTray((prev) => prev.map((t) => (t.id === item.id ? { ...t, status: 'uploading' } : t)));
      const path = await uploadTrayItem(item);
      if (!path) {
        setTray((prev) => prev.map((t) => (t.id === item.id ? { ...t, status: 'error' } : t)));
        setSendingTray(false);
        toast.error('That upload failed');
        return;
      }
      const done: TrayItem = { ...item, status: 'done', path };
      uploaded.push(done);
      setTray((prev) => prev.map((t) => (t.id === item.id ? done : t)));
    }

    // Pick order is kept. Photos picked together travel as one grid message,
    // sent at the place the first of them was picked.
    const photos = uploaded.filter((t) => t.kind === 'image').map((t) => t.path!) as string[];
    let photosSent = false;
    try {
      for (const item of uploaded) {
        if (item.kind === 'image') {
          if (photosSent) continue;
          photosSent = true;
          if (photos.length > 1) await onSendFile(buildImagesMessage(photos));
          else await onSendFile(`img:${photos[0]}`);
          continue;
        }
        if (item.kind === 'video') await onSendFile(buildVideoMessage(item.path!));
        if (item.kind === 'file') {
          await onSendFile(`file:${JSON.stringify({ url: item.path, name: item.file.name, size: item.file.size })}`);
        }
      }
      // The caption stays in the box until its own send succeeds.
      const caption = input.trim();
      if (caption) {
        await onSendFile(caption);
        onInputChange('');
      }
      tray.forEach((t) => { if (t.preview?.startsWith('blob:')) URL.revokeObjectURL(t.preview); });
      setTray([]);
    } catch {
      toast.error('That did not send. Try again.');
    } finally {
      setSendingTray(false);
    }
  };


  trayRef.current = tray;
  sendTrayRef.current = sendTray;

  const attachActions = [
    { icon: <Camera className="h-5 w-5" />, label: 'Camera', action: () => cameraRef.current?.click() },
    { icon: <Image className="h-5 w-5" />, label: 'Photos and videos', action: () => imageRef.current?.click() },
    { icon: <Paperclip className="h-5 w-5" />, label: 'Document', action: () => fileRef.current?.click() },
    { icon: <BarChart3 className="h-5 w-5" />, label: 'Poll', action: () => { setShowAttach(false); setShowPoll(true); } },
    { icon: <Smile className="h-5 w-5" />, label: 'GIF', action: () => { setShowAttach(false); setShowGifs(true); } },
    { icon: <Sticker className="h-5 w-5" />, label: 'Sticker', action: () => { setShowAttach(false); setShowStickers(true); } },
  ];

  const closeAll = () => {
    setShowAttach(false);
    setShowGifs(false);
    setShowStickers(false);
    setShowPoll(false);
  };

  return (
    <div
      className="relative flex-shrink-0 bg-background/80 backdrop-blur-2xl"
      style={{ transform: keyboardOffset ? `translateY(-${keyboardOffset}px)` : undefined }}
    >
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

      {/* Attach menu: bottom sheet on phone, popover on desktop */}
      {isMobile ? (
        <Sheet open={showAttach} onOpenChange={setShowAttach}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-[15px]">Attach</SheetTitle>
            </SheetHeader>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {attachActions.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted/20 p-3 text-center transition-colors hover:bg-muted/40"
                >
                  <span className="text-primary">{item.icon}</span>
                  <span className="text-[12px] font-medium text-muted-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={showAttach} onOpenChange={setShowAttach}>
          <PopoverTrigger asChild>
            <span className="pointer-events-none absolute bottom-12 left-4 h-0 w-0" />
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-[240px] p-2">
            <div className="flex flex-col">
              {attachActions.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-left text-[13px] text-foreground transition-colors hover:bg-muted/40"
                >
                  <span className="text-primary">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Preview tray */}
      {tray.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-border/10 px-3 py-2">
          {tray.map((item) => (
            <div key={item.id} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted/30">
              {item.preview ? (
                <img src={item.preview} alt={item.file.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
                  {item.file.name.slice(0, 18)}
                </span>
              )}
              {item.kind === 'video' && item.status !== 'uploading' && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Play className="h-5 w-5 text-white drop-shadow" />
                </span>
              )}
              <button
                type="button"
                onClick={() => removeTrayItem(item.id)}
                aria-label={`Remove ${item.file.name}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3 w-3" />
              </button>
              {item.status === 'uploading' && (
                <span className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-black/40">
                  <span className="block h-full w-1/2 animate-pulse bg-primary" />
                </span>
              )}
              {item.status === 'error' && (
                <button
                  type="button"
                  onClick={() => void sendTray()}
                  className="absolute inset-x-0 bottom-0 flex min-h-[22px] items-center justify-center gap-1 bg-destructive/85 text-[10px] font-semibold text-destructive-foreground"
                >
                  <RotateCw className="h-3 w-3" /> Retry
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handlePick} />
      <input
        ref={imageRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/mp4,video/quicktime,video/webm"
        onChange={handlePick}
      />
      <input ref={fileRef} type="file" className="hidden" accept="*/*" onChange={handlePick} />

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
          onClick={() => { setShowAttach(!showAttach); setShowGifs(false); setShowStickers(false); setShowPoll(false); }}
          aria-label="Attach"
          className={cn(
            "h-11 w-11 flex items-center justify-center rounded-full transition-all flex-shrink-0",
            showAttach
              ? "bg-primary/20 text-primary rotate-45"
              : "bg-muted/30 text-muted-foreground/40 hover:text-muted-foreground/60"
          )}
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
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
            onFocus={() => setComposerKeyboard({ focused: true, offset: measureKeyboardOffset() })}
            onBlur={() => setComposerKeyboard({ focused: false, offset: 0 })}
            placeholder={placeholder || "Message..."}
            className="chat-text flex-1 bg-transparent text-foreground px-4 py-2 focus:outline-none placeholder:text-muted-foreground/25"
            disabled={isSending}
          />
        </div>

        {/* Voice note - press to record, press again to send */}
        {canRecord && !input.trim() && (
          <button
            onClick={() => (recording ? stopRecording(false) : startRecording())}
            aria-label={recording ? 'Stop and send voice note' : 'Record voice note'}
            className={cn(
              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all',
              recording
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : 'bg-muted/30 text-muted-foreground/40 hover:text-muted-foreground/60'
            )}
            disabled={uploading}
          >
            {recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
          </button>
        )}

        {/* Send button - circular with up arrow */}
        <button
          onClick={() => (tray.length > 0 ? void sendTray() : onSend())}
          aria-label="Send"
          disabled={tray.length > 0 ? sendingTray || tray.some((t) => t.status === 'uploading') : !input.trim() || isSending}
          className={cn(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-all",
            input.trim() || tray.length > 0
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-90"
              : "bg-muted/20 text-muted-foreground/15"
          )}
        >
          {isSending || sendingTray ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
          )}
        </button>

      </div>
    </div>
  );
}
