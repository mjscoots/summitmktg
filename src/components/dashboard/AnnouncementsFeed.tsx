import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Pin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  target_role: 'rookie' | 'manager' | 'admin' | null;
}

export function AnnouncementsFeed() {
  const { role } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let query = supabase
          .from('announcements')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        // Filter by role - rookies only see rookie or general announcements
        if (role === 'rookie') {
          query = query.or('target_role.is.null,target_role.eq.rookie');
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching announcements:', error);
          return;
        }

        setAnnouncements(data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [role]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading announcements...</div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <Bell className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No announcements yet</p>
        <p className="text-sm text-muted-foreground/70">Check back later for updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
      {announcements.map((announcement) => (
        <div 
          key={announcement.id}
          className={`p-4 rounded-lg border transition-all ${
            announcement.is_pinned 
              ? 'border-primary/50 bg-primary/5' 
              : 'border-border bg-card'
          }`}
        >
          <div className="flex items-start gap-3">
            {announcement.is_pinned && (
              <Pin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm mb-1">
                {announcement.title}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {announcement.content}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/70">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
