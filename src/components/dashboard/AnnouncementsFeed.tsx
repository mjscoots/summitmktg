import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Pin, Clock, Plus, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  target_role: 'rookie' | 'manager' | 'admin' | null;
}

export function AnnouncementsFeed() {
  const { role, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManager = role === 'manager' || role === 'admin';

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

  useEffect(() => {
    fetchAnnouncements();
  }, [role]);

  const handleCreateAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('announcements').insert({
        title: newTitle.trim(),
        content: newContent.trim(),
        is_pinned: isPinned,
        author_id: user?.id,
      });

      if (error) {
        toast.error('Failed to create announcement');
        return;
      }

      toast.success('Announcement posted!');
      setNewTitle('');
      setNewContent('');
      setIsPinned(false);
      setIsCreateOpen(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Announcement Button (Managers Only) */}
      {isManager && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-dashed border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500"
            >
              <Plus className="w-4 h-4" />
              Post Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Post Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Announcement title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-muted border-border"
              />
              <Textarea
                placeholder="What's happening?"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="bg-muted border-border min-h-[120px]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                    isPinned 
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Pin className="w-4 h-4" />
                  <span className="text-sm">Pin to top</span>
                </button>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAnnouncement}
                  disabled={isSubmitting}
                  className="bg-blue-500 hover:bg-blue-600 gap-2"
                >
                  <Send className="w-4 h-4" />
                  Post
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center py-8">
          <Bell className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No announcements yet</p>
          <p className="text-sm text-muted-foreground/70">Check back later for updates</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id}
              className={cn(
                "p-4 rounded-lg border transition-all hover:scale-[1.01] cursor-default",
                announcement.is_pinned 
                  ? isManager
                    ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_15px_-5px_rgba(59,130,246,0.2)]' 
                    : 'border-green-500/50 bg-green-500/5 shadow-[0_0_15px_-5px_rgba(34,197,94,0.2)]'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              )}
            >
              <div className="flex items-start gap-3">
                {announcement.is_pinned && (
                  <Pin className={cn(
                    "w-4 h-4 flex-shrink-0 mt-0.5",
                    isManager ? "text-blue-400" : "text-green-400"
                  )} />
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
                    {announcement.is_pinned && (
                      <span className={cn(
                        "ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                        isManager ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                      )}>
                        Pinned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
