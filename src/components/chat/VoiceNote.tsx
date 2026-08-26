import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { useChatAttachmentUrl } from '@/lib/chatAttachments';
import { cn } from '@/lib/utils';


const VOICE_PREFIX = 'voice:';

export const MAX_VOICE_SECONDS = 60;

export function isVoiceMessage(content: string) {
  return content.startsWith(VOICE_PREFIX);
}

/** content format: voice:<seconds>:<url> */
export function getVoiceInfo(content: string): { url: string; seconds: number } | null {
  if (!isVoiceMessage(content)) return null;
  const rest = content.slice(VOICE_PREFIX.length);
  const sep = rest.indexOf(':');
  if (sep === -1) return null;
  const seconds = parseInt(rest.slice(0, sep), 10);
  const url = rest.slice(sep + 1);
  if (!url) return null;
  return { url, seconds: Number.isFinite(seconds) ? seconds : 0 };
}

export function buildVoiceMessage(url: string, seconds: number) {
  return `${VOICE_PREFIX}${Math.max(1, Math.round(seconds))}:${url}`;
}

export function voiceRecordingSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function pickAudioMime() {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      // ignore
    }
  }
  return '';
}

function formatSeconds(total: number) {
  const s = Math.max(0, Math.round(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Playable voice-note bubble. */
export function VoiceNoteBubble({ url, seconds, isOwn }: { url: string; seconds: number; isOwn?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const { url: signed } = useChatAttachmentUrl(url);



  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setElapsed(audio.currentTime);
    const onEnd = () => { setPlaying(false); setElapsed(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); return; }
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const pct = seconds > 0 ? Math.min(100, (elapsed / seconds) * 100) : 0;

  return (
    <div className="flex items-center gap-2.5 min-w-[150px] max-w-[220px]">
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-transform active:scale-90',
          isOwn ? 'bg-background/25' : 'bg-primary/20 text-primary'
        )}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="h-1 w-full overflow-hidden rounded-full bg-current/20">
          <div className="h-full rounded-full bg-current/70 transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] opacity-60">
          <Mic className="h-2.5 w-2.5" />
          {formatSeconds(playing || elapsed > 0 ? seconds - elapsed : seconds)}
        </div>
      </div>
    </div>
  );
}
