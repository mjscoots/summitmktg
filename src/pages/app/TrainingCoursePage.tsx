import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, CheckCircle2, Lock, PlayCircle, ArrowLeft } from 'lucide-react';

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
}

export default function TrainingCoursePage() {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  const isManager = role === 'manager' || role === 'admin';
  const themeRole = isManager ? 'manager' : 'rookie';

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!user || !courseSlug) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch course
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

        // Fetch modules
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

        // For each module, fetch lessons and progress
        const modulesWithLessons = await Promise.all(
          (modulesData || []).map(async (module) => {
            const { data: lessonsData } = await supabase
              .from('training_lessons')
              .select('id, title, display_order')
              .eq('module_id', module.id)
              .eq('is_active', true)
              .order('display_order');

            // Fetch progress for these lessons
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

        // Calculate overall progress
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
      <ThemeProvider initialRole={themeRole}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  if (!course) {
    return (
      <ThemeProvider initialRole={themeRole}>
        <div className="min-h-screen bg-background">
          <DashboardHeader />
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h1 className="text-xl text-foreground mb-4">Course not found</h1>
            <button 
              onClick={() => navigate('/app/training')}
              className="text-primary hover:underline"
            >
              Back to Training
            </button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider initialRole={themeRole}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          {/* Course Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{course.title}</h1>
            {course.description && (
              <p className="text-muted-foreground">{course.description}</p>
            )}
            
            {/* Overall Progress */}
            <div className="mt-4 p-4 bg-card rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Progress</span>
                <span className="text-sm font-medium text-primary">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </div>

          {/* Modules List */}
          <div className="space-y-6">
            {modules.map((module, moduleIndex) => {
              const moduleProgress = module.lessons.length > 0
                ? Math.round((module.lessons.filter(l => l.quiz_passed).length / module.lessons.length) * 100)
                : 0;
              
              const isModuleLocked = moduleIndex > 0 && 
                modules[moduleIndex - 1].lessons.some(l => !l.quiz_passed);

              return (
                <div 
                  key={module.id}
                  className={`bg-card rounded-lg border transition-all ${
                    isModuleLocked ? 'border-border opacity-60' : 'border-border hover:border-primary/30'
                  }`}
                >
                  {/* Module Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          Module {moduleIndex + 1}
                        </span>
                        <h3 className="font-semibold text-foreground">{module.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {moduleProgress}%
                        </span>
                        {isModuleLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
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

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => !isLessonLocked && navigate(`/app/training/${courseSlug}/${lesson.id}`)}
                          disabled={isLessonLocked}
                          className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                            isLessonLocked 
                              ? 'cursor-not-allowed' 
                              : 'hover:bg-muted/50 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {lesson.quiz_passed ? (
                              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                            ) : isLessonLocked ? (
                              <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />
                            )}
                            <span className={`text-sm ${
                              lesson.quiz_passed 
                                ? 'text-muted-foreground' 
                                : isLessonLocked 
                                  ? 'text-muted-foreground'
                                  : 'text-foreground'
                            }`}>
                              {lesson.title}
                            </span>
                          </div>
                          {!isLessonLocked && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
      </div>
    </ThemeProvider>
  );
}
