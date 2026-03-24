import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  DollarSign, Users, TrendingUp, Plus, Trash2, Lightbulb,
  ArrowUpRight, ChevronDown, ChevronUp, Zap, Target, AlertTriangle,
  BarChart3, UserPlus, Percent
} from "lucide-react";

// ============= EXACT TIER TABLES (from VetCalculator) =============
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
  { min: 12500000, max: 14999999, rate: 0.76 },
  { min: 15000000, max: 19999999, rate: 0.78 },
  { min: 20000000, max: Infinity, rate: 0.80 },
];

const getRookieRate = (r: number) => (ROOKIE_COMMISSION_TIERS.find(t => r >= t.min && r <= t.max) || ROOKIE_COMMISSION_TIERS[0]).rate;
const getVetRate = (r: number) => (VET_COMMISSION_TIERS.find(t => r >= t.min && r <= t.max) || VET_COMMISSION_TIERS[0]).rate;
const getMktgRate = (r: number) => (MARKETING_DEAL_TIERS.find(t => r >= t.min && r <= t.max) || MARKETING_DEAL_TIERS[0]).rate;

const ATTRITION = 0.25;
const ROOKIE_INCENTIVE = 0.05;

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const parseNum = (s: string) => { const n = parseInt(s.replace(/[^0-9]/g, '') || '0'); return isNaN(n) ? 0 : n; };
const fmtInput = (s: string) => { const c = s.replace(/[^0-9]/g, ''); if (!c) return ''; const n = parseInt(c); return isNaN(n) ? '' : n.toLocaleString(); };

// Animated number
const AnimNum = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef<number>();
  useEffect(() => {
    const s = prev.current, e = value, dur = 350, t0 = performance.now();
    const go = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setDisplay(s + (e - s) * ease);
      if (p < 1) raf.current = requestAnimationFrame(go);
      else prev.current = e;
    };
    raf.current = requestAnimationFrame(go);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);
  return <span>{fmt(Math.round(display))}</span>;
};

// ============= CALCULATION ENGINE (exact vet calculator logic) =============
interface TeamData {
  id: string;
  name: string;
  reps: number;
  totalRevenue: number;
  avgRevenuePerRep: number;
  isManual: boolean; // manual avg or auto-calc
}

interface TeamResult {
  team: TeamData;
  grossRevenue: number;
  activeRevenue: number;
  mktgDealRate: number;
  rookieRate: number;
  grossSpread: number;
  netSpread: number;
  earnings: number;
  revenuePerRep: number;
}

function calcTeamEarnings(team: TeamData, overallMktgRate: number): TeamResult {
  const grossRevenue = team.totalRevenue;
  const activeRevenue = grossRevenue * (1 - ATTRITION);
  const avgRepActive = team.avgRevenuePerRep * (1 - ATTRITION);
  const rookieRate = getRookieRate(avgRepActive);
  const grossSpread = overallMktgRate - rookieRate;
  const netSpread = Math.max(0, grossSpread - ROOKIE_INCENTIVE);
  const earnings = activeRevenue * netSpread;
  return {
    team, grossRevenue, activeRevenue, mktgDealRate: overallMktgRate,
    rookieRate, grossSpread, netSpread, earnings,
    revenuePerRep: team.reps > 0 ? team.totalRevenue / team.reps : 0,
  };
}

function calcAll(personalRevenue: number, teams: TeamData[]) {
  // Personal
  const personalActive = personalRevenue * (1 - ATTRITION);
  const personalRate = getVetRate(personalActive);
  const personalEarnings = personalActive * personalRate;

  // Team totals
  const totalTeamGross = teams.reduce((s, t) => s + t.totalRevenue, 0);
  const totalTeamActive = totalTeamGross * (1 - ATTRITION);
  const overallMktgRate = getMktgRate(totalTeamActive);

  const teamResults = teams.map(t => calcTeamEarnings(t, overallMktgRate));
  const totalTeamEarnings = teamResults.reduce((s, r) => s + r.earnings, 0);
  const totalEarnings = personalEarnings + totalTeamEarnings;
  const totalReps = teams.reduce((s, t) => s + t.reps, 0);

  return {
    personalActive, personalRate, personalEarnings,
    totalTeamGross, totalTeamActive, overallMktgRate,
    teamResults, totalTeamEarnings, totalEarnings, totalReps,
  };
}

