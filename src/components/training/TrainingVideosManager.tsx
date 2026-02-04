import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Video, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TrainingVideo {
  id: string;
  title: string;
  video_url: string | null;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  team_specific: boolean;
  visible_to_teams: string[] | null;
  duration_minutes: number | null;
  added_by: string | null;
}

interface Team {
  id: string;
  name: string;
}

const VIDEO_CATEGORIES = [
  'Pitch Training',
  'Switchover',
  'Backyard Pitch',
  'Objections',
  'Closing',
  'Mindset',
  'Success Stories',
  'Role Plays',
  'Other'
];

export function TrainingVideosManager() {
  const { user, profile, role } = useAuth();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user can manage videos (pillar owner or admin)
  const isAdmin = role === 'admin';
  const [isPillarOwner, setIsPillarOwner] = useState(false);
  const canManageVideos = isAdmin || isPillarOwner;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    description: '',
    category: 'Pitch Training',
    thumbnail_url: '',
    team_specific: false,
    visible_to_teams: [] as string[],
  });

  useEffect(() => {
    const checkPillarOwner = async () => {
      if (!user || !profile?.team_id) return;
      
      const { data: team } = await supabase
        .from('teams')
        .select('leader_id')
        .eq('id', profile.team_id)
        .maybeSingle();
      
      setIsPillarOwner(team?.leader_id === user.id);
    };
    
    checkPillarOwner();
  }, [user, profile]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch videos
        const { data: videosData } = await supabase
          .from('training_videos')
          .select('*')
          .eq('is_active', true)
          .order('display_order');
        
        setVideos(videosData || []);

        // Fetch teams for visibility settings
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .order('name');
        
        setTeams(teamsData || []);
      } catch (err) {
        console.error('Error fetching videos:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      video_url: '',
      description: '',
      category: 'Pitch Training',
      thumbnail_url: '',
      team_specific: false,
      visible_to_teams: [],
    });
    setEditingVideo(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (video: TrainingVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      video_url: video.video_url || '',
      description: video.description || '',
      category: video.category,
      thumbnail_url: video.thumbnail_url || '',
      team_specific: video.team_specific || false,
      visible_to_teams: video.visible_to_teams || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const videoData = {
        title: formData.title.trim(),
        video_url: formData.video_url.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category,
        thumbnail_url: formData.thumbnail_url.trim() || null,
        team_specific: formData.team_specific,
        visible_to_teams: formData.team_specific ? formData.visible_to_teams : null,
        added_by: user?.id,
      };

      if (editingVideo) {
        const { error } = await supabase
          .from('training_videos')
          .update(videoData)
          .eq('id', editingVideo.id);
        
        if (error) throw error;
        
        setVideos(prev => prev.map(v => 
          v.id === editingVideo.id ? { ...v, ...videoData } : v
        ));
        toast.success('Video updated successfully');
      } else {
        const { data, error } = await supabase
          .from('training_videos')
          .insert(videoData)
          .select()
          .single();
        
        if (error) throw error;
        
        setVideos(prev => [...prev, data]);
        toast.success('Video added successfully');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving video:', err);
      toast.error('Failed to save video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Delete this training video? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('training_videos')
        .update({ is_active: false })
        .eq('id', videoId);
      
      if (error) throw error;
      
      setVideos(prev => prev.filter(v => v.id !== videoId));
      toast.success('Video deleted');
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('Failed to delete video');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group videos by category
  const videosByCategory = videos.reduce((acc, video) => {
    if (!acc[video.category]) acc[video.category] = [];
    acc[video.category].push(video);
    return acc;
  }, {} as Record<string, TrainingVideo[]>);

  return (
    <div className="space-y-6">
      {/* Add Video Button - Only for pillars/admins */}
      {canManageVideos && (
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="gap-2 bg-success hover:bg-success/90">
                <Plus className="w-4 h-4" />
                Add Training Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingVideo ? 'Edit Training Video' : 'Add Training Video'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Video Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="How to Pitch Switchovers"
                  />
                </div>

                <div>
                  <Label htmlFor="video_url">Video URL</Label>
                  <Input
                    id="video_url"
                    value={formData.video_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Learn the 3-step switchover framework"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
                  <Input
                    id="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="team_specific"
                    checked={formData.team_specific}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      team_specific: checked === true 
                    }))}
                  />
                  <Label htmlFor="team_specific" className="cursor-pointer">
                    Team-specific video
                  </Label>
                </div>

                {formData.team_specific && (
                  <div className="pl-6 space-y-2">
                    <Label>Visible to teams:</Label>
                    <div className="flex flex-wrap gap-2">
                      {teams.map(team => (
                        <label 
                          key={team.id} 
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-colors text-sm",
                            formData.visible_to_teams.includes(team.id)
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                          )}
                        >
                          <Checkbox
                            checked={formData.visible_to_teams.includes(team.id)}
                            onCheckedChange={(checked) => {
                              setFormData(prev => ({
                                ...prev,
                                visible_to_teams: checked
                                  ? [...prev.visible_to_teams, team.id]
                                  : prev.visible_to_teams.filter(id => id !== team.id)
                              }));
                            }}
                            className="sr-only"
                          />
                          {team.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="bg-success hover:bg-success/90"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingVideo ? 'Update Video' : 'Save Video'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Videos by Category */}
      {Object.entries(videosByCategory).map(([category, categoryVideos]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {category}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryVideos.map(video => (
              <div 
                key={video.id}
                className="bg-card rounded-lg border border-border overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video className="w-12 h-12 text-muted-foreground" />
                  )}
                  
                  {/* Edit/Delete buttons for pillars */}
                  {canManageVideos && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(video)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => handleDelete(video.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  <h4 className="font-medium text-sm text-foreground line-clamp-1">
                    {video.title}
                  </h4>
                  {video.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {video.description}
                    </p>
                  )}
                  {video.team_specific && (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      Team-specific
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {videos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No training videos yet.</p>
          {canManageVideos && (
            <p className="text-sm mt-1">Click "Add Training Video" to get started.</p>
          )}
        </div>
      )}
    </div>
  );
}
