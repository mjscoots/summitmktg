import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRecruitGate } from '@/hooks/useRecruitGate';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { celebrate } from '@/lib/celebrate';
import { SectionEyebrow } from '@/components/home/SectionEyebrow';

interface RowState {
  name: string;
  phone: string;
}

interface Mine {
  count: number;
  names: string[];
}

const BLANK: RowState = { name: '', phone: '' };

/**
 * Pass 135 — Your three. Every non recruit sends up to three names into the
 * recruiting pool through submit_your_three. Counts and submitted names come
 * from the database, never a local flag, and nothing about what happened to a
 * name comes back to the rep.
 */
export function YourThreeCard() {
  const { user } = useAuth();
  const gate = useRecruitGate();
  const [mine, setMine] = useState<Mine | null>(null);
  const [rows, setRows] = useState<RowState[]>([{ ...BLANK }, { ...BLANK }, { ...BLANK }]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).rpc('my_your_three');
    const res = (data as Mine) || { count: 0, names: [] };
    setMine({ count: Number(res.count || 0), names: Array.isArray(res.names) ? res.names : [] });
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const left = mine ? Math.max(0, 3 - mine.count) : 0;

  useEffect(() => {
    setRows(Array.from({ length: Math.max(0, left) }, () => ({ ...BLANK })));
  }, [left]);

  const complete = rows.filter((r) => r.name.trim().length >= 2 && r.phone.replace(/\D/g, '').length >= 10);

  async function submit() {
    if (complete.length === 0) return;
    setSaving(true);
    const { data, error } = await (supabase as any).rpc('submit_your_three', {
      _rows: complete.map((r) => ({ name: r.name.trim(), phone: r.phone.trim() })),
    });
    setSaving(false);
    if (error) {
      toast.error('That did not send');
      return;
    }
    const res = data as { ok: boolean; error?: string; results?: { name: string; status: string }[] };
    if (!res?.ok) {
      toast.error(res?.error || 'That did not send');
      return;
    }
    const results = res.results || [];
    const added = results.filter((r) => r.status === 'added').length;
    const dupes = results.filter((r) => r.status === 'duplicate');
    if (added > 0) toast.success(added === 1 ? 'Sent to your manager' : `${added} sent to your manager`);
    for (const d of dupes) toast.message(`${d.name} is already in our system`);
    if (results.some((r) => r.status === 'cap')) toast.message('You have already sent three names');
    await load();
    if (added > 0 && (mine?.count || 0) + added >= 3) void celebrate('setup');
  }

  if (!user || mine === null) return null;
  if (!gate.isLoading && gate.is_recruit) return null;

  const done = mine.count >= 3;

  return (
    <section className="rounded-[var(--radius)] border border-border bg-card p-4">
      <SectionEyebrow>Your three</SectionEyebrow>
      <p className="text-[15px] text-foreground">
        Who are three people who should be doing this next summer?
      </p>
      <p className="mt-2 text-[14px] text-muted-foreground tabular-nums">
        You have sent {mine.count} of 3
      </p>

      {mine.names.length > 0 && (
        <ul className="mt-2 space-y-1">
          {mine.names.map((n, i) => (
            <li key={`${n}-${i}`} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="truncate text-foreground">{n}</span>
              <span className="shrink-0 text-[12px] text-muted-foreground">Submitted</span>
            </li>
          ))}
        </ul>
      )}

      {!done && (
        <>
          <div className="mt-3 space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="space-y-2">
                <Input
                  value={r.name}
                  onChange={(e) =>
                    setRows((prev) => prev.map((p, j) => (j === i ? { ...p, name: e.target.value } : p)))
                  }
                  placeholder="Name"
                  className="min-h-11 text-[15px]"
                />
                <Input
                  value={r.phone}
                  onChange={(e) =>
                    setRows((prev) => prev.map((p, j) => (j === i ? { ...p, phone: e.target.value } : p)))
                  }
                  placeholder="Phone"
                  inputMode="tel"
                  className="min-h-11 text-[15px]"
                />
              </div>
            ))}
          </div>
          <Button
            className="mt-3 min-h-11 w-full text-[15px]"
            onClick={submit}
            disabled={saving || complete.length === 0}
          >
            {saving ? 'Sending…' : 'Send these names'}
          </Button>
        </>
      )}
    </section>
  );
}

export default YourThreeCard;
