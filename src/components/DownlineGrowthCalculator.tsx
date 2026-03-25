import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  DollarSign, Users, TrendingUp, Plus, Trash2, Lightbulb,
  ChevronDown, ChevronUp, Target, AlertTriangle,
  BarChart3, Percent, Info, Shield, UserPlus, Zap, ArrowUpRight
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ===================== TIER TABLES =====================

const ROOKIE_COMMISSION_TIERS = [
  { min: 0, max: 69999, rate: 0.18 },
  { min: 70000, max: 99999, rate: 0.22 },
  { min: 100000, max: 149999, rate: 0.25 },
  { min: 150000, max: 199999, rate: 0.35 },
  { min: 200000, max: 249999, rate: 0.40 },
  { min: 250000, max: 299999, rate: 0.45 },
  { min: 300000, max: 399999, rate: 0.50 },
  { min: 400000, max: Infinity, rate: 0.55 },
];

const VET_COMMISSION_TIERS = [
  { min: 0, max: 199999, rate: 0.40 },
  { min: 200000, max: 249999, rate: 0.50 },
  { min: 250000, max: 299999, rate: 0.55 },
  { min: 300000, max: 399999, rate: 0.60 },
  { min: 400000, max: 499999, rate: 0.65 },
  { min: 500000, max: Infinity, rate: 0.70 },
];

const MARKETING_DEAL_TIERS = [
  { min: 0, max: 249999, rate: 0.45 },
  { min: 250000, max: 499999, rate: 0.50 },
  { min: 500000, max: 1249999, rate: 0.55 },
  { min: 1250000, max: 2499999, rate: 0.60 },
  { min: 2500000, max: 3749999, rate: 0.65 },
  { min: 3750000, max: 4999999, rate: 0.675 },
  { min: 5000000, max: 7499999, rate: 0.70 },
  { min: 7500000, max: 9999999, rate: 0.72 },
  { min: 10000000, max: 12499999, rate: 0.74 },
  { min: 12500000, max: Infinity, rate: 0.76 },
];

const getRookieRate = (servicedRev: number) =>
  (ROOKIE_COMMISSION_TIERS.find(t => servicedRev >= t.min && servicedRev <= t.max) || ROOKIE_COMMISSION_TIERS[0]).rate;
const getVetRate = (activeRev: number) =>
  (VET_COMMISSION_TIERS.find(t => activeRev >= t.min && activeRev <= t.max) || VET_COMMISSION_TIERS[0]).rate;
const getMktgRate = (activeRev: number) =>
  (MARKETING_DEAL_TIERS.find(t => activeRev >= t.min && activeRev <= t.max) || MARKETING_DEAL_TIERS[0]).rate;

// ===================== UTILITY =====================

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const parseNum = (s: string) => { const n = parseInt(s.replace(/[^0-9]/g, '') || '0'); return isNaN(n) ? 0 : n; };
const fmtInput = (s: string) => { const c = s.replace(/[^0-9]/g, ''); if (!c) return ''; return parseInt(c).toLocaleString(); };

const AnimNum = ({ value, prefix = "$" }: { value: number; prefix?: string }) => {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef<number>();
  useEffect(() => {
    const s = prev.current, e = value, dur = 350, t0 = performance.now();
    const go = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setDisplay(s + (e - s) * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf.current = requestAnimationFrame(go);
      else prev.current = e;
    };
    raf.current = requestAnimationFrame(go);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  if (prefix === "$") return <span>{fmt(Math.round(display))}</span>;
  return <span>{pct(display)}</span>;
};

// ===================== INPUT COMPONENTS =====================

const CurrencyInput = ({ value, onChange, placeholder, label, hint, icon: Icon, small }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; hint?: string; icon?: any; small?: boolean;
}) => (
  <div>
    {label && (
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <span className={cn("font-bold text-foreground uppercase tracking-wider", small ? "text-[9px]" : "text-xs")}>{label}</span>
      </div>
    )}
    {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <input type="text" inputMode="numeric" value={value} onChange={e => onChange(fmtInput(e.target.value))} placeholder={placeholder || "0"}
        className={cn("w-full pl-7 pr-3 rounded-lg border border-border bg-input text-foreground font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all", small ? "h-8 text-xs" : "h-9 text-sm")} />
    </div>
  </div>
);

const CountInput = ({ value, onChange, placeholder, label, hint, icon: Icon, small }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; hint?: string; icon?: any; small?: boolean;
}) => (
  <div>
    {label && (
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <span className={cn("font-bold text-foreground uppercase tracking-wider", small ? "text-[9px]" : "text-xs")}>{label}</span>
      </div>
    )}
    {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
    <input type="text" inputMode="numeric" value={value} onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))} placeholder={placeholder || "0"}
      className={cn("w-full px-3 rounded-lg border border-border bg-input text-foreground font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all", small ? "h-8 text-xs" : "h-9 text-sm")} />
  </div>
);

const PctInput = ({ value, onChange, label, hint, small }: {
  value: string; onChange: (v: string) => void; label?: string; hint?: string; small?: boolean;
}) => (
  <div>
    {label && <span className={cn("font-bold text-foreground uppercase tracking-wider", small ? "text-[9px]" : "text-[10px]")}>{label}</span>}
    {hint && <p className="text-[10px] text-muted-foreground mb-0.5">{hint}</p>}
    <div className="relative">
      <input type="text" inputMode="numeric" value={value} onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="25"
        className={cn("w-full px-3 pr-7 rounded-lg border border-border bg-input text-foreground font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all", small ? "h-8 text-xs" : "h-9 text-sm")} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
    </div>
  </div>
);

