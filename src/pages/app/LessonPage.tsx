import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, CheckCircle2, BookOpen, Loader2, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ModuleCompletionCelebration } from '@/components/training/ModuleCompletionCelebration';
import { LessonContent } from '@/components/training/LessonContent';
import { useStreak } from '@/hooks/useStreak';
import { useScrollGate } from '@/hooks/useScrollGate';
import { LessonDebugPanel } from '@/components/training/LessonDebugPanel';
import { useLessonPitchStatus } from '@/hooks/usePitchApprovals';
import { PitchApprovalCard } from '@/components/training/PitchApprovalCard';
import { PitchRecordingModal } from '@/components/training/PitchRecordingModal';
import { sanitizeUrl } from '@/lib/sanitizeUrl';

interface Lesson {
  id: string;
  title: string;
  content: string;
  key_takeaways: string[] | null;
  video_url: string | null;
  module_id: string;
  display_order: number;
}

interface ModuleInfo {
  id: string;
  title: string;
  course_id: string;
  display_order: number;
}

// Rookie courses always use green
const ROOKIE_COURSES = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];

// Scripts module ID for team-specific script selector
const SCRIPTS_MODULE_ID = 'a1b2c3d4-0002-4000-8000-000000000002';

// Map lesson display_order to module_2_X keys
const SCRIPT_LESSON_KEYS: Record<number, 'module_2_1' | 'module_2_2' | 'module_2_3' | 'module_2_4'> = {
  0: 'module_2_1',
  1: 'module_2_2',
  2: 'module_2_3',
  3: 'module_2_4',
};

// Button state machine
type ButtonState = 'locked' | 'ready' | 'finalReady';

