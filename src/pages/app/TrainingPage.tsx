import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { WelcomeBanner } from '@/components/training/WelcomeBanner';

import { BookOpen, Users, ChevronLeft, Play, ChevronRight } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { GlobalTrainingProgress } from '@/components/training/GlobalTrainingProgress';
import { TrainingLeaderboardPanel } from '@/components/training/TrainingLeaderboardPanel';
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
  const [managerManualComplete, setManagerManualComplete] = useState(false);
  
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  useEffect(() => {
    const checkProgress = async () => {
      if (!user) return;
      try {
        const [lessonCountRes, coursesRes] = await Promise.all([
          supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .not('completed_at', 'is', null),
          isManager ? supabase
            .from('training_courses')
            .select(`id, slug, training_modules!inner ( id, is_active, training_lessons (id) )`)
            .eq('slug', 'manager-manual')
            .eq('is_active', true) : null,
        ]);

        setLessonsCompleted(lessonCountRes.count || 0);

        if (isManager && coursesRes?.data) {
          const courses = coursesRes.data;
          const allLessonIds: string[] = [];
          courses.forEach(course => {
            (course.training_modules || []).forEach(mod => {
              if (!(mod as { is_active: boolean }).is_active) return;
              ((mod as { training_lessons: { id: string }[] }).training_lessons || []).forEach(l => {
                allLessonIds.push(l.id);
              });
            });
          });

          if (allLessonIds.length > 0) {
            const { data: progress } = await supabase
              .from('lesson_progress')
              .select('lesson_id')
              .eq('user_id', user.id)
              .in('lesson_id', allLessonIds)
              .not('completed_at', 'is', null);
            const completedIds = new Set((progress || []).map(p => p.lesson_id));
            setManagerManualComplete(allLessonIds.every(id => completedIds.has(id)));
          }
        }
      } catch (err) {
        console.error('Error checking progress:', err);
      }
    };
    checkProgress();
  }, [user, isManager]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  // Rookies go straight to training (no AI Coach tile)
  if (!isManager && view === 'selection') {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Dashboard" />
          <div className="relative h-24 rounded-xl overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-success/30 via-success/20 to-success/10" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight drop-shadow-sm">
                SALES TRAINING
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Master your craft. Build your future.</p>
            </div>
          </div>

          {showWelcome && lessonsCompleted < 15 && (
            <WelcomeBanner
              userName={user?.user_metadata?.full_name}
              lessonsCompleted={lessonsCompleted}
              onDismiss={() => setShowWelcome(false)}
            />
          )}

          <GlobalTrainingProgress filterRole="rookie" />
          <TrainingTiles filterRole="rookie" />

          {/* Videos Banner */}
          <button
            onClick={() => navigate('/app/videos')}
            className="group w-full mt-6 p-5 rounded-xl border-2 border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/5 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:border-rose-500/50 hover:shadow-[0_0_30px_-10px_rgba(244,63,94,0.35)] flex items-center gap-4 text-left"
          >
            <div className="p-3.5 rounded-xl bg-rose-500/15 text-rose-400 group-hover:bg-rose-500/25 transition-colors flex-shrink-0">
              <Play className="w-7 h-7" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground group-hover:text-rose-400 transition-colors">
                Sales Training Videos
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Watch training videos, walkthroughs, and recorded sessions</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-rose-400 transition-colors flex-shrink-0" />
          </button>

          <div className="mt-6">
            <TrainingLeaderboardPanel />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Selection view for managers (no AI Coach tile — it's the chat bubble)
  if (view === 'selection') {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Dashboard" />
          <div className="relative h-24 rounded-xl overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-success/30 via-success/15 to-primary/30" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight drop-shadow-sm">
                HONE YOUR SKILLS
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Sharpen your edge. Lead with excellence.</p>
            </div>
          </div>

          {/* Two Selection Cards — bigger, cleaner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              onClick={() => setView('rookie')}
              className="group relative p-8 bg-card rounded-xl border-2 border-success/30 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-success/60 hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.4)] text-left"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30">
                  SALES
                </span>
              </div>
              <div className="p-4 rounded-xl bg-success/15 text-success w-fit mb-4 group-hover:bg-success/25 transition-colors">
                <BookOpen className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-success transition-colors">
                Sales Training
              </h2>
              <p className="text-sm text-muted-foreground">
                Learn Your Pitch, Summer Sales Manual, Videos
              </p>
            </button>

            <button
              onClick={() => setView('manager')}
              className="group relative p-8 bg-card rounded-xl border-2 border-primary/30 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-primary/60 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.4)] text-left"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  MANAGER
                </span>
              </div>
              <div className="p-4 rounded-xl bg-primary/15 text-primary w-fit mb-4 group-hover:bg-primary/25 transition-colors">
                <Users className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                Manager Training
              </h2>
              <p className="text-sm text-muted-foreground">
                Manager Manual, Recruiting Resources, Manager Videos
              </p>
            </button>
          </div>

          {/* Videos Banner */}
          <button
            onClick={() => navigate('/app/videos')}
            className="group w-full mt-5 p-5 rounded-xl border-2 border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/5 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:border-rose-500/50 hover:shadow-[0_0_30px_-10px_rgba(244,63,94,0.35)] flex items-center gap-4 text-left"
          >
            <div className="p-3.5 rounded-xl bg-rose-500/15 text-rose-400 group-hover:bg-rose-500/25 transition-colors flex-shrink-0">
              <Play className="w-7 h-7" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground group-hover:text-rose-400 transition-colors">
                Sales Training Videos
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Watch training videos, walkthroughs, and recorded sessions</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-rose-400 transition-colors flex-shrink-0" />
          </button>
        </div>
      </AppLayout>
    );
  }

  // Training content view
  const isRookieView = view === 'rookie';
  
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />
        <div className="relative h-40 rounded-xl overflow-hidden mb-6">
          <div className={cn(
            "absolute inset-0",
            isRookieView 
              ? "bg-gradient-to-r from-success/30 via-success/20 to-success/10" 
              : "bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10"
          )} />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight drop-shadow-sm">
              {isRookieView ? 'SALES TRAINING' : 'MANAGER TRAINING'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isRookieView ? 'Master your craft. Build your future.' : 'Lead your team to success.'}
            </p>
          </div>
        </div>

        {isManager && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('selection')}
            className="mb-4 -ml-2 -mt-2 text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}

        {isRookieView && showWelcome && lessonsCompleted < 15 && (
          <WelcomeBanner
            userName={user?.user_metadata?.full_name}
            lessonsCompleted={lessonsCompleted}
            onDismiss={() => setShowWelcome(false)}
          />
        )}

        <GlobalTrainingProgress filterRole={isRookieView ? 'rookie' : 'manager'} />
        <TrainingTiles 
          filterRole={isRookieView ? 'rookie' : 'manager'} 
          managerManualComplete={isRookieView ? true : managerManualComplete}
        />
      </div>
    </AppLayout>
  );
}
