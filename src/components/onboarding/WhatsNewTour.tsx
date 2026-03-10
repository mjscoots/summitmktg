import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, ChevronRight, ChevronLeft, X, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Define each release's features here.
 * When you ship a new update, bump CURRENT_RELEASE and add a new entry to RELEASES.
 * The tour will automatically show for users who haven't seen this release.
 */

interface ReleaseStep {
  title: string;
  description: string;
  emoji: string;
}

interface Release {
  version: string;
  headline: string;
  steps: ReleaseStep[];
}

const RELEASES: Release[] = [
  {
    version: '2026-03-10',
    headline: "Here's what's new 🚀",
    steps: [
      {
        emoji: '📋',
        title: 'Smarter To-Do List',
        description: 'Your tasks now auto-sort by priority (Urgent → Low). Click any task to edit it and set an optional due date — tasks with dates automatically appear on your calendar.',
      },
      {
        emoji: '🔥',
        title: 'Double-Tap to React',
        description: 'Double-tap any chat message on mobile (or double-click on desktop) to drop a 🔥 reaction instantly. Show love faster.',
      },
      {
        emoji: '💬',
        title: 'Daily Motivational Chips',
        description: 'The quick-reply chips in Community Chat now rotate daily with fresh motivational phrases. Every day feels different.',
      },
      {
        emoji: '🛠️',
        title: 'Revamped Tools Section',
        description: 'The Tools dropdown in your sidebar is now bolder and easier to find with a wrench icon and highlighted styling.',
      },
    ],
  },
];

const CURRENT_RELEASE = RELEASES[RELEASES.length - 1].version;

export function WhatsNewTour() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const currentRelease = RELEASES.find(r => r.version === CURRENT_RELEASE);

  useEffect(() => {
    if (!user || !profile || dismissed) return;
    // If user has already seen this release, don't show
    if ((profile as any).last_seen_release === CURRENT_RELEASE) return;
    // Small delay so the app loads first
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [user, profile, dismissed]);

  if (!currentRelease) return null;

  const steps = currentRelease.steps;
  const isLast = stepIndex === steps.length - 1;
  const isFirst = stepIndex === 0;
  const step = steps[stepIndex];

  const handleDismiss = async () => {
    setOpen(false);
    setDismissed(true);
    if (user) {
      await supabase
        .from('profiles')
        .update({ last_seen_release: CURRENT_RELEASE } as any)
        .eq('user_id', user.id);
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleDismiss();
    } else {
      setStepIndex(i => i + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStepIndex(i => i - 1);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border/60">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background px-6 pt-6 pb-4">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">What's New</span>
          </div>
          <h2 className="text-xl font-black text-foreground">{currentRelease.headline}</h2>
        </div>

        {/* Step content */}
        <div className="px-6 py-5 min-h-[140px] flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">{step.emoji}</span>
            <div>
              <h3 className="text-base font-bold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>
        </div>

        {/* Progress dots + navigation */}
        <div className="flex items-center justify-between px-6 pb-5 pt-1">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  i === stepIndex ? "bg-primary w-5" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="gap-1">
              {isLast ? (
                <>
                  <Rocket className="w-4 h-4" />
                  Let's go!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
