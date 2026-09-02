import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Download, Loader2, Printer } from 'lucide-react';
import { departureLabel } from '@/components/admin/DepartureIntakeDialog';

const COLORS = {
  panel: '#121215',
  border: '#262629',
  gold: '#E3C275',
  text: '#EDEDEE',
  textMuted: '#8A8A92',
};

const fontDisplay = `'Montserrat', system-ui, sans-serif`;
const fontMono = `'JetBrains Mono', ui-monospace, monospace`;

interface Bucket { label: string; count: number }

interface SheetRow {
  user_id: string;
  full_name: string;
  office: string | null;
  team: string | null;
  manager: string | null;
  rep_year: string | null;
  recruited_by: string | null;
  vertical: string | null;
  runs_vertical: boolean | null;
  status: string | null;
  status_detail: string | null;
  archived: boolean | null;
  departure_type: string | null;
  departure_reason: string | null;
  last_day_worked: string | null;
  revenue_to_date: number | null;
  committed_last_day?: string | null;
  next_year_status?: string | null;
  showed_up_date?: string | null;
  revenue_total?: number | null;
  months_active?: number | null;
  last_revenue_month?: string | null;
  re_signed?: boolean | string | null;
}

interface FunnelLine {
  label: string;
  recruited: number;
  showed_up: number;
  still_here: number;
  fell_off: number;
  fired: number;
  quit: number;
  home_early: number;
  unknown: number;
}

interface Sheet {
  season: { starts_on: string; ends_on: string } | null;
  totals: {
    active: number;
    departed: number;
    by_office: Bucket[];
    by_vertical: Bucket[];
    by_rep_year: Bucket[];
  };
  funnel: {
    ever_on_roster: number;
    recruited?: number;
    showed_up: number;
    still_active: number;
    departed: number;
    quit: number;
    fired: number;
    home_early: number;
    unknown: number;
  };
  funnel_by_office?: FunnelLine[];
  funnel_by_leader?: FunnelLine[];
  rows: SheetRow[];
}


const blank = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s === '' ? '' : s;
};

