import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { COLORS, Panel, SectionHeader, fontBody, fontMono } from "./tokens";

type Week = {
  signed_total: number;
  signed_recent: number;
  calls: number;
  calls_people: number;
  apps_waiting: number;
  apps_oldest_hours: number;
  referrals_total: number;
  referrals_claimed: number;
  training_minutes: number;
  training_reps: number;
  active_reps: number;
  dark_30: number;
  fiber_loaded_at: string | null;
  pest_loaded_at: string | null;
};


function fmtDate(v: string | null): string | null {
  if (!v) return null;
  return new Date(v).toLocaleDateString();
}

function Line({
  label,
  value,
  sub,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        width: "100%",
        minHeight: 64,
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 16px",
        background: "transparent",
        border: "none",
        borderTop: `1px solid ${COLORS.border}`,
        color: COLORS.text,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            color: COLORS.textMuted,
            fontFamily: fontBody,
            fontSize: 11,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span style={{ display: "block", fontFamily: fontMono, fontSize: 22, marginTop: 4 }}>{value}</span>
      </span>
      <span
        style={{
          color: COLORS.textMuted,
          fontFamily: fontBody,
          fontSize: 13,
          textAlign: "right",
          maxWidth: "55%",
        }}
      >
        {sub}
      </span>
    </button>
  );
}

/** The week: six live lines that answer how the business is doing, owner and admin only. */
export default function OwnerWeekSection() {
  const navigate = useNavigate();
  const [w, setW] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (supabase.rpc as any)("owner_week").then(({ data }: any) => {
      if (!alive) return;
      setW((data as Week) || null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const fiber = fmtDate(w?.fiber_loaded_at ?? null);
  const pest = fmtDate(w?.pest_loaded_at ?? null);

  return (
    <>
      <SectionHeader title="The week" tag="Live" />
      <Panel style={{ padding: "6px 4px 10px", marginBottom: 40 }}>
        {loading || !w ? (
          <div style={{ padding: 16, color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12 }}>Loading…</div>
        ) : (
          <div>
            <Line
              label="Signed for 2027"
              value={String(w.signed_total)}
              sub={`${w.signed_recent} in the last 7 days`}
              onClick={() => navigate("/app/leads")}
            />
            <Line
              label="Re-sign calls"
              value={String(w.calls)}
              sub={
                w.calls === 0
                  ? "Outcomes logged on lead cards show up here"
                  : `${w.calls_people} people touched · last 7 days`
              }
              onClick={() => navigate("/app/leads")}
            />
            <Line
              label="Applications"
              value={String(w.apps_waiting)}
              sub={w.apps_waiting === 0 ? "Nothing waiting" : `oldest ${w.apps_oldest_hours}h`}
              onClick={() => navigate("/admin/requests")}
            />
            <Line
              label="Referrals"
              value={String(w.referrals_total)}
              sub={
                w.referrals_total === 0
                  ? "Reps naming three people fills this"
                  : `${w.referrals_claimed} claimed`
              }
              onClick={() => navigate("/app/recruits")}
            />
            <Line
              label="Training"
              value={`${w.training_minutes} min`}
              sub={`${w.training_reps} of ${w.active_reps} active reps trained · last 7 days`}
              onClick={() => navigate("/app/team")}
            />
            <Line
              label="Money loaded"
              value={fiber || pest ? "Loaded" : "No data loaded yet"}
              sub={
                fiber || pest
                  ? `Fiber ${fiber || "none"} · Pest ${pest || "none"}`
                  : "Import a Gainz week or a Vision revenue sheet"
              }
              onClick={() => navigate("/admin/money")}
            />
          </div>
        )}
      </Panel>
    </>
  );
}
