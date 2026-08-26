import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Handshake, Plus, ChevronRight, X } from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  code: string;
  active: boolean;
  applications: number;
  enrollments: number;
}

interface CountRow {
  source_type: string | null;
  count: number;
}

interface Referral {
  name: string | null;
  email: string | null;
  vertical: string | null;
  created_at: string;
  stage: string;
}

const SOURCE_LABELS: Record<string, string> = {
  organic: 'Organic',
  golden_ticket: 'Golden Ticket',
  rep_referral: 'Rep referral',
  partner: 'Partner',
};

export default function AdminSourcePanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<CountRow[]>([]);
  const [leads, setLeads] = useState<CountRow[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [openPartner, setOpenPartner] = useState<Partner | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [form, setForm] = useState({ name: '', code: '', contact: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_source_breakdown' as never);
    if (error) {
      setLoading(false);
      return;
    }
    const res = data as unknown as { applications: CountRow[]; leads: CountRow[]; partners: Partner[] };
    setApps(res?.applications ?? []);
    setLeads(res?.leads ?? []);
    setPartners(res?.partners ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (p: Partner) => {
    setOpenPartner(p);
    setReferrals([]);
    const { data } = await supabase.rpc('get_partner_referrals' as never, { p_partner_id: p.id } as never);
    setReferrals((data as unknown as Referral[]) ?? []);
  };

  const addPartner = async () => {
    const name = form.name.trim();
    const code = form.code.trim();
    if (!name || !code) return;
    setSaving(true);
    const { error } = await supabase.from('partners' as never).insert({
      name,
      code,
      contact: form.contact.trim() || null,
    } as never);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save partner', description: error.message, variant: 'destructive' });
      return;
    }
    setForm({ name: '', code: '', contact: '' });
    load();
  };

  const toggleActive = async (p: Partner) => {
    const { error } = await supabase
      .from('partners' as never)
      .update({ active: !p.active } as never)
      .eq('id', p.id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const removePartner = async (p: Partner) => {
    const { error } = await supabase.from('partners' as never).delete().eq('id', p.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    if (openPartner?.id === p.id) setOpenPartner(null);
    load();
  };

  const counts = (rows: CountRow[]) =>
    rows.length === 0 ? (
      <p className="text-xs text-muted-foreground">No records yet.</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <span
            key={r.source_type ?? 'unknown'}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-muted-foreground"
          >
            {SOURCE_LABELS[r.source_type ?? ''] ?? r.source_type ?? 'Unknown'}{' '}
            <span className="tabular-nums font-semibold text-foreground">{r.count}</span>
          </span>
        ))}
      </div>
    );

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/25">
          <Handshake className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">By Source</h3>
          <p className="text-xs text-muted-foreground">Where applications and leads came from</p>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="micro-label text-muted-foreground">Applications</p>
            {counts(apps)}
          </div>
          <div className="space-y-2">
            <p className="micro-label text-muted-foreground">Leads</p>
            {counts(leads)}
          </div>

          <div className="space-y-2">
            <p className="micro-label text-muted-foreground">Partners</p>
            {partners.length === 0 ? (
              <p className="text-xs text-muted-foreground">No partners yet.</p>
            ) : (
              <div className="space-y-2">
                {partners.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <button
                      onClick={() => openDetail(p)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground">/join?ref={p.code}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {p.applications} apps · {p.enrollments} enrolled
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleActive(p)}>
                      {p.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => removePartner(p)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Partner name"
              className="h-9 w-40"
            />
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Ref code"
              className="h-9 w-32"
            />
            <Input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Contact (optional)"
              className="h-9 w-44"
            />
            <Button size="sm" onClick={addPartner} disabled={saving || !form.name.trim() || !form.code.trim()}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add partner
            </Button>
          </div>

          {openPartner && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{openPartner.name} referrals</p>
                <button onClick={() => setOpenPartner(null)} aria-label="Close">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              {referrals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No referrals yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {referrals.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-foreground">{r.name || r.email || 'Unknown'}</span>
                      {r.vertical && <span className="text-muted-foreground">{r.vertical}</span>}
                      <span className="text-muted-foreground">{r.stage}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
