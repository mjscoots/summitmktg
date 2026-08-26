import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { isManagerOrAbove } from '@/lib/roles';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { DailyDrill } from '@/components/training/DailyDrill';
import { PracticePitchCard } from '@/components/training/PracticePitchCard';
import { WelcomeBanner } from '@/components/training/WelcomeBanner';

import { BookOpen, Users, ChevronLeft, Play, ChevronRight, FileText } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { GlobalTrainingProgress } from '@/components/training/GlobalTrainingProgress';
import { PageHeader } from '@/components/layout/PageHeader';
import { TrainingLeaderboardPanel } from '@/components/training/TrainingLeaderboardPanel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type TrainingView = 'selection' | 'rookie' | 'manager';

export default function TrainingPage() {
  const { role, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<TrainingView>('selection');
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [managerManualComplete, setManagerManualComplete] = useState(false);
  
  const isManager = isManagerOrAbove(role);
  const { activeVertical } = useWorkspace();

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

  // Fiber and Life training stay blank until someone writes them.
  if (activeVertical !== 'Pest') {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl px-4 py-6">
          <PageBackButton to="/app" label="Back" />
          <PageHeader title="Training" context={`${activeVertical} training.`} className="mb-6" />
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-foreground">{activeVertical} training is being written.</p>
            {isManager && (
              <Button variant="outline" className="mt-3 min-h-11" onClick={() => navigate('/app/industries')}>
                Add the first module
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Rookies go straight to training (no AI Coach tile)
  if (!isManager && view === 'selection') {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Back" />
          <PageHeader title="Training" context="Your lessons, drills and scripts." className="mb-6" />

          {showWelcome && lessonsCompleted < 15 && (
            <WelcomeBanner
              userName={user?.user_metadata?.full_name}
              lessonsCompleted={lessonsCompleted}
              onDismiss={() => setShowWelcome(false)}
            />
          )}

          <DailyDrill />
          <GlobalTrainingProgress filterRole="rookie" />
          <TrainingTiles filterRole="rookie" />
          <PracticePitchCard />

          {/* Videos Banner */}
          <button
            onClick={() => navigate('/app/videos')}
            className="glass-card glass-card-hover group mt-6 flex w-full items-center gap-4 p-5 text-left"
          >
            <div className="flex-shrink-0 rounded-[var(--radius)] bg-primary/15 p-3.5 text-primary">
              <Play className="w-7 h-7" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                Training videos
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Watch training videos, walkthroughs, and recorded sessions</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </button>

          <button
            onClick={() => navigate('/app/scripts')}
            className="glass-card glass-card-hover group mt-4 flex w-full items-center gap-4 p-5 text-left"
          >
            <div className="flex-shrink-0 rounded-[var(--radius)] bg-primary/15 p-3.5 text-primary">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Scripts</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Openers, objections and closes — searchable</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
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
          <PageBackButton to="/app" label="Back" />
          <PageHeader title="Training" context="Pick a track." className="mb-6" />

          <DailyDrill />

          {/* Two Selection Cards — bigger, cleaner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              onClick={() => setView('rookie')}
              className="glass-card glass-card-hover group relative overflow-hidden p-6 text-left"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  SALES
                </span>
              </div>
              <div className="p-3 rounded-xl bg-success/15 text-success w-fit mb-3 group-hover:bg-success/25 transition-colors relative">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-success transition-colors relative">
                Sales Training
              </h2>
              <p className="text-sm text-muted-foreground relative">
                Learn your pitch, Summer Sales Manual, videos
              </p>
            </button>

            <button
              onClick={() => setView('manager')}
              className="glass-card glass-card-hover group relative overflow-hidden p-6 text-left"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  MANAGER
                </span>
              </div>
              <div className="p-3 rounded-xl bg-primary/15 text-primary w-fit mb-3 group-hover:bg-primary/25 transition-colors relative">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors relative">
                Manager Training
              </h2>
              <p className="text-sm text-muted-foreground relative">
                Manager Manual, recruiting resources, manager videos
              </p>
            </button>
          </div>

          {/* Videos Banner */}
          <button
            onClick={() => navigate('/app/videos')}
            className="group w-full mt-5 p-5 rounded-xl border-2 border-rose-500/30 bg-rose-500/10 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:border-rose-500/50 hover:shadow-[0_0_30px_-10px_rgba(244,63,94,0.35)] flex items-center gap-4 text-left"
          >
            <div className="flex-shrink-0 rounded-[var(--radius)] bg-primary/15 p-3.5 text-primary">
              <Play className="w-7 h-7" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                Training videos
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Watch training videos, walkthroughs, and recorded sessions</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </button>

          <button
            onClick={() => navigate('/app/scripts')}
            className="glass-card glass-card-hover group mt-4 flex w-full items-center gap-4 p-5 text-left"
          >
            <div className="flex-shrink-0 rounded-[var(--radius)] bg-primary/15 p-3.5 text-primary">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Scripts</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Openers, objections and closes — searchable</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
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
        {/* Single back button - goes to selection for managers, dashboard for rookies */}
        <PageHeader title={isRookieView ? 'Sales training' : 'Manager training'} className="mb-6" />

        {isManager ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('selection')}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        ) : (
          <PageBackButton to="/app" label="Back" />
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
        {isRookieView && <PracticePitchCard />}
      </div>
    </AppLayout>
  );
}
