import { useState, ReactNode } from 'react';
import { Pencil, Save, X, Loader2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from './RichTextEditor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminEditWrapperProps {
  contentKey: string;
  initialContent: string;
  sectionType?: 'text' | 'video' | 'script' | 'feature_benefit' | 'manual_section';
  children: ReactNode;
  onUpdate?: (newContent: string) => void;
  className?: string;
  editorMinHeight?: string;
}

export function AdminEditWrapper({
  contentKey,
  initialContent,
  sectionType = 'text',
  children,
  onUpdate,
  className = '',
  editorMinHeight = '300px'
}: AdminEditWrapperProps) {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  if (!isAdmin) {
    return <>{children}</>;
  }

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // First, check if content exists
      const { data: existingContent } = await supabase
        .from('training_content')
        .select('id, version, content_html')
        .eq('content_key', contentKey)
        .single();

      if (existingContent) {
        // Save current version to history
        await supabase
          .from('training_content_versions')
          .insert({
            content_id: existingContent.id,
            version_number: existingContent.version,
            content_html_snapshot: existingContent.content_html,
            edited_by: user.id,
            change_description: 'Auto-saved before update'
          });

        // Update existing content
        const { error } = await supabase
          .from('training_content')
          .update({
            content_html: editedContent,
            last_edited_by: user.id,
            last_edited_at: new Date().toISOString(),
            version: existingContent.version + 1,
          })
          .eq('id', existingContent.id);

        if (error) throw error;
      } else {
        // Create new content
        const { error } = await supabase
          .from('training_content')
          .insert({
            content_key: contentKey,
            section_type: sectionType,
            content_html: editedContent,
            last_edited_by: user.id,
          });

        if (error) throw error;
      }

      toast.success('Content saved successfully!');
      setIsEditing(false);
      onUpdate?.(editedContent);
    } catch (err) {
      console.error('Error saving content:', err);
      toast.error('Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(initialContent);
    setIsEditing(false);
  };

  return (
    <div className={cn("relative group", className)}>
      {/* Admin Edit Button */}
      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg hover:bg-primary/90"
          title="Edit content"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Display Mode */}
      {!isEditing && children}

      {/* Edit Mode */}
      {isEditing && (
        <div className="border-2 border-primary rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Editing: {contentKey}
            </span>
          </div>
          
          <RichTextEditor
            value={editedContent}
            onChange={setEditedContent}
            minHeight={editorMinHeight}
          />
          
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
