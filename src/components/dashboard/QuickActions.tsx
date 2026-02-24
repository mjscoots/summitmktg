import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  TrendingUp,
  ClipboardList,
  Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ManagerEventForm } from '@/components/calendar/ManagerEventForm';
import { AnnouncementModal } from '@/components/dashboard/AnnouncementModal';
import { supabase } from '@/integrations/supabase/client';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  onClick: () => void;
  adminOnly?: boolean;
  badge?: number;
}

export function QuickActions() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [pendingPitchCount, setPendingPitchCount] = useState(0);

  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    if (!isManager) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from('pitch_approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingPitchCount(count || 0);
    };
    fetchCount();

    const channel = supabase
      .channel('pitch-approvals-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitch_approval_requests' }, () => fetchCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isManager]);

  // Navigate directly to user's team page
  const handleViewTeam = () => {
    if (profile?.team_id) {
      navigate(`/app/team`);
    } else {
      navigate('/app/team');
    }
  };

  const allActions: QuickAction[] = [
    {
      icon: <Users className="w-4 h-4" />,
      label: 'View Full Team',
      shortLabel: 'Team',
      onClick: handleViewTeam,
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Schedule Event',
      shortLabel: 'Schedule',
      onClick: () => setIsEventModalOpen(true),
    },
    {
      icon: <MessageSquare className="w-4 h-4" />,
      label: 'Send Update',
      shortLabel: 'Update',
      onClick: () => setIsAnnouncementModalOpen(true),
    },
    {
      icon: <ClipboardList className="w-4 h-4" />,
      label: 'Weekly 1:1',
      shortLabel: '1:1',
      onClick: () => navigate('/app/weekly-one-on-ones'),
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'View Leaderboard',
      shortLabel: 'Leaders',
      onClick: () => navigate('/app/leaderboard'),
    },
    {
      icon: <Mic className="w-4 h-4" />,
      label: 'Pitch Approvals',
      shortLabel: 'Pitches',
      onClick: () => navigate('/app/pitch-approvals'),
      adminOnly: false,
      badge: pendingPitchCount > 0 ? pendingPitchCount : undefined,
    },
  ];

  // Filter actions based on user role
  const actions = allActions.filter(action => !action.adminOnly || isAdmin);

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-card border border-border/50",
                action.adminOnly 
                  ? "text-primary border-primary/30 bg-primary/5" 
                  : "text-muted-foreground",
                "hover:text-primary",
                "hover:border-primary/50 hover:bg-primary/5",
                "transition-all duration-200",
                "hover:-translate-y-0.5 hover:shadow-sm hover:shadow-primary/10"
              )}
            >
              {action.icon}
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.shortLabel}</span>
              {action.badge && action.badge > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                  {action.badge > 99 ? '99+' : action.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Event Creation Modal */}
      <ManagerEventForm
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={() => setIsEventModalOpen(false)}
      />

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
      />
    </>
  );
}
