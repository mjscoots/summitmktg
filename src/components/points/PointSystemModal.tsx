import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Flame, MessageSquare, BookOpen, Video, FileText, Zap, Trophy, Shield, ThumbsUp, Users, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PointSystemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTIONS = [
  {
    icon: Clock, color: 'text-blue-500', title: 'Hours Logged',
    subtitle: 'Primary point driver',
    items: [
      { label: 'Per hour of qualified learning time', pts: '+100' },
      { label: 'Daily cap', pts: '600' },
      { label: '90-sec idle auto-pause · Tab must be in focus', pts: null },
    ],
  },
  {
    icon: Flame, color: 'text-orange-500', title: 'Streak & Login',
    subtitle: 'Consistency rewards',
    items: [
      { label: 'Daily login bonus', pts: '+75' },
      { label: 'Streak maintenance (per day)', pts: '+25' },
      { label: '3-day milestone', pts: '+100' },
      { label: '7-day milestone', pts: '+300' },
      { label: '14-day milestone', pts: '+700' },
      { label: '30-day milestone', pts: '+2,000' },
      { label: 'Requires 20 min activity or 1 lesson/quiz per day', pts: null },
    ],
  },
  {
    icon: MessageSquare, color: 'text-emerald-500', title: 'Chat',
    subtitle: '≥10 chars, no spam',
    items: [
      { label: 'Per qualifying message', pts: '+20' },
      { label: 'Hourly cap (10 msgs/hr)', pts: '200' },
      { label: 'Daily cap', pts: '600' },
    ],
  },
  {
    icon: ThumbsUp, color: 'text-pink-500', title: 'Reactions',
    subtitle: 'Chat engagement',
    items: [
      { label: 'Your message gets a reaction', pts: '+10' },
      { label: 'Reacting to others', pts: '+2' },
    ],
  },
  {
    icon: BookOpen, color: 'text-green-500', title: 'Lessons',
    subtitle: 'Diminishing returns',
    items: [
      { label: 'First 3 per day', pts: '+60 ea' },
      { label: 'Next 3 per day', pts: '+30 ea' },
      { label: 'Beyond 6 per day', pts: '+10 ea' },
      { label: 'Daily cap', pts: '300' },
      { label: 'Quiz bonus: 80%+ / 90%+ / 100%', pts: '+25 / +40 / +60' },
    ],
  },
  {
    icon: Video, color: 'text-purple-500', title: 'Videos',
    subtitle: 'Rewatches count',
    items: [
      { label: 'Per video watched', pts: '+40' },
      { label: 'Daily cap', pts: '200' },
    ],
  },
  {
    icon: FileText, color: 'text-cyan-500', title: 'Manual Chapters',
    subtitle: 'Chapter completion',
    items: [
      { label: 'Per chapter completed', pts: '+30' },
    ],
  },
  {
    icon: Users, color: 'text-indigo-500', title: '1:1 Sessions',
    subtitle: 'Coaching',
    items: [
      { label: 'Per session (both participants)', pts: '+50' },
    ],
  },
  {
    icon: CalendarCheck, color: 'text-teal-500', title: 'Attendance',
    subtitle: 'Calendar RSVPs',
    items: [
      { label: 'RSVP "Yes"', pts: '+pts' },
      { label: 'RSVP "No"', pts: '−pts' },
    ],
  },
  {
    icon: Zap, color: 'text-yellow-500', title: 'Weekly Bonuses',
    subtitle: 'Training thresholds',
    items: [
      { label: '5 hrs (300 min)', pts: '+500' },
      { label: '10 hrs (600 min)', pts: '+1,200' },
      { label: '15 hrs (900 min)', pts: '+2,000' },
    ],
  },
];

export function PointSystemModal({ open, onOpenChange }: PointSystemModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Points Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground leading-relaxed">
            <Shield className="w-3.5 h-3.5 text-primary inline mr-1 -mt-0.5" />
            <strong>Hours logged is the #1 driver.</strong> Rushing lessons won't dominate. Past points are preserved.
          </div>

          {SECTIONS.map(({ icon: Icon, color, title, subtitle, items }) => (
            <div key={title} className="rounded-lg border border-border/40 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
                <span className="text-xs font-bold text-foreground">{title}</span>
                {subtitle && (
                  <span className="text-[10px] text-muted-foreground ml-auto">{subtitle}</span>
                )}
              </div>
              <div className="px-3 py-1.5 space-y-0.5">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    {item.pts && (
                      <span className="text-[11px] font-bold text-foreground tabular-nums shrink-0">{item.pts}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/30">
            <p className="text-[10px] text-muted-foreground text-center font-semibold tracking-wide uppercase">
              Elite: 5 hrs/day · Strong: 3 hrs/day · Baseline: 1 hr/day
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
