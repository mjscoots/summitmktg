import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { COLORS, Panel, SectionHeader, fontBody, fontMono } from "./tokens";

type Report = { week_ending: string; payload: any; generated_at?: string };

const STAGES = [
  { key: "submitted", label: "Submitted" },
  { key: "claimed", label: "Claimed" },
  { key: "contacted", label: "Contacted" },
  { key: "booked", label: "Booked" },
  { key: "signed", label: "Signed" },
];

function delta(a: number, b: number) {
  const d = (a || 0) - (b || 0);
  return { d, txt: d === 0 ? "±0" : d > 0 ? `+${d}` : `${d}` };
}

function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ padding: "14px 16px", border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
      <div
        style={{
          color: COLORS.textMuted,
          fontFamily: fontBody,
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: fontMono, fontSize: 24, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ color: COLORS.textMuted, fontFamily: fontBody, fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function WeeklyReportSection() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Idempotent: generates the latest report if the Sunday cutoff has passed,
      // and emails the owner once (server-side guard prevents duplicates).
      try {
        await supabase.functions.invoke("weekly-owner-report");
      } catch {
        /* report still renders from stored history */
      }
      const { data } = await (supabase as any)
        .from("weekly_reports")
        .select("week_ending, payload, generated_at")
        .order("week_ending", { ascending: false })
        .limit(26);
      if (!alive) return;
      const rows: Report[] = data || [];
      setReports(rows);
      setSelected(rows[0]?.week_ending || "");
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const report = reports.find((r) => r.week_ending === selected);
  const p = report?.payload || {};
  const f = p.funnel || {};
  const pf = p.prev_funnel || {};
  const wb = p.winback || {};
  const risk: any[] = Array.isArray(p.risk) ? p.risk : [];

  return (
    <>
      <SectionHeader title="Weekly Report" tag="Auto" />

      {loading ? (
        <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12, marginBottom: 40 }}>
          Loading report…
        </div>
      ) : reports.length === 0 ? (
        <Panel style={{ padding: 20, marginBottom: 40 }}>
          <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.textMuted }}>
            No weekly reports yet. The first one generates automatically after Sunday 6:00 PM ET.
          </div>
        </Panel>
      ) : (
        <Panel style={{ padding: 20, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            <label
              htmlFor="week-select"
              style={{ color: COLORS.textMuted, fontFamily: fontBody, fontSize: 12, textTransform: "uppercase" }}
            >
              Week ending
            </label>
            <select
              id="week-select"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{
                background: "#0B0B0E",
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                fontFamily: fontMono,
                fontSize: 13,
                borderRadius: 8,
                padding: "6px 10px",
                maxWidth: "100%",
              }}
            >
              {reports.map((r) => (
                <option key={r.week_ending} value={r.week_ending}>
                  {r.week_ending}
                </option>
              ))}
            </select>
            {p.emailed_at && (
              <span style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 11 }}>
                emailed {new Date(p.emailed_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 22,
            }}
          >
            <Metric label="Signs" value={p.signs ?? 0} />
            <Metric label="Returning" value={p.returning ?? 0} />
            <Metric label="Win-back calls" value={wb.calls ?? 0} sub={`${wb.callers ?? 0} reps calling`} />
            <Metric label="Open requests queue" value={p.queue_open ?? 0} />
          </div>

          <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            Funnel deltas vs prior week
          </div>
          <div style={{ overflowX: "auto", marginBottom: 22 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
              <tbody>
                {STAGES.map((s) => {
                  const { d, txt } = delta(Number(f[s.key] || 0), Number(pf[s.key] || 0));
                  return (
                    <tr key={s.key}>
                      <td
                        style={{
                          fontFamily: fontBody,
                          fontSize: 14,
                          padding: "8px 0",
                          borderTop: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {s.label}
                      </td>
                      <td
                        style={{
                          fontFamily: fontMono,
                          fontSize: 14,
                          padding: "8px 0",
                          textAlign: "right",
                          borderTop: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {f[s.key] ?? 0}
                      </td>
                      <td
                        style={{
                          fontFamily: fontMono,
                          fontSize: 13,
                          padding: "8px 0 8px 16px",
                          textAlign: "right",
                          width: 70,
                          color: d > 0 ? COLORS.green : d < 0 ? COLORS.red : COLORS.textMuted,
                          borderTop: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {txt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            Rep risk list · no activity 5+ days
          </div>
          {risk.length === 0 ? (
            <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.textMuted }}>Nobody flagged.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {risk.map((r, i) => (
                <span
                  key={`${r.name}-${i}`}
                  style={{
                    fontFamily: fontMono,
                    fontSize: 12,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 999,
                    padding: "4px 10px",
                    color: COLORS.text,
                  }}
                >
                  {r.name}
                  <span style={{ color: COLORS.textMuted }}>
                    {" "}
                    · {r.days == null ? "never" : `${r.days}d`}
                  </span>
                </span>
              ))}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
