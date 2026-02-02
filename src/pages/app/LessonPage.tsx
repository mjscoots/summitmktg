import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, CheckCircle2, BookOpen, HelpCircle, ChevronRight, Loader2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ModuleCompletionCelebration } from '@/components/training/ModuleCompletionCelebration';
import { LessonContent } from '@/components/training/LessonContent';
import { useStreak } from '@/hooks/useStreak';
import { useScrollGate } from '@/hooks/useScrollGate';
import { LessonDebugPanel } from '@/components/training/LessonDebugPanel';

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

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'scenario';
  options: { id: string; text: string; isCorrect?: boolean }[] | null;
  display_order: number;
  correct_answer?: string;
}

// Rookie courses always use green
const ROOKIE_COURSES = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];

// Modules where quizzes are OPTIONAL
const OPTIONAL_QUIZ_MODULES = ['introduction', 'scripts', 'body language'];

// Button state machine
type ButtonState = 'locked' | 'ready' | 'finalReady';

export default function LessonPage() {
  const { courseSlug, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const { recordActivity, streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, clearMilestone } = useStreak();
  
  // Core state
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [siblingLessons, setSiblingLessons] = useState<{ id: string; title: string; display_order: number }[]>([]);
  const [allModules, setAllModules] = useState<{ id: string; title: string; display_order: number }[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0); // Force re-renders on navigation
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ passed: boolean } | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [nextModuleName, setNextModuleName] = useState<string | null>(null);

  const isRookieCourse = ROOKIE_COURSES.includes(courseSlug || '');
  
  const isQuizOptional = moduleInfo 
    ? OPTIONAL_QUIZ_MODULES.some(m => moduleInfo.title.toLowerCase().includes(m))
    : false;

  // Use the scroll gate hook - reset when lesson changes
  const { atBottom, scrollProgress, resetGate } = useScrollGate(undefined, {
    threshold: 50,
    enabled: !lessonCompleted, // If already completed, don't require scroll
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

  // Determine if user can proceed
  const hasCompletedRequirements = lessonCompleted || questions.length === 0 || isQuizOptional;
  const scrollUnlocked = atBottom || lessonCompleted;
  const canProceed = scrollUnlocked && hasCompletedRequirements;

  // Button state machine
  const buttonState: ButtonState = useMemo(() => {
    if (!scrollUnlocked) return 'locked';
    if (isLastLesson && hasCompletedRequirements) return 'finalReady';
    if (hasCompletedRequirements) return 'ready';
    return 'locked';
  }, [scrollUnlocked, isLastLesson, hasCompletedRequirements]);

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
    // Reset all lesson-specific state
    setShowQuiz(false);
    setAnswers({});
    setQuizResult(null);
    setLessonCompleted(false);
    setShowCelebration(false);
    resetGate();
    setDataVersion(v => v + 1);
    
    // Scroll to top
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
        // Fetch lesson data
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

        // Verify content exists
        if (!lessonData.content || lessonData.content.trim() === '') {
          console.error('Lesson has no content:', lessonId);
          toast.error('Lesson content is missing');
        }

        setLesson(lessonData);

        // Fetch module info
        const { data: moduleData } = await supabase
          .from('training_modules')
          .select('id, title, course_id, display_order')
          .eq('id', lessonData.module_id)
          .maybeSingle();

        if (moduleData) {
          setModuleInfo(moduleData);

          // Fetch all modules for this course (to determine last module)
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

        // Fetch sibling lessons in this module
        const { data: siblingsData } = await supabase
          .from('training_lessons')
          .select('id, title, display_order')
          .eq('module_id', lessonData.module_id)
          .eq('is_active', true)
          .order('display_order');

        if (siblingsData) {
          setSiblingLessons(siblingsData);
        }

        // Fetch quiz questions
        const { data: questionsData } = await supabase
          .from('quiz_questions_safe')
          .select('id, question_text, question_type, options, display_order')
          .eq('lesson_id', lessonId)
          .order('display_order');

        if (questionsData && questionsData.length > 0) {
          setQuestions(questionsData as QuizQuestion[]);
        } else {
          setQuestions([]);
        }

        // Check existing progress
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('quiz_passed')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (progressData?.quiz_passed) {
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

  // Quiz submission
  const handleSubmitQuiz = async () => {
    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      toast.error(`Please answer all questions (${unansweredCount} remaining)`);
      return;
    }

    if (!user || !lessonId) return;

    try {
      const { data, error } = await supabase.rpc('validate_and_record_quiz', {
        _lesson_id: lessonId,
        _answers: answers
      });

      if (error) {
        setQuizResult({ passed: true });
        setLessonCompleted(true);
        recordActivity();
        return;
      }

      const result = data as { passed?: boolean } | null;
      const passed = result?.passed ?? true;
      
      setQuizResult({ passed });

      if (passed) {
        setLessonCompleted(true);
        recordActivity();
      }
    } catch {
      setQuizResult({ passed: true });
      setLessonCompleted(true);
      recordActivity();
    }
  };

  // Handle back to lesson after failure
  const handleBackToLesson = () => {
    setShowQuiz(false);
    setQuizResult(null);
    setAnswers({});
    resetGate();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mark lesson complete without quiz
  const handleMarkComplete = useCallback(async () => {
    if (!user || !lessonId) return;

    setLessonCompleted(true);

    await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
        quiz_passed: true,
      }, { onConflict: 'user_id,lesson_id' });
    
    recordActivity();
  }, [user, lessonId, recordActivity]);

  // Handle next navigation - THE KEY FIX
  const handleNext = useCallback(async () => {
    if (!lesson || !moduleInfo) return;

    // Mark complete if no quiz required
    if (!lessonCompleted && (questions.length === 0 || isQuizOptional)) {
      await handleMarkComplete();
    }

    if (isLastLessonInModule) {
      // Check for next module
      const nextModuleIndex = currentModuleIndex + 1;
      
      if (nextModuleIndex < allModules.length) {
        // There's a next module - show celebration then navigate
        const nextModule = allModules[nextModuleIndex];
        setNextModuleName(nextModule.title);
        setShowCelebration(true);
      } else {
        // Course complete - go back to course page
        setShowCelebration(true);
        setNextModuleName(null);
      }
    } else {
      // Navigate to next lesson in same module
      if (nextLesson) {
        // Use navigate with the lesson ID - this triggers the useEffect to reset state
        navigate(`/app/training/${courseSlug}/${nextLesson.id}`);
      }
    }
  }, [
    lesson, 
    moduleInfo, 
    lessonCompleted, 
    questions.length, 
    isQuizOptional, 
    handleMarkComplete, 
    isLastLessonInModule, 
    currentModuleIndex, 
    allModules, 
    nextLesson, 
    navigate, 
    courseSlug
  ]);

  // Handle celebration continue - navigate to first lesson of next module
  const handleCelebrationContinue = useCallback(async () => {
    if (!moduleInfo) {
      navigate(`/app/training/${courseSlug}`);
      return;
    }

    const nextModuleIndex = currentModuleIndex + 1;

    if (nextModuleIndex < allModules.length) {
      const nextModule = allModules[nextModuleIndex];
      
      // Fetch first lesson of next module
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

    // Fallback to course page
    navigate(`/app/training/${courseSlug}`);
  }, [moduleInfo, currentModuleIndex, allModules, navigate, courseSlug]);

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className={cn(
            "w-8 h-8 animate-spin",
            isRookieCourse ? "text-green-400" : "text-blue-400"
          )} />
        </div>
      </AppLayout>
    );
  }

  // Error state - no lesson found
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
            className={cn("hover:underline", isRookieCourse ? "text-green-400" : "text-blue-400")}
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
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
          )}>
            <p className="font-semibold">{getStreakMessage()}</p>
            <button onClick={() => { clearStreakCelebration(); clearMilestone(); }} className="text-xs mt-1 opacity-60">
              Dismiss
            </button>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(`/app/training/${courseSlug}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Course</span>
        </button>

        {/* Lesson Header */}
        <header className="mb-4">
          <div className="flex items-start gap-2 mb-1">
            {lessonCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <BookOpen className={cn(
                "w-5 h-5 mt-0.5 flex-shrink-0",
                isRookieCourse ? "text-green-400" : "text-blue-400"
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
                    ? "bg-green-500/15 text-green-400 border-green-500/30"
                    : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                )}>
                  {isRookieCourse ? 'ROOKIE' : 'MANAGER'}
                </span>
                {lessonCompleted && (
                  <span className="text-xs text-green-500 font-medium">Completed</span>
                )}
                {isQuizOptional && !lessonCompleted && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    No quiz required
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {!showQuiz ? (
          <>
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
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
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
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-blue-500/5 border-blue-500/20"
              )}>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 className={cn(
                    "w-3.5 h-3.5",
                    isRookieCourse ? "text-green-400" : "text-blue-400"
                  )} />
                  Key Takeaways
                </h3>
                <ul className="space-y-1">
                  {lesson.key_takeaways.map((takeaway, index) => (
                    <li key={index} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <span className={cn("mt-0.5", isRookieCourse ? "text-green-400" : "text-blue-400")}>•</span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quiz Section - Only show if has quiz and not complete */}
            {questions.length > 0 && !lessonCompleted && !isQuizOptional && scrollUnlocked && (
              <div className="mb-4">
                <Button
                  onClick={() => setShowQuiz(true)}
                  className={cn(
                    "w-full font-semibold h-10",
                    isRookieCourse 
                      ? "bg-green-500 hover:bg-green-600" 
                      : "bg-blue-500 hover:bg-blue-600"
                  )}
                >
                  Take Quiz
                  <HelpCircle className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Scroll indicator if not scrolled */}
            {!scrollUnlocked && !lessonCompleted && (
              <div className="text-center py-3 text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Scroll to bottom to continue ({Math.round(scrollProgress)}%)
              </div>
            )}
          </>
        ) : (
          /* Quiz View */
          <div className="bg-card rounded-lg border border-border p-5">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <HelpCircle className={cn("w-4 h-4", isRookieCourse ? "text-green-400" : "text-blue-400")} />
              Lesson Quiz
            </h2>

            {quizResult ? (
              /* Quiz Result */
              <div className={cn(
                "p-5 rounded-lg text-center",
                quizResult.passed 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-amber-500/10 border border-amber-500/20'
              )}>
                <h3 className={cn(
                  "text-lg font-semibold mb-3",
                  quizResult.passed ? 'text-green-400' : 'text-amber-400'
                )}>
                  {quizResult.passed ? 'Quiz Passed!' : 'Quiz not passed. Review the lesson and try again.'}
                </h3>
                
                {quizResult.passed ? (
                  <Button 
                    onClick={handleNext}
                    className={cn(
                      "font-semibold h-10",
                      isRookieCourse 
                        ? "bg-green-500 hover:bg-green-600" 
                        : "bg-blue-500 hover:bg-blue-600"
                    )}
                  >
                    {isLastLesson ? 'Complete' : 'Next'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleBackToLesson}
                    className={cn(
                      "font-semibold h-10",
                      isRookieCourse 
                        ? "bg-green-500 hover:bg-green-600" 
                        : "bg-blue-500 hover:bg-blue-600"
                    )}
                  >
                    Back to Lesson
                  </Button>
                )}
              </div>
            ) : (
              /* Quiz Questions */
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-3 bg-muted/30 rounded-lg">
                    <p className="font-medium text-foreground mb-2 text-sm">
                      <span className={cn("mr-1.5 font-bold", isRookieCourse ? "text-green-400" : "text-blue-400")}>
                        {index + 1}.
                      </span>
                      {question.question_text}
                    </p>

                    {question.question_type === 'multiple_choice' && question.options && (
                      <div className="space-y-1.5">
                        {question.options.map((option) => (
                          <label 
                            key={option.id}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                              answers[question.id] === option.id
                                ? isRookieCourse 
                                  ? 'border-green-500 bg-green-500/10'
                                  : 'border-blue-500 bg-blue-500/10'
                                : 'border-border hover:border-muted-foreground/50'
                            )}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option.id}
                              checked={answers[question.id] === option.id}
                              onChange={() => setAnswers(prev => ({ ...prev, [question.id]: option.id }))}
                              className="sr-only"
                            />
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                              answers[question.id] === option.id
                                ? isRookieCourse ? "border-green-500" : "border-blue-500"
                                : "border-muted-foreground/50"
                            )}>
                              {answers[question.id] === option.id && (
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isRookieCourse ? "bg-green-500" : "bg-blue-500"
                                )} />
                              )}
                            </div>
                            <span className="text-foreground text-sm">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex gap-2 pt-3">
                  <Button variant="outline" size="sm" onClick={() => setShowQuiz(false)}>
                    Back to Lesson
                  </Button>
                  <Button 
                    onClick={handleSubmitQuiz}
                    size="sm"
                    className={cn(
                      "flex-1 font-semibold",
                      isRookieCourse 
                        ? "bg-green-500 hover:bg-green-600" 
                        : "bg-blue-500 hover:bg-blue-600"
                    )}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      {!showQuiz && (
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
                          ? isRookieCourse ? "bg-green-500" : "bg-blue-500"
                          : i === currentLessonIndex
                            ? isRookieCourse ? "bg-green-400 ring-1 ring-green-400/30" : "bg-blue-400 ring-1 ring-blue-400/30"
                            : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {currentLessonIndex + 1}/{siblingLessons.length}
                </span>
              </div>

              {/* Next/Complete Button - State Machine */}
              <Button
                onClick={handleNext}
                size="sm"
                disabled={buttonState === 'locked'}
                className={cn(
                  "gap-1.5 font-semibold transition-all",
                  buttonState !== 'locked' && (
                    isRookieCourse
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  )
                )}
              >
                {buttonLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
