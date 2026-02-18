import { Users, UserCheck, GraduationCap } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { ManagerMetrics } from './ManagerMetrics';
import { cn } from '@/lib/utils';
 
interface Stats {
  activeManagers: number;
  activeRookies: number;
  totalActive: number;
  trainingCompletion: number;
}

interface AnimatedValueProps {
  value: number;
  suffix?: string;
}

function AnimatedValue({ value, suffix = '' }: AnimatedValueProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setIsAnimating(true);
      const startValue = prevRef.current;
      const diff = value - startValue;
      const duration = 500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(startValue + diff * eased));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(() => setIsAnimating(false), 150);
        }
      };
      
      requestAnimationFrame(animate);
      prevRef.current = value;
    }
  }, [value]);

  return (
    <span className={cn(
      "transition-all duration-200",
      isAnimating && "text-primary scale-110"
    )}>
      {displayValue}{suffix}
    </span>
  );
}
 
export function CommandCenterHeader() {
  const { profile } = useAuth();
  const { streakData } = useStreak();
  const [stats, setStats] = useState<Stats>({
    activeManagers: 0,
    activeRookies: 0,
    totalActive: 0,
    trainingCompletion: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [momentum, setMomentum] = useState(0);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Calculate momentum based on activity
  useEffect(() => {
    // Simple momentum calculation based on streak and activity
    // In production, this would pull from actual activity logs
    const basePoints = Math.min(streakData.currentStreak * 10, 50);
    const activityPoints = Math.min(streakData.totalDaysActive * 3, 30);
    const randomBonus = Math.floor(Math.random() * 20); // Simulate other interactions
    setMomentum(Math.min(basePoints + activityPoints + randomBonus, 100));
  }, [streakData]);
 
   useEffect(() => {
     const fetchStats = async () => {
       try {
         // Get active users (active in last 5 minutes)
         // Get all active users count  
         const { data: activeProfiles } = await supabase
           .from('profiles')
           .select('user_id')
           .eq('is_active_now', true);
 
         // Get roles for active users
         const activeUserIds = activeProfiles?.map(p => p.user_id) || [];
         
         let managers = 0;
         let rookies = 0;
         
         if (activeUserIds.length > 0) {
           const { data: roles } = await supabase
             .from('user_roles')
             .select('user_id, role')
             .in('user_id', activeUserIds);
           
           const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
           
           activeUserIds.forEach(userId => {
             const role = roleMap.get(userId);
             if (role === 'manager' || role === 'admin') {
               managers++;
             } else {
               rookies++;
             }
           });
         }
 
         // Get rookie training completion
         const { data: rookieProfiles } = await supabase
           .from('user_roles')
           .select('user_id')
           .eq('role', 'rookie');
 
         const rookieUserIds = rookieProfiles?.map(r => r.user_id) || [];
         let completionTotal = 0;
         let rookieCount = rookieUserIds.length;
 
         if (rookieUserIds.length > 0) {
           // Get total required lessons (from Learn Your Pitch + Summer Sales Manual)
           const { data: courses } = await supabase
             .from('training_courses')
             .select('id')
             .in('slug', ['learn-your-pitch', 'summer-sales-manual'])
             .eq('is_active', true);
 
           const courseIds = courses?.map(c => c.id) || [];
           
           if (courseIds.length > 0) {
             const { data: modules } = await supabase
               .from('training_modules')
               .select('id')
               .in('course_id', courseIds)
               .eq('is_active', true);
 
             const moduleIds = modules?.map(m => m.id) || [];
             
             if (moduleIds.length > 0) {
               const { count: totalLessons } = await supabase
                 .from('training_lessons')
                 .select('*', { count: 'exact', head: true })
                 .in('module_id', moduleIds)
                 .eq('is_active', true);
 
               // For each rookie, get their completion percentage
               for (const userId of rookieUserIds.slice(0, 50)) { // Limit to prevent timeout
                 const { count: completed } = await supabase
                   .from('lesson_progress')
                   .select('*', { count: 'exact', head: true })
                   .eq('user_id', userId)
                   .not('completed_at', 'is', null);
 
                 if (totalLessons && totalLessons > 0) {
                   completionTotal += Math.min(100, Math.round(((completed || 0) / totalLessons) * 100));
                 }
               }
             }
           }
         }
 
         const avgCompletion = rookieCount > 0 ? Math.round(completionTotal / Math.min(rookieCount, 50)) : 0;
 
         setStats({
           activeManagers: managers,
           activeRookies: rookies,
           totalActive: activeUserIds.length,
           trainingCompletion: avgCompletion,
         });
       } catch (err) {
         console.error('Error fetching stats:', err);
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchStats();
     
     // Refresh every 30 seconds
     const interval = setInterval(fetchStats, 30000);
     return () => clearInterval(interval);
   }, []);
 
  return (
    <div className="mb-6">
      {/* Hero Banner - Mountain Silhouette */}
      <div className="relative h-36 rounded-xl overflow-hidden mb-4">
        {/* Background gradient - Navy to Blue */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-950 to-primary/40" />
        
        {/* Mountain silhouette SVG */}
        <svg 
          className="absolute bottom-0 left-0 right-0 w-full h-16 opacity-20"
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,120 L0,80 L100,60 L200,85 L300,45 L400,70 L500,30 L600,55 L700,25 L800,50 L900,20 L1000,40 L1100,15 L1200,35 L1200,120 Z" 
            fill="currentColor" 
            className="text-primary/30"
          />
          <path 
            d="M0,120 L0,90 L150,75 L300,90 L450,60 L600,80 L750,50 L900,70 L1050,45 L1200,60 L1200,120 Z" 
            fill="currentColor" 
            className="text-slate-800/50"
          />
        </svg>
        
        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-between px-6">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              COMMAND CENTER
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              Lead with pressure. Sign with purpose.
            </p>
            <p className="text-sm text-white/80 mt-2">
              Welcome back, <span className="font-semibold">{firstName}</span>
            </p>
          </div>
          
          {/* Streak & Momentum - Right side */}
          <div className="hidden sm:block">
            <ManagerMetrics 
              streak={streakData.currentStreak} 
              momentum={momentum}
              lastTrainedAgo={streakData.lastLoginDate ? 'Today' : undefined}
            />
          </div>
        </div>
      </div>
      
      {/* Mobile metrics - show below header on small screens */}
      <div className="sm:hidden mb-4 flex justify-center">
        <ManagerMetrics 
          streak={streakData.currentStreak} 
          momentum={momentum}
          lastTrainedAgo={streakData.lastLoginDate ? 'Today' : undefined}
        />
      </div>
 
      {/* Status Strip */}
      <div className="flex items-center justify-center flex-wrap gap-4 md:gap-6 text-sm py-2 border-b border-border/30">
        <StatusItem 
          icon={<Users className="w-3.5 h-3.5" />}
          label="Active Managers"
          value={stats.activeManagers}
          isLoading={isLoading}
        />
        <Divider />
        <StatusItem 
          icon={<UserCheck className="w-3.5 h-3.5" />}
          label="Active Rookies"
          value={stats.activeRookies}
          isLoading={isLoading}
        />
        <Divider />
        <StatusItem 
          icon={<Users className="w-3.5 h-3.5" />}
          label="Active Reps"
          value={stats.totalActive}
          isLoading={isLoading}
        />
        <Divider />
        <StatusItemPercent 
          icon={<GraduationCap className="w-3.5 h-3.5" />}
          label="Rookie Training"
          value={stats.trainingCompletion}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
 
function StatusItem({ icon, label, value, isLoading }: { icon: React.ReactNode; label: string; value: number; isLoading: boolean; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary/60">{icon}</span>
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span className="text-green-500/80 font-medium text-sm">
        {isLoading ? '—' : <AnimatedValue value={value} />}
      </span>
    </div>
  );
}

function StatusItemPercent({ icon, label, value, isLoading }: { icon: React.ReactNode; label: string; value: number; isLoading: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary/60">{icon}</span>
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span className="text-green-500/80 font-medium text-sm">
        {isLoading ? '—' : <><AnimatedValue value={value} />%</>}
      </span>
    </div>
  );
}
 
 function Divider() {
   return <div className="h-4 w-px bg-border/50" />;
 }