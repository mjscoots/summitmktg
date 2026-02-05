 import { Users, UserCheck, GraduationCap } from 'lucide-react';
 import { useEffect, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 
 interface Stats {
   activeManagers: number;
   activeRookies: number;
   totalActive: number;
   trainingCompletion: number;
 }
 
 export function CommandCenterHeader() {
   const [stats, setStats] = useState<Stats>({
     activeManagers: 0,
     activeRookies: 0,
     totalActive: 0,
     trainingCompletion: 0,
   });
   const [isLoading, setIsLoading] = useState(true);
 
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
       <div className="relative h-32 rounded-xl overflow-hidden mb-4">
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
         <div className="absolute inset-0 flex flex-col items-center justify-center">
           <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
             COMMAND CENTER
           </h1>
           <p className="text-sm text-white/60 mt-1">
             Lead with pressure. Sign with purpose.
           </p>
         </div>
       </div>
 
       {/* Status Strip */}
       <div className="flex items-center justify-center gap-6 text-sm py-2 border-b border-border/30">
         <StatusItem 
           icon={<Users className="w-3.5 h-3.5" />}
           label="Active Managers"
           value={isLoading ? '—' : stats.activeManagers.toString()}
         />
         <Divider />
         <StatusItem 
           icon={<UserCheck className="w-3.5 h-3.5" />}
           label="Active Rookies"
           value={isLoading ? '—' : stats.activeRookies.toString()}
         />
         <Divider />
         <StatusItem 
           icon={<Users className="w-3.5 h-3.5" />}
           label="Active Reps"
           value={isLoading ? '—' : stats.totalActive.toString()}
         />
         <Divider />
         <StatusItem 
           icon={<GraduationCap className="w-3.5 h-3.5" />}
           label="Rookie Training"
           value={isLoading ? '—' : `${stats.trainingCompletion}%`}
         />
       </div>
     </div>
   );
 }
 
 function StatusItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
   return (
     <div className="flex items-center gap-2">
       <span className="text-primary/60">{icon}</span>
       <span className="text-muted-foreground text-xs">{label}:</span>
       <span className="text-green-500/80 font-medium text-sm">{value}</span>
     </div>
   );
 }
 
 function Divider() {
   return <div className="h-4 w-px bg-border/50" />;
 }