export default function LessonPage() {
  const { courseSlug, lessonId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const { recordActivity, streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, clearMilestone } = useStreak();
  const { pitchRequest, requiresPitch, refresh: refreshPitch } = useLessonPitchStatus(lessonId);
  
  // Core state
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [siblingLessons, setSiblingLessons] = useState<{ id: string; title: string; display_order: number }[]>([]);
  const [allModules, setAllModules] = useState<{ id: string; title: string; display_order: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  
  const [lessonCompleted, setLessonCompleted] = useState(false);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [nextModuleName, setNextModuleName] = useState<string | null>(null);
  const [showPitchModal, setShowPitchModal] = useState(false);

  const isRookieCourse = ROOKIE_COURSES.includes(courseSlug || '');

  // Check if this is a Scripts module lesson (for team script selector)
  const isScriptsLesson = moduleInfo?.id === SCRIPTS_MODULE_ID;
  const scriptModuleKey = isScriptsLesson && lesson 
    ? SCRIPT_LESSON_KEYS[lesson.display_order] 
    : null;

  // Use the scroll gate hook - reset when lesson changes
  const { atBottom, scrollProgress, resetGate } = useScrollGate(contentRef, {
    threshold: 50,
    enabled: !lessonCompleted,
  });

  // Computed values for navigation
  const currentLessonIndex = useMemo(() => {
    return lesson ? siblingLessons.findIndex(l => l.id === lesson.id) : -1;
  }, [lesson, siblingLessons]);

  const isLastLessonInModule = currentLessonIndex === siblingLessons.length - 1;
  
  const currentModuleIndex = useMemo(() => {
    return moduleInfo ? allModules.findIndex(m => m.id === moduleInfo.id) : -1;
  }, [moduleInfo, allModules]);

  const isLastModule = currentModuleIndex === allModules.length - 1;
  const isLastLesson = isLastLessonInModule && isLastModule;

  // Next lesson info
  const nextLesson = useMemo(() => {
    if (currentLessonIndex < 0 || currentLessonIndex >= siblingLessons.length - 1) {
      return null;
    }
    return siblingLessons[currentLessonIndex + 1];
  }, [currentLessonIndex, siblingLessons]);

  // Determine if user can proceed (no quiz gate — pitch is optional)
  const scrollUnlocked = atBottom || lessonCompleted;
  const pitchBlocking = false; // Pitch upload is now optional — reps can skip
  const canProceed = scrollUnlocked;

  // Button state machine
  const buttonState: ButtonState = useMemo(() => {
    if (!scrollUnlocked || pitchBlocking) return 'locked';
    if (isLastLesson) return 'finalReady';
    return 'ready';
  }, [scrollUnlocked, isLastLesson, pitchBlocking]);

  // Button label based on state
  const buttonLabel = useMemo(() => {
    switch (buttonState) {
      case 'finalReady':
        return 'Complete';
      case 'ready':
      case 'locked':
      default:
        return 'Next';
    }
  }, [buttonState]);

  // Reset state when lessonId changes
  useEffect(() => {
    setLessonCompleted(false);
    setShowCelebration(false);
    resetGate();
    setDataVersion(v => v + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [lessonId, resetGate]);

  // Fetch lesson data
  useEffect(() => {
    const fetchLesson = async () => {
      if (!user || !lessonId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const { data: lessonData, error: lessonError } = await supabase
          .from('training_lessons')
          .select('*')
          .eq('id', lessonId)
          .eq('is_active', true)
          .maybeSingle();

        if (lessonError || !lessonData) {
          console.error('Lesson not found:', lessonId, lessonError);
          navigate(`/app/training/${courseSlug}`);
          return;
        }

        if (!lessonData.content || lessonData.content.trim() === '') {
          console.error('Lesson has no content:', lessonId);
          toast.error('Lesson content is missing');
        }

        setLesson(lessonData);

        const [moduleResult, siblingsResult, progressResult] = await Promise.all([
          supabase
            .from('training_modules')
            .select('id, title, course_id, display_order')
            .eq('id', lessonData.module_id)
            .maybeSingle(),
          supabase
            .from('training_lessons')
            .select('id, title, display_order')
            .eq('module_id', lessonData.module_id)
            .eq('is_active', true)
            .order('display_order'),
          supabase
            .from('lesson_progress')
            .select('completed_at')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .maybeSingle(),
        ]);

        const moduleData = moduleResult.data;
        if (moduleData) {
          setModuleInfo(moduleData);

          const { data: allModulesData } = await supabase
            .from('training_modules')
            .select('id, title, display_order')
            .eq('course_id', moduleData.course_id)
            .eq('is_active', true)
            .order('display_order');

          if (allModulesData) {
            setAllModules(allModulesData);
          }
        }

        if (siblingsResult.data) {
          setSiblingLessons(siblingsResult.data);
        }

        if (progressResult.data?.completed_at) {
          setLessonCompleted(true);
        }
        
        recordActivity();
      } catch (err) {
        console.error('Error fetching lesson:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, user, courseSlug, navigate, recordActivity]);

  // Mark lesson complete (no quiz needed)
  const handleMarkComplete = useCallback(async () => {
    if (!user || !lessonId) return;

    setLessonCompleted(true);

    const { data: existing } = await supabase
      .from('lesson_progress')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    const alreadyCompleted = !!existing?.completed_at;

    await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
        quiz_passed: true,
      }, { onConflict: 'user_id,lesson_id' });

    if (!alreadyCompleted) {
      await (supabase.rpc as any)('award_lesson_completion_points', {
        _user_id: user.id,
        _lesson_id: lessonId,
      });
    }
    
    recordActivity();
  }, [user, lessonId, recordActivity]);

  // Handle next navigation
  const handleNext = useCallback(async () => {
    if (!lesson || !moduleInfo) return;

    // Pitch upload is optional — no longer blocks navigation

    // Mark complete automatically
    if (!lessonCompleted) {
      await handleMarkComplete();
    }

    if (isLastLessonInModule) {
      const nextModuleIndex = currentModuleIndex + 1;
      
      if (nextModuleIndex < allModules.length) {
        const nextModule = allModules[nextModuleIndex];
        setNextModuleName(nextModule.title);
        setShowCelebration(true);
      } else {
        setShowCelebration(true);
        setNextModuleName(null);
      }
    } else {
      if (nextLesson) {
        navigate(`/app/training/${courseSlug}/${nextLesson.id}`);
      }
    }
  }, [
    lesson, 
    moduleInfo, 
    lessonCompleted, 
    handleMarkComplete, 
    isLastLessonInModule, 
    currentModuleIndex, 
    allModules, 
    nextLesson, 
    navigate, 
    courseSlug,
    requiresPitch,
    pitchRequest
  ]);

  // Handle celebration continue
  const handleCelebrationContinue = useCallback(async () => {
    if (!moduleInfo) {
      navigate(`/app/training/${courseSlug}`);
      return;
    }

    const nextModuleIndex = currentModuleIndex + 1;

    if (nextModuleIndex < allModules.length) {
      const nextModule = allModules[nextModuleIndex];
      
      const { data: firstLesson } = await supabase
        .from('training_lessons')
        .select('id')
        .eq('module_id', nextModule.id)
        .eq('is_active', true)
        .order('display_order')
        .limit(1)
        .maybeSingle();

      if (firstLesson) {
        navigate(`/app/training/${courseSlug}/${firstLesson.id}`);
        return;
      }
    }

    navigate(`/app/training/${courseSlug}`);
  }, [moduleInfo, currentModuleIndex, allModules, navigate, courseSlug]);

  // Notify manager only when rep hits 100% training completion
  const notifyManagerOf100PercentCompletion = async () => {
    if (!user) return;
    
    try {
      const { data: courses } = await supabase
        .from('training_courses')
        .select('id, training_modules ( id, training_lessons ( id, is_active ) )')
        .eq('is_active', true);

      if (!courses) return;

      const allLessonIds: string[] = [];
      courses.forEach(c => c.training_modules?.forEach(m => m.training_lessons?.forEach(l => {
        if (l.is_active) allLessonIds.push(l.id);
      })));

      if (allLessonIds.length === 0) return;

      const { data: completed } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      const completedIds = new Set(completed?.map(lp => lp.lesson_id) || []);
      const isComplete = allLessonIds.every(id => completedIds.has(id));

      if (!isComplete) return;

      const { count: existing } = await supabase
        .from('user_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .ilike('title', '%100% training%');

      if (existing && existing > 0) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, direct_manager, team_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile) return;

      await supabase.from('user_notifications').insert({
        user_id: user.id,
        title: '🎉 100% Training Complete!',
        message: 'You crushed every single module. You are fully trained and ready to dominate.',
        link: '/app/training',
      });

      if (userProfile.direct_manager) {
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('full_name', userProfile.direct_manager)
          .single();

        if (managerProfile) {
          await supabase.from('user_notifications').insert({
            user_id: managerProfile.user_id,
            title: `🏆 ${userProfile.full_name} completed 100% training!`,
            message: `${userProfile.full_name} has finished every training module. They are fully trained.`,
            link: '/app/team',
          });
        }

        if (userProfile.team_id) {
          const { data: team } = await supabase
            .from('teams')
            .select('leader_id')
            .eq('id', userProfile.team_id)
            .single();

          if (team?.leader_id && team.leader_id !== managerProfile?.user_id) {
            await supabase.from('user_notifications').insert({
              user_id: team.leader_id,
              title: `🏆 ${userProfile.full_name} completed 100% training!`,
              message: `${userProfile.full_name} has finished every training module. They are fully trained.`,
              link: '/app/team',
            });
          }
        }
      }
    } catch (err) {
      // Training completion notification failed silently
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className={cn(
            "w-8 h-8 animate-spin",
            isRookieCourse ? "text-primary" : "text-blue-400"
          )} />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (!lesson) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl text-foreground mb-4">Lesson not found</h1>
          <p className="text-muted-foreground mb-4">
            Lesson ID: {lessonId}
          </p>
          <button 
            onClick={() => navigate(`/app/training/${courseSlug}`)}
            className={cn("hover:underline", isRookieCourse ? "text-primary" : "text-blue-400")}
          >
            Back to Course
          </button>
        </div>
      </AppLayout>
    );
  }

  // Show celebration screen
  if (showCelebration && moduleInfo) {
    return (
      <ModuleCompletionCelebration
        moduleName={moduleInfo.title}
        nextModuleName={nextModuleName || undefined}
        onContinue={handleCelebrationContinue}
        isRookieCourse={isRookieCourse}
      />
    );
  }

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-4 pb-24">
        {/* Dev Debug Panel */}
        <LessonDebugPanel
          currentTrack={courseSlug || ''}
          currentLessonId={lesson.id}
          currentLessonTitle={lesson.title}
          hasContent={!!lesson.content && lesson.content.trim().length > 0}
          atBottom={atBottom}
          scrollProgress={scrollProgress}
          nextLessonId={nextLesson?.id || null}
          nextLessonTitle={nextLesson?.title || null}
          isLastLesson={isLastLessonInModule}
          isLastModule={isLastModule}
          lessonCompleted={lessonCompleted}
          canProceed={canProceed}
          moduleTitle={moduleInfo?.title || null}
        />

        {/* Streak Celebration */}
        {showStreakCelebration && (
          <div className={cn(
            "fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg animate-fade-in",
            isRookieCourse 
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
          )}>
            <p className="font-semibold">{getStreakMessage()}</p>
            <button onClick={() => { clearStreakCelebration(); clearMilestone(); }} className="text-xs mt-1 opacity-60">
              Dismiss
            </button>
          </div>
        )}

        {/* Breadcrumbs */}
        <Breadcrumbs items={[
          { label: 'Training', to: '/app/training' },
          { label: moduleInfo?.title || 'Course', to: `/app/training/${courseSlug}` },
          { label: lesson.title },
        ]} />

        {/* Lesson Header */}
        <header className="mb-4">
          <div className="flex items-start gap-2 mb-1">
            {lessonCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            ) : (
              <BookOpen className={cn(
                "w-5 h-5 mt-0.5 flex-shrink-0",
                isRookieCourse ? "text-primary" : "text-blue-400"
              )} />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                {lesson.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border",
                  isRookieCourse 
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                )}>
                  {isRookieCourse ? 'ROOKIE' : 'MANAGER'}
                </span>
                {lessonCompleted && (
                  <span className="text-xs text-primary font-medium">Completed</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Video Player */}
        {lesson.video_url && lesson.video_url.trim() && (() => {
          const url = lesson.video_url!.trim();
          const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
          const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/);
          
          if (vimeoMatch) {
            const vimeoParams = 'title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=0&controls=1&dnt=1';
            return (
              <div className="mb-4 rounded-xl overflow-hidden border border-border bg-black aspect-video">
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoMatch[1]}?${vimeoParams}`}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={lesson.title}
                  style={{ border: 'none' }}
                />
              </div>
            );
          }
          
          if (youtubeMatch) {
            return (
              <div className="mb-4 rounded-lg overflow-hidden border border-border bg-black aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            );
          }

          return (
            <div className="mb-4 rounded-lg overflow-hidden border border-border bg-black aspect-video">
              <video controls className="w-full h-full" title={lesson.title}>
                <source src={sanitizeUrl(url)} />
              </video>
            </div>
          );
        })()}

        {/* Lesson Content */}
        <div 
          ref={contentRef}
          className="bg-card rounded-lg border border-border p-5 mb-4"
          key={`content-${lesson.id}-${dataVersion}`}
        >
          {lesson.content && lesson.content.trim() ? (
            <LessonContent 
              content={lesson.content} 
              isRookieCourse={isRookieCourse} 
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p>Content not available for this lesson.</p>
              <p className="text-xs mt-1">Lesson ID: {lesson.id}</p>
            </div>
          )}
        </div>

        {/* Key Takeaways */}
        {lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
          <div className={cn(
            "border rounded-lg p-4 mb-4",
            isRookieCourse 
              ? "bg-primary/5 border-primary/20"
              : "bg-blue-500/5 border-blue-500/20"
          )}>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className={cn(
                "w-3.5 h-3.5",
                isRookieCourse ? "text-primary" : "text-blue-400"
              )} />
              Key Takeaways
            </h3>
            <ul className="space-y-1">
              {lesson.key_takeaways.map((takeaway, index) => (
                <li key={index} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("mt-0.5", isRookieCourse ? "text-primary" : "text-blue-400")}>•</span>
                  {takeaway}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pitch Approval Gate */}
        <PitchApprovalCard
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          pitchRequest={pitchRequest}
          requiresPitch={requiresPitch}
          lessonCompleted={lessonCompleted}
          managerName={profile?.direct_manager || undefined}
          isRookieCourse={isRookieCourse}
          onRefresh={refreshPitch}
        />

        {/* Pitch approval waiting message */}
        {pitchBlocking && lessonCompleted && (
          <div className={cn(
            "text-center py-4 px-4 rounded-lg border-2 border-dashed mt-4",
            "border-primary/40 bg-primary/5"
          )}>
            <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-600">Waiting for Manager Approval</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your manager needs to approve your pitch before you can continue to the next lesson.
            </p>
          </div>
        )}

        {/* Scroll indicator if not scrolled */}
        {!scrollUnlocked && !lessonCompleted && (
          <div className="text-center py-3 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Scroll to bottom to continue ({Math.round(scrollProgress)}%)
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Back */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/app/training/${courseSlug}`)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            {/* Progress */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {siblingLessons.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      i < currentLessonIndex
                        ? isRookieCourse ? "bg-primary" : "bg-blue-500"
                        : i === currentLessonIndex
                          ? isRookieCourse ? "bg-primary ring-1 ring-green-400/30" : "bg-blue-400 ring-1 ring-blue-400/30"
                          : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                {currentLessonIndex + 1}/{siblingLessons.length}
              </span>
            </div>

            {/* Next/Complete Button */}
            <Button
              onClick={handleNext}
              size="sm"
              disabled={buttonState === 'locked'}
              className={cn(
                "gap-1.5 font-semibold transition-all",
                buttonState !== 'locked' && (
                  isRookieCourse
                    ? "bg-primary hover:bg-primary"
                    : "bg-blue-500 hover:bg-blue-600"
                )
              )}
            >
              {pitchBlocking && !pitchRequest
                ? '🔒 Submit Pitch'
                : pitchBlocking && pitchRequest?.status === 'pending'
                  ? '⏳ Awaiting Approval'
                  : pitchBlocking && pitchRequest?.status === 'rejected'
                    ? '❌ Re-record Pitch'
                    : buttonLabel}
              {!pitchBlocking && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Pitch Recording Modal */}
      {lesson && (
        <PitchRecordingModal
          open={showPitchModal}
          onClose={() => setShowPitchModal(false)}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          attemptNumber={(pitchRequest?.attempt_number || 0) + 1}
          onSubmitted={() => {
            refreshPitch();
            setShowPitchModal(false);
          }}
        />
      )}
    </AppLayout>
  );
}
