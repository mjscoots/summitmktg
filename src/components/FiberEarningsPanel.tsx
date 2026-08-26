import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/commission";

interface StackRow {
  rank: string;
  sort_order: number;
  value: number | null;
}
interface CarrierTable {
  carrier_id: string;
  carrier: string;
  confirmed?: boolean;
  rows: StackRow[] | null;
}

/**
 * Fiber side of the earnings calculator: installs per week x weeks x per-install pay
 * from the rank stack table. Public visitors only see it when the owner has confirmed
 * the table and switched publishing on; admins can preview it in-app.
 */
export function FiberEarningsPanel() {
  const [carriers, setCarriers] = useState<CarrierTable[]>([]);
  const [published, setPublished] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [holdback, setHoldback] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [rank, setRank] = useState<string>("Rookie");
  const [installsPerWeek, setInstallsPerWeek] = useState(3);
  const [weeks, setWeeks] = useState(14);

  useEffect(() => {
    (async () => {
      const { data: pub } = await (supabase as any).rpc("get_public_fiber_stacks");
      let list: CarrierTable[] = (pub?.carriers as CarrierTable[]) ?? [];
      let isPublished = Boolean(pub?.published);
      let hb = pub?.holdback_percent ? Number(pub.holdback_percent) : null;
      let staff = false;

      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        const { data: staffTable } = await (supabase as any).rpc("get_fiber_stack_table");
        if (staffTable?.is_staff) {
          staff = true;
          list = (staffTable.carriers as CarrierTable[]) ?? [];
          hb = staffTable.holdback_percent ? Number(staffTable.holdback_percent) : hb;
        }
      }

      setPublished(isPublished);
      setIsStaff(staff);
      setHoldback(hb);
      setCarriers(list);
      setCarrierId(list[0]?.carrier_id ?? null);
      setLoading(false);
    })();
  }, []);

  const carrier = useMemo(
    () => carriers.find((c) => c.carrier_id === carrierId) ?? null,
    [carriers, carrierId]
  );
  const rows = useMemo(
    () => (carrier?.rows ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [carrier]
  );
  const perInstall = rows.find((r) => r.rank === rank)?.value ?? null;

  const installs = installsPerWeek * weeks;
  const gross = perInstall !== null ? installs * Number(perInstall) : null;
  const held = gross !== null && holdback !== null ? gross * (holdback / 100) : null;
  const net = gross !== null ? gross - (held ?? 0) : null;

  useEffect(() => {
    if (rows.length && !rows.some((r) => r.rank === rank)) setRank(rows[0].rank);
  }, [rows, rank]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const visible = isStaff || (published && rows.length > 0);
  if (!visible) {
    return (
      <p className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        Fiber pay table not published yet.
      </p>
    );
  }

  return (
    <div>
      {isStaff && !published && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-400">
          Admin preview — this table is not published to the public site.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Carrier</span>
          <select
            value={carrierId ?? ""}
            onChange={(e) => setCarrierId(e.target.value)}
            className="h-11 rounded-lg border border-border bg-card/60 px-3 text-sm text-foreground"
          >
            {carriers.map((c) => (
              <option key={c.carrier_id} value={c.carrier_id}>
                {c.carrier}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Rank</span>
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="h-11 rounded-lg border border-border bg-card/60 px-3 text-sm text-foreground"
          >
            {rows.map((r) => (
              <option key={r.rank} value={r.rank}>
                {r.rank}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <label className="text-sm font-bold tracking-wide text-foreground">Installs per week</label>
          <span className="text-2xl font-extrabold tabular-nums text-foreground">{installsPerWeek}</span>
        </div>
        <Slider
          value={[installsPerWeek]}
          onValueChange={(v) => setInstallsPerWeek(v[0])}
          min={1}
          max={30}
          step={1}
        />
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <label className="text-sm font-bold tracking-wide text-foreground">Weeks worked</label>
          <span className="text-2xl font-extrabold tabular-nums text-foreground">{weeks}</span>
        </div>
        <Slider value={[weeks]} onValueChange={(v) => setWeeks(v[0])} min={1} max={30} step={1} />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Cell label="Installs, season" value={String(installs)} />
        <Cell
          label="Per install"
          value={perInstall !== null ? formatCurrency(Number(perInstall)) : "Not set"}
        />
        <Cell label="Holdback" value={holdback !== null ? `${holdback}%` : "Not set"} accent />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Cell label="Weekly earnings" value={net !== null && weeks > 0 ? formatCurrency(net / weeks) : "Not set"} />
        <Cell label="Season earnings" value={net !== null ? formatCurrency(net) : "Not set"} accent />
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {perInstall !== null ? (
          <>
            {installsPerWeek} installs × {weeks} weeks at {formatCurrency(Number(perInstall))} per install
            {holdback !== null ? `, less a ${holdback}% holdback` : ""}.
          </>
        ) : (
          <>The per-install pay for that rank is not set yet, so earnings cannot be calculated.</>
        )}
      </p>
      <p className="mt-2 text-center text-xs font-semibold text-foreground">This is math, not a promise.</p>
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={
        accent
          ? "rounded-lg border border-primary/20 bg-primary/10 p-4"
          : "rounded-lg border border-border bg-secondary/30 p-4"
      }
    >
      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default FiberEarningsPanel;
