import { Users, UserCheck, GraduationCap } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
interface Stats {
  managerCount: number;
  rookieCount: number;
  totalReps: number;
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
  const [stats, setStats] = useState<Stats>({
    managerCount: 0,
    rookieCount: 0,
    totalReps: 0,
    trainingCompletion: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.full_name) return;
      try {
        // Get full downline using RPC
        const { data: downline } = await supabase
          .rpc('get_user_downline', { _manager_name: profile.full_name });

        const members = downline || [];
        let managers = 0;
        let rookies = 0;

        members.forEach((m: any) => {
          if (m.role === 'manager' || m.role === 'admin') {
            managers++;
          } else {
            rookies++;
          }
        });

        // Get rookie training completion for downline rookies
        const rookieUserIds = members.filter((m: any) => m.role === 'rookie').map((m: any) => m.user_id);
        let avgCompletion = 0;

        if (rookieUserIds.length > 0) {
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

              if (totalLessons && totalLessons > 0) {
                // Batch fetch all progress
                const { data: progressData } = await supabase
                  .from('lesson_progress')
                  .select('user_id')
                  .in('user_id', rookieUserIds)
                  .not('completed_at', 'is', null);

                const completionMap = new Map<string, number>();
                (progressData || []).forEach((p: any) => {
                  completionMap.set(p.user_id, (completionMap.get(p.user_id) || 0) + 1);
                });

                let completionTotal = 0;
                rookieUserIds.forEach((uid: string) => {
                  const completed = completionMap.get(uid) || 0;
                  completionTotal += Math.min(100, Math.round((completed / totalLessons) * 100));
                });
                avgCompletion = Math.round(completionTotal / rookieUserIds.length);
              }
            }
          }
        }

        setStats({
          managerCount: managers,
          rookieCount: rookies,
          totalReps: members.length,
          trainingCompletion: avgCompletion,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [profile?.full_name]);
 
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
        </div>
      </div>
 
      {/* Status Strip */}
      <div className="flex items-center justify-center flex-wrap gap-4 md:gap-6 text-sm py-2 border-b border-border/30">
        <StatusItem 
          icon={<Users className="w-3.5 h-3.5" />}
          label="Managers"
          value={stats.managerCount}
          isLoading={isLoading}
        />
        <Divider />
        <StatusItem 
          icon={<UserCheck className="w-3.5 h-3.5" />}
          label="Rookies"
          value={stats.rookieCount}
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