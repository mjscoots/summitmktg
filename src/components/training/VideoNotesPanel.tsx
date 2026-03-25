import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PenLine, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface VideoNotesPanelProps {
  videoId: string;
}

export function VideoNotesPanel({ videoId }: VideoNotesPanelProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const initialNotesRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes
  useEffect(() => {
    if (!user || !videoId) return;
    setIsLoaded(false);
    const load = async () => {
      const { data } = await supabase
        .from('video_notes')
        .select('notes, updated_at')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
      if (data) {
        setNotes(data.notes || '');
        initialNotesRef.current = data.notes || '';
        setLastSaved(data.updated_at);
      } else {
        setNotes('');
        initialNotesRef.current = '';
        setLastSaved(null);
      }
      setIsLoaded(true);
    };
    load();
  }, [user, videoId]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isLoaded || !user || !videoId) return;
    if (notes === initialNotesRef.current && lastSaved) return;
    if (notes === '' && !lastSaved) return;

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      const now = new Date().toISOString();
      await supabase
        .from('video_notes')
        .upsert({
          user_id: user.id,
          video_id: videoId,
          notes,
          updated_at: now,
        }, { onConflict: 'user_id,video_id' });
      initialNotesRef.current = notes;
      setIsSaving(false);
      setLastSaved(now);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [notes, isLoaded, user, videoId]);

  const headerContent = (
    <div
      className="flex items-center justify-between cursor-pointer select-none"
      onClick={() => isMobile && setIsExpanded(prev => !prev)}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <PenLine className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground tracking-tight">My Notes</h3>
          <p className="text-[10px] text-muted-foreground">Private • Auto-saves</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Save status pill */}
        <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted/50">
          {isSaving ? (
            <><Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" /> <span className="text-muted-foreground">Saving</span></>
          ) : lastSaved ? (
            <><Check className="w-2.5 h-2.5 text-primary" /> <span className="text-muted-foreground">Saved</span></>
          ) : (
            <span className="text-muted-foreground">No notes yet</span>
          )}
        </div>
        {isMobile && (
          isExpanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {headerContent}

      {(isExpanded || !isMobile) && (
        <div className="flex flex-col flex-1 mt-3">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Start typing your notes..."
              className="w-full min-h-[300px] lg:min-h-[360px] resize-none rounded-xl border-0 bg-muted/30 px-4 py-3.5 text-sm text-foreground leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted/40 transition-all duration-200"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif' }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {notes.length.toLocaleString()} chars
            </span>
            {lastSaved && (
              <span className="text-[10px] text-muted-foreground/60">
                {formatDistanceToNow(new Date(lastSaved))} ago
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
