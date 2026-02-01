import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ArrowLeft, CheckCircle2, BookOpen, HelpCircle, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  content: string;
  key_takeaways: string[] | null;
  video_url: string | null;
  module_id: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'scenario';
  options: { id: string; text: string; isCorrect?: boolean }[] | null;
  display_order: number;
}

// Rookie courses always use green
const ROOKIE_COURSES = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];

export default function LessonPage() {
  const { courseSlug, lessonId } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ passed: boolean; score: number } | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const isRookieCourse = ROOKIE_COURSES.includes(courseSlug || '');

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
          console.error('Lesson not found:', lessonError);
          navigate(`/app/training/${courseSlug}`);
          return;
        }

        setLesson(lessonData);

        const { data: questionsData, error: questionsError } = await supabase
          .rpc('get_quiz_questions', { _lesson_id: lessonId });

        if (!questionsError && questionsData) {
          setQuestions(questionsData as unknown as QuizQuestion[]);
        }

        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('quiz_passed')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (progressData?.quiz_passed) {
          setLessonCompleted(true);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, user, courseSlug, navigate]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    if (!user || !lessonId) return;

    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      toast.error(`Please answer all questions (${unansweredCount} remaining)`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('validate_and_record_quiz', {
        _lesson_id: lessonId,
        _answers: answers
      });

      if (error) {
        toast.error('Failed to submit quiz');
        return;
      }

      const result = data as { passed?: boolean; score?: number; error?: string } | null;

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      const passed = result?.passed ?? false;
      const score = result?.score ?? 0;
      setQuizResult({ passed, score });

      if (passed) {
        toast.success('Quiz passed! 🎉', { description: `You scored ${score}%` });
        setLessonCompleted(true);
      } else {
        toast.error('Quiz not passed', { description: `You scored ${score}%. You need 80% to pass.` });
      }
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetakeQuiz = () => {
    setAnswers({});
    setQuizResult(null);
    setShowQuiz(true);
  };

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
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl text-foreground mb-4">Lesson not found</h1>
          <button 
            onClick={() => navigate(`/app/training/${courseSlug}`)}
            className={cn(
              "hover:underline",
              isRookieCourse ? "text-green-400" : "text-blue-400"
            )}
          >
            Back to Course
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(`/app/training/${courseSlug}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </button>

        {/* Lesson Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {lessonCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <BookOpen className={cn(
                "w-6 h-6",
                isRookieCourse ? "text-green-400" : "text-blue-400"
              )} />
            )}
            <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border",
              isRookieCourse 
                ? "bg-green-500/15 text-green-400 border-green-500/30"
                : "bg-blue-500/15 text-blue-400 border-blue-500/30"
            )}>
              {isRookieCourse ? 'ROOKIE' : 'MANAGER'}
            </span>
          </div>
          {lessonCompleted && (
            <p className="text-sm text-green-500">✓ Lesson completed</p>
          )}
        </div>

        {!showQuiz ? (
          <>
            {/* Lesson Content */}
            <div className="bg-card rounded-lg border border-border p-6 mb-6">
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(
                    lesson.content
                      .replace(/\n/g, '<br>')
                      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-foreground mb-4">$1</h1>')
                      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-foreground mt-6 mb-3">$1</h2>')
                      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-foreground mt-4 mb-2">$1</h3>')
                      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary pl-4 my-4 text-foreground italic">$1</blockquote>')
                      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
                      .replace(/---/g, '<hr class="border-border my-6">'),
                    { ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'br', 'blockquote', 'hr', 'span', 'div'] }
                  )
                }}
              />
            </div>

            {/* Key Takeaways */}
            {lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
              <div className={cn(
                "border rounded-lg p-6 mb-8",
                isRookieCourse 
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-blue-500/5 border-blue-500/20"
              )}>
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className={cn(
                    "w-5 h-5",
                    isRookieCourse ? "text-green-400" : "text-blue-400"
                  )} />
                  Key Takeaways
                </h3>
                <ul className="space-y-2">
                  {lesson.key_takeaways.map((takeaway, index) => (
                    <li key={index} className="flex items-start gap-2 text-muted-foreground">
                      <span className={isRookieCourse ? "text-green-400" : "text-blue-400"}>•</span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Take Quiz Button */}
            {questions.length > 0 && (
              <Button
                onClick={() => setShowQuiz(true)}
                className={cn(
                  "w-full font-bold",
                  isRookieCourse 
                    ? "bg-green-500 hover:bg-green-600" 
                    : "bg-blue-500 hover:bg-blue-600"
                )}
                size="lg"
              >
                {lessonCompleted ? 'Retake Quiz' : 'Take Quiz'}
                <HelpCircle className="w-4 h-4 ml-2" />
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Quiz Section */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <HelpCircle className={cn(
                  "w-5 h-5",
                  isRookieCourse ? "text-green-400" : "text-blue-400"
                )} />
                Lesson Quiz
              </h2>

              {quizResult ? (
                <div className={`p-6 rounded-lg text-center ${
                  quizResult.passed 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-destructive/10 border border-destructive/20'
                }`}>
                  <div className="text-4xl mb-2">
                    {quizResult.passed ? '🎉' : '😔'}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${
                    quizResult.passed ? 'text-green-500' : 'text-destructive'
                  }`}>
                    {quizResult.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    You scored {quizResult.score}%
                    {!quizResult.passed && ' (80% required to pass)'}
                  </p>
                  {quizResult.passed ? (
                    <Button 
                      onClick={() => navigate(`/app/training/${courseSlug}`)}
                      className={cn(
                        "font-bold",
                        isRookieCourse 
                          ? "bg-green-500 hover:bg-green-600" 
                          : "bg-blue-500 hover:bg-blue-600"
                      )}
                    >
                      Continue to Next Lesson
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={() => setShowQuiz(false)}>
                        Review Lesson
                      </Button>
                      <Button 
                        onClick={handleRetakeQuiz}
                        className={cn(
                          "font-bold",
                          isRookieCourse 
                            ? "bg-green-500 hover:bg-green-600" 
                            : "bg-blue-500 hover:bg-blue-600"
                        )}
                      >
                        Retake Quiz
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div key={question.id} className="p-4 bg-muted/30 rounded-lg">
                      <p className="font-medium text-foreground mb-3">
                        <span className={cn(
                          "mr-2",
                          isRookieCourse ? "text-green-400" : "text-blue-400"
                        )}>{index + 1}.</span>
                        {question.question_text}
                      </p>

                      {question.question_type === 'multiple_choice' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option) => (
                            <label 
                              key={option.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
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
                                onChange={() => handleAnswerChange(question.id, option.id)}
                                className={isRookieCourse ? "text-green-500" : "text-blue-500"}
                              />
                              <span className="text-sm text-foreground">{option.text}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {(question.question_type === 'short_answer' || question.question_type === 'scenario') && (
                        <textarea
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          placeholder="Type your answer here..."
                          className={cn(
                            "w-full p-3 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 min-h-[100px]",
                            isRookieCourse 
                              ? "border-green-500/30 focus:ring-green-500/50"
                              : "border-blue-500/30 focus:ring-blue-500/50"
                          )}
                        />
                      )}
                    </div>
                  ))}

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowQuiz(false)}>
                      Back to Lesson
                    </Button>
                    <Button 
                      onClick={handleSubmitQuiz}
                      disabled={isSubmitting}
                      className={cn(
                        "flex-1 font-bold",
                        isRookieCourse 
                          ? "bg-green-500 hover:bg-green-600" 
                          : "bg-blue-500 hover:bg-blue-600"
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Quiz'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </AppLayout>
  );
}
