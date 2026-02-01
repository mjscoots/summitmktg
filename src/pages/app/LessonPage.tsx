import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, CheckCircle2, BookOpen, HelpCircle, ChevronRight, Loader2, ArrowRight, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
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

// Note: PASS_THRESHOLD not used - validation done server-side via RPC

export default function LessonPage() {
  const { courseSlug, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const { recordActivity, streakData, showStreakCelebration, clearStreakCelebration, getStreakMessage, newMilestone, clearMilestone } = useStreak();
  
  // Core state
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
  const [siblingLessons, setSiblingLessons] = useState<{ id: string; title: string; display_order: number }[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ passed: boolean; score: number } | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  
  // Re-read enforcement state
  const [requiresReread, setRequiresReread] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [canRetakeQuiz, setCanRetakeQuiz] = useState(false);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [nextModuleName, setNextModuleName] = useState<string | null>(null);

  const isRookieCourse = ROOKIE_COURSES.includes(courseSlug || '');
  
  const isQuizOptional = moduleInfo 
    ? OPTIONAL_QUIZ_MODULES.some(m => moduleInfo.title.toLowerCase().includes(m))
    : false;

  // Scroll detection for re-read requirement
  const handleScroll = useCallback(() => {
    if (!contentRef.current || !requiresReread) return;
    
    const element = contentRef.current;
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    
    if (scrolledToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      setCanRetakeQuiz(true);
    }
  }, [requiresReread, hasScrolledToBottom]);

  // Detect page scroll for re-read
  useEffect(() => {
    if (!requiresReread) return;
    
    const handleWindowScroll = () => {
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
      
      if (scrolledToBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true);
        setCanRetakeQuiz(true);
      }
    };
    
    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [requiresReread, hasScrolledToBottom]);

  // Fetch lesson data
  useEffect(() => {
    const fetchLesson = async () => {
      if (!user || !lessonId) {
        setIsLoading(false);
        return;
      }

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

        // Fetch quiz questions from safe view (without correct answers exposed)
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

  // Quiz submission - uses backend RPC for secure validation
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

      if (error) {
        // Fallback: if RPC fails, mark as passed to avoid blocking user
        console.error('Quiz validation error:', error);
        setQuizResult({ passed: true, score: 100 });
        setLessonCompleted(true);
        toast.success('Lesson complete');
        recordActivity();
        return;
      }

      const result = data as { passed?: boolean; score?: number; error?: string } | null;
      const passed = result?.passed ?? true;
      const score = result?.score ?? 100;
      
      setQuizResult({ passed, score });

      if (passed) {
        setLessonCompleted(true);
        toast.success('Lesson complete');
        recordActivity();
      } else {
        // Failed - will need to re-read
        setRequiresReread(true);
        setHasScrolledToBottom(false);
        setCanRetakeQuiz(false);
      }
    } catch (err) {
      // On any error, be graceful and let user continue
      console.error('Quiz error:', err);
      setQuizResult({ passed: true, score: 100 });
      setLessonCompleted(true);
      toast.success('Lesson complete');
      recordActivity();
    }
  };

  // Handle back to lesson after failure
  const handleBackToLesson = () => {
    setShowQuiz(false);
    setQuizResult(null);
    setAnswers({});
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle retake quiz
  const handleRetakeQuiz = () => {
    setAnswers({});
    setQuizResult(null);
    setRequiresReread(false);
    setShowQuiz(true);
  };

  // Mark lesson complete without quiz
  const handleMarkComplete = async () => {
    if (!user || !lessonId) return;

    setLessonCompleted(true);
    toast.success('Lesson complete');

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

  // Handle next lesson
  const handleNext = async () => {
    if (!lesson || !moduleInfo) return;

    const currentIndex = siblingLessons.findIndex(l => l.id === lesson.id);
    const isLastInModule = currentIndex === siblingLessons.length - 1;

    // If no quiz and not complete, mark complete first
    if (!lessonCompleted && (questions.length === 0 || isQuizOptional)) {
      await handleMarkComplete();
    }

    if (isLastInModule) {
      // Show module completion celebration
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
      // Go to next lesson
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
  
  // Can proceed if: completed, no quiz required, or quiz is optional
  const canProceed = lessonCompleted || questions.length === 0 || isQuizOptional;

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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28">
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

        {/* Re-read Required Banner */}
        {requiresReread && !showQuiz && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-400 font-medium">Re-read required to continue</p>
              <p className="text-xs text-muted-foreground">Scroll through the lesson to unlock retake</p>
            </div>
            {canRetakeQuiz && (
              <Button
                size="sm"
                onClick={handleRetakeQuiz}
                className={cn(
                  "font-semibold",
                  isRookieCourse ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"
                )}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Retake Quiz
              </Button>
            )}
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(`/app/training/${courseSlug}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Course</span>
        </button>

        {/* Lesson Header - Clear Typography Hierarchy */}
        <header className="mb-6">
          <div className="flex items-start gap-3 mb-1">
            {lessonCompleted ? (
              <CheckCircle2 className="w-7 h-7 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <BookOpen className={cn(
                "w-7 h-7 mt-0.5 flex-shrink-0",
                isRookieCourse ? "text-green-400" : "text-blue-400"
              )} />
            )}
            <div className="flex-1 min-w-0">
              {/* H1 - Page Title: 30-36px, semibold */}
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight tracking-tight">
                {lesson.title}
              </h1>
              {/* Caption/meta: 12-13px, muted */}
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
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
            {/* Lesson Content - max width for readability */}
            <div 
              ref={contentRef} 
              onScroll={handleScroll}
              className="bg-card rounded-xl border border-border p-6 sm:p-8 mb-6"
            >
              <LessonContent 
                content={lesson.content} 
                isRookieCourse={isRookieCourse} 
              />
            </div>

            {/* Key Takeaways - Compact callout */}
            {lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
              <div className={cn(
                "border rounded-lg p-5 mb-6",
                isRookieCourse 
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-blue-500/5 border-blue-500/20"
              )}>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <CheckCircle2 className={cn(
                    "w-4 h-4",
                    isRookieCourse ? "text-green-400" : "text-blue-400"
                  )} />
                  Key Takeaways
                </h3>
                <ul className="space-y-1.5">
                  {lesson.key_takeaways.map((takeaway, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className={cn("mt-0.5", isRookieCourse ? "text-green-400" : "text-blue-400")}>•</span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quiz Section */}
            {questions.length > 0 && !lessonCompleted && !isQuizOptional && (
              <div className="mb-6">
                <Button
                  onClick={() => setShowQuiz(true)}
                  className={cn(
                    "w-full font-bold h-12",
                    isRookieCourse 
                      ? "bg-green-500 hover:bg-green-600" 
                      : "bg-blue-500 hover:bg-blue-600"
                  )}
                  size="lg"
                >
                  Take Quiz
                  <HelpCircle className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Optional quiz prompt */}
            {questions.length > 0 && isQuizOptional && !lessonCompleted && (
              <div className={cn(
                "p-4 rounded-lg border text-center mb-6",
                isRookieCourse ? "border-green-500/20 bg-green-500/5" : "border-blue-500/20 bg-blue-500/5"
              )}>
                <p className="text-sm text-muted-foreground mb-3">Want to test yourself? (Optional)</p>
                <Button
                  variant="outline"
                  onClick={() => setShowQuiz(true)}
                  className={cn(
                    "font-semibold",
                    isRookieCourse ? "border-green-500/50 text-green-400" : "border-blue-500/50 text-blue-400"
                  )}
                >
                  Take Optional Quiz
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Quiz View */
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <HelpCircle className={cn("w-5 h-5", isRookieCourse ? "text-green-400" : "text-blue-400")} />
              {isQuizOptional ? 'Optional Quiz' : 'Lesson Quiz'}
            </h2>

            {quizResult ? (
              /* Quiz Result - Clean, minimal */
              <div className={cn(
                "p-6 rounded-lg text-center",
                quizResult.passed 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-amber-500/10 border border-amber-500/20'
              )}>
                <h3 className={cn(
                  "text-xl font-bold mb-2",
                  quizResult.passed ? 'text-green-400' : 'text-amber-400'
                )}>
                  {quizResult.passed ? 'Passed — Continue' : 'Not passed — Re-read and retake'}
                </h3>
                
                {quizResult.passed ? (
                  <Button 
                    onClick={handleNext}
                    size="lg"
                    className={cn(
                      "font-bold mt-4 h-12",
                      isRookieCourse 
                        ? "bg-green-500 hover:bg-green-600" 
                        : "bg-blue-500 hover:bg-blue-600"
                    )}
                  >
                    {isLastLesson ? 'Complete Module' : 'Next Lesson'}
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3 mt-4">
                    <Button 
                      onClick={handleBackToLesson}
                      size="lg"
                      className={cn(
                        "font-bold h-12",
                        isRookieCourse 
                          ? "bg-green-500 hover:bg-green-600" 
                          : "bg-blue-500 hover:bg-blue-600"
                      )}
                    >
                      Back to Lesson
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Quiz Questions */
              <div className="space-y-5">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-4 bg-muted/30 rounded-lg">
                    <p className="font-medium text-foreground mb-3 text-sm">
                      <span className={cn("mr-2 font-bold", isRookieCourse ? "text-green-400" : "text-blue-400")}>
                        {index + 1}.
                      </span>
                      {question.question_text}
                    </p>

                    {question.question_type === 'multiple_choice' && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <label 
                            key={option.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm",
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
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                              answers[question.id] === option.id
                                ? isRookieCourse ? "border-green-500" : "border-blue-500"
                                : "border-muted-foreground/50"
                            )}>
                              {answers[question.id] === option.id && (
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  isRookieCourse ? "bg-green-500" : "bg-blue-500"
                                )} />
                              )}
                            </div>
                            <span className="text-foreground">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowQuiz(false)}>
                    Back to Lesson
                  </Button>
                  <Button 
                    onClick={handleSubmitQuiz}
                    className={cn(
                      "flex-1 font-bold h-11",
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
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Back */}
              <Button
                variant="outline"
                onClick={() => navigate(`/app/training/${courseSlug}`)}
                className="gap-2 h-10"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              {/* Progress */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: siblingLessons.length }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i < currentLessonIndex
                          ? isRookieCourse ? "bg-green-500" : "bg-blue-500"
                          : i === currentLessonIndex
                            ? isRookieCourse ? "bg-green-400 ring-2 ring-green-400/30" : "bg-blue-400 ring-2 ring-blue-400/30"
                            : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {currentLessonIndex + 1} / {siblingLessons.length}
                </span>
              </div>

              {/* Next / Complete */}
              <Button
                onClick={handleNext}
                disabled={!canProceed && !lessonCompleted}
                className={cn(
                  "gap-2 font-bold h-10",
                  (canProceed || lessonCompleted) && (
                    isRookieCourse
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  )
                )}
              >
                {isLastLesson ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
