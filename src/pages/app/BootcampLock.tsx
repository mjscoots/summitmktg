import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { Lock, CheckCircle2, Clock, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { isMomentumComplete } from './BootcampMomentum';
import { cn } from '@/lib/utils';

function CountdownTimer({ deadlineAt }: { deadlineAt: Date }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isOverdue: false });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const ms = deadlineAt.getTime() - now.getTime();
      if (ms <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isOverdue: true });
      } else {
        const totalSeconds = Math.floor(ms / 1000);
        setTimeLeft({
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60,
          isOverdue: false,
        });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  if (timeLeft.isOverdue) {
    return (
      <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span className="text-sm font-semibold">Deadline passed — complete boot camp now!</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-white/50" />
        <span className="text-xs text-white/50 uppercase tracking-wide font-semibold">Time Remaining</span>
      </div>
      <div className="flex items-center justify-center gap-1 font-mono text-2xl font-bold text-white tracking-wider">
        <span className={timeLeft.hours < 6 ? 'text-red-400' : timeLeft.hours < 24 ? 'text-yellow-400' : 'text-white'}>
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
}

const STEPS = [
  { num: 1, title: 'Get Started', group: 'momentum' },
  { num: 2, title: 'Revenue Goals', group: 'momentum' },
  { num: 3, title: 'Your Why', group: 'momentum' },
  { num: 4, title: 'Excitement', group: 'momentum' },
  { num: 5, title: 'Commitment', group: 'momentum' },
  { num: 6, title: '90-Day Vision', group: 'momentum' },
  { num: 7, title: "You're Ready", group: 'momentum' },
  { num: 8, title: 'Sunblock', group: 'phase' },
  { num: 9, title: 'Motivation', group: 'phase' },
  { num: 10, title: 'Final Commitment', group: 'phase' },
];

export default function BootcampLock() {
  const navigate = useNavigate();
  const { progress, isLoading, isLocked, deadlineInfo } = useBootcamp();
  const momentumDone = isMomentumComplete();

  useEffect(() => {
    if (!isLoading && !isLocked) {
      navigate('/app', { replace: true });
    }
  }, [isLoading, isLocked, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading...</div>
      </div>
    );
  }

  const getStepDone = (step: typeof STEPS[number]) => {
    if (step.group === 'momentum') return momentumDone;
    if (step.num === 8) return progress?.phase_1_complete;
    if (step.num === 9) return progress?.phase_2_complete;
    if (step.num === 10) return progress?.phase_3_complete;
    return false;
  };

  // Figure out where to go
  const handleStart = () => {
    if (!momentumDone) {
      navigate('/bootcamp/momentum');
    } else if (!progress?.phase_1_complete) {
      navigate('/bootcamp/phase-1');
    } else if (!progress?.phase_2_complete) {
      navigate('/bootcamp/phase-2');
    } else if (!progress?.phase_3_complete) {
      navigate('/bootcamp/phase-3');
    }
  };

  const currentStepNum = !momentumDone
    ? 1
    : !progress?.phase_1_complete
      ? 8
      : !progress?.phase_2_complete
        ? 9
        : !progress?.phase_3_complete
          ? 10
          : 10;

  const completedCount = STEPS.filter(s => getStepDone(s)).length;

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
          <Lock className="w-12 h-12 text-white/60 mx-auto mb-6" />

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
            COMPLETE BOOT CAMP
          </h1>

          <p className="text-white/50 text-sm mb-2">
            Complete all 10 steps to unlock full access.
          </p>
          <p className="text-white/30 text-xs mb-6">
            {completedCount}/10 completed
          </p>

          {/* Countdown Timer */}
          {deadlineInfo.deadlineAt && (
            <div className="mb-6">
              <CountdownTimer deadlineAt={deadlineInfo.deadlineAt} />
            </div>
          )}

          {/* Step list */}
          <div className="space-y-2 mb-8 text-left">
            {/* Momentum section */}
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold px-2 mb-1 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Momentum Builder
            </div>
            {STEPS.filter(s => s.group === 'momentum').map(step => {
              const done = getStepDone(step);
              const isCurrent = step.num === currentStepNum;
              return (
                <div
                  key={step.num}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm",
                    done
                      ? 'bg-white/10 text-white'
                      : isCurrent
                        ? 'bg-white/[0.06] text-white/80 border border-white/10'
                        : 'bg-white/[0.02] text-white/25'
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                      {step.num}
                    </span>
                  )}
                  <span className="font-semibold text-xs">{step.title}</span>
                </div>
              );
            })}

            {/* Phase section */}
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold px-2 mt-4 mb-1 flex items-center gap-2">
              <Lock className="w-3 h-3" /> Boot Camp Modules
            </div>
            {STEPS.filter(s => s.group === 'phase').map(step => {
              const done = getStepDone(step);
              const isCurrent = step.num === currentStepNum;
              return (
                <div
                  key={step.num}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm",
                    done
                      ? 'bg-white/10 text-white'
                      : isCurrent
                        ? 'bg-white/[0.06] text-white/80 border border-white/10'
                        : 'bg-white/[0.02] text-white/25'
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                      {step.num}
                    </span>
                  )}
                  <span className="font-semibold text-xs">{step.title}</span>
                </div>
              );
            })}
          </div>

          {/* Social proof */}
          <p className="text-white/30 text-xs mb-4">
            Most reps complete boot camp in under 15 minutes
          </p>

          <Button
            onClick={handleStart}
            size="lg"
            className="w-full bg-white text-black hover:bg-white/90 font-black text-base tracking-wide h-12"
          >
            {completedCount > 0 ? 'CONTINUE BOOT CAMP' : 'START BOOT CAMP'}
          </Button>
        </div>
      </div>
    </div>
  );
}
