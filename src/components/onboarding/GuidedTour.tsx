import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { X, ChevronRight, ChevronLeft, Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar"]',
    title: 'Navigation',
    description: 'Use the sidebar to move between sections. Everything you need is right here.',
    position: 'right',
  },
  {
    target: '[data-tour="home"]',
    title: 'Home Dashboard',
    description: 'Your home base — see announcements, your schedule, and daily tasks at a glance.',
    position: 'right',
  },
  {
    target: '[data-tour="training"]',
    title: 'Training',
    description: 'Complete your training modules here. Stay consistent and build momentum.',
    position: 'right',
  },
  {
    target: '[data-tour="chat"]',
    title: 'Team Chat',
    description: 'Connect with your team, ask questions, and stay in the loop.',
    position: 'right',
  },
  {
    target: '[data-tour="calendar"]',
    title: 'Calendar',
    description: 'See upcoming events, calls, and meetings your manager schedules.',
    position: 'right',
  },
  {
    target: '[data-tour="profile"]',
    title: 'Your Profile',
    description: 'Update your photo, timezone, and contact info here.',
    position: 'right',
  },
];

export function GuidedTour() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  // Check if user needs the tour
  useEffect(() => {
    if (!user) return;
    const checkTour = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('tour_completed')
        .eq('user_id', user.id)
        .single();
      if (data && !(data as any).tour_completed) {
        setShow(true);
      }
    };
    checkTour();
  }, [user]);

  const positionTooltip = useCallback(() => {
    const currentStep = TOUR_STEPS[step];
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pos = currentStep.position;
    const gap = 12;

    let style: React.CSSProperties = { position: 'fixed', zIndex: 9999 };

    if (pos === 'right') {
      style.top = rect.top + rect.height / 2;
      style.left = rect.right + gap;
      style.transform = 'translateY(-50%)';
    } else if (pos === 'bottom') {
      style.top = rect.bottom + gap;
      style.left = rect.left + rect.width / 2;
      style.transform = 'translateX(-50%)';
    } else if (pos === 'left') {
      style.top = rect.top + rect.height / 2;
      style.right = window.innerWidth - rect.left + gap;
      style.transform = 'translateY(-50%)';
    } else {
      style.bottom = window.innerHeight - rect.top + gap;
      style.left = rect.left + rect.width / 2;
      style.transform = 'translateX(-50%)';
    }

    setTooltipStyle(style);
  }, [step]);

  useEffect(() => {
    if (!show) return;
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    return () => window.removeEventListener('resize', positionTooltip);
  }, [show, step, positionTooltip]);

  // Highlight the target element
  useEffect(() => {
    if (!show) return;
    const currentStep = TOUR_STEPS[step];
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target) as HTMLElement;
    if (!el) return;

    el.style.position = 'relative';
    el.style.zIndex = '9998';
    el.style.boxShadow = '0 0 0 4px hsl(var(--primary) / 0.5)';
    el.style.borderRadius = '8px';
    el.style.transition = 'box-shadow 0.3s ease';

    return () => {
      el.style.zIndex = '';
      el.style.boxShadow = '';
      el.style.position = '';
    };
  }, [show, step]);

  const completeTour = useCallback(async () => {
    setShow(false);
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ tour_completed: true } as any)
      .eq('user_id', user.id);
  }, [user]);

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      completeTour();
    }
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!show) return null;

  const currentStep = TOUR_STEPS[step];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9997] transition-opacity duration-300"
        onClick={completeTour}
      />

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className={cn(
          'w-72 bg-card border border-border rounded-xl shadow-2xl p-4 z-[9999]',
          'animate-in fade-in-0 slide-in-from-left-2 duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary tracking-wide uppercase">
              Step {step + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            onClick={completeTour}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-sm font-bold text-foreground mb-1">{currentStep.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {currentStep.description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-5 bg-primary' : i < step ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted'
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={step === 0}
            className="text-xs gap-1 h-7 px-2"
          >
            <ChevronLeft className="w-3 h-3" />
            Back
          </Button>
          <Button
            size="sm"
            onClick={next}
            className="text-xs gap-1 h-7 px-3 font-bold"
          >
            {step === TOUR_STEPS.length - 1 ? "Let's Go!" : 'Next'}
            {step < TOUR_STEPS.length - 1 && <ChevronRight className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </>
  );
}
