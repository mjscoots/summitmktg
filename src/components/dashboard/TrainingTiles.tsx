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

  // Find the primary course for border highlight only (Learn Your Pitch / Learn the Basics)
  const primaryCourseSlug = courses.find(c => c.slug === 'learn-your-pitch')?.slug 
    || courses.find(c => c.slug === 'learn-the-basics')?.slug 
    || courses[0]?.slug;

  if (courses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No training courses available.</p>
      </div>
    );
  }

  return (
    <div>
      {/* All Training Cards in Unified Grid - Equal height cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course) => {
          const isRookie = isRookieCourse(course.slug);
          const { text, icon: Icon } = getButtonState(course.progress);
          const isPrimary = course.slug === primaryCourseSlug;
          
          return (
            <div
              key={course.id}
              onClick={() => handleCourseClick(course.slug)}
              className={cn(
                "group relative bg-card rounded-xl border cursor-pointer flex flex-col",
                // Fixed height for all cards
                "h-[340px]",
                "transition-all duration-400 ease-out",
                "hover:scale-[1.02] hover:-translate-y-1",
                // Primary card (Learn Your Pitch) gets highlight border
                isPrimary && (
                  isRookie
                    ? "border-2 border-green-500/50 shadow-[0_0_25px_-8px_rgba(34,197,94,0.25)] hover:border-green-500/70 hover:shadow-[0_0_35px_-8px_rgba(34,197,94,0.35)]"
                    : "border-2 border-blue-500/50 shadow-[0_0_25px_-8px_rgba(59,130,246,0.25)] hover:border-blue-500/70 hover:shadow-[0_0_35px_-8px_rgba(59,130,246,0.35)]"
                ),
                // Non-primary cards
                !isPrimary && (
                  course.progress === 100 
                    ? 'border border-success/40 hover:border-success/60 hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.25)]' 
                    : isRookie
                      ? 'border border-border hover:border-green-500/40 hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.2)]'
                      : 'border border-border hover:border-blue-500/40 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]'
                ),
                // In-progress glow
                !isPrimary && course.progress > 0 && course.progress < 100 && (
                  isRookie 
                    ? 'shadow-[0_0_15px_-8px_rgba(34,197,94,0.15)]' 
                    : 'shadow-[0_0_15px_-8px_rgba(59,130,246,0.15)]'
                )
              )}
            >
              {/* Gradient overlay - appears on hover */}
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-400 group-hover:opacity-100 pointer-events-none",
                course.progress === 100
                  ? "bg-gradient-to-br from-success/5 to-transparent"
                  : isRookie
                    ? "bg-gradient-to-br from-green-500/5 to-transparent"
                    : "bg-gradient-to-br from-blue-500/5 to-transparent"
              )} />

              {/* Card Content - Flex container for perfect alignment */}
              <div className="p-5 flex flex-col h-full relative">
                
                {/* === HEADER REGION (fixed height ~48px) === */}
                <div className="flex items-start justify-between mb-4 min-h-[48px]">
                  {/* Icon with hover effects */}
                  <div className={cn(
                    "p-3 rounded-xl flex-shrink-0 transition-all duration-300",
                    course.progress === 100 
                      ? 'bg-success/20 text-success group-hover:bg-success/30' 
                      : isRookie
                        ? 'bg-green-500/15 text-green-400 group-hover:bg-green-500/25'
                        : 'bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25'
                  )}>
                    <div className="transition-transform duration-300 group-hover:scale-110">
                      {COURSE_ICONS[course.slug] || <BookOpen className="w-6 h-6" />}
                    </div>
                  </div>

                  {/* Role Pill - top right, never overlapped */}
                  <div className="flex-shrink-0">
                    {isRookie ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30 transition-all duration-300 group-hover:bg-green-500/25">
                        ROOKIE
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 transition-all duration-300 group-hover:bg-blue-500/25">
                        MANAGER
                      </span>
                    )}
                  </div>

                  {/* Completion check badge */}
                  {course.progress === 100 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center z-10">
                      <span className="text-xs text-white">✓</span>
                    </div>
                  )}
                </div>

                {/* === BODY REGION (flex-grow, contains title + description) === */}
                <div className="flex-1 min-h-0">
                  <h3 className={cn(
                    "font-bold text-base text-foreground mb-2 transition-colors duration-300",
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

                {/* === PROGRESS REGION (fixed height ~56px) === */}
                <div className="h-14 flex flex-col justify-end pt-3 border-t border-border/40">
                  {/* Progress bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
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
                  {/* Progress info row - lessons left, percentage right */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {course.completedLessons} / {course.totalLessons} lessons
                    </span>
                    <span className={cn(
                      "text-xs text-muted-foreground",
                    )}>
                      {course.progress}% complete
                    </span>
                  </div>
                </div>

                {/* === FOOTER REGION (fixed height ~44px) === */}
                <div className="h-11 pt-3">
                  <Button
                    size="sm"
                    className={cn(
                      "w-full h-9 font-semibold gap-2",
                      "transition-all duration-300 ease-out",
                      "hover:translate-y-[-2px] active:translate-y-0",
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
