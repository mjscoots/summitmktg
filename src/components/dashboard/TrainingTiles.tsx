import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Video, Users, FileText, GraduationCap, Play, ArrowRight, RotateCcw } from 'lucide-react';
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

interface TrainingTilesProps {
  filterRole?: 'rookie' | 'manager';
}

const COURSE_ICONS: Record<string, React.ReactNode> = {
  'learn-your-pitch': <BookOpen className="w-6 h-6" />,
  'summer-sales-manual': <FileText className="w-6 h-6" />,
  'training-videos': <Video className="w-6 h-6" />,
  'management-basics': <Users className="w-6 h-6" />,
  'learn-the-basics': <Users className="w-6 h-6" />,
  'manager-manual': <GraduationCap className="w-6 h-6" />,
  'manager-videos': <Video className="w-6 h-6" />,
};

// Courses that are for rookies (show green)
const ROOKIE_COURSES = ['learn-your-pitch', 'summer-sales-manual', 'training-videos'];

// Fixed lesson count overrides for display
const LESSON_COUNT_OVERRIDES: Record<string, number> = {
  'summer-sales-manual': 43,
};

// Course priority order (Learn Your Pitch first)
const COURSE_PRIORITY: Record<string, number> = {
  'learn-your-pitch': 1,
  'summer-sales-manual': 2,
  'training-videos': 3,
  'learn-the-basics': 1,
  'manager-manual': 2,
  'manager-videos': 3,
};

