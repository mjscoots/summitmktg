import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Loader2, ChevronDown, Search, X, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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

interface Recruit {
  id: string;
  recruit_name: string;
  phone: string | null;
  stage: string;
  position: string;
  updated_at: string;
}

function MiniDropdown({ value, options, onChange }: { value: string; options: { value: string; label: string; color: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border cursor-pointer whitespace-nowrap", current.color)}>
        {current.label}<ChevronDown className="w-2.5 h-2.5 opacity-50" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[120px] max-h-[200px] overflow-y-auto">
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn("w-full text-left px-2.5 py-1 text-[10px] hover:bg-accent/50 transition-colors", value === opt.value && "bg-accent/30")}>
              <span className={cn("font-medium", opt.color.split(' ').find(c => c.startsWith('text-')))}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardFunnelTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRecruits = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from('recruit_pipeline').select('id, recruit_name, phone, stage, position, updated_at').order('updated_at', { ascending: false }).limit(50);
    if (data) setRecruits(data as Recruit[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRecruits(); }, [fetchRecruits]);

  const updateField = async (id: string, field: string, value: string) => {
    // Optimistic update first
    setRecruits(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    const { error } = await (supabase as any).from('recruit_pipeline').update({ [field]: value }).eq('id', id);
    if (error) {
      toast.error('Save failed');
      fetchRecruits(); // revert on error
    }
  };

  const addRecruit = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).from('recruit_pipeline').insert({ owner_id: user.id, recruit_name: '', stage: 'new_lead', position: '', interview_2_status: '', interview_3_status: '', onboarding_status: '' }).select('id, recruit_name, phone, stage, position, updated_at').single();
    if (error) { toast.error('Failed'); return; }
    setRecruits(prev => [data as Recruit, ...prev]);
  };

  const deleteRecruit = async (id: string) => {
    await (supabase as any).from('recruit_pipeline').delete().eq('id', id);
    setRecruits(prev => prev.filter(r => r.id !== id));
  };

  const filtered = useMemo(() => {
    if (!search) return recruits;
    const q = search.toLowerCase();
    return recruits.filter(r => r.recruit_name.toLowerCase().includes(q) || (r.phone || '').includes(q));
  }, [recruits, search]);

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground tracking-tight">Funnel Tracker</h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">{recruits.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addRecruit} className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <button onClick={() => navigate('/app/recruiting')} className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Full View →
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-7 text-[11px] bg-background/50" />
        {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground" /></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
          <p className="text-[11px]">{search ? 'No matches' : 'No recruits yet'}</p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <table className="w-full min-w-[500px] text-[11px]">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="text-left py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Position</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 15).map((r, i) => (
                <tr key={r.id} className={cn("border-b border-border/20 hover:bg-accent/10 transition-colors group", i % 2 === 1 && "bg-muted/5")}>
                  <td className="py-1.5 pr-2">
                    <InlineEdit value={r.recruit_name} onChange={v => updateField(r.id, 'recruit_name', v)} placeholder="Name..." />
                  </td>
                  <td className="py-1.5 pr-2">
                    <InlineEdit value={r.phone || ''} onChange={v => updateField(r.id, 'phone', v)} placeholder="Phone..." />
                  </td>
                  <td className="py-1.5 pr-2">
                    <MiniDropdown value={r.stage} options={STATUS_OPTIONS} onChange={v => updateField(r.id, 'stage', v)} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <MiniDropdown value={r.position || ''} options={POSITION_OPTIONS} onChange={v => updateField(r.id, 'position', v)} />
                  </td>
                  <td className="py-1.5">
                    <button onClick={() => deleteRecruit(r.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 15 && (
            <button onClick={() => navigate('/app/recruiting')} className="w-full text-center py-2 text-[10px] text-muted-foreground hover:text-primary transition-colors">
              View all {filtered.length} recruits →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InlineEdit({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => { setEditing(false); if (local.trim() !== value) onChange(local.trim()); };

  if (editing) {
    return <input ref={ref} value={local} onChange={e => setLocal(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setLocal(value); setEditing(false); } }} className="bg-transparent border-b border-primary/40 outline-none text-foreground text-[11px] w-full py-0" placeholder={placeholder} />;
  }

  return <span onClick={() => setEditing(true)} className={cn("cursor-text block truncate min-h-[16px]", value ? "text-foreground" : "text-muted-foreground/40")}>{value || placeholder}</span>;
}