const InfoTip = ({ text }: { text: string }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground/60 cursor-help shrink-0" /></TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs"><p>{text}</p></TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ===================== TYPES =====================

interface PersonalData {
  selling: boolean;
  grossRevenue: number;
  previousSummerRevenue: number;
}

interface Assumptions {
  rookieAttrition: number;
  vetAttrition: number;
  cancellationReduction: number;
  incentiveFee: number;
  housingCost: number;
}

interface RookieRow {
  id: string;
  label: string;
  headcount: number;
  avgServicedRevenue: number;
  attrition: number;       // override or -1 for global
  cancellation: number;    // override or -1 for global
}

interface VetRow {
  id: string;
  label: string;
  headcount: number;
  avgActiveRevenue: number;
  previousSummerRevenue: number;
  attrition: number;
}

interface TeamRow {
  id: string;
  name: string;
  useManualRevenue: boolean;
  manualActiveRevenue: number;
  numRookies: number;
  numVets: number;
  avgRookieServiced: number;
  avgVetActive: number;
  rookieAttrition: number;
  vetAttrition: number;
  cancellation: number;
}

// ===================== ROW STATE HELPERS =====================

interface RookieRowState {
  id: string;
  label: string;
  headcountStr: string;
  avgServicedStr: string;
  attritionStr: string;
  cancellationStr: string;
  expanded: boolean;
}

interface VetRowState {
  id: string;
  label: string;
  headcountStr: string;
  avgActiveStr: string;
  prevSummerStr: string;
  attritionStr: string;
  expanded: boolean;
}

interface TeamRowState {
  id: string;
  name: string;
  useManualRevenue: boolean;
  manualActiveStr: string;
  numRookiesStr: string;
  numVetsStr: string;
  avgRookieServicedStr: string;
  avgVetActiveStr: string;
  rookieAttrStr: string;
  vetAttrStr: string;
  cancelStr: string;
  expanded: boolean;
}

// ===================== CALCULATION ENGINE =====================

interface RookieCalcResult {
  adjustedCount: number;
  totalServiced: number;
  activeRevenue: number;
  rookieCommission: number;
  grossSpread: number;
  netSpread: number;
  earnings: number;
}

function calcRookieRow(r: RookieRow, a: Assumptions, topDeal: number): RookieCalcResult {
  const attrRate = r.attrition >= 0 ? r.attrition : a.rookieAttrition;
  const cancelRate = r.cancellation >= 0 ? r.cancellation : a.cancellationReduction;
  const adjustedCount = Math.round(r.headcount * (1 - attrRate / 100));
  const totalServiced = r.headcount * r.avgServicedRevenue;
  const activeRevenue = totalServiced * (1 - cancelRate / 100) * (1 - attrRate / 100);
  const rookieCommission = getRookieRate(r.avgServicedRevenue);
  const grossSpread = topDeal - rookieCommission;
  const netSpread = Math.max(0, grossSpread - a.incentiveFee / 100 - a.housingCost / 100);
  const earnings = activeRevenue * netSpread;
  return { adjustedCount, totalServiced, activeRevenue, rookieCommission, grossSpread, netSpread, earnings };
}

interface VetCalcResult {
  adjustedCount: number;
  totalActive: number;
  adjustedActiveRevenue: number;
  vetCommission: number;
  usedPrevSummer: boolean;
  grossSpread: number;
  netSpread: number;
  earnings: number;
}

function calcVetRow(v: VetRow, a: Assumptions, topDeal: number): VetCalcResult {
  const attrRate = v.attrition >= 0 ? v.attrition : a.vetAttrition;
  const adjustedCount = Math.round(v.headcount * (1 - attrRate / 100));
  const totalActive = v.headcount * v.avgActiveRevenue;
  const adjustedActiveRevenue = totalActive * (1 - attrRate / 100);
  const currentRate = getVetRate(v.avgActiveRevenue);
  const prevRate = v.previousSummerRevenue > 0 ? getVetRate(v.previousSummerRevenue) : 0;
  const usedPrevSummer = prevRate > currentRate;
  const vetCommission = Math.max(currentRate, prevRate);
  const grossSpread = topDeal - vetCommission;
  const netSpread = Math.max(0, grossSpread - a.incentiveFee / 100 - a.housingCost / 100);
  const earnings = adjustedActiveRevenue * netSpread;
  return { adjustedCount, totalActive, adjustedActiveRevenue, vetCommission, usedPrevSummer, grossSpread, netSpread, earnings };
}

interface TeamCalcResult {
  teamActiveRevenue: number;
  teamLeadDeal: number;
  overrideSpread: number;
  earnings: number;
  adjustedHeadcount: number;
  revPerRep: number;
}

function calcTeamRow(t: TeamRow, topDeal: number, globalA: Assumptions): TeamCalcResult {
  let teamActiveRevenue: number;
  let adjustedHeadcount = 0;
  if (t.useManualRevenue) {
    teamActiveRevenue = t.manualActiveRevenue;
  } else {
    const rAttr = t.rookieAttrition >= 0 ? t.rookieAttrition : globalA.rookieAttrition;
    const vAttr = t.vetAttrition >= 0 ? t.vetAttrition : globalA.vetAttrition;
    const cancel = t.cancellation >= 0 ? t.cancellation : globalA.cancellationReduction;
    const rookieActive = t.numRookies * t.avgRookieServiced * (1 - cancel / 100) * (1 - rAttr / 100);
    const vetActive = t.numVets * t.avgVetActive * (1 - vAttr / 100);
    teamActiveRevenue = rookieActive + vetActive;
    adjustedHeadcount = Math.round(t.numRookies * (1 - rAttr / 100)) + Math.round(t.numVets * (1 - vAttr / 100));
  }
  const teamLeadDeal = getMktgRate(teamActiveRevenue);
  const overrideSpread = Math.max(0, topDeal - teamLeadDeal);
  const earnings = teamActiveRevenue * overrideSpread;
  return {
    teamActiveRevenue, teamLeadDeal, overrideSpread, earnings, adjustedHeadcount,
    revPerRep: adjustedHeadcount > 0 ? teamActiveRevenue / adjustedHeadcount : teamActiveRevenue,
  };
}

function calcPersonal(p: PersonalData, a: Assumptions) {
  if (!p.selling || p.grossRevenue === 0) return { activeRevenue: 0, commission: 0, earnings: 0, usedPrevSummer: false };
  const activeRevenue = p.grossRevenue * (1 - a.cancellationReduction / 100);
  const currentRate = getVetRate(activeRevenue);
  const prevRate = p.previousSummerRevenue > 0 ? getVetRate(p.previousSummerRevenue) : 0;
  const usedPrevSummer = prevRate > currentRate;
  const commission = Math.max(currentRate, prevRate);
  const earnings = activeRevenue * commission;
  return { activeRevenue, commission, earnings, usedPrevSummer };
}

function calcAll(
  personal: PersonalData,
  rookieRows: RookieRow[],
  vetRows: VetRow[],
  teamRows: TeamRow[],
  assumptions: Assumptions,
) {
  const personalResult = calcPersonal(personal, assumptions);

  // Step 1: total system active for top-level deal
  let totalRookieActive = 0, totalRookieServiced = 0;
  rookieRows.forEach(r => {
    const res = calcRookieRow(r, assumptions, 0);
    totalRookieActive += res.activeRevenue;
    totalRookieServiced += res.totalServiced;
  });

  let totalVetActive = 0;
  vetRows.forEach(v => {
    const res = calcVetRow(v, assumptions, 0);
    totalVetActive += res.adjustedActiveRevenue;
  });

  let totalTeamActive = 0;
  teamRows.forEach(t => {
    const res = calcTeamRow(t, 0, assumptions);
    totalTeamActive += res.teamActiveRevenue;
  });

  const totalSystemActive = totalRookieActive + totalVetActive + totalTeamActive;
  const topDeal = getMktgRate(totalSystemActive);

  // Step 2: recalc with real deal
  const rookieResults = rookieRows.map(r => calcRookieRow(r, assumptions, topDeal));
  const vetResults = vetRows.map(v => calcVetRow(v, assumptions, topDeal));
  const teamResults = teamRows.map(t => calcTeamRow(t, topDeal, assumptions));

  const totalRookieEarnings = rookieResults.reduce((s, r) => s + r.earnings, 0);
  const totalVetEarnings = vetResults.reduce((s, r) => s + r.earnings, 0);
  const totalTeamEarnings = teamResults.reduce((s, r) => s + r.earnings, 0);
  const totalDownlineEarnings = totalRookieEarnings + totalVetEarnings + totalTeamEarnings;
  const totalEarnings = personalResult.earnings + totalDownlineEarnings;

  const totalHeadcount = rookieResults.reduce((s, r) => s + r.adjustedCount, 0)
    + vetResults.reduce((s, r) => s + r.adjustedCount, 0)
    + teamResults.reduce((s, r) => s + r.adjustedHeadcount, 0);

  const weightedSpread = totalSystemActive > 0 ? totalDownlineEarnings / totalSystemActive : 0;

  return {
    topDeal, totalSystemActive, totalServiced: totalRookieServiced, totalEarnings, totalDownlineEarnings,
    weightedSpread, totalHeadcount, personalResult,
    rookieResults, vetResults, teamResults,
    totalRookieEarnings, totalVetEarnings, totalTeamEarnings,
    totalRookieActive, totalVetActive, totalTeamActive,
  };
}

// ===================== INSIGHTS =====================

interface Insight { text: string; type: 'structural' | 'controllable' | 'tip'; value?: number }

function generateInsights(
  result: ReturnType<typeof calcAll>,
  personal: PersonalData,
  rookieRows: RookieRow[],
  vetRows: VetRow[],
  teamRows: TeamRow[],
  assumptions: Assumptions,
): Insight[] {
  const insights: Insight[] = [];
  const { totalEarnings, topDeal, teamResults, totalRookieEarnings, totalVetEarnings, totalTeamEarnings } = result;

  // Segment comparison
  const segments = [
    { name: 'Direct Rookies', earnings: totalRookieEarnings },
    { name: 'Direct Vets', earnings: totalVetEarnings },
    ...teamResults.map((r, i) => ({ name: teamRows[i]?.name || `Team ${i + 1}`, earnings: r.earnings })),
  ].filter(s => s.earnings > 0);

  if (segments.length > 1) {
    const sorted = [...segments].sort((a, b) => a.earnings - b.earnings);
    insights.push({ text: `Strongest segment: ${sorted[sorted.length - 1].name} (${fmt(sorted[sorted.length - 1].earnings)}). Weakest: ${sorted[0].name} (${fmt(sorted[0].earnings)}).`, type: 'tip' });
  }

  // Rookie vs vet per-head earnings
  if (rookieRows.length > 0 && vetRows.length > 0) {
    const rookieHeads = result.rookieResults.reduce((s, r) => s + r.adjustedCount, 0);
    const vetHeads = result.vetResults.reduce((s, r) => s + r.adjustedCount, 0);
    if (rookieHeads > 0 && vetHeads > 0) {
      const perRookieHead = totalRookieEarnings / rookieHeads;
      const perVetHead = totalVetEarnings / vetHeads;
      if (perVetHead > perRookieHead * 1.3) {
        insights.push({ text: `Direct vets earn you ${fmt(perVetHead)}/head vs ${fmt(perRookieHead)}/head from rookies. Adding a producing vet may outperform adding multiple rookies.`, type: 'controllable' });
      }
    }
  }

  // Attrition (structural)
  if (rookieRows.length > 0 || vetRows.length > 0) {
    const noAttr = { ...assumptions, rookieAttrition: 0, vetAttrition: 0 };
    const noAttrResult = calcAll(personal, rookieRows, vetRows, teamRows, noAttr);
    const cost = noAttrResult.totalEarnings - totalEarnings;
    if (cost > 1000) {
      insights.push({ text: `Structural attrition costs ${fmt(cost)} in projected earnings. This is largely expected — focus on controllable levers instead.`, type: 'structural', value: cost });
    }
  }

  // Improved retention (controllable)
  if (result.totalServiced > 0) {
    const betterRetention = { ...assumptions, cancellationReduction: Math.max(0, assumptions.cancellationReduction - 10) };
    const betterResult = calcAll(personal, rookieRows, vetRows, teamRows, betterRetention);
    const upside = betterResult.totalEarnings - totalEarnings;
    if (upside > 500) {
      insights.push({ text: `If account quality improved and you retained an additional 10%, projected earnings increase by ${fmt(upside)}.`, type: 'controllable', value: upside });
    }
  }

  // Team near next deal threshold
  teamResults.forEach((tr, i) => {
    const team = teamRows[i];
    if (!team) return;
    const nextTier = MARKETING_DEAL_TIERS.find(t => t.min > tr.teamActiveRevenue);
    if (nextTier) {
      const gap = nextTier.min - tr.teamActiveRevenue;
      if (gap < tr.teamActiveRevenue * 0.5 && gap > 0) {
        insights.push({ text: `${team.name} needs ${fmt(gap)} more active revenue to reach the next deal bracket (${pct(nextTier.rate)}). This would reduce your override spread but may signal a stronger team.`, type: 'controllable', value: gap });
      }
    }
  });

  // Rookie production improvement
  if (rookieRows.length > 0) {
    const boosted = rookieRows.map(r => ({ ...r, avgServicedRevenue: Math.round(r.avgServicedRevenue * 1.15) }));
    const boostedResult = calcAll(personal, boosted, vetRows, teamRows, assumptions);
    const upside = boostedResult.totalEarnings - totalEarnings;
    if (upside > 500) {
      insights.push({ text: `Improving rookie average production by 15% increases projected earnings by ${fmt(upside)}.`, type: 'controllable', value: upside });
    }
  }

  return insights;
}

// Opportunity map
function calcOpportunityMap(
  result: ReturnType<typeof calcAll>,
  personal: PersonalData,
  rookieRows: RookieRow[],
  vetRows: VetRow[],
  teamRows: TeamRow[],
  assumptions: Assumptions,
) {
  // Structural: attrition
  const noAttr = calcAll(personal, rookieRows, vetRows, teamRows, { ...assumptions, rookieAttrition: 0, vetAttrition: 0 });
  const attritionCost = noAttr.totalEarnings - result.totalEarnings;

  // Structural: baseline cancellations (not fully recoverable)
  const noCancel = calcAll(personal, rookieRows, vetRows, teamRows, { ...assumptions, cancellationReduction: 0 });
  const totalCancelCost = noCancel.totalEarnings - result.totalEarnings;

  // Controllable: improved retention (recover 10% of cancellation rate)
  const betterRetention = calcAll(personal, rookieRows, vetRows, teamRows, { ...assumptions, cancellationReduction: Math.max(0, assumptions.cancellationReduction - 10) });
  const retentionUpside = betterRetention.totalEarnings - result.totalEarnings;

  // Controllable: improved rookie production (+15%)
  const boostedRookies = rookieRows.map(r => ({ ...r, avgServicedRevenue: Math.round(r.avgServicedRevenue * 1.15) }));
  const boostedResult = calcAll(personal, boostedRookies, vetRows, teamRows, assumptions);
  const productionUpside = boostedResult.totalEarnings - result.totalEarnings;

  // Weak teams
  let weakTeamCost = 0;
  if (result.teamResults.length > 1) {
    const best = Math.max(...result.teamResults.map(r => r.revPerRep > 0 ? r.revPerRep : 0));
    if (best > 0) {
      const normalized = teamRows.map((t, i) => {
        if (t.useManualRevenue) {
          const ratio = result.teamResults[i].revPerRep > 0 ? best / result.teamResults[i].revPerRep : 1;
          return { ...t, manualActiveRevenue: Math.round(t.manualActiveRevenue * ratio) };
        }
        return t;
      });
      const normResult = calcAll(personal, rookieRows, vetRows, normalized, assumptions);
      weakTeamCost = Math.max(0, normResult.totalEarnings - result.totalEarnings);
    }
  }

  return {
    structural: { attrition: attritionCost, cancellations: totalCancelCost },
    controllable: { betterRetention: retentionUpside, improvedProduction: productionUpside, weakTeams: weakTeamCost },
  };
}

// ===================== MAIN COMPONENT =====================

let idCounter = 0;
const nextId = () => String(++idCounter);

export default function DownlineGrowthCalculator() {
  const [assumptions, setAssumptions] = useState<Assumptions>({
    rookieAttrition: 25, vetAttrition: 10, cancellationReduction: 25,
    incentiveFee: 2, housingCost: 3,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Personal
  const [sellingThisSummer, setSellingThisSummer] = useState(false);
  const [personalRevStr, setPersonalRevStr] = useState('');
  const [personalPrevSummerStr, setPersonalPrevSummerStr] = useState('');

  // Rookie rows
  const [rookieRowStates, setRookieRowStates] = useState<RookieRowState[]>([]);
  // Vet rows
  const [vetRowStates, setVetRowStates] = useState<VetRowState[]>([]);
  // Team rows
  const [teamRowStates, setTeamRowStates] = useState<TeamRowState[]>([]);

  // === Converters ===
  const rookieRows: RookieRow[] = useMemo(() => rookieRowStates.map(r => ({
    id: r.id, label: r.label,
    headcount: Math.max(1, parseNum(r.headcountStr) || 1),
    avgServicedRevenue: parseNum(r.avgServicedStr) || 150000,
    attrition: r.attritionStr === '' ? -1 : (parseFloat(r.attritionStr) ?? -1),
    cancellation: r.cancellationStr === '' ? -1 : (parseFloat(r.cancellationStr) ?? -1),
  })), [rookieRowStates]);

  const vetRows: VetRow[] = useMemo(() => vetRowStates.map(v => ({
    id: v.id, label: v.label,
    headcount: Math.max(1, parseNum(v.headcountStr) || 1),
    avgActiveRevenue: parseNum(v.avgActiveStr) || 250000,
    previousSummerRevenue: parseNum(v.prevSummerStr),
    attrition: v.attritionStr === '' ? -1 : (parseFloat(v.attritionStr) ?? -1),
  })), [vetRowStates]);

  const teamRows: TeamRow[] = useMemo(() => teamRowStates.map(t => ({
    id: t.id, name: t.name || 'Unnamed',
    useManualRevenue: t.useManualRevenue,
    manualActiveRevenue: parseNum(t.manualActiveStr),
    numRookies: parseNum(t.numRookiesStr),
    numVets: parseNum(t.numVetsStr),
    avgRookieServiced: parseNum(t.avgRookieServicedStr) || 150000,
    avgVetActive: parseNum(t.avgVetActiveStr) || 250000,
    rookieAttrition: t.rookieAttrStr === '' ? -1 : (parseFloat(t.rookieAttrStr) ?? -1),
    vetAttrition: t.vetAttrStr === '' ? -1 : (parseFloat(t.vetAttrStr) ?? -1),
    cancellation: t.cancelStr === '' ? -1 : (parseFloat(t.cancelStr) ?? -1),
  })), [teamRowStates]);

  const personal: PersonalData = useMemo(() => ({
    selling: sellingThisSummer,
    grossRevenue: parseNum(personalRevStr),
    previousSummerRevenue: parseNum(personalPrevSummerStr),
  }), [sellingThisSummer, personalRevStr, personalPrevSummerStr]);

  const result = useMemo(() => calcAll(personal, rookieRows, vetRows, teamRows, assumptions), [personal, rookieRows, vetRows, teamRows, assumptions]);
  const insights = useMemo(() => generateInsights(result, personal, rookieRows, vetRows, teamRows, assumptions), [result, personal, rookieRows, vetRows, teamRows, assumptions]);
  const opportunityMap = useMemo(() => calcOpportunityMap(result, personal, rookieRows, vetRows, teamRows, assumptions), [result, personal, rookieRows, vetRows, teamRows, assumptions]);

  const hasData = personal.selling || rookieRows.length > 0 || vetRows.length > 0 || teamRows.length > 0;

  // Ref for scrolling to newly added items
  const rookieSectionRef = useRef<HTMLDivElement>(null);
  const vetSectionRef = useRef<HTMLDivElement>(null);
  const teamSectionRef = useRef<HTMLDivElement>(null);

  // Add/remove helpers — scroll into view after adding
  const addRookie = () => {
    setRookieRowStates(p => [...p, {
      id: nextId(), label: '', headcountStr: '1', avgServicedStr: '150,000',
      attritionStr: '', cancellationStr: '', expanded: true,
    }]);
    requestAnimationFrame(() => {
      rookieSectionRef.current?.querySelector('[data-last-row]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };
  const removeRookie = (id: string) => setRookieRowStates(p => p.filter(r => r.id !== id));
  const updateRookie = (id: string, field: string, value: any) => setRookieRowStates(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const addVet = () => {
    setVetRowStates(p => [...p, {
      id: nextId(), label: '', headcountStr: '1', avgActiveStr: '250,000',
      prevSummerStr: '', attritionStr: '', expanded: true,
    }]);
    requestAnimationFrame(() => {
      vetSectionRef.current?.querySelector('[data-last-row]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };
  const removeVet = (id: string) => setVetRowStates(p => p.filter(v => v.id !== id));
  const updateVet = (id: string, field: string, value: any) => setVetRowStates(p => p.map(v => v.id === id ? { ...v, [field]: value } : v));

  const addTeam = () => {
    setTeamRowStates(p => [...p, {
      id: nextId(), name: `Team ${p.length + 1}`, useManualRevenue: false,
      manualActiveStr: '', numRookiesStr: '5', numVetsStr: '0',
      avgRookieServicedStr: '150,000', avgVetActiveStr: '250,000',
      rookieAttrStr: '', vetAttrStr: '', cancelStr: '', expanded: true,
    }]);
    requestAnimationFrame(() => {
      teamSectionRef.current?.querySelector('[data-last-row]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };
  const removeTeam = (id: string) => setTeamRowStates(p => p.filter(t => t.id !== id));
  const updateTeam = (id: string, field: string, value: any) => setTeamRowStates(p => p.map(t => t.id === id ? { ...t, [field]: value } : t));

  // Find strongest/weakest
  const allSegments = [
    { name: 'Direct Rookies', earnings: result.totalRookieEarnings },
    { name: 'Direct Vets', earnings: result.totalVetEarnings },
    ...result.teamResults.map((r, i) => ({ name: teamRows[i]?.name || `Team ${i + 1}`, earnings: r.earnings })),
  ].filter(s => s.earnings > 0);
  const strongest = allSegments.length > 0 ? allSegments.reduce((a, b) => a.earnings > b.earnings ? a : b) : null;
  const weakest = allSegments.length > 1 ? allSegments.reduce((a, b) => a.earnings < b.earnings ? a : b) : null;

  // Controllable total
  const controllableTotal = opportunityMap.controllable.betterRetention + opportunityMap.controllable.improvedProduction + opportunityMap.controllable.weakTeams;

  return (
    <section className="w-full mb-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight leading-tight">
            Downline KPI Calculator
          </h2>
          <p className="text-[10px] text-muted-foreground">Build your roster. Find your biggest lever.</p>
        </div>
      </div>

      {/* ====== KPI SUMMARY ====== */}
      {hasData && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          <div className="text-center mb-4">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Total Projected Earnings</p>
            <p className="text-3xl md:text-4xl font-black text-foreground"><AnimNum value={result.totalEarnings} /></p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { label: 'Total Active Revenue', value: fmt(result.totalSystemActive) },
              { label: 'Top-Level Deal', value: pct(result.topDeal) },
              { label: 'Weighted Spread', value: pct(result.weightedSpread) },
              { label: 'Active Headcount', value: String(result.totalHeadcount) },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-2.5 text-center border border-border/20 bg-muted/10">
                <p className="text-[8px] text-muted-foreground uppercase font-semibold tracking-wider">{k.label}</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{k.value}</p>
              </div>
            ))}
          </div>

          <div className={cn("grid gap-2", result.personalResult.earnings > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
            {[
              ...(result.personalResult.earnings > 0 ? [{ label: 'Personal', value: fmt(result.personalResult.earnings), color: 'text-amber-400' }] : []),
              { label: 'From Rookies', value: fmt(result.totalRookieEarnings), color: 'text-blue-400' },
              { label: 'From Vets', value: fmt(result.totalVetEarnings), color: 'text-green-400' },
              { label: 'From Teams', value: fmt(result.totalTeamEarnings), color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-2 text-center border border-border/10 bg-muted/5">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={cn("text-xs font-bold mt-0.5", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {(strongest || weakest) && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              {strongest && <div className="flex items-center gap-1 text-green-400"><ArrowUpRight className="w-3 h-3" /> Strongest: {strongest.name}</div>}
              {weakest && <div className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" /> Weakest: {weakest.name}</div>}
            </div>
          )}
        </div>
      )}

      {/* ====== PERSONAL REVENUE ====== */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Personal Revenue</h3>
            <InfoTip text="Your own personal production this summer. Commission based on your active revenue (vet scale)." />
          </div>
          <button
            onClick={() => setSellingThisSummer(!sellingThisSummer)}
            className={cn(
              "relative w-12 h-6 rounded-full transition-all duration-300 shrink-0",
              sellingThisSummer ? "bg-green-500/80" : "bg-muted/40 border border-border/40"
            )}
            aria-label="Toggle selling this summer"
          >
            <div className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-all duration-300",
              sellingThisSummer ? "left-[26px] bg-white" : "left-0.5 bg-muted-foreground/60"
            )} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">Are you selling this summer?</p>

        {sellingThisSummer && (
          <div className="space-y-2.5 mt-3 pt-3 border-t border-border/20">
            <CurrencyInput value={personalRevStr} onChange={setPersonalRevStr} label="Your Gross Revenue Goal" icon={DollarSign} placeholder="e.g. 300,000" hint="Total serviced revenue you plan to sell" />
            <CurrencyInput value={personalPrevSummerStr} onChange={setPersonalPrevSummerStr} label="Previous Summer Revenue" icon={Shield} placeholder="Optional" hint="If higher, locks in the higher vet commission bracket" />
            {personal.grossRevenue > 0 && (
              <div className="p-2.5 rounded-lg bg-muted/10 border border-border/20 space-y-1 text-[10px] font-mono">
                <div className="flex justify-between"><span className="text-muted-foreground">Active Revenue</span><span>{fmt(result.personalResult.activeRevenue)}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission {result.personalResult.usedPrevSummer ? '(prev summer)' : ''}</span>
                  <span>{pct(result.personalResult.commission)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-400 border-t border-border/20 pt-1"><span>Personal Earnings</span><span>{fmt(result.personalResult.earnings)}</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====== DIRECT RECRUIT ROOKIES ====== */}
      <div className="glass-card rounded-2xl p-4 mb-6 border-l-4 border-l-blue-500/40" ref={rookieSectionRef}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Recruit Rookies</h3>
            <InfoTip text="Rookies you personally manage. Each row can be an individual or a group of similar rookies." />
          </div>
          <button type="button" onClick={addRookie} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-500/20 transition-all border border-blue-500/20">
            <Plus className="w-3 h-3" /> Add Rookie
          </button>
        </div>

        {rookieRowStates.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No rookies added. Tap "Add Rookie" to model direct recruit earnings.</p>
        )}

        {/* Subtotal */}
        {rookieRows.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[10px]">
            <span className="text-muted-foreground uppercase font-semibold">Rookie Subtotal</span>
            <span className="text-blue-400 font-bold">{fmt(result.totalRookieEarnings)}</span>
          </div>
        )}

        <div className="space-y-3">
          {rookieRowStates.map((row, i) => {
            const rr = result.rookieResults[i];
            const isLast = i === rookieRowStates.length - 1;
            return (
              <div key={row.id} {...(isLast ? { 'data-last-row': '' } : {})} className="rounded-xl border border-border/30 bg-muted/5 overflow-hidden">
                <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => updateRookie(row.id, 'expanded', !row.expanded)}>
                  {row.expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  <input value={row.label} onChange={e => updateRookie(row.id, 'label', e.target.value)} onClick={e => e.stopPropagation()}
                    placeholder={`Rookie ${i + 1}`}
                    className="bg-transparent text-xs font-bold text-foreground border-none outline-none w-28 placeholder:text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground ml-auto">×{row.headcountStr || '1'}</span>
                  {rr && <span className="text-[10px] text-blue-400 font-bold ml-2">{fmt(rr.earnings)}</span>}
                  <button type="button" onClick={e => { e.stopPropagation(); removeRookie(row.id); }} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {row.expanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <CountInput small value={row.headcountStr} onChange={v => updateRookie(row.id, 'headcountStr', v)} label="Headcount" placeholder="1" />
                      <CurrencyInput small value={row.avgServicedStr} onChange={v => updateRookie(row.id, 'avgServicedStr', v)} label="Avg Serviced Rev" placeholder="150,000" />
                    </div>
                    <Collapsible>
                      <CollapsibleTrigger className="text-[9px] text-muted-foreground/60 hover:text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <ChevronDown className="w-2.5 h-2.5" /> Override Assumptions
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <PctInput small value={row.attritionStr} onChange={v => updateRookie(row.id, 'attritionStr', v)} label="Attrition %" hint={`Global: ${assumptions.rookieAttrition}%`} />
                          <PctInput small value={row.cancellationStr} onChange={v => updateRookie(row.id, 'cancellationStr', v)} label="Cancellation %" hint={`Global: ${assumptions.cancellationReduction}%`} />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    {rr && rr.earnings > 0 && (
                      <div className="p-2 rounded-lg bg-muted/10 border border-border/15 space-y-1 text-[10px] font-mono">
                        <div className="flex justify-between"><span className="text-muted-foreground">Active after attrition</span><span>{rr.adjustedCount} reps</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Serviced</span><span>{fmt(rr.totalServiced)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Active Revenue</span><span>{fmt(rr.activeRevenue)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Rookie Commission</span><span>{pct(rr.rookieCommission)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Your Deal</span><span>{pct(result.topDeal)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Net Spread</span><span>{pct(rr.netSpread)}</span></div>
                        <div className="flex justify-between font-bold text-blue-400 border-t border-border/20 pt-1"><span>Contribution</span><span>{fmt(rr.earnings)}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== DIRECT VETS ====== */}
      <div className="glass-card rounded-2xl p-4 mb-6 border-l-4 border-l-green-500/40" ref={vetSectionRef}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Vets</h3>
            <InfoTip text="Veterans you directly manage. Previous summer production can lock in a higher commission bracket." />
          </div>
          <button type="button" onClick={addVet} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider hover:bg-green-500/20 transition-all border border-green-500/20">
            <Plus className="w-3 h-3" /> Add Vet
          </button>
        </div>

        {vetRowStates.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No vets added. Tap "Add Vet" to model direct vet earnings.</p>
        )}

        {vetRows.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded-lg bg-green-500/5 border border-green-500/10 text-[10px]">
            <span className="text-muted-foreground uppercase font-semibold">Vet Subtotal</span>
            <span className="text-green-400 font-bold">{fmt(result.totalVetEarnings)}</span>
          </div>
        )}

        <div className="space-y-3">
          {vetRowStates.map((row, i) => {
            const vr = result.vetResults[i];
            const isLast = i === vetRowStates.length - 1;
            return (
              <div key={row.id} {...(isLast ? { 'data-last-row': '' } : {})} className="rounded-xl border border-border/30 bg-muted/5 overflow-hidden">
                <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => updateVet(row.id, 'expanded', !row.expanded)}>
                  {row.expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  <input value={row.label} onChange={e => updateVet(row.id, 'label', e.target.value)} onClick={e => e.stopPropagation()}
                    placeholder={`Vet ${i + 1}`}
                    className="bg-transparent text-xs font-bold text-foreground border-none outline-none w-28 placeholder:text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground ml-auto">×{row.headcountStr || '1'}</span>
                  {vr && <span className="text-[10px] text-green-400 font-bold ml-2">{fmt(vr.earnings)}</span>}
                  <button type="button" onClick={e => { e.stopPropagation(); removeVet(row.id); }} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {row.expanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <CountInput small value={row.headcountStr} onChange={v => updateVet(row.id, 'headcountStr', v)} label="Headcount" placeholder="1" />
                      <CurrencyInput small value={row.avgActiveStr} onChange={v => updateVet(row.id, 'avgActiveStr', v)} label="Avg Active Rev" placeholder="250,000" />
                    </div>
                    <CurrencyInput small value={row.prevSummerStr} onChange={v => updateVet(row.id, 'prevSummerStr', v)} label="Previous Summer Rev" icon={Shield} placeholder="Optional" hint="Locks in higher bracket if it exceeds current" />
                    <Collapsible>
                      <CollapsibleTrigger className="text-[9px] text-muted-foreground/60 hover:text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <ChevronDown className="w-2.5 h-2.5" /> Override Assumptions
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2">
                          <PctInput small value={row.attritionStr} onChange={v => updateVet(row.id, 'attritionStr', v)} label="Attrition %" hint={`Global: ${assumptions.vetAttrition}%`} />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    {vr && vr.earnings > 0 && (
                      <div className="p-2 rounded-lg bg-muted/10 border border-border/15 space-y-1 text-[10px] font-mono">
                        <div className="flex justify-between"><span className="text-muted-foreground">Active after attrition</span><span>{vr.adjustedCount} vets</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Active Revenue</span><span>{fmt(vr.adjustedActiveRevenue)}</span></div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vet Commission {vr.usedPrevSummer ? '(prev summer)' : ''}</span>
                          <span>{pct(vr.vetCommission)}</span>
                        </div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Net Spread</span><span>{pct(vr.netSpread)}</span></div>
                        <div className="flex justify-between font-bold text-green-400 border-t border-border/20 pt-1"><span>Contribution</span><span>{fmt(vr.earnings)}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== TEAMS ====== */}
      <div className="glass-card rounded-2xl p-4 mb-6 border-l-4 border-l-purple-500/40" ref={teamSectionRef}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Teams</h3>
            <InfoTip text="Teams with their own team lead. You earn the override spread: your deal minus their team deal." />
          </div>
          <button type="button" onClick={addTeam} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider hover:bg-purple-500/20 transition-all border border-purple-500/20">
            <Plus className="w-3 h-3" /> Add Team
          </button>
        </div>

        {teamRowStates.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No teams added. Tap "Add Team" to model team override earnings.</p>
        )}

        {teamRows.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded-lg bg-purple-500/5 border border-purple-500/10 text-[10px]">
            <span className="text-muted-foreground uppercase font-semibold">Team Subtotal</span>
            <span className="text-purple-400 font-bold">{fmt(result.totalTeamEarnings)}</span>
          </div>
        )}

        <div className="space-y-3">
          {teamRowStates.map((t, i) => {
            const tr = result.teamResults[i];
            const isLast = i === teamRowStates.length - 1;
            return (
              <div key={t.id} {...(isLast ? { 'data-last-row': '' } : {})} className="rounded-xl border border-border/30 bg-muted/5 overflow-hidden">
                <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => updateTeam(t.id, 'expanded', !t.expanded)}>
                  {t.expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  <input value={t.name} onChange={e => updateTeam(t.id, 'name', e.target.value)} onClick={e => e.stopPropagation()}
                    className="bg-transparent text-xs font-bold text-foreground border-none outline-none w-28" />
                  {tr && (
                    <div className="ml-auto flex items-center gap-3 text-[10px]">
                      <span className="text-muted-foreground">Deal: <span className="text-foreground font-bold">{pct(tr.teamLeadDeal)}</span></span>
                      <span className="text-muted-foreground">Spread: <span className="text-foreground font-bold">{pct(tr.overrideSpread)}</span></span>
                      <span className="text-purple-400 font-bold">{fmt(tr.earnings)}</span>
                    </div>
                  )}
                  <button type="button" onClick={e => { e.stopPropagation(); removeTeam(t.id); }} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>

                {t.expanded && (
                  <div className="px-3 pb-3 space-y-2.5 border-t border-border/20 pt-3">
                    {/* Revenue mode toggle */}
                    <div className="flex gap-1 p-0.5 rounded-lg bg-muted/30 border border-border/30 w-fit">
                      <button type="button" onClick={() => updateTeam(t.id, 'useManualRevenue', false)}
                        className={cn("px-2.5 py-1 text-[9px] font-bold rounded-md transition-all uppercase tracking-wider",
                          !t.useManualRevenue ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
                        )}>Rep-Based</button>
                      <button type="button" onClick={() => updateTeam(t.id, 'useManualRevenue', true)}
                        className={cn("px-2.5 py-1 text-[9px] font-bold rounded-md transition-all uppercase tracking-wider",
                          t.useManualRevenue ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
                        )}>Manual Revenue</button>
                    </div>

                    {t.useManualRevenue ? (
                      <CurrencyInput small value={t.manualActiveStr} onChange={v => updateTeam(t.id, 'manualActiveStr', v)} label="Total Team Active Revenue" icon={DollarSign} placeholder="e.g. 1,000,000" />
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <CountInput small value={t.numRookiesStr} onChange={v => updateTeam(t.id, 'numRookiesStr', v)} label="# Rookies" placeholder="5" />
                          <CountInput small value={t.numVetsStr} onChange={v => updateTeam(t.id, 'numVetsStr', v)} label="# Vets" placeholder="0" />
                          <CurrencyInput small value={t.avgRookieServicedStr} onChange={v => updateTeam(t.id, 'avgRookieServicedStr', v)} label="Avg Rookie Serviced" placeholder="150,000" />
                          <CurrencyInput small value={t.avgVetActiveStr} onChange={v => updateTeam(t.id, 'avgVetActiveStr', v)} label="Avg Vet Active" placeholder="250,000" />
                        </div>
                        <Collapsible>
                          <CollapsibleTrigger className="text-[9px] text-muted-foreground/60 hover:text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <ChevronDown className="w-2.5 h-2.5" /> Override Assumptions
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <PctInput small value={t.rookieAttrStr} onChange={v => updateTeam(t.id, 'rookieAttrStr', v)} label="Rookie Attr %" />
                              <PctInput small value={t.vetAttrStr} onChange={v => updateTeam(t.id, 'vetAttrStr', v)} label="Vet Attr %" />
                              <PctInput small value={t.cancelStr} onChange={v => updateTeam(t.id, 'cancelStr', v)} label="Cancel %" />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </>
                    )}

                    {tr && tr.teamActiveRevenue > 0 && (
                      <div className="p-2 rounded-lg bg-muted/10 border border-border/15 space-y-1 text-[10px] font-mono">
                        <div className="flex justify-between"><span className="text-muted-foreground">Team Active Revenue</span><span>{fmt(tr.teamActiveRevenue)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Team Lead Deal</span><span>{pct(tr.teamLeadDeal)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Your Deal</span><span>{pct(result.topDeal)}</span></div>
                        <div className="flex justify-between font-bold text-foreground border-t border-border/20 pt-1"><span>Override Spread</span><span>{pct(tr.overrideSpread)}</span></div>
                        <div className="flex justify-between font-bold text-purple-400"><span>Contribution</span><span>{fmt(tr.earnings)}</span></div>
                        {tr.adjustedHeadcount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Active Headcount</span><span>{tr.adjustedHeadcount}</span></div>}
                        {tr.revPerRep > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Rev / Active Rep</span><span>{fmt(tr.revPerRep)}</span></div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== ADVANCED ASSUMPTIONS ====== */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between glass-card rounded-xl px-4 py-3 mb-4 group">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Advanced Assumptions</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="glass-card rounded-2xl p-4 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <PctInput value={String(assumptions.rookieAttrition)} onChange={v => setAssumptions(a => ({ ...a, rookieAttrition: parseFloat(v) || 0 }))} label="Rookie Attrition" hint="Default fall-off rate" />
              <PctInput value={String(assumptions.vetAttrition)} onChange={v => setAssumptions(a => ({ ...a, vetAttrition: parseFloat(v) || 0 }))} label="Vet Attrition" hint="Default fall-off rate" />
              <PctInput value={String(assumptions.cancellationReduction)} onChange={v => setAssumptions(a => ({ ...a, cancellationReduction: parseFloat(v) || 0 }))} label="Cancellation Reduction" hint="Serviced → active" />
              <PctInput value={String(assumptions.incentiveFee)} onChange={v => setAssumptions(a => ({ ...a, incentiveFee: parseFloat(v) || 0 }))} label="Incentive Fee" hint="Deducted from spread" />
              <PctInput value={String(assumptions.housingCost)} onChange={v => setAssumptions(a => ({ ...a, housingCost: parseFloat(v) || 0 }))} label="Housing / Cost Drag" hint="Deducted from spread" />
            </div>
            <div className="mt-3 space-y-1 text-[10px] text-muted-foreground">
              <p><strong>Serviced Revenue</strong> = total revenue sold before cancellations</p>
              <p><strong>Active Revenue</strong> = serviced minus cancellation/service reduction</p>
              <p><strong>Marketing Deal</strong> = your top-level % based on total system active revenue</p>
              <p><strong>Commission</strong> = what the rep earns (rookie or vet scale)</p>
              <p><strong>Override Spread</strong> = your deal minus a team lead's deal</p>
              <p><strong>Direct Spread</strong> = your deal minus rep commission minus fees</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ====== OPPORTUNITY MAP + INSIGHTS ====== */}
      {hasData && (
        <div className="space-y-3">
          {/* Opportunity Map */}
          {(opportunityMap.structural.attrition > 500 || controllableTotal > 500) && (
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Growth Levers</h3>
              </div>

              {/* Structural losses */}
              {opportunityMap.structural.attrition > 500 && (
                <div className="mb-3">
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider mb-1.5">Structural Losses (expected)</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {opportunityMap.structural.attrition > 0 && (
                      <div className="rounded-lg p-2 bg-muted/10 border border-border/15 text-center">
                        <p className="text-muted-foreground uppercase">Attrition</p>
                        <p className="text-foreground/70 font-bold">{fmt(opportunityMap.structural.attrition)}</p>
                      </div>
                    )}
                    {opportunityMap.structural.cancellations > 0 && (
                      <div className="rounded-lg p-2 bg-muted/10 border border-border/15 text-center">
                        <p className="text-muted-foreground uppercase">Cancellations</p>
                        <p className="text-foreground/70 font-bold">{fmt(opportunityMap.structural.cancellations)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Controllable upside */}
              {controllableTotal > 500 && (
                <div>
                  <p className="text-[9px] text-primary uppercase font-semibold tracking-wider mb-1.5">Controllable Upside</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                    {opportunityMap.controllable.betterRetention > 0 && (
                      <div className="rounded-lg p-2 bg-primary/5 border border-primary/10 text-center">
                        <p className="text-muted-foreground uppercase">Better Retention (+10%)</p>
                        <p className="text-primary font-bold">{fmt(opportunityMap.controllable.betterRetention)}</p>
                      </div>
                    )}
                    {opportunityMap.controllable.improvedProduction > 0 && (
                      <div className="rounded-lg p-2 bg-primary/5 border border-primary/10 text-center">
                        <p className="text-muted-foreground uppercase">Rookie Prod (+15%)</p>
                        <p className="text-primary font-bold">{fmt(opportunityMap.controllable.improvedProduction)}</p>
                      </div>
                    )}
                    {opportunityMap.controllable.weakTeams > 0 && (
                      <div className="rounded-lg p-2 bg-primary/5 border border-primary/10 text-center">
                        <p className="text-muted-foreground uppercase">Normalize Teams</p>
                        <p className="text-primary font-bold">{fmt(opportunityMap.controllable.weakTeams)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Insights</h3>
              </div>
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className={cn("flex items-start gap-2 p-2.5 rounded-lg text-xs border",
                    ins.type === 'controllable' ? "bg-primary/5 border-primary/10 text-primary" :
                    ins.type === 'structural' ? "bg-muted/10 border-border/20 text-muted-foreground" :
                    "bg-muted/10 border-border/20 text-foreground"
                  )}>
                    {ins.type === 'controllable' ? <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" /> :
                     ins.type === 'structural' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> :
                     <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    <span>{ins.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What-If */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">What-If Scenarios</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: '+1 Direct Rookie', apply: addRookie },
                { label: '+1 Direct Vet', apply: addVet },
                { label: '+1 New Team', apply: addTeam },
                { label: 'Reduce Attrition 5%', apply: () => setAssumptions(a => ({ ...a, rookieAttrition: Math.max(0, a.rookieAttrition - 5), vetAttrition: Math.max(0, a.vetAttrition - 5) })) },
                { label: 'Better Retention 5%', apply: () => setAssumptions(a => ({ ...a, cancellationReduction: Math.max(0, a.cancellationReduction - 5) })) },
              ].map(s => (
                <button type="button" key={s.label} onClick={s.apply}
                  className="p-2.5 rounded-lg border border-border/30 bg-muted/5 text-[10px] font-bold text-foreground uppercase tracking-wider hover:bg-primary/5 hover:border-primary/20 transition-all text-center">
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