const money = (v: number | null | undefined): string =>
  v === null || v === undefined ? '' : `$${Number(v).toLocaleString()}`;

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function RegionSheet() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officeFilter, setOfficeFilter] = useState('all');
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: err } = await (supabase as any).rpc('get_region_sheet');
      if (cancelled) return;
      if (err) {
        console.error(err);
        setError('Could not load the region sheet.');
      } else {
        setSheet(data as Sheet);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const hasReSigned = useMemo(
    () => !!sheet?.rows.some(r => r.re_signed !== undefined),
    [sheet]
  );

  const rows = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.filter(r => {
      if (officeFilter !== 'all' && blank(r.office) !== officeFilter) return false;
      if (verticalFilter !== 'all' && blank(r.vertical) !== verticalFilter) return false;
      return true;
    });
  }, [sheet, officeFilter, verticalFilter]);

  const officeOptions = useMemo(
    () => Array.from(new Set((sheet?.rows ?? []).map(r => blank(r.office)).filter(Boolean))).sort(),
    [sheet]
  );
  const verticalOptions = useMemo(
    () => Array.from(new Set((sheet?.rows ?? []).map(r => blank(r.vertical)).filter(Boolean))).sort(),
    [sheet]
  );

  const funnelText = () => {
    const f0 = sheet?.funnel;
    const line = (l: FunnelLine | null, name: string) =>
      l
        ? `${name}: recruited ${l.recruited} → showed up ${l.showed_up} → still here ${l.still_here} → fell off ${l.fell_off} (fired ${l.fired}, quit ${l.quit}, unknown ${l.unknown})`
        : `${name}: no data yet`;
    const out: string[] = [];
    if (f0) {
      out.push(
        `Whole region: recruited ${f0.recruited ?? f0.ever_on_roster} → showed up ${f0.showed_up} → still here ${f0.still_active} → fell off ${f0.departed} (fired ${f0.fired}, quit ${f0.quit}, unknown ${f0.unknown})`
      );
    }
    out.push('', 'By office:');
    (sheet?.funnel_by_office ?? []).forEach(l => out.push(line(l, l.label || '-')));
    out.push('', 'By leader:');
    (sheet?.funnel_by_leader ?? []).forEach(l => out.push(line(l, l.label || '-')));
    out.push('', 'Production for every name:');
    rows.forEach(r => {
      out.push(
        `${blank(r.full_name) || '-'} · ${r.archived ? 'departed' : 'still here'} · revenue ${
          r.revenue_total ? money(r.revenue_total) : 'no data yet'
        } · months ${r.months_active ?? 0} · last revenue month ${blank(r.last_revenue_month) || 'no data yet'}`
      );
    });
    return out.join('\n');
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(funnelText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      'Name', 'Office', 'Team', 'Manager', 'Rep year', 'Recruited by', 'Vertical',
      'Status', 'Last day worked', 'Revenue total', 'Months active', 'Last revenue month', 'Revenue on file',
      ...(hasReSigned ? ['Re-signed'] : []),
    ];
    const lines = [headers.join(',')];
    for (const r of rows) {
      const cells = [
        blank(r.full_name),
        blank(r.office),
        blank(r.team),
        blank(r.manager),
        blank(r.rep_year),
        blank(r.recruited_by),
        blank(r.vertical),
        r.archived ? 'Departed' : blank(r.status),
        blank(r.last_day_worked),
        r.revenue_total === null || r.revenue_total === undefined ? '' : String(r.revenue_total),
        r.months_active === null || r.months_active === undefined ? '' : String(r.months_active),
        blank(r.last_revenue_month),
        r.revenue_to_date === null || r.revenue_to_date === undefined ? '' : String(r.revenue_to_date),
        ...(hasReSigned ? [blank(r.re_signed)] : []),
      ];
      lines.push(cells.map(csvEscape).join(','));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `region-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12, padding: '12px 0 40px' }}>
        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
        Loading region sheet…
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12, paddingBottom: 40 }}>
        {error || 'No data.'}
      </div>
    );
  }

  const f = sheet.funnel;

  return (
    <div className="region-sheet" style={{ marginBottom: 40 }}>
      <style>{`
        .region-sheet table { border-collapse: collapse; width: 100%; }
        .region-sheet th, .region-sheet td {
          text-align: left; padding: 8px 10px; white-space: nowrap;
          border-bottom: 1px solid ${COLORS.border}; font-size: 12px;
        }
        .region-sheet th {
          position: sticky; top: 0; background: ${COLORS.panel}; z-index: 1;
          color: ${COLORS.textMuted}; text-transform: uppercase;
          letter-spacing: 0.6px; font-size: 10px; font-weight: 600;
        }
        .region-sheet td { color: ${COLORS.text}; font-variant-numeric: tabular-nums; }
        @media print {
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .region-sheet, .region-sheet * { visibility: visible !important; }
          .region-sheet { position: absolute; inset: 0; margin: 0; color: #000; }
          .region-sheet .no-print { display: none !important; }
          .region-sheet th, .region-sheet td {
            color: #000 !important; border-bottom: 1px solid #ccc !important; white-space: normal;
          }
          .region-sheet th { background: #fff !important; }
          .region-sheet .panel { background: #fff !important; border: 1px solid #ccc !important; }
          .region-sheet .panel * { color: #000 !important; }
        }
      `}</style>

      {/* Controls */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <select
          value={officeFilter}
          onChange={e => setOfficeFilter(e.target.value)}
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, padding: '6px 10px', fontSize: 12 }}
        >
          <option value="all">All offices</option>
          {officeOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={verticalFilter}
          onChange={e => setVerticalFilter(e.target.value)}
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, padding: '6px 10px', fontSize: 12 }}
        >
          <option value="all">All verticals</option>
          {verticalOptions.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={copyText}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy as text'}
          </button>
          <button
            onClick={exportCsv}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
        <Panel title="Headcount">
          <Line label="Active reps" value={sheet.totals.active} />
          <Line label="Departed" value={sheet.totals.departed} />
        </Panel>
        <Panel title="By office">
          {sheet.totals.by_office.length === 0
            ? <Empty />
            : sheet.totals.by_office.map(b => (
                <Line key={b.label || 'blank'} label={b.label || '-'} value={b.count} />
              ))}
        </Panel>
        <Panel title="By vertical">
          {sheet.totals.by_vertical.length === 0
            ? <Empty />
            : sheet.totals.by_vertical.map(b => (
                <Line key={b.label || 'blank'} label={b.label || '-'} value={b.count} />
              ))}
        </Panel>
        <Panel title="By rep year">
          {sheet.totals.by_rep_year.length === 0
            ? <Empty />
            : sheet.totals.by_rep_year.map(b => (
                <Line key={b.label || 'blank'} label={b.label || '-'} value={b.count} />
              ))}
        </Panel>
      </div>

      {/* Season funnel */}
      <Panel title={sheet.season ? `Season funnel · ${sheet.season.starts_on} → ${sheet.season.ends_on}` : 'Season funnel'}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <Stat label="Ever on roster" value={f.ever_on_roster} />
          <Stat label="Showed up" value={f.showed_up} />
          <Stat label="Still active" value={f.still_active} />
          <Stat label="Departed" value={f.departed} />
          <Stat label="Quit" value={f.quit} />
          <Stat label="Fired" value={f.fired} />
          <Stat label="Home early" value={f.home_early} />
          <Stat label="Unknown" value={f.unknown} />
        </div>
      </Panel>

      {/* Funnel by office / leader */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 16 }}>
        <Panel title="Funnel by office">
          <FunnelTable lines={sheet.funnel_by_office ?? []} />
        </Panel>
        <Panel title="Funnel by leader">
          <FunnelTable lines={sheet.funnel_by_leader ?? []} />
        </Panel>
      </div>


      {/* Roster table */}
      <div
        className="panel"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 16, marginTop: 16, overflow: 'auto', maxHeight: '70vh' }}
      >
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Office</th>
              <th>Team</th>
              <th>Manager</th>
              <th>Rep year</th>
              <th>Recruited by</th>
              <th>Vertical</th>
              <th>Status</th>
              <th>Last day</th>
              <th>Revenue total</th>
              <th>Months</th>
              <th>Last revenue month</th>
              <th>Revenue on file</th>
              {hasReSigned && <th>Re-signed</th>}

            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.user_id}>
                <td style={{ fontWeight: 500 }}>
                  {blank(r.full_name)}
                  {r.runs_vertical && (
                    <span style={{ marginLeft: 6, color: COLORS.gold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>
                      runs
                    </span>
                  )}
                </td>
                <td>{blank(r.office)}</td>
                <td>{blank(r.team)}</td>
                <td>{blank(r.manager)}</td>
                <td>{blank(r.rep_year)}</td>
                <td>{blank(r.recruited_by)}</td>
                <td>{blank(r.vertical)}</td>
                <td style={{ color: r.archived ? COLORS.textMuted : COLORS.text }}>
                  {r.archived ? 'Departed' : blank(r.status_detail) || blank(r.status)}
                </td>
                <td>{blank(r.last_day_worked)}</td>
                <td>{r.revenue_total ? money(r.revenue_total) : '-'}</td>
                <td>{r.months_active ?? 0}</td>
                <td>{blank(r.last_revenue_month)}</td>
                <td>{money(r.revenue_to_date)}</td>
                {hasReSigned && <td>{blank(r.re_signed)}</td>}

              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: 24, color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12 }}>
            No people match those filters.
          </div>
        )}
      </div>
      <div className="no-print" style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 11, marginTop: 8 }}>
        {rows.length} {rows.length === 1 ? 'person' : 'people'} · active first, then departed
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="panel"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}
    >
      <div style={{ fontFamily: fontDisplay, fontSize: 13, color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0' }}>
      <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{label}</span>
      <span style={{ color: COLORS.text, fontFamily: fontMono, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ color: COLORS.text, fontFamily: fontMono, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function Empty() {
  return <div style={{ color: COLORS.textMuted, fontSize: 12 }}>-</div>;
}

function FunnelTable({ lines }: { lines: FunnelLine[] }) {
  if (lines.length === 0) {
    return <div style={{ color: COLORS.textMuted, fontSize: 12 }}>No data yet.</div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Recruited</th>
            <th>Showed up</th>
            <th>Still here</th>
            <th>Fell off</th>
            <th>Fired</th>
            <th>Quit</th>
            <th>Unknown</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(l => (
            <tr key={l.label || 'blank'}>
              <td style={{ fontWeight: 500 }}>{l.label || '-'}</td>
              <td>{l.recruited}</td>
              <td>{l.showed_up}</td>
              <td>{l.still_here}</td>
              <td>{l.fell_off}</td>
              <td>{l.fired}</td>
              <td>{l.quit}</td>
              <td>{l.unknown}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
