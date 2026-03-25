import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTeamData } from '@/hooks/useTeamData';
import { Phone, Calendar, ChevronRight, AlertTriangle, Loader2, Clock, Flame, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { MemberProfileModal } from '@/components/team/MemberProfileModal';
import { formatLastActive } from '@/hooks/useActivityTracking';
import type { TeamMember } from '@/lib/hierarchyUtils';
import { OneOnOneTasks } from './OneOnOneTasks';

 // Extended TeamMember type with avatar for local use
 interface TeamMemberWithAvatar extends TeamMember {
   avatar_url?: string | null;
 }

interface PriorityItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  urgent?: boolean;
  count?: number;
}

export function TodaysPriorities() {
   const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const navigate = useNavigate();
  const { role, profile } = useAuth();
   const { needsAttention, needsCheckIn, members, teamName, isLoading } = useTeamData();

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';

  if (!isManager) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border/50 p-6 flex items-center justify-center min-h-[150px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate lowest performers - always show at least 3
  const activeMembers = members.filter(m => m.status === 'active');
  const lowestPerformers = [...activeMembers]
    .sort((a, b) => a.trainingProgress - b.trainingProgress)
    .slice(0, 3);
  
   // Convert useTeamData member to TeamMember type for modal
   const convertToTeamMember = (m: typeof members[0]): TeamMemberWithAvatar => {
     return {
       id: m.id,
       user_id: m.user_id,
       full_name: m.full_name,
       email: m.email,
       phone: null,
       pillar: null,
       direct_manager: null,
       role: 'rookie',
       status: m.status,
       avatar_url: m.avatar_url,
       experience: null,
     };
   };

   // Create roster for modal
   const roster = members.map(convertToTeamMember);

  const behindOnTraining = needsAttention.length;

  const priorities: PriorityItem[] = [
    { 
      id: '1', 
      title: `Check in with ${lowestPerformers.length} reps`, 
      icon: Phone, 
      action: '/app/team',
      count: lowestPerformers.length,
    },
  ];

  if (behindOnTraining > 0) {
    priorities.push({ 
      id: '2', 
      title: `${behindOnTraining} rep${behindOnTraining > 1 ? 's' : ''} behind on training`, 
      icon: AlertTriangle, 
      action: '/app/team', 
      urgent: true 
    });
  }

  priorities.push({ 
    id: '3', 
    title: 'Book 2 interviews', 
    icon: Calendar, 
    action: '/app/interviews' 
  });

  return (
    <div className="bg-card rounded-xl border border-border/50">
      <div className="p-3 border-b border-border/30 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-destructive/10">
          <Swords className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h2 className="font-black text-sm text-foreground tracking-tight">
            DAILY WAR PLAN {teamName ? `— ${teamName}` : ''}
          </h2>
          <p className="text-[10px] text-muted-foreground">Lead with pressure. Sign with purpose.</p>
        </div>
      </div>
      <div className="p-2 space-y-1">
        {priorities.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.action)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-md transition-all text-left group",
              "hover:bg-muted/50",
              item.urgent && "bg-destructive/5 border border-destructive/20"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-md",
              item.urgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className={cn(
              "flex-1 text-sm font-medium",
              item.urgent ? "text-destructive" : "text-foreground"
            )}>
              {item.title}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </div>

      {/* Show lowest performing reps (always show if we have members) */}
      {lowestPerformers.length > 0 && (
        <div className="p-3 pt-0">
          <div className="text-xs text-muted-foreground mb-2">Lowest training progress:</div>
          <div className="space-y-1.5">
            {lowestPerformers.map(member => (
              <div 
                key={member.id}
                 className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                 onClick={() => setSelectedMember(convertToTeamMember(member))}
              >
                <UserAvatar 
                  avatarUrl={member.avatar_url} 
                  fullName={member.full_name} 
                  size="xs" 
                />
                 <span className="text-xs text-primary truncate flex-1 group-hover:underline">
                  {member.full_name.split(' ').slice(0, 2).join(' ')}
                </span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  member.trainingProgress < 30 
                    ? "bg-destructive/10 text-destructive" 
                    : member.trainingProgress < 60 
                      ? "bg-primary/10 text-amber-600"
                      : "bg-success/10 text-success"
                )}>
                  {member.trainingProgress}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

       {/* Needs Check-In Section - Inactive members */}
       {needsCheckIn.length > 0 && (
         <div className="p-3 pt-0">
           <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
             <Clock className="w-3 h-3" />
             <span>Needs check-in (inactive 24+ hrs):</span>
           </div>
           <div className="space-y-1.5">
             {needsCheckIn.map(member => (
               <div 
                 key={member.id}
                 className="flex items-center gap-2 p-1.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer group"
                 onClick={() => setSelectedMember(convertToTeamMember(member))}
               >
                 <UserAvatar 
                   avatarUrl={member.avatar_url} 
                   fullName={member.full_name} 
                   size="xs" 
                 />
                 <span className="text-xs text-amber-600 truncate flex-1 group-hover:underline">
                   {member.full_name.split(' ').slice(0, 2).join(' ')}
                 </span>
                 <span className="text-[10px] text-muted-foreground">
                   {formatLastActive(member.last_active_at || null)}
                 </span>
               </div>
             ))}
           </div>
         </div>
       )}
 
       {/* All team members active message */}
       {needsCheckIn.length === 0 && members.length > 0 && (
         <div className="px-3 pb-3">
           <div className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
             <Flame className="w-4 h-4 text-success" />
             <span className="text-xs text-success font-medium">
               All team members active within 24 hours!
             </span>
           </div>
         </div>
       )}

       {/* Tasks from Weekly 1:1's */}
       <OneOnOneTasks />
 
       {/* Member Profile Modal */}
       <MemberProfileModal
         member={selectedMember as TeamMember | null}
         open={!!selectedMember}
         onClose={() => setSelectedMember(null)}
         roster={roster}
       />
    </div>
  );
}
