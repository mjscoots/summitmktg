import { useState, useEffect } from 'react';
import { Target, CheckCircle, BookOpen, ClipboardCheck, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  link: string;
  icon: React.ReactNode;
}

export function DailyChecklist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const buildChecklist = async () => {
      const candidates: ChecklistItem[] = [];

      // 1. Check training completion
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
          
          if ((count || 0) < lessonIds.size) {
            candidates.push({
              id: 'resume-training',
              text: 'Resume Training',
              completed: false,
              link: '/app/training',
              icon: <BookOpen className="w-3.5 h-3.5" />,
            });
          }
        }
      } catch {}

      // 2. Check Summer Checklist
      try {
        const { data: bp } = await supabase
          .from('bootcamp_progress')
          .select('bootcamp_completed, bootcamp_exempt')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!bp || (!bp.bootcamp_completed && !bp.bootcamp_exempt)) {
          candidates.push({
            id: 'summer-checklist',
            text: 'Complete Summer Checklist',
            completed: false,
            link: '/app/bootcamp',
            icon: <ClipboardCheck className="w-3.5 h-3.5" />,
          });
        }
      } catch {}

      // 3. Check pending 1:1 confirmation
      try {
        const { count } = await supabase
          .from('scheduling_requests')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('status', 'pending');

        if ((count || 0) > 0) {
          candidates.push({
            id: 'confirm-1on1',
            text: 'Confirm 1:1',
            completed: false,
            link: '/app/weekly-one-on-ones',
            icon: <MessageSquare className="w-3.5 h-3.5" />,
          });
        }
      } catch {}

      // Limit to 2
      setItems(candidates.slice(0, 2));
      setIsLoading(false);
    };

    buildChecklist();
  }, [user]);

  const STORAGE_KEY = 'summit_checklist_done';

  // Track local completion state
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const today = new Date().toDateString();
        if (parsed.date === today) {
          setCompletedIds(new Set(parsed.ids || []));
        }
      } catch {}
    }
  }, [user]);

  const toggleComplete = (id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (user) {
        localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify({
          date: new Date().toDateString(),
          ids: [...next],
        }));
      }
      return next;
    });
  };

  if (isLoading || items.length === 0) return null;

  const allDone = items.every(i => completedIds.has(i.id));

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden mb-4">
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-sm text-foreground">Today's Checklist</h2>
          </div>
          {allDone && (
            <span className="text-[10px] font-bold text-success flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> All done
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-1">
        {items.map((item) => {
          const done = completedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="flex items-center gap-2.5 p-2.5 rounded-lg transition-all hover:bg-muted/30"
            >
              <button
                onClick={() => toggleComplete(item.id)}
                className="flex-shrink-0 transition-transform hover:scale-110"
              >
                {done ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <div className="w-4 h-4 rounded border border-muted-foreground/40" />
                )}
              </button>
              <span className="flex-shrink-0 text-muted-foreground/40">{item.icon}</span>
              <button
                onClick={() => navigate(item.link)}
                className={cn(
                  "flex-1 text-left text-sm font-medium hover:text-primary transition-colors",
                  done ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {item.text}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
