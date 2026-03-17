import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Users, Loader2, ChevronDown, Phone, Mail, StickyNote, CalendarDays, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STAGES = [
  { value: 'new_lead', label: 'New Lead', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'interview_scheduled', label: 'Interview Set', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'interviewed', label: 'Interviewed', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { value: 'offer_sent', label: 'Offer Sent', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'signed', label: 'Signed ✅', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
] as const;

const SOURCES = ['Referral', 'Social Media', 'Job Board', 'Cold Outreach', 'Event', 'Walk-in', 'Other'];

interface Recruit {
  id: string;
  owner_id: string;
  recruit_name: string;
  phone: string;
  email: string;
  source: string;
  stage: string;
  notes: string;
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
}

export default function RecruitPipelinePage() {
  const { user, role } = useAuth();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');

  // Form state
  const [form, setForm] = useState({
    recruit_name: '', phone: '', email: '', source: '', stage: 'new_lead', notes: '', next_follow_up: '',
  });

  const fetchRecruits = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from('recruit_pipeline')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!error && data) setRecruits(data as Recruit[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRecruits(); }, [fetchRecruits]);

  const resetForm = () => setForm({ recruit_name: '', phone: '', email: '', source: '', stage: 'new_lead', notes: '', next_follow_up: '' });

  const openEdit = (r: Recruit) => {
    setForm({
      recruit_name: r.recruit_name, phone: r.phone, email: r.email,
      source: r.source, stage: r.stage, notes: r.notes,
      next_follow_up: r.next_follow_up || '',
    });
    setEditingId(r.id);
    setShowAdd(true);
  };

  const openAdd = () => { resetForm(); setEditingId(null); setShowAdd(true); };

  const saveRecruit = async () => {
    if (!form.recruit_name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);

    const payload = {
      recruit_name: form.recruit_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      source: form.source,
      stage: form.stage,
      notes: form.notes.trim(),
      next_follow_up: form.next_follow_up || null,
    };

    if (editingId) {
      const { error } = await (supabase as any).from('recruit_pipeline').update(payload).eq('id', editingId);
      if (error) toast.error('Failed to update'); else toast.success('Updated');
    } else {
      const { error } = await (supabase as any).from('recruit_pipeline').insert({ ...payload, owner_id: user?.id });
      if (error) toast.error('Failed to add recruit'); else toast.success('Recruit added');
    }
    setShowAdd(false);
    resetForm();
    setEditingId(null);
    setSaving(false);
    fetchRecruits();
  };

  const deleteRecruit = async (id: string) => {
    await (supabase as any).from('recruit_pipeline').delete().eq('id', id);
    toast.success('Recruit removed');
    fetchRecruits();
  };

  const updateStage = async (id: string, stage: string) => {
    await (supabase as any).from('recruit_pipeline').update({ stage }).eq('id', id);
    setRecruits(prev => prev.map(r => r.id === id ? { ...r, stage } : r));
  };

  const getStage = (val: string) => STAGES.find(s => s.value === val) || STAGES[0];

  const filtered = recruits.filter(r => {
    const matchSearch = !search || r.recruit_name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search);
    const matchStage = filterStage === 'all' || r.stage === filterStage;
    return matchSearch && matchStage;
  });

  // Stage counts
  const stageCounts = STAGES.map(s => ({ ...s, count: recruits.filter(r => r.stage === s.value).length }));

  if (!isManager) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">This page is for managers only.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PageBackButton to="/app/manage" label="Manage" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Recruit Pipeline</h1>
            <Badge variant="outline" className="ml-1 text-xs">{recruits.length} total</Badge>
          </div>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Recruit
          </Button>
        </div>

        {/* Funnel summary pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setFilterStage('all')}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-full border transition-all whitespace-nowrap",
              filterStage === 'all' ? "bg-primary/15 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
            )}
          >
            All ({recruits.length})
          </button>
          {stageCounts.map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStage(s.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-full border transition-all whitespace-nowrap",
                filterStage === s.value ? cn(s.color, "border") : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
              )}
            >
              {s.label} ({s.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-9 bg-card/50"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{search || filterStage !== 'all' ? 'No recruits match your filters.' : 'No recruits yet. Add your first one!'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(recruit => {
              const stage = getStage(recruit.stage);
              const isOverdue = recruit.next_follow_up && new Date(recruit.next_follow_up) < new Date(new Date().toDateString());
              return (
                <div
                  key={recruit.id}
                  onClick={() => openEdit(recruit)}
                  className="group bg-card/60 hover:bg-card border border-border/40 hover:border-border/70 rounded-xl px-4 py-3 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground text-sm truncate">{recruit.recruit_name}</span>
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0", stage.color)}>
                          {stage.label}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {recruit.phone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{recruit.phone}</span>
                        )}
                        {recruit.email && (
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{recruit.email}</span>
                        )}
                        {recruit.source && (
                          <span className="flex items-center gap-1"><Filter className="w-3 h-3" />{recruit.source}</span>
                        )}
                        {recruit.next_follow_up && (
                          <span className={cn("flex items-center gap-1", isOverdue && "text-destructive font-medium")}>
                            <CalendarDays className="w-3 h-3" />Follow up: {new Date(recruit.next_follow_up).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {recruit.notes && (
                        <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-1 flex items-center gap-1">
                          <StickyNote className="w-3 h-3 shrink-0" />{recruit.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Quick stage change */}
                      <Select value={recruit.stage} onValueChange={(val) => { updateStage(recruit.id, val); }}>
                        <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent [&>svg]:hidden" onClick={e => e.stopPropagation()}>
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent onClick={e => e.stopPropagation()}>
                          {STAGES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        onClick={e => { e.stopPropagation(); deleteRecruit(recruit.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditingId(null); resetForm(); } else setShowAdd(true); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {editingId ? 'Edit Recruit' : 'Add Recruit'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
                <Input value={form.recruit_name} onChange={e => setForm(f => ({ ...f, recruit_name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
                  <Select value={form.source} onValueChange={val => setForm(f => ({ ...f, source: val }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Stage</label>
                  <Select value={form.stage} onValueChange={val => setForm(f => ({ ...f, stage: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Next Follow-up</label>
                <Input type="date" value={form.next_follow_up} onChange={e => setForm(f => ({ ...f, next_follow_up: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes about this recruit..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null); resetForm(); }}>Cancel</Button>
              <Button onClick={saveRecruit} disabled={!form.recruit_name.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingId ? 'Save Changes' : 'Add Recruit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
