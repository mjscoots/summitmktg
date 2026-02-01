import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Video, Users, FileText, GraduationCap, Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  target_role: 'rookie' | 'manager' | 'admin' | null;
  display_order: number;
}

interface CourseWithProgress extends Course {
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

const COURSE_ICONS: Record<string, React.ReactNode> = {
  'learn-your-pitch': <BookOpen className="w-6 h-6" />,
  'summer-sales-manual': <FileText className="w-6 h-6" />,
  'training-videos': <Video className="w-6 h-6" />,
  'management-basics': <Users className="w-6 h-6" />,
  'manager-manual': <GraduationCap className="w-6 h-6" />,
  'manager-videos': <Video className="w-6 h-6" />,
};

// Courses that are for rookies (show green)
const ROOKIE_COURSES = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];

// Fixed lesson count overrides for display
const LESSON_COUNT_OVERRIDES: Record<string, number> = {
  'summer-sales-manual': 43,
};

export function TrainingTiles() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        let query = supabase
          .from('training_courses')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (role === 'rookie') {
          query = query.is('target_role', null);
        }

        const { data: coursesData, error: coursesError } = await query;

        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          return;
        }

        const coursesWithProgress = await Promise.all(
          (coursesData || []).map(async (course) => {
            const { data: modules } = await supabase
              .from('training_modules')
              .select('id')
              .eq('course_id', course.id)
              .eq('is_active', true);

            const moduleIds = modules?.map(m => m.id) || [];

            let totalLessons = 0;
            let completedLessons = 0;

            if (moduleIds.length > 0) {
              const { count: lessonCount } = await supabase
                .from('training_lessons')
                .select('*', { count: 'exact', head: true })
                .in('module_id', moduleIds)
                .eq('is_active', true);

              totalLessons = lessonCount || 0;

              const { data: lessonIds } = await supabase
                .from('training_lessons')
                .select('id')
                .in('module_id', moduleIds)
                .eq('is_active', true);

              if (lessonIds && lessonIds.length > 0) {
                const { count: completedCount } = await supabase
                  .from('lesson_progress')
                  .select('*', { count: 'exact', head: true })
                  .eq('user_id', user.id)
                  .eq('quiz_passed', true)
                  .in('lesson_id', lessonIds.map(l => l.id));

                completedLessons = completedCount || 0;
              }
            }

            // Apply lesson count overrides
            if (LESSON_COUNT_OVERRIDES[course.slug]) {
              totalLessons = LESSON_COUNT_OVERRIDES[course.slug];
            }

            const progress = totalLessons > 0 
              ? Math.round((completedLessons / totalLessons) * 100) 
              : 0;

            return {
              ...course,
              progress,
              totalLessons,
              completedLessons,
            };
          })
        );

        setCourses(coursesWithProgress);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [role, user]);

  const handleCourseClick = (slug: string) => {
    navigate(`/app/training/${slug}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-card rounded-xl border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  // Determine if a course is rookie content (always green) or manager content (blue)
  const isRookieCourse = (slug: string, targetRole: string | null) => {
    return ROOKIE_COURSES.includes(slug) || targetRole === null;
  };

  // Find featured course (first incomplete course)
  const featuredCourse = courses.find(c => c.progress < 100) || courses[0];

  return (
    <div className="space-y-6">
      {/* Featured "Continue" Card */}
      {featuredCourse && (
        <div 
          onClick={() => handleCourseClick(featuredCourse.slug)}
          className={cn(
            "relative p-6 rounded-xl border-2 bg-card cursor-pointer transition-all duration-300 hover:scale-[1.01]",
            isRookieCourse(featuredCourse.slug, featuredCourse.target_role)
              ? "border-green-500/40 shadow-[0_0_30px_-5px_rgba(34,197,94,0.2)]"
              : "border-blue-500/40 shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)]"
          )}
        >
          {/* Role Pill */}
          <div className="absolute top-4 right-4">
            {isRookieCourse(featuredCourse.slug, featuredCourse.target_role) ? (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30">
                ROOKIE
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                MANAGER
              </span>
            )}
          </div>

          {/* Gradient overlay */}
          <div className={cn(
            "absolute inset-0 opacity-5 rounded-xl",
            isRookieCourse(featuredCourse.slug, featuredCourse.target_role)
              ? "bg-gradient-to-br from-green-500 to-transparent"
              : "bg-gradient-to-br from-blue-500 to-transparent"
          )} />

          <div className="relative flex items-start gap-5">
            <div className={cn(
              "p-4 rounded-xl flex-shrink-0",
              isRookieCourse(featuredCourse.slug, featuredCourse.target_role)
                ? "bg-green-500/15 text-green-400"
                : "bg-blue-500/15 text-blue-400"
            )}>
              {COURSE_ICONS[featuredCourse.slug] || <BookOpen className="w-8 h-8" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isRookieCourse(featuredCourse.slug, featuredCourse.target_role)
                    ? "text-green-400"
                    : "text-blue-400"
                )}>
                  {featuredCourse.progress > 0 ? 'CONTINUE' : 'START HERE'}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-1">
                {featuredCourse.title.replace(' (Management Edition)', '')}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-3">
                Next up: {featuredCourse.description || 'Begin your training journey'}
              </p>

              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  className={cn(
                    "font-bold gap-2",
                    isRookieCourse(featuredCourse.slug, featuredCourse.target_role)
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(featuredCourse.slug);
                  }}
                >
                  <Play className="w-4 h-4" />
                  Continue
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  {featuredCourse.completedLessons} / {featuredCourse.totalLessons} lessons
                </span>
              </div>
            </div>

            {/* Progress circle */}
            <div className="hidden sm:flex flex-col items-center justify-center">
              <div className={cn(
                "text-2xl font-black",
                isRookieCourse(featuredCourse.slug, featuredCourse.target_role)
                  ? "text-green-400"
                  : "text-blue-400"
              )}>
                {featuredCourse.progress}%
              </div>
              <span className="text-xs text-muted-foreground">complete</span>
            </div>
          </div>
        </div>
      )}

      {/* Other Training Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.filter(c => c.id !== featuredCourse?.id).map((course) => {
          const isRookie = isRookieCourse(course.slug, course.target_role);
          const colorClass = isRookie ? 'green' : 'blue';
          
          return (
            <div
              key={course.id}
              onClick={() => handleCourseClick(course.slug)}
              className={cn(
                "group relative p-5 bg-card rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                course.progress === 100 
                  ? 'border-success/40' 
                  : isRookie
                    ? 'border-border hover:border-green-500/50'
                    : 'border-border hover:border-blue-500/50',
                course.progress > 0 && course.progress < 100 && (
                  isRookie 
                    ? 'shadow-[0_0_20px_-8px_rgba(34,197,94,0.2)]' 
                    : 'shadow-[0_0_20px_-8px_rgba(59,130,246,0.2)]'
                )
              )}
            >
              {/* Role Pill */}
              <div className="absolute top-3 right-3">
                {isRookie ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30">
                    ROOKIE
                  </span>
                ) : (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    MANAGER
                  </span>
                )}
              </div>

              {/* Completion check */}
              {course.progress === 100 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center z-10">
                  <span className="text-xs text-white">✓</span>
                </div>
              )}
              
              <div className="relative">
                <div className={cn(
                  "p-3 rounded-xl w-fit mb-4",
                  course.progress === 100 
                    ? 'bg-success/20 text-success' 
                    : isRookie
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-blue-500/15 text-blue-400'
                )}>
                  {COURSE_ICONS[course.slug] || <BookOpen className="w-6 h-6" />}
                </div>

                <h3 className={cn(
                  "font-bold text-base text-foreground mb-2 group-hover:transition-colors pr-16",
                  isRookie ? "group-hover:text-green-400" : "group-hover:text-blue-400"
                )}>
                  {course.title.replace(' (Management Edition)', '')}
                </h3>
                
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {course.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">
                      {course.completedLessons} / {course.totalLessons} lessons
                    </span>
                    <span className={cn(
                      "font-bold",
                      course.progress === 100 
                        ? 'text-success' 
                        : isRookie ? 'text-green-400' : 'text-blue-400'
                    )}>
                      {course.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        course.progress === 100 
                          ? 'bg-success' 
                          : isRookie ? 'bg-green-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
