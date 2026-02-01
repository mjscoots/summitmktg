import { useNavigate } from 'react-router-dom';
import { Play, Flame, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface CommandBarProps {
  streak?: number;
  signedThisWeek?: number;
}

export function CommandBar({ 
  streak = 0, 
  signedThisWeek = 0 
}: CommandBarProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isManager = role === 'manager' || role === 'admin';

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8">
      {/* Primary Actions - Left Aligned */}
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
            onClick={() => {}}
            className="font-bold bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Sign a Rep
          </Button>
        )}
      </div>

      {/* Stat Chips - Left Aligned */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-muted-foreground">
            Daily Streak: <span className="text-foreground font-bold">{streak}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
          <Users className={`w-4 h-4 ${isManager ? 'text-blue-400' : 'text-green-400'}`} />
          <span className="text-sm font-medium text-muted-foreground">
            Signed This Week: <span className="text-foreground font-bold">{signedThisWeek} reps</span>
          </span>
        </div>
      </div>
    </div>
  );
}
