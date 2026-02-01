import { useNavigate } from 'react-router-dom';
import { Play, Megaphone, Flame, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface CommandBarProps {
  streak?: number;
  completedPercent?: number;
  lessonsThisWeek?: number;
}

export function CommandBar({ 
  streak = 0, 
  completedPercent = 0, 
  lessonsThisWeek = 0 
}: CommandBarProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8">
      {/* Primary Actions */}
      <div className="flex items-center gap-3">
        <Button 
          onClick={() => navigate('/app/training')}
          className={`font-bold px-5 py-2.5 ${
            isManager 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          <Play className="w-4 h-4 mr-2" />
          Resume Training
        </Button>
        
        {isManager && (
          <Button 
            variant="outline"
            onClick={() => {}}
            className="font-medium border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Post Announcement
          </Button>
        )}
      </div>

      {/* Stat Chips */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-muted-foreground">
            Streak: <span className="text-foreground">{streak}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
          <Target className={`w-4 h-4 ${isManager ? 'text-blue-400' : 'text-green-400'}`} />
          <span className="text-sm font-medium text-muted-foreground">
            Completed: <span className="text-foreground">{completedPercent}%</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-muted-foreground">
            This Week: <span className="text-foreground">{lessonsThisWeek} lessons</span>
          </span>
        </div>
      </div>
    </div>
  );
}
