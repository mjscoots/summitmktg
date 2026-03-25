import { useState, useEffect, useRef } from 'react';
import { usePersonalTrainingProgress } from '@/hooks/usePersonalTrainingProgress';
import { useStreak } from '@/hooks/useStreak';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Shield, Award, Star, Mountain, ChevronDown, ChevronUp, Flame, BookOpen, Zap } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BreakdownItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const TIERS = [
  { name: 'Bronze', threshold: 25, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-600', glow: 'shadow-[0_0_20px_-5px_rgba(217,119,6,0.5)]' },
  { name: 'Silver', threshold: 50, icon: Award, color: 'text-slate-300', bg: 'bg-slate-300', glow: 'shadow-[0_0_20px_-5px_rgba(203,213,225,0.5)]' },
  { name: 'Gold', threshold: 75, icon: Star, color: 'text-primary', bg: 'bg-primary', glow: 'shadow-[0_0_20px_-5px_rgba(250,204,21,0.5)]' },
  { name: 'Summit', threshold: 100, icon: Mountain, color: 'text-primary', bg: 'bg-primary', glow: 'shadow-[0_0_25px_-5px_hsl(var(--primary)/0.6)]' },
];

function getTier(pct: number) {
  if (pct >= 100) return TIERS[3];
  if (pct >= 75) return TIERS[2];
  if (pct >= 50) return TIERS[1];
  if (pct >= 25) return TIERS[0];
  return null;
}

function getNextTier(pct: number) {
  if (pct >= 100) return null;
  if (pct >= 75) return TIERS[3];
  if (pct >= 50) return TIERS[2];
  if (pct >= 25) return TIERS[1];
  return TIERS[0];
}

function getMilestoneClass(pct: number) {
  if (pct >= 100) return 'animate-pulse ring-2 ring-primary/60';
  if (pct >= 75) return 'ring-1 ring-yellow-400/40';
  if (pct >= 50) return '';
  if (pct >= 25) return '';
  return '';
}

function getBarGradient(pct: number) {
  if (pct >= 100) return 'bg-gradient-to-r from-primary via-primary to-primary';
  if (pct >= 75) return 'bg-gradient-to-r from-amber-600 via-yellow-400 to-yellow-300';
  if (pct >= 50) return 'bg-gradient-to-r from-amber-600 via-slate-300 to-slate-200';
  if (pct >= 25) return 'bg-gradient-to-r from-amber-700 to-amber-500';
  return 'bg-muted-foreground/40';
}

export function EliteProgressBar() {
  const { progress, isLoading: trainingLoading } = usePersonalTrainingProgress();
  const { streakData } = useStreak();
  const { user, role } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [formsPct, setFormsPct] = useState(0);
  const [animatedPct, setAnimatedPct] = useState(0);
  const prevPctRef = useRef(0);

  // Fetch forms completion
  useEffect(() => {
    const fetchExtras = async () => {
      if (!user?.id) return;

      const formsRes = await supabase.from('user_priority_tasks').select('id, is_completed').eq('user_id', user.id).eq('is_active', true);

      // Forms %
      const tasks = formsRes.data || [];
      if (tasks.length > 0) {
        const completed = tasks.filter(t => t.is_completed).length;
        setFormsPct(Math.round((completed / tasks.length) * 100));
      } else {
        setFormsPct(100);
      }
    };

    fetchExtras();
  }, [user?.id]);

  // Calculate combined system completion
  const trainingPct = progress.overall;
  const streakPct = Math.min(streakData.currentStreak * 10, 100); // 10 days = 100%

  // Weighted system completion (Training 60%, Forms 20%, Streak 20%)
  const systemPct = Math.round(
    trainingPct * 0.60 +
    formsPct * 0.20 +
    streakPct * 0.20
  );

  // Animate the bar
  useEffect(() => {
    if (trainingLoading) return;
    const target = systemPct;
    const start = prevPctRef.current;
    const diff = target - start;
    if (diff === 0) { setAnimatedPct(target); return; }

    let frame: number;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPct(Math.round(start + diff * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
      else prevPctRef.current = target;
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [systemPct, trainingLoading]);

  const currentTier = getTier(systemPct);
  const nextTier = getNextTier(systemPct);
  const TierIcon = currentTier?.icon || Shield;

  const breakdown: BreakdownItem[] = [
    { label: 'Training', value: trainingPct, icon: <BookOpen className="w-3.5 h-3.5" />, color: 'text-success' },
    { label: 'Forms', value: formsPct, icon: <Zap className="w-3.5 h-3.5" />, color: 'text-primary' },
    { label: 'Streak', value: streakPct, icon: <Flame className="w-3.5 h-3.5" />, color: 'text-primary' },
  ];

  if (trainingLoading) {
    return <div className="mb-4 h-16 bg-card rounded-xl border border-border animate-pulse" />;
  }

  return (
    <div className={cn(
      "mb-4 rounded-xl border transition-all duration-500 overflow-hidden",
      "bg-card/80 backdrop-blur-sm",
      getMilestoneClass(systemPct),
      systemPct >= 100 ? 'border-primary/50' : 'border-border/60'
    )}>
      {/* Main bar */}
      <div 
        className="px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg transition-all",
              currentTier ? `${currentTier.color}` : 'text-muted-foreground',
              systemPct >= 75 && 'animate-pulse'
            )}>
              <TierIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              System Completion
            </span>
            {currentTier && (
              <span className={cn("text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border", currentTier.color,
                currentTier.name === 'Bronze' && 'bg-amber-600/10 border-amber-600/30',
                currentTier.name === 'Silver' && 'bg-slate-300/10 border-slate-300/30',
                currentTier.name === 'Gold' && 'bg-primary/10 border-yellow-400/30',
                currentTier.name === 'Summit' && 'bg-primary/10 border-primary/30',
              )}>
                {currentTier.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-lg font-black tabular-nums",
              systemPct >= 100 ? 'text-primary' : systemPct >= 75 ? 'text-primary' : 'text-foreground'
            )}>
              {animatedPct}%
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </div>

        {/* Progress bar with tier markers */}
        <div className="relative">
          <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                getBarGradient(systemPct)
              )}
              style={{ width: `${animatedPct}%` }}
            />
          </div>

          {/* Tier markers */}
          <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
            {TIERS.map(tier => (
              <div
                key={tier.name}
                className="absolute top-0 h-full"
                style={{ left: `${tier.threshold}%` }}
              >
                <div className={cn(
                  "w-0.5 h-full",
                  systemPct >= tier.threshold ? 'bg-foreground/30' : 'bg-muted-foreground/20'
                )} />
              </div>
            ))}
          </div>
        </div>

        {/* Next tier hint */}
        {nextTier && (
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {nextTier.threshold - systemPct}% to <span className={nextTier.color}>{nextTier.name}</span>
          </p>
        )}
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-border/30 animate-fade-in">
          <div className="grid grid-cols-3 gap-3">
            {breakdown.map(item => (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <div className={cn("flex-shrink-0", item.color)}>{item.icon}</div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</div>
                  <div className="text-sm font-bold text-foreground">{item.value}%</div>
                </div>
                <div className="ml-auto h-1 w-12 bg-muted/60 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", item.color.replace('text-', 'bg-'))} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Tier progression */}
          <div className="flex items-center gap-1.5 mt-3">
            {TIERS.map((tier, i) => {
              const unlocked = systemPct >= tier.threshold;
              const Icon = tier.icon;
              return (
                <Tooltip key={tier.name}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all",
                      unlocked
                        ? `${tier.color} border-current/30`
                        : 'text-muted-foreground/30 border-border/20 grayscale'
                    )}>
                      <Icon className="w-3 h-3" />
                      {tier.name}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {unlocked ? `${tier.name} unlocked!` : `Unlock at ${tier.threshold}%`}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
