import { useNavigate } from 'react-router-dom';
import { useBootcamp } from '@/hooks/useBootcamp';
import { Lock, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

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

export default function BootcampLock() {
  const navigate = useNavigate();
  const { progress, isLoading, isLocked, currentPhase, deadlineInfo } = useBootcamp();

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

  const phases = [
    { num: 1, title: 'Sunblock', done: progress?.phase_1_complete },
    { num: 2, title: 'Motivation', done: progress?.phase_2_complete },
    { num: 3, title: 'Final Commitment', done: progress?.phase_3_complete },
  ];

  const handleStart = () => {
    if (currentPhase === 0) return;
    navigate(`/bootcamp/phase-${currentPhase}`);
  };

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
          <Lock className="w-12 h-12 text-white/60 mx-auto mb-6" />

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
            COMPLETE BOOT CAMP
          </h1>

          <p className="text-white/50 text-sm mb-6">
            Complete all three modules to unlock full access.
          </p>

          {/* Countdown Timer */}
          {deadlineInfo.deadlineAt && (
            <div className="mb-6">
              <CountdownTimer deadlineAt={deadlineInfo.deadlineAt} />
            </div>
          )}

          <div className="space-y-3 mb-8 text-left">
            {phases.map((p) => (
              <div
                key={p.num}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  p.done
                    ? 'bg-white/10 text-white'
                    : 'bg-white/[0.02] text-white/40'
                }`}
              >
                {p.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 shrink-0" />
                )}
                <span className="text-sm font-semibold">Module {p.num} — {p.title}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <p className="text-white/30 text-xs mb-4">
            ⚡ Most reps complete boot camp in under 25 minutes
          </p>

          <Button
            onClick={handleStart}
            size="lg"
            className="w-full bg-white text-black hover:bg-white/90 font-black text-base tracking-wide h-12"
          >
            {currentPhase > 1 ? 'CONTINUE BOOT CAMP' : 'START BOOT CAMP'}
          </Button>
        </div>
      </div>
    </div>
  );
}
