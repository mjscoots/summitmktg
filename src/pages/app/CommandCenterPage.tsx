import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { isAdminOrAbove } from "@/lib/roles";
import { Loader2, Check, Pencil } from "lucide-react";

// ---------- Tokens (scoped to this page) ----------
const COLORS = {
  bg: "#09090B",
  panel: "#121215",
  border: "#262629",
  gold: "#E3C275",
  goldDeep: "#B8901F",
  text: "#EDEDEE",
  textMuted: "#8A8A92",
  green: "#4ADE80",
};

const fontDisplay = `'Space Grotesk', system-ui, sans-serif`;
const fontBody = `'Inter', system-ui, sans-serif`;
const fontMono = `'JetBrains Mono', ui-monospace, monospace`;

// Inject Google Fonts once
function useCommandFonts() {
  useEffect(() => {
    const id = "command-center-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

type Settings = Record<string, string>;

const DEFAULTS: Settings = {
  command_revenue_sold: "4000000",
  command_revenue_target: "8000000",
  command_active_target: "6000000",
  command_weekly_run: "483000",
  command_pace_date: "2026-08-19",
  command_pillar_summit: "50",
  command_pillar_realestate: "60",
  command_pillar_content: "30",
  command_pillar_self: "20",
  command_pillar_capital: "40",
};

const PILLARS: { key: string; label: string }[] = [
  { key: "command_pillar_summit", label: "Summit / Hawx" },
  { key: "command_pillar_realestate", label: "Real Estate" },
  { key: "command_pillar_content", label: "Content · @scootascend" },
  { key: "command_pillar_self", label: "Self / Recovery" },
  { key: "command_pillar_capital", label: "Capital" },
];

function formatMoneyCompact(n: number): string {
  if (!isFinite(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function weeksBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 7));
}
function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

// ---------- Reusable primitives ----------
function Panel({ children, className = "", style }: any) {
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

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Panel style={{ padding: 20 }}>
      <div style={{ color: COLORS.textMuted, fontFamily: fontBody, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: COLORS.text, fontFamily: fontMono, fontSize: 30, fontWeight: 500, marginTop: 8 }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: COLORS.textMuted, fontFamily: fontBody, fontSize: 12, marginTop: 6 }}>{sub}</div>
      )}
    </Panel>
  );
}

function GoldBar({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height: 8, background: "#1C1C20", borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          width: `${safe}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${COLORS.goldDeep}, ${COLORS.gold})`,
          transition: "width 600ms ease",
        }}
      />
    </div>
  );
}

