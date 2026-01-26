import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { VideoUploader } from '@/components/VideoUploader';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Video,
  Plus,
  Trash2,
  Edit2,
  Eye,
  ArrowLeft,
  Loader2,
  Film,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TrainingVideo = Database['public']['Tables']['training_videos']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

const CATEGORIES = [
  'Pitch',
  'Switchover',
  'Backyard Pitch',
  'Objections',
  'Closing',
  'Mindset',
  'General',
];

export default function AdminVideos() {
  const { role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<TrainingVideo | null>(null);
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetRole, setTargetRole] = useState<AppRole | 'all'>('all');
  const [duration, setDuration] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Check access
  useEffect(() => {
    if (!authLoading && role !== 'manager' && role !== 'admin') {
      navigate('/app', { replace: true });
    }
  }, [role, authLoading, navigate]);

  // Fetch videos
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('training_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load videos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setTargetRole('all');
    setDuration('');
    setUploadedUrl('');
    setEditingVideo(null);
  };

  const handleUploadComplete = (url: string) => {
    setUploadedUrl(url);
    toast({
      title: 'Video uploaded!',
      description: 'Now fill in the details below.',
    });
  };

  const handleSaveVideo = async () => {
    if (!title || !category || !uploadedUrl) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in title, category, and upload a video.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const videoData = {
        title,
        description: description || null,
        category,
        target_role: targetRole === 'all' ? null : targetRole,
        duration_minutes: duration ? parseInt(duration) : null,
        video_url: uploadedUrl,
        is_active: true,
      };

      if (editingVideo) {
        const { error } = await supabase
          .from('training_videos')
          .update(videoData)
          .eq('id', editingVideo.id);
        if (error) throw error;
        toast({ title: 'Video updated!' });
      } else {
        const { error } = await supabase.from('training_videos').insert(videoData);
        if (error) throw error;
        toast({ title: 'Video added!' });
      }

      setShowUploadDialog(false);
      resetForm();
      fetchVideos();
    } catch (error: any) {
      console.error('Error saving video:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save video',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (video: TrainingVideo) => {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;

    setDeleting(video.id);
    try {
      // Delete from database
      const { error } = await supabase
        .from('training_videos')
        .delete()
        .eq('id', video.id);
      if (error) throw error;

      // Try to delete from storage (extract filename from URL)
      if (video.video_url?.includes('training-videos')) {
        const fileName = video.video_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('training-videos').remove([fileName]);
        }
      }

      toast({ title: 'Video deleted' });
      fetchVideos();
    } catch (error: any) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete video',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (video: TrainingVideo) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description || '');
    setCategory(video.category);
    setTargetRole(video.target_role || 'all');
    setDuration(video.duration_minutes?.toString() || '');
    setUploadedUrl(video.video_url || '');
    setShowUploadDialog(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ThemeProvider initialRole="manager">
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  MANAGE <span className="text-primary">VIDEOS</span>
                </h1>
                <p className="text-muted-foreground text-sm">
                  Upload and manage training videos
                </p>
              </div>
            </div>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </div>

          {/* Videos Grid */}
          {videos.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Film className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No videos yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Upload your first training video to get started
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Video
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-card rounded-xl border border-border overflow-hidden group"
                >
                  {/* Thumbnail/Preview area */}
                  <div
                    className="aspect-video bg-muted relative cursor-pointer"
                    onClick={() => {
                      setPreviewVideo(video);
                      setShowPreviewDialog(true);
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-10 h-10 text-white" />
                    </div>
                    <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground truncate">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                        {video.category}
                      </span>
                      {video.target_role && (
                        <span className="px-2 py-0.5 bg-muted rounded text-xs capitalize">
                          {video.target_role}
                        </span>
                      )}
                      {video.duration_minutes && (
                        <span>{video.duration_minutes} min</span>
                      )}
                    </div>
                    {video.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(video)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(video)}
                        disabled={deleting === video.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deleting === video.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Upload/Edit Dialog */}
        <Dialog
          open={showUploadDialog}
          onOpenChange={(open) => {
            setShowUploadDialog(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVideo ? 'Edit Video' : 'Add New Video'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Video Uploader (only show if not editing or no existing URL) */}
              {!editingVideo && (
                <div>
                  <Label className="mb-2 block">Video File</Label>
                  <VideoUploader
                    onUploadComplete={handleUploadComplete}
                    onError={(error) =>
                      toast({
                        title: 'Upload Error',
                        description: error,
                        variant: 'destructive',
                      })
                    }
                  />
                </div>
              )}

              {uploadedUrl && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-600 dark:text-green-400">
                  ✓ Video uploaded successfully
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Introduction to Solar Pitch"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the video content..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Target Audience</Label>
                    <Select
                      value={targetRole}
                      onValueChange={(v) => setTargetRole(v as AppRole | 'all')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="rookie">Rookies Only</SelectItem>
                        <SelectItem value="manager">Managers Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g., 15"
                    min="1"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveVideo}
                  disabled={saving || (!uploadedUrl && !editingVideo)}
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingVideo ? 'Update Video' : 'Save Video'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewVideo?.title}</DialogTitle>
            </DialogHeader>
            {previewVideo?.video_url && (
              <VideoPlayer
                src={previewVideo.video_url}
                title={previewVideo.title}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ThemeProvider>
  );
}
