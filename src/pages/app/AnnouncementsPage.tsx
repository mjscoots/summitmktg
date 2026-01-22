import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
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

export default function AnnouncementsPage() {
  const { role } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isManager = role === 'manager' || role === 'admin';

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let query = supabase
          .from('announcements')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });

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

  return (
    <ThemeProvider initialRole={isManager ? 'manager' : 'rookie'}>
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Announcements
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with the latest news
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div 
                  key={announcement.id}
                  className={`p-6 rounded-lg border transition-all ${
                    announcement.is_pinned 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {announcement.is_pinned && (
                      <Pin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg mb-2">
                        {announcement.title}
                      </h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-1.5 mt-4 text-sm text-muted-foreground/70">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                        {announcement.target_role && (
                          <span className="ml-2 px-2 py-0.5 rounded text-xs bg-muted">
                            {announcement.target_role === 'manager' ? 'Managers only' : 'Rookies only'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}
