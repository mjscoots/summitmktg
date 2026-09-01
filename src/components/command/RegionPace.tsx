import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Pencil, Check } from 'lucide-react';

const COLORS = {
  panel: '#121215',
  border: '#262629',
  gold: '#E3C275',
  text: '#EDEDEE',
  textMuted: '#8A8A92',
};

const fontDisplay = `'Montserrat', system-ui, sans-serif`;
const fontMono = `'JetBrains Mono', ui-monospace, monospace`;

interface Split {
  label: string;
  total: number;
}

interface Pace {
  has_data: boolean;
  total?: number;
  goal?: number | null;
  months_recorded?: number;
  monthly_average?: number;
  projection?: number;
  first_month?: string;
  last_month?: string;
  by_office?: Split[];
  by_vertical?: Split[];
}

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `$${Math.round(Number(v)).toLocaleString()}`;

export default function RegionPace() {
  const [pace, setPace] = useState<Pace | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalDraft, setGoalDraft] = useState('');
  const [goalNote, setGoalNote] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any).rpc('get_region_pace');
    setPace((data as Pace) ?? { has_data: false });
    setGoalDraft(data?.goal != null ? String(data.goal) : '');
    const { data: note } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'season_revenue_goal_note')
      .maybeSingle();
    const value = (note?.value ?? '').trim();
    setGoalNote(value === '' ? null : value);
    setLoading(false);
  };


  useEffect(() => {
    load();
  }, []);

  const saveGoal = async () => {
    setSaving(true);
    const clean = goalDraft.replace(/[$,\s]/g, '');
    await supabase.from('app_settings').upsert(
      { key: 'season_revenue_goal', value: clean },
      { onConflict: 'key' }
    );
    setSaving(false);
    setEditing(false);
    load();
  };

  if (loading) {
    return (
      <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12 }}>
        <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Loading revenue…
      </div>
    );
  }

  if (!pace?.has_data) {
    return (
      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 20,
          color: COLORS.textMuted,
          fontSize: 13,
        }}
      >
        No revenue entered yet. Add months in Pillar → Money → Monthly revenue and this fills in.
      </div>
    );
  }

  const goal = pace.goal ?? null;
  const pct = goal && goal > 0 ? Math.min(100, (Number(pace.total) / goal) * 100) : null;

  const Splits = ({ title, rows }: { title: string; rows: Split[] }) =>
    rows.length === 0 ? null : (
      <div>
        <p style={{ color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          {title}
        </p>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              borderTop: `1px solid ${COLORS.border}`,
              fontSize: 13,
              color: COLORS.text,
            }}
          >
            <span>{r.label}</span>
            <span style={{ fontFamily: fontMono }}>{money(r.total)}</span>
          </div>
        ))}
      </div>
    );

  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: fontDisplay, fontSize: 30, color: COLORS.gold }}>{money(pace.total)}</span>
        <span style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: fontMono }}>
          season revenue · {pace.months_recorded} {pace.months_recorded === 1 ? 'month' : 'months'} recorded
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {editing ? (
            <>
              <input
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="9000000"
                style={{
                  background: '#09090B',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  color: COLORS.text,
                  padding: '6px 10px',
                  fontFamily: fontMono,
                  fontSize: 13,
                  width: 130,
                }}
              />
              <button
                onClick={saveGoal}
                disabled={saving}
                style={{ color: COLORS.gold, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{
                color: COLORS.textMuted,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: fontMono,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Goal {goal ? money(goal) : 'not set'} <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>


      {goalNote && (
        <p style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: fontMono, marginTop: 8 }}>
          {goalNote}
        </p>
      )}


      {pct !== null && (
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 8, background: '#1B1B1F', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: COLORS.gold }} />
          </div>
          <p style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: fontMono, marginTop: 6 }}>
            {pct.toFixed(1)}% of goal
          </p>
        </div>
      )}

      <p style={{ color: COLORS.text, fontSize: 13, marginTop: 14 }}>
        At the current monthly average of {money(pace.monthly_average)}, one more month lands near{' '}
        {money(pace.projection)}.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginTop: 18 }}>
        <Splits title="By office" rows={pace.by_office ?? []} />
        <Splits title="By vertical" rows={pace.by_vertical ?? []} />
      </div>
    </div>
  );
}
