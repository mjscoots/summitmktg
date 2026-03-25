import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, startOfDay, differenceInDays } from 'date-fns';
import {
  ListTodo, Plus, Upload, Trash2, User, ChevronDown,
  AlertTriangle, ArrowUp, Minus, ArrowDown, Loader2, Sparkles,
  CalendarIcon, Pencil, ArrowUpDown, GripVertical, Check,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Priority = 'urgent' | 'high' | 'medium' | 'low';
type FilterTab = 'all' | 'urgent' | 'high' | 'medium' | 'low';
type SortMode = 'manual' | 'priority_desc' | 'priority_asc' | 'newest' | 'oldest' | 'alpha_az' | 'alpha_za' | 'completed_last';

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

const PRIORITY_RANK: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

const PRIORITY_CONFIG: Record<Priority, { icon: typeof AlertTriangle; label: string; dot: string; border: string; bg: string }> = {
  urgent: { icon: AlertTriangle, label: 'Urgent', dot: 'bg-red-500', border: 'border-l-red-500/60', bg: 'bg-red-500/8' },
  high:   { icon: ArrowUp,       label: 'High',   dot: 'bg-primary', border: 'border-l-orange-400/50', bg: 'bg-primary/6' },
  medium: { icon: Minus,         label: 'Medium', dot: 'bg-primary', border: 'border-l-yellow-500/40', bg: 'bg-primary/4' },
  low:    { icon: ArrowDown,     label: 'Low',    dot: 'bg-primary', border: 'border-l-emerald-500/30', bg: '' },
};

const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low'];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'manual', label: 'Manual Order' },
  { key: 'priority_desc', label: 'Priority: High → Low' },
  { key: 'priority_asc', label: 'Priority: Low → High' },
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'alpha_az', label: 'A → Z' },
  { key: 'alpha_za', label: 'Z → A' },
  { key: 'completed_last', label: 'Completed Last' },
];

function applySortMode(tasks: TodoItem[], mode: SortMode): TodoItem[] {
  const arr = [...tasks];
  switch (mode) {
    case 'manual':
      return arr.sort((a, b) => a.display_order - b.display_order);
    case 'priority_desc':
      return arr.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || a.display_order - b.display_order);
    case 'priority_asc':
      return arr.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.display_order - b.display_order);
    case 'newest':
      return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'oldest':
      return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case 'alpha_az':
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case 'alpha_za':
      return arr.sort((a, b) => b.title.localeCompare(a.title));
    case 'completed_last':
      return arr.sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return a.display_order - b.display_order;
      });
    default:
      return arr;
  }
}

