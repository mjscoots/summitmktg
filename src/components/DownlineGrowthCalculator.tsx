import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
const fmtInput = (s: string) => { const c = s.replace(/[^0-9]/g, ''); if (!c) return ''; const n = parseInt(c); return isNaN(n) ? '' : n.toLocaleString(); };

// Animated number
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

const CurrencyInput = ({ value, onChange, placeholder, label, hint, icon: Icon }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; hint?: string; icon?: any;
}) => (
  <div>
    {label && (
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
      </div>
    )}
    {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <input type="text" inputMode="numeric" value={value} onChange={e => onChange(fmtInput(e.target.value))} placeholder={placeholder || "0"}
        className="w-full h-9 pl-7 pr-3 rounded-lg border border-border bg-input text-foreground text-sm font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
    </div>
  </div>
);

const CountInput = ({ value, onChange, placeholder, label, hint, icon: Icon }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; hint?: string; icon?: any;
}) => (
  <div>
    {label && (
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
      </div>
    )}
    {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
    <input type="text" inputMode="numeric" value={value} onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))} placeholder={placeholder || "0"}
      className="w-full h-9 px-3 rounded-lg border border-border bg-input text-foreground text-sm font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
  </div>
);

const PctInput = ({ value, onChange, label, hint }: {
  value: string; onChange: (v: string) => void; label?: string; hint?: string;
}) => (
  <div>
    {label && <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{label}</span>}
    {hint && <p className="text-[10px] text-muted-foreground mb-0.5">{hint}</p>}
    <div className="relative">
      <input type="text" inputMode="numeric" value={value} onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="25"
        className="w-full h-9 px-3 pr-7 rounded-lg border border-border bg-input text-foreground text-sm font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
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

const RevenueMethodToggle = ({ method, onChange }: { method: 'total' | 'perRep'; onChange: (m: 'total' | 'perRep') => void }) => (
  <div className="flex gap-1 p-0.5 rounded-lg bg-muted/30 border border-border/30 w-fit mb-2">
    {[{ key: 'total' as const, label: 'Total Revenue' }, { key: 'perRep' as const, label: 'Per Rep Avg' }].map(o => (
      <button key={o.key} onClick={() => onChange(o.key)}
        className={cn("px-2.5 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
          method === o.key ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
        )}>{o.label}</button>
    ))}
  </div>
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

interface DirectRookiesData {
  count: number;
  revenueMethod: 'total' | 'perRep';
  totalServicedRevenue: number;
  avgServicedRevenue: number;
}

interface DirectVetsData {
  count: number;
  revenueMethod: 'total' | 'perRep';
  totalActiveRevenue: number;
  avgActiveRevenue: number;
  previousSummerRevenue: number; // per vet, for bracket override
}

interface TeamData {
  id: string;
  name: string;
  revenueMethod: 'total' | 'perRep';
  totalActiveRevenue: number;
  numRookies: number;
  numVets: number;
  avgRookieServiced: number;
  avgVetActive: number;
  rookieAttrition: number;
  vetAttrition: number;
  cancellation: number;
}

// ===================== CALCULATION ENGINE =====================

function calcDirectRookies(d: DirectRookiesData, a: Assumptions, topDeal: number) {
  const adjustedCount = Math.round(d.count * (1 - a.rookieAttrition / 100));
  const totalServiced = d.revenueMethod === 'total' ? d.totalServicedRevenue : d.count * d.avgServicedRevenue;
  const perRookieServiced = d.count > 0 ? totalServiced / d.count : 0;
  // Active = serviced * (1 - cancellation)
  const activeRevenue = totalServiced * (1 - a.cancellationReduction / 100);
  const adjustedActiveRevenue = activeRevenue * (1 - a.rookieAttrition / 100);

  const rookieCommission = getRookieRate(perRookieServiced);
  const grossSpread = topDeal - rookieCommission;
  const netSpread = Math.max(0, grossSpread - a.incentiveFee / 100 - a.housingCost / 100);
  const earnings = adjustedActiveRevenue * netSpread;

  return {
    adjustedCount, totalServiced, perRookieServiced, activeRevenue, adjustedActiveRevenue,
    rookieCommission, grossSpread, netSpread, earnings,
  };
}

function calcDirectVets(d: DirectVetsData, a: Assumptions, topDeal: number) {
  const adjustedCount = Math.round(d.count * (1 - a.vetAttrition / 100));
  const totalActive = d.revenueMethod === 'total' ? d.totalActiveRevenue : d.count * d.avgActiveRevenue;
  const perVetActive = d.count > 0 ? totalActive / d.count : 0;
  const adjustedActiveRevenue = totalActive * (1 - a.vetAttrition / 100);

  // Vet commission: use higher of current active or previous summer
  const currentBracketRev = perVetActive;
  const prevBracketRev = d.previousSummerRevenue;
  const effectiveRev = Math.max(currentBracketRev, prevBracketRev);
  const vetCommission = getVetRate(effectiveRev);
  const usedPrevSummer = prevBracketRev > currentBracketRev && prevBracketRev > 0;

  const grossSpread = topDeal - vetCommission;
  const netSpread = Math.max(0, grossSpread - a.incentiveFee / 100 - a.housingCost / 100);
  const earnings = adjustedActiveRevenue * netSpread;

  return {
    adjustedCount, totalActive, perVetActive, adjustedActiveRevenue,
    vetCommission, usedPrevSummer, effectiveRev, grossSpread, netSpread, earnings,
  };
}

function calcTeam(t: TeamData, topDeal: number) {
  let teamActiveRevenue: number;
  if (t.revenueMethod === 'total') {
    teamActiveRevenue = t.totalActiveRevenue;
  } else {
    const rookieServiced = t.numRookies * t.avgRookieServiced;
    const rookieActive = rookieServiced * (1 - t.cancellation / 100) * (1 - t.rookieAttrition / 100);
    const vetActive = t.numVets * t.avgVetActive * (1 - t.vetAttrition / 100);
    teamActiveRevenue = rookieActive + vetActive;
  }
  const teamLeadDeal = getMktgRate(teamActiveRevenue);
  const overrideSpread = Math.max(0, topDeal - teamLeadDeal);
  const earnings = teamActiveRevenue * overrideSpread;
  const totalHeadcount = t.revenueMethod === 'perRep' ? t.numRookies + t.numVets : 0;
  const adjustedHeadcount = t.revenueMethod === 'perRep'
    ? Math.round(t.numRookies * (1 - t.rookieAttrition / 100)) + Math.round(t.numVets * (1 - t.vetAttrition / 100))
    : 0;

  return {
    teamActiveRevenue, teamLeadDeal, overrideSpread, earnings,
    totalHeadcount, adjustedHeadcount,
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
  directRookies: DirectRookiesData,
  directVets: DirectVetsData,
  teams: TeamData[],
  assumptions: Assumptions,
) {
  // Personal
  const personalResult = calcPersonal(personal, assumptions);

  // Step 1: compute total system active revenue for top-level marketing deal
  const rookieServiced = directRookies.revenueMethod === 'total' ? directRookies.totalServicedRevenue : directRookies.count * directRookies.avgServicedRevenue;
  const rookieActive = rookieServiced * (1 - assumptions.cancellationReduction / 100) * (1 - assumptions.rookieAttrition / 100);
  const vetActive = (directVets.revenueMethod === 'total' ? directVets.totalActiveRevenue : directVets.count * directVets.avgActiveRevenue) * (1 - assumptions.vetAttrition / 100);

  let teamActiveTotal = 0;
  teams.forEach(t => {
    const r = calcTeam(t, 0);
    teamActiveTotal += r.teamActiveRevenue;
  });

  // Total system active = all downline active (personal is NOT included in marketing deal calc — marketing deal is based on system/team revenue)
  const totalSystemActive = rookieActive + vetActive + teamActiveTotal;
  const topDeal = getMktgRate(totalSystemActive);

  // Step 2: recalc with real top deal
  const drResult = calcDirectRookies(directRookies, assumptions, topDeal);
  const dvResult = calcDirectVets(directVets, assumptions, topDeal);
  const finalTeamResults = teams.map(t => calcTeam(t, topDeal));
  const totalTeamEarnings = finalTeamResults.reduce((s, r) => s + r.earnings, 0);

  const totalServiced = rookieServiced + (directVets.revenueMethod === 'total' ? directVets.totalActiveRevenue : directVets.count * directVets.avgActiveRevenue) + teamActiveTotal;
  const totalDownlineEarnings = drResult.earnings + dvResult.earnings + totalTeamEarnings;
  const totalEarnings = personalResult.earnings + totalDownlineEarnings;

  // Weighted spread (downline only)
  const weightedSpread = totalSystemActive > 0 ? totalDownlineEarnings / totalSystemActive : 0;

  // Active headcount
  const totalHeadcount = drResult.adjustedCount + dvResult.adjustedCount + finalTeamResults.reduce((s, r) => s + r.adjustedHeadcount, 0);

  return {
    topDeal, totalSystemActive, totalServiced, totalEarnings, totalDownlineEarnings, weightedSpread, totalHeadcount,
    personalResult, drResult, dvResult, teamResults: finalTeamResults,
    rookieActive, vetActive, teamActiveTotal,
  };
}

// ===================== INSIGHTS =====================

interface Insight { text: string; type: 'opportunity' | 'warning' | 'tip'; value?: number }

function generateInsights(
  result: ReturnType<typeof calcAll>,
  directRookies: DirectRookiesData,
  directVets: DirectVetsData,
  teams: TeamData[],
  assumptions: Assumptions,
): Insight[] {
  const insights: Insight[] = [];
  const { drResult, dvResult, teamResults, totalEarnings, topDeal } = result;

  // Compare segments
  const segments = [
    { name: 'Direct Rookies', earnings: drResult.earnings },
    { name: 'Direct Vets', earnings: dvResult.earnings },
    ...teamResults.map((r, i) => ({ name: teams[i]?.name || `Team ${i + 1}`, earnings: r.earnings })),
  ].filter(s => s.earnings > 0);

  if (segments.length > 1) {
    const sorted = [...segments].sort((a, b) => a.earnings - b.earnings);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    insights.push({ text: `Strongest segment: ${strongest.name} (${fmt(strongest.earnings)}). Weakest: ${weakest.name} (${fmt(weakest.earnings)}).`, type: 'tip' });
  }

  // Rookie vs vet spread comparison
  if (drResult.earnings > 0 && dvResult.earnings > 0) {
    if (drResult.netSpread > dvResult.netSpread) {
      insights.push({ text: `Direct rookies are creating more spread (${pct(drResult.netSpread)}) than direct vets (${pct(dvResult.netSpread)}).`, type: 'tip' });
    }
  }

  // Attrition impact
  if (directRookies.count > 0) {
    const noAttritionAssumptions = { ...assumptions, rookieAttrition: 0 };
    const noAttrResult = calcAll(directRookies, directVets, teams, noAttritionAssumptions);
    const attritionCost = noAttrResult.totalEarnings - totalEarnings;
    if (attritionCost > 1000) {
      insights.push({ text: `Rookie attrition is costing you ${fmt(attritionCost)} in projected earnings.`, type: 'warning', value: attritionCost });
    }
  }

  // Cancellation impact
  if (result.totalServiced > 0) {
    const noCancelAssumptions = { ...assumptions, cancellationReduction: 0 };
    const noCancelResult = calcAll(directRookies, directVets, teams, noCancelAssumptions);
    const cancelCost = noCancelResult.totalEarnings - totalEarnings;
    if (cancelCost > 1000) {
      insights.push({ text: `Cancellations are reducing your earnings by ${fmt(cancelCost)}.`, type: 'warning', value: cancelCost });
    }
  }

  // Team override opportunities
  if (teamResults.length > 1) {
    const weakTeamIdx = teamResults.reduce((minI, r, i, arr) => r.earnings < arr[minI].earnings ? i : minI, 0);
    const weakTeam = teams[weakTeamIdx];
    const weakResult = teamResults[weakTeamIdx];
    if (weakTeam && weakResult) {
      // Next deal bracket
      const nextTier = MARKETING_DEAL_TIERS.find(t => t.min > weakResult.teamActiveRevenue);
      if (nextTier) {
        const gap = nextTier.min - weakResult.teamActiveRevenue;
        insights.push({ text: `${weakTeam.name} needs ${fmt(gap)} more active revenue to hit the next deal bracket (${pct(nextTier.rate)}).`, type: 'opportunity', value: gap });
      }
    }
  }

  // +2 producing vets vs +4 low rookies
  if (directRookies.count > 0 && directVets.count > 0) {
    const perVetAvg = directVets.count > 0 ? (directVets.revenueMethod === 'total' ? directVets.totalActiveRevenue / directVets.count : directVets.avgActiveRevenue) : 250000;
    const add2Vets = { ...directVets, count: directVets.count + 2, totalActiveRevenue: directVets.totalActiveRevenue + 2 * perVetAvg };
    const add4Rookies = { ...directRookies, count: directRookies.count + 4, totalServicedRevenue: directRookies.totalServicedRevenue + 4 * 100000 };
    const v2Result = calcAll(directRookies, add2Vets as any, teams, assumptions);
    const r4Result = calcAll(add4Rookies as any, directVets, teams, assumptions);
    const v2Delta = v2Result.totalEarnings - totalEarnings;
    const r4Delta = r4Result.totalEarnings - totalEarnings;
    if (v2Delta > r4Delta && v2Delta > 1000) {
      insights.push({ text: `Adding 2 producing direct vets (+${fmt(v2Delta)}) outperforms adding 4 low-producing rookies (+${fmt(r4Delta)}).`, type: 'tip' });
    }
  }

  return insights;
}

function calcLeftOnTable(
  result: ReturnType<typeof calcAll>,
  directRookies: DirectRookiesData,
  directVets: DirectVetsData,
  teams: TeamData[],
  assumptions: Assumptions,
): { total: number; attrition: number; cancellation: number; weakTeams: number } {
  // Attrition cost
  const noAttr = calcAll(directRookies, directVets, teams, { ...assumptions, rookieAttrition: 0, vetAttrition: 0 });
  const attrition = noAttr.totalEarnings - result.totalEarnings;

  // Cancellation cost
  const noCancel = calcAll(directRookies, directVets, teams, { ...assumptions, cancellationReduction: 0 });
  const cancellation = noCancel.totalEarnings - result.totalEarnings;

  // Weak teams cost (normalize to best)
  let weakTeams = 0;
  if (result.teamResults.length > 1) {
    const best = Math.max(...result.teamResults.map(r => r.revPerRep));
    const normalizedTeams = teams.map((t, i) => {
      if (t.revenueMethod === 'total') {
        const ratio = best > 0 && result.teamResults[i].revPerRep > 0 ? best / result.teamResults[i].revPerRep : 1;
        return { ...t, totalActiveRevenue: t.totalActiveRevenue * ratio };
      }
      return t;
    });
    const normalizedResult = calcAll(directRookies, directVets, normalizedTeams, assumptions);
    weakTeams = Math.max(0, normalizedResult.totalEarnings - result.totalEarnings);
  }

  return { total: attrition + cancellation + weakTeams, attrition, cancellation, weakTeams };
}

// ===================== MAIN COMPONENT =====================

let teamCounter = 1;

export default function DownlineGrowthCalculator() {
  // --- Assumptions ---
  const [assumptions, setAssumptions] = useState<Assumptions>({
    rookieAttrition: 25, vetAttrition: 10, cancellationReduction: 25,
    incentiveFee: 2, housingCost: 3,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- Direct Rookies ---
  const [drCount, setDrCount] = useState('');
  const [drMethod, setDrMethod] = useState<'total' | 'perRep'>('perRep');
  const [drTotalStr, setDrTotalStr] = useState('');
  const [drAvgStr, setDrAvgStr] = useState('150,000');

  // --- Direct Vets ---
  const [dvCount, setDvCount] = useState('');
  const [dvMethod, setDvMethod] = useState<'total' | 'perRep'>('perRep');
  const [dvTotalStr, setDvTotalStr] = useState('');
  const [dvAvgStr, setDvAvgStr] = useState('250,000');
  const [dvPrevSummerStr, setDvPrevSummerStr] = useState('');

  // --- Teams ---
  const [teams, setTeams] = useState<Array<{
    id: string; name: string; revenueMethod: 'total' | 'perRep';
    totalActiveStr: string; numRookiesStr: string; numVetsStr: string;
    avgRookieServicedStr: string; avgVetActiveStr: string;
    rookieAttrStr: string; vetAttrStr: string; cancelStr: string;
    expanded: boolean;
  }>>([]);

  // Build data
  const directRookies: DirectRookiesData = useMemo(() => ({
    count: parseNum(drCount),
    revenueMethod: drMethod,
    totalServicedRevenue: drMethod === 'total' ? parseNum(drTotalStr) : parseNum(drCount) * (parseNum(drAvgStr) || 150000),
    avgServicedRevenue: parseNum(drAvgStr) || 150000,
  }), [drCount, drMethod, drTotalStr, drAvgStr]);

  const directVets: DirectVetsData = useMemo(() => ({
    count: parseNum(dvCount),
    revenueMethod: dvMethod,
    totalActiveRevenue: dvMethod === 'total' ? parseNum(dvTotalStr) : parseNum(dvCount) * (parseNum(dvAvgStr) || 250000),
    avgActiveRevenue: parseNum(dvAvgStr) || 250000,
    previousSummerRevenue: parseNum(dvPrevSummerStr),
  }), [dvCount, dvMethod, dvTotalStr, dvAvgStr, dvPrevSummerStr]);

  const teamData: TeamData[] = useMemo(() => teams.map(t => ({
    id: t.id, name: t.name || 'Unnamed',
    revenueMethod: t.revenueMethod,
    totalActiveRevenue: parseNum(t.totalActiveStr),
    numRookies: parseNum(t.numRookiesStr),
    numVets: parseNum(t.numVetsStr),
    avgRookieServiced: parseNum(t.avgRookieServicedStr) || 150000,
    avgVetActive: parseNum(t.avgVetActiveStr) || 250000,
    rookieAttrition: parseFloat(t.rookieAttrStr) || assumptions.rookieAttrition,
    vetAttrition: parseFloat(t.vetAttrStr) || assumptions.vetAttrition,
    cancellation: parseFloat(t.cancelStr) || assumptions.cancellationReduction,
  })), [teams, assumptions]);

  const result = useMemo(() => calcAll(directRookies, directVets, teamData, assumptions), [directRookies, directVets, teamData, assumptions]);
  const insights = useMemo(() => generateInsights(result, directRookies, directVets, teamData, assumptions), [result, directRookies, directVets, teamData, assumptions]);
  const leftOnTable = useMemo(() => calcLeftOnTable(result, directRookies, directVets, teamData, assumptions), [result, directRookies, directVets, teamData, assumptions]);

  const addTeam = () => {
    teamCounter++;
    setTeams(p => [...p, {
      id: String(teamCounter), name: `Team ${teamCounter}`, revenueMethod: 'total',
      totalActiveStr: '', numRookiesStr: '', numVetsStr: '',
      avgRookieServicedStr: '150,000', avgVetActiveStr: '250,000',
      rookieAttrStr: String(assumptions.rookieAttrition), vetAttrStr: String(assumptions.vetAttrition),
      cancelStr: String(assumptions.cancellationReduction), expanded: true,
    }]);
  };

  const removeTeam = (id: string) => setTeams(p => p.filter(t => t.id !== id));
  const updateTeam = (id: string, field: string, value: any) => setTeams(p => p.map(t => t.id === id ? { ...t, [field]: value } : t));

  const hasData = directRookies.count > 0 || directVets.count > 0 || teamData.some(t => t.totalActiveRevenue > 0 || t.numRookies > 0 || t.numVets > 0);

  // Find strongest / weakest team
  const teamResultsSorted = [...result.teamResults].map((r, i) => ({ ...r, team: teamData[i] })).filter(r => r.earnings > 0);
  const strongestTeam = teamResultsSorted.length > 0 ? teamResultsSorted.reduce((a, b) => a.earnings > b.earnings ? a : b) : null;
  const weakestTeam = teamResultsSorted.length > 1 ? teamResultsSorted.reduce((a, b) => a.earnings < b.earnings ? a : b) : null;

  // Biggest leak
  const leaks = [
    { label: 'Attrition', value: leftOnTable.attrition },
    { label: 'Cancellations', value: leftOnTable.cancellation },
    { label: 'Weak Teams', value: leftOnTable.weakTeams },
  ].sort((a, b) => b.value - a.value);
  const biggestLeak = leaks[0]?.value > 0 ? leaks[0] : null;

  // Biggest opportunity
  const opportunities = insights.filter(i => i.type === 'opportunity' && i.value);
  const biggestOpp = opportunities.sort((a, b) => (b.value || 0) - (a.value || 0))[0];

  return (
    <section className="w-full mb-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight leading-tight">
            Downline Growth Calculator
          </h2>
          <p className="text-[10px] text-muted-foreground">Model your system. Find your biggest lever.</p>
        </div>
      </div>

      {/* ====== 1. KPI SUMMARY ====== */}
      {hasData && (
        <div className="glass-card rounded-2xl p-4 mb-4">
          {/* Big number */}
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

          {/* Segments row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'From Rookies', value: fmt(result.drResult.earnings), color: 'text-blue-400' },
              { label: 'From Vets', value: fmt(result.dvResult.earnings), color: 'text-green-400' },
              { label: 'From Teams', value: fmt(result.teamResults.reduce((s, r) => s + r.earnings, 0)), color: 'text-purple-400' },
              { label: 'Leaving on Table', value: fmt(leftOnTable.total), color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-2 text-center border border-border/10 bg-muted/5">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className={cn("text-xs font-bold mt-0.5", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Strongest / weakest / leak / opp */}
          {(strongestTeam || biggestLeak) && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              {strongestTeam && <div className="flex items-center gap-1 text-green-400"><ArrowUpRight className="w-3 h-3" /> Strongest: {strongestTeam.team?.name}</div>}
              {weakestTeam && <div className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" /> Weakest: {weakestTeam.team?.name}</div>}
              {biggestLeak && <div className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> Biggest Leak: {biggestLeak.label} ({fmt(biggestLeak.value)})</div>}
              {biggestOpp && <div className="flex items-center gap-1 text-blue-400"><Lightbulb className="w-3 h-3" /> {biggestOpp.text.slice(0, 60)}...</div>}
            </div>
          )}
        </div>
      )}

      {/* ====== 2. DIRECT REPS ====== */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        {/* Direct Rookies */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Rookies</h3>
            <InfoTip text="Rookies you personally manage. Commission based on serviced revenue. You earn your marketing deal minus their commission minus incentive and housing costs." />
          </div>
          <div className="space-y-2.5">
            <CountInput value={drCount} onChange={setDrCount} label="# of Rookies" icon={Users} placeholder="e.g. 5" />
            <RevenueMethodToggle method={drMethod} onChange={setDrMethod} />
            {drMethod === 'total' ? (
              <CurrencyInput value={drTotalStr} onChange={setDrTotalStr} label="Total Serviced Revenue" icon={DollarSign} placeholder="e.g. 750,000" hint="Total serviced revenue from all rookies" />
            ) : (
              <CurrencyInput value={drAvgStr} onChange={setDrAvgStr} label="Avg Serviced Revenue / Rookie" icon={DollarSign} placeholder="e.g. 150,000" />
            )}
          </div>
          {/* Mini breakdown */}
          {directRookies.count > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-muted/10 border border-border/20 space-y-1 text-[10px] font-mono">
              <div className="flex justify-between"><span className="text-muted-foreground">Active after attrition</span><span>{result.drResult.adjustedCount} reps</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active Revenue</span><span>{fmt(result.drResult.adjustedActiveRevenue)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rookie Commission</span><span>{pct(result.drResult.rookieCommission)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Your Deal</span><span>{pct(result.topDeal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gross Spread</span><span>{pct(result.drResult.grossSpread)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">− Incentive ({assumptions.incentiveFee}%) − Housing ({assumptions.housingCost}%)</span><span></span></div>
              <div className="flex justify-between font-bold text-foreground border-t border-border/20 pt-1"><span>Net Spread</span><span>{pct(result.drResult.netSpread)}</span></div>
              <div className="flex justify-between font-bold text-blue-400"><span>Earnings</span><span>{fmt(result.drResult.earnings)}</span></div>
            </div>
          )}
        </div>

        {/* Direct Vets */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Direct Vets</h3>
            <InfoTip text="Veterans you directly manage (no reps of their own). Their commission is based on active revenue, but previous summer production can lock in a higher bracket." />
          </div>
          <div className="space-y-2.5">
            <CountInput value={dvCount} onChange={setDvCount} label="# of Vets" icon={Users} placeholder="e.g. 2" />
            <RevenueMethodToggle method={dvMethod} onChange={setDvMethod} />
            {dvMethod === 'total' ? (
              <CurrencyInput value={dvTotalStr} onChange={setDvTotalStr} label="Total Active Revenue" icon={DollarSign} placeholder="e.g. 500,000" hint="Total active revenue from all direct vets" />
            ) : (
              <CurrencyInput value={dvAvgStr} onChange={setDvAvgStr} label="Avg Active Revenue / Vet" icon={DollarSign} placeholder="e.g. 250,000" />
            )}
            <CurrencyInput value={dvPrevSummerStr} onChange={setDvPrevSummerStr} label="Previous Summer Rev / Vet" icon={Shield} placeholder="Optional" hint="If higher than current, locks in the higher commission bracket" />
          </div>
          {directVets.count > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-muted/10 border border-border/20 space-y-1 text-[10px] font-mono">
              <div className="flex justify-between"><span className="text-muted-foreground">Active after attrition</span><span>{result.dvResult.adjustedCount} vets</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Active Revenue</span><span>{fmt(result.dvResult.adjustedActiveRevenue)}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vet Commission {result.dvResult.usedPrevSummer ? '(prev summer)' : ''}</span>
                <span>{pct(result.dvResult.vetCommission)}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Your Deal</span><span>{pct(result.topDeal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gross Spread</span><span>{pct(result.dvResult.grossSpread)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">− Incentive − Housing</span><span></span></div>
              <div className="flex justify-between font-bold text-foreground border-t border-border/20 pt-1"><span>Net Spread</span><span>{pct(result.dvResult.netSpread)}</span></div>
              <div className="flex justify-between font-bold text-green-400"><span>Earnings</span><span>{fmt(result.dvResult.earnings)}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* ====== 3. TEAMS ====== */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Teams</h3>
            <InfoTip text="Teams with their own team lead / marketing deal. You earn the override spread: your deal minus their team deal, applied to their active revenue." />
          </div>
          <button onClick={addTeam} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all border border-primary/20">
            <Plus className="w-3 h-3" /> Add Team
          </button>
        </div>

        {teams.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No teams added yet. Add a team to model override earnings.</p>
        )}

        <div className="space-y-3">
          {teams.map((t, i) => {
            const tr = result.teamResults[i];
            return (
              <div key={t.id} className="rounded-xl border border-border/30 bg-muted/5 overflow-hidden">
                {/* Team header */}
                <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => updateTeam(t.id, 'expanded', !t.expanded)}>
                  {t.expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  <input value={t.name} onChange={e => updateTeam(t.id, 'name', e.target.value)} onClick={e => e.stopPropagation()}
                    className="bg-transparent text-sm font-bold text-foreground border-none outline-none w-32" />
                  {tr && (
                    <div className="ml-auto flex items-center gap-3 text-[10px]">
                      <span className="text-muted-foreground">Deal: <span className="text-foreground font-bold">{pct(tr.teamLeadDeal)}</span></span>
                      <span className="text-muted-foreground">Spread: <span className="text-foreground font-bold">{pct(tr.overrideSpread)}</span></span>
                      <span className="text-purple-400 font-bold">{fmt(tr.earnings)}</span>
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); removeTeam(t.id); }} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>

                {t.expanded && (
                  <div className="px-3 pb-3 space-y-2.5 border-t border-border/20 pt-3">
                    <RevenueMethodToggle method={t.revenueMethod} onChange={m => updateTeam(t.id, 'revenueMethod', m)} />

                    {t.revenueMethod === 'total' ? (
                      <CurrencyInput value={t.totalActiveStr} onChange={v => updateTeam(t.id, 'totalActiveStr', v)} label="Total Team Active Revenue" icon={DollarSign} placeholder="e.g. 1,000,000" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <CountInput value={t.numRookiesStr} onChange={v => updateTeam(t.id, 'numRookiesStr', v)} label="# Rookies" placeholder="e.g. 5" />
                        <CountInput value={t.numVetsStr} onChange={v => updateTeam(t.id, 'numVetsStr', v)} label="# Vets" placeholder="e.g. 2" />
                        <CurrencyInput value={t.avgRookieServicedStr} onChange={v => updateTeam(t.id, 'avgRookieServicedStr', v)} label="Avg Rookie Serviced" placeholder="150,000" />
                        <CurrencyInput value={t.avgVetActiveStr} onChange={v => updateTeam(t.id, 'avgVetActiveStr', v)} label="Avg Vet Active" placeholder="250,000" />
                      </div>
                    )}

                    {/* Team breakdown */}
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

      {/* ====== 4. ADVANCED ASSUMPTIONS ====== */}
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
              <PctInput value={String(assumptions.rookieAttrition)} onChange={v => setAssumptions(a => ({ ...a, rookieAttrition: parseFloat(v) || 0 }))} label="Rookie Attrition" hint="Fall-off rate for rookies" />
              <PctInput value={String(assumptions.vetAttrition)} onChange={v => setAssumptions(a => ({ ...a, vetAttrition: parseFloat(v) || 0 }))} label="Vet Attrition" hint="Fall-off rate for vets" />
              <PctInput value={String(assumptions.cancellationReduction)} onChange={v => setAssumptions(a => ({ ...a, cancellationReduction: parseFloat(v) || 0 }))} label="Cancellation / Active Reduction" hint="Serviced → active reduction" />
              <PctInput value={String(assumptions.incentiveFee)} onChange={v => setAssumptions(a => ({ ...a, incentiveFee: parseFloat(v) || 0 }))} label="Incentive Fee" hint="Deducted from direct rep spread" />
              <PctInput value={String(assumptions.housingCost)} onChange={v => setAssumptions(a => ({ ...a, housingCost: parseFloat(v) || 0 }))} label="Housing / Cost Drag" hint="Deducted from direct rep spread" />
            </div>
            <div className="mt-3 space-y-1 text-[10px] text-muted-foreground">
              <p><strong>Serviced Revenue</strong> = total revenue written before cancellations</p>
              <p><strong>Active Revenue</strong> = serviced minus cancellation/service reduction</p>
              <p><strong>Marketing Deal</strong> = your top-level % based on total system active revenue</p>
              <p><strong>Commission</strong> = what the rep earns (rookie or vet scale)</p>
              <p><strong>Override Spread</strong> = your deal minus a team lead's deal (team earnings)</p>
              <p><strong>Direct Spread</strong> = your deal minus rep commission minus fees (direct rep earnings)</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ====== 5. INSIGHTS & SCENARIOS ====== */}
      {hasData && (
        <div className="space-y-3">
          {/* What You're Leaving on the Table */}
          {leftOnTable.total > 500 && (
            <div className="glass-card rounded-2xl p-4 border-l-4 border-red-400/60">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">What You're Leaving on the Table</h3>
              </div>
              <p className="text-2xl font-black text-red-400 mb-2">{fmt(leftOnTable.total)}</p>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {leftOnTable.attrition > 0 && (
                  <div className="rounded-lg p-2 bg-red-500/5 border border-red-500/10 text-center">
                    <p className="text-muted-foreground uppercase">Attrition</p>
                    <p className="text-red-400 font-bold">{fmt(leftOnTable.attrition)}</p>
                  </div>
                )}
                {leftOnTable.cancellation > 0 && (
                  <div className="rounded-lg p-2 bg-amber-500/5 border border-amber-500/10 text-center">
                    <p className="text-muted-foreground uppercase">Cancellations</p>
                    <p className="text-amber-400 font-bold">{fmt(leftOnTable.cancellation)}</p>
                  </div>
                )}
                {leftOnTable.weakTeams > 0 && (
                  <div className="rounded-lg p-2 bg-orange-500/5 border border-orange-500/10 text-center">
                    <p className="text-muted-foreground uppercase">Weak Teams</p>
                    <p className="text-orange-400 font-bold">{fmt(leftOnTable.weakTeams)}</p>
                  </div>
                )}
              </div>
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
                    ins.type === 'opportunity' ? "bg-blue-500/5 border-blue-500/10 text-blue-300" :
                    ins.type === 'warning' ? "bg-amber-500/5 border-amber-500/10 text-amber-300" :
                    "bg-muted/10 border-border/20 text-foreground"
                  )}>
                    {ins.type === 'opportunity' ? <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" /> :
                     ins.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> :
                     <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    <span>{ins.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scenario Cards */}
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">What-If Scenarios</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: '+1 Direct Rookie', apply: () => setDrCount(String(parseNum(drCount) + 1)) },
                { label: '+1 Direct Vet', apply: () => setDvCount(String(parseNum(dvCount) + 1)) },
                { label: '+1 New Team', apply: addTeam },
                { label: 'Reduce Attrition 5%', apply: () => setAssumptions(a => ({ ...a, rookieAttrition: Math.max(0, a.rookieAttrition - 5), vetAttrition: Math.max(0, a.vetAttrition - 5) })) },
                { label: 'Reduce Cancellations 5%', apply: () => setAssumptions(a => ({ ...a, cancellationReduction: Math.max(0, a.cancellationReduction - 5) })) },
                { label: 'Increase Rookie Avg 10%', apply: () => setDrAvgStr(fmtInput(String(Math.round((parseNum(drAvgStr) || 150000) * 1.1)))) },
              ].map(s => (
                <button key={s.label} onClick={s.apply}
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