import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Flame, MessageSquare, BookOpen, Video, FileText, Zap, Trophy, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PointSystemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTIONS = [
  {
    icon: Clock, color: 'text-blue-500', title: '#1 — Hours Logged (Primary)',
    items: [
      '100 pts per hour of qualified learning time',
      'Daily cap: 600 pts (≈ 6 hrs)',
      '5 hrs/day = ELITE participation',
      'Only counts active time — 90-sec idle auto-pause',
      'Tab must be in focus to count',
    ],
  },
  {
    icon: Flame, color: 'text-orange-500', title: '#2 — Streak & Daily Login',
    items: [
      '+75 pts daily login bonus',
      '+25 pts per day maintaining streak',
      'Streak requires 20 min activity or 1 lesson/quiz per day',
      'Milestones: 3d (+100) · 7d (+300) · 14d (+700) · 30d (+2,000)',
    ],
  },
  {
    icon: MessageSquare, color: 'text-emerald-500', title: '#3 — Chat Participation',
    items: [
      '+20 pts per qualifying message (≥10 chars, no spam)',
      'Hourly cap: 10 messages/hr (200 pts/hr)',
      'Daily cap: 600 pts from chat',
      '+10 pts when your message gets a reaction',
      '+2 pts for reacting to others',
      'Duplicates, single-word & emoji-only messages don\'t count',
    ],
  },
  {
    icon: BookOpen, color: 'text-green-500', title: '#4 — Lessons (Diminishing Returns)',
    items: [
      'First 3/day: 60 pts each',
      'Next 3/day: 30 pts each',
      'Beyond 6/day: 10 pts each',
      'Daily cap: 300 pts',
      'Quiz bonus: 80%+ (+25) · 90%+ (+40) · 100% (+60)',
    ],
  },
  {
    icon: Video, color: 'text-purple-500', title: '#5 — Videos Watched',
    items: [
      '+40 pts per video watch (rewatches count)',
      'Daily cap: 200 pts',
    ],
  },
  {
    icon: Zap, color: 'text-yellow-500', title: 'Weekly Threshold Bonuses',
    items: [
      '300 min (5 hrs) = +500 pts',
      '600 min (10 hrs) = +1,200 pts',
      '900 min (15 hrs) = +2,000 pts',
    ],
  },
];

export function PointSystemModal({ open, onOpenChange }: PointSystemModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Revised Point System
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 text-primary inline mr-1" />
            <strong>Your past points are preserved.</strong> This revised system applies going forward.
            Hours logged is now the #1 driver. Rushing lessons no longer dominates.
          </div>

          {SECTIONS.map(({ icon: Icon, color, title, items }) => (
            <div key={title} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className={cn('w-4 h-4', color)} />
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
              </div>
              <ul className="space-y-0.5 ml-6">
                {items.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground list-disc">{item}</li>
                ))}
              </ul>
            </div>
          ))}

          <div className="p-3 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-[11px] text-muted-foreground">
              <strong>Elite Participation:</strong> 5 hrs/day · <strong>Strong:</strong> 3 hrs/day · <strong>Baseline:</strong> 1 hr/day
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
