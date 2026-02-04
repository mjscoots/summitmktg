import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Target, CheckCircle, Lock, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Quest {
  id: string;
  title: string;
  status: 'complete' | 'active' | 'locked';
  action?: string;
}

interface CourseProgress {
  id: string;
  title: string;
  slug: string;
  completed: number;
  total: number;
}

export function QuestLog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      try {
        // Fetch rookie courses
        const { data: coursesData } = await supabase
          .from('training_courses')
          .select('id, title, slug')
          .eq('is_active', true)
          .eq('target_role', 'rookie')
          .order('display_order');

        if (!coursesData) return;

        // Fetch modules and lessons for each course
        const progressPromises = coursesData.map(async (course) => {
          const { data: modules } = await supabase
            .from('training_modules')
            .select('id')
            .eq('course_id', course.id)
            .eq('is_active', true);

          const moduleIds = modules?.map(m => m.id) || [];
          
          if (moduleIds.length === 0) {
            return { ...course, completed: 0, total: 0 };
          }

          const { data: lessons } = await supabase
            .from('training_lessons')
            .select('id')
            .in('module_id', moduleIds)
            .eq('is_active', true);

          const lessonIds = lessons?.map(l => l.id) || [];

          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds)
            .not('completed_at', 'is', null);

          return {
            ...course,
            completed: progress?.length || 0,
            total: lessonIds.length,
          };
        });

        const results = await Promise.all(progressPromises);
        setCourses(results);
      } catch (err) {
        console.error('Error fetching progress:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  // Generate quests from actual training progress
  const quests: Quest[] = [];
  
  if (!isLoading && courses.length > 0) {
    courses.forEach((course, index) => {
      const isComplete = course.total > 0 && course.completed >= course.total;
      const isPreviousComplete = index === 0 || 
        (courses[index - 1].total > 0 && courses[index - 1].completed >= courses[index - 1].total);
      
      quests.push({
        id: course.id,
        title: isComplete ? `✓ ${course.title}` : course.title,
        status: isComplete ? 'complete' : isPreviousComplete ? 'active' : 'locked',
        action: `/app/training/${course.slug}`,
      });
    });
  }

  // Default quests if no data
  const defaultQuests: Quest[] = [
    { id: '1', title: 'Complete Learn Your Pitch', status: 'active', action: '/app/training' },
    { id: '2', title: 'Pass Summer Sales Manual', status: 'locked' },
    { id: '3', title: 'Unlock Video Library', status: 'locked' },
  ];

  const displayQuests = quests.length > 0 ? quests : defaultQuests;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <div className="animate-pulse text-muted-foreground text-sm">Loading quests...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border/50">
      <div className="p-3 border-b border-border/30 flex items-center gap-2">
        <Target className="w-4 h-4 text-success" />
        <h2 className="font-semibold text-sm text-foreground">Your Quest Log</h2>
        <Sparkles className="w-3 h-3 text-success/60 ml-auto" />
      </div>
      
      <div className="p-2 space-y-1">
        {displayQuests.slice(0, 4).map((quest) => (
          <button
            key={quest.id}
            onClick={() => quest.action && quest.status !== 'locked' && navigate(quest.action)}
            disabled={quest.status === 'locked'}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-md transition-all text-left group",
              quest.status === 'complete' && "bg-success/5",
              quest.status === 'active' && "bg-success/10 border border-success/30 hover:bg-success/15",
              quest.status === 'locked' && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-md",
              quest.status === 'complete' && "bg-success/10 text-success",
              quest.status === 'active' && "bg-success/20 text-success",
              quest.status === 'locked' && "bg-muted text-muted-foreground"
            )}>
              {quest.status === 'complete' ? (
                <CheckCircle className="w-4 h-4" />
              ) : quest.status === 'locked' ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Target className="w-4 h-4" />
              )}
            </div>
            
            <span className={cn(
              "flex-1 text-sm font-medium",
              quest.status === 'complete' && "text-muted-foreground",
              quest.status === 'active' && "text-foreground",
              quest.status === 'locked' && "text-muted-foreground"
            )}>
              {quest.title}
            </span>
            
            {quest.status === 'active' && (
              <ChevronRight className="w-4 h-4 text-success group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}