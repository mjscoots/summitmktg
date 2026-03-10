import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Flame, MessageSquare, BookOpen, Video, FileText, Zap, Trophy, Shield, ThumbsUp, Users, CalendarCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PointSystemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTIONS = [
  {
    icon: AlertTriangle, color: 'text-red-500', title: 'Inactivity Penalty',
    subtitle: 'Doubles daily',
    items: [
      { label: 'Day 1 inactive', pts: '−10' },
      { label: 'Day 2 inactive', pts: '−20' },
      { label: 'Day 3 inactive', pts: '−40' },
      { label: 'Day 4 inactive', pts: '−80' },
      { label: 'Day 5+ continues doubling', pts: '−160…' },
      { label: 'Log in & train 20 min to reset', pts: null },
    ],
  },
  {
    icon: Zap, color: 'text-yellow-500', title: 'Weekly Bonuses',
    subtitle: 'Up to +2,000',
    items: [
      { label: '15 hrs (900 min)', pts: '+2,000' },
      { label: '10 hrs (600 min)', pts: '+1,200' },
      { label: '5 hrs (300 min)', pts: '+500' },
    ],
  },
  {
    icon: Flame, color: 'text-green-500', title: 'Streak Milestones',
    subtitle: 'Up to +2,000',
    items: [
      { label: '30-day milestone', pts: '+2,000' },
      { label: '14-day milestone', pts: '+700' },
      { label: '7-day milestone', pts: '+300' },
      { label: '3-day milestone', pts: '+100' },
      { label: 'Daily login', pts: '+75' },
      { label: 'Streak maintenance / day', pts: '+25' },
    ],
  },
  {
    icon: Clock, color: 'text-blue-500', title: 'Hours Logged',
    subtitle: '600/day cap',
    items: [
      { label: 'Per hour trained', pts: '+120' },
      { label: '90-sec idle auto-pause', pts: null },
    ],
  },
  {
    icon: MessageSquare, color: 'text-emerald-500', title: 'Chat',
    subtitle: '400/day cap',
    items: [
      { label: 'Per message (≥10 chars)', pts: '+15' },
      { label: 'Hourly cap (~13 msgs)', pts: '200' },
    ],
  },
  {
    icon: BookOpen, color: 'text-green-500', title: 'Lessons',
    subtitle: '300/day cap',
    items: [
      { label: 'First 3 / day', pts: '+60 ea' },
      { label: 'Next 3 / day', pts: '+30 ea' },
      { label: 'Quiz 100%', pts: '+75' },
      { label: 'Quiz 90%+', pts: '+40' },
    ],
  },
  {
    icon: FileText, color: 'text-cyan-500', title: 'Manual Reading',
    subtitle: '300/day cap',
    items: [
      { label: 'Per 15 min reading', pts: '+50' },
    ],
  },
  {
    icon: Video, color: 'text-purple-500', title: 'Videos',
    subtitle: '200/day cap',
    items: [
      { label: 'Unique video (70%+ watched)', pts: '+40' },
      { label: 'Rewatch same day', pts: '+10' },
    ],
  },
  {
    icon: ThumbsUp, color: 'text-pink-500', title: 'Reactions',
    subtitle: '150/day cap',
    items: [
      { label: 'Your msg gets a reaction', pts: '+10' },
      { label: 'Reacting to others', pts: '+2' },
    ],
  },
  {
    icon: Users, color: 'text-indigo-500', title: '1:1 Sessions',
    items: [
      { label: 'Per session', pts: '+50' },
    ],
  },
  {
    icon: CalendarCheck, color: 'text-teal-500', title: 'Attendance',
    items: [
      { label: 'RSVP "Yes"', pts: '+pts' },
      { label: 'RSVP "No"', pts: '−pts' },
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

        <div className="space-y-2.5 pt-1">
          {SECTIONS.map(({ icon: Icon, color, title, subtitle, items }, sIdx) => (
            <div key={title} className={cn(
              "rounded-lg border overflow-hidden",
              sIdx === 0 ? "border-red-500/40 bg-red-500/5" : "border-border/40"
            )}>
              <div className={cn(
                "flex items-center gap-2 px-3 py-2",
                sIdx === 0 ? "bg-red-500/10" : "bg-muted/30"
              )}>
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
                      <span className={cn(
                        "text-[11px] font-bold tabular-nums shrink-0",
                        item.pts.startsWith('−') ? "text-red-400" : "text-foreground"
                      )}>{item.pts}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
