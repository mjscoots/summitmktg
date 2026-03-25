import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MomentumState {
  count: number;
  visible: boolean;
}

export function useMomentum() {
  const [momentum, setMomentum] = useState<MomentumState>({ count: 0, visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const recordMessage = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(hideTimerRef.current);

    setMomentum(prev => ({
      count: prev.count + 1,
      visible: true,
    }));

    // Reset after 10 minutes of inactivity
    timerRef.current = setTimeout(() => {
      setMomentum({ count: 0, visible: false });
    }, 10 * 60 * 1000);

    // Hide indicator after 3 seconds
    hideTimerRef.current = setTimeout(() => {
      setMomentum(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  return { momentum, recordMessage };
}

interface MomentumIndicatorProps {
  count: number;
  visible: boolean;
}

export function MomentumIndicator({ count, visible }: MomentumIndicatorProps) {
  if (!visible || count < 2) return null;

  return (
    <div className={cn(
      "absolute -top-10 left-1/2 -translate-x-1/2 z-30",
      "animate-[momentum-pop_0.4s_ease-out_forwards]"
    )}>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 backdrop-blur-sm">
        <span className="text-sm">🔥</span>
        <span className="text-xs font-bold text-primary">Momentum +{count}</span>
      </div>
    </div>
  );
}
