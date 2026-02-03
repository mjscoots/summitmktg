import { useState, useEffect } from 'react';
import { X, PartyPopper, HandMetal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { RookieWelcomeModal } from './RookieWelcomeModal';
import { MemberProfileModal } from './MemberProfileModal';
import { TeamMember } from '@/lib/hierarchyUtils';

interface TeamNotification {
  id: string;
  team_id: string | null;
  type: string;
  signer_user_id: string;
  signer_name: string;
  new_rep_name: string;
  new_rep_email: string | null;
  new_rep_phone: string | null;
  created_at: string;
  expires_at: string;
  dismissed_by_users: string[];
}

interface TeamNotificationBannersProps {
  teamId?: string;
  teamName?: string;
  roster?: TeamMember[];
}

export function TeamNotificationBanners({ teamId, teamName, roster = [] }: TeamNotificationBannersProps) {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<TeamNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState<{ name: string; phone: string } | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const isManager = role === 'manager' || role === 'admin';

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('team_notifications')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Filter by team if specified
      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching team notifications:', error);
        return;
      }

      // Filter out dismissed notifications and role-specific ones
      const filteredNotifications = (data || []).filter((n: TeamNotification) => {
        // Check if user dismissed this notification
        if (n.dismissed_by_users?.includes(user.id)) return false;
        
        // If manager_only, only show to managers
        if (n.type === 'manager_only' && !isManager) return false;
        
        return true;
      });

      setNotifications(filteredNotifications);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    if (!user) return;

    const channel = supabase
      .channel('team-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_notifications',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, teamId, isManager]);

  const handleDismiss = async (notificationId: string) => {
    if (!user) return;

    // Optimistically update UI
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    // Update in database
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    const updatedDismissedBy = [...(notification.dismissed_by_users || []), user.id];

    await supabase
      .from('team_notifications')
      .update({ dismissed_by_users: updatedDismissedBy })
      .eq('id', notificationId);
  };

  const handleNameClick = async (notification: TeamNotification) => {
    if (isManager) {
      // Find the member in the roster
      const member = roster.find(m => 
        m.full_name.toLowerCase() === notification.new_rep_name.toLowerCase()
      );
      
      if (member) {
        setSelectedMember(member);
      } else {
        // Fallback: try to find by searching profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .ilike('full_name', notification.new_rep_name)
          .single();

        if (profile) {
          // Get role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .single();

          const memberData: TeamMember = {
            id: profile.id,
            user_id: profile.user_id,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            status: profile.status,
            experience: profile.experience,
            direct_manager: profile.direct_manager,
            role: (roleData?.role as 'rookie' | 'manager' | 'admin') || 'rookie',
          };
          setSelectedMember(memberData);
        }
      }
    } else {
      // Show simplified modal for rookies
      setSelectedRep({
        name: notification.new_rep_name,
        phone: notification.new_rep_phone || '',
      });
    }
  };

  if (isLoading || notifications.length === 0) {
    return null;
  }

  // Separate notifications by type
  const managerNotifications = notifications.filter(n => n.type === 'manager_only');
  const teamWideNotifications = notifications.filter(n => n.type === 'team_wide');

  return (
    <>
      <div className="space-y-3 mb-6 animate-in slide-in-from-top duration-300">
        {/* Manager-only notifications */}
        {isManager && managerNotifications.map((notification) => (
          <div
            key={notification.id}
            className="relative flex items-center gap-3 px-5 py-3 bg-primary/10 border-l-4 border-primary rounded-r-lg"
          >
            <PartyPopper className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground flex-1">
              <span className="font-medium">{notification.signer_name}</span>
              {' just signed '}
              <button
                onClick={() => handleNameClick(notification)}
                className="font-semibold text-primary hover:underline focus:outline-none"
              >
                {notification.new_rep_name}
              </button>
              !
            </p>
            <button
              onClick={() => handleDismiss(notification.id)}
              className="p-1 rounded hover:bg-primary/20 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-primary" />
            </button>
          </div>
        ))}

        {/* Team-wide welcome notifications */}
        {teamWideNotifications.map((notification) => (
          <div
            key={notification.id}
            className="relative flex items-center gap-3 px-5 py-3 bg-green-500/10 border-l-4 border-green-500 rounded-r-lg"
          >
            <HandMetal className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-foreground flex-1">
              👋 Everybody welcome{' '}
              <button
                onClick={() => handleNameClick(notification)}
                className="font-bold text-primary hover:underline focus:outline-none"
              >
                {notification.new_rep_name}
              </button>
              {' to the '}
              <span className="font-semibold">{teamName || 'team'}</span>!
            </p>
            <button
              onClick={() => handleDismiss(notification.id)}
              className="p-1 rounded hover:bg-green-500/20 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-green-500" />
            </button>
          </div>
        ))}
      </div>

      {/* Rookie Welcome Modal */}
      <RookieWelcomeModal
        isOpen={selectedRep !== null}
        onClose={() => setSelectedRep(null)}
        repName={selectedRep?.name || ''}
        repPhone={selectedRep?.phone || ''}
      />

      {/* Manager Profile Modal */}
      <MemberProfileModal
        open={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        roster={roster}
      />
    </>
  );
}
