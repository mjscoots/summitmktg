import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, differenceInDays, startOfDay } from 'date-fns';
import {
  ListTodo, Plus, Upload, Trash2, User, ChevronDown,
  AlertTriangle, ArrowUp, Minus, ArrowDown, Loader2, Sparkles, CalendarIcon, Pencil
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

type Priority = 'urgent' | 'high' | 'medium' | 'low';
type FilterTab = 'all' | 'urgent' | 'high' | 'medium' | 'low';

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
  due_date: string | null;
}

const PRIORITY_CONFIG: Record<Priority, { icon: typeof AlertTriangle; label: string; color: string }> = {
  urgent: { icon: AlertTriangle, label: 'Urgent', color: 'text-red-500' },
  high: { icon: ArrowUp, label: 'High', color: 'text-orange-500' },
  medium: { icon: Minus, label: 'Medium', color: 'text-yellow-500' },
  low: { icon: ArrowDown, label: 'Low', color: 'text-green-500' },
};

const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low'];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

export function TodoList() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [editTodo, setEditTodo] = useState<TodoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);

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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('todo-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_items', filter: `user_id=eq.${user.id}` }, () => fetchTodos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTodos]);

  const [entering, setEntering] = useState<Set<string>>(new Set());
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  const addTodo = async () => {
    if (!newTitle.trim() || !user) return;
    const maxOrder = todos.reduce((m, t) => Math.max(m, t.display_order), 0);
    const tempId = crypto.randomUUID();
    const optimistic: TodoItem = {
      id: tempId,
      title: newTitle.trim(),
      priority: newPriority,
      is_completed: false,
      completed_at: null,
      assigned_by: null,
      assigned_by_name: null,
      display_order: maxOrder + 1,
      created_at: new Date().toISOString(),
      due_date: null,
    };
    setTodos(prev => [...prev, optimistic]);
    setEntering(prev => new Set(prev).add(tempId));
    setTimeout(() => setEntering(prev => { const n = new Set(prev); n.delete(tempId); return n; }), 400);
    setNewTitle('');
    setNewPriority('medium');
    await supabase.from('todo_items').insert({
      user_id: user.id,
      title: optimistic.title,
      priority: optimistic.priority,
      display_order: optimistic.display_order,
    } as any);
    fetchTodos();
  };

  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  const toggleComplete = async (todo: TodoItem) => {
    const nowCompleting = !todo.is_completed;
    setTodos(prev => prev.map(t =>
      t.id === todo.id
        ? { ...t, is_completed: nowCompleting, completed_at: nowCompleting ? new Date().toISOString() : null }
        : t
    ));
    if (nowCompleting) {
      setJustCompleted(prev => new Set(prev).add(todo.id));
      setTimeout(() => setJustCompleted(prev => {
        const next = new Set(prev);
        next.delete(todo.id);
        return next;
      }), 1200);
    }
    await supabase.from('todo_items').update({
      is_completed: nowCompleting,
      completed_at: nowCompleting ? new Date().toISOString() : null,
    } as any).eq('id', todo.id);
  };

  const deleteTodo = async (id: string) => {
    setExiting(prev => new Set(prev).add(id));
    setTimeout(async () => {
      setTodos(prev => prev.filter(t => t.id !== id));
      setExiting(prev => { const n = new Set(prev); n.delete(id); return n; });
      await supabase.from('todo_items').delete().eq('id', id);
    }, 250);
  };

  const updatePriority = async (id: string, priority: Priority) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
    await supabase.from('todo_items').update({ priority } as any).eq('id', id);
  };

  const openEditModal = (todo: TodoItem) => {
    setEditTodo(todo);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    setEditDueDate(todo.due_date ? new Date(todo.due_date + 'T00:00:00') : undefined);
  };

  const saveEdit = async () => {
    if (!editTodo || !editTitle.trim()) return;
    await supabase.from('todo_items').update({
      title: editTitle.trim(),
      priority: editPriority,
      due_date: editDueDate ? format(editDueDate, 'yyyy-MM-dd') : null,
    } as any).eq('id', editTodo.id);
    setEditTodo(null);
    toast.success('Task updated');
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

  const getEffectivePriority = (todo: TodoItem): number => {
    const basePriority = PRIORITY_ORDER.indexOf(todo.priority);
    if (!todo.due_date || todo.is_completed) return basePriority;
    const today = startOfDay(new Date());
    const due = startOfDay(new Date(todo.due_date + 'T00:00:00'));
    const daysLeft = differenceInDays(due, today);
    if (daysLeft < 0) return 0;
    if (daysLeft === 0) return 0;
    if (daysLeft <= 1) return Math.min(basePriority, 0);
    if (daysLeft <= 3) return Math.min(basePriority, 1);
    if (daysLeft <= 7) return Math.min(basePriority, 2);
    return basePriority;
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    const aPri = getEffectivePriority(a);
    const bPri = getEffectivePriority(b);
    if (aPri !== bPri) return aPri - bPri;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
  });

  const filteredTodos = filterTab === 'all'
    ? sortedTodos
    : sortedTodos.filter(t => t.priority === filterTab);

  const activeTodos = filteredTodos.filter(t => !t.is_completed);
  const completedTodos = filteredTodos.filter(t => t.is_completed);

  const priorityCounts = todos.reduce((acc, t) => {
    if (!t.is_completed) acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const activeTotal = todos.filter(t => !t.is_completed).length;

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 mb-4 space-y-2.5">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3.5 w-3 rounded" />
            <Skeleton className="h-4 flex-1 max-w-[200px]" />
          </div>
        ))}
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">To-Do</h2>
          {activeTotal > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {activeTotal}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>

      {/* Filter tabs — compact */}
      <div className="flex gap-1 mb-2.5 overflow-x-auto scrollbar-hide">
        {FILTER_TABS.map(tab => {
          const count = tab.key === 'all' ? activeTotal : (priorityCounts[tab.key] || 0);
          const isActive = filterTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {count > 0 && <span className="ml-0.5 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Add task */}
      <div className="flex gap-1.5 mb-3">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a task..."
          className="h-8 text-sm flex-1 border-border/50"
        />
        <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
          <SelectTrigger className="w-20 h-8 text-xs border-border/50">
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
        <p className="text-xs text-muted-foreground text-center py-3">No tasks yet</p>
      ) : (
        <div className="space-y-0.5">
          {activeTodos.map((todo, i) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              justCompleted={justCompleted.has(todo.id)}
              isEntering={entering.has(todo.id)}
              isExiting={exiting.has(todo.id)}
              index={i}
              onToggle={() => toggleComplete(todo)}
              onDelete={() => deleteTodo(todo.id)}
              onEdit={() => openEditModal(todo)}
              onPriorityChange={(p) => updatePriority(todo.id, p)}
            />
          ))}
        </div>
      )}

      {/* Completed section */}
      {completedTodos.length > 0 && (
        <Collapsible defaultOpen={false} className="mt-2">
          <CollapsibleTrigger className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full group">
            <ChevronDown className="w-3 h-3 transition-transform group-data-[state=open]:rotate-180" />
            Done ({completedTodos.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 space-y-0.5">
            {completedTodos.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                justCompleted={false}
                onToggle={() => toggleComplete(todo)}
                onDelete={() => deleteTodo(todo.id)}
                onEdit={() => openEditModal(todo)}
                onPriorityChange={(p) => updatePriority(todo.id, p)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={!!editTodo} onOpenChange={(open) => !open && setEditTodo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Edit Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Priority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map(p => {
                    const cfg = PRIORITY_CONFIG[p];
                    return (
                      <SelectItem key={p} value={p}>
                        <span className={cn("flex items-center gap-1.5", cfg.color)}>
                          <cfg.icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal h-9", !editDueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {editDueDate ? format(editDueDate, 'PPP') : 'No due date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {editDueDate && (
                <button onClick={() => setEditDueDate(undefined)} className="text-[10px] text-muted-foreground hover:text-destructive mt-1 transition-colors">
                  Remove due date
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTodo(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!editTitle.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            placeholder="e.g. Call John about the deal, follow up on proposal..."
            rows={5}
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
  todo, justCompleted, onToggle, onDelete, onEdit, onPriorityChange,
}: {
  todo: TodoItem;
  justCompleted: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPriorityChange: (priority: Priority) => void;
}) {
  const cfg = PRIORITY_CONFIG[todo.priority];
  const PriorityIcon = cfg.icon;
  const isOverdue = todo.due_date && !todo.is_completed && new Date(todo.due_date + 'T23:59:59') < new Date();
    const priorityBg = !todo.is_completed && !justCompleted
      ? todo.priority === 'urgent' ? 'bg-red-500/12 border border-red-500/20'
      : todo.priority === 'high' ? 'bg-orange-500/8 border border-orange-500/15'
      : ''
      : '';

    return (
    <div
      className={cn(
        "relative flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group cursor-pointer overflow-hidden",
        justCompleted && "!bg-emerald-500/10 scale-[0.98] duration-200",
        !justCompleted && "duration-200",
        todo.is_completed && !justCompleted ? "opacity-40" : "hover:bg-muted/30",
        priorityBg
      )}
      onClick={onEdit}
    >
      {justCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-emerald-400/5 to-transparent animate-[sweep_0.6s_ease-out_forwards] pointer-events-none" />
      )}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={todo.is_completed}
          onCheckedChange={onToggle}
          className={cn(
            "flex-shrink-0 transition-all duration-300",
            justCompleted && "scale-110 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          )}
        />
      </div>
      <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
        <Select value={todo.priority} onValueChange={(v) => onPriorityChange(v as Priority)}>
          <SelectTrigger className="h-5 w-5 p-0 border-0 bg-transparent shadow-none focus:ring-0 [&>svg]:hidden justify-center">
            <PriorityIcon className={cn("w-3 h-3", cfg.color)} />
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[120px]">
            {PRIORITY_ORDER.map(p => {
              const c = PRIORITY_CONFIG[p];
              return (
                <SelectItem key={p} value={p}>
                  <span className={cn("flex items-center gap-1.5", c.color)}>
                    <c.icon className="w-3 h-3" />
                    {c.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-tight transition-all duration-300",
          justCompleted && "text-emerald-400 line-through",
          todo.is_completed && !justCompleted && "line-through text-muted-foreground"
        )}>
          {todo.title}
        </p>
        {(todo.assigned_by_name || todo.due_date) && (
          <div className="flex items-center gap-2 mt-0.5">
            {todo.assigned_by_name && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <User className="w-2.5 h-2.5" />
                {todo.assigned_by_name}
              </span>
            )}
            {todo.due_date && (
              <span className={cn("flex items-center gap-0.5 text-[10px]", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                <CalendarIcon className="w-2.5 h-2.5" />
                {format(new Date(todo.due_date + 'T00:00:00'), 'MMM d')}
              </span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
