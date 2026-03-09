import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyMomentumProps {
  hoursToday: number;
}

const LEVELS = [
  { label: 'Cold', minHours: 0, color: 'bg-muted-foreground/40' },
  { label: 'Focused', minHours: 2, color: 'bg-blue-500' },
  { label: 'Locked In', minHours: 4, color: 'bg-orange-500' },
  { label: 'Elite', minHours: 5, color: 'bg-yellow-400' },
];

export function DailyMomentum({ hoursToday }: DailyMomentumProps) {
  const currentLevel = [...LEVELS].reverse().find(l => hoursToday >= l.minHours) || LEVELS[0];
  const percent = Math.min((hoursToday / 5) * 100, 100);

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className={cn("w-4 h-4", 
          hoursToday >= 5 ? "text-yellow-400" : 
          hoursToday >= 4 ? "text-orange-400" : 
          hoursToday >= 2 ? "text-blue-400" : "text-muted-foreground"
        )} />
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Daily Momentum</h2>
        <span className={cn("ml-auto text-xs font-black uppercase tracking-wider",
          hoursToday >= 5 ? "text-yellow-400" : 
          hoursToday >= 4 ? "text-orange-400" : 
          hoursToday >= 2 ? "text-blue-400" : "text-muted-foreground"
        )}>
          {currentLevel.label}
        </span>
      </div>

      {/* Momentum bar with level markers */}
      <div className="relative mb-2">
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              hoursToday >= 5 ? "bg-gradient-to-r from-orange-500 via-yellow-400 to-yellow-300" :
              hoursToday >= 4 ? "bg-gradient-to-r from-blue-500 to-orange-500" :
              hoursToday >= 2 ? "bg-gradient-to-r from-primary to-blue-400" :
              "bg-muted-foreground/50"
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        {/* Level markers */}
        <div className="flex justify-between mt-1.5">
          {LEVELS.map((level) => (
            <div key={level.label} className="flex flex-col items-center" style={{ width: level.minHours === 0 ? 'auto' : undefined }}>
              <span className={cn(
                "text-[9px] font-medium",
                hoursToday >= level.minHours ? "text-foreground" : "text-muted-foreground/50"
              )}>
                {level.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
