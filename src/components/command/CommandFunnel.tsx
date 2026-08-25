import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check } from "lucide-react";
import { COLORS, Panel, SectionHeader, fontBody, fontDisplay, fontMono } from "./tokens";

type Stage = { key: string; label: string };

const TICKET_STAGES: Stage[] = [
  { key: "submitted", label: "Submitted" },
  { key: "claimed", label: "Claimed" },
  { key: "contacted", label: "Contacted" },
  { key: "booked", label: "Booked" },
  { key: "signed", label: "Signed" },
];

const WINBACK_STAGES: Stage[] = [
  { key: "pooled", label: "Pooled" },
  { key: "claimed", label: "Claimed" },
  { key: "contacted", label: "Contacted" },
  { key: "returning", label: "Returning" },
];

const SOURCE_LABELS: Record<string, string> = {
  ticket: "Ticket",
  manual: "Manual",
  "pipeline-import": "Pipeline import",
  winback: "Win-back",
};

function pct(n: number, base: number): string {
  if (!base) return "0%";
  return `${Math.round((n / base) * 100)}%`;
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
}

const cellHead: React.CSSProperties = {
  color: COLORS.textMuted,
  fontFamily: fontBody,
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  padding: "8px 12px",
  textAlign: "left",
  whiteSpace: "nowrap",
};
const cell: React.CSSProperties = {
  fontFamily: fontMono,
  fontSize: 14,
  padding: "10px 12px",
  borderTop: `1px solid ${COLORS.border}`,
  whiteSpace: "nowrap",
};

function StageBar({ n, base }: { n: number; base: number }) {
  const w = base ? Math.max(0, Math.min(100, (n / base) * 100)) : 0;
  return (
    <div style={{ height: 6, background: "#1C1C20", borderRadius: 999, overflow: "hidden", minWidth: 60 }}>
      <div
        style={{
          width: `${w}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${COLORS.goldDeep}, ${COLORS.gold})`,
        }}
      />
    </div>
  );
}

function SpendEditor({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [v, setV] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setV(value), [value]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
      <span style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 13 }}>$</span>
      <input
        inputMode="decimal"
        value={v}
        placeholder="0"
        onChange={(e) => setV(e.target.value)}
        aria-label="Campaign spend"
        style={{
          width: 110,
          background: "#0B0B0E",
          border: `1px solid ${COLORS.border}`,
          color: COLORS.text,
          fontFamily: fontMono,
          fontSize: 13,
          borderRadius: 8,
          padding: "6px 8px",
        }}
      />
      <button
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          await onSave(v.replace(/[^0-9.]/g, ""));
          setSaving(false);
        }}
        style={{
          background: COLORS.gold,
          color: "#1A1300",
          border: "none",
          borderRadius: 8,
          padding: "6px 12px",
          fontFamily: fontBody,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
    </div>
  );
}

