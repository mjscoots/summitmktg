import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Loader2, Printer } from 'lucide-react';

const COLORS = {
  panel: '#121215',
  border: '#262629',
  gold: '#E3C275',
  text: '#EDEDEE',
  textMuted: '#8A8A92',
};

const fontDisplay = `'Space Grotesk', system-ui, sans-serif`;
const fontMono = `'JetBrains Mono', ui-monospace, monospace`;

interface Bucket { label: string; count: number }

interface Prep {
  since: string;
  new_reps: { full_name: string | null; created_at: string }[];
  departed: {
    full_name: string | null;
    departure_type: string | null;
    departure_reason: string | null;
    last_day_worked: string | null;
    revenue_to_date: number | null;
  }[];
  active_by_office: Bucket[];
  active_by_vertical: Bucket[];
  funnel: Record<string, number>;
  resigns: Bucket[];
  commitment_coverage: { done: number; active: number; no_committed_date: number };
  winback: { contacted: number; returning: number };
  attendance: { marked?: number; present?: number; rate?: number };
  my_action_items: { title: string; due_date: string | null }[];
  revenue: { total: number; goal: number | null } | null;
}

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? '' : `$${Math.round(Number(v)).toLocaleString()}`;

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function SessionPrep() {
  const [since, setSince] = useState(isoDaysAgo(30));
  const [prep, setPrep] = useState<Prep | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any).rpc('get_session_prep', { _since: since });
      if (cancelled) return;
      if (error) toast.error('Could not load the prep sheet');
      setPrep((data as Prep) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [since]);

  const asText = () => {
    if (!prep) return '';
    const L: string[] = [];
    L.push(`SESSION PREP — since ${prep.since}`);
    L.push('');
    L.push(`New reps (${prep.new_reps.length}): ${prep.new_reps.map((r) => r.full_name).join(', ') || 'No data yet'}`);
    L.push(
      `Departed (${prep.departed.length}): ${
        prep.departed
          .map((d) => `${d.full_name} — ${d.departure_type || 'Unknown'}${d.departure_reason ? ` (${d.departure_reason})` : ''}`)
          .join('; ') || 'No data yet'
      }`
    );
    L.push('');
    L.push(`Active by office: ${prep.active_by_office.map((b) => `${b.label} ${b.count}`).join(', ') || 'No data yet'}`);
    L.push(`Active by vertical: ${prep.active_by_vertical.map((b) => `${b.label} ${b.count}`).join(', ') || 'No data yet'}`);
    L.push('');
    L.push(
      `Funnel: ever on roster ${prep.funnel.ever_on_roster}, active ${prep.funnel.active}, departed ${prep.funnel.departed} (quit ${prep.funnel.quit}, fired ${prep.funnel.fired}, home early ${prep.funnel.home_early}, unknown ${prep.funnel.unknown})`
    );
    L.push(
      `Revenue: ${prep.revenue ? `${money(prep.revenue.total)}${prep.revenue.goal ? ` of ${money(prep.revenue.goal)} goal` : ''}` : 'No data yet'}`
    );
    L.push(`Re-signs: ${prep.resigns.map((b) => `${b.label} ${b.count}`).join(', ') || 'No data yet'}`);
    L.push(
      `Commitment interviews: ${prep.commitment_coverage.done} of ${prep.commitment_coverage.active} active; ${prep.commitment_coverage.no_committed_date} with no committed date`
    );
    L.push(`Win-back: ${prep.winback.contacted} contacted since ${prep.since}, ${prep.winback.returning} returning`);
    L.push(
      `Attendance: ${prep.attendance?.marked ? `${prep.attendance.rate}% present across ${prep.attendance.marked} marks` : 'No data yet'}`
    );
    L.push(
      `My open action items: ${prep.my_action_items.map((a) => `${a.title}${a.due_date ? ` (due ${a.due_date})` : ''}`).join('; ') || 'No data yet'}`
    );
    return L.join('\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      toast.success('Prep sheet copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginTop: 18 }}>
      <p style={{ color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
        {title}
      </p>
      <div style={{ color: COLORS.text, fontSize: 13 }}>{children}</div>
    </div>
  );

  const Empty = () => <span style={{ color: COLORS.textMuted }}>No data yet</span>;

  return (
    <div className="session-prep" style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .session-prep, .session-prep * { visibility: visible; }
          .session-prep { position: absolute; left: 0; top: 0; width: 100%; background: #fff; color: #000; border: none; }
          .session-prep .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: fontMono }}>Since</label>
        <input
          type="date"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          style={{
            background: '#09090B',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.text,
            padding: '6px 10px',
            fontFamily: fontMono,
            fontSize: 13,
          }}
        />
        <button
          onClick={copy}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.text,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Copy className="h-3.5 w-3.5" /> Copy as text
        </button>
        <button
          onClick={() => window.print()}
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            color: COLORS.text,
            padding: '6px 12px',
            fontSize: 12,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </div>

      {loading ? (
        <p style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 16, fontFamily: fontMono }}>
          <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Building the sheet…
        </p>
      ) : !prep ? (
        <p style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 16 }}>No data yet</p>
      ) : (
        <>
          <p style={{ fontFamily: fontDisplay, fontSize: 20, color: COLORS.gold, marginTop: 14 }}>
            Session Prep — since {prep.since}
          </p>

          <Section title={`New reps (${prep.new_reps.length})`}>
            {prep.new_reps.length === 0 ? <Empty /> : prep.new_reps.map((r) => r.full_name).join(', ')}
          </Section>

          <Section title={`Departed (${prep.departed.length})`}>
            {prep.departed.length === 0 ? (
              <Empty />
            ) : (
              prep.departed.map((d, i) => (
                <div key={i} style={{ borderTop: `1px solid ${COLORS.border}`, padding: '4px 0' }}>
                  {d.full_name} — {d.departure_type || 'Unknown'}
                  {d.departure_reason ? ` · ${d.departure_reason}` : ''}
                  {d.last_day_worked ? ` · last day ${d.last_day_worked}` : ''}
                  {d.revenue_to_date != null ? ` · ${money(d.revenue_to_date)}` : ''}
                </div>
              ))
            )}
          </Section>

          <Section title="Active headcount">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <p style={{ color: COLORS.textMuted, fontSize: 12 }}>By office</p>
                {prep.active_by_office.length === 0 ? (
                  <Empty />
                ) : (
                  prep.active_by_office.map((b) => (
                    <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{b.label}</span>
                      <span style={{ fontFamily: fontMono }}>{b.count}</span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <p style={{ color: COLORS.textMuted, fontSize: 12 }}>By vertical</p>
                {prep.active_by_vertical.length === 0 ? (
                  <Empty />
                ) : (
                  prep.active_by_vertical.map((b) => (
                    <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{b.label}</span>
                      <span style={{ fontFamily: fontMono }}>{b.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Section>

          <Section title="Season funnel">
            <span style={{ fontFamily: fontMono }}>
              ever on roster {prep.funnel.ever_on_roster} · active {prep.funnel.active} · departed {prep.funnel.departed}{' '}
              (quit {prep.funnel.quit}, fired {prep.funnel.fired}, home early {prep.funnel.home_early}, unknown{' '}
              {prep.funnel.unknown})
            </span>
          </Section>

          <Section title="Revenue">
            {!prep.revenue ? (
              <Empty />
            ) : (
              <span style={{ fontFamily: fontMono }}>
                {money(prep.revenue.total)}
                {prep.revenue.goal ? ` of ${money(prep.revenue.goal)} goal` : ' · no goal set'}
              </span>
            )}
          </Section>

          <Section title="Re-signs">
            {prep.resigns.length === 0 ? (
              <Empty />
            ) : (
              prep.resigns.map((b) => (
                <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{b.label}</span>
                  <span style={{ fontFamily: fontMono }}>{b.count}</span>
                </div>
              ))
            )}
          </Section>

          <Section title="Commitment interviews">
            <span style={{ fontFamily: fontMono }}>
              {prep.commitment_coverage.done} of {prep.commitment_coverage.active} active ·{' '}
              {prep.commitment_coverage.no_committed_date} with no committed date
            </span>
          </Section>

          <Section title="Win-back">
            <span style={{ fontFamily: fontMono }}>
              {prep.winback.contacted} contacted since {prep.since} · {prep.winback.returning} returning
            </span>
          </Section>

          <Section title="Meeting attendance">
            {!prep.attendance?.marked ? (
              <Empty />
            ) : (
              <span style={{ fontFamily: fontMono }}>
                {prep.attendance.rate}% present across {prep.attendance.marked} marks
              </span>
            )}
          </Section>

          <Section title={`My open action items (${prep.my_action_items.length})`}>
            {prep.my_action_items.length === 0 ? (
              <Empty />
            ) : (
              prep.my_action_items.map((a, i) => (
                <div key={i} style={{ borderTop: `1px solid ${COLORS.border}`, padding: '4px 0' }}>
                  {a.title}
                  {a.due_date ? ` · due ${a.due_date}` : ''}
                </div>
              ))
            )}
          </Section>
        </>
      )}
    </div>
  );
}
