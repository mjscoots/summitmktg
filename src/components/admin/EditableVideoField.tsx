import { useState } from 'react';
import { Pencil, Save, X, Loader2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditableVideoFieldProps {
  contentKey: string;
  initialUrl: string;
  label?: string;
  onUpdate?: (newUrl: string) => void;
  className?: string;
}

export function EditableVideoField({
  contentKey,
  initialUrl,
  label = 'Video URL',
  onUpdate,
  className = ''
}: EditableVideoFieldProps) {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedUrl, setEditedUrl] = useState(initialUrl);
  const [isSaving, setIsSaving] = useState(false);

  if (!isAdmin) {
    return null;
  }

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { data: existingContent } = await supabase
        .from('training_content')
        .select('id, version')
        .eq('content_key', contentKey)
        .single();

      if (existingContent) {
        const { error } = await supabase
          .from('training_content')
          .update({
            video_url: editedUrl,
            last_edited_by: user.id,
            last_edited_at: new Date().toISOString(),
            version: existingContent.version + 1,
          })
          .eq('id', existingContent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('training_content')
          .insert({
            content_key: contentKey,
            section_type: 'video',
            video_url: editedUrl,
            last_edited_by: user.id,
          });

        if (error) throw error;
      }

      toast.success('Video URL saved!');
      setIsEditing(false);
      onUpdate?.(editedUrl);
    } catch (err) {
      console.error('Error saving video URL:', err);
      toast.error('Failed to save video URL');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("admin-video-field", className)}>
      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <Video className="w-3.5 h-3.5" />
          <span>Edit {label}</span>
          <Pencil className="w-3 h-3" />
        </button>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <Video className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={editedUrl}
            onChange={(e) => setEditedUrl(e.target.value)}
            placeholder="Enter video URL..."
            className="flex-1 h-8 text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditedUrl(initialUrl);
              setIsEditing(false);
            }}
            disabled={isSaving}
            className="h-8 px-2"
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 px-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
