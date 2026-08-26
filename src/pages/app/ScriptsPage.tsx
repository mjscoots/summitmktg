import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FileText, Search, Plus, Pencil, Copy, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const CATEGORIES = ['Openers', 'Bridge & Price Sheet', 'Premiums', 'Closes', 'Objections'] as const;
type Category = (typeof CATEGORIES)[number];

interface ScriptRow {
  id: string;
  title: string;
  category: string;
  body: string;
  display_order: number;
  is_active: boolean;
}

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

export default function ScriptsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'owner';
  const [rows, setRows] = useState<ScriptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Partial<ScriptRow> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('scripts')
      .select('id, title, category, body, display_order, is_active')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) toast.error('Could not load scripts');
    setRows((data as ScriptRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.body || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const save = async () => {
    if (!editing?.title?.trim() || !editing?.category) {
      toast.error('Title and category are required');
      return;
    }
    setSaving(true);
    const payload = {
      title: editing.title.trim(),
      category: editing.category,
      body: editing.body || '',
      display_order: editing.display_order ?? 0,
      is_active: editing.is_active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from('scripts').update(payload).eq('id', editing.id)
      : await supabase.from('scripts').insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (error) {
      toast.error('Save failed');
      return;
    }
    toast.success(editing.id ? 'Script updated' : 'Script added');
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('scripts').delete().eq('id', id);
    if (error) {
      toast.error('Delete failed');
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <main className="max-w-3xl mx-auto px-4 py-6">
          <PageBackButton to="/app/training" label="Training" />

          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-foreground">Scripts</h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Openers, objections and closes — searchable, straight from the field.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setEditing({ category: 'Openers', body: '', display_order: 0, is_active: true })}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-[13px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Add script
              </button>
            )}
          </div>

          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scripts"
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-[var(--radius)]" />
              ))}
            </div>
          ) : (
            <div className="space-y-7">
              {CATEGORIES.map((cat) => {
                const items = filtered.filter((r) => r.category === cat);
                return (
                  <section key={cat}>
                    <div className="mb-2.5 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h2 className="text-[13px] font-bold uppercase tracking-wider text-foreground">{cat}</h2>
                      <span className="text-[12px] tabular-nums text-muted-foreground">{items.length}</span>
                    </div>

                    {items.length === 0 ? (
                      <div className={cn(CARD, 'px-4 py-5 text-center text-[13px] text-muted-foreground')}>
                        No scripts added yet
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {items.map((s) => {
                          const isOpen = !!open[s.id];
                          return (
                            <div key={s.id} className={cn(CARD, 'overflow-hidden')}>
                              <button
                                onClick={() => setOpen((p) => ({ ...p, [s.id]: !isOpen }))}
                                className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
                              >
                                <span className="min-w-0 flex-1 text-[14px] font-semibold text-foreground">
                                  {s.title}
                                  {!s.is_active && (
                                    <span className="ml-2 text-[11px] font-medium text-muted-foreground">(hidden)</span>
                                  )}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                    isOpen && 'rotate-180'
                                  )}
                                />
                              </button>
                              {isOpen && (
                                <div className="border-t border-white/[0.06] px-4 py-3.5">
                                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                                    {s.body?.trim() || 'No content yet.'}
                                  </p>
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(s.body || '');
                                        toast.success('Script copied');
                                      }}
                                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                                    >
                                      <Copy className="h-3.5 w-3.5" /> Copy
                                    </button>
                                    {isAdmin && (
                                      <>
                                        <button
                                          onClick={() => setEditing(s)}
                                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                                        >
                                          <Pencil className="h-3.5 w-3.5" /> Edit
                                        </button>
                                        <button
                                          onClick={() => remove(s.id)}
                                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 text-[12px] font-medium text-red-400"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit script' : 'Add script'}</DialogTitle>
            <DialogDescription>Reps see active scripts in the Scripts tab.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editing?.title || ''}
              onChange={(e) => setEditing((p) => ({ ...(p || {}), title: e.target.value }))}
              placeholder="Title"
            />
            <Select
              value={(editing?.category as Category) || 'Openers'}
              onValueChange={(v) => setEditing((p) => ({ ...(p || {}), category: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={editing?.body || ''}
              onChange={(e) => setEditing((p) => ({ ...(p || {}), body: e.target.value }))}
              placeholder="Paste the script here"
              rows={10}
            />
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={editing?.display_order ?? 0}
                onChange={(e) => setEditing((p) => ({ ...(p || {}), display_order: Number(e.target.value) }))}
                className="w-24"
              />
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={editing?.is_active ?? true}
                  onChange={(e) => setEditing((p) => ({ ...(p || {}), is_active: e.target.checked }))}
                />
                Visible to reps
              </label>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
