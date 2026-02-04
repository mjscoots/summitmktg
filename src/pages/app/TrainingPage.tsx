import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { WelcomeBanner } from '@/components/training/WelcomeBanner';
import { BookOpen, Users, Sparkles, Bot, Lock, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type TrainingView = 'selection' | 'rookie' | 'manager';

export default function TrainingPage() {
  const { role, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<TrainingView>('selection');
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [aiCoachUnlocked, setAiCoachUnlocked] = useState(false);
  const [managerManualComplete, setManagerManualComplete] = useState(false);
  
  const isManager = role === 'manager' || role === 'admin';

  // Check if required sections are complete to unlock AI Coach
  useEffect(() => {
    const checkRequiredProgress = async () => {
      if (!user) return;

      try {
        // For rookies: Learn Your Pitch + Summer Sales Manual
        // For managers: Manager Manual + Recruiting Resources (learn-the-basics)
        const requiredSlugs = isManager 
          ? ['manager-manual', 'learn-the-basics']
          : ['learn-your-pitch', 'summer-sales-manual'];

        const { data: courses } = await supabase
          .from('training_courses')
          .select('id, slug')
          .in('slug', requiredSlugs)
          .eq('is_active', true);

        if (!courses || courses.length < 2) {
          setAiCoachUnlocked(false);
          return;
        }

        let allComplete = true;

        for (const course of courses) {
          const { data: modules } = await supabase
            .from('training_modules')
            .select('id')
            .eq('course_id', course.id)
            .eq('is_active', true);

          const moduleIds = modules?.map(m => m.id) || [];
          if (moduleIds.length === 0) continue;

          const { data: lessons } = await supabase
            .from('training_lessons')
            .select('id')
            .in('module_id', moduleIds)
            .eq('is_active', true);

          const lessonIds = lessons?.map(l => l.id) || [];
          if (lessonIds.length === 0) continue;

          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds)
            .not('completed_at', 'is', null);

          if ((progress?.length || 0) < lessonIds.length) {
            allComplete = false;
            break;
          }
        }

        setAiCoachUnlocked(allComplete);
      } catch (err) {
        console.error('Error checking progress:', err);
      }
    };

    checkRequiredProgress();
  }, [user, isManager]);

  // Check if Manager Manual is complete (for Recruiting Resources lock)
  useEffect(() => {
    const checkManagerManualProgress = async () => {
      if (!user || !isManager) return;

      try {
        const { data: course } = await supabase
          .from('training_courses')
          .select('id')
          .eq('slug', 'manager-manual')
          .eq('is_active', true)
          .maybeSingle();

        if (!course) {
          setManagerManualComplete(false);
          return;
        }

        const { data: modules } = await supabase
          .from('training_modules')
          .select('id')
          .eq('course_id', course.id)
          .eq('is_active', true);

        const moduleIds = modules?.map(m => m.id) || [];
        if (moduleIds.length === 0) {
          setManagerManualComplete(false);
          return;
        }

        const { data: lessons } = await supabase
          .from('training_lessons')
          .select('id')
          .in('module_id', moduleIds)
          .eq('is_active', true);

        const lessonIds = lessons?.map(l => l.id) || [];
        if (lessonIds.length === 0) {
          setManagerManualComplete(false);
          return;
        }

        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds)
          .not('completed_at', 'is', null);

        setManagerManualComplete((progress?.length || 0) >= lessonIds.length);
      } catch (err) {
        console.error('Error checking manager manual progress:', err);
      }
    };

    checkManagerManualProgress();
  }, [user, isManager]);

  // Fetch user's lesson completion count
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      const { count } = await supabase
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      setLessonsCompleted(count || 0);
    };

    fetchProgress();
  }, [user]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  // For rookies, go straight to rookie training (no AI Coach here)
  if (!isManager && view === 'selection') {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Welcome Banner for new users */}
          {showWelcome && lessonsCompleted < 15 && (
            <WelcomeBanner
              userName={user?.user_metadata?.full_name}
              lessonsCompleted={lessonsCompleted}
              onDismiss={() => setShowWelcome(false)}
            />
          )}

          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-5 h-5 text-success" />
            <h1 className="text-xl font-bold text-foreground">
              Rookie Training
            </h1>
          </div>

          <TrainingTiles filterRole="rookie" />

          {/* AI Coach Tile for Rookies */}
          <div className="mt-6">
            <AICoachTile isLocked={!aiCoachUnlocked} isRookie={true} />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Selection view for managers - AI Coach lives HERE ONLY
  if (view === 'selection') {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              Select Training
            </h1>
          </div>

          {/* Two Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Rookie Training Card */}
            <button
              onClick={() => setView('rookie')}
              className="group relative p-6 bg-card rounded-xl border-2 border-success/30 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-success/60 hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.4)] text-left"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-success/15 text-success border border-success/30">
                  ROOKIE
                </span>
              </div>

              <div className="p-3 rounded-xl bg-success/15 text-success w-fit mb-4 group-hover:bg-success/25 transition-colors">
                <BookOpen className="w-8 h-8" />
              </div>

              <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-success transition-colors">
                Rookie Training
              </h2>
              
              <p className="text-sm text-muted-foreground">
                Learn Your Pitch, Summer Sales Manual, Videos
              </p>
            </button>

            {/* Manager Training Card */}
            <button
              onClick={() => setView('manager')}
              className="group relative p-6 bg-card rounded-xl border-2 border-primary/30 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-primary/60 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.4)] text-left"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  MANAGER
                </span>
              </div>

              <div className="p-3 rounded-xl bg-primary/15 text-primary w-fit mb-4 group-hover:bg-primary/25 transition-colors">
                <Users className="w-8 h-8" />
              </div>

              <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                Manager Training
              </h2>
              
              <p className="text-sm text-muted-foreground">
                Manager Manual, Recruiting Resources, Manager Videos
              </p>
            </button>
          </div>

          {/* AI Coach Tile - ONLY appears on selection screen */}
          <div className="mt-6">
            <AICoachTile isLocked={!aiCoachUnlocked} isRookie={false} />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Training content view (rookie or manager) - NO AI Coach here
  const isRookieView = view === 'rookie';
  
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back button for managers - TOP LEFT */}
        {isManager && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('selection')}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}

        {/* Welcome Banner for rookie view */}
        {isRookieView && showWelcome && lessonsCompleted < 15 && (
          <WelcomeBanner
            userName={user?.user_metadata?.full_name}
            lessonsCompleted={lessonsCompleted}
            onDismiss={() => setShowWelcome(false)}
          />
        )}

        <div className="flex items-center gap-3 mb-6">
          <Sparkles className={cn(
            "w-5 h-5",
            isRookieView ? "text-success" : "text-primary"
          )} />
          <h1 className="text-xl font-bold text-foreground">
            {isRookieView ? 'Rookie' : 'Manager'} Training
          </h1>
        </div>

        <TrainingTiles 
          filterRole={isRookieView ? 'rookie' : 'manager'} 
          managerManualComplete={isRookieView ? true : managerManualComplete}
        />
        
        {/* NO AI Coach in training content views */}
      </div>
    </AppLayout>
  );
}

