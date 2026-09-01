import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isAdminOrAbove } from '@/lib/roles';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBackButton } from '@/components/shared/PageBackButton';
import { useSeasonHub, SeasonChecklistItem } from '@/hooks/useSeasonHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  CalendarClock, Users, ListChecks, Home as HomeIcon, Plane,
  Plus, Trash2, ArrowUp, ArrowDown, Pencil, Check, X, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 sm:p-5';

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [target]);
  return useMemo(() => {
    if (!target) return null;
    const diff = new Date(target + 'T00:00:00').getTime() - now;
    const clamped = Math.max(0, diff);
    const days = Math.floor(clamped / 86400000);
    const hours = Math.floor((clamped % 86400000) / 3600000);
    const minutes = Math.floor((clamped % 3600000) / 60000);
    return { days, hours, minutes, isPast: diff <= 0 };
  }, [target, now]);
}

function NotesBlock({ text }: { text: string | null }) {
  if (!text) return <p className="text-[13px] text-muted-foreground">Nothing posted yet.</p>;
  return (
    <div className="text-[13px] text-foreground/90 leading-relaxed">
      {text.split('\n').map((line, i) => (
        <p key={i} className={line.trim() === '' ? 'h-3' : undefined}>{line}</p>
      ))}
    </div>
  );
}

