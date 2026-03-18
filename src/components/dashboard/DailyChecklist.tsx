import { useState, useEffect, useCallback } from 'react';
import { Target, CheckCircle, BookOpen, ClipboardCheck, MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePriorityTasks } from '@/hooks/usePriorityTasks';

interface ChecklistItem {
  id: string;
  text: string;
  subtext?: string;
  completed: boolean;
  link: string;
  icon: React.ReactNode;
}

export function DailyChecklist() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tasks: priorityTasks } = usePriorityTasks();

  const buildChecklist = useCallback(async () => {
    if (!user) return;
    const candidates: ChecklistItem[] = [];

    // 1. Training progress — check real completion
    try {
      const { data: courses } = await supabase
        .from('training_courses')
        .select(`id, target_role, training_modules ( id, training_lessons ( id, is_active ) )`)
        .eq('is_active', true);

      const lessonIds = new Set<string>();
      (courses || []).forEach((course: any) => {
        if (course.target_role !== null && course.target_role !== 'rookie') return;
        course.training_modules?.forEach((mod: any) => {
          mod.training_lessons?.forEach((l: any) => {
            if (l.is_active !== false) lessonIds.add(l.id);
          });
        });
      });

      if (lessonIds.size > 0) {
        const { count } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .not('completed_at', 'is', null);

        const completed = count || 0;
        const total = lessonIds.size;
        const done = completed >= total;

        candidates.push({
          id: 'resume-training',
          text: done ? 'Training Complete' : 'Resume Training',
          subtext: done ? 'All lessons finished' : `${completed}/${total} lessons done`,
          completed: done,
          link: '/app/training',
          icon: <BookOpen className="w-3.5 h-3.5" />,
        });
      }
    } catch {}

    // 2. Summer Checklist — rookie-only and only while incomplete
    if (role === 'rookie') {
      try {
        const { data: bp } = await supabase
          .from('bootcamp_progress')
          .select('bootcamp_completed, bootcamp_exempt')
          .eq('user_id', user.id)
          .maybeSingle();

        const done = bp?.bootcamp_completed || bp?.bootcamp_exempt || false;
        if (!done) {
          candidates.push({
            id: 'summer-checklist',
            text: 'Complete Summer Checklist',
            subtext: 'One-time unlock requirement',
            completed: false,
            link: '/summer-checklist',
            icon: <ClipboardCheck className="w-3.5 h-3.5" />,
          });
        }
      } catch {}
    }

    // 3. Pending 1:1 confirmation — check real scheduling requests
    try {
      const { count } = await supabase
        .from('scheduling_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      const pending = count || 0;
      if (pending > 0) {
        candidates.push({
          id: 'confirm-1on1',
          text: 'Confirm 1:1',
          subtext: `${pending} pending request${pending > 1 ? 's' : ''}`,
          completed: false,
          link: '/app/weekly-one-on-ones',
          icon: <MessageSquare className="w-3.5 h-3.5" />,
        });
      }
    } catch {}

    // 4. Priority tasks from 1:1 forms
    const incompletePriority = priorityTasks.filter(t => !t.is_completed);
    if (incompletePriority.length > 0) {
      const first = incompletePriority[0];
      candidates.push({
        id: `priority-${first.id}`,
        text: first.task_title,
        subtext: first.task_description?.slice(0, 60),
        completed: false,
        link: '/app',
        icon: <Target className="w-3.5 h-3.5" />,
      });
    }

    // Sort: incomplete first, then completed
    candidates.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

    // Show max 3 items
    setItems(candidates.slice(0, 3));
    setIsLoading(false);
  }, [user, role, priorityTasks]);

  useEffect(() => {
    buildChecklist();
  }, [buildChecklist]);

  // Re-check when user returns to tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') buildChecklist();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [buildChecklist]);

  if (isLoading || items.length === 0) return null;

  const completedCount = items.filter(i => i.completed).length;
  const allDone = completedCount === items.length;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden mb-4">
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground">Today's Checklist</h2>
              <p className="text-[10px] text-muted-foreground">
                {allDone ? 'All tasks complete!' : `${completedCount}/${items.length} done`}
              </p>
            </div>
          </div>
          {allDone && (
            <span className="text-[10px] font-bold text-primary flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> All done
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="p-3 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.completed && navigate(item.link)}
            className={cn(
              "w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all text-left",
              item.completed
                ? "opacity-60 cursor-default"
                : "hover:bg-muted/30 cursor-pointer"
            )}
          >
            <div className="flex-shrink-0">
              {item.completed ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : (
                <div className="w-4 h-4 rounded border-2 border-primary/40" />
              )}
            </div>
            <span className="flex-shrink-0 text-muted-foreground/40">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <span className={cn(
                "block text-sm font-medium truncate",
                item.completed ? "text-muted-foreground line-through" : "text-foreground"
              )}>
                {item.text}
              </span>
              {item.subtext && (
                <span className="block text-[10px] text-muted-foreground truncate">
                  {item.subtext}
                </span>
              )}
            </div>
            {!item.completed && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
