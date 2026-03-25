 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { formatTimeMinutes } from '@/hooks/useActivityTracking';
 import { UserAvatar } from '@/components/shared/UserAvatar';
 
 interface TeamMemberTime {
   user_id: string;
   full_name: string;
   avatar_url: string | null;
   time_this_week_minutes: number;
 }
 
 interface TeamTimeStatsProps {
   teamId: string;
   teamName: string;
   className?: string;
 }
 
 export function TeamTimeStats({ teamId, teamName, className }: TeamTimeStatsProps) {
   const [members, setMembers] = useState<TeamMemberTime[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isExpanded, setIsExpanded] = useState(false);
 
   useEffect(() => {
     const fetchTimeData = async () => {
       setIsLoading(true);
       try {
         // Calculate current PST Monday for stale-week detection
         const pstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
         const pstDay = pstNow.getDay();
         const pstDiffToMon = pstDay === 0 ? -6 : 1 - pstDay;
         const pstMon = new Date(pstNow);
         pstMon.setDate(pstNow.getDate() + pstDiffToMon);
         const pstMondayStr = `${pstMon.getFullYear()}-${String(pstMon.getMonth() + 1).padStart(2, '0')}-${String(pstMon.getDate()).padStart(2, '0')}`;

         const { data, error } = await supabase
           .from('profiles')
           .select('user_id, full_name, avatar_url, time_this_week_minutes, week_start')
           .eq('team_id', teamId)
           .neq('status', 'nlc')
           .order('time_this_week_minutes', { ascending: false });

         if (!error && data) {
           setMembers(data.map(d => ({
             user_id: d.user_id,
             full_name: d.full_name,
             avatar_url: d.avatar_url,
             // Show 0 if user's week_start is stale (hasn't logged in this week)
             time_this_week_minutes: (d.week_start || '1970-01-01') < pstMondayStr ? 0 : (d.time_this_week_minutes || 0),
           })));
         }
       } catch (err) {
         console.error('Error fetching team time data:', err);
       } finally {
         setIsLoading(false);
       }
     };
 
     if (teamId) {
       fetchTimeData();
     }
   }, [teamId]);
 
   const totalMinutes = members.reduce((sum, m) => sum + m.time_this_week_minutes, 0);
   const totalHours = (totalMinutes / 60).toFixed(1);
 
   if (isLoading) {
     return (
       <div className={cn("bg-card rounded-lg border border-border/50 p-4", className)}>
         <div className="animate-pulse h-8 bg-muted rounded" />
       </div>
     );
   }
 
   return (
     <div className={cn("bg-card rounded-lg border border-border/50", className)}>
       <button
         onClick={() => setIsExpanded(!isExpanded)}
         className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
       >
         <div className="flex items-center gap-3">
           <div className="p-2 rounded-lg bg-primary/10">
             <Clock className="w-4 h-4 text-primary" />
           </div>
           <div className="text-left">
             <p className="text-sm font-medium text-foreground">Team Activity</p>
             <p className="text-xs text-muted-foreground">This week</p>
           </div>
         </div>
         <div className="flex items-center gap-3">
           <div className="text-right">
             <p className="text-lg font-bold text-foreground">{totalHours} hrs</p>
             <p className="text-xs text-muted-foreground">{members.length} members</p>
           </div>
           {isExpanded ? (
             <ChevronUp className="w-4 h-4 text-muted-foreground" />
           ) : (
             <ChevronDown className="w-4 h-4 text-muted-foreground" />
           )}
         </div>
       </button>
 
       {isExpanded && (
         <div className="border-t border-border/30 p-4 space-y-2">
           <div className="text-xs text-muted-foreground mb-3 flex justify-between">
             <span>Member</span>
             <span>Time This Week</span>
           </div>
           {members.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-4">
               No activity data available
             </p>
           ) : (
             members.map((member, index) => (
               <div 
                 key={member.user_id}
                 className={cn(
                   "flex items-center justify-between p-2 rounded-lg",
                   index < 3 ? "bg-primary/5" : "bg-muted/30"
                 )}
               >
                 <div className="flex items-center gap-2">
                   {index < 3 && (
                     <span className={cn(
                       "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                       index === 0 ? "bg-primary text-white" :
                       index === 1 ? "bg-gray-400 text-white" :
                       "bg-amber-700 text-white"
                     )}>
                       {index + 1}
                     </span>
                   )}
                   <UserAvatar 
                     avatarUrl={member.avatar_url} 
                     fullName={member.full_name} 
                     size="xs" 
                   />
                   <span className="text-sm text-foreground truncate max-w-[150px]">
                     {member.full_name.split(' ').slice(0, 2).join(' ')}
                   </span>
                 </div>
                 <span className={cn(
                   "text-sm font-medium",
                   member.time_this_week_minutes < 60 ? "text-destructive" :
                   member.time_this_week_minutes < 180 ? "text-warning" :
                   "text-success"
                 )}>
                   {formatTimeMinutes(member.time_this_week_minutes)}
                 </span>
               </div>
             ))
           )}
         </div>
       )}
     </div>
   );
 }