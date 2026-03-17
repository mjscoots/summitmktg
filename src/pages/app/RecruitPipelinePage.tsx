import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Users, Loader2, Search, X, ArrowUpDown, ChevronDown, StickyNote, Calendar, Link2, ExternalLink, Check, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ─── Option configs ─── */
const STATUS_OPTIONS = [
  { value: '', label: '—', color: 'bg-muted/40 text-muted-foreground border-border/50' },
  { value: 'new_lead', label: 'New Lead', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'hype_up', label: 'Hype Up', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  { value: 'interview_1', label: 'Interview 1', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { value: 'interview_2', label: 'Interview 2', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  { value: 'interview_3', label: 'Interview 3', color: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  { value: 'agreement_sent', label: 'Agreement Sent', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { value: 'hired', label: 'Hired', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'no_hire', label: 'No Hire', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { value: 'declined', label: 'Declined', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  { value: 'follow_up', label: 'Follow Up', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { value: 'unresponsive', label: 'Unresponsive', color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
];

const POSITION_OPTIONS = [
  { value: '', label: '—', color: 'bg-muted/40 text-muted-foreground border-border/50' },
  { value: 'pest_rookie', label: 'PEST Rookie', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'pest_vet', label: 'PEST Vet', color: 'bg-green-500/15 text-green-300 border-green-500/30' },
  { value: 'solar_rookie', label: 'Solar Rookie', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { value: 'solar_vet', label: 'Solar Vet', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  { value: 'fiber_rookie', label: 'Fiber Rookie', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { value: 'fiber_vet', label: 'Fiber Vet', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { value: 'setter', label: 'Setter', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'recruiter', label: 'Recruiter', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { value: 'other', label: 'Other', color: 'bg-muted/40 text-muted-foreground border-border/50' },
];

const INTERVIEW_OPTIONS = [
  { value: '', label: '—', color: 'bg-muted/40 text-muted-foreground border-border/50' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'done', label: 'Done', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'reschedule', label: 'Reschedule', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { value: 'no_show', label: 'No Show', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { value: 'pass', label: 'Pass', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { value: 'fail', label: 'Fail', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
];

const ONBOARDING_OPTIONS = [
  { value: '', label: '—', color: 'bg-muted/40 text-muted-foreground border-border/50' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { value: 'onboarded', label: 'Onboarded', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  { value: 'declined', label: 'Declined', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { value: 'pending_docs', label: 'Pending Docs', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  { value: 'needs_followup', label: 'Needs Follow-up', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
];

interface Recruit {
  id: string;
  owner_id: string;
  recruit_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: string;
  position: string;
  interview_2_status: string;
  interview_3_status: string;
  onboarding_status: string;
  notes: string | null;
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
}

type SortField = 'recruit_name' | 'stage' | 'position' | 'created_at' | 'updated_at';
type SortDir = 'asc' | 'desc';

/* ─── Inline Dropdown ─── */
function CellDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; color: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all cursor-pointer whitespace-nowrap",
          current.color,
          "hover:brightness-110"
        )}
      >
        {current.label}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[140px] max-h-[240px] overflow-y-auto animate-fade-in">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors flex items-center gap-2",
                value === opt.value && "bg-accent/30"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full border shrink-0", opt.color.replace(/text-\S+/g, '').replace(/bg-/g, 'bg-'))} />
              <span className={cn("font-medium", opt.color.split(' ').find(c => c.startsWith('text-')))}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Inline Text Cell ─── */
function EditableCell({
  value,
  onChange,
  placeholder = '',
  className: cls,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (local.trim() !== value) onChange(local.trim());
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setLocal(value); setEditing(false); } }}
        className={cn("bg-transparent border-b border-primary/40 outline-none text-foreground text-xs w-full py-0.5", cls)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        "text-xs cursor-text py-0.5 block truncate min-h-[20px]",
        value ? "text-foreground" : "text-muted-foreground/40",
        cls
      )}
    >
      {value || placeholder}
    </span>
  );
}

/* ─── Main Component ─── */
export default function RecruitPipelinePage() {
  const { user, role } = useAuth();
  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [detailRecruit, setDetailRecruit] = useState<Recruit | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [editingCalendly, setEditingCalendly] = useState(false);
  const [calendlyDraft, setCalendlyDraft] = useState('');

  // Fetch calendly link from profile
  useEffect(() => {
    if (!user) return;
    (supabase as any).from('profiles').select('calendly_url').eq('user_id', user.id).single()
      .then(({ data }: any) => {
        if (data?.calendly_url) setCalendlyUrl(data.calendly_url);
      });
  }, [user]);

  const saveCalendly = async () => {
    const url = calendlyDraft.trim();
    const { error } = await (supabase as any).from('profiles').update({ calendly_url: url || null }).eq('user_id', user?.id);
    if (error) { toast.error('Failed to save'); return; }
    setCalendlyUrl(url);
    setEditingCalendly(false);
    toast.success(url ? 'Calendly link saved' : 'Calendly link removed');
  };

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

  const updateField = async (id: string, field: string, value: string) => {
    const { error } = await (supabase as any).from('recruit_pipeline').update({ [field]: value }).eq('id', id);
    if (error) { toast.error('Save failed'); return; }
    setRecruits(prev => prev.map(r => r.id === id ? { ...r, [field]: value, updated_at: new Date().toISOString() } : r));
  };

  const addRecruit = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).from('recruit_pipeline').insert({
      owner_id: user.id,
      recruit_name: '',
      stage: 'new_lead',
      position: '',
      interview_2_status: '',
      interview_3_status: '',
      onboarding_status: '',
    }).select().single();
    if (error) { toast.error('Failed to add row'); return; }
    setRecruits(prev => [data as Recruit, ...prev]);
    toast.success('Row added');
  };

  const deleteRecruit = async (id: string) => {
    await (supabase as any).from('recruit_pipeline').delete().eq('id', id);
    setRecruits(prev => prev.filter(r => r.id !== id));
    if (detailRecruit?.id === id) setDetailRecruit(null);
    toast.success('Removed');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = [...recruits];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.recruit_name.toLowerCase().includes(q) ||
        (r.phone || '').includes(q) ||
        (r.email || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = (a as any)[sortField] || '';
      const bv = (b as any)[sortField] || '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [recruits, search, sortField, sortDir]);

  const openDetail = (r: Recruit) => {
    setDetailRecruit(r);
    setNotesDraft(r.notes || '');
  };

  const saveNotes = async () => {
    if (!detailRecruit) return;
    await updateField(detailRecruit.id, 'notes', notesDraft);
    setDetailRecruit(prev => prev ? { ...prev, notes: notesDraft } : null);
    toast.success('Notes saved');
  };

  if (!isManager) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">This page is for managers only.</p>
        </div>
      </AppLayout>
    );
  }

  const SortHeader = ({ field, label, className: cls }: { field: SortField; label: string; className?: string }) => (
    <th
      className={cn("px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap", cls)}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("w-3 h-3", sortField === field ? "text-primary" : "opacity-30")} />
      </span>
    </th>
  );

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <PageBackButton to="/app" label="Dashboard" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Funnel Tracker</h1>
              <p className="text-xs text-muted-foreground">{recruits.length} total recruits</p>
            </div>
          </div>
          <Button size="sm" onClick={addRecruit} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Row
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email..."
            className="pl-9 bg-card/60 h-9 text-xs"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <SortHeader field="recruit_name" label="Applicant" className="sticky left-0 bg-muted/30 z-10 min-w-[160px]" />
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[120px]">Phone #</th>
                    <SortHeader field="stage" label="Status" className="min-w-[130px]" />
                    <SortHeader field="position" label="Position" className="min-w-[120px]" />
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[110px]">Interview 2</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[110px]">Interview 3</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap min-w-[130px]">Onboarding</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[60px]" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-muted-foreground">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">{search ? 'No matches found' : 'No recruits yet. Click "Add Row" to start.'}</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b border-border/30 hover:bg-accent/20 transition-colors group",
                          idx % 2 === 1 && "bg-muted/10"
                        )}
                      >
                        {/* Applicant - sticky */}
                        <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openDetail(r)}
                              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="View details"
                            >
                              <StickyNote className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                            </button>
                            <EditableCell
                              value={r.recruit_name}
                              onChange={v => updateField(r.id, 'recruit_name', v)}
                              placeholder="Name..."
                              className="font-medium"
                            />
                          </div>
                        </td>
                        {/* Phone */}
                        <td className="px-3 py-2">
                          <EditableCell
                            value={r.phone || ''}
                            onChange={v => updateField(r.id, 'phone', v)}
                            placeholder="Phone..."
                          />
                        </td>
                        {/* Status */}
                        <td className="px-3 py-2">
                          <CellDropdown
                            value={r.stage}
                            options={STATUS_OPTIONS}
                            onChange={v => updateField(r.id, 'stage', v)}
                          />
                        </td>
                        {/* Position */}
                        <td className="px-3 py-2">
                          <CellDropdown
                            value={r.position || ''}
                            options={POSITION_OPTIONS}
                            onChange={v => updateField(r.id, 'position', v)}
                          />
                        </td>
                        {/* Interview 2 */}
                        <td className="px-3 py-2">
                          <CellDropdown
                            value={r.interview_2_status || ''}
                            options={INTERVIEW_OPTIONS}
                            onChange={v => updateField(r.id, 'interview_2_status', v)}
                          />
                        </td>
                        {/* Interview 3 */}
                        <td className="px-3 py-2">
                          <CellDropdown
                            value={r.interview_3_status || ''}
                            options={INTERVIEW_OPTIONS}
                            onChange={v => updateField(r.id, 'interview_3_status', v)}
                          />
                        </td>
                        {/* Onboarding */}
                        <td className="px-3 py-2">
                          <CellDropdown
                            value={r.onboarding_status || ''}
                            options={ONBOARDING_OPTIONS}
                            onChange={v => updateField(r.id, 'onboarding_status', v)}
                          />
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => deleteRecruit(r.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      <Dialog open={!!detailRecruit} onOpenChange={o => { if (!o) setDetailRecruit(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <StickyNote className="w-4 h-4 text-primary" />
              {detailRecruit?.recruit_name || 'Recruit Details'}
            </DialogTitle>
          </DialogHeader>
          {detailRecruit && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium">Phone</span>
                  <p className="text-foreground mt-0.5">{detailRecruit.phone || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Email</span>
                  <p className="text-foreground mt-0.5">{detailRecruit.email || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Source</span>
                  <p className="text-foreground mt-0.5">{detailRecruit.source || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Follow-up</span>
                  <p className="text-foreground mt-0.5">
                    {detailRecruit.next_follow_up ? new Date(detailRecruit.next_follow_up).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Added</span>
                  <p className="text-foreground mt-0.5">{new Date(detailRecruit.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Updated</span>
                  <p className="text-foreground mt-0.5">{new Date(detailRecruit.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</label>
                <Textarea
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  placeholder="Add notes about this recruit..."
                  rows={4}
                  className="text-xs"
                />
                <Button size="sm" className="mt-2" onClick={saveNotes} variant="outline">
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
