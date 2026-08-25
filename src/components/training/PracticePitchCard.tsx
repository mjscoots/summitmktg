import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic } from 'lucide-react';
import { PitchRecordingModal } from '@/components/training/PitchRecordingModal';

export function PracticePitchCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pitch_approval_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .is('lesson_id', null);
    const rows = data || [];
    setAttempts(rows.length);
    setPending(rows.some((r) => r.status === 'pending'));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-card/60 backdrop-blur-sm p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 text-primary flex-shrink-0">
          <Mic className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">Practice pitch</h3>
            {pending && <Badge variant="outline" className="text-[10px]">Awaiting review</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record up to 2 minutes and send it to your manager for feedback. Not tied to a lesson.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="flex-shrink-0">
          Record
        </Button>
      </div>

      {open && (
        <PitchRecordingModal
          open={open}
          onClose={() => setOpen(false)}

          lessonId={null}
          lessonTitle="Practice pitch"
          attemptNumber={attempts + 1}
          maxDurationSeconds={120}
          maxFileSizeMb={200}
          onSubmitted={() => { setOpen(false); load(); }}
        />
      )}
    </>
  );
}

export default PracticePitchCard;
