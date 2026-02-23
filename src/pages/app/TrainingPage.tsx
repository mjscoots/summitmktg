import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { TrainingTiles } from '@/components/dashboard/TrainingTiles';
import { WelcomeBanner } from '@/components/training/WelcomeBanner';
import { StreakDisplay } from '@/components/training/StreakDisplay';
import { BookOpen, Users, Bot, Lock, ChevronLeft } from 'lucide-react';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { GlobalTrainingProgress } from '@/components/training/GlobalTrainingProgress';
import { TrainingLeaderboardPanel } from '@/components/training/TrainingLeaderboardPanel';
import { EliteProgressBar } from '@/components/dashboard/EliteProgressBar';
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

  // Combined: check AI Coach unlock, Manager Manual completion, and lesson count
  useEffect(() => {
    const checkProgress = async () => {
      if (!user) return;

      try {
        // AI Coach unlock requires completing specific courses
        const aiCoachSlugs = isManager
          ? ['manager-manual', 'management-basics']
          : ['learn-your-pitch', 'summer-sales-manual'];
        // Include manager-manual for the lock check too
        const allSlugs = isManager
          ? [...new Set([...aiCoachSlugs, 'manager-manual'])]
          : aiCoachSlugs;

        // Single nested query for all required courses with their lessons
        const [coursesRes, lessonCountRes] = await Promise.all([
          supabase
            .from('training_courses')
            .select(`
              id, slug,
              training_modules!inner (
                id, is_active,
                training_lessons (id)
              )
            `)
            .in('slug', allSlugs)
            .eq('is_active', true),
          supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .not('completed_at', 'is', null),
        ]);

        setLessonsCompleted(lessonCountRes.count || 0);

        const courses = coursesRes.data || [];
        if (courses.length === 0) {
          setAiCoachUnlocked(false);
          setManagerManualComplete(false);
          return;
        }

        // Collect all lesson IDs across all required courses
        const allLessonIds: string[] = [];
        const courseLessonMap = new Map<string, string[]>();

        courses.forEach(course => {
          const lessonIds: string[] = [];
          (course.training_modules || []).forEach(mod => {
            if (!(mod as { is_active: boolean }).is_active) return;
            ((mod as { training_lessons: { id: string }[] }).training_lessons || []).forEach(l => {
              lessonIds.push(l.id);
              allLessonIds.push(l.id);
            });
          });
          courseLessonMap.set(course.slug, lessonIds);
        });

        // Single batch query for all lesson progress
        let completedIds = new Set<string>();
        if (allLessonIds.length > 0) {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', allLessonIds)
            .not('completed_at', 'is', null);
          completedIds = new Set((progress || []).map(p => p.lesson_id));
        }

        // Check AI Coach unlock (all required courses must be 100%)
        const aiCoachComplete = aiCoachSlugs.every(slug => {
          const lessonIds = courseLessonMap.get(slug) || [];
          return lessonIds.length > 0 && lessonIds.every(id => completedIds.has(id));
        });
        setAiCoachUnlocked(aiCoachComplete);

        // Check Manager Manual completion (for Recruiting Resources lock)
        if (isManager) {
          const manualLessons = courseLessonMap.get('manager-manual') || [];
          setManagerManualComplete(
            manualLessons.length > 0 && manualLessons.every(id => completedIds.has(id))
          );
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

  // For rookies, go straight to rookie training (no AI Coach here)
  if (!isManager && view === 'selection') {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <PageBackButton to="/app" label="Dashboard" />
          <div className="relative h-40 rounded-xl overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-success/30 via-success/20 to-success/10" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight drop-shadow-sm">
                SALES TRAINING
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Master your craft. Build your future.</p>
            </div>
          </div>

          {/* Elite System Progress */}
          <EliteProgressBar />

          {/* Streak Display */}
          <div className="mb-6">
            <StreakDisplay variant="large" />
          </div>

          {/* Welcome Banner for new users */}
          {showWelcome && lessonsCompleted < 15 && (
            <WelcomeBanner
              userName={user?.user_metadata?.full_name}
              lessonsCompleted={lessonsCompleted}
              onDismiss={() => setShowWelcome(false)}
            />
          )}

          <GlobalTrainingProgress filterRole="rookie" />
          <TrainingTiles filterRole="rookie" />

          {/* AI Coach Tile for Rookies */}
          <div className="mt-6">
            <AICoachTile isLocked={!aiCoachUnlocked} isRookie={true} />
          </div>

          {/* Training Leaderboard */}
          <div className="mt-6">
            <TrainingLeaderboardPanel />
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
          <PageBackButton to="/app" label="Dashboard" />
          <div className="relative h-40 rounded-xl overflow-hidden mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-success/30 via-success/15 to-primary/30" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight drop-shadow-sm">
                HONE YOUR SKILLS
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Sharpen your edge. Lead with excellence.</p>
            </div>
          </div>

          {/* Elite System Progress */}
          <EliteProgressBar />

          {/* Streak Display */}
          <div className="mb-6">
            <StreakDisplay variant="large" />
          </div>

          {/* Two Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Rookie Training Card */}
            <button
              onClick={() => setView('rookie')}
              className="group relative p-6 bg-card rounded-xl border-2 border-success/30 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-success/60 hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.4)] text-left"
            >
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30">
                  SALES
                </span>
              </div>

              <div className="p-3 rounded-xl bg-success/15 text-success w-fit mb-4 group-hover:bg-success/25 transition-colors">
                <BookOpen className="w-8 h-8" />
              </div>

              <h2 className="text-lg font-bold text-foreground mb-1 group-hover:text-success transition-colors">
                Sales Training
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

        {/* Back button for managers - TOP LEFT */}
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

        {/* Welcome Banner for rookie view */}
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
