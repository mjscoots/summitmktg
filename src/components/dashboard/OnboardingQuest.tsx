import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Camera,
  MessageSquare,
  BookOpen,
  CalendarCheck,
  Trophy,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import confetti from 'canvas-confetti';

interface QuestStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  route?: string;
  completed: boolean;
  xp: number;
}

export function OnboardingQuest() {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<QuestStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [prevCompleted, setPrevCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  const checkCompletion = useCallback(async () => {
    if (!user || !profile) return;

    // Check profile completion
    const profileDone = !!(
      profile.avatar_url &&
      profile.phone &&
      profile.full_name?.trim() &&
      (profile as any).timezone
    );

    // Check if sent a chat message
    const { count: chatCount } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_ai', false);

    const chatDone = (chatCount || 0) > 0;

    // Check if started training (any lesson progress)
    const { count: lessonCount } = await supabase
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const trainingDone = (lessonCount || 0) > 0;

    // Check calendar attendance
    const { count: attendanceCount } = await supabase
      .from('calendar_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const attendanceDone = (attendanceCount || 0) > 0;

    // Check streak (logged in on 2+ days)
    const { data: streakData } = await supabase
      .from('daily_login_streaks')
      .select('total_days_active')
      .eq('user_id', user.id)
      .maybeSingle();

    const streakDone = (streakData?.total_days_active || 0) >= 2;

    const newSteps: QuestStep[] = [
      {
        id: 'profile',
        label: 'Complete Your Profile',
        description: 'Upload a photo & fill out your info',
        icon: <Camera className="w-5 h-5" />,
        route: '/app/profile',
        completed: profileDone,
        xp: 50,
      },
      {
        id: 'chat',
        label: 'Say Hello in Chat',
        description: 'Introduce yourself to the team',
        icon: <MessageSquare className="w-5 h-5" />,
        route: '/app/chat',
        completed: chatDone,
        xp: 25,
      },
      {
        id: 'training',
        label: 'Start Your Training',
        description: 'Complete your first lesson',
        icon: <BookOpen className="w-5 h-5" />,
        route: '/app/training',
        completed: trainingDone,
        xp: 75,
      },
      {
        id: 'attendance',
        label: 'RSVP to an Event',
        description: 'Check attendance on the calendar',
        icon: <CalendarCheck className="w-5 h-5" />,
        route: '/app/calendar',
        completed: attendanceDone,
        xp: 25,
      },
      {
        id: 'streak',
        label: 'Build a 2-Day Streak',
        description: 'Log in 2 days in a row',
        icon: <Zap className="w-5 h-5" />,
        completed: streakDone,
        xp: 50,
      },
    ];

    setSteps(newSteps);
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    checkCompletion();
    // Re-check every 30 seconds
    const interval = setInterval(checkCompletion, 30000);
    return () => clearInterval(interval);
  }, [checkCompletion]);

  // Celebrate newly completed steps
  useEffect(() => {
    if (steps.length === 0) return;

    const currentCompleted = new Set(steps.filter(s => s.completed).map(s => s.id));

    // Find newly completed
    currentCompleted.forEach(id => {
      if (!prevCompleted.has(id) && prevCompleted.size > 0) {
        setCelebrating(id);
        // Fire confetti
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
        });
        setTimeout(() => setCelebrating(null), 2000);
      }
    });

    setPrevCompleted(currentCompleted);
  }, [steps]);

  // Don't render for managers or if loading
  if (role === 'manager' || role === 'admin') return null;
  if (loading) return null;

  const completedCount = steps.filter(s => s.completed).length;
  const totalXP = steps.filter(s => s.completed).reduce((sum, s) => sum + s.xp, 0);
  const maxXP = steps.reduce((sum, s) => sum + s.xp, 0);
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const allDone = completedCount === steps.length;

  // Hide if all done and dismissed
  if (allDone && dismissed) return null;

  return (
    <Card className={cn(
      "mb-5 overflow-hidden transition-all",
      allDone && "border-success/30 bg-success/5"
    )}>
      {/* Header */}
      <div className="p-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            allDone
              ? "bg-success/15"
              : "bg-gradient-to-br from-primary/20 to-primary/5"
          )}>
            {allDone ? (
              <Trophy className="w-5 h-5 text-success" />
            ) : (
              <Sparkles className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
              {allDone ? '🎉 Quest Complete!' : 'Getting Started'}
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {totalXP}/{maxXP} XP
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allDone
                ? "You've unlocked all starter rewards!"
                : `${completedCount}/${steps.length} steps — keep going!`}
            </p>
          </div>
        </div>
        {allDone && (
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              allDone
                ? "bg-success"
                : "bg-gradient-to-r from-primary to-primary/70"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="px-2 pb-2">
        {steps.map((step, idx) => {
          const isCelebrating = celebrating === step.id;

          return (
            <button
              key={step.id}
              onClick={() => step.route && !step.completed && navigate(step.route)}
              disabled={step.completed || !step.route}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group/step",
                step.completed
                  ? "opacity-60"
                  : "hover:bg-muted/50 cursor-pointer",
                isCelebrating && "animate-scale-in bg-success/10 opacity-100"
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Step icon / check */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                step.completed
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground group-hover/step:bg-primary/15 group-hover/step:text-primary"
              )}>
                {step.completed ? (
                  <CheckCircle2 className={cn("w-5 h-5", isCelebrating && "animate-bounce")} />
                ) : (
                  step.icon
                )}
              </div>

              {/* Label & description */}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-sm font-semibold block",
                  step.completed ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {step.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.description}
                </span>
              </div>

              {/* XP badge / arrow */}
              {step.completed ? (
                <span className="flex items-center gap-1 text-xs font-bold text-success">
                  <Star className="w-3.5 h-3.5" />
                  +{step.xp} XP
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{step.xp} XP
                  </span>
                  {step.route && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover/step:text-primary transition-colors" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