export function TrainingTiles({ filterRole }: TrainingTilesProps) {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        const { data: coursesData, error: coursesError } = await supabase
          .from('training_courses')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          return;
        }

        // Filter courses based on filterRole prop
        let filteredCourses = coursesData || [];
        
        if (filterRole === 'rookie') {
          filteredCourses = filteredCourses.filter(
            course => ROOKIE_COURSES.includes(course.slug) || course.target_role === null
          );
        } else if (filterRole === 'manager') {
          filteredCourses = filteredCourses.filter(
            course => !ROOKIE_COURSES.includes(course.slug) && course.target_role !== null
          );
        }

        const coursesWithProgress = await Promise.all(
          filteredCourses.map(async (course) => {
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

        // Sort by priority
        coursesWithProgress.sort((a, b) => 
          (COURSE_PRIORITY[a.slug] || 99) - (COURSE_PRIORITY[b.slug] || 99)
        );

        setCourses(coursesWithProgress);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [user, filterRole]);

  const handleCourseClick = (slug: string) => {
    navigate(`/app/training/${slug}`);
  };

  const getButtonState = (progress: number) => {
    if (progress === 0) return { text: 'Start Training', icon: Play };
    if (progress === 100) return { text: 'Review', icon: RotateCcw };
    return { text: 'Continue', icon: ArrowRight };
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-card rounded-xl border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  // Determine if a course is rookie content (always green) or manager content (blue)
  const isRookieCourse = (slug: string) => {
    return ROOKIE_COURSES.includes(slug);
  };

  // Find featured course (first incomplete course, prioritizing Learn Your Pitch)
  const featuredCourse = courses.find(c => c.progress > 0 && c.progress < 100) 
    || courses.find(c => c.progress === 0) 
    || courses[0];

  if (!featuredCourse && courses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No training courses available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured "Continue" Card */}
      {featuredCourse && (
        <div 
          onClick={() => handleCourseClick(featuredCourse.slug)}
          className={cn(
            "relative p-6 rounded-xl border-2 bg-card cursor-pointer transition-all duration-300 hover:scale-[1.01]",
            isRookieCourse(featuredCourse.slug)
              ? "border-green-500/40 shadow-[0_0_30px_-5px_rgba(34,197,94,0.2)]"
              : "border-blue-500/40 shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)]"
          )}
        >
          {/* Role Pill */}
          <div className="absolute top-4 right-4">
            {isRookieCourse(featuredCourse.slug) ? (
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
            isRookieCourse(featuredCourse.slug)
              ? "bg-gradient-to-br from-green-500 to-transparent"
              : "bg-gradient-to-br from-blue-500 to-transparent"
          )} />

          <div className="relative flex items-start gap-5">
            <div className={cn(
              "p-4 rounded-xl flex-shrink-0",
              isRookieCourse(featuredCourse.slug)
                ? "bg-green-500/15 text-green-400"
                : "bg-blue-500/15 text-blue-400"
            )}>
              {COURSE_ICONS[featuredCourse.slug] || <BookOpen className="w-8 h-8" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isRookieCourse(featuredCourse.slug)
                    ? "text-green-400"
                    : "text-blue-400"
                )}>
                  {featuredCourse.progress > 0 ? 'CONTINUE' : 'START HERE'}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-1">
                {featuredCourse.title
                  .replace(' (Management Edition)', '')
                  .replace('Management Edition - ', '')}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-3">
                Next up: {featuredCourse.description || 'Begin your training journey'}
              </p>

              <div className="flex items-center gap-4">
                {(() => {
                  const { text, icon: Icon } = getButtonState(featuredCourse.progress);
                  return (
                    <Button
                      size="sm"
                      className={cn(
                        "font-bold gap-2 transition-all duration-300",
                        isRookieCourse(featuredCourse.slug)
                          ? "bg-green-500 hover:bg-green-600 text-white shadow-[0_0_20px_-5px_rgba(34,197,94,0.5)] hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.7)]"
                          : "bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.7)]"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseClick(featuredCourse.slug);
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {text}
                    </Button>
                  );
                })()}
                
                <span className="text-sm text-muted-foreground">
                  {featuredCourse.completedLessons} / {featuredCourse.totalLessons} lessons
                </span>
              </div>
            </div>

            {/* Progress circle */}
            <div className="hidden sm:flex flex-col items-center justify-center">
              <div className={cn(
                "text-2xl font-black",
                isRookieCourse(featuredCourse.slug)
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {courses.filter(c => c.id !== featuredCourse?.id).map((course) => {
          const isRookie = isRookieCourse(course.slug);
          const { text, icon: Icon } = getButtonState(course.progress);
          
          return (
            <div
              key={course.id}
              onClick={() => handleCourseClick(course.slug)}
              className={cn(
                "group relative bg-card rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col min-h-[320px]",
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
              {/* Card Content - Flex container for perfect alignment */}
              <div className="p-5 flex flex-col h-full">
                
                {/* === HEADER REGION (fixed height) === */}
                <div className="flex items-start justify-between mb-4 h-12">
                  {/* Icon */}
                  <div className={cn(
                    "p-3 rounded-xl flex-shrink-0",
                    course.progress === 100 
                      ? 'bg-success/20 text-success' 
                      : isRookie
                        ? 'bg-green-500/15 text-green-400'
                        : 'bg-blue-500/15 text-blue-400'
                  )}>
                    {COURSE_ICONS[course.slug] || <BookOpen className="w-6 h-6" />}
                  </div>

                  {/* Role Pill */}
                  <div className="flex-shrink-0">
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
                </div>

                {/* === BODY REGION (flex-grow) === */}
                <div className="flex-1 min-h-[80px]">
                  <h3 className={cn(
                    "font-bold text-base text-foreground mb-2 group-hover:transition-colors",
                    isRookie ? "group-hover:text-green-400" : "group-hover:text-blue-400"
                  )}>
                    {course.title
                      .replace(' (Management Edition)', '')
                      .replace('Management Edition - ', '')}
                  </h3>
                  
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                  )}
                </div>

                {/* === PROGRESS REGION (fixed height, ~72px) === */}
                <div className="h-[72px] flex flex-col justify-between pt-3 border-t border-border/50">
                  {/* Progress info row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-medium">
                      {course.completedLessons} / {course.totalLessons} lessons
                    </span>
                    <span className={cn(
                      "text-sm font-bold",
                      course.progress === 100 
                        ? 'text-success' 
                        : isRookie ? 'text-green-400' : 'text-blue-400'
                    )}>
                      {course.progress}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
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

                {/* === FOOTER REGION (fixed height, ~48px) === */}
                <div className="h-12 pt-3">
                  <Button
                    size="sm"
                    className={cn(
                      "w-full h-9 font-semibold gap-2 transition-all duration-300 hover:translate-y-[-2px]",
                      course.progress === 100
                        ? "bg-muted text-foreground hover:bg-muted/80"
                        : isRookie
                          ? "bg-green-500 hover:bg-green-600 text-white shadow-[0_0_15px_-5px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.6)]"
                          : "bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_15px_-5px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.6)]"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourseClick(course.slug);
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {text}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
