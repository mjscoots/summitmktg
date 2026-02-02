import { useEffect, useState, useRef, useCallback } from 'react';
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
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ passed: boolean } | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  
  // Scroll-based progression - must scroll 100% to unlock Next
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [nextModuleName, setNextModuleName] = useState<string | null>(null);

  const isRookieCourse = ROOKIE_COURSES.includes(courseSlug || '');
  
  const isQuizOptional = moduleInfo 
    ? OPTIONAL_QUIZ_MODULES.some(m => moduleInfo.title.toLowerCase().includes(m))
    : false;

  // Scroll detection - unlock Next button when scrolled to bottom
  useEffect(() => {
    const handleWindowScroll = () => {
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
      
      if (scrolledToBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true);
      }
    };
    
    // Check immediately in case content fits on screen
    setTimeout(() => {
      if (document.documentElement.scrollHeight <= window.innerHeight + 100) {
        setHasScrolledToBottom(true);
      }
    }, 500);
    
    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [hasScrolledToBottom, lesson]);

  // Fetch lesson data
  useEffect(() => {
    const fetchLesson = async () => {
      if (!user || !lessonId) {
        setIsLoading(false);
        return;
      }

      // Reset scroll state on new lesson
      setHasScrolledToBottom(false);
      window.scrollTo({ top: 0 });

      try {
        const { data: lessonData, error: lessonError } = await supabase
          .from('training_lessons')
          .select('*')
          .eq('id', lessonId)
          .eq('is_active', true)
          .maybeSingle();

        if (lessonError || !lessonData) {
          navigate(`/app/training/${courseSlug}`);
          return;
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
        }

        // Fetch sibling lessons
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
          setHasScrolledToBottom(true); // Already completed = can navigate
        }
        
        recordActivity();
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, user, courseSlug, navigate, recordActivity]);

  // Quiz submission - simplified: pass/fail only, no storage of answers
  const handleSubmitQuiz = async () => {
    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      toast.error(`Please answer all questions (${unansweredCount} remaining)`);
      return;
    }

    if (!user || !lessonId) return;

    try {
      // Use secure RPC to validate answers
      const { data, error } = await supabase.rpc('validate_and_record_quiz', {
        _lesson_id: lessonId,
        _answers: answers
      });

      // On any error, let user proceed to avoid blocking
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
      // If failed, user will see "Quiz not passed" and be sent back to lesson
    } catch {
      // On any error, be graceful and let user continue
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
    setHasScrolledToBottom(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mark lesson complete without quiz
  const handleMarkComplete = async () => {
    if (!user || !lessonId) return;

    setLessonCompleted(true);

    // Save in background
    await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
        quiz_passed: true,
      }, { onConflict: 'user_id,lesson_id' });
    
    recordActivity();
  };

  // Handle next lesson - auto-advance
  const handleNext = async () => {
    if (!lesson || !moduleInfo) return;

    const currentIndex = siblingLessons.findIndex(l => l.id === lesson.id);
    const isLastInModule = currentIndex === siblingLessons.length - 1;

    // Mark complete if no quiz required
    if (!lessonCompleted && (questions.length === 0 || isQuizOptional)) {
      await handleMarkComplete();
    }

    if (isLastInModule) {
      // Show brief "Module Complete" then auto-advance
      const { data: modules } = await supabase
        .from('training_modules')
        .select('id, title, display_order')
        .eq('course_id', moduleInfo.course_id)
        .eq('is_active', true)
        .order('display_order');

      if (modules) {
        const currentModuleIndex = modules.findIndex(m => m.id === moduleInfo.id);
        const nextModule = modules[currentModuleIndex + 1];
        
        if (nextModule) {
          setNextModuleName(nextModule.title);
        }
        
        setShowCelebration(true);
      }
    } else {
      // Go to next lesson immediately
      const nextLesson = siblingLessons[currentIndex + 1];
      if (nextLesson) {
        navigate(`/app/training/${courseSlug}/${nextLesson.id}`);
      }
    }
  };

  const handleCelebrationContinue = async () => {
    if (!moduleInfo) return;

    const { data: modules } = await supabase
      .from('training_modules')
      .select('id, display_order')
      .eq('course_id', moduleInfo.course_id)
      .eq('is_active', true)
      .order('display_order');

    if (!modules) {
      navigate(`/app/training/${courseSlug}`);
      return;
    }

    const currentModuleIndex = modules.findIndex(m => m.id === moduleInfo.id);
    const nextModule = modules[currentModuleIndex + 1];

    if (nextModule) {
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
  };

  const currentLessonIndex = lesson ? siblingLessons.findIndex(l => l.id === lesson.id) : 0;
  const isLastLesson = currentLessonIndex === siblingLessons.length - 1;
  
  // Can proceed if: scrolled to bottom AND (completed OR no quiz OR quiz optional)
  const canProceed = hasScrolledToBottom && (lessonCompleted || questions.length === 0 || isQuizOptional);

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

  if (!lesson) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl text-foreground mb-4">Lesson not found</h1>
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

        {/* Lesson Header - Compact */}
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
              {/* Title - reduced size */}
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
            >
              <LessonContent 
                content={lesson.content} 
                isRookieCourse={isRookieCourse} 
              />
            </div>

            {/* Key Takeaways - Compact */}
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
            {questions.length > 0 && !lessonCompleted && !isQuizOptional && hasScrolledToBottom && (
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
            {!hasScrolledToBottom && !lessonCompleted && (
              <div className="text-center py-3 text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Scroll to bottom to continue
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
              /* Quiz Result - Simple pass/fail */
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
                  {quizResult.passed ? 'Module Complete' : 'Quiz not passed. Review the lesson and try again.'}
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
                    {isLastLesson ? 'Continue' : 'Next Lesson'}
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
                  {Array.from({ length: siblingLessons.length }).map((_, i) => (
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

              {/* Next - disabled until scrolled */}
              <Button
                onClick={handleNext}
                size="sm"
                disabled={!canProceed && !lessonCompleted}
                className={cn(
                  "gap-1.5 font-semibold",
                  (canProceed || lessonCompleted) && (
                    isRookieCourse
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  )
                )}
              >
                {isLastLesson ? 'Complete' : 'Next'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
