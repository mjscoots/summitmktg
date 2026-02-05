import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
interface MomentumMeterProps {
  streak: number;
}
export function MomentumMeter({
  streak
}: MomentumMeterProps) {
  // Calculate momentum level (0-100) based on streak
  const momentum = Math.min(streak * 15, 100);
  const level = streak < 3 ? 'Building' : streak < 7 ? 'Rising' : streak < 14 ? 'Strong' : 'On Fire';
  return <div className="flex items-center gap-2">
      
      
      {/* Mini progress bar */}
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-500", "bg-gradient-to-r from-orange-500 to-yellow-500")} style={{
        width: `${momentum}%`
      }} />
      </div>
    </div>;
}