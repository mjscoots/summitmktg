import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Phone, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { isManagerOrAbove } from '@/lib/roles';
import { LIFE_CARD, LIFE_STAGES, nextStage, type LifeContact } from '@/lib/lifePipeline';

/** Summit Life pipeline: contacts grouped by stage, with the next step on each. */
export default function PipelinePage() {
  const { user, role } = useAuth();
  const isLead = isManagerOrAbove(role);
  const [rows, setRows] = useState<LifeContact[]>([]);
  const [team, setTeam] = useState<{ user_id: string; name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contact_name: '', phone: '', next_step: '', next_at: '' });

  const load = useCallback(async () => {
    if (!user) return;
    const mine = await (supabase as any)
      .from('life_pipeline')
      .select('id, user_id, contact_name, phone, stage, next_step, next_at, notes')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows((mine.data as LifeContact[]) || []);

    if (isLead) {
      const all = await (supabase as any).from('life_pipeline').select('user_id');
      const ids = [...new Set(((all.data as { user_id: string }[]) || []).map((r) => r.user_id))].filter(
        (id) => id !== user.id,
      );
      if (ids.length) {
        const profiles = await (supabase as any)
          .from('profiles')
          .select('id, full_name')
          .in('id', ids);
        const names = new Map(
          ((profiles.data as { id: string; full_name: string | null }[]) || []).map((p) => [
            p.id,
            p.full_name || 'Rep',
          ]),
        );
        const tally = new Map<string, number>();
        ((all.data as { user_id: string }[]) || []).forEach((r) => {
          if (r.user_id === user.id) return;
          tally.set(r.user_id, (tally.get(r.user_id) || 0) + 1);
        });
        setTeam(
          [...tally.entries()].map(([id, count]) => ({
            user_id: id,
            name: names.get(id) || 'Rep',
            count,
          })),
        );
      } else {
        setTeam([]);
      }
    }
    setLoading(false);
  }, [user, isLead]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map: Record<string, LifeContact[]> = {};
    LIFE_STAGES.forEach((s) => {
      map[s] = [];
    });
    rows.forEach((r) => {
      (map[r.stage] ||= []).push(r);
    });
    return map;
  }, [rows]);

  async function add() {
    if (!user || !form.contact_name.trim()) {
      toast.error('Add a contact name');
      return;
    }
    const { error } = await (supabase as any).from('life_pipeline').insert({
      user_id: user.id,
      contact_name: form.contact_name.trim(),
      phone: form.phone.trim() || null,
      next_step: form.next_step.trim() || null,
      next_at: form.next_at ? new Date(form.next_at).toISOString() : null,
    });
    if (error) {
      toast.error('Could not save that contact');
      return;
    }
    setForm({ contact_name: '', phone: '', next_step: '', next_at: '' });
    setOpen(false);
    void load();
  }

  async function move(row: LifeContact) {
    const stage = nextStage(row.stage);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, stage } : r)));
    const { error } = await (supabase as any)
      .from('life_pipeline')
      .update({ stage })
      .eq('id', row.id);
    if (error) {
      toast.error('Could not move that contact');
      void load();
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeader title="Pipeline" context="Your contacts and the next step on each." />

        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="min-h-11">
                <Plus className="mr-2 h-4 w-4" />
                Add contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pl-name">Name</Label>
                  <Input
                    id="pl-name"
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pl-phone">Phone</Label>
                  <Input
                    id="pl-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pl-step">Next step</Label>
                  <Input
                    id="pl-step"
                    value={form.next_step}
                    onChange={(e) => setForm({ ...form, next_step: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pl-date">Next step date</Label>
                  <Input
                    id="pl-date"
                    type="datetime-local"
                    value={form.next_at}
                    onChange={(e) => setForm({ ...form, next_at: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button className="min-h-11" onClick={add}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          LIFE_STAGES.map((stage) => (
            <section key={stage} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-medium text-foreground">{stage}</h2>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {grouped[stage].length}
                </span>
              </div>
              {grouped[stage].length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts in this stage.</p>
              ) : (
                <ul className="space-y-3">
                  {grouped[stage].map((r) => (
                    <li key={r.id} className={`${LIFE_CARD} space-y-3 p-4`}>
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.contact_name}</p>
                        {r.next_step && (
                          <p className="text-sm text-muted-foreground">
                            {r.next_step}
                            {r.next_at
                              ? ` — ${new Date(r.next_at).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}`
                              : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {r.phone && (
                          <>
                            <Button variant="outline" size="sm" className="min-h-11" asChild>
                              <a href={`tel:${r.phone}`}>
                                <Phone className="mr-2 h-4 w-4" />
                                Call
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" className="min-h-11" asChild>
                              <a href={`sms:${r.phone}`}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Text
                              </a>
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11"
                          onClick={() => move(r)}
                        >
                          Move to {nextStage(r.stage)}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}

        {isLead && (
          <section className={`${LIFE_CARD} space-y-3 p-4`}>
            <h2 className="text-base font-medium text-foreground">Your reps</h2>
            {team.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rep contacts yet.</p>
            ) : (
              <ul className="space-y-2">
                {team.map((t) => (
                  <li key={t.user_id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-foreground">{t.name}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </AppLayout>
  );
}