export default function CommandFunnel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: res } = await (supabase as any).rpc("get_command_analytics");
    setData(res || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveSpend = async (v: string) => {
    await (supabase as any)
      .from("app_settings")
      .upsert({ key: "command_campaign_spend", value: v }, { onConflict: "key" });
    await load();
  };

  if (loading) {
    return (
      <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12, marginBottom: 40 }}>
        Loading funnel…
      </div>
    );
  }
  if (!data || data.error) {
    return (
      <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12, marginBottom: 40 }}>
        Funnel unavailable.
      </div>
    );
  }

  const f = data.funnel || {};
  const thisWeek = f.this_week || {};
  const lastWeek = f.last_week || {};
  const allTime = f.all_time || {};
  const wb = data.winback || {};
  const sources: any[] = Array.isArray(data.sources) ? data.sources : [];
  const refCodes: any[] = Array.isArray(data.ref_codes) ? data.ref_codes : [];
  const spendRaw: string | null = data.campaign_spend;
  const spend = spendRaw ? Number(spendRaw) : 0;
  const signedTicket = Number(data.signed_ticket || 0);
  const costPerRecruit = spend > 0 && signedTicket > 0 ? spend / signedTicket : null;

  const deltaOf = (key: string) => (Number(thisWeek[key] || 0) - Number(lastWeek[key] || 0));

  return (
    <>
      {/* ---------- RECRUITING FUNNEL ---------- */}
      <SectionHeader title="Recruiting Funnel" tag="Live" />
      <Panel style={{ padding: 0, marginBottom: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr>
              <th style={cellHead}>Stage</th>
              <th style={{ ...cellHead, textAlign: "right" }}>This week</th>
              <th style={{ ...cellHead, textAlign: "right" }}>%</th>
              <th style={{ ...cellHead, textAlign: "right" }}>Last week</th>
              <th style={{ ...cellHead, textAlign: "right" }}>Δ</th>
              <th style={{ ...cellHead, textAlign: "right" }}>All time</th>
              <th style={cellHead}> </th>
            </tr>
          </thead>
          <tbody>
            {TICKET_STAGES.map((s) => {
              const d = deltaOf(s.key);
              return (
                <tr key={s.key}>
                  <td style={{ ...cell, fontFamily: fontBody }}>{s.label}</td>
                  <td style={{ ...cell, textAlign: "right", color: COLORS.gold }}>{thisWeek[s.key] ?? 0}</td>
                  <td style={{ ...cell, textAlign: "right", color: COLORS.textMuted }}>
                    {pct(Number(thisWeek[s.key] || 0), Number(thisWeek.submitted || 0))}
                  </td>
                  <td style={{ ...cell, textAlign: "right", color: COLORS.textMuted }}>{lastWeek[s.key] ?? 0}</td>
                  <td
                    style={{
                      ...cell,
                      textAlign: "right",
                      color: d > 0 ? COLORS.green : d < 0 ? COLORS.red : COLORS.textMuted,
                    }}
                  >
                    {d > 0 ? `+${d}` : d}
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>{allTime[s.key] ?? 0}</td>
                  <td style={{ ...cell, width: "22%" }}>
                    <StageBar n={Number(allTime[s.key] || 0)} base={Number(allTime.submitted || 0)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <div style={{ color: COLORS.textMuted, fontFamily: fontBody, fontSize: 12, margin: "0 0 40px 4px" }}>
        Weekly columns count leads by the week they were submitted. Excludes win-back leads — all-time column matches the
        admin recruiting panel.
      </div>

      {/* ---------- WIN-BACK FUNNEL ---------- */}
      <SectionHeader title="Win-back Funnel" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 40,
        }}
      >
        {WINBACK_STAGES.map((s) => (
          <Panel key={s.key} style={{ padding: 16 }}>
            <div
              style={{
                color: COLORS.textMuted,
                fontFamily: fontBody,
                fontSize: 11,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              {s.label}
            </div>
            <div style={{ fontFamily: fontMono, fontSize: 26, marginTop: 6 }}>{wb[s.key] ?? 0}</div>
            <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 11, marginTop: 2 }}>
              {pct(Number(wb[s.key] || 0), Number(wb.pooled || 0))} of pool
            </div>
          </Panel>
        ))}
      </div>

      {/* ---------- COST PER RECRUIT ---------- */}
      <SectionHeader title="Cost Per Recruit" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Panel style={{ padding: 20 }}>
          <div
            style={{
              color: COLORS.textMuted,
              fontFamily: fontBody,
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Campaign spend
          </div>
          {spend > 0 ? (
            <>
              <div style={{ fontFamily: fontMono, fontSize: 26, marginTop: 6 }}>{money(spend)}</div>
              <SpendEditor value={spendRaw || ""} onSave={saveSpend} />
            </>
          ) : (
            <>
              <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.gold, marginTop: 8 }}>
                Set your campaign spend (cards, flyers, ads) to see cost per recruit.
              </div>
              <SpendEditor value="" onSave={saveSpend} />
            </>
          )}
        </Panel>

        <Panel style={{ padding: 20 }}>
          <div
            style={{
              color: COLORS.textMuted,
              fontFamily: fontBody,
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Cost per recruit
          </div>
          {costPerRecruit != null ? (
            <>
              <div style={{ fontFamily: fontMono, fontSize: 26, marginTop: 6, color: COLORS.gold }}>
                {money(costPerRecruit)}
              </div>
              <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 11, marginTop: 4 }}>
                {money(spend)} ÷ {signedTicket} signed ticket leads
              </div>
            </>
          ) : (
            <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}>
              {spend > 0
                ? "No signed ticket leads yet — cost per recruit appears after the first sign."
                : "Waiting on campaign spend."}
            </div>
          )}
        </Panel>

        <Panel style={{ padding: 20 }}>
          <div
            style={{
              color: COLORS.textMuted,
              fontFamily: fontBody,
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            Signs per ref code
          </div>
          {refCodes.length === 0 ? (
            <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.textMuted, marginTop: 8 }}>
              No signed ticket leads yet.
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {refCodes.map((r) => (
                <div
                  key={r.ref_code}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: fontMono,
                    fontSize: 13,
                    padding: "4px 0",
                  }}
                >
                  <span style={{ color: COLORS.textMuted }}>{r.ref_code}</span>
                  <span>{r.signed}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div style={{ height: 24 }} />

      {/* ---------- SOURCE QUALITY ---------- */}
      <SectionHeader title="Source Quality" />
      <Panel style={{ padding: 0, marginBottom: 40, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
          <thead>
            <tr>
              <th style={cellHead}>Source</th>
              <th style={{ ...cellHead, textAlign: "right" }}>Leads</th>
              <th style={{ ...cellHead, textAlign: "right" }}>Signed</th>
              <th style={{ ...cellHead, textAlign: "right" }}>Conversion</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ ...cell, color: COLORS.textMuted, fontFamily: fontBody }}>
                  No leads yet.
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr key={s.source}>
                  <td style={{ ...cell, fontFamily: fontBody }}>{SOURCE_LABELS[s.source] || s.source}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{s.leads}</td>
                  <td style={{ ...cell, textAlign: "right", color: COLORS.gold }}>{s.signed}</td>
                  <td style={{ ...cell, textAlign: "right", color: COLORS.textMuted }}>
                    {pct(Number(s.signed || 0), Number(s.leads || 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
      <div style={{ display: "none", fontFamily: fontDisplay }} />
    </>
  );
}