// ============= INSIGHTS ENGINE =============
function generateInsights(calc: ReturnType<typeof calcAll>, personalRevenue: number, teams: TeamData[]) {
  const insights: { text: string; type: 'opportunity' | 'warning' | 'tip'; value?: number }[] = [];
  if (teams.length === 0) return insights;

  const { teamResults, totalEarnings, overallMktgRate, totalReps } = calc;
  const sorted = [...teamResults].sort((a, b) => a.earnings - b.earnings);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  // What if weakest team increased by $100k?
  if (weakest && teams.length > 1) {
    const boosted = teams.map(t => t.id === weakest.team.id ? { ...t, totalRevenue: t.totalRevenue + 100000, avgRevenuePerRep: t.reps > 0 ? (t.totalRevenue + 100000) / t.reps : t.avgRevenuePerRep } : t);
    const boostedCalc = calcAll(personalRevenue, boosted);
    const delta = boostedCalc.totalEarnings - totalEarnings;
    if (delta > 0) {
      insights.push({ text: `If ${weakest.team.name} increased by $100k, you'd make ${fmt(delta)} more`, type: 'opportunity', value: delta });
    }
  }

  // What if +3 reps at current avg?
  if (totalReps > 0) {
    const avgRev = calc.totalTeamGross / totalReps;
    const newTeams = teams.map((t, i) => i === 0 ? { ...t, reps: t.reps + 3, totalRevenue: t.totalRevenue + avgRev * 3 } : t);
    const plusCalc = calcAll(personalRevenue, newTeams);
    const delta = plusCalc.totalEarnings - totalEarnings;
    if (delta > 0) {
      insights.push({ text: `Adding 3 reps at your current average adds ${fmt(delta)}`, type: 'opportunity', value: delta });
    }
  }

  // Headcount vs production diagnosis
  if (weakest && strongest && teams.length > 1) {
    const weakRevPerRep = weakest.revenuePerRep;
    const strongRevPerRep = strongest.revenuePerRep;
    if (weakRevPerRep < strongRevPerRep * 0.6) {
      insights.push({ text: `Your biggest issue is low production, not headcount — ${weakest.team.name} reps average ${fmt(weakRevPerRep)} vs ${fmt(strongRevPerRep)}`, type: 'warning' });
    } else if (weakest.team.reps < strongest.team.reps * 0.5) {
      insights.push({ text: `Your biggest issue is headcount, not production — ${weakest.team.name} has ${weakest.team.reps} reps vs ${strongest.team.reps}`, type: 'warning' });
    }
  }

  // Weakest team costing you
  if (weakest && teams.length > 1) {
    const withoutWeakest = calcAll(personalRevenue, teams.filter(t => t.id !== weakest.team.id));
    // Recalc with weakest normalized to avg
    const avgEarnings = calc.totalTeamEarnings / teams.length;
    if (weakest.earnings < avgEarnings * 0.5) {
      insights.push({ text: `Your lowest team (${weakest.team.name}) is underperforming — earning ${fmt(weakest.earnings)} vs team avg of ${fmt(avgEarnings)}`, type: 'warning' });
    }
  }

  // Best next move
  if (weakest && teams.length > 1) {
    const normalizeTeams = teams.map(t => {
      if (t.id === weakest.team.id) {
        const avgRev = calc.totalTeamGross / totalReps;
        return { ...t, totalRevenue: t.reps * avgRev, avgRevenuePerRep: avgRev };
      }
      return t;
    });
    const normalizedCalc = calcAll(personalRevenue, normalizeTeams);
    const normDelta = normalizedCalc.totalEarnings - totalEarnings;

    const addRepTeams = teams.map((t, i) => i === 0 ? { ...t, reps: t.reps + 1, totalRevenue: t.totalRevenue + (totalReps > 0 ? calc.totalTeamGross / totalReps : 150000) } : t);
    const addRepCalc = calcAll(personalRevenue, addRepTeams);
    const addDelta = addRepCalc.totalEarnings - totalEarnings;

    if (normDelta > addDelta) {
      insights.push({ text: `Best next move: improve ${weakest.team.name} vs adding new reps (+${fmt(normDelta)} vs +${fmt(addDelta)})`, type: 'tip' });
    } else {
      insights.push({ text: `Best next move: add reps vs improving ${weakest.team.name} (+${fmt(addDelta)} vs +${fmt(normDelta)})`, type: 'tip' });
    }
  }

  return insights;
}

