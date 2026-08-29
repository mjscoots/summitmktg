import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2 } from 'lucide-react';
import type { FiberBlitz, FiberContact } from '@/hooks/useFiberHub';
import { useFiberEditor } from '@/hooks/useFiberEditor';


const CARD = 'rounded-xl border border-border bg-card p-4';

function parse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Owner and admin editor for the Fiber hub: contacts, blitzes, join link. */
export function AdminFiberHubTab() {
  const { canEdit, loading: gateLoading } = useFiberEditor();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<FiberContact[]>([]);
  const [blitzes, setBlitzes] = useState<FiberBlitz[]>([]);
  const [joinLink, setJoinLink] = useState('');


  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('app_settings')
      .select('key, value')
      .in('key', ['fiber_contacts', 'fiber_blitzes', 'fiber_join_link']);
    const map: Record<string, string> = {};
    for (const row of (data as { key: string; value: string | null }[]) || []) {
      if (row.value) map[row.key] = row.value;
    }
    setContacts(parse<FiberContact[]>(map.fiber_contacts, []));
    setBlitzes(parse<FiberBlitz[]>(map.fiber_blitzes, []));
    setJoinLink(map.fiber_join_link || '');
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    const rows = [
      { key: 'fiber_contacts', value: JSON.stringify(contacts) },
      { key: 'fiber_blitzes', value: JSON.stringify(blitzes) },
      { key: 'fiber_join_link', value: joinLink },
    ];
    const { error } = await (supabase as any).from('app_settings').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) toast('Could not save the Fiber hub settings');
    else toast('Fiber hub saved');
  };

  if (loading || gateLoading) return <Skeleton className="h-64 w-full" />;

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <section className={CARD}>
          <p className="text-sm font-semibold text-foreground">Read only</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Fiber content is edited by the owner and Brandon Pillar.
          </p>
        </section>
        <section className={CARD}>
          <p className="mb-2 text-sm font-semibold text-foreground">Who to contact</p>
          {contacts.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No contacts yet</p>
          ) : (
            <ul className="space-y-1 text-[13px] text-muted-foreground">
              {contacts.map((c, i) => (
                <li key={i}>
                  {[c.name, c.phone, c.role].filter(Boolean).join(' · ')}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={CARD}>
          <p className="mb-2 text-sm font-semibold text-foreground">Upcoming blitzes</p>
          {blitzes.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No blitzes yet</p>
          ) : (
            <ul className="space-y-1 text-[13px] text-muted-foreground">
              {blitzes.map((b, i) => (
                <li key={i}>{[b.place, b.timing].filter(Boolean).join(' · ')}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <section className={CARD}>
        <p className="mb-3 text-sm font-semibold text-foreground">Who to contact</p>
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <Input
                value={c.name}
                placeholder="Name"
                onChange={(e) =>
                  setContacts(contacts.map((x, j) => (i === j ? { ...x, name: e.target.value } : x)))
                }
              />
              <Input
                value={c.phone}
                placeholder="Phone"
                onChange={(e) =>
                  setContacts(contacts.map((x, j) => (i === j ? { ...x, phone: e.target.value } : x)))
                }
              />
              <Input
                value={c.role}
                placeholder="What they handle"
                onChange={(e) =>
                  setContacts(contacts.map((x, j) => (i === j ? { ...x, role: e.target.value } : x)))
                }
              />
              <Button
                variant="outline"
                className="min-h-11"
                aria-label="Remove contact"
                onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 min-h-11"
          onClick={() => setContacts([...contacts, { name: '', phone: '', role: '' }])}
        >
          <Plus className="mr-2 h-4 w-4" /> Add contact
        </Button>
      </section>

      <section className={CARD}>
        <p className="mb-1 text-sm font-semibold text-foreground">Upcoming blitzes</p>
        <p className="mb-3 text-[12px] text-muted-foreground">
          Reps opt in until a blitz hits capacity.
        </p>
        <div className="space-y-4">
          {blitzes.map((b, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="grid gap-2 sm:grid-cols-[2fr_2fr]">
                <Input
                  value={b.place}
                  placeholder="Market"
                  onChange={(e) =>
                    setBlitzes(blitzes.map((x, j) => (i === j ? { ...x, place: e.target.value } : x)))
                  }
                />
                <Input
                  value={b.timing}
                  placeholder="Timing"
                  onChange={(e) =>
                    setBlitzes(blitzes.map((x, j) => (i === j ? { ...x, timing: e.target.value } : x)))
                  }
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr]">
                <label className="text-[12px] text-muted-foreground">
                  Start date
                  <Input
                    type="date"
                    value={b.start_date || ''}
                    onChange={(e) =>
                      setBlitzes(
                        blitzes.map((x, j) => (i === j ? { ...x, start_date: e.target.value } : x))
                      )
                    }
                  />
                </label>
                <label className="text-[12px] text-muted-foreground">
                  End date
                  <Input
                    type="date"
                    value={b.end_date || ''}
                    onChange={(e) =>
                      setBlitzes(
                        blitzes.map((x, j) => (i === j ? { ...x, end_date: e.target.value } : x))
                      )
                    }
                  />
                </label>
                <label className="text-[12px] text-muted-foreground">
                  Capacity
                  <Input
                    type="number"
                    min={0}
                    value={b.capacity ?? ''}
                    onChange={(e) =>
                      setBlitzes(
                        blitzes.map((x, j) =>
                          i === j
                            ? { ...x, capacity: e.target.value === '' ? undefined : Number(e.target.value) }
                            : x
                        )
                      )
                    }
                  />
                </label>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex min-h-11 items-center gap-2 text-[13px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(b.approximate)}
                    onChange={(e) =>
                      setBlitzes(
                        blitzes.map((x, j) => (i === j ? { ...x, approximate: e.target.checked } : x))
                      )
                    }
                  />
                  Approximate
                </label>
                <Button
                  variant="outline"
                  className="min-h-11"
                  aria-label="Remove blitz"
                  onClick={() => setBlitzes(blitzes.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 min-h-11"
          onClick={() => setBlitzes([...blitzes, { place: '', timing: '', approximate: false }])}
        >
          <Plus className="mr-2 h-4 w-4" /> Add blitz
        </Button>
      </section>


      <section className={CARD}>
        <p className="mb-2 text-sm font-semibold text-foreground">Gainz rep onboarding link</p>
        <Input value={joinLink} onChange={(e) => setJoinLink(e.target.value)} placeholder="https://" />
      </section>

      <Button className="min-h-11" onClick={save} disabled={saving}>
        {saving ? 'Saving' : 'Save Fiber hub'}
      </Button>
    </div>
  );
}

export default AdminFiberHubTab;