function ProgressRing({ pct, size = 220, stroke = 14, children }: any) {
  const safe = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (safe / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={COLORS.goldDeep} />
            <stop offset="100%" stopColor={COLORS.gold} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1C1C20" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#goldGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 800ms ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function InlineNumberEdit({
  value,
  onSave,
  prefix = "",
  suffix = "",
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  prefix?: string;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setV(value), [value]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: COLORS.textMuted,
          fontFamily: fontMono,
          fontSize: 12,
          background: "transparent",
          border: `1px solid ${COLORS.border}`,
          padding: "4px 8px",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        <Pencil size={12} /> edit
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {prefix && <span style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 13 }}>{prefix}</span>}
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        style={{
          width: 130,
          background: "#0B0B0E",
          border: `1px solid ${COLORS.gold}`,
          color: COLORS.text,
          fontFamily: fontMono,
          fontSize: 13,
          borderRadius: 8,
          padding: "4px 8px",
        }}
      />
      {suffix && <span style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 13 }}>{suffix}</span>}
      <button
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          await onSave(v);
          setSaving(false);
          setEditing(false);
        }}
        style={{
          background: COLORS.gold,
          color: "#1A1300",
          border: "none",
          borderRadius: 8,
          padding: "4px 10px",
          fontFamily: fontBody,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button
        onClick={() => {
          setV(value);
          setEditing(false);
        }}
        style={{
          background: "transparent",
          color: COLORS.textMuted,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: "4px 8px",
          fontFamily: fontBody,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        cancel
      </button>
    </span>
  );
}

// ---------- Page ----------
export default function CommandCenterPage() {
  useCommandFonts();
  const { role, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [live, setLive] = useState({
    totalReps: 0,
    active7: 0,
    active30: 0,
    teams: 0,
    recruits: 0,
    openApps: 0,
    activeStreaks: 0,
    topStreak: 0,
  });
  const [loading, setLoading] = useState(true);

  // Load settings + live stats
  useEffect(() => {
    if (authLoading || !isAdminOrAbove(role)) return;
    (async () => {
      const { data: rows } = await supabase
        .from("app_settings")
        .select("key,value")
        .like("key", "command_%");
      const map: Settings = { ...DEFAULTS };
      (rows || []).forEach((r: any) => {
        if (r.value != null) map[r.key] = String(r.value);
      });
      setSettings(map);

      const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [
        totalRepsR,
        active7R,
        active30R,
        teamsR,
        recruitsR,
        openAppsR,
        streaksR,
        topStreakR,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gt("last_active_at", sevenAgo),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gt("last_active_at", thirtyAgo),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("recruit_pipeline").select("id", { count: "exact", head: true }),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .or("status.is.null,status.in.(pending,new,submitted)"),
        supabase.from("daily_login_streaks").select("id", { count: "exact", head: true }).gt("current_streak", 0),
        supabase.from("daily_login_streaks").select("current_streak").order("current_streak", { ascending: false }).limit(1),
      ]);

      setLive({
        totalReps: totalRepsR.count || 0,
        active7: active7R.count || 0,
        active30: active30R.count || 0,
        teams: teamsR.count || 0,
        recruits: recruitsR.count || 0,
        openApps: openAppsR.count || 0,
        activeStreaks: streaksR.count || 0,
        topStreak: (topStreakR.data?.[0] as any)?.current_streak || 0,
      });
      setLoading(false);
    })();
  }, [authLoading, role]);

  const saveSetting = async (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
    await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });
  };

  // Derived
  const sold = Number(settings.command_revenue_sold) || 0;
  const target = Number(settings.command_revenue_target) || 1;
  const activeTarget = Number(settings.command_active_target) || 0;
  const weeklyRun = Number(settings.command_weekly_run) || 0;
  const paceDate = useMemo(() => new Date(settings.command_pace_date + "T00:00:00"), [settings.command_pace_date]);
  const now = new Date();
  const weeksLeft = weeksBetween(now, paceDate);
  const daysLeft = daysBetween(now, paceDate);
  const projected = (sold + weeklyRun * weeksLeft) * 0.75;
  const pct = (sold / target) * 100;
  const projectedHitsActive = projected >= activeTarget;

  // Auth gate
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" color={COLORS.gold} />
      </div>
    );
  }
  if (!isAdminOrAbove(role)) return <Navigate to="/app" replace />;

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, fontFamily: fontBody, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "48px 24px 96px" }}>
        {/* HERO */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ color: COLORS.gold, fontFamily: fontMono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
            Private · Owner
          </div>
          <h1
            style={{
              fontFamily: fontDisplay,
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 600,
              letterSpacing: -1,
              margin: "8px 0 0",
            }}
          >
            Operator Command Center
          </h1>
        </div>

        {/* PRIMARY OBJECTIVE */}
        <Panel style={{ padding: 32, marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            <div>
              <div style={{ color: COLORS.gold, fontFamily: fontMono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
                Primary Objective
              </div>
              <div style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 500, marginTop: 6 }}>Revenue Race · Summer Push</div>
            </div>
            <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12 }}>
              Pace date {settings.command_pace_date}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 280px) 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ProgressRing pct={pct}>
                <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>
                  Sold / Target
                </div>
                <div style={{ fontFamily: fontMono, fontSize: 36, color: COLORS.gold, fontWeight: 600 }}>
                  {pct.toFixed(1)}%
                </div>
                <div style={{ fontFamily: fontMono, fontSize: 13, color: COLORS.textMuted }}>
                  {formatMoneyCompact(sold)} / {formatMoneyCompact(target)}
                </div>
              </ProgressRing>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
              <MetricBlock
                label="Sold"
                value={formatMoneyCompact(sold)}
                edit={
                  <InlineNumberEdit
                    value={settings.command_revenue_sold}
                    onSave={(v) => saveSetting("command_revenue_sold", v)}
                    prefix="$"
                  />
                }
              />
              <MetricBlock
                label="Revenue Target"
                value={formatMoneyCompact(target)}
                edit={
                  <InlineNumberEdit
                    value={settings.command_revenue_target}
                    onSave={(v) => saveSetting("command_revenue_target", v)}
                    prefix="$"
                  />
                }
              />
              <MetricBlock
                label="Projected Active"
                value={
                  <span style={{ color: projectedHitsActive ? COLORS.green : COLORS.text }}>
                    {formatMoneyCompact(projected)}
                  </span>
                }
                sub={`vs ${formatMoneyCompact(activeTarget)} target`}
                edit={
                  <InlineNumberEdit
                    value={settings.command_active_target}
                    onSave={(v) => saveSetting("command_active_target", v)}
                    prefix="$"
                  />
                }
              />
              <MetricBlock
                label="Weekly Run Rate"
                value={formatMoneyCompact(weeklyRun)}
                edit={
                  <InlineNumberEdit
                    value={settings.command_weekly_run}
                    onSave={(v) => saveSetting("command_weekly_run", v)}
                    prefix="$"
                  />
                }
              />
              <MetricBlock label="Days Remaining" value={`${daysLeft}d`} sub={`${weeksLeft.toFixed(1)} weeks`} />
            </div>
          </div>
        </Panel>

        {/* LIVE TEAM PULSE */}
        <SectionHeader title="Live Team Pulse" tag="Live" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          <StatCard label="Total Reps" value={live.totalReps} />
          <StatCard label="Active · 7d" value={live.active7} />
          <StatCard label="Active · 30d" value={live.active30} />
          <StatCard label="Teams" value={live.teams} />
          <StatCard label="Recruits" value={live.recruits} />
          <StatCard label="Open Applications" value={live.openApps} />
        </div>

        {/* ENGAGEMENT */}
        <SectionHeader title="Engagement" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
          <StatCard label="Active Streaks" value={live.activeStreaks} />
          <StatCard label="Top Streak" value={`${live.topStreak}d`} />
        </div>
        <div
          style={{
            color: COLORS.gold,
            fontFamily: fontBody,
            fontSize: 13,
            fontStyle: "italic",
            opacity: 0.85,
            margin: "0 0 40px 4px",
          }}
        >
          30-day active is the number to grow.
        </div>

        {/* LIFE PILLARS */}
        <SectionHeader title="Life Pillars" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {PILLARS.map((p) => {
            const v = Number(settings[p.key] ?? "0") || 0;
            return (
              <Panel key={p.key} style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 500 }}>{p.label}</div>
                  <div style={{ fontFamily: fontMono, fontSize: 18, color: COLORS.gold }}>{v}%</div>
                </div>
                <GoldBar pct={v} />
                <div style={{ marginTop: 12 }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={v}
                    onChange={(e) => saveSetting(p.key, e.target.value)}
                    style={{ width: "100%", accentColor: COLORS.gold }}
                  />
                </div>
              </Panel>
            );
          })}
        </div>

        {loading && (
          <div style={{ marginTop: 32, color: COLORS.textMuted, fontFamily: fontMono, fontSize: 12 }}>
            Syncing live data…
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, tag }: { title: string; tag?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 16px" }}>
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

function MetricBlock({
  label,
  value,
  sub,
  edit,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  edit?: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ color: COLORS.textMuted, fontFamily: fontBody, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontFamily: fontMono, fontSize: 26, fontWeight: 500, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ color: COLORS.textMuted, fontFamily: fontMono, fontSize: 11, marginTop: 2 }}>{sub}</div>}
      {edit && <div style={{ marginTop: 8 }}>{edit}</div>}
    </div>
  );
}
