import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2, ChevronDown, Search, X, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = [
  { value: 'Claimed', label: 'Claimed', color: 'bg-primary/15 text-primary border-primary/30' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-primary/15 text-primary border-primary/30' },
  { value: 'Booked', label: 'Booked', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { value: 'Signed', label: 'Signed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { value: 'Dead', label: 'Dead', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
];

interface MyLead {
  id: string;
  first_name: string;
  phone: string | null;
  city: string | null;
  status: string;
  ref_code: string | null;
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
  const [leads, setLeads] = useState<MyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).rpc('get_my_leads');
    if (data) setLeads(data as MyLead[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const setStatus = async (id: string, status: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    const { data, error } = await (supabase as any).rpc('update_my_lead', { _lead_id: id, _status: status, _notes: null });
    if (error || !data?.success) {
      toast.error('Save failed');
      fetchLeads();
    }
  };

  const filtered = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l => l.first_name.toLowerCase().includes(q) || (l.phone || '').includes(q));
  }, [leads, search]);

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground tracking-tight">Funnel Tracker</h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">{leads.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/app/recruits')} className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <button onClick={() => navigate('/app/recruits')} className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
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
          <p className="text-[11px]">{search ? 'No matches' : 'No leads yet'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[500px] text-[11px]">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="text-left py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 15).map((l, i) => (
                <tr key={l.id} className={cn("border-b border-border/20 hover:bg-accent/10 transition-colors group", i % 2 === 1 && "bg-muted/5")}>
                  <td className="py-1.5 pr-2 text-foreground truncate">{l.first_name || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {l.phone ? <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="hover:text-primary">{l.phone}</a> : '—'}
                  </td>
                  <td className="py-1.5 pr-2">
                    <MiniDropdown value={l.status} options={STATUS_OPTIONS} onChange={v => setStatus(l.id, v)} />
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground/70">{l.ref_code || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 15 && (
            <button onClick={() => navigate('/app/recruits')} className="w-full text-center py-2 text-[10px] text-muted-foreground hover:text-primary transition-colors">
              View all {filtered.length} leads →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
