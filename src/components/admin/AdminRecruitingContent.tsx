import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PARENT_SECTIONS } from '@/pages/Parents';

const CARD = 'bg-card/60 backdrop-blur-sm border border-white/[0.06] rounded-xl';

interface TimelineRow {
  id: string;
  time_label: string;
  title: string;
  body: string;
  display_order: number;
  is_active: boolean;
}
interface FaqRow {
  id: string;
  question: string;
  answer: string | null;
  display_order: number;
  is_active: boolean;
}
interface TestimonialRow {
  id: string;
  rep_name: string;
  school: string | null;
  first_summer_figure: string | null;
  quote: string | null;
  display_order: number;
  is_active: boolean;
}

const SETTING_KEYS = [
  { key: 'recruiting_content_hero_video_url', label: 'Hero video URL (YouTube / Vimeo)', hint: 'https://...' },
  { key: 'public_counter_min_reps', label: 'Hide "active reps" below', hint: '10' },
  { key: 'public_counter_min_signs', label: 'Hide "signed this season" below', hint: '5' },
  { key: 'calc_avg_contract_value', label: 'Calculator: avg annual contract value ($)', hint: '550' },
];

export default function AdminRecruitingContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [faq, setFaq] = useState<FaqRow[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>([]);
  const [parents, setParents] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [s, t, f, te] = await Promise.all([
      supabase.from('app_settings').select('key, value'),
      (supabase as any).from('recruiting_timeline').select('*').order('display_order'),
      (supabase as any).from('recruiting_faq').select('*').order('display_order'),
      (supabase as any).from('recruiting_testimonials').select('*').order('display_order'),
    ]);
    const map: Record<string, string> = {};
    const pmap: Record<string, string> = {};
    (s.data || []).forEach((row: any) => {
      map[row.key] = row.value || '';
      if (row.key === 'parents_intro' || row.key.startsWith('parents_')) pmap[row.key] = row.value || '';
    });
    setSettings(map);
    setParents(pmap);
    setTimeline((t.data as TimelineRow[]) || []);
    setFaq((f.data as FaqRow[]) || []);
    setTestimonials((te.data as TestimonialRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    const rows = [
      ...SETTING_KEYS.map((k) => ({ key: k.key, value: (settings[k.key] || '').trim() })),
      { key: 'parents_intro', value: (parents.parents_intro || '').trim() },
      ...PARENT_SECTIONS.map((sec) => ({ key: sec.key, value: (parents[sec.key] || '').trim() })),
    ];
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (error) return toast.error('Could not save');
    toast.success('Saved');
  };

  const addRow = async (table: string, values: Record<string, unknown>, order: number) => {
    const { error } = await (supabase as any).from(table).insert({ ...values, display_order: order });
    if (error) return toast.error('Could not add');
    load();
  };

  const updateRow = async (table: string, id: string, patch: Record<string, unknown>) => {
    const { error } = await (supabase as any).from(table).update(patch).eq('id', id);
    if (error) toast.error('Could not save');
  };

  const deleteRow = async (table: string, id: string) => {
    const { error } = await (supabase as any).from(table).delete().eq('id', id);
    if (error) return toast.error('Could not delete');
    load();
  };

  if (loading) {
    return (
      <div className={`${CARD} p-5 text-xs text-muted-foreground`}>
        <Loader2 className="inline w-3.5 h-3.5 animate-spin mr-2" /> Loading content…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className={`${CARD} p-5`}>
        <h3 className="text-sm font-bold text-foreground mb-1">Public page settings</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Blank fields stay hidden on the public pages. Counters stay hidden until they clear the thresholds below.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SETTING_KEYS.map((k) => (
            <div key={k.key}>
              <label className="micro-label mb-1 block" htmlFor={k.key}>{k.label}</label>
              <Input
                id={k.key}
                value={settings[k.key] || ''}
                placeholder={k.hint}
                onChange={(e) => setSettings({ ...settings, [k.key]: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">A day in the life</h3>
          <button
            onClick={() => addRow('recruiting_timeline', { title: 'New step', time_label: '', body: '' }, timeline.length + 1)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-xs font-semibold text-foreground"
          >
            <Plus className="w-3.5 h-3.5" /> Add step
          </button>
        </div>
        <div className="space-y-3">
          {timeline.map((row) => (
            <div key={row.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="flex gap-2">
                <Input
                  defaultValue={row.time_label}
                  placeholder="6:30 AM"
                  onBlur={(e) => updateRow('recruiting_timeline', row.id, { time_label: e.target.value })}
                  className="h-9 w-[110px] text-xs"
                />
                <Input
                  defaultValue={row.title}
                  placeholder="Step title"
                  onBlur={(e) => updateRow('recruiting_timeline', row.id, { title: e.target.value })}
                  className="h-9 flex-1 text-xs"
                />
                <button onClick={() => deleteRow('recruiting_timeline', row.id)} className="text-muted-foreground hover:text-red-400" aria-label="Delete step">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Textarea
                defaultValue={row.body}
                placeholder="What actually happens (plain copy)"
                onBlur={(e) => updateRow('recruiting_timeline', row.id, { body: e.target.value })}
                className="mt-2 text-xs"
                rows={2}
              />
            </div>
          ))}
          {timeline.length === 0 && <p className="text-xs text-muted-foreground">No steps yet — the section stays hidden.</p>}
        </div>
      </div>

      {/* FAQ */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">Straight-answer FAQ</h3>
          <button
            onClick={() => addRow('recruiting_faq', { question: 'New question', answer: null }, faq.length + 1)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-xs font-semibold text-foreground"
          >
            <Plus className="w-3.5 h-3.5" /> Add question
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Questions with no answer never show up publicly. Write them in your own words.
        </p>
        <div className="space-y-3">
          {faq.map((row) => (
            <div key={row.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="flex gap-2">
                <Input
                  defaultValue={row.question}
                  onBlur={(e) => updateRow('recruiting_faq', row.id, { question: e.target.value })}
                  className="h-9 flex-1 text-xs"
                />
                <button onClick={() => deleteRow('recruiting_faq', row.id)} className="text-muted-foreground hover:text-red-400" aria-label="Delete question">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Textarea
                defaultValue={row.answer || ''}
                placeholder="Answer (leave blank to keep it hidden)"
                onBlur={(e) => updateRow('recruiting_faq', row.id, { answer: e.target.value })}
                className="mt-2 text-xs"
                rows={3}
              />
              {!row.answer && (
                <p className="mt-1 text-[11px] text-amber-400/80">Unanswered — hidden on the public page.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">Rookie testimonials</h3>
          <button
            onClick={() => addRow('recruiting_testimonials', { rep_name: 'Rep name' }, testimonials.length + 1)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 text-xs font-semibold text-foreground"
          >
            <Plus className="w-3.5 h-3.5" /> Add card
          </button>
        </div>
        <div className="space-y-3">
          {testimonials.map((row) => (
            <div key={row.id} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="flex flex-wrap gap-2">
                <Input
                  defaultValue={row.rep_name}
                  placeholder="Name"
                  onBlur={(e) => updateRow('recruiting_testimonials', row.id, { rep_name: e.target.value })}
                  className="h-9 w-[150px] text-xs"
                />
                <Input
                  defaultValue={row.school || ''}
                  placeholder="School"
                  onBlur={(e) => updateRow('recruiting_testimonials', row.id, { school: e.target.value })}
                  className="h-9 w-[150px] text-xs"
                />
                <Input
                  defaultValue={row.first_summer_figure || ''}
                  placeholder="First summer ($)"
                  onBlur={(e) => updateRow('recruiting_testimonials', row.id, { first_summer_figure: e.target.value })}
                  className="h-9 w-[140px] text-xs"
                />
                <button onClick={() => deleteRow('recruiting_testimonials', row.id)} className="text-muted-foreground hover:text-red-400" aria-label="Delete testimonial">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Input
                defaultValue={row.quote || ''}
                placeholder="One line, in their words"
                onBlur={(e) => updateRow('recruiting_testimonials', row.id, { quote: e.target.value })}
                className="mt-2 h-9 text-xs"
              />
            </div>
          ))}
          {testimonials.length === 0 && <p className="text-xs text-muted-foreground">No cards yet — the section stays hidden.</p>}
        </div>
      </div>

      {/* Parents page */}
      <div className={`${CARD} p-5`}>
        <h3 className="text-sm font-bold text-foreground mb-1">Parents page copy</h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Linked from the recruiting footer. Blank fields fall back to the factual default text.
        </p>
        <div className="space-y-3">
          <div>
            <label className="micro-label mb-1 block" htmlFor="parents_intro">Intro</label>
            <Textarea
              id="parents_intro"
              value={parents.parents_intro || ''}
              onChange={(e) => setParents({ ...parents, parents_intro: e.target.value })}
              className="text-xs"
              rows={2}
            />
          </div>
          {PARENT_SECTIONS.map((sec) => (
            <div key={sec.key}>
              <label className="micro-label mb-1 block" htmlFor={sec.key}>{sec.heading}</label>
              <Textarea
                id={sec.key}
                value={parents[sec.key] || ''}
                placeholder={sec.fallback}
                onChange={(e) => setParents({ ...parents, [sec.key]: e.target.value })}
                className="text-xs"
                rows={3}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save settings & parents copy
      </button>
    </div>
  );
}
