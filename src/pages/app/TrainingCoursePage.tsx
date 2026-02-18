import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, CheckCircle2, Lock, PlayCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  display_order: number;
  completed: boolean;
  quiz_passed: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  target_role: 'rookie' | 'manager' | 'admin' | null;
}

// Rookie courses always show green
const ROOKIE_COURSES = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];

export default function TrainingCoursePage() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  const isManager = role === 'manager' || role === 'admin';
  const isRookieCourse = course ? (ROOKIE_COURSES.includes(course.slug) || course.target_role === null) : true;
  const accentColor = isRookieCourse ? 'green' : 'blue';

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!user || !courseSlug) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: courseData, error: courseError } = await supabase
          .from('training_courses')
          .select('*')
          .eq('slug', courseSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (courseError || !courseData) {
          console.error('Course not found:', courseError);
          navigate('/app/training');
          return;
        }

        setCourse(courseData);

        const { data: modulesData, error: modulesError } = await supabase
          .from('training_modules')
          .select('*')
          .eq('course_id', courseData.id)
          .eq('is_active', true)
          .order('display_order');

        if (modulesError) {
          console.error('Error fetching modules:', modulesError);
          return;
        }

        const modulesWithLessons = await Promise.all(
          (modulesData || []).map(async (module) => {
            const { data: lessonsData } = await supabase
              .from('training_lessons')
              .select('id, title, display_order')
              .eq('module_id', module.id)
              .eq('is_active', true)
              .order('display_order');

            const lessonIds = (lessonsData || []).map(l => l.id);
            let progressMap = new Map();

            if (lessonIds.length > 0) {
              const { data: progressData } = await supabase
                .from('lesson_progress')
                .select('lesson_id, completed_at, quiz_passed')
                .eq('user_id', user.id)
                .in('lesson_id', lessonIds);

              progressMap = new Map(
                (progressData || []).map(p => [p.lesson_id, p])
              );
            }

            const lessons = (lessonsData || []).map(lesson => ({
              ...lesson,
              completed: progressMap.has(lesson.id) && progressMap.get(lesson.id).completed_at,
              quiz_passed: progressMap.has(lesson.id) && progressMap.get(lesson.id).quiz_passed,
            }));

            return {
              ...module,
              lessons,
            };
          })
        );

        setModules(modulesWithLessons);

        const totalLessons = modulesWithLessons.reduce((sum, m) => sum + m.lessons.length, 0);
        const completedLessons = modulesWithLessons.reduce(
          (sum, m) => sum + m.lessons.filter(l => l.quiz_passed).length, 
          0
        );
        setOverallProgress(totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [courseSlug, user, navigate]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-xl text-foreground mb-4">Course not found</h1>
          <button 
            onClick={() => navigate('/app/training')}
            className={cn(
              "hover:underline",
              isRookieCourse ? "text-green-400" : "text-blue-400"
            )}
          >
            Back to Training
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
          onClick={() => navigate('/app/training')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Training
        </button>

        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">
              {course.title.replace(' (Management Edition)', '')}
            </h1>
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border",
              isRookieCourse 
                ? "bg-green-500/15 text-green-400 border-green-500/30"
                : "bg-blue-500/15 text-blue-400 border-blue-500/30"
            )}>
              {isRookieCourse ? 'ROOKIE' : 'MANAGER'}
            </span>
          </div>
          {course.description && (
            <p className="text-muted-foreground">{course.description}</p>
          )}
          
          {/* Overall Progress */}
          <div className="mt-4 p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Overall Progress</span>
              <span className={cn(
                "text-sm font-medium",
                isRookieCourse ? "text-green-400" : "text-blue-400"
              )}>{overallProgress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  isRookieCourse ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-6">
          {modules.map((module, moduleIndex) => {
            const moduleProgress = module.lessons.length > 0
              ? Math.round((module.lessons.filter(l => l.quiz_passed).length / module.lessons.length) * 100)
              : 0;
            
            const isModuleComplete = moduleProgress === 100;
            const isModuleLocked = moduleIndex > 0 && 
              modules[moduleIndex - 1].lessons.some(l => !l.quiz_passed);

            // Find the first incomplete lesson across all modules to determine "continue" point
            const isCurrentModule = !isModuleLocked && !isModuleComplete && 
              (moduleIndex === 0 || !modules[moduleIndex - 1].lessons.some(l => !l.quiz_passed));

            // Find the first incomplete lesson to navigate to
            const firstIncompleteLessonId = !isModuleLocked 
              ? module.lessons.find(l => !l.quiz_passed)?.id || module.lessons[0]?.id
              : null;

            const handleModuleClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (isModuleLocked || !firstIncompleteLessonId) return;
              navigate(`/app/training/${courseSlug}/${firstIncompleteLessonId}`);
            };

            return (
              <div 
                key={module.id}
                className={cn(
                  "bg-card rounded-lg border transition-all",
                  isModuleLocked 
                    ? 'border-border opacity-40 grayscale cursor-not-allowed' 
                    : isModuleComplete
                      ? 'border-border/50 opacity-60'
                      : isCurrentModule
                        ? isRookieCourse
                          ? 'border-green-500/50 ring-1 ring-green-500/20 shadow-[0_0_15px_-5px_rgba(34,197,94,0.15)]'
                          : 'border-blue-500/50 ring-1 ring-blue-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.15)]'
                        : isRookieCourse
                          ? 'border-border hover:border-green-500/30'
                          : 'border-border hover:border-blue-500/30'
                )}
              >
                {/* Module Header - Clickable */}
                <div 
                  onClick={handleModuleClick}
                  className={cn(
                    "p-4 border-b border-border transition-colors",
                    isCurrentModule && "bg-muted/30",
                    !isModuleLocked && "cursor-pointer hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-sm font-medium px-2 py-0.5 rounded",
                        isModuleComplete
                          ? "text-muted-foreground bg-muted/50"
                          : isRookieCourse 
                            ? "text-green-400 bg-green-500/10"
                            : "text-blue-400 bg-blue-500/10"
                      )}>
                        {isModuleComplete ? '✓' : `Module ${moduleIndex + 1}`}
                      </span>
                      <h3 className={cn(
                        "font-semibold",
                        isModuleComplete ? "text-muted-foreground" : "text-foreground"
                      )}>{module.title}</h3>
                      {isCurrentModule && (
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse",
                          isRookieCourse 
                            ? "bg-green-500/15 text-green-400"
                            : "bg-blue-500/15 text-blue-400"
                        )}>
                          CONTINUE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {moduleProgress}%
                      </span>
                      {isModuleLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                      {!isModuleLocked && (
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-transform",
                          isCurrentModule 
                            ? isRookieCourse ? "text-green-400" : "text-blue-400"
                            : "text-muted-foreground"
                        )} />
                      )}
                    </div>
                  </div>
                  {module.description && (
                    <p className="text-sm text-muted-foreground mt-2">{module.description}</p>
                  )}
                </div>

                {/* Lessons */}
                <div className="divide-y divide-border">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isLessonLocked = isModuleLocked || 
                      (lessonIndex > 0 && !module.lessons[lessonIndex - 1].quiz_passed);
                    
                    // First incomplete, unlocked lesson in this module = current lesson
                    const isCurrentLesson = !isLessonLocked && !lesson.quiz_passed &&
                      (lessonIndex === 0 || module.lessons[lessonIndex - 1].quiz_passed);

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => !isLessonLocked && navigate(`/app/training/${courseSlug}/${lesson.id}`)}
                        disabled={isLessonLocked}
                        className={cn(
                          "w-full p-4 flex items-center justify-between text-left transition-all",
                          isLessonLocked 
                            ? 'cursor-not-allowed opacity-40' 
                            : lesson.quiz_passed
                              ? 'opacity-60 hover:opacity-80 cursor-pointer'
                              : isCurrentLesson
                                ? cn(
                                    'cursor-pointer',
                                    isRookieCourse 
                                      ? 'bg-green-500/5 hover:bg-green-500/10' 
                                      : 'bg-blue-500/5 hover:bg-blue-500/10'
                                  )
                                : 'hover:bg-muted/50 cursor-pointer'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {lesson.quiz_passed ? (
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                          ) : isLessonLocked ? (
                            <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : isCurrentLesson ? (
                            <PlayCircle className={cn(
                              "w-5 h-5 flex-shrink-0 animate-pulse",
                              isRookieCourse ? "text-green-400" : "text-blue-400"
                            )} />
                          ) : (
                            <PlayCircle className={cn(
                              "w-5 h-5 flex-shrink-0",
                              isRookieCourse ? "text-green-400/60" : "text-blue-400/60"
                            )} />
                          )}
                          <span className={cn(
                            "text-sm",
                            lesson.quiz_passed 
                              ? 'text-muted-foreground line-through decoration-muted-foreground/30' 
                              : isLessonLocked 
                                ? 'text-muted-foreground'
                                : isCurrentLesson
                                  ? 'text-foreground font-medium'
                                  : 'text-foreground'
                          )}>
                            {lesson.title}
                          </span>
                        </div>
                        {!isLessonLocked && (
                          <ChevronRight className={cn(
                            "w-4 h-4",
                            isCurrentLesson 
                              ? isRookieCourse ? "text-green-400" : "text-blue-400"
                              : "text-muted-foreground"
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </AppLayout>
  );
}
