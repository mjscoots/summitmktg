import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function ResumeTrainingCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isComplete, setIsComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const { data: courses } = await supabase
          .from('training_courses')
          .select(`id, target_role, training_modules ( id, training_lessons ( id, is_active ) )`)
          .eq('is_active', true);

        const lessonIds = new Set<string>();
        (courses || []).forEach((course: any) => {
          if (course.target_role !== null && course.target_role !== 'rookie') return;
          course.training_modules?.forEach((mod: any) => {
            mod.training_lessons?.forEach((l: any) => {
              if (l.is_active !== false) lessonIds.add(l.id);
            });
          });
        });

        const { count } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('completed_at', 'is', null);

        setIsComplete((count || 0) >= lessonIds.size && lessonIds.size > 0);
      } catch {
        setIsComplete(false);
      }
    };
    check();
  }, [user]);

  if (isComplete === null) return null;

  if (isComplete) {
    return (
      <div className="mb-5 bg-card rounded-xl border border-success/30 p-5 text-center">
        <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
        <h3 className="text-lg font-bold text-foreground">You're Fully Certified.</h3>
        <p className="text-xs text-muted-foreground mt-1">All training complete. Keep pushing.</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate('/app/training')}
      className={cn(
        "w-full mb-5 bg-card rounded-xl border border-primary/30 p-5 text-left",
        "hover:border-primary/60 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]",
        "transition-all duration-300 group",
        "animate-[pulse-glow_10s_ease-in-out_infinite]"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
          <BookOpen className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            Resume Training
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Continue where you left off</p>
        </div>
      </div>
    </button>
  );
}