// AI Coach Tile Component
function AICoachTile({ isLocked, isRookie }: { isLocked: boolean; isRookie: boolean }) {
  return (
    <div 
      className={cn(
        "relative p-5 bg-card rounded-xl border transition-all",
        isLocked 
          ? "border-border/50 opacity-60 cursor-not-allowed"
          : isRookie
            ? "border-success/40 hover:border-success/60 cursor-pointer hover:shadow-[0_0_25px_-8px_rgba(34,197,94,0.3)]"
            : "border-primary/40 hover:border-primary/60 cursor-pointer hover:shadow-[0_0_25px_-8px_rgba(59,130,246,0.3)]"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-xl",
          isLocked 
            ? "bg-muted text-muted-foreground" 
            : isRookie 
              ? "bg-success/15 text-success" 
              : "bg-primary/15 text-primary"
        )}>
          {isLocked ? <Lock className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-foreground">AI Coach</h3>
          <p className="text-sm text-muted-foreground">
            {isLocked 
              ? `Complete ${isRookie ? 'Learn Your Pitch & Summer Sales Manual' : 'Manager Manual & Recruiting Resources'} to unlock`
              : 'Your personal training assistant'
            }
          </p>
        </div>

        {isLocked && (
          <div className="absolute top-3 right-3">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-muted text-muted-foreground">
              LOCKED
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