export function TodoList() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority_desc');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [editTodo, setEditTodo] = useState<TodoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
  const [entering, setEntering] = useState<Set<string>>(new Set());
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

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

  // Derived display data
  const displayedTasks = useMemo(() => {
    // Step 1: filter
    const filtered = filterTab === 'all' ? [...todos] : todos.filter(t => t.priority === filterTab);
    // Step 2: sort
    const sorted = applySortMode(filtered, sortMode);
    return sorted;
  }, [todos, filterTab, sortMode]);

  const activeTodos = useMemo(() => displayedTasks.filter(t => !t.is_completed), [displayedTasks]);
  const completedTodos = useMemo(() => displayedTasks.filter(t => t.is_completed), [displayedTasks]);

  const priorityCounts = useMemo(() => {
    return todos.reduce((acc, t) => {
      if (!t.is_completed) acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [todos]);
  const activeTotal = useMemo(() => todos.filter(t => !t.is_completed).length, [todos]);

  const addTodo = async () => {
    if (!newTitle.trim() || !user) return;
    const maxOrder = todos.reduce((m, t) => Math.max(m, t.display_order), 0);
    const tempId = crypto.randomUUID();
    const optimistic: TodoItem = {
      id: tempId, title: newTitle.trim(), priority: newPriority,
      is_completed: false, completed_at: null, assigned_by: null,
      assigned_by_name: null, display_order: maxOrder + 1,
      created_at: new Date().toISOString(), due_date: null,
    };
    setTodos(prev => [...prev, optimistic]);
    setEntering(prev => new Set(prev).add(tempId));
    setTimeout(() => setEntering(prev => { const n = new Set(prev); n.delete(tempId); return n; }), 400);
    setNewTitle('');
    setNewPriority('medium');
    await supabase.from('todo_items').insert({
      user_id: user.id, title: optimistic.title,
      priority: optimistic.priority, display_order: optimistic.display_order,
    } as any);
    fetchTodos();
  };

  const toggleComplete = async (todo: TodoItem) => {
    const nowCompleting = !todo.is_completed;
    setTodos(prev => prev.map(t =>
      t.id === todo.id ? { ...t, is_completed: nowCompleting, completed_at: nowCompleting ? new Date().toISOString() : null } : t
    ));
    if (nowCompleting) {
      setJustCompleted(prev => new Set(prev).add(todo.id));
      setTimeout(() => setJustCompleted(prev => { const next = new Set(prev); next.delete(todo.id); return next; }), 1200);
    }
    await supabase.from('todo_items').update({
      is_completed: nowCompleting, completed_at: nowCompleting ? new Date().toISOString() : null,
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
      title: editTitle.trim(), priority: editPriority,
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
      const { data, error } = await supabase.functions.invoke('parse-tasks', { body: { text: uploadText } });
      if (error) throw error;
      const tasks: { title: string; priority: Priority }[] = data?.tasks || [];
      if (tasks.length === 0) { toast.error('No tasks could be parsed.'); return; }
      const maxOrder = todos.reduce((m, t) => Math.max(m, t.display_order), 0);
      const inserts = tasks.map((t, i) => ({ user_id: user.id, title: t.title, priority: t.priority, display_order: maxOrder + i + 1 }));
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

  const currentSortLabel = SORT_OPTIONS.find(s => s.key === sortMode)?.label || 'Sort';

  if (loading) {
    return (
      <div className="mission-board-container rounded-2xl p-5 mb-5 space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1 max-w-[240px]" />
          </div>
        ))}
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mission-board-container rounded-2xl p-5 mb-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ListTodo className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">Mission Board</h2>
                {activeTotal > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {activeTotal}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Track priorities and move fast</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border border-transparent hover:border-primary/15"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden sm:inline">AI Upload</span>
        </button>
      </div>

      {/* ── Filters + Sort ── */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1 flex-1">
          {FILTER_TABS.map(tab => {
            const count = tab.key === 'all' ? activeTotal : (priorityCounts[tab.key] || 0);
            const isActive = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={cn(
                  "text-[11px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/25 shadow-[0_0_8px_-2px_hsl(var(--primary)/0.3)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className={cn("ml-1.5 text-[10px] font-semibold", isActive ? "text-primary/70" : "opacity-50")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all border border-border/50 whitespace-nowrap">
              <ArrowUpDown className="w-3 h-3" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {SORT_OPTIONS.map(opt => (
              <DropdownMenuItem
                key={opt.key}
                onClick={() => setSortMode(opt.key)}
                className={cn("text-xs", sortMode === opt.key && "text-primary font-semibold")}
              >
                {sortMode === opt.key && <Check className="w-3 h-3 mr-1.5" />}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Task Input Bar ── */}
      <div className="flex gap-2 mb-5 p-1 rounded-xl bg-muted/20 border border-border/40">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new task..."
          className="h-10 text-sm flex-1 bg-transparent border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 placeholder:text-muted-foreground/50"
        />
        <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
          <SelectTrigger className="w-24 h-10 text-xs border-0 bg-muted/30 rounded-lg shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_ORDER.map(p => {
              const cfg = PRIORITY_CONFIG[p];
              return (
                <SelectItem key={p} value={p}>
                  <span className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                    {cfg.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Button onClick={addTodo} disabled={!newTitle.trim()} size="sm" className="h-10 w-10 rounded-lg p-0 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Active Tasks ── */}
      {activeTodos.length === 0 && completedTodos.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
            <ListTodo className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">No tasks yet</p>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">Add your first task above</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {activeTodos.map((todo, i) => (
            <MissionTaskCard
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

      {/* ── Completed Section ── */}
      {completedTodos.length > 0 && (
        <Collapsible defaultOpen={false} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full group py-2 border-t border-border/30 pt-3">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
            <span>Completed</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground/70">{completedTodos.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {completedTodos.map((todo, i) => (
              <MissionTaskCard
                key={todo.id}
                todo={todo}
                justCompleted={false}
                isEntering={false}
                isExiting={exiting.has(todo.id)}
                index={i}
                onToggle={() => toggleComplete(todo)}
                onDelete={() => deleteTodo(todo.id)}
                onEdit={() => openEditModal(todo)}
                onPriorityChange={(p) => updatePriority(todo.id, p)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── Edit Dialog ── */}
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
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Priority</label>
              <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Priority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map(p => {
                    const cfg = PRIORITY_CONFIG[p];
                    return (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9", !editDueDate && "text-muted-foreground")}>
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

      {/* ── Upload Dialog ── */}
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

/* ── Task Card Component ── */
function MissionTaskCard({
  todo, justCompleted, isEntering, isExiting, index, onToggle, onDelete, onEdit, onPriorityChange,
}: {
  todo: TodoItem;
  justCompleted: boolean;
  isEntering: boolean;
  isExiting: boolean;
  index: number;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPriorityChange: (priority: Priority) => void;
}) {
  const cfg = PRIORITY_CONFIG[todo.priority];
  const PriorityIcon = cfg.icon;
  const isOverdue = todo.due_date && !todo.is_completed && new Date(todo.due_date + 'T23:59:59') < new Date();

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 cursor-pointer border-l-[3px]",
        // Animations
        isEntering && "animate-fade-in",
        isExiting && "opacity-0 -translate-x-4 scale-95 duration-250",
        justCompleted && "!border-l-emerald-500 !bg-primary/10 scale-[0.98]",
        // Completed state
        todo.is_completed && !justCompleted
          ? "opacity-40 border-l-border/30 bg-transparent hover:opacity-60"
          : !justCompleted && cn(
              "hover:bg-muted/25 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_-4px_hsl(0_0%_0%/0.4)]",
              cfg.border,
              cfg.bg,
            ),
      )}
      style={isEntering ? {} : { animationDelay: `${index * 20}ms` }}
      onClick={onEdit}
    >
      {/* Completion sweep effect */}
      {justCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-emerald-400/5 to-transparent rounded-xl animate-[sweep_0.6s_ease-out_forwards] pointer-events-none" />
      )}

      {/* Drag handle */}
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -ml-1" />

      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={todo.is_completed}
          onCheckedChange={onToggle}
          className={cn(
            "shrink-0 transition-all duration-300 w-[18px] h-[18px]",
            justCompleted && "scale-110 data-[state=checked]:bg-primary data-[state=checked]:border-emerald-500"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug transition-all duration-300",
          justCompleted && "text-primary line-through",
          todo.is_completed && !justCompleted && "line-through text-muted-foreground",
        )}>
          {todo.title}
        </p>
        {(todo.assigned_by_name || todo.due_date) && (
          <div className="flex items-center gap-2.5 mt-1">
            {todo.assigned_by_name && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <User className="w-2.5 h-2.5" />
                {todo.assigned_by_name}
              </span>
            )}
            {todo.due_date && (
              <span className={cn("flex items-center gap-1 text-[10px]", isOverdue ? "text-primary" : "text-muted-foreground/70")}>
                <CalendarIcon className="w-2.5 h-2.5" />
                {format(new Date(todo.due_date + 'T00:00:00'), 'MMM d')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Priority badge */}
      {!todo.is_completed && (
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Select value={todo.priority} onValueChange={(v) => onPriorityChange(v as Priority)}>
            <SelectTrigger className="h-6 px-2 gap-1 border-0 bg-muted/30 rounded-md shadow-none focus:ring-0 [&>svg:last-child]:hidden text-[10px] font-medium">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[120px]">
              {PRIORITY_ORDER.map(p => {
                const c = PRIORITY_CONFIG[p];
                return (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", c.dot)} />
                      {c.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-all shrink-0 p-1 rounded-md hover:bg-destructive/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
