import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mountain, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CompletionCelebrationProps {
  percentage: number;
}

export function CompletionCelebration({ percentage }: CompletionCelebrationProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#3b82f6', '#22c55e', '#f59e0b'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#3b82f6', '#22c55e', '#f59e0b'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  useEffect(() => {
    const checkCompletion = async () => {
      if (!user?.id || percentage < 100 || hasChecked) return;
      setHasChecked(true);

      // Check if completion was already celebrated
      const { data: existing } = await supabase
        .from('user_training_achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('badge_type', 'completion_celebrated')
        .maybeSingle();

      if (existing) return; // Already celebrated

      // Record celebration flag
      await supabase
        .from('user_training_achievements')
        .upsert(
          { user_id: user.id, badge_type: 'completion_celebrated' },
          { onConflict: 'user_id,badge_type' }
        );

      // Trigger celebration
      setShowModal(true);
      fireConfetti();
    };

    checkCompletion();
  }, [percentage, user?.id, hasChecked, fireConfetti]);

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md bg-card border-primary/30 text-center">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="p-4 rounded-full bg-primary/15">
            <Mountain className="w-12 h-12 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              CONGRATULATIONS
            </h2>
            <Sparkles className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-muted-foreground text-sm max-w-xs">
            You've completed The Academy. Your dedication sets you apart.
          </p>
          <Button
            onClick={() => setShowModal(false)}
            className="mt-2 font-bold"
          >
            Continue Mastery
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