// ============= "LEFT ON TABLE" CALC =============
function calcLeftOnTable(calc: ReturnType<typeof calcAll>, personalRevenue: number, teams: TeamData[]) {
  if (teams.length === 0) return 0;
  const { totalReps, totalTeamGross } = calc;
  if (totalReps === 0) return 0;
  const avgRev = totalTeamGross / totalReps;
  // Normalize all teams to best team's avg rev per rep
  const sorted = [...calc.teamResults].sort((a, b) => b.revenuePerRep - a.revenuePerRep);
  const bestAvg = sorted[0]?.revenuePerRep || avgRev;
  const normalizedTeams = teams.map(t => ({
    ...t,
    totalRevenue: t.reps * bestAvg,
    avgRevenuePerRep: bestAvg,
  }));
  const normalizedCalc = calcAll(personalRevenue, normalizedTeams);
  return Math.max(0, normalizedCalc.totalEarnings - calc.totalEarnings);
}

// ============= INPUT COMPONENT =============
const CurrencyInput = ({ value, onChange, placeholder, label, icon: Icon }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; icon?: any;
}) => (
  <div>
    {label && (
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
      </div>
    )}
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(fmtInput(e.target.value))}
        placeholder={placeholder || "0"}
        className="w-full h-10 pl-7 pr-3 rounded-lg border border-border bg-input text-foreground text-sm font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
      />
    </div>
  </div>
);

const CountInput = ({ value, onChange, placeholder, label, icon: Icon }: {
  value: string; onChange: (v: string) => void; placeholder?: string; label?: string; icon?: any;
}) => (
  <div>
    {label && (
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
      </div>
    )}
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => { const c = e.target.value.replace(/[^0-9]/g, ''); onChange(c); }}
      placeholder={placeholder || "0"}
      className="w-full h-10 px-3 rounded-lg border border-border bg-input text-foreground text-sm font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
    />
  </div>
);

// ============= MAIN COMPONENT =============
let teamCounter = 1;

