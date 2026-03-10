import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ListTodo, Plus, Upload, Trash2, GripVertical, User, ChevronDown,
  AlertTriangle, ArrowUp, Minus, ArrowDown, Loader2, Sparkles
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type Priority = 'urgent' | 'high' | 'medium' | 'low';

interface TodoItem {
  id: string;
  title: string;
  priority: Priority;
  is_completed: boolean;
  completed_at: string | null;
  assigned_by: string | null;
  assigned_by_name: string | null;
  display_order: number;
  created_at: string;
}

const PRIORITY_CONFIG: Record<Priority, { icon: typeof AlertTriangle; label: string; color: string; bg: string }> = {
  urgent: { icon: AlertTriangle, label: 'Urgent', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
  high: { icon: ArrowUp, label: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  medium: { icon: Minus, label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  low: { icon: ArrowDown, label: 'Low', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
};

const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low'];

type SortMode = 'custom' | 'priority';

export function TodoList() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [parsing, setParsing] = useState(false);

  const fetchTodos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('todo_items')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');
    setTodos((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('todo-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_items', filter: `user_id=eq.${user.id}` }, () => fetchTodos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTodos]);

  const addTodo = async () => {
    if (!newTitle.trim() || !user) return;
    const maxOrder = todos.reduce((m, t) => Math.max(m, t.display_order), 0);
    await supabase.from('todo_items').insert({
      user_id: user.id,
      title: newTitle.trim(),
      priority: newPriority,
      display_order: maxOrder + 1,
    } as any);
    setNewTitle('');
    setNewPriority('medium');
    fetchTodos();
  };

  const toggleComplete = async (todo: TodoItem) => {
    await supabase.from('todo_items').update({
      is_completed: !todo.is_completed,
      completed_at: !todo.is_completed ? new Date().toISOString() : null,
    } as any).eq('id', todo.id);
    fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    await supabase.from('todo_items').delete().eq('id', id);
    fetchTodos();
  };

  const updatePriority = async (id: string, priority: Priority) => {
    await supabase.from('todo_items').update({ priority } as any).eq('id', id);
    fetchTodos();
  };

  const handleUploadTasks = async () => {
    if (!uploadText.trim() || !user) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-tasks', {
        body: { text: uploadText },
      });
      if (error) throw error;
      const tasks: { title: string; priority: Priority }[] = data?.tasks || [];
      if (tasks.length === 0) {
        toast.error('No tasks could be parsed from the text.');
        return;
      }
      const maxOrder = todos.reduce((m, t) => Math.max(m, t.display_order), 0);
      const inserts = tasks.map((t, i) => ({
        user_id: user.id,
        title: t.title,
        priority: t.priority,
        display_order: maxOrder + i + 1,
      }));
      await supabase.from('todo_items').insert(inserts as any);
      toast.success(`${tasks.length} tasks added!`);
      setUploadText('');
      setShowUpload(false);
      fetchTodos();
    } catch (e: any) {
      toast.error(e.message || 'Failed to parse tasks');
    } finally {
      setParsing(false);
    }
  };

  const sortedTodos = sortMode === 'priority'
    ? [...todos].sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
      })
    : [...todos].sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return a.display_order - b.display_order;
      });

  const activeTodos = sortedTodos.filter(t => !t.is_completed);
  const completedTodos = sortedTodos.filter(t => t.is_completed);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">To-Do List</h2>
          {activeTodos.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {activeTodos.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSortMode(sortMode === 'priority' ? 'custom' : 'priority')}
            className={cn(
              "text-[10px] px-2 py-1 rounded-md border transition-all",
              sortMode === 'priority'
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {sortMode === 'priority' ? '⬆ Priority' : '☰ Custom'}
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            <Sparkles className="w-3 h-3" />
            Upload Tasks
          </button>
        </div>
      </div>

      {/* Add task inline */}
      <div className="flex gap-2 mb-3">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a task..."
          className="h-8 text-sm flex-1"
        />
        <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_ORDER.map(p => {
              const cfg = PRIORITY_CONFIG[p];
              return (
                <SelectItem key={p} value={p}>
                  <span className={cn("flex items-center gap-1", cfg.color)}>
                    <cfg.icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={addTodo} disabled={!newTitle.trim()} className="h-8 px-2">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Active todos */}
      {activeTodos.length === 0 && completedTodos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No tasks yet. Add one above or upload a list!</p>
      ) : (
        <div className="space-y-1">
          {activeTodos.map(todo => (
            <TodoRow
              key={todo.id}
              todo={todo}
              onToggle={() => toggleComplete(todo)}
              onDelete={() => deleteTodo(todo.id)}
              onPriorityChange={(p) => updatePriority(todo.id, p)}
            />
          ))}
        </div>
      )}

      {/* Completed section */}
      {completedTodos.length > 0 && (
        <Collapsible defaultOpen={false} className="mt-3">
          <CollapsibleTrigger className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full group">
            <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
            Completed ({completedTodos.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {completedTodos.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={() => toggleComplete(todo)}
                onDelete={() => deleteTodo(todo.id)}
                onPriorityChange={(p) => updatePriority(todo.id, p)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Upload Tasks Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Upload Tasks
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste your tasks below. AI will split them into individual items and assign priorities.
          </p>
          <Textarea
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            placeholder="e.g. Call John about the deal, follow up on proposal, prepare for Monday meeting..."
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleUploadTasks} disabled={!uploadText.trim() || parsing}>
              {parsing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Parsing...</> : <><Upload className="w-4 h-4 mr-1" /> Parse & Add</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
  onPriorityChange,
}: {
  todo: TodoItem;
  onToggle: () => void;
  onDelete: () => void;
  onPriorityChange: (p: Priority) => void;
}) {
  const cfg = PRIORITY_CONFIG[todo.priority];
  const PriorityIcon = cfg.icon;

  return (
    <div className={cn(
      "flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all group",
      todo.is_completed ? "opacity-50 border-border/30 bg-muted/20" : cn("border-border/50", cfg.bg)
    )}>
      <Checkbox
        checked={todo.is_completed}
        onCheckedChange={onToggle}
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", todo.is_completed && "line-through text-muted-foreground")}>
          {todo.title}
        </p>
        {todo.assigned_by_name && (
          <div className="flex items-center gap-1 mt-0.5">
            <User className="w-2.5 h-2.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">From {todo.assigned_by_name}</span>
          </div>
        )}
      </div>
      {!todo.is_completed && (
        <Select value={todo.priority} onValueChange={(v) => onPriorityChange(v as Priority)}>
          <SelectTrigger className="w-fit h-6 text-[10px] border-0 bg-transparent px-1 gap-0.5">
            <PriorityIcon className={cn("w-3 h-3", cfg.color)} />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_ORDER.map(p => {
              const c = PRIORITY_CONFIG[p];
              return (
                <SelectItem key={p} value={p}>
                  <span className={cn("flex items-center gap-1 text-xs", c.color)}>
                    <c.icon className="w-3 h-3" />
                    {c.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
