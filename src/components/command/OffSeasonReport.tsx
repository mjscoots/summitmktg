import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { money } from '@/hooks/useLeads';

interface Report {
  totals: { leads: number; with_phone: number; designated: number; free: number };
  funnel: { stage: string; people: number; revenue: number }[];
  not_signed: {
    id: string;
    full_name: string;
    season_revenue: number | null;
    former_manager_name: string | null;
    roster_status: string | null;
    phone: string | null;
    stage: string | null;
  }[];
  not_signed_revenue: number;
  managers: {
    user_id: string;
    name: string;
    calls_week: number;
    callbacks_due: number;
    signed: number;
    designated: number;
  }[];
  tags: Record<string, number>;
}

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  padding: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  opacity: 0.6,
};

/** Owner and admin view of the off-season: who is left, what they were worth, who is calling. */
export default function OffSeasonReport() {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase.rpc as any)('get_off_season_report').then(({ data: raw }: { data: Report | null }) => {
      setData(raw);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader2 className="animate-spin" size={16} />;
  if (!data) return <p style={{ fontSize: 13, opacity: 0.7 }}>No off-season data available.</p>;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          ['Leads', data.totals.leads],
          ['With phone', data.totals.with_phone],
          ['Designated', data.totals.designated],
          ['Free', data.totals.free],
        ].map(([label, value]) => (
          <div key={label as string} style={cardStyle}>
            <div style={labelStyle}>{label}</div>
            <div style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>{value as number}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Funnel</div>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ opacity: 0.6 }}>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>Stage</th>
              <th style={{ textAlign: 'right' }}>People</th>
              <th style={{ textAlign: 'right' }}>Last season revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.funnel.map((f) => (
              <tr key={f.stage}>
                <td style={{ padding: '4px 0' }}>{f.stage.replace('_', ' ')}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{f.people}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(f.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>
          Not signed back — {data.not_signed.length} people, {money(data.not_signed_revenue)} last season
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              {data.not_signed.slice(0, 100).map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '4px 0' }}>{p.full_name}</td>
                  <td style={{ opacity: 0.65 }}>{p.former_manager_name || '—'}</td>
                  <td style={{ opacity: 0.65 }}>{p.stage || 'new'}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(p.season_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Manager scoreboard</div>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ opacity: 0.6 }}>
              <th style={{ textAlign: 'left', padding: '4px 0' }}>Manager</th>
              <th style={{ textAlign: 'right' }}>Designated</th>
              <th style={{ textAlign: 'right' }}>Calls this week</th>
              <th style={{ textAlign: 'right' }}>Callbacks due</th>
              <th style={{ textAlign: 'right' }}>Signed</th>
            </tr>
          </thead>
          <tbody>
            {data.managers.map((m) => (
              <tr key={m.user_id}>
                <td style={{ padding: '4px 0' }}>{m.name}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.designated}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.calls_week}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.callbacks_due}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.signed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Object.keys(data.tags).length > 0 && (
        <div style={cardStyle}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
            {Object.entries(data.tags).map(([t, c]) => (
              <span key={t} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '2px 10px' }}>
                {t} {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
