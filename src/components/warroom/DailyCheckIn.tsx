import { useState } from 'react';
import { ClipboardCheck, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DailyCheckInProps {
  onSubmit: (content: string) => void;
}

export function DailyCheckIn({ onSubmit }: DailyCheckInProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [doors, setDoors] = useState('');
  const [deals, setDeals] = useState('');
  const [objections, setObjections] = useState('');
  const [lesson, setLesson] = useState('');

  const handleSubmit = () => {
    const lines = [
      `📋 **Daily Execution Check-In**`,
      `🚪 Doors Knocked: ${doors || '—'}`,
      `🤝 Deals Closed: ${deals || '—'}`,
      `💬 Objections Faced: ${objections || '—'}`,
      `📖 Lesson Learned: ${lesson || '—'}`,
    ];
    onSubmit(lines.join('\n'));
    setIsOpen(false);
    setDoors('');
    setDeals('');
    setObjections('');
    setLesson('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg hover:border-primary/40 transition-all group"
      >
        <ClipboardCheck className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-primary">Post Daily Check-In</span>
        <span className="text-[10px] text-muted-foreground ml-auto group-hover:text-foreground transition-colors">
          Log your numbers →
        </span>
      </button>
    );
  }

  return (
    <div className="border border-primary/30 rounded-lg bg-[hsl(220,14%,6%)] p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Daily Execution</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="🚪 Doors knocked"
          value={doors}
          onChange={(e) => setDoors(e.target.value)}
          className="bg-muted/40 border border-border/50 rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
        />
        <input
          placeholder="🤝 Deals closed"
          value={deals}
          onChange={(e) => setDeals(e.target.value)}
          className="bg-muted/40 border border-border/50 rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
        />
      </div>
      <input
        placeholder="💬 Objections you faced..."
        value={objections}
        onChange={(e) => setObjections(e.target.value)}
        className="w-full bg-muted/40 border border-border/50 rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
      />
      <input
        placeholder="📖 Key lesson learned today..."
        value={lesson}
        onChange={(e) => setLesson(e.target.value)}
        className="w-full bg-muted/40 border border-border/50 rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!doors && !deals}
        className="w-full gap-1.5 h-8 text-xs"
      >
        <Send className="w-3 h-3" />
        Post Check-In
      </Button>
    </div>
  );
}
