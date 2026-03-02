import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Loader2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VideoNotesPanelProps {
  videoId: string;
}

export function VideoNotesPanel({ videoId }: VideoNotesPanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialNotesRef = useRef('');

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
    // Don't save if nothing changed from initial load
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">My Notes</h3>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Take notes while watching... (auto-saves)"
        className="flex-1 min-h-[300px] lg:min-h-[400px] resize-none font-mono text-sm bg-background"
      />
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{notes.length} characters</span>
        <span className="flex items-center gap-1">
          {isSaving ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
          ) : lastSaved ? (
            <><Check className="w-3 h-3 text-success" /> Saved {formatDistanceToNow(new Date(lastSaved))} ago</>
          ) : (
            'Type to start taking notes'
          )}
        </span>
      </div>
    </div>
  );
}
