import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Pin, Send, Users, UserCheck, Globe } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  slug: string;
}

type AudienceType = 'everyone' | 'managers_only' | 'teams';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AnnouncementModal({ isOpen, onClose, onSuccess }: AnnouncementModalProps) {
  const { user, role } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [audienceType, setAudienceType] = useState<AudienceType>('everyone');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name, slug')
        .order('name');
      setTeams(data || []);
    };
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setIsPinned(false);
    setAudienceType('everyone');
    setSelectedTeamIds([]);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine target_role based on audience type
      let targetRole: 'manager' | null = null;
      let teamIds: string[] | null = null;

      if (audienceType === 'managers_only') {
        targetRole = 'manager';
      } else if (audienceType === 'teams' && selectedTeamIds.length > 0) {
        teamIds = selectedTeamIds;
      }

      const { error } = await supabase.from('announcements').insert({
        title: title.trim(),
        content: content.trim(),
        is_pinned: isPinned,
        author_id: user?.id,
        target_role: targetRole,
        team_ids: teamIds,
      });

      if (error) {
        toast.error('Failed to create announcement');
        return;
      }

      // Sync to chat announcements channel
      try {
        if (user?.id) {
          await supabase.from('chat_messages').insert({
            user_id: user.id,
            content: `📢 **${title.trim()}**\n\n${content.trim()}`,
            is_ai: true,
            channel: 'announcements',
          });
        }
      } catch { /* non-critical */ }

      toast.success('Announcement posted!');
      resetForm();
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      resetForm();
      onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post Announcement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-3">
          <Input
            placeholder="Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-muted border-border"
          />
          
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-muted border-border min-h-[120px]"
          />

          {/* Pin option */}
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

          {/* Audience Selection */}
          <div className="border-t border-border pt-4">
            <label className="block text-sm font-medium mb-3 text-foreground">Who should see this?</label>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAudienceType('everyone')}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all",
                  audienceType === 'everyone'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <Globe className="w-4 h-4" />
                Everyone
              </button>
              
              <button
                type="button"
                onClick={() => setAudienceType('managers_only')}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all",
                  audienceType === 'managers_only'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <UserCheck className="w-4 h-4" />
                Managers Only
              </button>
              
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setAudienceType('teams')}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all",
                    audienceType === 'teams'
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Select Teams
                </button>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground mt-2">
              {audienceType === 'everyone' && 'All managers and rookies will see this announcement'}
              {audienceType === 'managers_only' && 'Only managers and pillars will see this (no rookies)'}
              {audienceType === 'teams' && 'Only selected team members will see this'}
            </p>

            {/* Team Selection */}
            {audienceType === 'teams' && isAdmin && (
              <div className="mt-3 max-h-32 overflow-y-auto space-y-1 bg-muted/30 p-2 rounded-md border border-border">
                {teams.map(team => (
                  <label key={team.id} className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer text-sm">
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
                    {team.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => {
              resetForm();
              onClose();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
