import { useState } from 'react';
import { usePriorityTasks, PriorityTask } from '@/hooks/usePriorityTasks';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Mic, Target, Users, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const getTaskIcon = (taskType: PriorityTask['task_type']) => {
  switch (taskType) {
    case 'pitch_work': return Mic;
    case 'weekly_mission': return Target;
    case 'manager_mission': return Target;
    case 'recruit_goal': return Users;
    default: return Target;
  }
};

const getTaskTypeBadge = (taskType: PriorityTask['task_type']) => {
  switch (taskType) {
    case 'pitch_work': return 'Pitch';
    case 'weekly_mission': return 'Mission';
    case 'manager_mission': return 'Manager Goal';
    case 'recruit_goal': return 'Recruiting';
    default: return 'Task';
  }
};

export function OneOnOneTasks() {
  const { tasks, loading, toggleTaskCompletion } = usePriorityTasks();

  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  const handleToggle = async (taskId: string, isCompleted: boolean) => {
    if (!isCompleted) {
      setJustCompleted(prev => new Set(prev).add(taskId));
      setTimeout(() => setJustCompleted(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      }), 600);
    }
    const success = await toggleTaskCompletion(taskId, isCompleted);
    if (success) {
      toast.success(isCompleted ? 'Task unmarked' : 'Task completed!');
    } else {
      toast.error('Failed to update task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Loading tasks...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="p-3 pt-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <MessageSquare className="w-3 h-3" />
        <span>From your Weekly 1:1:</span>
      </div>
      <div className="space-y-2">
        {tasks.map(task => {
          const Icon = getTaskIcon(task.task_type);
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all",
                task.is_completed
                  ? "bg-muted/30 border-border/50 opacity-60"
                  : "bg-primary/5 border-primary/20 hover:bg-primary/10"
              )}
            >
              <Checkbox
                checked={task.is_completed}
                onCheckedChange={() => handleToggle(task.id, task.is_completed)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span className={cn(
                    "text-sm font-medium",
                    task.is_completed && "line-through text-muted-foreground"
                  )}>
                    {task.task_title}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {getTaskTypeBadge(task.task_type)}
                  </span>
                </div>
                <p className={cn(
                  "text-xs text-muted-foreground",
                  task.is_completed && "line-through"
                )}>
                  {task.task_description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>From: {task.created_by_name}</span>
                  <span>{format(new Date(task.created_at), 'MMM d')}</span>
                  {task.recurs_daily && (
                    <span className="flex items-center gap-1 text-primary">
                      <RefreshCw className="w-2.5 h-2.5" />
                      Daily until next 1:1
                    </span>
                  )}
                </div>
              </div>
              {task.is_completed && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success whitespace-nowrap">
                  ✓ Done
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
