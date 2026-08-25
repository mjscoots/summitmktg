import React from "react";

/** Shared visual tokens for the private Operator Command Center (/command). */
export const COLORS = {
  bg: "#09090B",
  panel: "#121215",
  border: "#262629",
  gold: "#E3C275",
  goldDeep: "#B8901F",
  text: "#EDEDEE",
  textMuted: "#8A8A92",
  green: "#4ADE80",
  red: "#F87171",
};

export const fontDisplay = `'Space Grotesk', system-ui, sans-serif`;
export const fontBody = `'Inter', system-ui, sans-serif`;
export const fontMono = `'JetBrains Mono', ui-monospace, monospace`;

export function Panel({
  children,
  className = "",
  style,
}: {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, tag }: { title: string; tag?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 16px", flexWrap: "wrap" }}>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, margin: 0 }}>{title}</h2>
      {tag && (
        <span
          style={{
            fontFamily: fontMono,
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: COLORS.gold,
            border: `1px solid ${COLORS.goldDeep}`,
            padding: "2px 8px",
            borderRadius: 999,
          }}
        >
          {tag}
        </span>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Panel style={{ padding: 20 }}>
      <div
        style={{
          color: COLORS.textMuted,
          fontFamily: fontBody,
          fontSize: 12,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ color: COLORS.text, fontFamily: fontMono, fontSize: 30, fontWeight: 500, marginTop: 8 }}>
        {value}
      </div>
      {sub && <div style={{ color: COLORS.textMuted, fontFamily: fontBody, fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </Panel>
  );
}
