import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Video, Loader2, Film, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { VideoUploader } from '@/components/VideoUploader';
import { VideoPlayer } from '@/components/VideoPlayer';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

type VideoSource = 'url' | 'upload';

const CATEGORIES = [
  'Introduction',
  'Switchover',
  'Fresh Account',
  'Body Language',
  'Tonality',
  'Objections',
  'Closing',
  'Advanced Training',
  'Mental Mastery',
  'Zoom Trainings',
  'Manager Training',
];

const parseEmbedUrl = (url: string): string | null => {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    const hashMatch = url.match(/[?&]h=([a-zA-Z0-9]+)/);
    return `https://player.vimeo.com/video/${vimeoMatch[1]}${hashMatch ? `?h=${hashMatch[1]}` : ''}`;
  }
  return null;
};

export function TrainingVideosManager() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Preview
  const [previewVideo, setPreviewVideo] = useState<TrainingVideo | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Introduction');
  const [targetRole, setTargetRole] = useState<AppRole | 'all'>('all');
  const [isPublished, setIsPublished] = useState(true);
  const [videoSource, setVideoSource] = useState<VideoSource>('url');
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_videos')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Introduction');
    setTargetRole('all');
    setIsPublished(true);
    setVideoSource('url');
    setExternalUrl('');
    setUploadedUrl('');
    setEditingVideo(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (video: TrainingVideo) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description || '');
    setCategory(video.category);
    setTargetRole(video.target_role || 'all');
    setIsPublished(video.is_active ?? true);
    const url = video.video_url || '';
    const isExternal = url.includes('vimeo.com') || url.includes('youtube.com') || url.includes('youtu.be') || url.startsWith('http');
    if (isExternal) {
      setVideoSource('url');
      setExternalUrl(url);
      setUploadedUrl('');
    } else {
      setVideoSource('upload');
      setUploadedUrl(url);
      setExternalUrl('');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const finalUrl = videoSource === 'url' ? externalUrl.trim() : uploadedUrl;
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!finalUrl) {
      toast.error(videoSource === 'url' ? 'Please enter a video URL' : 'Please upload a video file');
      return;
    }

    setIsSubmitting(true);
    try {
      const videoData = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        target_role: targetRole === 'all' ? null : targetRole,
        video_url: finalUrl,
        is_active: isPublished,
        added_by: user?.id,
      };

      if (editingVideo) {
        const { error } = await supabase
          .from('training_videos')
          .update(videoData)
          .eq('id', editingVideo.id);
        if (error) throw error;
        toast.success('Video updated!');
      } else {
        const { error } = await supabase
          .from('training_videos')
          .insert(videoData);
        if (error) throw error;
        toast.success('Video added!');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchVideos();
    } catch (err: any) {
      console.error('Error saving video:', err);
      toast.error('Failed to save video');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (video: TrainingVideo) => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    setDeletingId(video.id);
    try {
      const { error } = await supabase
        .from('training_videos')
        .delete()
        .eq('id', video.id);
      if (error) throw error;

      if (video.video_url?.includes('training-videos')) {
        const fileName = video.video_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('training-videos').remove([fileName]);
        }
      }

      toast.success('Video deleted');
      fetchVideos();
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Training Videos</h2>
          <p className="text-sm text-muted-foreground">Manage all training video content</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Video
        </Button>
      </div>

      {/* Video List */}
      {videos.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Film className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No videos yet</h3>
          <p className="text-muted-foreground mb-6">Add your first training video to get started</p>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(video => (
            <div
              key={video.id}
              className="bg-card rounded-lg border border-border overflow-hidden group"
            >
              <div
                className="aspect-video bg-muted relative cursor-pointer flex items-center justify-center"
                onClick={() => setPreviewVideo(video)}
              >
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <Video className="w-12 h-12 text-muted-foreground" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-10 h-10 text-white" />
                </div>
                {!video.is_active && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full font-medium">Draft</span>
                )}
              </div>

              <div className="p-3">
                <h4 className="font-medium text-sm text-foreground line-clamp-1">{video.title}</h4>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px]">{video.category}</span>
                  <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
                    {video.video_url?.includes('vimeo.com') ? '🎬 Vimeo' : video.video_url?.includes('youtube.com') || video.video_url?.includes('youtu.be') ? '▶ YouTube' : '📁 Uploaded'}
                  </span>
                  {video.target_role && (
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground capitalize">{video.target_role} only</span>
                  )}
                </div>
                {video.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(video)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(video)}
                    disabled={deletingId === video.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingId === video.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3 mr-1" />Delete</>}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Edit Video' : 'Add New Video'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Source Toggle */}
            <div>
              <Label className="mb-2 block">Video Source *</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setVideoSource('url')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                    videoSource === 'url' ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Film className="w-4 h-4" />
                  Vimeo / YouTube URL
                </button>
                <button
                  type="button"
                  onClick={() => setVideoSource('upload')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                    videoSource === 'upload' ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Video className="w-4 h-4" />
                  Upload from Device
                </button>
              </div>
            </div>

            {/* URL Input */}
            {videoSource === 'url' && (
              <div>
                <Label>Video URL *</Label>
                <Input
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://vimeo.com/123456789 or https://youtube.com/watch?v=..."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Supports Vimeo and YouTube links in any format</p>
                {externalUrl && parseEmbedUrl(externalUrl) && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border">
                    <p className="text-xs font-medium text-muted-foreground px-3 py-1.5 bg-muted">Preview</p>
                    <div className="aspect-video">
                      <iframe
                        src={parseEmbedUrl(externalUrl)!}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title="Video preview"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload */}
            {videoSource === 'upload' && (
              <div>
                <Label className="mb-2 block">Video File *</Label>
                <VideoUploader
                  onUploadComplete={(url) => {
                    setUploadedUrl(url);
                    toast.success('Video uploaded!');
                  }}
                  onError={(error) => toast.error(error)}
                />
                {uploadedUrl && videoSource === 'upload' && (
                  <div className="mt-2 p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
                    ✓ Video uploaded successfully
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <Label>Video Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Body Language Training" className="mt-1" />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will reps learn from this video?" rows={3} className="mt-1" />
            </div>

            {/* Category */}
            <div>
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Visible To */}
            <div>
              <Label>Visible To</Label>
              <Select value={targetRole} onValueChange={(v) => setTargetRole(v as AppRole | 'all')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone (Rookies + Managers)</SelectItem>
                  <SelectItem value="rookie">Rookies Only</SelectItem>
                  <SelectItem value="manager">Managers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Published Toggle */}
            <div className="flex items-center justify-between">
              <Label>Published (visible to users)</Label>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingVideo ? 'Update Video' : 'Save Video'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => { if (!open) setPreviewVideo(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewVideo?.title}</DialogTitle>
          </DialogHeader>
          {previewVideo?.video_url && (
            <div className="aspect-video">
              <VideoPlayer src={previewVideo.video_url} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
