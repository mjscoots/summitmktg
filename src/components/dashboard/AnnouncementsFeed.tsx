import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Pin, Clock, Plus, Send, X, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  target_role: 'rookie' | 'manager' | 'admin' | 'owner' | null;
  author_id: string | null;
  team_ids: string[] | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
}

export function AnnouncementsFeed() {
  const { role, user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isAllTeams, setIsAllTeams] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManager = role === 'manager' || role === 'admin' || role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';

  // Fetch teams for targeting
  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, slug')
        .order('name');
      setTeams(data || []);
    };
    if (isManager) {
      fetchTeams();
    }
  }, [isManager]);

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
        team_ids: isAllTeams ? null : selectedTeamIds.length > 0 ? selectedTeamIds : null,
      });

      if (error) {
        toast.error('Failed to create announcement');
        return;
      }

      // Also post to chat announcements channel so it appears in community chat
      try {
        if (user?.id) {
          await supabase.from('chat_messages').insert({
            user_id: user.id,
            content: `📢 **${newTitle.trim()}**\n\n${newContent.trim()}`,
            is_ai: true,
            channel: 'announcements',
          });
        }
      } catch { /* non-critical */ }

      toast.success('Announcement posted!');
      setNewTitle('');
      setNewContent('');
      setIsPinned(false);
      setSelectedTeamIds([]);
      setIsAllTeams(true);
      setIsCreateOpen(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle pin for any announcement (all managers can do this)
  const handleTogglePin = async (announcementId: string, currentlyPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentlyPinned })
        .eq('id', announcementId);

      if (error) {
        toast.error('Failed to update pin status');
        return;
      }

      // Immediately update local state
      setAnnouncements(prev => 
        prev.map(a => a.id === announcementId ? { ...a, is_pinned: !currentlyPinned } : a)
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
      );

      toast.success(currentlyPinned ? 'Unpinned' : 'Pinned');
    } catch {
      toast.error('Something went wrong');
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
              className="w-full gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/10 hover:border-primary"
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
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Pin className="w-4 h-4" />
                  <span className="text-sm">Pin to top</span>
                </button>
              </div>

              {/* Team Targeting */}
              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium mb-2">Post To</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={isAllTeams}
                      onChange={() => setIsAllTeams(true)}
                      className="accent-primary"
                    />
                    <span className="text-sm">All Teams</span>
                    {!isAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isAllTeams}
                      onChange={() => setIsAllTeams(false)}
                      className="accent-primary"
                    />
                    <span className="text-sm">Select Teams</span>
                  </label>
                </div>
                
                {!isAllTeams && (
                  <div className="mt-3 max-h-32 overflow-y-auto space-y-1 bg-muted/30 p-2 rounded-lg">
                    {teams.map(team => (
                      <label key={team.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer">
                        <Checkbox
                          checked={selectedTeamIds.includes(team.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTeamIds([...selectedTeamIds, team.id]);
                            } else {
                              setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id));
                            }
                          }}
                        />
                        <span className="text-sm">{team.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAnnouncement}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/85 gap-2"
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
                "p-4 rounded-lg border transition-all hover:scale-[1.01] cursor-default relative group",
                announcement.is_pinned 
                  ? 'border-primary/50 bg-primary/5 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.2)]' 
                  : 'border-border bg-card hover:border-muted-foreground/30'
              )}
            >
              {/* Pin/Unpin button for managers */}
              {isManager && (
                <button
                  onClick={() => handleTogglePin(announcement.id, announcement.is_pinned)}
                  className={cn(
                    "absolute top-2 right-2 p-1.5 rounded transition-all",
                    announcement.is_pinned 
                      ? "text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100"
                  )}
                  title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex items-start gap-3">
                {announcement.is_pinned && (
                  <Pin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0 pr-6">
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
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-primary/20 text-primary">
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