export default function SeasonPage() {
  const { role, isLoading: authLoading } = useAuth();
  const { season, loading, refresh } = useSeasonHub();
  const isAdmin = isAdminOrAbove(role);
  const countdown = useCountdown(season?.starts_on ?? null);

  // Local checklist tick state (per user, per season)
  const storageKey = season ? `season_checklist_${season.id}` : null;
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      setTicked(raw ? JSON.parse(raw) : {});
    } catch {
      setTicked({});
    }
  }, [storageKey]);

  const toggleTick = (id: string) => {
    if (!storageKey) return;
    setTicked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  // ---- Admin editing state ----
  const [editingHousing, setEditingHousing] = useState(false);
  const [housingDraft, setHousingDraft] = useState('');
  const [editingTravel, setEditingTravel] = useState(false);
  const [travelDraft, setTravelDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    if (season) {
      setHousingDraft(season.housing_notes || '');
      setTravelDraft(season.travel_notes || '');
    }
  }, [season?.id]);

  const saveNotes = async (field: 'housing_notes' | 'travel_notes', value: string) => {
    if (!season) return;
    setSavingNotes(true);
    const { error } = await supabase.from('seasons').update({ [field]: value } as never).eq('id', season.id);
    setSavingNotes(false);
    if (error) return toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    if (field === 'housing_notes') setEditingHousing(false); else setEditingTravel(false);
    toast({ title: 'Saved' });
    refresh();
  };

  const addChecklistItem = async () => {
    if (!season || !newItemLabel.trim()) return;
    setSavingItem(true);
    const maxSort = season.checklist.length;
    const { error } = await supabase.from('season_checklist_items').insert({
      season_id: season.id, label: newItemLabel.trim(), sort_order: maxSort, is_active: true,
    } as never);
    setSavingItem(false);
    if (error) return toast({ title: 'Could not add item', description: error.message, variant: 'destructive' });
    setNewItemLabel('');
    toast({ title: 'Checklist item added' });
    refresh();
  };

  const renameItem = async (id: string, label: string) => {
    const { error } = await supabase.from('season_checklist_items').update({ label } as never).eq('id', id);
    if (error) return toast({ title: 'Could not rename', description: error.message, variant: 'destructive' });
    refresh();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from('season_checklist_items').update({ is_active: false } as never).eq('id', id);
    if (error) return toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
    toast({ title: 'Item removed' });
    refresh();
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    if (!season) return;
    const list = [...season.checklist];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setSavingItem(true);
    await Promise.all(list.map((item, i) =>
      supabase.from('season_checklist_items').update({ sort_order: i } as never).eq('id', item.id)
    ));
    setSavingItem(false);
    refresh();
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!season) {
    return (
      <AppLayout>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <PageBackButton to="/app" label="Home" />
          <div className={cn(CARD, 'text-center py-14')}>
            <CalendarClock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            {isAdmin ? (
              <>
                <p className="text-[15px] font-semibold text-foreground">Season settings are on Pillar → Settings.</p>
                <a
                  href="/admin/settings"
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-white/[0.08] px-4 text-[13px] font-medium text-foreground hover:bg-muted/30"
                >
                  Open Pillar → Settings
                </a>
              </>
            ) : (
              <p className="text-[15px] font-semibold text-foreground">Not set yet.</p>
            )}
          </div>
        </main>
      </AppLayout>
    );
  }


  return (
    <AppLayout>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageBackButton to="/app" label="Home" />

        {/* Hero */}
        <PageHeader
          title={season.name}
          context={`${season.starts_on} → ${season.ends_on}`}
          className="mb-8"
        />

        {/* Countdown */}
        <div className={cn(CARD, 'mb-6')}>
          <p className="text-[11px] uppercase tracking-micro font-bold text-muted-foreground mb-3">
            {countdown?.isPast ? 'Season has started' : 'Countdown to kickoff'}
          </p>
          <div className="flex items-end gap-6" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {[
              { v: countdown?.days ?? 0, label: 'days' },
              { v: countdown?.hours ?? 0, label: 'hrs' },
              { v: countdown?.minutes ?? 0, label: 'min' },
            ].map((c) => (
              <div key={c.label}>
                <div className="text-4xl sm:text-5xl font-extrabold text-primary leading-none">{c.v}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-micro mt-1">{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Checklist */}
          <div className={CARD}>
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-primary" />
              <h3 className="text-[13px] font-bold text-foreground">Checklist</h3>
            </div>
            <div className="space-y-1.5">
              {season.checklist.length === 0 && (
                <p className="text-[12px] text-muted-foreground">No checklist items yet.</p>
              )}
              {season.checklist.map((item, i) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  index={i}
                  total={season.checklist.length}
                  checked={!!ticked[item.id]}
                  onToggle={() => toggleTick(item.id)}
                  isAdmin={isAdmin}
                  onRename={renameItem}
                  onRemove={removeItem}
                  onMove={moveItem}
                />
              ))}
            </div>
            {isAdmin && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
                <Input
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder="Add checklist item"
                  className="h-8 text-[12px]"
                  onKeyDown={(e) => { if (e.key === 'Enter') addChecklistItem(); }}
                />
                <Button size="sm" className="h-8" disabled={savingItem || !newItemLabel.trim()} onClick={addChecklistItem}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Roster */}
          <div className={CARD}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-[13px] font-bold text-foreground">Roster ({season.roster.length})</h3>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {season.roster.length === 0 && <p className="text-[12px] text-muted-foreground">No one on the roster yet.</p>}
              {season.roster.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2.5">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                      {(m.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground truncate">{m.full_name || 'Unnamed'}</p>
                    {m.office_name && <p className="text-[11px] text-muted-foreground truncate">{m.office_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Housing notes */}
          <div className={CARD}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HomeIcon className="w-4 h-4 text-primary" />
                <h3 className="text-[13px] font-bold text-foreground">Housing</h3>
              </div>
              {isAdmin && !editingHousing && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingHousing(true)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {editingHousing ? (
              <div className="space-y-2">
                <Textarea value={housingDraft} onChange={(e) => setHousingDraft(e.target.value)} rows={5} className="text-[12.5px]" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7" disabled={savingNotes} onClick={() => saveNotes('housing_notes', housingDraft)}>
                    <Check className="w-3.5 h-3.5 mr-1" />Save
                  </Button>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => { setHousingDraft(season.housing_notes || ''); setEditingHousing(false); }}>
                    <X className="w-3.5 h-3.5 mr-1" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <NotesBlock text={season.housing_notes} />
            )}
          </div>

          {/* Travel notes */}
          <div className={CARD}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-primary" />
                <h3 className="text-[13px] font-bold text-foreground">Travel</h3>
              </div>
              {isAdmin && !editingTravel && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingTravel(true)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {editingTravel ? (
              <div className="space-y-2">
                <Textarea value={travelDraft} onChange={(e) => setTravelDraft(e.target.value)} rows={5} className="text-[12.5px]" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7" disabled={savingNotes} onClick={() => saveNotes('travel_notes', travelDraft)}>
                    <Check className="w-3.5 h-3.5 mr-1" />Save
                  </Button>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => { setTravelDraft(season.travel_notes || ''); setEditingTravel(false); }}>
                    <X className="w-3.5 h-3.5 mr-1" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <NotesBlock text={season.travel_notes} />
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

function ChecklistRow({
  item, index, total, checked, onToggle, isAdmin, onRename, onRemove, onMove,
}: {
  item: SeasonChecklistItem;
  index: number;
  total: number;
  checked: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  onRename: (id: string, label: string) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 px-2.5 py-1.5">
      <button
        onClick={onToggle}
        className={cn(
          'w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
          checked ? 'bg-primary border-primary' : 'border-border'
        )}
        style={{ width: 18, height: 18 }}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </button>
      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => { onRename(item.id, label); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { onRename(item.id, label); setEditing(false); } }}
          className="flex-1 bg-transparent text-[12.5px] text-foreground border-b border-primary outline-none"
        />
      ) : (
        <span className={cn('flex-1 text-[12.5px]', checked ? 'text-muted-foreground line-through' : 'text-foreground')}>
          {item.label}
        </span>
      )}
      {isAdmin && !editing && (
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-5 w-5" disabled={index === 0} onClick={() => onMove(index, -1)}>
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" disabled={index === total - 1} onClick={() => onMove(index, 1)}>
            <ArrowDown className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditing(true)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => onRemove(item.id)}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
