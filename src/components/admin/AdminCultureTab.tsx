import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Award, CalendarRange, Target, Plus, Trash2, Trophy } from 'lucide-react';
import { refreshBadges } from '@/hooks/useBadges';
import { BadgeChip, badgeIcon } from '@/components/badges/BadgeChip';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4';
const ICON_CHOICES = ['award', 'shield', 'medal', 'mic', 'star', 'crown', 'flame', 'zap', 'users'];

interface Def {
  key: string; name: string; description: string | null;
  kind: 'milestone' | 'certification'; icon: string; sort_order: number; active: boolean;
}
interface Person { id: string; full_name: string | null }
interface SeasonRow { id: string; name: string; starts_on: string; ends_on: string; is_active: boolean }
interface IncentiveRow {
  id: string; name: string; metric: 'signs' | 'points'; target: number;
  ends_on: string | null; prize_note: string | null; is_active: boolean;
}

export function AdminCultureTab() {
  const [defs, setDefs] = useState<Def[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [incentives, setIncentives] = useState<IncentiveRow[]>([]);
  const [loading, setLoading] = useState(true);

  // forms
  const [certName, setCertName] = useState('');
  const [certIcon, setCertIcon] = useState('shield');
  const [certDesc, setCertDesc] = useState('');
  const [grantBadge, setGrantBadge] = useState('');
  const [grantUser, setGrantUser] = useState('');
  const [season, setSeason] = useState({ name: '', starts_on: '', ends_on: '' });
  const [inc, setInc] = useState({ name: '', metric: 'signs', target: '', ends_on: '', prize_note: '' });

  const load = async () => {
    const [d, p, s, i] = await Promise.all([
      supabase.from('badge_definitions').select('*').order('sort_order'),
      supabase.from('profiles').select('id, full_name').eq('archived', false).order('full_name'),
      supabase.from('seasons').select('*').order('starts_on', { ascending: false }),
      supabase.from('incentives').select('*').order('created_at', { ascending: false }),
    ]);
    setDefs((d.data as Def[]) || []);
    setPeople((p.data as Person[]) || []);
    setSeasons((s.data as SeasonRow[]) || []);
    setIncentives((i.data as IncentiveRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addCert = async () => {
    if (!certName.trim()) return;
    const key = certName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    const { error } = await supabase.from('badge_definitions').insert({
      key, name: certName.trim(), description: certDesc.trim() || null,
      kind: 'certification', icon: certIcon, sort_order: 200,
    });
    if (error) return toast({ title: 'Could not add certification', description: error.message, variant: 'destructive' });
    setCertName(''); setCertDesc('');
    toast({ title: 'Certification added' });
    load();
  };

  const toggleDef = async (key: string, active: boolean) => {
    await supabase.from('badge_definitions').update({ active }).eq('key', key);
    refreshBadges();
    load();
  };

  const grant = async () => {
    if (!grantBadge || !grantUser) return;
    const { error } = await supabase.from('user_badges').insert({ user_id: grantUser, badge_key: grantBadge });
    if (error && !error.message.includes('duplicate')) {
      return toast({ title: 'Could not grant badge', description: error.message, variant: 'destructive' });
    }
    refreshBadges();
    toast({ title: 'Badge granted' });
  };

  const revoke = async () => {
    if (!grantBadge || !grantUser) return;
    await supabase.from('user_badges').delete().eq('user_id', grantUser).eq('badge_key', grantBadge);
    refreshBadges();
    toast({ title: 'Badge removed' });
  };

  const addSeason = async () => {
    if (!season.name || !season.starts_on || !season.ends_on) return;
    const { error } = await supabase.from('seasons').insert(season);
    if (error) return toast({ title: 'Could not create season', description: error.message, variant: 'destructive' });
    setSeason({ name: '', starts_on: '', ends_on: '' });
    toast({ title: 'Season created' });
    load();
  };

  const finalize = async (id: string) => {
    const { error } = await (supabase as any).rpc('finalize_season', { _season_id: id });
    if (error) return toast({ title: 'Could not close season', description: error.message, variant: 'destructive' });
    toast({ title: 'Season closed', description: 'Top 3 are frozen into the Hall of Fame.' });
    load();
  };

  const addIncentive = async () => {
    const target = parseInt(inc.target, 10);
    if (!inc.name || !target) return;
    const { error } = await supabase.from('incentives').insert({
      name: inc.name, metric: inc.metric, target,
      ends_on: inc.ends_on || null, prize_note: inc.prize_note || null,
    });
    if (error) return toast({ title: 'Could not create incentive', description: error.message, variant: 'destructive' });
    setInc({ name: '', metric: 'signs', target: '', ends_on: '', prize_note: '' });
    toast({ title: 'Incentive created' });
    load();
  };

  const toggleIncentive = async (id: string, is_active: boolean) => {
    await supabase.from('incentives').update({ is_active }).eq('id', id);
    load();
  };

  const removeIncentive = async (id: string) => {
    await supabase.from('incentives').delete().eq('id', id);
    load();
  };

  if (loading) return <div className="p-6 text-[13px] text-muted-foreground">Loading…</div>;

  const certs = defs.filter((d) => d.kind === 'certification');
  const milestones = defs.filter((d) => d.kind === 'milestone');

  return (
    <div className="space-y-4">
      {/* BADGES */}
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="text-[13px] font-bold text-foreground">Badges</h3>
        </div>

        <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-micro font-semibold">Milestones (automatic)</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {milestones.map((d) => (
            <span key={d.key} className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-2 py-1">
              <BadgeChip badge={{ ...d, user_id: '', badge_key: d.key, granted_at: '' }} />
              <span className="text-[12px] text-foreground">{d.name}</span>
              <Switch checked={d.active} onCheckedChange={(v) => toggleDef(d.key, v)} />
            </span>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-micro font-semibold">Certifications</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {certs.length === 0 && <span className="text-[12px] text-muted-foreground">None yet.</span>}
          {certs.map((d) => (
            <span key={d.key} className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-2 py-1">
              <BadgeChip badge={{ ...d, user_id: '', badge_key: d.key, granted_at: '' }} />
              <span className="text-[12px] text-foreground">{d.name}</span>
              <Switch checked={d.active} onCheckedChange={(v) => toggleDef(d.key, v)} />
            </span>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto] items-end">
          <div>
            <Label className="text-[11px]">Certification name</Label>
            <Input value={certName} onChange={(e) => setCertName(e.target.value)} placeholder="Pitch Certified" />
          </div>
          <div>
            <Label className="text-[11px]">Description</Label>
            <Input value={certDesc} onChange={(e) => setCertDesc(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label className="text-[11px]">Icon</Label>
            <Select value={certIcon} onValueChange={setCertIcon}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICON_CHOICES.map((ic) => {
                  const Ic = badgeIcon(ic);
                  return (
                    <SelectItem key={ic} value={ic}>
                      <span className="inline-flex items-center gap-2"><Ic className="w-3.5 h-3.5" />{ic}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addCert}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>

        <div className="mt-4 pt-4 border-t border-border/40 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] items-end">
          <div>
            <Label className="text-[11px]">Rep</Label>
            <Select value={grantUser} onValueChange={setGrantUser}>
              <SelectTrigger><SelectValue placeholder="Select rep" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || 'Unnamed'}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Badge</Label>
            <Select value={grantBadge} onValueChange={setGrantBadge}>
              <SelectTrigger><SelectValue placeholder="Select badge" /></SelectTrigger>
              <SelectContent>
                {defs.map((d) => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={grant} disabled={!grantBadge || !grantUser}>Grant</Button>
          <Button variant="outline" onClick={revoke} disabled={!grantBadge || !grantUser}>Remove</Button>
        </div>
      </div>

      {/* SEASONS */}
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-4 h-4 text-primary" />
          <h3 className="text-[13px] font-bold text-foreground">Seasons</h3>
        </div>
        <div className="space-y-2 mb-3">
          {seasons.length === 0 && <p className="text-[12px] text-muted-foreground">No seasons defined — the leaderboard behaves normally.</p>}
          {seasons.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
              <span className="text-[13px] font-semibold text-foreground">{s.name}</span>
              <span className="text-[11px] text-muted-foreground">{s.starts_on} → {s.ends_on}</span>
              <span className={cn('text-[10px] font-bold uppercase tracking-micro', s.is_active ? 'text-success' : 'text-muted-foreground')}>
                {s.is_active ? 'Active' : 'Closed'}
              </span>
              {s.is_active && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => finalize(s.id)}>
                  <Trophy className="w-3.5 h-3.5 mr-1" />Close & freeze top 3
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_150px_150px_auto] items-end">
          <div>
            <Label className="text-[11px]">Season name</Label>
            <Input value={season.name} onChange={(e) => setSeason({ ...season, name: e.target.value })} placeholder="Summer 2026" />
          </div>
          <div>
            <Label className="text-[11px]">Starts</Label>
            <Input type="date" value={season.starts_on} onChange={(e) => setSeason({ ...season, starts_on: e.target.value })} />
          </div>
          <div>
            <Label className="text-[11px]">Ends</Label>
            <Input type="date" value={season.ends_on} onChange={(e) => setSeason({ ...season, ends_on: e.target.value })} />
          </div>
          <Button onClick={addSeason}><Plus className="w-4 h-4 mr-1" />Create</Button>
        </div>
      </div>

      {/* INCENTIVES */}
      <div className={CARD}>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-[13px] font-bold text-foreground">Incentives</h3>
        </div>
        <div className="space-y-2 mb-3">
          {incentives.length === 0 && <p className="text-[12px] text-muted-foreground">None configured — the section is hidden on the leaderboard.</p>}
          {incentives.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 px-3 py-2">
              <span className="text-[13px] font-semibold text-foreground">{i.name}</span>
              <span className="text-[11px] text-muted-foreground">{i.target} {i.metric}{i.ends_on ? ` · ends ${i.ends_on}` : ''}</span>
              {i.prize_note && <span className="text-[11px] text-[#D4AF37]">{i.prize_note}</span>}
              <div className="ml-auto flex items-center gap-2">
                <Switch checked={i.is_active} onCheckedChange={(v) => toggleIncentive(i.id, v)} />
                <Button size="icon" variant="ghost" onClick={() => removeIncentive(i.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_120px_100px_140px_1fr_auto] items-end">
          <div>
            <Label className="text-[11px]">Name</Label>
            <Input value={inc.name} onChange={(e) => setInc({ ...inc, name: e.target.value })} placeholder="Sign 5 by Friday" />
          </div>
          <div>
            <Label className="text-[11px]">Metric</Label>
            <Select value={inc.metric} onValueChange={(v) => setInc({ ...inc, metric: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="signs">Signs</SelectItem>
                <SelectItem value="points">Points</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px]">Target</Label>
            <Input type="number" min={1} value={inc.target} onChange={(e) => setInc({ ...inc, target: e.target.value })} />
          </div>
          <div>
            <Label className="text-[11px]">Ends (optional)</Label>
            <Input type="date" value={inc.ends_on} onChange={(e) => setInc({ ...inc, ends_on: e.target.value })} />
          </div>
          <div>
            <Label className="text-[11px]">Prize note (optional)</Label>
            <Input value={inc.prize_note} onChange={(e) => setInc({ ...inc, prize_note: e.target.value })} />
          </div>
          <Button onClick={addIncentive}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </div>
    </div>
  );
}

export default AdminCultureTab;
