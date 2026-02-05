 import { useNavigate } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 import { useStreak } from '@/hooks/useStreak';
 import { AppLayout } from '@/components/layout/AppLayout';
 import { CommunityFeed } from '@/components/dashboard/CommunityFeed';
 import { WeeklyScheduleExpanded } from '@/components/dashboard/WeeklyScheduleExpanded';
 import { DailyChecklist } from '@/components/dashboard/DailyChecklist';
 import { MomentumMeter } from '@/components/dashboard/MomentumMeter';
 import { AICoachChat } from '@/components/dashboard/AICoachChat';
 import { StreakDisplay } from '@/components/training/StreakDisplay';
 import { Button } from '@/components/ui/button';
 import { UserPlus, Play, BookOpen } from 'lucide-react';
 
 export default function DashboardPage() {
   const navigate = useNavigate();
   const { role, profile, isLoading } = useAuth();
   const { streakData } = useStreak();
   
   const isManager = role === 'manager' || role === 'admin';
   const isAdmin = role === 'admin';
   const firstName = profile?.full_name?.split(' ')[0] || 'there';
 
   if (isLoading) {
     return (
       <AppLayout>
         <div className="min-h-[50vh] flex items-center justify-center">
           <div className="animate-pulse text-muted-foreground">Loading...</div>
         </div>
       </AppLayout>
     );
   }
 
   return (
     <AppLayout>
       <div className="max-w-5xl mx-auto px-4 py-6">
         {/* Greeting + Momentum + Streak */}
         <div className="flex items-start justify-between mb-6">
           <div>
             <h1 className="text-xl font-bold text-foreground">
               {isManager ? 'Command Center' : `What's up, ${firstName}`}
             </h1>
             <p className="text-sm text-muted-foreground mt-0.5">
               {isManager 
                 ? 'Lead with pressure, sign with purpose' 
                 : 'Complete training. Build momentum.'}
             </p>
           </div>
           <div className="flex items-center gap-3">
             <StreakDisplay variant="compact" clickable />
             <MomentumMeter streak={streakData.currentStreak} />
           </div>
         </div>
 
         {/* Primary CTAs */}
         <div className="flex flex-wrap gap-3 mb-4">
           {isManager ? (
             <>
               <Button
                 onClick={() => navigate('/app/interviews')}
                 className="gap-2 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                 size="lg"
               >
                 <UserPlus className="w-5 h-5" />
                 Sign a Rep
               </Button>
               <Button
                 onClick={() => navigate('/app/training')}
                 variant="outline"
                 className="gap-2 font-semibold border-primary/50 text-foreground hover:bg-primary/10"
               >
                 <Play className="w-4 h-4" />
                 Resume Training
               </Button>
             </>
           ) : (
             <Button
               onClick={() => navigate('/app/training')}
               className="gap-2 font-bold bg-success hover:bg-success/90 shadow-lg shadow-success/25"
               size="lg"
             >
               <BookOpen className="w-5 h-5" />
               Open Training
             </Button>
           )}
         </div>
 
         {/* Daily Checklist */}
         <div className="mb-4">
           <DailyChecklist />
         </div>
 
         {/* Community Announcements + Calendar - Side by side, equal height */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
           <div className="h-full">
             <CommunityFeed canPost={isManager} isAdmin={isAdmin} />
           </div>
           <div className="h-full">
             <WeeklyScheduleExpanded />
           </div>
         </div>
       </div>
 
       {/* AI Coach */}
       <AICoachChat />
     </AppLayout>
   );
 }