export default function DownlineGrowthCalculator() {
  const [mode, setMode] = useState<'team' | 'direct'>('team');
  const [personalStr, setPersonalStr] = useState('');
  const [expanded, setExpanded] = useState(true);

  // Team mode
  const [teams, setTeams] = useState<Array<{ id: string; name: string; repsStr: string; revenueStr: string; avgStr: string; isManual: boolean }>>([
    { id: '1', name: 'Team 1', repsStr: '', revenueStr: '', avgStr: '150,000', isManual: false },
  ]);

  // Direct rep mode
  const [directRepsStr, setDirectRepsStr] = useState('');
  const [directAvgStr, setDirectAvgStr] = useState('150,000');

  const personalRevenue = parseNum(personalStr);

  // Build team data
  const teamData: TeamData[] = useMemo(() => {
    if (mode === 'direct') {
      const reps = parseNum(directRepsStr);
      const avg = parseNum(directAvgStr) || 150000;
      if (reps === 0) return [];
      return [{ id: 'direct', name: 'Your Reps', reps, totalRevenue: reps * avg, avgRevenuePerRep: avg, isManual: false }];
    }
    return teams.map(t => {
      const reps = parseNum(t.repsStr);
      const revenue = parseNum(t.revenueStr);
      const avg = t.isManual ? (parseNum(t.avgStr) || 150000) : (reps > 0 ? revenue / reps : 0);
      return { id: t.id, name: t.name || 'Unnamed', reps, totalRevenue: revenue || reps * avg, avgRevenuePerRep: avg, isManual: t.isManual };
    }).filter(t => t.reps > 0 || t.totalRevenue > 0);
  }, [mode, teams, directRepsStr, directAvgStr]);

  const calc = useMemo(() => calcAll(personalRevenue, teamData), [personalRevenue, teamData]);
  const insights = useMemo(() => generateInsights(calc, personalRevenue, teamData), [calc, personalRevenue, teamData]);
  const leftOnTable = useMemo(() => calcLeftOnTable(calc, personalRevenue, teamData), [calc, personalRevenue, teamData]);

  const addTeam = () => {
    teamCounter++;
    setTeams(p => [...p, { id: String(teamCounter), name: `Team ${teamCounter}`, repsStr: '', revenueStr: '', avgStr: '150,000', isManual: false }]);
  };

  const removeTeam = (id: string) => setTeams(p => p.filter(t => t.id !== id));

  const updateTeam = (id: string, field: string, value: string) => {
    setTeams(p => p.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      // Auto-calc avg when not manual
      if (!updated.isManual && (field === 'revenueStr' || field === 'repsStr')) {
        const reps = parseNum(updated.repsStr);
        const rev = parseNum(updated.revenueStr);
        if (reps > 0 && rev > 0) updated.avgStr = fmtInput(String(Math.round(rev / reps)));
      }
      return updated;
    }));
  };

  // Scenario buttons
  const applyScenario = useCallback((type: string) => {
    if (mode === 'direct') {
      const reps = parseNum(directRepsStr);
      const avg = parseNum(directAvgStr) || 150000;
      if (type === '+1rep') setDirectRepsStr(String(reps + 1));
      if (type === '+3reps') setDirectRepsStr(String(reps + 3));
      if (type === '+10%') setDirectAvgStr(fmtInput(String(Math.round(avg * 1.1))));
      return;
    }
    if (type === '+1rep' && teams.length > 0) {
      const weakIdx = calc.teamResults.length > 0
        ? teams.findIndex(t => t.id === [...calc.teamResults].sort((a, b) => a.earnings - b.earnings)[0]?.team.id)
        : 0;
      const idx = weakIdx >= 0 ? weakIdx : 0;
      const t = teams[idx];
      const reps = parseNum(t.repsStr) + 1;
      updateTeam(t.id, 'repsStr', String(reps));
    }
    if (type === '+3reps' && teams.length > 0) {
      const t = teams[0];
      const reps = parseNum(t.repsStr) + 3;
      updateTeam(t.id, 'repsStr', String(reps));
    }
    if (type === '+1team') addTeam();
    if (type === '+100k' && calc.teamResults.length > 0) {
      const weakest = [...calc.teamResults].sort((a, b) => a.earnings - b.earnings)[0];
      const t = teams.find(t => t.id === weakest.team.id);
      if (t) updateTeam(t.id, 'revenueStr', fmtInput(String(parseNum(t.revenueStr) + 100000)));
    }
    if (type === '+10%') {
      setTeams(p => p.map(t => ({
        ...t,
        revenueStr: fmtInput(String(Math.round(parseNum(t.revenueStr) * 1.1))),
      })));
    }
    if (type === 'normalize' && calc.teamResults.length > 1) {
      const avgPerRep = calc.totalReps > 0 ? calc.totalTeamGross / calc.totalReps : 150000;
      setTeams(p => p.map(t => {
        const reps = parseNum(t.repsStr);
        return { ...t, revenueStr: fmtInput(String(Math.round(reps * avgPerRep))), avgStr: fmtInput(String(Math.round(avgPerRep))) };
      }));
    }
  }, [mode, teams, directRepsStr, directAvgStr, calc]);

  const hasData = personalRevenue > 0 || teamData.length > 0;
  const sorted = [...calc.teamResults].sort((a, b) => b.earnings - a.earnings);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  return (
    <section className="w-full py-16 md:py-24 relative">
      {/* Section header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight">
            Downline Growth Calculator
          </h2>
        </div>
        <p className="text-muted-foreground text-sm max-w-xl">
          See exactly where you're making money, where you're losing it, and what move makes you the most.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Mode toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 border border-border/50 w-fit mb-8">
          {(['team', 'direct'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all",
                mode === m ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === 'team' ? 'Team Mode' : 'Direct Rep Mode'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Inputs */}
          <div className="lg:col-span-5 space-y-4">
            {/* Personal revenue */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-5">
              <CurrencyInput value={personalStr} onChange={setPersonalStr} placeholder="200,000" label="Your Personal Revenue" icon={DollarSign} />
            </div>

            {mode === 'team' ? (
              <>
                {teams.map((t, idx) => (
                  <div key={t.id} className={cn(
                    "rounded-xl border p-5 space-y-3 transition-all",
                    weakest && weakest.team.id === t.id && calc.teamResults.length > 1
                      ? "border-destructive/40 bg-destructive/5"
                      : strongest && strongest.team.id === t.id && calc.teamResults.length > 1
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border/50 bg-card/50"
                  )}>
                    <div className="flex items-center justify-between">
                      <input
                        value={t.name}
                        onChange={e => updateTeam(t.id, 'name', e.target.value)}
                        className="text-sm font-bold text-foreground bg-transparent border-none outline-none w-32"
                      />
                      {teams.length > 1 && (
                        <button onClick={() => removeTeam(t.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <CountInput value={t.repsStr} onChange={v => updateTeam(t.id, 'repsStr', v)} placeholder="5" label="# Reps" icon={Users} />
                      <CurrencyInput value={t.revenueStr} onChange={v => updateTeam(t.id, 'revenueStr', v)} placeholder="750,000" label="Total Revenue" icon={DollarSign} />
                    </div>
                    <div className="flex items-center gap-2">
                      <CurrencyInput value={t.avgStr} onChange={v => updateTeam(t.id, 'avgStr', v)} placeholder="150,000" label="Avg Rev / Rep" icon={TrendingUp} />
                    </div>
                    {/* Quick stats */}
                    {calc.teamResults.find(r => r.team.id === t.id) && (
                      <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Contribution</span>
                        <span className="font-bold text-foreground">
                          {fmt(calc.teamResults.find(r => r.team.id === t.id)!.earnings)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addTeam} className="w-full py-3 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-2 text-sm font-bold">
                  <Plus className="w-4 h-4" /> Add Team
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
                <CountInput value={directRepsStr} onChange={setDirectRepsStr} placeholder="10" label="Number of Direct Reps" icon={Users} />
                <CurrencyInput value={directAvgStr} onChange={setDirectAvgStr} placeholder="150,000" label="Avg Revenue Per Rep" icon={DollarSign} />

                {/* Show what +1-4 reps would do */}
                {parseNum(directRepsStr) > 0 && (
                  <div className="pt-3 border-t border-border/30 space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">If you add more reps:</p>
                    {[1, 2, 3, 4].map(n => {
                      const newTeams: TeamData[] = [{ id: 'direct', name: 'Your Reps', reps: parseNum(directRepsStr) + n, totalRevenue: (parseNum(directRepsStr) + n) * (parseNum(directAvgStr) || 150000), avgRevenuePerRep: parseNum(directAvgStr) || 150000, isManual: false }];
                      const newCalc = calcAll(personalRevenue, newTeams);
                      const delta = newCalc.totalEarnings - calc.totalEarnings;
                      return (
                        <div key={n} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">+{n} rep{n > 1 ? 's' : ''}</span>
                          <span className="font-bold text-emerald-400">+{fmt(delta)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Show what increased production does */}
                {parseNum(directRepsStr) > 0 && (
                  <div className="pt-3 border-t border-border/30 space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">If reps increase production:</p>
                    {[10, 25, 50].map(pctInc => {
                      const avg = parseNum(directAvgStr) || 150000;
                      const newAvg = Math.round(avg * (1 + pctInc / 100));
                      const newTeams: TeamData[] = [{ id: 'direct', name: 'Your Reps', reps: parseNum(directRepsStr), totalRevenue: parseNum(directRepsStr) * newAvg, avgRevenuePerRep: newAvg, isManual: false }];
                      const newCalc = calcAll(personalRevenue, newTeams);
                      const delta = newCalc.totalEarnings - calc.totalEarnings;
                      return (
                        <div key={pctInc} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">+{pctInc}% production</span>
                          <span className="font-bold text-emerald-400">+{fmt(delta)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Output dashboard */}
          <div className="lg:col-span-7 space-y-4">
            {/* Hero earnings number */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/50 p-6 md:p-8">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Total Projected Earnings</p>
              <p className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                <AnimNum value={calc.totalEarnings} />
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Revenue</p>
                  <p className="text-sm font-bold text-foreground">{fmt(personalRevenue + calc.totalTeamGross)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Mktg Deal</p>
                  <p className="text-sm font-bold text-primary">{pct(calc.overallMktgRate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Reps</p>
                  <p className="text-sm font-bold text-foreground">{calc.totalReps}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Avg / Rep</p>
                  <p className="text-sm font-bold text-foreground">{calc.totalReps > 0 ? fmt(calc.totalTeamGross / calc.totalReps) : '$0'}</p>
                </div>
              </div>
              {teams.length > 1 && strongest && weakest && (
                <div className="flex gap-4 mt-4 pt-4 border-t border-border/30">
                  <div className="flex-1">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Strongest</p>
                    <p className="text-xs font-bold text-foreground">{strongest.team.name} — {fmt(strongest.earnings)}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-destructive uppercase tracking-widest font-bold">Weakest</p>
                    <p className="text-xs font-bold text-foreground">{weakest.team.name} — {fmt(weakest.earnings)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scenario buttons */}
            {hasData && (
              <div className="flex flex-wrap gap-2">
                {[
                  { key: '+1rep', label: '+1 Rep', icon: UserPlus },
                  { key: '+3reps', label: '+3 Reps', icon: Users },
                  ...(mode === 'team' ? [{ key: '+1team', label: '+1 Team', icon: Plus }] : []),
                  ...(mode === 'team' && calc.teamResults.length > 0 ? [{ key: '+100k', label: 'Weakest +$100k', icon: TrendingUp }] : []),
                  { key: '+10%', label: 'All +10%', icon: Percent },
                  ...(mode === 'team' && calc.teamResults.length > 1 ? [{ key: 'normalize', label: 'Normalize Weak', icon: Target }] : []),
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => applyScenario(s.key)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 hover:border-primary/50 hover:bg-primary/10 text-xs font-bold text-muted-foreground hover:text-primary transition-all"
                  >
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Left on table */}
            {leftOnTable > 1000 && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <p className="text-xs font-black text-warning uppercase tracking-widest">What You're Leaving on the Table</p>
                </div>
                <p className="text-2xl font-black text-warning">
                  <AnimNum value={leftOnTable} />
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  If all reps produced at your best team's average, you'd earn this much more.
                </p>
              </div>
            )}

            {/* Team breakdown */}
            {calc.teamResults.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
                <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider">Team Breakdown</span>
                  {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {expanded && (
                  <div className="border-t border-border/30">
                    {sorted.map((r, i) => {
                      const isWeak = calc.teamResults.length > 1 && r.team.id === weakest?.team.id;
                      const isStrong = calc.teamResults.length > 1 && r.team.id === strongest?.team.id;
                      const avgEarnings = calc.totalTeamEarnings / calc.teamResults.length;
                      const missedOpp = Math.max(0, avgEarnings - r.earnings);
                      return (
                        <div key={r.team.id} className={cn(
                          "p-4 border-b border-border/20 last:border-b-0",
                          isWeak && "bg-destructive/5",
                          isStrong && "bg-emerald-500/5",
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                isStrong ? "bg-emerald-500" : isWeak ? "bg-destructive" : "bg-primary"
                              )} />
                              <span className="text-sm font-bold text-foreground">{r.team.name}</span>
                              <span className="text-[10px] text-muted-foreground">{r.team.reps} reps</span>
                            </div>
                            <span className={cn("text-sm font-black", isStrong ? "text-emerald-400" : isWeak ? "text-destructive" : "text-foreground")}>
                              {fmt(r.earnings)}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-[10px]">
                            <div>
                              <span className="text-muted-foreground block">Revenue</span>
                              <span className="font-bold text-foreground">{fmt(r.grossRevenue)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Avg/Rep</span>
                              <span className="font-bold text-foreground">{fmt(r.revenuePerRep)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Net Spread</span>
                              <span className="font-bold text-foreground">{pct(r.netSpread)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Missed Opp</span>
                              <span className={cn("font-bold", missedOpp > 0 ? "text-warning" : "text-emerald-400")}>
                                {missedOpp > 0 ? fmt(missedOpp) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card/50 p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold text-foreground uppercase tracking-wider">Insights</p>
                </div>
                {insights.map((ins, i) => (
                  <div key={i} className={cn(
                    "flex items-start gap-2.5 p-3 rounded-lg text-xs",
                    ins.type === 'opportunity' && "bg-emerald-500/5 border border-emerald-500/20",
                    ins.type === 'warning' && "bg-warning/5 border border-warning/20",
                    ins.type === 'tip' && "bg-primary/5 border border-primary/20",
                  )}>
                    {ins.type === 'opportunity' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />}
                    {ins.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />}
                    {ins.type === 'tip' && <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />}
                    <span className="text-foreground/90 leading-relaxed">{ins.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-8">
          Uses exact commission tiers, marketing deal tables, 25% attrition, and 5% rookie incentive cost. Estimates do not include taxes, chargebacks, or backend timing.
        </p>
      </div>
    </section>
  );
}
