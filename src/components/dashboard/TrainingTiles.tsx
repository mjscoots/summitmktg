import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Video, Users, FileText, GraduationCap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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
};

export function TrainingTiles() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        // Fetch courses based on role
        let query = supabase
          .from('training_courses')
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        // Rookies only see courses without target_role or with target_role = null
        if (role === 'rookie') {
          query = query.is('target_role', null);
        }

        const { data: coursesData, error: coursesError } = await query;

        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          return;
        }

        // For each course, calculate progress
        const coursesWithProgress = await Promise.all(
          (coursesData || []).map(async (course) => {
            // Get total lessons in course
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

              // Get completed lessons for this user
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
          <div key={i} className="h-40 bg-card rounded-lg border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const isManager = role === 'manager' || role === 'admin';
  const glowClass = isManager ? 'manager-glow' : 'rookie-glow';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {courses.map((course) => (
        <div
          key={course.id}
          onClick={() => handleCourseClick(course.slug)}
          className={`group relative p-6 bg-card rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] training-tile-glow ${
            course.progress === 100 
              ? 'border-success/40' 
              : 'border-border hover:border-primary/50'
          } ${course.progress > 0 && course.progress < 100 ? glowClass : ''}`}
        >
          {/* Status indicator */}
          {course.progress === 100 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center">
              <span className="text-xs text-white">✓</span>
            </div>
          )}
          
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${
                course.progress === 100 
                  ? 'bg-success/20 text-success' 
                  : 'bg-primary/15 text-primary'
              }`}>
                {COURSE_ICONS[course.slug] || <BookOpen className="w-7 h-7" />}
              </div>
              {course.target_role === 'manager' && (
                <span className="text-xs font-bold text-primary bg-primary/15 px-2.5 py-1 rounded-full uppercase tracking-wide">
                  MANAGER
                </span>
              )}
            </div>

            <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            
            {course.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-5">
                {course.description}
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">
                  {course.completedLessons} / {course.totalLessons} lessons
                </span>
                <span className={`font-bold ${
                  course.progress === 100 ? 'text-success' : 'text-primary'
                }`}>
                  {course.progress}%
                </span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    course.progress === 100 ? 'bg-success' : 'bg-primary'
                  }`}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
