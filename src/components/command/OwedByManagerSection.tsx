import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { COLORS, Panel, SectionHeader, fontBody, fontMono } from "./tokens";

type Row = { user_id: string; full_name: string; total: number };

/** One line per manager with their owed total, highest first. Owner and admin only. */
export default function OwedByManagerSection() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let alive = true;
    (supabase.rpc as any)("owed_by_manager").then(({ data }: any) => {
      if (!alive) return;
      const list = Array.isArray(data) ? (data as Row[]) : [];
      setRows([...list].sort((a, b) => b.total - a.total));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <SectionHeader title="Owed by manager" tag="Live" />
      <Panel style={{ padding: "6px 4px 10px", marginBottom: 40 }}>
        {rows === null ? (
          <div style={{ padding: 16, color: COLORS.textMuted, fontFamily: fontBody, fontSize: 13 }}>
            Loading
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 16, color: COLORS.textMuted, fontFamily: fontBody, fontSize: 13 }}>
            No managers on file
          </div>
        ) : (
          rows.map((r) => (
            <button
              key={r.user_id}
              onClick={() => navigate(`/app/team?manager=${r.user_id}`)}
              style={{
                display: "flex",
                width: "100%",
                minHeight: 48,
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderTop: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ fontFamily: fontBody, fontSize: 14, minWidth: 0 }}>{r.full_name}</span>
              <span style={{ fontFamily: fontMono, fontSize: 16 }}>{r.total}</span>
            </button>
          ))
        )}
      </Panel>
    </>
  );
}
