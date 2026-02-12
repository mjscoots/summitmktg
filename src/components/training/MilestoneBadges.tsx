import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Award, Shield, Star, Mountain } from 'lucide-react';

interface Badge {
  type: string;
  label: string;
  threshold: number;
  icon: React.ReactNode;
  colorClass: string;
  glowClass: string;
}

const BADGES: Badge[] = [
  {
    type: 'bronze',
    label: 'Bronze',
    threshold: 25,
    icon: <Shield className="w-5 h-5" />,
    colorClass: 'text-amber-600',
    glowClass: 'bg-amber-600/20 border-amber-600/40',
  },
  {
    type: 'silver',
    label: 'Silver',
    threshold: 50,
    icon: <Award className="w-5 h-5" />,
    colorClass: 'text-slate-300',
    glowClass: 'bg-slate-300/20 border-slate-300/40',
  },
  {
    type: 'gold',
    label: 'Gold',
    threshold: 75,
    icon: <Star className="w-5 h-5" />,
    colorClass: 'text-yellow-400',
    glowClass: 'bg-yellow-400/20 border-yellow-400/40',
  },
  {
    type: 'summit',
    label: 'Summit',
    threshold: 100,
    icon: <Mountain className="w-5 h-5" />,
    colorClass: 'text-primary',
    glowClass: 'bg-primary/20 border-primary/40',
  },
];

interface MilestoneBadgesProps {
  percentage: number;
}

export function MilestoneBadges({ percentage }: MilestoneBadgesProps) {
  const { user } = useAuth();
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set());

  // Fetch existing achievements
  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_training_achievements')
        .select('badge_type')
        .eq('user_id', user.id);

      if (data) {
        setEarnedBadges(new Set(data.map(d => d.badge_type)));
      }
    };
    fetchAchievements();
  }, [user?.id]);

  // Award new badges when percentage crosses thresholds
  useEffect(() => {
    const awardBadges = async () => {
      if (!user?.id || percentage === 0) return;

      for (const badge of BADGES) {
        if (percentage >= badge.threshold && !earnedBadges.has(badge.type)) {
          const { error } = await supabase
            .from('user_training_achievements')
            .upsert(
              { user_id: user.id, badge_type: badge.type },
              { onConflict: 'user_id,badge_type' }
            );

          if (!error) {
            setEarnedBadges(prev => new Set(prev).add(badge.type));
          }
        }
      }
    };
    awardBadges();
  }, [percentage, user?.id, earnedBadges]);

  return (
    <div className="flex items-center gap-3 mb-6">
      {BADGES.map((badge) => {
        const isEarned = earnedBadges.has(badge.type);
        return (
          <div
            key={badge.type}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300",
              isEarned
                ? `${badge.glowClass} ${badge.colorClass}`
                : "bg-muted/30 border-border/30 text-muted-foreground/40 grayscale"
            )}
          >
            <div className={cn(
              "transition-transform duration-300",
              isEarned && "scale-110"
            )}>
              {badge.icon}
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">
              {badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
