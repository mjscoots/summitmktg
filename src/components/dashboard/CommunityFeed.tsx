import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Pin, Plus, Send, MessageSquare } from 'lucide-react';
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
  target_role: 'rookie' | 'manager' | 'admin' | null;
  author_id: string | null;
  team_ids: string[] | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
}

type FeedFilter = 'all' | 'pinned' | 'training' | 'wins';

interface CommunityFeedProps {
  canPost?: boolean;
  isAdmin?: boolean;
}

export function CommunityFeed({ canPost = false, isAdmin = false }: CommunityFeedProps) {
  const { role, user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isAllTeams, setIsAllTeams] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, slug')
        .order('name');
      setTeams(data || []);
    };
    if (canPost) {
      fetchTeams();
    }
  }, [canPost]);

  const fetchAnnouncements = async () => {
    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(15);

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
      toast.success('Posted!');
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

  const handleTogglePin = async (id: string, currentlyPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_pinned: !currentlyPinned })
        .eq('id', id);
      if (error) {
        toast.error('Failed to update');
        return;
      }
      setAnnouncements(prev => 
        prev.map(a => a.id === id ? { ...a, is_pinned: !currentlyPinned } : a)
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

  const filteredAnnouncements = announcements.filter(a => {
    if (filter === 'pinned') return a.is_pinned;
    // For now, all posts show in all/training/wins - can be enhanced with tags
    return true;
  });

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.is_pinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.is_pinned);

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border/50 p-4">
        <div className="animate-pulse text-muted-foreground text-sm">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border/50">
      {/* Header with filters */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">Community</h2>
          </div>
          {canPost && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-primary hover:text-primary">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Post to Community</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-3">
                  <Input
                    placeholder="Title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-muted border-border text-sm"
                  />
                  <Textarea
                    placeholder="What's happening?"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="bg-muted border-border min-h-[100px] text-sm"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPinned(!isPinned)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors",
                        isPinned 
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Pin className="w-3 h-3" />
                      Pin
                    </button>
                  </div>
                  {isAdmin && (
                    <div className="border-t border-border pt-3">
                      <label className="block text-xs font-medium mb-2 text-muted-foreground">Post To</label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            checked={isAllTeams}
                            onChange={() => setIsAllTeams(true)}
                            className="accent-primary w-3 h-3"
                          />
                          All Teams
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            checked={!isAllTeams}
                            onChange={() => setIsAllTeams(false)}
                            className="accent-primary w-3 h-3"
                          />
                          Select Teams
                        </label>
                      </div>
                      {!isAllTeams && (
                        <div className="mt-2 max-h-24 overflow-y-auto space-y-1 bg-muted/30 p-2 rounded-md">
                          {teams.map(team => (
                            <label key={team.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer text-xs">
                              <Checkbox
                                checked={selectedTeamIds.includes(team.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTeamIds([...selectedTeamIds, team.id]);
                                  } else {
                                    setSelectedTeamIds(selectedTeamIds.filter(id => id !== team.id));
                                  }
                                }}
                                className="w-3.5 h-3.5"
                              />
                              {team.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCreateAnnouncement}
                      disabled={isSubmitting}
                      className="gap-1.5"
                    >
                      <Send className="w-3 h-3" />
                      Post
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Filter tabs - Apple segmented control style */}
        <div className="flex gap-1 p-0.5 bg-muted/50 rounded-md">
          {(['all', 'pinned', 'training', 'wins'] as FeedFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 px-2 py-1 text-[11px] font-medium rounded-sm transition-all capitalize",
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Feed content */}
      <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
        {/* Pinned section */}
        {filter !== 'pinned' && pinnedAnnouncements.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Pinned
            </p>
            {pinnedAnnouncements.map((a) => (
              <FeedCard 
                key={a.id} 
                announcement={a} 
                canPin={canPost} 
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}

        {/* Regular posts */}
        {regularAnnouncements.length === 0 && pinnedAnnouncements.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No posts yet</p>
          </div>
        ) : (
          regularAnnouncements.map((a) => (
            <FeedCard 
              key={a.id} 
              announcement={a} 
              canPin={canPost}
              onTogglePin={handleTogglePin}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FeedCard({ 
  announcement, 
  canPin,
  onTogglePin 
}: { 
  announcement: Announcement; 
  canPin: boolean;
  onTogglePin: (id: string, pinned: boolean) => void;
}) {
  return (
    <div 
      className={cn(
        "p-3 rounded-md border transition-all group",
        announcement.is_pinned 
          ? "border-primary/30 bg-primary/5" 
          : "border-border/50 bg-card hover:border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground mb-0.5 line-clamp-1">
            {announcement.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {announcement.content}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
          </p>
        </div>
        {canPin && (
          <button
            onClick={() => onTogglePin(announcement.id, announcement.is_pinned)}
            className={cn(
              "p-1 rounded transition-all",
              announcement.is_pinned 
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10"
            )}
          >
            <Pin className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}